<?php
/**
 * Identifica credenciales WooCommerce expuestas en logs sin imprimir secretos.
 */
if ( PHP_SAPI !== 'cli' ) exit( 1 );
define( 'WP_USE_THEMES', false );
require_once '/var/www/wp/wp-load.php';

global $wpdb;
$log_paths = glob( '/home/inforvel/.pm2/logs/*.log' ) ?: [];
$credentials = [];
$affected_logs = [];

foreach ( $log_paths as $path ) {
    $content = @file_get_contents( $path );
    if ( ! is_string( $content ) || ! preg_match_all( '/Authorization:\s*Basic\s+([A-Za-z0-9+\/=]+)/i', $content, $matches ) ) continue;
    $affected_logs[] = $path;
    foreach ( array_unique( $matches[1] ) as $encoded ) {
        $decoded = base64_decode( $encoded, true );
        if ( ! is_string( $decoded ) || strpos( $decoded, ':' ) === false ) continue;
        [ $consumer_key, $consumer_secret ] = explode( ':', $decoded, 2 );
        $fingerprint = substr( hash( 'sha256', $consumer_key ), 0, 16 );
        $row = null;
        if ( function_exists( 'wc_api_hash' ) && strpos( $consumer_key, 'ck_' ) === 0 ) {
            $row = $wpdb->get_row( $wpdb->prepare(
                "SELECT k.key_id,k.user_id,k.description,k.permissions,k.last_access,u.user_login
                 FROM {$wpdb->prefix}woocommerce_api_keys k
                 LEFT JOIN {$wpdb->users} u ON u.ID=k.user_id
                 WHERE k.consumer_key=%s",
                wc_api_hash( $consumer_key )
            ), ARRAY_A );
        }
        $credentials[ $fingerprint ] = [
            'fingerprint_sha256' => $fingerprint,
            'username_type' => strpos( $consumer_key, 'ck_' ) === 0 ? 'woocommerce_consumer_key' : 'unknown_basic_username',
            'password_type' => strpos( $consumer_secret, 'cs_' ) === 0 ? 'woocommerce_consumer_secret' : 'unknown_basic_password',
            'woocommerce_record' => $row,
        ];
    }
}

$candidate_files = [];
foreach ( [ '/var/www/frontend/.env*', '/var/www/frontend-dev/.env*', '/var/www/frontend/ecosystem*', '/var/www/frontend-dev/ecosystem*' ] as $pattern ) {
    foreach ( glob( $pattern ) ?: [] as $path ) if ( is_file( $path ) ) $candidate_files[] = $path;
}

foreach ( $credentials as $fingerprint => &$credential ) {
    $credential['configured_files'] = [];
    foreach ( $candidate_files as $path ) {
        $content = @file_get_contents( $path );
        if ( ! is_string( $content ) ) continue;
        if ( preg_match_all( '/ck_[A-Za-z0-9]+/', $content, $matches ) ) {
            foreach ( $matches[0] as $candidate ) {
                if ( substr( hash( 'sha256', $candidate ), 0, 16 ) === $fingerprint ) {
                    $credential['configured_files'][] = $path;
                    break;
                }
            }
        }
    }
}
unset( $credential );

$report = [
    'generated_at_utc' => gmdate( 'c' ),
    'affected_logs' => array_values( array_unique( $affected_logs ) ),
    'credentials' => array_values( $credentials ),
];
echo json_encode( $report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) . PHP_EOL;
