<?php
require_once dirname( __DIR__ ) . '/includes/class-megasur-category-guardrails.php';

$cases = [
    [ 'SWITCH TP-LINK SG3428XMP 28 PUERTOS', 'Switches', 'title:switch' ],
    [ 'SWITCH HDMI 4K STARTECH VS421HD20 4 PUERTOS', 'Switches', 'title:switch' ],
    [ 'MONITOR LED 27" DELL PRO P2726DEV IPS QHD', 'Monitores PC', 'title:monitor' ],
    [ 'FUENTE ALIMENTACION BEQUIET DARK POWER 14 GAMING ATX 850W', 'Fuentes de Alimentación', 'title:power-supply' ],
    [ 'FUENTE ALIMENTACIN MARS GAMING MPB1000SIMW ATX 1000W', 'Fuentes de Alimentación', 'title:power-supply' ],
    [ 'PORTATIL / TABLET MICROSOFT SURFACE PRO U7 / 16GB / SSD 256GB / W11P', 'Portátiles', 'title:laptop' ],
    [ 'PORTATIL ACER EXTENSA I5 / 16GB RAM / SSD 512GB', 'Portátiles', 'title:laptop' ],
];

$negative_cases = [
    'CONSOLA NINTENDO SWITCH OLED',
    'SOPORTE MONITOR TOOQ DB1401TN-B',
    'ADAPTADOR DE CORRIENTE PARA PORTATIL HP',
    'IMPRESORA PORTATIL BROTHER PJ-883',
    'ALTAVOZ PORTATIL JBL FLIP',
    'TECLADO PARA MICROSOFT SURFACE PRO',
];

$errors = [];
foreach ( $cases as [ $title, $expected_child, $expected_reason ] ) {
    $actual = Megasur_Category_Guardrails::classify( $title );
    if ( ! $actual || $actual['wc_child'] !== $expected_child || $actual['reason'] !== $expected_reason ) {
        $errors[] = [ 'title' => $title, 'expected' => $expected_child, 'actual' => $actual ];
    }
}

foreach ( $negative_cases as $title ) {
    $actual = Megasur_Category_Guardrails::classify( $title );
    if ( $actual !== null ) {
        $errors[] = [ 'title' => $title, 'expected' => null, 'actual' => $actual ];
    }
}

if ( $errors ) {
    fwrite( STDERR, json_encode( $errors, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE ) . PHP_EOL );
    exit( 1 );
}

echo 'OK: ' . ( count( $cases ) + count( $negative_cases ) ) . " casos de regresión" . PHP_EOL;
