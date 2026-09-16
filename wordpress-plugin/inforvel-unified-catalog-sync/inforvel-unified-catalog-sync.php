<?php
/**
 * Plugin Name: Inforvel Unified Catalog Sync
 * Description: Unifica sincronización de catálogo DMI + MegaSur en un único plugin con normalización de categorías y deduplicación por SKU.
 * Version: 1.0.0
 * Author: Inforvel
 */

if (!defined('ABSPATH')) {
    exit;
}

final class Inforvel_Unified_Catalog_Sync {
    const OPTION_KEY = 'iv_ucs_settings';
    const LOCK_TRANSIENT = 'iv_ucs_sync_lock';
    const CRON_DMI = 'iv_ucs_cron_dmi';
    const CRON_MEGASUR = 'iv_ucs_cron_megasur';
    const NONCE_ACTION = 'iv_ucs_admin_action';
    const REST_NAMESPACE = 'iv-unified-sync/v1';
    const META_WEEKLY_PROMO_ACTIVE = '_iv_weekly_promo_active';
    const META_WEEKLY_PROMO_WEEK = '_iv_weekly_promo_week';

    private static $instance = null;

    public static function instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_filter('cron_schedules', array($this, 'register_schedules'));
        add_action('init', array($this, 'ensure_cron_events'));
        add_action('admin_menu', array($this, 'register_admin_page'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('admin_post_iv_ucs_run_sync', array($this, 'handle_manual_sync'));
        add_action(self::CRON_DMI, array($this, 'cron_sync_dmi'));
        add_action(self::CRON_MEGASUR, array($this, 'cron_sync_megasur'));
        add_action('rest_api_init', array($this, 'register_rest_routes'));

        register_activation_hook(__FILE__, array(__CLASS__, 'activate'));
        register_deactivation_hook(__FILE__, array(__CLASS__, 'deactivate'));
    }

    public static function activate() {
        if (!wp_next_scheduled(self::CRON_DMI)) {
            wp_schedule_event(time() + 60, 'iv_ucs_every_5_minutes', self::CRON_DMI);
        }

        if (!wp_next_scheduled(self::CRON_MEGASUR)) {
            wp_schedule_event(time() + 300, 'daily', self::CRON_MEGASUR);
        }
    }

    public static function deactivate() {
        wp_clear_scheduled_hook(self::CRON_DMI);
        wp_clear_scheduled_hook(self::CRON_MEGASUR);
        delete_transient(self::LOCK_TRANSIENT);
    }

    public function register_schedules($schedules) {
        if (!isset($schedules['iv_ucs_every_5_minutes'])) {
            $schedules['iv_ucs_every_5_minutes'] = array(
                'interval' => 300,
                'display' => 'Every 5 Minutes (Inforvel Unified Sync)',
            );
        }
        return $schedules;
    }

    public function ensure_cron_events() {
        if (!wp_next_scheduled(self::CRON_DMI)) {
            wp_schedule_event(time() + 120, 'iv_ucs_every_5_minutes', self::CRON_DMI);
        }
        if (!wp_next_scheduled(self::CRON_MEGASUR)) {
            wp_schedule_event(time() + 300, 'daily', self::CRON_MEGASUR);
        }
    }

    public function register_rest_routes() {
        register_rest_route(self::REST_NAMESPACE, '/sync', array(
            'methods' => 'POST',
            'permission_callback' => function() {
                return current_user_can('manage_woocommerce');
            },
            'callback' => function($request) {
                $source = sanitize_text_field((string) $request->get_param('source'));
                $source = $source ?: 'all';
                $result = $this->run_sync($source, 'rest');
                return rest_ensure_response($result);
            },
        ));
    }

    public function register_admin_page() {
        add_submenu_page(
            'woocommerce',
            'Unified Catalog Sync',
            'Unified Catalog Sync',
            'manage_woocommerce',
            'iv-unified-catalog-sync',
            array($this, 'render_admin_page')
        );
    }

    public function register_settings() {
        register_setting(self::OPTION_KEY, self::OPTION_KEY, array($this, 'sanitize_settings'));

        add_settings_section('iv_ucs_main', 'Configuración de proveedores', '__return_false', self::OPTION_KEY);

        $fields = array(
            'dmi_feed_url' => 'DMI Feed URL',
            'dmi_api_url' => 'DMI API URL',
            'dmi_username' => 'DMI Usuario',
            'dmi_password' => 'DMI Password',
            'megasur_feed_url' => 'MegaSur Feed URL',
            'request_timeout' => 'Timeout (segundos)',
            'daily_megasur_hour' => 'Hora sync MegaSur diaria (0-23)',
            'create_missing_categories' => 'Crear categorías faltantes (1/0)',
        );

        foreach ($fields as $key => $label) {
            add_settings_field($key, $label, array($this, 'render_field'), self::OPTION_KEY, 'iv_ucs_main', array('key' => $key));
        }
    }

    public function sanitize_settings($input) {
        $current = $this->get_settings();
        $next = is_array($input) ? $input : array();

        $sanitized = array(
            'dmi_feed_url' => esc_url_raw($next['dmi_feed_url'] ?? $current['dmi_feed_url']),
            'dmi_api_url' => esc_url_raw($next['dmi_api_url'] ?? $current['dmi_api_url']),
            'dmi_username' => sanitize_text_field($next['dmi_username'] ?? $current['dmi_username']),
            'dmi_password' => sanitize_text_field($next['dmi_password'] ?? $current['dmi_password']),
            'megasur_feed_url' => esc_url_raw($next['megasur_feed_url'] ?? $current['megasur_feed_url']),
            'request_timeout' => max(10, min(120, intval($next['request_timeout'] ?? $current['request_timeout']))),
            'daily_megasur_hour' => max(0, min(23, intval($next['daily_megasur_hour'] ?? $current['daily_megasur_hour']))),
            'create_missing_categories' => !empty($next['create_missing_categories']) ? 1 : 0,
        );

        $this->reschedule_megasur_cron($sanitized['daily_megasur_hour']);

        return $sanitized;
    }

    public function render_field($args) {
        $key = $args['key'];
        $settings = $this->get_settings();
        $value = $settings[$key] ?? '';

        if ($key === 'create_missing_categories') {
            echo '<input type="checkbox" name="' . esc_attr(self::OPTION_KEY) . '[' . esc_attr($key) . ']" value="1" ' . checked(1, intval($value), false) . ' />';
            return;
        }

        $type = in_array($key, array('request_timeout', 'daily_megasur_hour'), true) ? 'number' : 'url';
        echo '<input type="' . esc_attr($type) . '" class="regular-text" name="' . esc_attr(self::OPTION_KEY) . '[' . esc_attr($key) . ']" value="' . esc_attr((string) $value) . '" />';
    }

    public function render_admin_page() {
        if (!current_user_can('manage_woocommerce')) {
            wp_die('No autorizado.');
        }

        $last = get_option('iv_ucs_last_result', array());
        ?>
        <div class="wrap">
            <h1>Inforvel Unified Catalog Sync</h1>
            <p>Un único motor para DMI (cada 5 min) y MegaSur (1 vez/día).</p>

            <form method="post" action="options.php">
                <?php
                settings_fields(self::OPTION_KEY);
                do_settings_sections(self::OPTION_KEY);
                submit_button('Guardar configuración');
                ?>
            </form>

            <hr />
            <h2>Sincronización manual</h2>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <?php wp_nonce_field(self::NONCE_ACTION); ?>
                <input type="hidden" name="action" value="iv_ucs_run_sync" />
                <select name="source">
                    <option value="all">DMI + MegaSur</option>
                    <option value="dmi">Solo DMI</option>
                    <option value="megasur">Solo MegaSur</option>
                </select>
                <?php submit_button('Ejecutar sync ahora', 'primary', 'submit', false); ?>
            </form>

            <h2>Último resultado</h2>
            <pre style="background:#fff;border:1px solid #ccd0d4;padding:12px;max-width:920px;overflow:auto;"><?php echo esc_html(wp_json_encode($last, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)); ?></pre>
        </div>
        <?php
    }

    public function handle_manual_sync() {
        if (!current_user_can('manage_woocommerce')) {
            wp_die('No autorizado.');
        }
        check_admin_referer(self::NONCE_ACTION);

        $source = sanitize_text_field($_POST['source'] ?? 'all');
        $this->run_sync($source, 'manual');

        wp_safe_redirect(admin_url('admin.php?page=iv-unified-catalog-sync'));
        exit;
    }

    public function cron_sync_dmi() {
        $this->run_sync('dmi', 'cron');
    }

    public function cron_sync_megasur() {
        $this->run_sync('megasur', 'cron');
    }

    private function run_sync($source, $trigger) {
        if (!class_exists('WooCommerce')) {
            return $this->store_result(array('ok' => false, 'error' => 'WooCommerce no activo', 'source' => $source, 'trigger' => $trigger));
        }

        if (get_transient(self::LOCK_TRANSIENT)) {
            return $this->store_result(array('ok' => false, 'error' => 'Sync en ejecución', 'source' => $source, 'trigger' => $trigger));
        }

        set_transient(self::LOCK_TRANSIENT, 1, 30 * MINUTE_IN_SECONDS);
        $started_at = current_time('mysql');

        try {
            $settings = $this->get_settings();
            $sources = $source === 'all' ? array('dmi', 'megasur') : array($source);
            $global = array(
                'ok' => true,
                'source' => $source,
                'trigger' => $trigger,
                'started_at' => $started_at,
                'ended_at' => null,
                'stats' => array('created' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => 0),
                'providers' => array(),
            );

            $active_brands = $this->get_active_weekly_brands();
            foreach ($sources as $provider) {
                $feed_url = $provider === 'dmi' ? $settings['dmi_feed_url'] : $settings['megasur_feed_url'];
                if ($provider === 'dmi') {
                    $raw = $feed_url
                        ? $this->fetch_json_feed($feed_url, intval($settings['request_timeout']))
                        : $this->fetch_dmi_api_products($settings);
                } else {
                    if (!$feed_url) {
                        $raw = array('ok' => false, 'error' => 'Feed URL no configurada');
                    } else {
                        $raw = $this->fetch_json_feed($feed_url, intval($settings['request_timeout']));
                    }
                }

                if (!$raw['ok']) {
                    $global['providers'][$provider] = $raw;
                    $global['stats']['errors']++;
                    continue;
                }

                $normalized = $this->normalize_feed_products($raw['data'], $provider);
                $provider_stats = $this->sync_products(
                    $normalized,
                    $provider,
                    !empty($settings['create_missing_categories']),
                    $active_brands
                );
                $global['providers'][$provider] = $provider_stats;

                foreach (array('created', 'updated', 'skipped', 'errors', 'weekly_promo_applied', 'weekly_promo_cleared', 'removed_without_image') as $k) {
                    if (!isset($global['stats'][$k])) {
                        $global['stats'][$k] = 0;
                    }
                    $global['stats'][$k] += intval($provider_stats[$k] ?? 0);
                }
            }

            // Recalcula promo semanal sobre todo el catálogo sincronizado (DMI + MegaSur),
            // incluso si en este ciclo no hubo altas/actualizaciones.
            $catalog_promo = $this->apply_weekly_promos_catalogwide($active_brands);
            foreach (array('applied', 'cleared', 'errors') as $k) {
                $val = intval($catalog_promo[$k] ?? 0);
                if ($k === 'applied') {
                    $global['stats']['weekly_promo_applied'] += $val;
                } elseif ($k === 'cleared') {
                    $global['stats']['weekly_promo_cleared'] += $val;
                } else {
                    $global['stats']['errors'] += $val;
                }
            }
            $global['catalog_weekly_promo'] = $catalog_promo;
            $this->maybe_dispatch_weekly_offer_batch_event($catalog_promo, $active_brands, $trigger);

            $global['ended_at'] = current_time('mysql');
            return $this->store_result($global);
        } catch (Exception $e) {
            return $this->store_result(array(
                'ok' => false,
                'source' => $source,
                'trigger' => $trigger,
                'error' => $e->getMessage(),
                'started_at' => $started_at,
                'ended_at' => current_time('mysql'),
            ));
        } finally {
            delete_transient(self::LOCK_TRANSIENT);
        }
    }

    private function fetch_json_feed($url, $timeout) {
        $response = wp_remote_get($url, array('timeout' => $timeout));
        if (is_wp_error($response)) {
            return array('ok' => false, 'error' => $response->get_error_message());
        }

        $code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        if ($code < 200 || $code >= 300) {
            return array('ok' => false, 'error' => 'HTTP ' . $code);
        }

        $decoded = json_decode($body, true);
        if (!is_array($decoded)) {
            return array('ok' => false, 'error' => 'JSON inválido');
        }

        return array('ok' => true, 'data' => $decoded, 'count' => count($decoded));
    }

    private function fetch_dmi_api_products($settings) {
        $base = rtrim((string) ($settings['dmi_api_url'] ?? ''), '/');
        $user = (string) ($settings['dmi_username'] ?? '');
        $pass = (string) ($settings['dmi_password'] ?? '');
        $timeout = intval($settings['request_timeout'] ?? 45);

        if ($base === '' || $user === '' || $pass === '') {
            return array('ok' => false, 'error' => 'Config DMI incompleta (API URL/usuario/password)');
        }

        $auth = wp_remote_post($base . '/api/v2/users/authenticate', array(
            'timeout' => $timeout,
            'headers' => array('Content-Type' => 'application/json'),
            'body' => wp_json_encode(array('username' => $user, 'password' => $pass)),
        ));
        if (is_wp_error($auth)) {
            return array('ok' => false, 'error' => $auth->get_error_message());
        }
        $auth_code = wp_remote_retrieve_response_code($auth);
        $auth_body = json_decode((string) wp_remote_retrieve_body($auth), true);
        $token = is_array($auth_body) ? ($auth_body['token'] ?? '') : '';
        if ($auth_code !== 200 || !$token) {
            return array('ok' => false, 'error' => 'Auth DMI fallida (HTTP ' . $auth_code . ')');
        }

        $headers = array(
            'Content-Type' => 'application/json',
            'Authorization' => 'Bearer ' . $token,
        );

        $products_res = wp_remote_get($base . '/api/v2/products/getallproducts', array(
            'timeout' => $timeout,
            'headers' => $headers,
        ));
        if (is_wp_error($products_res)) {
            return array('ok' => false, 'error' => $products_res->get_error_message());
        }
        $products_code = wp_remote_retrieve_response_code($products_res);
        $products = json_decode((string) wp_remote_retrieve_body($products_res), true);
        if ($products_code !== 200 || !is_array($products)) {
            return array('ok' => false, 'error' => 'Catálogo DMI inválido (HTTP ' . $products_code . ')');
        }

        $price_res = wp_remote_post($base . '/api/v2/price/getpriceperformance', array(
            'timeout' => $timeout,
            'headers' => $headers,
            'body' => wp_json_encode(array('skus' => array())),
        ));
        $price_map = array();
        if (!is_wp_error($price_res) && wp_remote_retrieve_response_code($price_res) === 200) {
            $price_data = json_decode((string) wp_remote_retrieve_body($price_res), true);
            $items = is_array($price_data) ? ($price_data['products'] ?? array()) : array();
            if (is_array($items)) {
                foreach ($items as $it) {
                    $sku = trim((string) ($it['sku'] ?? $it['SKU'] ?? ''));
                    if ($sku === '') continue;
                    $price_map[$sku] = array(
                        'price' => (float) ($it['pvp'] ?? $it['price'] ?? 0),
                        'stock' => intval($it['stock'] ?? 0),
                    );
                }
            }
        }

        foreach ($products as &$p) {
            $sku = trim((string) ($p['sku'] ?? $p['SKU'] ?? ''));
            if ($sku && isset($price_map[$sku])) {
                $p['pvp'] = (string) $price_map[$sku]['price'];
                $p['stock'] = (string) $price_map[$sku]['stock'];
            }
            if (!isset($p['referencia'])) {
                $p['referencia'] = $sku;
            }
        }
        unset($p);

        return array('ok' => true, 'data' => $products, 'count' => count($products));
    }

    private function normalize_feed_products($rows, $provider) {
        $out = array();

        foreach ($rows as $idx => $row) {
            if (!is_array($row)) {
                continue;
            }

            $sku = trim((string) ($row['referencia'] ?? ''));
            if ($sku === '') {
                $sku = trim((string) ($row['sku'] ?? $row['SKU'] ?? $row['productId'] ?? $row['id'] ?? ''));
            }
            $name = trim((string) ($row['nombre'] ?? $row['name'] ?? ''));
            if ($sku === '' || strtolower($sku) === 'referencia' || strtolower($name) === 'nombre') {
                continue;
            }

            $family = trim((string) ($row['familia'] ?? $row['family'] ?? ''));
            $subfamily = trim((string) ($row['subfamilia'] ?? $row['subcategory'] ?? ''));
            $price = $this->parse_number((string) ($row['pvp'] ?? $row['price'] ?? '0'));
            $stock = intval($row['stock'] ?? 0);

            $images_raw = $row['imagenes'] ?? $row['images'] ?? $row['mainImage'] ?? array();
            $images = array();
            if (is_array($images_raw)) {
                foreach ($images_raw as $img) {
                    $url = is_array($img)
                        ? ($img['largePhoto'] ?? $img['url'] ?? $img['src'] ?? $img['smallPhoto'] ?? $img['thumbnail'] ?? '')
                        : $img;
                    $url = trim((string) $url);
                    if ($this->is_usable_source_image_url($url)) {
                        $images[] = $url;
                    }
                }
            } elseif (is_string($images_raw)) {
                foreach (preg_split('/\s*,\s*/', $images_raw) ?: array() as $url) {
                    if ($this->is_usable_source_image_url($url)) {
                        $images[] = trim($url);
                    }
                }
            }

            $out[$sku] = array(
                'sku' => $sku,
                'name' => $name,
                'description' => trim((string) ($row['descripcion_larga'] ?? $row['descripcion'] ?? $row['description'] ?? '')),
                'family' => $family,
                'subfamily' => $subfamily,
                'price' => $price,
                'stock' => $stock,
                'images' => $images,
                'brand' => trim((string) ($row['fabricante'] ?? $row['brand'] ?? '')),
                'provider' => $provider,
                'ref' => trim((string) ($row['part_number'] ?? $row['partNumber'] ?? '')),
            );
        }

        return array_values($out);
    }

    private function is_usable_source_image_url($url) {
        $url = trim((string) $url);
        if ($url === '' || !filter_var($url, FILTER_VALIDATE_URL)) {
            return false;
        }

        $normalized = strtolower(remove_accents($url));
        foreach (array('imagen-no-disponible', 'imagen_no_disponible', 'no-image', 'no_image', 'sin-imagen', 'sin_imagen', 'placeholder') as $marker) {
            if (strpos($normalized, $marker) !== false) {
                return false;
            }
        }

        return true;
    }

    private function sync_products($products, $provider, $create_missing_categories, $active_brands) {
        $stats = array(
            'ok' => true,
            'provider' => $provider,
            'created' => 0,
            'updated' => 0,
            'skipped' => 0,
            'errors' => 0,
            'weekly_promo_applied' => 0,
            'weekly_promo_cleared' => 0,
            'removed_without_image' => 0,
        );
        $promo_week = gmdate('o-\WW');

        foreach ($products as $p) {
            try {
                $existing_id = wc_get_product_id_by_sku($p['sku']);

                // Un producto de proveedor sin ninguna imagen de origen no debe entrar
                // en WooCommerce. Si ya existía, se retira del catálogo de forma recuperable.
                if (empty($p['images'])) {
                    if ($existing_id && $this->is_provider_product($existing_id)) {
                        wp_trash_post($existing_id);
                        $stats['removed_without_image']++;
                    } else {
                        $stats['skipped']++;
                    }
                    continue;
                }

                $wc_product = $existing_id ? wc_get_product($existing_id) : new WC_Product_Simple();

                if (!$wc_product) {
                    $stats['errors']++;
                    continue;
                }

                $wc_product->set_name($p['name']);
                $wc_product->set_sku($p['sku']);
                $regular_price = $p['price'] > 0 ? (float) $p['price'] : 0.0;
                $wc_product->set_regular_price($regular_price > 0 ? (string) $regular_price : '');
                $wc_product->set_manage_stock(true);
                $wc_product->set_stock_quantity(max(0, intval($p['stock'])));
                $wc_product->set_description($p['description']);
                $wc_product->update_meta_data('_iv_provider', $provider);
                $wc_product->update_meta_data('_iv_provider_ref', $p['ref']);
                $wc_product->update_meta_data('_iv_brand', $p['brand']);

                $is_weekly_brand = $this->is_weekly_brand($p['brand'], $active_brands);
                $is_weekly_active = $wc_product->get_meta(self::META_WEEKLY_PROMO_ACTIVE, true) === '1';
                if ($regular_price > 0 && $is_weekly_brand) {
                    $promo_price = $this->calculate_weekly_sale_price_from_regular($regular_price);
                    if ($promo_price > 0 && $promo_price < $regular_price) {
                        $wc_product->set_sale_price(number_format($promo_price, 2, '.', ''));
                        $wc_product->update_meta_data(self::META_WEEKLY_PROMO_ACTIVE, '1');
                        $wc_product->update_meta_data(self::META_WEEKLY_PROMO_WEEK, $promo_week);
                        $stats['weekly_promo_applied']++;
                    }
                } elseif ($is_weekly_active) {
                    $wc_product->set_sale_price('');
                    $wc_product->update_meta_data(self::META_WEEKLY_PROMO_ACTIVE, '0');
                    $wc_product->update_meta_data(self::META_WEEKLY_PROMO_WEEK, '');
                    $stats['weekly_promo_cleared']++;
                }

                $category_id = $this->resolve_category_id($p['family'], $p['subfamily'], $p['name'], $provider, $create_missing_categories);
                if ($category_id) {
                    $wc_product->set_category_ids(array($category_id));
                }

                $status = $p['price'] > 0 ? 'publish' : 'draft';
                $wc_product->set_status($status);

                $product_id = $wc_product->save();

                if (!$this->has_valid_product_image($product_id)) {
                    $this->attach_remote_images($product_id, $p['images']);
                }

                if (!$this->has_valid_product_image($product_id)) {
                    wp_trash_post($product_id);
                    $stats['removed_without_image']++;
                    continue;
                }

                if ($existing_id) {
                    $stats['updated']++;
                } else {
                    $stats['created']++;
                }
            } catch (Exception $e) {
                $stats['errors']++;
            }
        }

        $stats['removed_without_image'] += $this->trash_provider_products_without_images($provider);

        return $stats;
    }

    private function resolve_category_id($family, $subfamily, $name, $provider, $create_missing_categories) {
        $family = trim((string) $family);
        $subfamily = trim((string) $subfamily);

        $broken = array('', 'familia', 'subfamilia', 'ordenadores y servidores', 'pc sobremesa', 'pcs sobremesa', "pc's sobremesa", 'pc´s sobremesa');
        $family_norm = $this->normalize_label($family);
        $subfamily_norm = $this->normalize_label($subfamily);

        // MegaSur sends a largely unusable subfamily ("PCs Sobremesa") for many items.
        // For MegaSur we map by family to existing categories and ignore subfamily by design.
        if ($provider === 'megasur') {
            $subfamily = '';
            $subfamily_norm = '';
        }

        if (in_array($family_norm, $broken, true)) {
            $family = '';
        }
        if (in_array($subfamily_norm, $broken, true)) {
            $subfamily = '';
        }

        if ($family === '' && $subfamily === '') {
            $inferred = $this->infer_category_names($name);
            $family = $inferred['family'];
            $subfamily = $inferred['subfamily'];
        }

        if ($family === '' && $subfamily !== '') {
            $family = $subfamily;
            $subfamily = '';
        }

        if ($family === '') {
            return 0;
        }

        $parent_id = $this->find_or_create_category($family, 0, $create_missing_categories);
        if (!$parent_id) {
            $inferred = $this->infer_category_names($name);
            if (!empty($inferred['family'])) {
                $parent_id = $this->find_or_create_category($inferred['family'], 0, $create_missing_categories);
                if ($parent_id && !empty($inferred['subfamily'])) {
                    $child_id = $this->find_or_create_category($inferred['subfamily'], $parent_id, $create_missing_categories);
                    if ($child_id) {
                        return $child_id;
                    }
                }
                if ($parent_id) {
                    return $parent_id;
                }
            }
            return 0;
        }

        if ($subfamily !== '') {
            $child_id = $this->find_or_create_category($subfamily, $parent_id, $create_missing_categories);
            if ($child_id) {
                return $child_id;
            }
        }

        return $parent_id;
    }

    private function find_or_create_category($name, $parent_id, $allow_create) {
        $name = trim((string) $name);
        if ($name === '') {
            return 0;
        }

        $normalized_target = $this->normalize_label($name);
        $terms = get_terms(array(
            'taxonomy' => 'product_cat',
            'hide_empty' => false,
            'parent' => intval($parent_id),
        ));

        if (!is_wp_error($terms)) {
            foreach ($terms as $term) {
                if ($this->normalize_label($term->name) === $normalized_target) {
                    return intval($term->term_id);
                }
            }
        }

        if (!$allow_create) {
            return 0;
        }

        $created = wp_insert_term($name, 'product_cat', array('parent' => intval($parent_id)));
        if (is_wp_error($created)) {
            return 0;
        }

        return intval($created['term_id']);
    }

    private function infer_category_names($name) {
        $hay = $this->normalize_label($name);

        $rules = array(
            array('/cable|adaptador|hdmi|displayport|usb|vga|rj45/', 'Cables y Conectores', 'Cables'),
            array('/teclado/', 'Periféricos', 'Teclados'),
            array('/raton|mouse/', 'Periféricos', 'Ratones'),
            array('/monitor/', 'Periféricos', 'Monitores PC'),
            array('/auricular|headset|earbud/', 'Auriculares', ''),
            array('/altavoz|speaker/', 'Altavoz', ''),
            array('/portatil|notebook|laptop|macbook/', 'Portátiles', ''),
            array('/all in one|aio|ordenador|pc|workstation|mini pc/', 'PCs Sobremesa', ''),
        );

        foreach ($rules as $r) {
            if (preg_match('/' . $r[0] . '/i', $hay)) {
                return array('family' => $r[1], 'subfamily' => $r[2]);
            }
        }

        return array('family' => '', 'subfamily' => '');
    }

    private function attach_remote_images($product_id, $urls) {
        if (!function_exists('media_sideload_image')) {
            require_once ABSPATH . 'wp-admin/includes/media.php';
            require_once ABSPATH . 'wp-admin/includes/file.php';
            require_once ABSPATH . 'wp-admin/includes/image.php';
        }

        $gallery_ids = array();
        $featured_id = 0;
        foreach (array_slice($urls, 0, 4) as $idx => $url) {
            $attachment_id = media_sideload_image($url, $product_id, null, 'id');
            if (is_wp_error($attachment_id)) {
                continue;
            }
            if (!$featured_id) {
                $featured_id = intval($attachment_id);
                set_post_thumbnail($product_id, $featured_id);
            } else {
                $gallery_ids[] = intval($attachment_id);
            }
        }

        if (!empty($gallery_ids)) {
            update_post_meta($product_id, '_product_image_gallery', implode(',', $gallery_ids));
        }

        return $featured_id > 0;
    }

    private function has_valid_product_image($product_id) {
        $attachment_id = intval(get_post_thumbnail_id($product_id));
        if (!$attachment_id || !wp_attachment_is_image($attachment_id)) {
            return false;
        }

        $file = get_attached_file($attachment_id);
        return is_string($file) && $file !== '' && file_exists($file);
    }

    private function is_provider_product($product_id) {
        $provider = strtolower((string) get_post_meta($product_id, '_iv_provider', true));
        if (in_array($provider, array('dmi', 'megasur'), true)) {
            return true;
        }

        return get_post_meta($product_id, '_megasur_product', true) === '1'
            || metadata_exists('post', $product_id, '_dmi_last_sync');
    }

    private function trash_provider_products_without_images($provider) {
        global $wpdb;

        $provider = strtolower((string) $provider);
        $legacy_meta = $provider === 'megasur' ? '_megasur_product' : '_dmi_last_sync';
        $legacy_value_clause = $provider === 'megasur' ? "AND source_meta.meta_value = '1'" : '';
        $ids = $wpdb->get_col($wpdb->prepare(
            "SELECT DISTINCT p.ID
             FROM {$wpdb->posts} p
             LEFT JOIN {$wpdb->postmeta} provider_meta
               ON provider_meta.post_id = p.ID AND provider_meta.meta_key = '_iv_provider'
             LEFT JOIN {$wpdb->postmeta} source_meta
               ON source_meta.post_id = p.ID AND source_meta.meta_key = %s
             LEFT JOIN {$wpdb->postmeta} thumbnail_meta
               ON thumbnail_meta.post_id = p.ID AND thumbnail_meta.meta_key = '_thumbnail_id'
             WHERE p.post_type = 'product'
               AND p.post_status <> 'trash'
               AND (provider_meta.meta_value = %s OR (source_meta.post_id IS NOT NULL {$legacy_value_clause}))
               AND (thumbnail_meta.meta_value IS NULL OR thumbnail_meta.meta_value = '' OR thumbnail_meta.meta_value = '0')",
            $legacy_meta,
            $provider
        ));

        $removed = 0;
        foreach (array_map('intval', $ids ?: array()) as $product_id) {
            if (wp_trash_post($product_id)) {
                $removed++;
            }
        }

        return $removed;
    }

    private function parse_number($value) {
        $v = str_replace('.', '', (string) $value);
        $v = str_replace(',', '.', $v);
        return floatval($v);
    }

    private function get_iso_week_number($timestamp) {
        return intval(gmdate('W', intval($timestamp)));
    }

    private function get_active_weekly_brands() {
        $laptops = array('HP', 'Lenovo', 'MSI', 'Apple');
        $smartphones = array('Samsung', 'Xiaomi', 'Apple', 'Motorola');
        $week = max(1, $this->get_iso_week_number(time()));

        $laptop_brand = $laptops[($week - 1) % count($laptops)];
        $smartphone_brand = $smartphones[($week - 1) % count($smartphones)];
        return array_values(array_unique(array($laptop_brand, $smartphone_brand)));
    }

    private function is_weekly_brand($brand, $active_brands) {
        $haystack = $this->normalize_label((string) $brand);
        if ($haystack === '') return false;
        foreach ($active_brands as $candidate) {
            $needle = $this->normalize_label((string) $candidate);
            if ($needle !== '' && strpos($haystack, $needle) !== false) {
                return true;
            }
        }
        return false;
    }

    private function calculate_weekly_sale_price_from_regular($regular_price) {
        $regular = floatval($regular_price);
        if ($regular <= 0) return 0.0;

        // Regla derivada de margen base 20% y promo 10%, manteniendo +5€ en precios bajos.
        // Base: regular = cost*1.20 (+5 si aplica). Promo: cost*1.10 (+5 si aplica).
        if ($regular > 5 && $regular < 123.80) {
            $promo = (($regular - 5) / 1.20) * 1.10 + 5;
        } else {
            $promo = $regular * (1.10 / 1.20);
        }

        $promo = round($promo, 2);
        if ($promo >= $regular) {
            $promo = round($regular - 0.01, 2);
        }
        return max(0.01, $promo);
    }

    private function apply_weekly_promos_catalogwide($active_brands) {
        $result = array(
            'applied' => 0,
            'cleared' => 0,
            'errors' => 0,
            'scanned' => 0,
            'promo_week' => gmdate('o-\WW'),
            'applied_products' => array(),
            'cleared_products' => array(),
        );
        $page = 1;
        $promo_week = $result['promo_week'];

        do {
            $query = wc_get_products(array(
                'status' => array('publish', 'draft'),
                'return' => 'objects',
                'paginate' => true,
                'limit' => 100,
                'page' => $page,
            ));

            $products = is_array($query->products) ? $query->products : array();
            foreach ($products as $product) {
                try {
                    if (!$product || !is_a($product, 'WC_Product')) continue;
                    $brand = (string) $product->get_meta('_iv_brand', true);
                    if ($brand === '') continue;

                    $result['scanned']++;
                    $regular = (float) $product->get_regular_price();
                    if ($regular <= 0) continue;

                    $is_weekly_brand = $this->is_weekly_brand($brand, $active_brands);
                    $is_weekly_active = $product->get_meta(self::META_WEEKLY_PROMO_ACTIVE, true) === '1';

                    if ($is_weekly_brand) {
                        $promo_price = $this->calculate_weekly_sale_price_from_regular($regular);
                        if ($promo_price > 0 && $promo_price < $regular) {
                            $new_sale = number_format($promo_price, 2, '.', '');
                            if ((string) $product->get_sale_price() !== $new_sale || !$is_weekly_active) {
                                $product->set_sale_price($new_sale);
                                $product->update_meta_data(self::META_WEEKLY_PROMO_ACTIVE, '1');
                                $product->update_meta_data(self::META_WEEKLY_PROMO_WEEK, $promo_week);
                                $product->save();
                                $result['applied']++;
                                $result['applied_products'][] = array(
                                    'id' => intval($product->get_id()),
                                    'sku' => (string) $product->get_sku(),
                                    'name' => (string) $product->get_name(),
                                    'regular_price' => number_format($regular, 2, '.', ''),
                                    'sale_price' => $new_sale,
                                );
                            }
                        }
                    } elseif ($is_weekly_active) {
                        $product->set_sale_price('');
                        $product->update_meta_data(self::META_WEEKLY_PROMO_ACTIVE, '0');
                        $product->update_meta_data(self::META_WEEKLY_PROMO_WEEK, '');
                        $product->save();
                        $result['cleared']++;
                        $result['cleared_products'][] = array(
                            'id' => intval($product->get_id()),
                            'sku' => (string) $product->get_sku(),
                            'name' => (string) $product->get_name(),
                        );
                    }
                } catch (Exception $e) {
                    $result['errors']++;
                }
            }

            $page++;
            $max_pages = intval($query->max_num_pages ?? 1);
        } while ($page <= $max_pages);

        return $result;
    }

    private function maybe_dispatch_weekly_offer_batch_event($catalog_promo, $active_brands, $trigger) {
        $applied = intval($catalog_promo['applied'] ?? 0);
        $cleared = intval($catalog_promo['cleared'] ?? 0);
        if ($applied <= 0 && $cleared <= 0) {
            return;
        }

        $promo_week = (string) ($catalog_promo['promo_week'] ?? gmdate('o-\WW'));
        $applied_products = is_array($catalog_promo['applied_products'] ?? null) ? $catalog_promo['applied_products'] : array();
        $cleared_products = is_array($catalog_promo['cleared_products'] ?? null) ? $catalog_promo['cleared_products'] : array();

        $fingerprint = wp_json_encode(array(
            'promo_week' => $promo_week,
            'applied_ids' => array_map('intval', wp_list_pluck($applied_products, 'id')),
            'cleared_ids' => array_map('intval', wp_list_pluck($cleared_products, 'id')),
        ));
        $batch_hash = md5((string) $fingerprint);
        $last_hash = (string) get_option('iv_ucs_last_weekly_batch_hash', '');
        if ($batch_hash === $last_hash) {
            return;
        }

        update_option('iv_ucs_last_weekly_batch_hash', $batch_hash, false);

        $payload = array(
            'generated_at' => current_time('mysql'),
            'trigger' => (string) $trigger,
            'promo_week' => $promo_week,
            'active_brands' => array_values(array_unique(array_filter(array_map('strval', (array) $active_brands)))),
            'applied' => $applied,
            'cleared' => $cleared,
            'scanned' => intval($catalog_promo['scanned'] ?? 0),
            'products' => array(
                'applied' => $applied_products,
                'cleared' => $cleared_products,
            ),
        );

        update_option('iv_ucs_last_weekly_offer_batch', $payload, false);
        do_action('iv_ucs_weekly_offer_batch_ready', $payload);
    }

    private function normalize_label($value) {
        $value = remove_accents((string) $value);
        $value = strtolower(trim($value));
        $value = str_replace(array("'", '´', '`'), '', $value);
        $value = preg_replace('/[^a-z0-9\s]/', ' ', $value);
        $value = preg_replace('/\s+/', ' ', $value);
        return trim($value);
    }

    private function reschedule_megasur_cron($hour) {
        wp_clear_scheduled_hook(self::CRON_MEGASUR);

        $hour = intval($hour);
        $now = current_time('timestamp');
        $target = mktime($hour, 0, 0, intval(date('n', $now)), intval(date('j', $now)), intval(date('Y', $now)));
        if ($target <= $now) {
            $target += DAY_IN_SECONDS;
        }

        wp_schedule_event($target, 'daily', self::CRON_MEGASUR);
    }

    private function store_result($payload) {
        update_option('iv_ucs_last_result', $payload, false);
        return $payload;
    }

    private function get_settings() {
        $defaults = array(
            'dmi_feed_url' => '',
            'dmi_api_url' => get_option('dmi_api_url', 'https://api.dmi.es'),
            'dmi_username' => get_option('dmi_username', ''),
            'dmi_password' => get_option('dmi_password', ''),
            'megasur_feed_url' => '',
            'request_timeout' => 45,
            'daily_megasur_hour' => 3,
            'create_missing_categories' => 0,
        );

        $saved = get_option(self::OPTION_KEY, array());
        if (!is_array($saved)) {
            $saved = array();
        }

        return wp_parse_args($saved, $defaults);
    }
}

Inforvel_Unified_Catalog_Sync::instance();
