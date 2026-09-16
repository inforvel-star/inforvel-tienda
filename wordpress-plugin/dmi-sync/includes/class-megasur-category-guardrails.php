<?php
/**
 * High-confidence category rules for MegaSur products.
 *
 * These rules intentionally inspect the product title before provider family,
 * subfamily, long description or fuzzy matching. MegaSur's broad taxonomy and
 * descriptions contain terms that can otherwise override an unambiguous title.
 */
final class Megasur_Category_Guardrails {

    /**
     * @return array{wc_parent:string,wc_child:string,dmi_cat_id:int,reason:string}|null
     */
    public static function classify( string $title, string $part_number = '' ) : ?array {
        $title_norm = self::normalize( $title );
        $pn_norm    = self::normalize( $part_number );

        if ( $title_norm === '' ) {
            return null;
        }

        // A network/HDMI switch is not the generic MegaSur family "REDES" and
        // must never fall through to Wifi. Nintendo Switch is deliberately out.
        if (
            preg_match( '/^switch\b/u', $title_norm )
            && ! preg_match( '/\bnintendo\s+switch\b/u', $title_norm )
        ) {
            return self::result(
                'Switches y Transceptores',
                'Switches',
                999933,
                'title:switch'
            );
        }

        // Accessories mentioning a monitor must not become monitors.
        $monitor_accessory = preg_match(
            '/^(soporte|brazo|base|elevador|filtro|protector|cable|adaptador)\b/u',
            $title_norm
        );
        if (
            ! $monitor_accessory
            && preg_match( '/^(monitor|pantalla monitor)\b/u', $title_norm )
        ) {
            return self::result(
                'Periféricos',
                'Monitores PC',
                220,
                'title:monitor'
            );
        }

        // Component power supplies take precedence over the provider bucket
        // "CAJAS Y BAREBONES > PC SOBREMESA".
        if (
            preg_match( '/^fuente(?:\s+de)?\s+alimentaci(?:on|n)\b/u', $title_norm )
            || preg_match( '/\bpower\s+supply\b/u', $title_norm )
            || preg_match( '/\bpsu\b/u', $title_norm )
            || preg_match( '/^(?:psu|fuente)[\s-]/u', $pn_norm )
        ) {
            return self::result(
                'Cajas y fuentes',
                'Fuentes de Alimentación',
                999993,
                'title:power-supply'
            );
        }

        // Use title-only negative signals. Long descriptions often mention a
        // keyboard, mouse or adapter even when the product itself is a laptop.
        $laptop_accessory = preg_match(
            '/^(funda|mochila|maletin|soporte|base|cargador|adaptador|bateria|teclado|raton|protector|repuesto|filtro)\b/u',
            $title_norm
        );
        $starts_as_laptop = preg_match( '/^portatil(?:\s*\/\s*tablet)?\b/u', $title_norm );
        $strong_laptop    = preg_match(
            '/\b(notebook|laptop|macbook|chromebook|thinkpad|elitebook|probook|zbook|ideapad|vivobook|zenbook|ultrabook|surface laptop|surface pro)\b/u',
            $title_norm
        );
        $computer_specs   = preg_match(
            '/\b(ssd|emmc|ram|windows|w11|w10|chrome os|freedos|ryzen|intel|core|ultra|snapdragon)\b/u',
            $title_norm
        );

        if (
            ! $laptop_accessory
            && ( ( $starts_as_laptop && $computer_specs ) || $strong_laptop )
        ) {
            return self::result(
                'Portátiles',
                'Portátiles',
                999999,
                'title:laptop'
            );
        }

        return null;
    }

    /**
     * Diagnostic data used by the dry-run tool and regression tests.
     *
     * @return array<string,mixed>
     */
    public static function trace( string $title, string $part_number = '' ) : array {
        $result = self::classify( $title, $part_number );

        return [
            'title'       => $title,
            'title_norm'  => self::normalize( $title ),
            'part_number' => $part_number,
            'matched'     => $result !== null,
            'reason'      => $result['reason'] ?? 'no-high-confidence-rule',
            'result'      => $result,
        ];
    }

    /**
     * @return array{wc_parent:string,wc_child:string,dmi_cat_id:int,reason:string}
     */
    private static function result( string $parent, string $child, int $dmi_id, string $reason ) : array {
        return [
            'wc_parent'  => $parent,
            'wc_child'   => $child,
            'dmi_cat_id' => $dmi_id,
            'reason'     => $reason,
        ];
    }

    private static function normalize( string $value ) : string {
        $value = html_entity_decode( strip_tags( $value ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
        if ( function_exists( 'remove_accents' ) ) {
            $value = remove_accents( $value );
        } else {
            $transliterated = iconv( 'UTF-8', 'ASCII//TRANSLIT//IGNORE', $value );
            if ( $transliterated !== false ) {
                $value = $transliterated;
            }
        }
        $value = mb_strtolower( trim( $value ) );
        $value = preg_replace( '/[^a-z0-9]+/u', ' ', $value );

        return trim( preg_replace( '/\s+/', ' ', (string) $value ) );
    }
}
