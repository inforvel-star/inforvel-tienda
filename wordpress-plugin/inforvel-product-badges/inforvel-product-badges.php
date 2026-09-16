<?php
/**
 * Plugin Name: Inforvel Product Badges
 * Description: Permite asignar distintivos comerciales a productos de WooCommerce y exponerlos en la API REST.
 * Version: 1.0.0
 * Author: Inforvel
 * Requires Plugins: woocommerce
 * Text Domain: inforvel-product-badges
 */

if (!defined('ABSPATH')) {
	exit;
}

final class Inforvel_Product_Badges {
	const META_KEY = '_inforvel_product_badges';
	const NONCE_ACTION = 'ivpb_save_product_badges';
	const NONCE_NAME = 'ivpb_nonce';

	public static function init() {
		add_action('woocommerce_product_options_general_product_data', array(__CLASS__, 'render_product_fields'));
		add_action('woocommerce_admin_process_product_object', array(__CLASS__, 'save_product_fields'));
		add_filter('woocommerce_rest_prepare_product_object', array(__CLASS__, 'add_badges_to_rest_response'), 10, 2);
		add_filter('woocommerce_rest_prepare_product_variation_object', array(__CLASS__, 'add_badges_to_rest_response'), 10, 2);
		add_action('admin_head', array(__CLASS__, 'render_admin_styles'));
	}

	public static function get_badges() {
		return array(
			'recommended'   => 'Recomendado por Inforvel',
			'quality-price' => 'Mejor calidad/precio',
			'office'        => 'Para oficina',
			'remote-work'   => 'Teletrabajo',
			'gaming'        => 'Gaming',
			'business'      => 'Para empresa',
			'fast-delivery' => 'Entrega rápida',
		);
	}

	public static function render_product_fields() {
		global $product_object;

		if (!$product_object instanceof WC_Product) {
			return;
		}

		$selected = self::sanitize_badges($product_object->get_meta(self::META_KEY, true));
		wp_nonce_field(self::NONCE_ACTION, self::NONCE_NAME);
		?>
		<div class="options_group ivpb-product-badges">
			<p class="form-field ivpb-heading">
				<strong><?php esc_html_e('Distintivos Inforvel', 'inforvel-product-badges'); ?></strong>
				<span class="description"><?php esc_html_e('Selecciona los distintivos que se mostrarán en la tienda online.', 'inforvel-product-badges'); ?></span>
			</p>
			<div class="ivpb-options">
				<?php foreach (self::get_badges() as $badge_id => $label) : ?>
					<label>
						<input
							type="checkbox"
							name="inforvel_product_badges[]"
							value="<?php echo esc_attr($badge_id); ?>"
							<?php checked(in_array($badge_id, $selected, true)); ?>
						/>
						<span><?php echo esc_html($label); ?></span>
					</label>
				<?php endforeach; ?>
			</div>
		</div>
		<?php
	}

	public static function save_product_fields($product) {
		if (!$product instanceof WC_Product || !current_user_can('edit_post', $product->get_id())) {
			return;
		}

		$nonce = isset($_POST[self::NONCE_NAME]) ? sanitize_text_field(wp_unslash($_POST[self::NONCE_NAME])) : '';
		if (!$nonce || !wp_verify_nonce($nonce, self::NONCE_ACTION)) {
			return;
		}

		$submitted = isset($_POST['inforvel_product_badges'])
			? (array) wp_unslash($_POST['inforvel_product_badges'])
			: array();
		$badges = self::sanitize_badges($submitted);

		if ($badges) {
			$product->update_meta_data(self::META_KEY, $badges);
		} else {
			$product->delete_meta_data(self::META_KEY);
		}
	}

	public static function add_badges_to_rest_response($response, $product) {
		if ($product instanceof WC_Product) {
			$response->data['inforvel_badges'] = self::sanitize_badges($product->get_meta(self::META_KEY, true));
		}
		return $response;
	}

	private static function sanitize_badges($badges) {
		if (!is_array($badges)) {
			return array();
		}

		$allowed = array_keys(self::get_badges());
		$clean = array_map('sanitize_key', $badges);
		return array_values(array_intersect($allowed, array_unique($clean)));
	}

	public static function render_admin_styles() {
		$screen = function_exists('get_current_screen') ? get_current_screen() : null;
		if (!$screen || $screen->post_type !== 'product') {
			return;
		}
		?>
		<style>
			.ivpb-product-badges { padding: 12px; }
			.ivpb-product-badges .ivpb-heading { padding: 0 !important; }
			.ivpb-product-badges .ivpb-heading strong,
			.ivpb-product-badges .ivpb-heading .description { display: block; margin-bottom: 5px; }
			.ivpb-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; max-width: 640px; }
			.ivpb-options label { display: flex; align-items: center; gap: 8px; min-height: 32px; }
			@media (max-width: 782px) { .ivpb-options { grid-template-columns: 1fr; } }
		</style>
		<?php
	}
}

add_action('plugins_loaded', array('Inforvel_Product_Badges', 'init'));
