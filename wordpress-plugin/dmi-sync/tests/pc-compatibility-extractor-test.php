<?php
require_once dirname( __DIR__ ) . '/includes/class-pc-compatibility-extractor.php';

$GLOBALS['iv_test_options'] = [];
$GLOBALS['iv_test_meta'] = [];
if ( ! function_exists( 'get_option' ) ) {
    function get_option( $key, $default = false ) { return $GLOBALS['iv_test_options'][ $key ] ?? $default; }
    function get_post_meta( $product_id, $key, $single = false ) { return $GLOBALS['iv_test_meta'][ $product_id ][ $key ] ?? ''; }
    function update_post_meta( $product_id, $key, $value ) { $GLOBALS['iv_test_meta'][ $product_id ][ $key ] = $value; return true; }
    function delete_post_meta( $product_id, $key ) { unset( $GLOBALS['iv_test_meta'][ $product_id ][ $key ] ); return true; }
    function do_action( ...$args ) {}
}

function fixture( string $type, array $specs, string $name = 'Producto de prueba' ) : array {
    $categories = [
        'motherboard' => [ 'Placas base', 'Placas base' ],
        'case' => [ 'Cajas y fuentes', 'Chasis PC' ],
        'gpu' => [ 'Tarjetas', 'Tarjetas Gráficas' ],
        'psu' => [ 'Cajas y fuentes', 'Fuentes de Alimentación' ],
        'cooling' => [ 'Refrigeración', 'Ventiladores' ],
        'ram' => [ 'Memoria RAM', 'Memoria RAM' ],
        'cpu' => [ 'Procesadores', 'Procesadores' ],
    ];
    return [
        'name' => $name,
        'category' => $categories[ $type ][0],
        'subCategory' => $categories[ $type ][1],
        'specifications' => [ [ 'groupName' => 'Test', 'specifications' => $specs ] ],
    ];
}

$tests = [];
$tests['motherboard'] = [
    Inforvel_PC_Compatibility_Extractor::analyze( fixture( 'motherboard', [
        [ 'name' => 'Socket de procesador', 'value' => 'Zócalo AM5' ],
        [ 'name' => 'tipos de memoria compatibles', 'value' => 'DDR5-SDRAM' ],
        [ 'name' => 'Factor de forma', 'value' => 'Micro ATX' ],
    ] ) ),
    [ '_iv_compat_socket' => 'AM5', '_iv_compat_ram_type' => 'DDR5', '_iv_compat_motherboard_form_factor' => 'MICRO_ATX' ],
];
$tests['case'] = [
    Inforvel_PC_Compatibility_Extractor::analyze( fixture( 'case', [
        [ 'name' => 'Formas de factor de tarjeta madre soportadas', 'value' => 'Hasta EATX' ],
        [ 'name' => 'Máxima longitud de la tarjeta de gráficos', 'value' => '36 cm' ],
        [ 'name' => 'Altura máxima de la CPU más fresco', 'value' => '17,5 cm' ],
        [ 'name' => 'Máxima longitud de PSU', 'value' => '22 cm' ],
    ] ) ),
    [
        '_iv_compat_case_form_factors' => [ 'MINI_ITX', 'MICRO_ATX', 'ATX', 'EATX' ],
        '_iv_compat_case_gpu_max_mm' => 360,
        '_iv_compat_case_cooler_max_mm' => 175,
        '_iv_compat_case_psu_max_mm' => 220,
    ],
];
$tests['gpu'] = [
    Inforvel_PC_Compatibility_Extractor::analyze( fixture( 'gpu', [
        [ 'name' => 'Longitud', 'value' => '174 mm' ],
        [ 'name' => 'Suministro de energía al sistema mínimo', 'value' => '300 W' ],
    ] ) ),
    [ '_iv_compat_gpu_length_mm' => 174, '_iv_compat_gpu_min_psu_watts' => 300 ],
];
$tests['psu'] = [
    Inforvel_PC_Compatibility_Extractor::analyze( fixture( 'psu', [
        [ 'name' => 'Potencia total', 'value' => '650 W' ],
        [ 'name' => 'Factor de forma de fuente de alimentación (PSU)', 'value' => 'ATX' ],
    ] ) ),
    [ '_iv_compat_psu_watts' => 650, '_iv_compat_psu_form_factor' => 'ATX' ],
];
$tests['cooling'] = [
    Inforvel_PC_Compatibility_Extractor::analyze( fixture( 'cooling', [
        [ 'name' => 'Sockets de procesador soportados', 'value' => 'LGA 1700, LGA 1851, Zócalo AM4, Zócalo AM5' ],
        [ 'name' => 'Altura de radiador', 'value' => '2,7 cm' ],
    ], 'MSI refrigeración líquida A13' ) ),
    [ '_iv_compat_cooler_sockets' => [ 'LGA1700', 'LGA1851', 'AM4', 'AM5' ], '_iv_compat_radiator_height_mm' => 27 ],
];
$tests['ram-text'] = [
    Inforvel_PC_Compatibility_Extractor::analyze( fixture( 'ram', [], 'KINGSTON FURY 32GB DDR5 6000MHz' ) ),
    [ '_iv_compat_ram_type' => 'DDR5' ],
];
$tests['cpu-table'] = [
    Inforvel_PC_Compatibility_Extractor::analyze( fixture( 'cpu', [], 'Intel Core Ultra 5 245KF procesador Caja' ) ),
    [ '_iv_compat_socket' => 'LGA1851' ],
];

$errors = [];
foreach ( $tests as $label => [ $actual, $expected ] ) {
    foreach ( $expected as $key => $value ) {
        if ( ! array_key_exists( $key, $actual['fields'] ) || $actual['fields'][ $key ] !== $value ) {
            $errors[] = [ 'case' => $label, 'field' => $key, 'expected' => $value, 'actual' => $actual['fields'][ $key ] ?? null ];
        }
    }
}

$bad_cpu = Inforvel_PC_Compatibility_Extractor::analyze( fixture( 'cpu', [], 'MINI ORDENADOR ACER I5-14400T 16GB SSD 512GB' ), 'megasur' );
if ( ! $bad_cpu['category_mismatch'] || $bad_cpu['pending'] ) {
    $errors[] = [ 'case' => 'miscategorized-cpu', 'actual' => $bad_cpu ];
}

$manual = Inforvel_PC_Compatibility_Extractor::build_meta_updates(
    $tests['motherboard'][0],
    [ '_iv_compat_source' => 'manual', '_iv_compat_socket' => 'AM4' ]
);
if ( ! $manual['manual_preserved'] || $manual['updates'] !== [] ) {
    $errors[] = [ 'case' => 'manual-preserved', 'actual' => $manual ];
}

$usb_memory = Inforvel_PC_Compatibility_Extractor::analyze(
    fixture( 'ram', [], 'MEMORIA USB 3.2 KINGSTON 256GB DATATRAVELER' ),
    'megasur'
);
if ( ! $usb_memory['category_mismatch'] || $usb_memory['pending'] ) {
    $errors[] = [ 'case' => 'usb-is-not-ram', 'actual' => $usb_memory ];
}

$case_fan = Inforvel_PC_Compatibility_Extractor::analyze(
    fixture( 'cooling', [], 'XPG VENTO 120 Carcasa del ordenador Ventilador' ),
    'megasur'
);
if ( ! $case_fan['scope_exclusion'] || $case_fan['pending'] ) {
    $errors[] = [ 'case' => 'case-fan-out-of-scope', 'actual' => $case_fan ];
}

$GLOBALS['iv_test_options']['iv_pc_compatibility_enabled'] = '0';
$disabled_write = Inforvel_PC_Compatibility_Extractor::persist_analysis( 7001, $tests['motherboard'][0] );
if ( $disabled_write['reason'] !== 'disabled' || ! empty( $GLOBALS['iv_test_meta'][7001] ) ) {
    $errors[] = [ 'case' => 'feature-flag-default-off', 'actual' => $disabled_write ];
}

$GLOBALS['iv_test_options']['iv_pc_compatibility_enabled'] = '1';
$GLOBALS['iv_test_options']['iv_pc_compatibility_enabled_components'] = [];
$empty_scope_write = Inforvel_PC_Compatibility_Extractor::persist_analysis( 7006, $tests['motherboard'][0] );
if ( $empty_scope_write['reason'] !== 'component_disabled' || ! empty( $GLOBALS['iv_test_meta'][7006] ) ) {
    $errors[] = [ 'case' => 'empty-component-scope-is-safe', 'actual' => $empty_scope_write ];
}

$GLOBALS['iv_test_options']['iv_pc_compatibility_enabled_components'] = [ 'motherboard' ];
if ( ! Inforvel_PC_Compatibility_Extractor::should_process( fixture( 'motherboard', [] ) )
    || Inforvel_PC_Compatibility_Extractor::should_process( fixture( 'case', [] ) ) ) {
    $errors[] = [ 'case' => 'motherboard-only-scope' ];
}
$disabled_case_write = Inforvel_PC_Compatibility_Extractor::persist_analysis( 7007, $tests['case'][0] );
if ( $disabled_case_write['reason'] !== 'component_disabled' || ! empty( $GLOBALS['iv_test_meta'][7007] ) ) {
    $errors[] = [ 'case' => 'disabled-component-not-persisted', 'actual' => $disabled_case_write ];
}

$not_component = Inforvel_PC_Compatibility_Extractor::analyze( [
    'name' => 'Cable de red CAT6',
    'categories' => [ 'Cables de red' ],
] );
$not_component_write = Inforvel_PC_Compatibility_Extractor::persist_analysis( 7003, $not_component );
if ( $not_component_write['reason'] !== 'not_component' || ! empty( $GLOBALS['iv_test_meta'][7003] ) ) {
    $errors[] = [ 'case' => 'non-component-not-persisted', 'actual' => $not_component_write ];
}

$GLOBALS['iv_test_options']['iv_pc_compatibility_enabled_components'] = [ 'all' ];
$bad_cpu_write = Inforvel_PC_Compatibility_Extractor::persist_analysis( 7004, $bad_cpu );
if ( $bad_cpu_write['reason'] !== 'category_mismatch' || ! empty( $GLOBALS['iv_test_meta'][7004] ) ) {
    $errors[] = [ 'case' => 'category-mismatch-not-persisted', 'actual' => $bad_cpu_write ];
}

$case_fan_write = Inforvel_PC_Compatibility_Extractor::persist_analysis( 7005, $case_fan );
if ( $case_fan_write['reason'] !== 'scope_exclusion' || ! empty( $GLOBALS['iv_test_meta'][7005] ) ) {
    $errors[] = [ 'case' => 'scope-exclusion-not-persisted', 'actual' => $case_fan_write ];
}

$GLOBALS['iv_test_meta'][7002] = [ '_iv_compat_source' => 'manual', '_iv_compat_socket' => 'AM4' ];
$manual_write = Inforvel_PC_Compatibility_Extractor::persist_analysis( 7002, $tests['motherboard'][0] );
if ( $manual_write['reason'] !== 'manual_preserved' || $GLOBALS['iv_test_meta'][7002]['_iv_compat_socket'] !== 'AM4' ) {
    $errors[] = [ 'case' => 'manual-survives-persistence', 'actual' => $manual_write, 'meta' => $GLOBALS['iv_test_meta'][7002] ];
}

if ( $errors ) {
    fwrite( STDERR, json_encode( $errors, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE ) . PHP_EOL );
    exit( 1 );
}

echo 'OK: ' . ( count( $tests ) + 12 ) . " casos de compatibilidad" . PHP_EOL;
