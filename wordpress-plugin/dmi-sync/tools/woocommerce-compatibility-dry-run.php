<?php
/**
 * Dry-run de solo lectura sobre el WooCommerce activo.
 *
 * No llama a update_post_meta, save(), wp_update_post ni APIs mutables. Puede
 * ejecutarse desde el overlay de desarrollo para medir la cobertura real sin
 * instalar la clase en WordPress.
 */
if ( PHP_SAPI !== 'cli' ) {
    fwrite( STDERR, "Este script solo puede ejecutarse por CLI.\n" );
    exit( 1 );
}

$wp_load = getenv( 'IV_WP_LOAD' ) ?: '/var/www/wp/wp-load.php';
if ( ! is_file( $wp_load ) ) {
    fwrite( STDERR, "No se encontró wp-load.php en {$wp_load}.\n" );
    exit( 1 );
}

define( 'WP_USE_THEMES', false );
require_once $wp_load;
require_once dirname( __DIR__ ) . '/includes/class-pc-compatibility-extractor.php';

global $wpdb;
$slugs = [
    'procesadores', 'placas-base', 'memoria-ram', 'chasis-pc',
    'fuentes-de-alimentacion', 'refrigeracion', 'ventiladores',
    'tarjetas-graficas', 'discos-duros-internos',
    'discos-duros-internos-ssd',
];
$placeholders = implode( ',', array_fill( 0, count( $slugs ), '%s' ) );
$term_ids = $wpdb->get_col( $wpdb->prepare(
    "SELECT term_id FROM {$wpdb->terms} WHERE slug IN ({$placeholders})",
    ...$slugs
) );
if ( ! $term_ids ) {
    fwrite( STDERR, "No se encontraron las categorías objetivo.\n" );
    exit( 1 );
}

$id_placeholders = implode( ',', array_fill( 0, count( $term_ids ), '%d' ) );
$product_ids = $wpdb->get_col( $wpdb->prepare(
    "SELECT DISTINCT p.ID
     FROM {$wpdb->posts} p
     INNER JOIN {$wpdb->term_relationships} tr ON tr.object_id=p.ID
     INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id=tr.term_taxonomy_id
     WHERE p.post_type='product' AND p.post_status='publish'
       AND tt.taxonomy='product_cat' AND tt.term_id IN ({$id_placeholders})",
    ...array_map( 'intval', $term_ids )
) );

$report = [
    'generated_at_utc' => gmdate( 'c' ),
    'mode' => 'dry-run-read-only',
    'published_candidates' => count( $product_ids ),
    'analyzed' => 0,
    'by_provider' => [],
    'by_component_type' => [],
    'products_by_resolution_source' => [],
    'resolved_fields_by_source' => [],
    'field_coverage' => [],
    'pending' => 0,
    'pending_by_field' => [],
    'manual_preserved' => 0,
    'linked_dmi_candidates' => 0,
    'category_mismatches' => [],
    'scope_exclusions' => [],
    'conflicts' => [],
    'unit_errors' => [],
];

foreach ( $product_ids as $product_id ) {
    $product = wc_get_product( intval( $product_id ) );
    if ( ! $product ) continue;
    $categories = wp_get_post_terms( $product->get_id(), 'product_cat', [ 'fields' => 'names' ] );
    $payload = [
        'id' => $product->get_id(),
        'name' => $product->get_name(),
        'description' => $product->get_description(),
        'short_description' => $product->get_short_description(),
        'categories' => is_wp_error( $categories ) ? [] : $categories,
        'specifications' => [ [ 'groupName' => 'WooCommerce', 'specifications' => [] ] ],
    ];
    foreach ( $product->get_attributes() as $attribute ) {
        if ( ! is_a( $attribute, 'WC_Product_Attribute' ) ) continue;
        $payload['specifications'][0]['specifications'][] = [
            'name' => wc_attribute_label( $attribute->get_name() ),
            'value' => implode( ', ', $attribute->get_options() ),
        ];
    }

    $provider = get_post_meta( $product->get_id(), '_megasur_product', true ) === '1' ? 'megasur' : 'dmi';
    $linked_fields = [];
    if ( $provider === 'megasur' ) {
        $linked_id = intval( get_post_meta( $product->get_id(), '_megasur_linked_product_id', true ) );
        if ( $linked_id > 0 ) {
            $linked_product = wc_get_product( $linked_id );
            if ( $linked_product ) {
                $report['linked_dmi_candidates']++;
                $linked_categories = wp_get_post_terms( $linked_id, 'product_cat', [ 'fields' => 'names' ] );
                $linked_payload = [
                    'id' => $linked_id,
                    'name' => $linked_product->get_name(),
                    'description' => $linked_product->get_description(),
                    'categories' => is_wp_error( $linked_categories ) ? [] : $linked_categories,
                    'specifications' => [ [ 'groupName' => 'WooCommerce', 'specifications' => [] ] ],
                ];
                foreach ( $linked_product->get_attributes() as $attribute ) {
                    if ( ! is_a( $attribute, 'WC_Product_Attribute' ) ) continue;
                    $linked_payload['specifications'][0]['specifications'][] = [
                        'name' => wc_attribute_label( $attribute->get_name() ),
                        'value' => implode( ', ', $attribute->get_options() ),
                    ];
                }
                $linked_analysis = Inforvel_PC_Compatibility_Extractor::analyze( $linked_payload, 'dmi' );
                $linked_fields = $linked_analysis['fields'];
            }
        }
    }

    $analysis = Inforvel_PC_Compatibility_Extractor::analyze( $payload, $provider, $linked_fields );
    if ( ! $analysis['component_type'] ) continue;
    if ( $analysis['scope_exclusion'] ) {
        $report['scope_exclusions'][] = [
            'id' => $product->get_id(), 'sku' => $product->get_sku(),
            'provider' => $provider, 'name' => $product->get_name(),
            'categories' => $payload['categories'], 'reason' => $analysis['scope_exclusion'],
        ];
        continue;
    }
    $report['analyzed']++;
    $report['by_provider'][ $provider ] = ( $report['by_provider'][ $provider ] ?? 0 ) + 1;
    $type = $analysis['component_type'];
    $report['by_component_type'][ $type ] = ( $report['by_component_type'][ $type ] ?? 0 ) + 1;

    $existing_source = get_post_meta( $product->get_id(), '_iv_compat_source', true );
    if ( $existing_source === 'manual' ) {
        $report['manual_preserved']++;
        $report['products_by_resolution_source']['manual'] = ( $report['products_by_resolution_source']['manual'] ?? 0 ) + 1;
        continue;
    }

    foreach ( array_unique( $analysis['sources'] ) as $source ) {
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
        $report['category_mismatches'][] = [
            'id' => $product->get_id(), 'sku' => $product->get_sku(),
            'provider' => $provider, 'name' => $product->get_name(),
            'categories' => $payload['categories'], 'reason' => $analysis['category_mismatch'],
        ];
    }
    foreach ( $analysis['conflicts'] as $conflict ) {
        $report['conflicts'][] = [ 'id' => $product->get_id(), 'name' => $product->get_name() ] + $conflict;
    }
    foreach ( $analysis['unit_errors'] as $error ) {
        $report['unit_errors'][] = [ 'id' => $product->get_id(), 'name' => $product->get_name() ] + $error;
    }
}

foreach ( [ 'by_provider', 'by_component_type', 'products_by_resolution_source', 'resolved_fields_by_source', 'field_coverage', 'pending_by_field' ] as $key ) {
    arsort( $report[ $key ] );
}
$output = $argv[1] ?? dirname( __DIR__ ) . '/artifacts/woocommerce-compatibility-dry-run-latest.json';
if ( ! is_dir( dirname( $output ) ) ) mkdir( dirname( $output ), 0775, true );
file_put_contents( $output, json_encode( $report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . PHP_EOL );

echo json_encode( [
    'output' => $output,
    'published_candidates' => $report['published_candidates'],
    'analyzed' => $report['analyzed'],
    'by_provider' => $report['by_provider'],
    'by_component_type' => $report['by_component_type'],
    'products_by_resolution_source' => $report['products_by_resolution_source'],
    'field_coverage' => $report['field_coverage'],
    'pending' => $report['pending'],
    'manual_preserved' => $report['manual_preserved'],
    'linked_dmi_candidates' => $report['linked_dmi_candidates'],
    'category_mismatches' => count( $report['category_mismatches'] ),
    'scope_exclusions' => count( $report['scope_exclusions'] ),
    'conflicts' => count( $report['conflicts'] ),
    'unit_errors' => count( $report['unit_errors'] ),
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . PHP_EOL;
