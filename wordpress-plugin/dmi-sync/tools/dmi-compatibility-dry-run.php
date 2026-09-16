<?php
if ( PHP_SAPI !== 'cli' ) {
    fwrite( STDERR, "Este script solo puede ejecutarse por CLI.\n" );
    exit( 1 );
}

require_once dirname( __DIR__ ) . '/includes/class-pc-compatibility-extractor.php';

$input = $argv[1] ?? dirname( __DIR__, 3 ) . '/catalog-unifier/storage/dmi-current.json';
$output = $argv[2] ?? dirname( __DIR__ ) . '/artifacts/compatibility-dry-run-latest.json';
if ( ! is_file( $input ) ) {
    fwrite( STDERR, "No existe el catálogo DMI: {$input}\n" );
    exit( 1 );
}

$products = json_decode( file_get_contents( $input ), true );
if ( ! is_array( $products ) ) {
    fwrite( STDERR, "El catálogo DMI no contiene JSON válido.\n" );
    exit( 1 );
}

$report = [
    'generated_at_utc' => gmdate( 'c' ),
    'mode' => 'dry-run-read-only',
    'input' => $input,
    'catalog_products' => count( $products ),
    'analyzed' => 0,
    'by_component_type' => [],
    'products_by_resolution_source' => [],
    'resolved_fields_by_source' => [],
    'field_coverage' => [],
    'pending' => 0,
    'pending_by_field' => [],
    'category_mismatches' => [],
    'scope_exclusions' => [],
    'conflicts' => [],
    'unit_errors' => [],
    'unmapped_specs' => [],
    'reference_products' => [],
];

$references = [ 'PB11106613', 'CJ1127794', 'TG21271409', 'FA1127024', 'VE1027172' ];
foreach ( $products as $product ) {
    $analysis = Inforvel_PC_Compatibility_Extractor::analyze( $product, 'dmi' );
    if ( ! $analysis['component_type'] ) continue;
    if ( $analysis['scope_exclusion'] ) {
        $report['scope_exclusions'][] = [ 'id' => $analysis['id'], 'name' => $analysis['name'], 'reason' => $analysis['scope_exclusion'] ];
        continue;
    }
    $report['analyzed']++;
    $type = $analysis['component_type'];
    $report['by_component_type'][ $type ] = ( $report['by_component_type'][ $type ] ?? 0 ) + 1;
    $product_sources = array_values( array_unique( $analysis['sources'] ) );
    foreach ( $product_sources as $source ) {
        $report['products_by_resolution_source'][ $source ] = ( $report['products_by_resolution_source'][ $source ] ?? 0 ) + 1;
    }
    foreach ( $analysis['sources'] as $source ) {
        $report['resolved_fields_by_source'][ $source ] = ( $report['resolved_fields_by_source'][ $source ] ?? 0 ) + 1;
    }
    foreach ( $analysis['fields'] as $field => $_value ) {
        $report['field_coverage'][ $field ] = ( $report['field_coverage'][ $field ] ?? 0 ) + 1;
    }
    if ( $analysis['pending'] ) $report['pending']++;
    foreach ( $analysis['pending_fields'] as $field ) {
        $report['pending_by_field'][ $field ] = ( $report['pending_by_field'][ $field ] ?? 0 ) + 1;
    }
    if ( $analysis['category_mismatch'] ) {
        $report['category_mismatches'][] = [ 'id' => $analysis['id'], 'name' => $analysis['name'], 'reason' => $analysis['category_mismatch'] ];
    }
    foreach ( $analysis['conflicts'] as $conflict ) {
        $report['conflicts'][] = [ 'id' => $analysis['id'], 'name' => $analysis['name'] ] + $conflict;
    }
    foreach ( $analysis['unit_errors'] as $error ) {
        $key = $error['field'] . '|' . $error['value'];
        $report['unit_errors'][ $key ] = ( $report['unit_errors'][ $key ] ?? 0 ) + 1;
    }
    foreach ( $analysis['unmapped_specs'] as $spec ) {
        $key = $spec['name'] . '|' . ( is_scalar( $spec['value'] ) ? $spec['value'] : json_encode( $spec['value'] ) );
        $report['unmapped_specs'][ $key ] = ( $report['unmapped_specs'][ $key ] ?? 0 ) + 1;
    }
    if ( in_array( (string) $analysis['id'], $references, true ) ) {
        $report['reference_products'][ (string) $analysis['id'] ] = $analysis;
    }
}

arsort( $report['by_component_type'] );
arsort( $report['field_coverage'] );
arsort( $report['pending_by_field'] );
arsort( $report['unit_errors'] );
arsort( $report['unmapped_specs'] );
if ( ! is_dir( dirname( $output ) ) ) mkdir( dirname( $output ), 0775, true );
file_put_contents( $output, json_encode( $report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . PHP_EOL );

echo json_encode( [
    'output' => $output,
    'catalog_products' => $report['catalog_products'],
    'analyzed' => $report['analyzed'],
    'by_component_type' => $report['by_component_type'],
    'products_by_resolution_source' => $report['products_by_resolution_source'],
    'resolved_fields_by_source' => $report['resolved_fields_by_source'],
    'field_coverage' => $report['field_coverage'],
    'pending' => $report['pending'],
    'category_mismatches' => count( $report['category_mismatches'] ),
    'scope_exclusions' => count( $report['scope_exclusions'] ),
    'conflicts' => count( $report['conflicts'] ),
    'unit_error_variants' => count( $report['unit_errors'] ),
    'unmapped_spec_variants' => count( $report['unmapped_specs'] ),
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . PHP_EOL;
