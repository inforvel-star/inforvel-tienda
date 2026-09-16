<?php
/**
 * Plugin Name: Inforvel Weekly Offers
 * Description: Genera ofertas semanales simuladas en WooCommerce sin pisar promociones reales del proveedor.
 * Version: 1.0.0
 * Author: Inforvel
 * Requires Plugins: woocommerce
 */

if (!defined('ABSPATH')) {
	exit;
}

if (!class_exists('Inforvel_Weekly_Offers')) {
	class Inforvel_Weekly_Offers {
		const OPTION_SETTINGS = 'ivwo_settings';
		const OPTION_LAST_RUN = 'ivwo_last_run';
		const CRON_HOOK = 'ivwo_weekly_cron';

		const META_ACTIVE = '_iv_fake_offer_active';
		const META_ORIGINAL_REGULAR = '_iv_fake_offer_original_regular';
		const META_ORIGINAL_SALE = '_iv_fake_offer_original_sale';
		const META_ORIGINAL_PRICE = '_iv_fake_offer_original_price';
		const META_FAKE_REGULAR = '_iv_fake_offer_fake_regular';
		const META_BATCH_DATE = '_iv_fake_offer_batch_date';

		public static function init() {
			add_action('admin_notices', array(__CLASS__, 'maybe_show_wc_notice'));
			if (!class_exists('WooCommerce')) {
				return;
			}
			add_filter('cron_schedules', array(__CLASS__, 'register_weekly_schedule'));
			add_action(self::CRON_HOOK, array(__CLASS__, 'cron_execute'));
			add_action('admin_menu', array(__CLASS__, 'register_admin_page'));
			add_action('admin_init', array(__CLASS__, 'register_settings'));
			add_action('admin_post_ivwo_run_now', array(__CLASS__, 'handle_run_now'));
		}

		public static function maybe_show_wc_notice() {
			if (!current_user_can('activate_plugins')) {
				return;
			}
			if (class_exists('WooCommerce')) {
				return;
			}
			echo '<div class="notice notice-error"><p><strong>Inforvel Weekly Offers:</strong> WooCommerce debe estar activo para funcionar.</p></div>';
		}

		public static function activate() {
			self::ensure_defaults();
			self::schedule_event();
		}

		public static function deactivate() {
			$timestamp = wp_next_scheduled(self::CRON_HOOK);
			if ($timestamp) {
				wp_unschedule_event($timestamp, self::CRON_HOOK);
			}
		}

		public static function register_weekly_schedule($schedules) {
			$schedules['ivwo_weekly'] = array(
				'interval' => WEEK_IN_SECONDS,
				'display'  => __('Una vez por semana (Inforvel)', 'inforvel-weekly-offers'),
			);
			return $schedules;
		}

		private static function ensure_defaults() {
			$defaults = array(
				'enabled' => 1,
				'min_percent' => 10,
				'max_percent' => 25,
				'products_count' => 24,
			);
			$current = get_option(self::OPTION_SETTINGS, array());
			update_option(self::OPTION_SETTINGS, wp_parse_args($current, $defaults));
		}

		private static function next_monday_timestamp() {
			$timezone = wp_timezone();
			$now = new DateTimeImmutable('now', $timezone);
			$today_at_two = $now->setTime(2, 0, 0);
			$is_monday = ((int) $now->format('N') === 1);

			if ($is_monday && $now < $today_at_two) {
				return $today_at_two->getTimestamp();
			}

			$next = new DateTimeImmutable('next monday', $timezone);
			$next = $next->setTime(2, 0, 0);
			return $next->getTimestamp();
		}

		private static function schedule_event() {
			if (wp_next_scheduled(self::CRON_HOOK)) {
				return;
			}
			wp_schedule_event(self::next_monday_timestamp(), 'ivwo_weekly', self::CRON_HOOK);
		}

		public static function cron_execute() {
			$settings = self::get_settings();
			if (empty($settings['enabled'])) {
				return;
			}
			$result = self::execute_logic(array(
				'dry_run' => false,
				'revert_only' => false,
			));
			self::store_last_run($result, 'cron');
		}

		private static function get_settings() {
			$settings = get_option(self::OPTION_SETTINGS, array());
			return wp_parse_args($settings, array(
				'enabled' => 1,
				'min_percent' => 10,
				'max_percent' => 25,
				'products_count' => 24,
			));
		}

		private static function round_price($price) {
			return number_format((float) $price, 2, '.', '');
		}

		private static function is_real_provider_sale($product) {
			if (!$product || !is_a($product, 'WC_Product')) {
				return false;
			}
			$is_fake_active = $product->get_meta(self::META_ACTIVE, true) === '1';
			if ($is_fake_active) {
				return false;
			}
			$regular = (float) $product->get_regular_price();
			$sale = (float) $product->get_sale_price();
			return $sale > 0 && $regular > $sale;
		}

		private static function get_all_publish_product_ids() {
			$ids = array();
			$page = 1;

			do {
				$query = wc_get_products(array(
					'status' => 'publish',
					'return' => 'ids',
					'paginate' => true,
					'limit' => 100,
					'page' => $page,
				));

				if (!empty($query->products)) {
					$ids = array_merge($ids, $query->products);
				}

				$page++;
				$has_more = $query->max_num_pages >= $page;
			} while ($has_more);

			return $ids;
		}

		private static function clear_fake_meta($product) {
			$product->update_meta_data(self::META_ACTIVE, '0');
			$product->update_meta_data(self::META_ORIGINAL_REGULAR, '');
			$product->update_meta_data(self::META_ORIGINAL_SALE, '');
			$product->update_meta_data(self::META_ORIGINAL_PRICE, '');
			$product->update_meta_data(self::META_FAKE_REGULAR, '');
			$product->update_meta_data(self::META_BATCH_DATE, '');
		}

		private static function revert_fake_offers($products, $dry_run) {
			$reverted = 0;
			$cleared_only = 0;

			foreach ($products as $product) {
				$is_fake_active = $product->get_meta(self::META_ACTIVE, true) === '1';
				if (!$is_fake_active) {
					continue;
				}

				$original_regular = (string) $product->get_meta(self::META_ORIGINAL_REGULAR, true);
				$original_sale = (string) $product->get_meta(self::META_ORIGINAL_SALE, true);
				$original_price = (string) $product->get_meta(self::META_ORIGINAL_PRICE, true);
				$fake_regular = (string) $product->get_meta(self::META_FAKE_REGULAR, true);

				$still_expected_state =
					(string) $product->get_regular_price() === $fake_regular &&
					(string) $product->get_sale_price() === $original_price;

				if ($still_expected_state) {
					$product->set_regular_price($original_regular);
					$product->set_sale_price($original_sale);
					self::clear_fake_meta($product);
					if (!$dry_run) {
						$product->save();
					}
					$reverted++;
				} else {
					self::clear_fake_meta($product);
					if (!$dry_run) {
						$product->save();
					}
					$cleared_only++;
				}
			}

			return array(
				'reverted' => $reverted,
				'cleared_only' => $cleared_only,
			);
		}

		private static function apply_weekly_fake_offers($products, $settings, $dry_run) {
			$min = max(1, (int) $settings['min_percent']);
			$max = max($min, (int) $settings['max_percent']);
			$count = max(1, (int) $settings['products_count']);
			$batch_date = gmdate('Y-m-d');

			$eligible = array();
			foreach ($products as $product) {
				if (self::is_real_provider_sale($product)) {
					continue;
				}
				$current = (float) $product->get_price();
				if ($current <= 0) {
					continue;
				}
				$eligible[] = $product;
			}

			if (empty($eligible)) {
				return array(
					'applied' => 0,
					'selected' => 0,
					'skipped_no_eligible' => true,
				);
			}

			shuffle($eligible);
			$selected = array_slice($eligible, 0, min($count, count($eligible)));
			$applied = 0;

			foreach ($selected as $product) {
				$current_price = (float) $product->get_price();
				$percent = random_int($min, $max);
				$fake_regular = self::round_price($current_price * (1 + ($percent / 100)));

				$original_regular = (string) $product->get_regular_price();
				if ($original_regular === '') {
					$original_regular = self::round_price($current_price);
				}
				$original_sale = (string) $product->get_sale_price();

				$product->set_regular_price($fake_regular);
				$product->set_sale_price(self::round_price($current_price));
				$product->update_meta_data(self::META_ACTIVE, '1');
				$product->update_meta_data(self::META_ORIGINAL_REGULAR, $original_regular);
				$product->update_meta_data(self::META_ORIGINAL_SALE, $original_sale);
				$product->update_meta_data(self::META_ORIGINAL_PRICE, self::round_price($current_price));
				$product->update_meta_data(self::META_FAKE_REGULAR, $fake_regular);
				$product->update_meta_data(self::META_BATCH_DATE, $batch_date);

				if (!$dry_run) {
					$product->save();
				}
				$applied++;
			}

			return array(
				'applied' => $applied,
				'selected' => count($selected),
				'skipped_no_eligible' => false,
			);
		}

		private static function execute_logic($args = array()) {
			$args = wp_parse_args($args, array(
				'dry_run' => false,
				'revert_only' => false,
			));

			$settings = self::get_settings();
			$product_ids = self::get_all_publish_product_ids();
			$products = array();
			foreach ($product_ids as $product_id) {
				$p = wc_get_product($product_id);
				if ($p) {
					$products[] = $p;
				}
			}

			$revert = self::revert_fake_offers($products, $args['dry_run']);
			$apply = array(
				'applied' => 0,
				'selected' => 0,
				'skipped_no_eligible' => true,
			);

			if (!$args['revert_only']) {
				$apply = self::apply_weekly_fake_offers($products, $settings, $args['dry_run']);
			}

			return array(
				'timestamp' => current_time('mysql'),
				'dry_run' => (bool) $args['dry_run'],
				'revert_only' => (bool) $args['revert_only'],
				'total_products' => count($products),
				'reverted' => (int) $revert['reverted'],
				'cleared_only' => (int) $revert['cleared_only'],
				'selected' => (int) $apply['selected'],
				'applied' => (int) $apply['applied'],
				'skipped_no_eligible' => (bool) $apply['skipped_no_eligible'],
			);
		}

		private static function store_last_run($result, $trigger) {
			$result['trigger'] = $trigger;
			update_option(self::OPTION_LAST_RUN, $result, false);
		}

		public static function register_admin_page() {
			add_submenu_page(
				'woocommerce',
				'Ofertas semanales',
				'Ofertas semanales',
				'manage_woocommerce',
				'ivwo-weekly-offers',
				array(__CLASS__, 'render_admin_page')
			);
		}

		public static function register_settings() {
			register_setting('ivwo_settings_group', self::OPTION_SETTINGS, array(__CLASS__, 'sanitize_settings'));
		}

		public static function sanitize_settings($input) {
			$enabled = !empty($input['enabled']) ? 1 : 0;
			$min = max(1, (int) ($input['min_percent'] ?? 10));
			$max = max($min, (int) ($input['max_percent'] ?? 25));
			$count = max(1, (int) ($input['products_count'] ?? 24));

			return array(
				'enabled' => $enabled,
				'min_percent' => $min,
				'max_percent' => $max,
				'products_count' => $count,
			);
		}

		public static function handle_run_now() {
			if (!current_user_can('manage_woocommerce')) {
				wp_die('Sin permisos.');
			}
			check_admin_referer('ivwo_run_now_action');

			$dry_run = !empty($_POST['ivwo_dry_run']);
			$revert_only = !empty($_POST['ivwo_revert_only']);
			$result = self::execute_logic(array(
				'dry_run' => $dry_run,
				'revert_only' => $revert_only,
			));
			self::store_last_run($result, 'manual');

			$url = add_query_arg(array(
				'page' => 'ivwo-weekly-offers',
				'ivwo_notice' => '1',
			), admin_url('admin.php'));
			wp_safe_redirect($url);
			exit;
		}

		public static function render_admin_page() {
			if (!current_user_can('manage_woocommerce')) {
				return;
			}

			$settings = self::get_settings();
			$last_run = get_option(self::OPTION_LAST_RUN, array());
			$next_run = wp_next_scheduled(self::CRON_HOOK);
			?>
			<div class="wrap">
				<h1>Ofertas semanales simuladas</h1>
				<p>Este módulo crea ofertas "visuales" cada semana sin tocar las ofertas reales del proveedor.</p>

				<?php if (!empty($_GET['ivwo_notice'])) : ?>
					<div class="notice notice-success is-dismissible">
						<p>Ejecución completada.</p>
					</div>
				<?php endif; ?>

				<h2>Configuración</h2>
				<form method="post" action="options.php">
					<?php settings_fields('ivwo_settings_group'); ?>
					<table class="form-table" role="presentation">
						<tr>
							<th scope="row">Activar tarea semanal</th>
							<td>
								<label>
									<input type="checkbox" name="<?php echo esc_attr(self::OPTION_SETTINGS); ?>[enabled]" value="1" <?php checked(!empty($settings['enabled'])); ?> />
									Habilitado
								</label>
							</td>
						</tr>
						<tr>
							<th scope="row">Porcentaje mínimo</th>
							<td><input type="number" min="1" max="99" name="<?php echo esc_attr(self::OPTION_SETTINGS); ?>[min_percent]" value="<?php echo esc_attr($settings['min_percent']); ?>" /></td>
						</tr>
						<tr>
							<th scope="row">Porcentaje máximo</th>
							<td><input type="number" min="1" max="99" name="<?php echo esc_attr(self::OPTION_SETTINGS); ?>[max_percent]" value="<?php echo esc_attr($settings['max_percent']); ?>" /></td>
						</tr>
						<tr>
							<th scope="row">Productos por semana</th>
							<td><input type="number" min="1" max="500" name="<?php echo esc_attr(self::OPTION_SETTINGS); ?>[products_count]" value="<?php echo esc_attr($settings['products_count']); ?>" /></td>
						</tr>
					</table>
					<?php submit_button('Guardar configuración'); ?>
				</form>

				<h2>Ejecución manual</h2>
				<form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
					<?php wp_nonce_field('ivwo_run_now_action'); ?>
					<input type="hidden" name="action" value="ivwo_run_now" />
					<p>
						<label><input type="checkbox" name="ivwo_dry_run" value="1" /> Simulación (sin guardar cambios)</label>
					</p>
					<p>
						<label><input type="checkbox" name="ivwo_revert_only" value="1" /> Solo revertir lote anterior (no crear nuevo)</label>
					</p>
					<?php submit_button('Ejecutar ahora', 'primary', 'submit', false); ?>
				</form>

				<h2>Estado</h2>
				<table class="widefat striped" style="max-width: 900px;">
					<tbody>
						<tr>
							<th style="width: 260px;">Próxima ejecución cron</th>
							<td><?php echo $next_run ? esc_html(wp_date('Y-m-d H:i:s', $next_run)) : 'No programada'; ?></td>
						</tr>
						<tr>
							<th>Última ejecución</th>
							<td><?php echo !empty($last_run['timestamp']) ? esc_html($last_run['timestamp']) : 'Sin ejecuciones'; ?></td>
						</tr>
						<tr>
							<th>Origen</th>
							<td><?php echo !empty($last_run['trigger']) ? esc_html($last_run['trigger']) : '-'; ?></td>
						</tr>
						<tr>
							<th>Resumen último run</th>
							<td>
								<?php
								if (!empty($last_run)) {
									echo esc_html(
										sprintf(
											'Total: %d | Revertidos: %d | Limpiados: %d | Seleccionados: %d | Aplicados: %d | Dry-run: %s',
											(int) ($last_run['total_products'] ?? 0),
											(int) ($last_run['reverted'] ?? 0),
											(int) ($last_run['cleared_only'] ?? 0),
											(int) ($last_run['selected'] ?? 0),
											(int) ($last_run['applied'] ?? 0),
											!empty($last_run['dry_run']) ? 'SI' : 'NO'
										)
									);
								} else {
									echo '-';
								}
								?>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			<?php
		}
	}
}

Inforvel_Weekly_Offers::init();
register_activation_hook(__FILE__, array('Inforvel_Weekly_Offers', 'activate'));
register_deactivation_hook(__FILE__, array('Inforvel_Weekly_Offers', 'deactivate'));
