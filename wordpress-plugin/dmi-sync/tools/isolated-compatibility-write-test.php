<?php
/**
 * Prueba de persistencia contra la copia MySQL aislada del catálogo.
 * Nunca debe ejecutarse contra la base de datos de producción.
 */
if ( PHP_SAPI !== 'cli' ) {
    fwrite( STDERR, "Este script solo puede ejecutarse por CLI.\n" );
    exit( 1 );
}

$wp_load = getenv( 'IV_WP_LOAD' ) ?: '/var/www/wp-compat-dev/wp-load.php';
define( 'WP_USE_THEMES', false );
require_once $wp_load;

if ( ! defined( 'DB_NAME' ) || DB_NAME !== 'wpdb_compat_dev' ) {
    fwrite( STDERR, "ABORTADO: la prueba solo admite DB_NAME=wpdb_compat_dev.\n" );
    exit( 2 );
}
if ( ! class_exists( 'Inforvel_PC_Compatibility_Extractor' ) ) {
    fwrite( STDERR, "No se cargó el extractor integrado.\n" );
    exit( 3 );
}

global $wpdb;
$component_scope = getenv( 'IV_COMPAT_COMPONENT_SCOPE' ) ?: 'all';
$valid_scopes = [ 'all', 'cpu', 'motherboard', 'ram', 'case', 'psu', 'cooling', 'gpu', 'storage' ];
if ( ! in_array( $component_scope, $valid_scopes, true ) ) {
    fwrite( STDERR, "Alcance de componente no válido.\n" );
    exit( 6 );
}

function iv_compat_test_payload( int $product_id ) : ?array {
    $product = wc_get_product( $product_id );
    if ( ! $product ) return null;
    $categories = wp_get_post_terms( $product_id, 'product_cat', [ 'fields' => 'names' ] );
    $payload = [
        'id' => $product_id,
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
    return $payload;
}

$ids = array_map( 'intval', $wpdb->get_col( 'SELECT product_id FROM iv_selected_product_ids ORDER BY product_id' ) );
$records = [ 'dmi' => [], 'megasur' => [] ];
foreach ( $ids as $product_id ) {
    $payload = iv_compat_test_payload( $product_id );
    if ( ! $payload ) continue;
    $provider = get_post_meta( $product_id, '_megasur_product', true ) === '1' ? 'megasur' : 'dmi';
    $records[ $provider ][ $product_id ] = $payload;
}

$count_meta = function() use ( $wpdb ) : int {
    return intval( $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->postmeta} WHERE meta_key LIKE '\\_iv\\_compat\\_%'" ) );
};

delete_option( Inforvel_PC_Compatibility_Extractor::ENABLE_OPTION );
delete_option( Inforvel_PC_Compatibility_Extractor::ENABLED_COMPONENTS_OPTION );
$before_disabled = $count_meta();
$disabled_result = null;
foreach ( $records as $provider => $provider_records ) {
    foreach ( $provider_records as $product_id => $payload ) {
        $analysis = Inforvel_PC_Compatibility_Extractor::analyze( $payload, $provider );
        if ( $analysis['component_type'] && ! $analysis['category_mismatch'] && ! $analysis['scope_exclusion'] ) {
            $disabled_result = Inforvel_PC_Compatibility_Extractor::persist_analysis( $product_id, $analysis );
            break 2;
        }
    }
}
$after_disabled = $count_meta();
if ( ! $disabled_result || $disabled_result['reason'] !== 'disabled' || $before_disabled !== $after_disabled ) {
    fwrite( STDERR, "Fallo: la feature flag apagada permitió una escritura.\n" );
    exit( 4 );
}

update_option( Inforvel_PC_Compatibility_Extractor::ENABLE_OPTION, '1' );
update_option( Inforvel_PC_Compatibility_Extractor::ENABLED_COMPONENTS_OPTION, [ $component_scope ] );
$result_counts = [];
$analyzed = 0;
$manual_product_id = 0;
$manual_field = '';

foreach ( [ 'dmi', 'megasur' ] as $provider ) {
    foreach ( $records[ $provider ] as $product_id => $payload ) {
        if ( ! Inforvel_PC_Compatibility_Extractor::should_process( $payload ) ) {
            $result_counts['skipped_by_scope'] = ( $result_counts['skipped_by_scope'] ?? 0 ) + 1;
            continue;
        }
        $linked_fields = [];
        if ( $provider === 'megasur' ) {
            $linked_id = intval( get_post_meta( $product_id, '_megasur_linked_product_id', true ) );
            if ( $linked_id > 0 ) {
                $linked_fields = Inforvel_PC_Compatibility_Extractor::read_product_fields( $linked_id );
            }
        }
        $analysis = Inforvel_PC_Compatibility_Extractor::analyze( $payload, $provider, $linked_fields );
        if ( $analysis['component_type'] ) $analyzed++;

        if ( ! $manual_product_id && $analysis['fields'] && ! $analysis['category_mismatch'] && ! $analysis['scope_exclusion'] ) {
            $manual_product_id = $product_id;
            $manual_field = array_key_first( $analysis['fields'] );
            update_post_meta( $product_id, '_iv_compat_source', 'manual' );
            update_post_meta( $product_id, $manual_field, 'MANUAL_SENTINEL' );
        }

        $persisted = Inforvel_PC_Compatibility_Extractor::persist_analysis( $product_id, $analysis );
        $reason = $persisted['reason'] ?? 'unknown';
        $result_counts[ $reason ] = ( $result_counts[ $reason ] ?? 0 ) + 1;
    }
}

$manual_ok = $manual_product_id > 0
    && get_post_meta( $manual_product_id, '_iv_compat_source', true ) === 'manual'
    && get_post_meta( $manual_product_id, $manual_field, true ) === 'MANUAL_SENTINEL';
if ( ! $manual_ok ) {
    fwrite( STDERR, "Fallo: no se preservó el metadato manual.\n" );
    exit( 5 );
}

update_option( Inforvel_PC_Compatibility_Extractor::ENABLE_OPTION, '0' );
update_option( Inforvel_PC_Compatibility_Extractor::ENABLED_COMPONENTS_OPTION, [] );
ksort( $result_counts );
$report = [
    'generated_at_utc' => gmdate( 'c' ),
    'database' => DB_NAME,
    'component_scope' => $component_scope,
    'selected_products' => count( $ids ),
    'loaded_products' => count( $records['dmi'] ) + count( $records['megasur'] ),
    'by_provider' => [ 'dmi' => count( $records['dmi'] ), 'megasur' => count( $records['megasur'] ) ],
    'analyzed_components' => $analyzed,
    'disabled_write_check' => [
        'before' => $before_disabled,
        'after' => $after_disabled,
        'reason' => $disabled_result['reason'],
    ],
    'persistence_results' => $result_counts,
    'manual_preserved' => [ 'product_id' => $manual_product_id, 'field' => $manual_field, 'ok' => $manual_ok ],
    'products_with_compat_meta' => intval( $wpdb->get_var( "SELECT COUNT(DISTINCT post_id) FROM {$wpdb->postmeta} WHERE meta_key LIKE '\\_iv\\_compat\\_%'" ) ),
    'compat_meta_rows' => $count_meta(),
    'feature_flag_after_test' => get_option( Inforvel_PC_Compatibility_Extractor::ENABLE_OPTION, '0' ),
];

$output = $argv[1] ?? dirname( __DIR__ ) . '/artifacts/isolated-compatibility-write-test-latest.json';
file_put_contents( $output, json_encode( $report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . PHP_EOL );
echo json_encode( $report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . PHP_EOL;
