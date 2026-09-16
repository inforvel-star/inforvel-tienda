<?php
/**
 * Read-only diagnostic for the MegaSur miscategorization CSV.
 *
 * Usage:
 *   php scripts/diagnose-megasur-category-guardrails.php /path/to/report.csv
 */
require_once dirname( __DIR__ ) . '/wordpress-plugin/dmi-sync/includes/class-megasur-category-guardrails.php';

$csv_path = $argv[1] ?? '';
if ( $csv_path === '' || ! is_readable( $csv_path ) ) {
    fwrite( STDERR, "Uso: php scripts/diagnose-megasur-category-guardrails.php <csv>\n" );
    exit( 2 );
}

$handle  = fopen( $csv_path, 'rb' );
$headers = fgetcsv( $handle );
if ( ! $handle || ! is_array( $headers ) ) {
    fwrite( STDERR, "CSV vacío o inválido\n" );
    exit( 2 );
}

$headers[0] = preg_replace( '/^\xEF\xBB\xBF/', '', (string) $headers[0] );
$rows       = [];
while ( ( $values = fgetcsv( $handle ) ) !== false ) {
    if ( count( $values ) !== count( $headers ) ) {
        continue;
    }
    $rows[] = array_combine( $headers, $values );
}
fclose( $handle );

$expected_children = [
    'Switch'                 => 'Switches',
    'Monitor'                => 'Monitores PC',
    'Fuente de alimentación' => 'Fuentes de Alimentación',
    'Portátil'               => 'Portátiles',
];

$summary = [
    'csv_rows'       => count( $rows ),
    'evaluated'      => 0,
    'matched'        => 0,
    'correct'        => 0,
    'not_matched'    => 0,
    'wrong'          => 0,
    'by_type'        => [],
    'review_samples' => [],
];

foreach ( $rows as $row ) {
    $type = $row['expectedType'] ?? '';
    if ( ! isset( $expected_children[ $type ] ) ) {
        continue;
    }

    $summary['evaluated']++;
    $summary['by_type'][ $type ] ??= [ 'rows' => 0, 'matched' => 0, 'correct' => 0 ];
    $summary['by_type'][ $type ]['rows']++;

    $trace  = Megasur_Category_Guardrails::trace( $row['name'] ?? '' );
    $result = $trace['result'];
    if ( ! $result ) {
        $summary['not_matched']++;
        if ( count( $summary['review_samples'] ) < 30 ) {
            $summary['review_samples'][] = [
                'id'       => $row['id'] ?? '',
                'sku'      => $row['sku'] ?? '',
                'expected' => $type,
                'name'     => $row['name'] ?? '',
                'reason'   => $trace['reason'],
            ];
        }
        continue;
    }

    $summary['matched']++;
    $summary['by_type'][ $type ]['matched']++;
    if ( $result['wc_child'] === $expected_children[ $type ] ) {
        $summary['correct']++;
        $summary['by_type'][ $type ]['correct']++;
    } else {
        $summary['wrong']++;
    }
}

ksort( $summary['by_type'] );
echo json_encode( $summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
