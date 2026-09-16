<?php
/**
 * Plugin Name: Inforvel Customer Points Monitor
 * Description: Monitoriza puntos de clientes (_inforvel_points), registra auditoria de cambios y permite revision en WooCommerce.
 * Version: 1.0.0
 * Author: Inforvel
 * Requires Plugins: woocommerce
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!class_exists('Inforvel_Customer_Points_Monitor')) {
    class Inforvel_Customer_Points_Monitor {
        const META_KEY = '_inforvel_points';
        const TABLE_SUFFIX = 'inforvel_points_audit';
        private static $old_points_buffer = array();

        public static function init() {
            add_action('admin_notices', array(__CLASS__, 'maybe_show_wc_notice'));
            add_action('admin_menu', array(__CLASS__, 'register_admin_page'));
            add_action('admin_post_ivpm_adjust_points', array(__CLASS__, 'handle_adjust_points'));
            add_filter('update_user_metadata', array(__CLASS__, 'capture_old_points_before_update'), 10, 5);
            add_action('added_user_meta', array(__CLASS__, 'track_points_change_added'), 10, 4);
            add_action('updated_user_meta', array(__CLASS__, 'track_points_change_updated'), 10, 4);
        }

        public static function activate() {
            self::create_audit_table();
        }

        public static function maybe_show_wc_notice() {
            if (!current_user_can('activate_plugins')) {
                return;
            }
            if (class_exists('WooCommerce')) {
                return;
            }
            echo '<div class="notice notice-warning"><p><strong>Inforvel Customer Points Monitor:</strong> WooCommerce no esta activo.</p></div>';
        }

        private static function get_table_name() {
            global $wpdb;
            return $wpdb->prefix . self::TABLE_SUFFIX;
        }

        private static function create_audit_table() {
            global $wpdb;
            $table = self::get_table_name();
            $charset_collate = $wpdb->get_charset_collate();

            require_once ABSPATH . 'wp-admin/includes/upgrade.php';

            $sql = "CREATE TABLE {$table} (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                user_id BIGINT UNSIGNED NOT NULL,
                old_points INT NOT NULL,
                new_points INT NOT NULL,
                delta INT NOT NULL,
                actor_user_id BIGINT UNSIGNED NULL,
                source VARCHAR(40) NOT NULL,
                request_uri TEXT NULL,
                note VARCHAR(255) NULL,
                created_at DATETIME NOT NULL,
                PRIMARY KEY (id),
                KEY user_id (user_id),
                KEY created_at (created_at)
            ) {$charset_collate};";

            dbDelta($sql);
        }

        private static function normalize_points($raw) {
            $parsed = intval($raw);
            return max(0, $parsed);
        }

        private static function detect_source() {
            if (defined('WP_CLI') && WP_CLI) {
                return 'wp-cli';
            }
            if (defined('DOING_CRON') && DOING_CRON) {
                return 'cron';
            }
            if (defined('REST_REQUEST') && REST_REQUEST) {
                return 'rest-api';
            }
            if (is_admin()) {
                return 'admin';
            }
            return 'frontend';
        }

        private static function insert_audit($user_id, $old_points, $new_points, $note = '') {
            global $wpdb;

            if ($old_points === $new_points) {
                return;
            }

            $table = self::get_table_name();
            $actor_user_id = get_current_user_id();
            $source = self::detect_source();
            $request_uri = isset($_SERVER['REQUEST_URI']) ? sanitize_text_field(wp_unslash($_SERVER['REQUEST_URI'])) : '';

            $wpdb->insert(
                $table,
                array(
                    'user_id' => intval($user_id),
                    'old_points' => intval($old_points),
                    'new_points' => intval($new_points),
                    'delta' => intval($new_points - $old_points),
                    'actor_user_id' => $actor_user_id > 0 ? intval($actor_user_id) : null,
                    'source' => $source,
                    'request_uri' => $request_uri,
                    'note' => $note,
                    'created_at' => current_time('mysql', 1),
                ),
                array('%d', '%d', '%d', '%d', '%d', '%s', '%s', '%s', '%s')
            );
        }

        private static function get_user_points($user_id) {
            return self::normalize_points(get_user_meta($user_id, self::META_KEY, true));
        }

        public static function track_points_change_added($meta_id, $user_id, $meta_key, $meta_value) {
            if ($meta_key !== self::META_KEY) {
                return;
            }
            $new_points = self::normalize_points($meta_value);
            self::insert_audit($user_id, 0, $new_points, 'meta_added');
        }

        public static function track_points_change_updated($meta_id, $user_id, $meta_key, $meta_value) {
            if ($meta_key !== self::META_KEY) {
                return;
            }

            $new_points = self::normalize_points($meta_value);
            $old_points = isset(self::$old_points_buffer[$user_id])
                ? self::normalize_points(self::$old_points_buffer[$user_id])
                : self::get_user_points($user_id);
            unset(self::$old_points_buffer[$user_id]);

            if ($old_points !== $new_points) {
                self::insert_audit($user_id, $old_points, $new_points, 'meta_updated');
            }
        }

        public static function capture_old_points_before_update($check, $user_id, $meta_key, $meta_value, $prev_value) {
            if ($meta_key !== self::META_KEY) {
                return $check;
            }
            self::$old_points_buffer[$user_id] = get_user_meta($user_id, self::META_KEY, true);
            return $check;
        }

        public static function register_admin_page() {
            add_submenu_page(
                'woocommerce',
                'Puntos de Clientes',
                'Puntos clientes',
                'manage_woocommerce',
                'inforvel-points-monitor',
                array(__CLASS__, 'render_admin_page')
            );
        }

        public static function handle_adjust_points() {
            if (!current_user_can('manage_woocommerce')) {
                wp_die('No autorizado');
            }

            check_admin_referer('ivpm_adjust_points');

            $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;
            $delta = isset($_POST['delta']) ? intval($_POST['delta']) : 0;
            $reason = isset($_POST['reason']) ? sanitize_text_field(wp_unslash($_POST['reason'])) : '';

            if ($user_id <= 0 || $delta === 0) {
                wp_safe_redirect(admin_url('admin.php?page=inforvel-points-monitor&msg=invalid'));
                exit;
            }

            $old_points = self::get_user_points($user_id);
            $new_points = max(0, $old_points + $delta);

            update_user_meta($user_id, self::META_KEY, strval($new_points));
            self::insert_audit($user_id, $old_points, $new_points, 'manual_adjust:' . $reason);

            wp_safe_redirect(admin_url('admin.php?page=inforvel-points-monitor&msg=updated'));
            exit;
        }

        private static function get_customers_with_points($limit = 200) {
            $users = get_users(array(
                'number' => $limit,
                'fields' => array('ID', 'user_email', 'display_name', 'user_registered'),
                'meta_key' => self::META_KEY,
                'orderby' => 'meta_value_num',
                'order' => 'DESC',
            ));

            $result = array();
            foreach ($users as $user) {
                $result[] = array(
                    'id' => $user->ID,
                    'email' => $user->user_email,
                    'name' => $user->display_name,
                    'registered' => $user->user_registered,
                    'points' => self::get_user_points($user->ID),
                );
            }
            return $result;
        }

        private static function get_audit_rows($limit = 100) {
            global $wpdb;
            $table = self::get_table_name();
            return $wpdb->get_results(
                $wpdb->prepare("SELECT * FROM {$table} ORDER BY id DESC LIMIT %d", $limit),
                ARRAY_A
            );
        }

        public static function render_admin_page() {
            if (!current_user_can('manage_woocommerce')) {
                wp_die('No autorizado');
            }

            self::create_audit_table();

            $customers = self::get_customers_with_points(300);
            $audit_rows = self::get_audit_rows(120);

            $total_points = array_sum(array_map(function ($row) {
                return intval($row['points']);
            }, $customers));

            ?>
            <div class="wrap">
                <h1>Puntos de clientes (Inforvel)</h1>
                <p>Monitor para revisar saldo de puntos y detectar cambios sospechosos.</p>

                <div style="display:flex;gap:24px;flex-wrap:wrap;margin:16px 0;">
                    <div style="background:#fff;padding:14px 16px;border:1px solid #dcdcde;border-radius:6px;min-width:220px;">
                        <strong>Clientes con puntos</strong><br><?php echo esc_html(count($customers)); ?>
                    </div>
                    <div style="background:#fff;padding:14px 16px;border:1px solid #dcdcde;border-radius:6px;min-width:220px;">
                        <strong>Puntos totales</strong><br><?php echo esc_html(number_format_i18n($total_points)); ?>
                    </div>
                </div>

                <h2>Ajuste manual</h2>
                <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="background:#fff;border:1px solid #dcdcde;padding:16px;border-radius:6px;max-width:760px;">
                    <?php wp_nonce_field('ivpm_adjust_points'); ?>
                    <input type="hidden" name="action" value="ivpm_adjust_points" />
                    <p>
                        <label><strong>ID cliente</strong></label><br>
                        <input type="number" name="user_id" min="1" required style="width:100%;max-width:220px;" />
                    </p>
                    <p>
                        <label><strong>Delta puntos</strong> (positivo suma, negativo resta)</label><br>
                        <input type="number" name="delta" required style="width:100%;max-width:220px;" />
                    </p>
                    <p>
                        <label><strong>Motivo</strong></label><br>
                        <input type="text" name="reason" maxlength="120" placeholder="pedido, correccion, soporte..." style="width:100%;max-width:420px;" />
                    </p>
                    <p>
                        <button class="button button-primary" type="submit">Aplicar ajuste</button>
                    </p>
                </form>

                <h2 style="margin-top:28px;">Clientes</h2>
                <table class="widefat striped">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Cliente</th>
                            <th>Email</th>
                            <th>Registro</th>
                            <th style="text-align:right;">Puntos</th>
                        </tr>
                    </thead>
                    <tbody>
                    <?php if (empty($customers)) : ?>
                        <tr><td colspan="5">No hay clientes con puntos.</td></tr>
                    <?php else : ?>
                        <?php foreach ($customers as $row) : ?>
                            <tr>
                                <td><?php echo esc_html($row['id']); ?></td>
                                <td><?php echo esc_html($row['name']); ?></td>
                                <td><?php echo esc_html($row['email']); ?></td>
                                <td><?php echo esc_html($row['registered']); ?></td>
                                <td style="text-align:right;"><strong><?php echo esc_html(number_format_i18n($row['points'])); ?></strong></td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                    </tbody>
                </table>

                <h2 style="margin-top:28px;">Auditoria de cambios</h2>
                <table class="widefat striped">
                    <thead>
                        <tr>
                            <th>Fecha (UTC)</th>
                            <th>User ID</th>
                            <th>Anterior</th>
                            <th>Nuevo</th>
                            <th>Delta</th>
                            <th>Origen</th>
                            <th>Actor</th>
                            <th>Nota</th>
                        </tr>
                    </thead>
                    <tbody>
                    <?php if (empty($audit_rows)) : ?>
                        <tr><td colspan="8">Sin cambios registrados todavia.</td></tr>
                    <?php else : ?>
                        <?php foreach ($audit_rows as $row) : ?>
                            <tr>
                                <td><?php echo esc_html($row['created_at']); ?></td>
                                <td><?php echo esc_html($row['user_id']); ?></td>
                                <td><?php echo esc_html($row['old_points']); ?></td>
                                <td><?php echo esc_html($row['new_points']); ?></td>
                                <td><?php echo esc_html($row['delta']); ?></td>
                                <td><?php echo esc_html($row['source']); ?></td>
                                <td><?php echo esc_html($row['actor_user_id'] ?: '-'); ?></td>
                                <td><?php echo esc_html($row['note']); ?></td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                    </tbody>
                </table>
            </div>
            <?php
        }
    }

    Inforvel_Customer_Points_Monitor::init();
    register_activation_hook(__FILE__, array('Inforvel_Customer_Points_Monitor', 'activate'));
}
