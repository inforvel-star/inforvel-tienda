<?php
/**
 * Auditoría de solo lectura posterior al primer ciclo de sincronización.
 */
if ( PHP_SAPI !== 'cli' ) exit( 1 );
define( 'WP_USE_THEMES', false );
require_once '/var/www/wp/wp-load.php';

global $wpdb;
$logs = get_option( 'dmi_sync_log', [] );
if ( ! is_array( $logs ) ) $logs = [];
$megasur_logs = array_values( array_filter( $logs, function( $line ) {
    return strpos( (string) $line, '[Megasur]' ) !== false;
} ) );
$errors = array_values( array_filter( $logs, function( $line ) {
    return preg_match( '/\b(?:error|fallid[ao]|fatal|exception)\b/i', (string) $line );
} ) );

$contains = function( array $lines, string $needle ) : bool {
    foreach ( $lines as $line ) if ( strpos( (string) $line, $needle ) !== false ) return true;
    return false;
};

$report = [
    'generated_at_utc' => gmdate( 'c' ),
    'database' => DB_NAME,
    'compatibility' => [
        'enabled' => get_option( 'iv_pc_compatibility_enabled', '0' ),
        'components' => get_option( 'iv_pc_compatibility_enabled_components', [] ),
        'meta_rows' => intval( $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->postmeta} WHERE meta_key LIKE '\\_iv\\_compat\\_%'" ) ),
    ],
    'catalog' => [
        'published_products' => intval( $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type='product' AND post_status='publish'" ) ),
    ],
    'megasur' => [
        'lock' => get_option( 'megasur_sync_lock', [] ),
        'running' => get_option( 'megasur_import_running', false ),
        'last_catalog_sync' => get_option( 'megasur_last_catalog_sync', '' ),
        'last_recategorize_sync' => get_option( 'megasur_last_recategorize_sync', '' ),
        'catalog_marker_visible' => $contains( $megasur_logs, 'Sync catálogo MegaSur:' ),
        'stock_marker_visible' => $contains( $megasur_logs, 'Sync Megasur finalizado:' ),
        'recategorization_marker_visible' => $contains( $megasur_logs, 'Recategorización MegaSur (diaria):' ),
        'recent_log' => array_slice( $megasur_logs, 0, 30 ),
    ],
    'errors_in_retained_sync_log' => array_slice( $errors, 0, 30 ),
];

$output = $argv[1] ?? '/var/www/frontend-dev/wordpress-plugin/dmi-sync/artifacts/production-post-cycle-audit-latest.json';
file_put_contents( $output, json_encode( $report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . PHP_EOL );
echo json_encode( $report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . PHP_EOL;
