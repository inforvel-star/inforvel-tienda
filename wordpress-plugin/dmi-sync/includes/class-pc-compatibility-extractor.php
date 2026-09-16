<?php
/**
 * Normaliza metadatos de compatibilidad para el futuro configurador de PC.
 *
 * Esta clase no depende de WooCommerce para poder probarla y ejecutarla en
 * dry-run. La persistencia está encapsulada y solo se usa cuando la opción
 * iv_pc_compatibility_enabled está activada expresamente.
 */
class Inforvel_PC_Compatibility_Extractor {

    const ENABLE_OPTION = 'iv_pc_compatibility_enabled';
    const ENABLED_COMPONENTS_OPTION = 'iv_pc_compatibility_enabled_components';

    private static $field_priority = [
        'manual'       => 600,
        'dmi'          => 500,
        'linked_dmi'   => 400,
        'cpu_table'    => 300,
        'text'         => 200,
        'pending'      => 0,
    ];

    /** Tabla cerrada de los 37 procesadores DMI publicados auditados. */
    private static $cpu_socket_table = [
        'AMD ATHLON 3000G'       => 'AM4',
        'AMD RYZEN 5 5600XT'     => 'AM4',
        'AMD RYZEN 7 5700X'      => 'AM4',
        'AMD RYZEN 5 7600'       => 'AM5',
        'AMD RYZEN 5 7600X'      => 'AM5',
        'AMD RYZEN 5 8400F'      => 'AM5',
        'AMD RYZEN 5 8600G'      => 'AM5',
        'AMD RYZEN 5 9600X'      => 'AM5',
        'AMD RYZEN 7 7700X'      => 'AM5',
        'AMD RYZEN 7 7800X3D'    => 'AM5',
        'AMD RYZEN 7 9700X'      => 'AM5',
        'AMD RYZEN 7 9800X3D'    => 'AM5',
        'AMD RYZEN 9 7900X'      => 'AM5',
        'AMD RYZEN 9 9900X'      => 'AM5',
        'AMD RYZEN 9 9900X3D'    => 'AM5',
        'INTEL CORE I5-12400'     => 'LGA1700',
        'INTEL CORE I5-12400F'    => 'LGA1700',
        'INTEL CORE I5-12600KF'   => 'LGA1700',
        'INTEL CORE I5-14400'     => 'LGA1700',
        'INTEL CORE I5-14400F'    => 'LGA1700',
        'INTEL CORE I5-14600KF'   => 'LGA1700',
        'INTEL CORE I7-12700F'    => 'LGA1700',
        'INTEL CORE I7-12700K'    => 'LGA1700',
        'INTEL CORE I7-12700KF'   => 'LGA1700',
        'INTEL CORE I7-14700'     => 'LGA1700',
        'INTEL CORE I7-14700F'    => 'LGA1700',
        'INTEL CORE I7-14700K'    => 'LGA1700',
        'INTEL CORE I7-14700KF'   => 'LGA1700',
        'INTEL CORE I9-12900K'    => 'LGA1700',
        'INTEL CORE I9-12900KF'   => 'LGA1700',
        'INTEL CORE I9-14900F'    => 'LGA1700',
        'INTEL CORE I9-14900K'    => 'LGA1700',
        'INTEL CORE ULTRA 5 245K' => 'LGA1851',
        'INTEL CORE ULTRA 5 245KF'=> 'LGA1851',
        'INTEL CORE ULTRA 5 250K PLUS'  => 'LGA1851',
        'INTEL CORE ULTRA 5 250KF PLUS' => 'LGA1851',
        'INTEL CORE ULTRA 7 270K PLUS'  => 'LGA1851',
    ];

    public static function analyze( array $product, string $provider = 'dmi', array $linked_fields = [] ) : array {
        $type = self::component_type( $product );
        $result = [
            'id'                 => $product['productId'] ?? ( $product['id'] ?? '' ),
            'name'               => (string) ( $product['name'] ?? ( $product['nombre'] ?? '' ) ),
            'provider'           => $provider,
            'component_type'     => $type,
            'fields'             => [],
            'sources'            => [],
            'confidence'         => [],
            'pending'            => false,
            'pending_fields'     => [],
            'conflicts'          => [],
            'unit_errors'        => [],
            'unmapped_specs'     => [],
            'category_mismatch'  => null,
            'scope_exclusion'    => null,
        ];

        if ( ! $type ) return $result;

        if ( $type === 'cpu' && ! self::is_standalone_processor( $product['name'] ?? ( $product['nombre'] ?? '' ) ) ) {
            $result['category_mismatch'] = 'Categoría Procesadores, pero el título corresponde a un equipo completo/barebone/servidor.';
            return $result;
        }
        if ( $type === 'ram' && ! self::is_memory_module( $product ) ) {
            $result['category_mismatch'] = 'Categoría Memoria RAM, pero el producto no es un módulo DIMM/SO-DIMM DDR.';
            return $result;
        }
        if ( $type === 'cooling' && ! self::is_cpu_cooling( $product ) ) {
            $result['scope_exclusion'] = 'Ventilador de caja/placa: queda fuera del paso de refrigeración de CPU.';
            return $result;
        }

        if ( $provider === 'dmi' ) {
            self::extract_structured_specs( $product, $type, $result );
        }

        if ( $provider === 'megasur' && $linked_fields ) {
            foreach ( $linked_fields as $key => $value ) {
                if ( strpos( $key, '_iv_compat_' ) !== 0 || in_array( $key, self::control_meta_keys(), true ) ) continue;
                self::offer( $result, $key, $value, 'linked_dmi', 90 );
            }
        }

        if ( $type === 'cpu' ) {
            $socket = self::cpu_socket_for_title( $product['name'] ?? ( $product['nombre'] ?? '' ) );
            if ( $socket ) self::offer( $result, '_iv_compat_socket', $socket, 'cpu_table', 100 );
        }

        self::extract_text_fallback( $product, $type, $result );
        self::finalize( $result );
        return $result;
    }

    public static function is_enabled() : bool {
        return function_exists( 'get_option' ) && get_option( self::ENABLE_OPTION, '0' ) === '1';
    }

    public static function enabled_components() : array {
        if ( ! function_exists( 'get_option' ) ) return [];
        $value = get_option( self::ENABLED_COMPONENTS_OPTION, [] );
        if ( is_string( $value ) ) {
            $decoded = json_decode( $value, true );
            $value = is_array( $decoded ) ? $decoded : preg_split( '/[\s,]+/', $value, -1, PREG_SPLIT_NO_EMPTY );
        }
        if ( ! is_array( $value ) ) return [];
        $allowed = [ 'all', 'cpu', 'motherboard', 'ram', 'case', 'psu', 'cooling', 'gpu', 'storage' ];
        $value = array_map( function( $component ) {
            return strtolower( preg_replace( '/[^a-z_]/', '', (string) $component ) );
        }, $value );
        return array_values( array_intersect( $allowed, array_unique( $value ) ) );
    }

    public static function is_component_enabled( ?string $component_type ) : bool {
        if ( ! self::is_enabled() || ! $component_type ) return false;
        $enabled = self::enabled_components();
        return in_array( 'all', $enabled, true ) || in_array( $component_type, $enabled, true );
    }

    public static function should_process( array $product ) : bool {
        return self::is_component_enabled( self::component_type( $product ) );
    }

    public static function component_type( array $product ) : ?string {
        $category = self::normalize_text( $product['category'] ?? ( $product['familia'] ?? '' ) );
        $sub = self::normalize_text( $product['subCategory'] ?? ( $product['subfamilia'] ?? '' ) );
        $wc_categories = array_map( [ __CLASS__, 'normalize_text' ], (array) ( $product['categories'] ?? [] ) );
        $all = array_values( array_filter( array_unique( array_merge( [ $category, $sub ], $wc_categories ) ) ) );

        if ( in_array( 'placas base', $all, true ) || in_array( 'motherboards', $all, true ) ) return 'motherboard';
        if ( in_array( 'procesadores', $all, true ) ) return 'cpu';
        if ( in_array( 'memoria ram', $all, true ) ) return 'ram';
        if ( in_array( 'chasis pc', $all, true ) || in_array( 'cajas pc', $all, true ) ) return 'case';
        if ( in_array( 'fuentes de alimentacion', $all, true ) ) return 'psu';
        if ( ( $category === 'refrigeracion' && $sub === 'ventiladores' ) || in_array( 'ventiladores', $wc_categories, true ) ) return 'cooling';
        if ( in_array( 'tarjetas graficas', $all, true ) ) return 'gpu';
        if ( in_array( 'carcasas', $wc_categories, true ) || in_array( 'estaciones base', $wc_categories, true ) ) return null;
        if ( ( $category === 'discos duros internos' && in_array( $sub, [ 'discos duros internos', 'discos duros internos ssd' ], true ) )
            || in_array( 'discos duros internos ssd', $wc_categories, true )
            || in_array( 'discos duros internos', $wc_categories, true ) ) return 'storage';
        return null;
    }

    public static function is_standalone_processor( string $name ) : bool {
        $text = self::normalize_text( $name );
        if ( preg_match( '/\b(?:mini ordenador|ordenador|servidor|barebone|portatil|all in one|imac|workstation)\b/', $text ) ) return false;
        if ( preg_match( '/\b(?:ram|ddr[345]|ssd|hdd)\s*[0-9]|[0-9]+\s*(?:gb|tb)\s*(?:ram|ssd|hdd)\b/', $text ) ) return false;
        return self::cpu_socket_for_title( $name ) !== null || preg_match( '/\b(?:procesador|processor)\b/', $text );
    }

    public static function is_memory_module( array $product ) : bool {
        $text = self::product_search_text( $product );
        if ( preg_match( '/\b(?:ddr[345]|so[\s-]?dimm|dimm|pc[345][\s-]?[0-9]+)\b/', $text ) ) return true;
        return false;
    }

    public static function is_cpu_cooling( array $product ) : bool {
        $text = self::product_search_text( $product );
        if ( preg_match( '/\b(?:carcasa del ordenador|ventilador de caja|placa base ventilador)\b/', $text )
            && ! preg_match( '/\b(?:procesador|cpu|aio|refrigeracion liquida|kit rl|socket)\b/', $text ) ) return false;
        return (bool) preg_match( '/\b(?:procesador|cpu|aio|refrigeracion liquida|kit rl|disipador|sockets? de procesador)\b/', $text );
    }

    public static function cpu_socket_for_title( string $name ) : ?string {
        $title = self::normalize_token( $name );
        // Las claves largas deben evaluarse antes para que 12400 no capture 12400F.
        $models = self::$cpu_socket_table;
        uksort( $models, function( $a, $b ) { return strlen( $b ) <=> strlen( $a ); } );
        foreach ( $models as $model => $socket ) {
            if ( strpos( $title, $model ) !== false ) return $socket;
        }
        return null;
    }

    public static function normalize_millimetres( $value ) : ?int {
        $text = self::normalize_text( $value );
        if ( ! preg_match( '/(-?[0-9]+(?:[.,][0-9]+)?)\s*(mm|cm|m)\b/', $text, $m ) ) return null;
        $number = (float) str_replace( ',', '.', $m[1] );
        if ( $number <= 0 ) return null;
        $factor = $m[2] === 'm' ? 1000 : ( $m[2] === 'cm' ? 10 : 1 );
        return (int) round( $number * $factor );
    }

    public static function normalize_watts( $value ) : ?int {
        $text = self::normalize_text( $value );
        if ( ! preg_match( '/([0-9]+(?:[.,][0-9]+)?)\s*w\b/', $text, $m ) ) return null;
        $watts = (int) round( (float) str_replace( ',', '.', $m[1] ) );
        return $watts > 0 ? $watts : null;
    }

    public static function normalize_sockets( $value ) : array {
        $text = strtoupper( self::decode_text( $value ) );
        preg_match_all( '/\b(?:AM[345]|LGA\s*-?\s*[0-9]{3,4}|TR4|STRX4|STR5)\b/i', $text, $matches );
        $values = array_map( function( $socket ) {
            return preg_replace( '/[\s-]+/', '', strtoupper( $socket ) );
        }, $matches[0] ?? [] );
        return array_values( array_unique( $values ) );
    }

    public static function normalize_ram_types( $value ) : array {
        preg_match_all( '/\bDDR[345]\b/i', self::decode_text( $value ), $matches );
        return array_values( array_unique( array_map( 'strtoupper', $matches[0] ?? [] ) ) );
    }

    public static function normalize_form_factors( $value, bool $expand_maximum = false ) : array {
        $raw = self::normalize_text( $value );
        $found = [];
        if ( preg_match( '/\b(?:e[\s-]?atx|extended\s+atx)\b/', $raw ) ) $found[] = 'EATX';
        if ( preg_match( '/\bmicro[\s-]?atx\b|\bmatx\b/', $raw ) ) $found[] = 'MICRO_ATX';
        if ( preg_match( '/\bmini[\s-]?itx\b/', $raw ) ) $found[] = 'MINI_ITX';
        $without_specific = preg_replace( '/(?:e[\s-]?atx|extended\s+atx|micro[\s-]?atx|matx)/', ' ', $raw );
        if ( preg_match( '/\batx\b/', $without_specific ) ) $found[] = 'ATX';

        if ( $expand_maximum && strpos( $raw, 'hasta' ) !== false && $found ) {
            $order = [ 'MINI_ITX', 'MICRO_ATX', 'ATX', 'EATX' ];
            $max = max( array_map( function( $format ) use ( $order ) { return array_search( $format, $order, true ); }, $found ) );
            $found = array_slice( $order, 0, $max + 1 );
        }
        return array_values( array_unique( $found ) );
    }

    public static function build_meta_updates( array $analysis, array $existing_meta = [] ) : array {
        if ( ( $existing_meta['_iv_compat_source'] ?? '' ) === 'manual' ) {
            return [ 'manual_preserved' => true, 'updates' => [] ];
        }

        $updates = $analysis['fields'];
        $source_values = array_values( array_unique( $analysis['sources'] ) );
        usort( $source_values, function( $a, $b ) {
            return ( self::$field_priority[ $b ] ?? 0 ) <=> ( self::$field_priority[ $a ] ?? 0 );
        } );
        $updates['_iv_compat_source'] = $source_values[0] ?? 'pending';
        $updates['_iv_compat_sources'] = $analysis['sources'];
        $updates['_iv_compat_confidence'] = empty( $analysis['confidence'] ) ? 0 : min( $analysis['confidence'] );
        $updates['_iv_compat_pending'] = $analysis['pending'] ? 1 : 0;
        $updates['_iv_compat_pending_fields'] = $analysis['pending_fields'];
        return [ 'manual_preserved' => false, 'updates' => $updates ];
    }

    /** Persistencia protegida; no hace nada si la feature flag no está activa. */
    public static function persist_analysis( int $product_id, array $analysis ) : array {
        if ( ! self::is_enabled() ) {
            return [ 'written' => false, 'reason' => 'disabled' ];
        }
        if ( empty( $analysis['component_type'] ) ) {
            return [ 'written' => false, 'reason' => 'not_component' ];
        }
        if ( ! self::is_component_enabled( $analysis['component_type'] ) ) {
            return [ 'written' => false, 'reason' => 'component_disabled' ];
        }
        if ( ! empty( $analysis['category_mismatch'] ) ) {
            return [ 'written' => false, 'reason' => 'category_mismatch' ];
        }
        if ( ! empty( $analysis['scope_exclusion'] ) ) {
            return [ 'written' => false, 'reason' => 'scope_exclusion' ];
        }
        $existing = [ '_iv_compat_source' => get_post_meta( $product_id, '_iv_compat_source', true ) ];
        $prepared = self::build_meta_updates( $analysis, $existing );
        if ( $prepared['manual_preserved'] ) return [ 'written' => false, 'reason' => 'manual_preserved' ];
        foreach ( self::compatibility_field_keys() as $key ) {
            if ( ! array_key_exists( $key, $prepared['updates'] ) ) delete_post_meta( $product_id, $key );
        }
        foreach ( $prepared['updates'] as $key => $value ) update_post_meta( $product_id, $key, $value );
        if ( function_exists( 'do_action' ) ) {
            if ( $analysis['unmapped_specs'] ) do_action( 'iv_pc_compatibility_unmapped_specs', $product_id, $analysis['unmapped_specs'] );
            if ( $analysis['unit_errors'] ) do_action( 'iv_pc_compatibility_unit_errors', $product_id, $analysis['unit_errors'] );
        }
        return [ 'written' => true, 'reason' => 'updated', 'updates' => array_keys( $prepared['updates'] ) ];
    }

    public static function read_product_fields( int $product_id ) : array {
        if ( ! function_exists( 'get_post_meta' ) ) return [];
        $fields = [];
        foreach ( self::compatibility_field_keys() as $key ) {
            $value = get_post_meta( $product_id, $key, true );
            if ( $value !== '' && $value !== null ) $fields[ $key ] = $value;
        }
        return $fields;
    }

    private static function extract_structured_specs( array $product, string $type, array &$result ) : void {
        foreach ( self::flatten_specs( $product['specifications'] ?? [] ) as $spec ) {
            $name = self::normalize_text( $spec['name'] ?? '' );
            $value = $spec['value'] ?? '';
            $mapped = false;

            if ( $type === 'motherboard' ) {
                if ( in_array( $name, [ 'socket de procesador', 'zocalo de procesador', 'sockets de procesador soportados' ], true ) ) {
                    $mapped = self::offer_array( $result, '_iv_compat_socket', self::normalize_sockets( $value ), 'dmi', 100 );
                } elseif ( in_array( $name, [ 'tipos de memoria compatibles', 'tipo de memoria compatible', 'tipo de memoria' ], true ) ) {
                    $mapped = self::offer_array( $result, '_iv_compat_ram_type', self::normalize_ram_types( $value ), 'dmi', 100 );
                } elseif ( $name === 'factor de forma' ) {
                    $mapped = self::offer_array( $result, '_iv_compat_motherboard_form_factor', self::normalize_form_factors( $value ), 'dmi', 100 );
                }
            } elseif ( $type === 'case' ) {
                if ( in_array( $name, [ 'formas de factor de tarjeta madre soportadas', 'factores de forma de tarjeta madre soportados', 'formatos de placa base soportados' ], true ) ) {
                    $mapped = self::offer_array( $result, '_iv_compat_case_form_factors', self::normalize_form_factors( $value, true ), 'dmi', 100 );
                } elseif ( $name === 'maxima longitud de la tarjeta de graficos' ) {
                    $mapped = self::offer_dimension( $result, '_iv_compat_case_gpu_max_mm', $value, 'dmi' );
                } elseif ( in_array( $name, [ 'altura maxima de la cpu mas fresco', 'altura maxima del disipador de cpu' ], true ) ) {
                    $mapped = self::offer_dimension( $result, '_iv_compat_case_cooler_max_mm', $value, 'dmi' );
                } elseif ( $name === 'maxima longitud de psu' ) {
                    $mapped = self::offer_dimension( $result, '_iv_compat_case_psu_max_mm', $value, 'dmi' );
                }
            } elseif ( $type === 'gpu' ) {
                if ( $name === 'longitud' ) $mapped = self::offer_dimension( $result, '_iv_compat_gpu_length_mm', $value, 'dmi' );
                elseif ( $name === 'suministro de energia al sistema minimo' ) $mapped = self::offer_watts( $result, '_iv_compat_gpu_min_psu_watts', $value, 'dmi' );
            } elseif ( $type === 'psu' ) {
                if ( in_array( $name, [ 'potencia total', 'potencia nominal' ], true ) ) $mapped = self::offer_watts( $result, '_iv_compat_psu_watts', $value, 'dmi' );
                elseif ( $name === 'factor de forma de fuente de alimentacion psu' ) {
                    $formats = self::normalize_form_factors( $value );
                    if ( ! $formats && stripos( self::decode_text( $value ), 'SFX' ) !== false ) $formats = [ 'SFX' ];
                    $mapped = self::offer_array( $result, '_iv_compat_psu_form_factor', $formats, 'dmi', 100 );
                }
            } elseif ( $type === 'cooling' ) {
                if ( in_array( $name, [ 'sockets de procesador soportados', 'socket compatible', 'sockets compatibles' ], true ) ) {
                    $mapped = self::offer_array( $result, '_iv_compat_cooler_sockets', self::normalize_sockets( $value ), 'dmi', 100 );
                } elseif ( $name === 'altura de radiador' ) {
                    $mapped = self::offer_dimension( $result, '_iv_compat_radiator_height_mm', $value, 'dmi' );
                } elseif ( $name === 'altura' && stripos( self::decode_text( $product['name'] ?? ( $product['nombre'] ?? '' ) ), 'liquida' ) === false ) {
                    $mapped = self::offer_dimension( $result, '_iv_compat_cooler_height_mm', $value, 'dmi' );
                }
            } elseif ( $type === 'ram' ) {
                if ( in_array( $name, [ 'tipo de memoria interna', 'tipo de memoria' ], true ) ) {
                    $mapped = self::offer_array( $result, '_iv_compat_ram_type', self::normalize_ram_types( $value ), 'dmi', 100 );
                }
            } elseif ( $type === 'storage' ) {
                if ( in_array( $name, [ 'factor de forma de disco ssd', 'tamano de la unidad ssd m 2' ], true ) ) {
                    self::offer( $result, '_iv_compat_storage_form_factor', strtoupper( trim( self::decode_text( $value ) ) ), 'dmi', 100 );
                    $mapped = true;
                } elseif ( in_array( $name, [ 'interfaz', 'interfaz del dispositivo', 'interfaz de unidad de almacenamiento' ], true ) ) {
                    self::offer( $result, '_iv_compat_storage_interface', strtoupper( trim( self::decode_text( $value ) ) ), 'dmi', 100 );
                    $mapped = true;
                }
            }

            if ( ! $mapped && self::looks_like_compatibility_spec( $name ) ) {
                $result['unmapped_specs'][] = [ 'name' => $spec['name'] ?? '', 'value' => $value ];
            }
        }
    }

    private static function extract_text_fallback( array $product, string $type, array &$result ) : void {
        $text = implode( ' ', [
            $product['name'] ?? ( $product['nombre'] ?? '' ),
            $product['description'] ?? ( $product['descripcion'] ?? '' ),
            $product['short_description'] ?? '',
        ] );
        if ( in_array( $type, [ 'motherboard', 'cooling' ], true ) ) {
            $sockets = self::normalize_sockets( $text );
            $key = $type === 'motherboard' ? '_iv_compat_socket' : '_iv_compat_cooler_sockets';
            self::offer_array( $result, $key, $sockets, 'text', 70 );
        }
        if ( in_array( $type, [ 'motherboard', 'ram' ], true ) ) {
            self::offer_array( $result, '_iv_compat_ram_type', self::normalize_ram_types( $text ), 'text', 75 );
        }
        if ( $type === 'motherboard' ) {
            self::offer_array( $result, '_iv_compat_motherboard_form_factor', self::normalize_form_factors( $text ), 'text', 65 );
        }
        if ( $type === 'case' ) {
            self::offer_array( $result, '_iv_compat_case_form_factors', self::normalize_form_factors( $text ), 'text', 60 );
        }
        if ( $type === 'psu' ) {
            self::offer_watts( $result, '_iv_compat_psu_watts', $text, 'text', 70 );
        }
    }

    private static function finalize( array &$result ) : void {
        $required = [
            'cpu'         => [ '_iv_compat_socket' ],
            'motherboard' => [ '_iv_compat_socket', '_iv_compat_ram_type', '_iv_compat_motherboard_form_factor' ],
            'ram'         => [ '_iv_compat_ram_type' ],
            'case'        => [ '_iv_compat_case_form_factors' ],
            'psu'         => [ '_iv_compat_psu_watts' ],
            'cooling'     => [ '_iv_compat_cooler_sockets' ],
            'gpu'         => [ '_iv_compat_gpu_length_mm' ],
            'storage'     => [ '_iv_compat_storage_form_factor', '_iv_compat_storage_interface' ],
        ];
        foreach ( $required[ $result['component_type'] ] ?? [] as $key ) {
            if ( ! isset( $result['fields'][ $key ] ) || $result['fields'][ $key ] === [] || $result['fields'][ $key ] === '' ) {
                $result['pending_fields'][] = $key;
            }
        }
        $result['pending'] = ! empty( $result['pending_fields'] );
        $result['unmapped_specs'] = array_values( array_unique( $result['unmapped_specs'], SORT_REGULAR ) );
    }

    private static function offer_dimension( array &$result, string $key, $value, string $source ) : bool {
        $mm = self::normalize_millimetres( $value );
        if ( $mm === null ) {
            $result['unit_errors'][] = [ 'field' => $key, 'value' => $value ];
            return false;
        }
        self::offer( $result, $key, $mm, $source, 100 );
        return true;
    }

    private static function offer_watts( array &$result, string $key, $value, string $source, int $confidence = 100 ) : bool {
        $watts = self::normalize_watts( $value );
        if ( $watts === null ) return false;
        self::offer( $result, $key, $watts, $source, $confidence );
        return true;
    }

    private static function offer_array( array &$result, string $key, array $value, string $source, int $confidence ) : bool {
        if ( ! $value ) return false;
        self::offer( $result, $key, count( $value ) === 1 ? $value[0] : $value, $source, $confidence );
        return true;
    }

    private static function offer( array &$result, string $key, $value, string $source, int $confidence ) : void {
        if ( $value === null || $value === '' || $value === [] ) return;
        if ( isset( $result['fields'][ $key ] ) && self::values_conflict( $result['fields'][ $key ], $value ) ) {
            $result['conflicts'][] = [
                'field' => $key,
                'kept' => $result['fields'][ $key ],
                'kept_source' => $result['sources'][ $key ],
                'candidate' => $value,
                'candidate_source' => $source,
            ];
        }
        $current_source = $result['sources'][ $key ] ?? 'pending';
        if ( ! isset( $result['fields'][ $key ] ) || ( self::$field_priority[ $source ] ?? 0 ) > ( self::$field_priority[ $current_source ] ?? 0 ) ) {
            $result['fields'][ $key ] = $value;
            $result['sources'][ $key ] = $source;
            $result['confidence'][ $key ] = $confidence;
        }
    }

    private static function flatten_specs( array $groups ) : array {
        $flat = [];
        foreach ( $groups as $group ) {
            if ( isset( $group['name'], $group['value'] ) ) {
                $flat[] = $group;
                continue;
            }
            foreach ( (array) ( $group['specifications'] ?? [] ) as $spec ) {
                if ( is_array( $spec ) ) $flat[] = $spec;
            }
        }
        return $flat;
    }

    private static function values_conflict( $kept, $candidate ) : bool {
        if ( $kept === $candidate ) return false;
        $kept_values = array_map( 'strval', is_array( $kept ) ? $kept : [ $kept ] );
        $candidate_values = array_map( 'strval', is_array( $candidate ) ? $candidate : [ $candidate ] );
        // Una fuente textual suele mencionar solo una parte del conjunto
        // estructurado (p. ej. AM5 aunque el disipador soporte cuatro sockets).
        if ( ! array_diff( $candidate_values, $kept_values ) ) return false;
        return true;
    }

    private static function looks_like_compatibility_spec( string $name ) : bool {
        return (bool) preg_match( '/socket|zocalo|memoria|factor de forma|tarjeta madre|potencia|longitud|altura|radiador|interfaz/', $name );
    }

    private static function product_search_text( array $product ) : string {
        $parts = [
            $product['name'] ?? ( $product['nombre'] ?? '' ),
            $product['description'] ?? ( $product['descripcion'] ?? '' ),
            $product['short_description'] ?? '',
        ];
        foreach ( self::flatten_specs( $product['specifications'] ?? [] ) as $spec ) {
            $parts[] = $spec['name'] ?? '';
            $parts[] = $spec['value'] ?? '';
        }
        return self::normalize_text( implode( ' ', array_map( function( $value ) {
            return is_scalar( $value ) ? (string) $value : '';
        }, $parts ) ) );
    }

    private static function normalize_text( $value ) : string {
        $text = self::decode_text( $value );
        if ( function_exists( 'remove_accents' ) ) $text = remove_accents( $text );
        else $text = iconv( 'UTF-8', 'ASCII//TRANSLIT//IGNORE', $text ) ?: $text;
        $text = strtolower( $text );
        $text = preg_replace( '/[^a-z0-9.,+\-\s]/', ' ', $text );
        return trim( preg_replace( '/\s+/', ' ', $text ) );
    }

    private static function normalize_token( $value ) : string {
        return strtoupper( preg_replace( '/\s+/', ' ', self::normalize_text( $value ) ) );
    }

    private static function decode_text( $value ) : string {
        return html_entity_decode( strip_tags( (string) $value ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
    }

    private static function control_meta_keys() : array {
        return [
            '_iv_compat_source', '_iv_compat_sources', '_iv_compat_confidence',
            '_iv_compat_pending', '_iv_compat_pending_fields',
        ];
    }

    private static function compatibility_field_keys() : array {
        return [
            '_iv_compat_socket', '_iv_compat_ram_type',
            '_iv_compat_motherboard_form_factor', '_iv_compat_case_form_factors',
            '_iv_compat_psu_watts', '_iv_compat_psu_form_factor',
            '_iv_compat_gpu_length_mm', '_iv_compat_gpu_min_psu_watts',
            '_iv_compat_case_gpu_max_mm', '_iv_compat_case_cooler_max_mm',
            '_iv_compat_case_psu_max_mm', '_iv_compat_cooler_sockets',
            '_iv_compat_cooler_height_mm', '_iv_compat_radiator_height_mm',
            '_iv_compat_storage_form_factor', '_iv_compat_storage_interface',
        ];
    }
}
