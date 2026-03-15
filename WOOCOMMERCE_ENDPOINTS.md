# 📦 Endpoints Personalizados para WooCommerce

## 🎯 Objetivo
Crear endpoints REST personalizados en WooCommerce para gestionar el carrito de usuarios autenticados.

## 📍 Archivo a Crear en WordPress
**Ubicación:** `wp-content/themes/tu-tema/functions.php` o crear un plugin personalizado.

```php
<?php
/**
 * Endpoints personalizados para carrito persistente
 * Compatible con autenticación JWT
 */

// Registrar endpoints personalizados
add_action('rest_api_init', function () {
    // Obtener carrito del usuario
    register_rest_route('custom/v1', '/cart', array(
        'methods' => 'GET',
        'callback' => 'get_user_cart',
        'permission_callback' => 'is_user_logged_in'
    ));

    // Guardar carrito del usuario
    register_rest_route('custom/v1', '/cart', array(
        'methods' => 'POST',
        'callback' => 'save_user_cart',
        'permission_callback' => 'is_user_logged_in'
    ));

    // Limpiar carrito del usuario
    register_rest_route('custom/v1', '/cart', array(
        'methods' => 'DELETE',
        'callback' => 'clear_user_cart',
        'permission_callback' => 'is_user_logged_in'
    ));
});

/**
 * Obtener carrito del usuario autenticado
 */
function get_user_cart($request) {
    $user_id = get_current_user_id();

    if (!$user_id) {
        return new WP_Error('unauthorized', 'Usuario no autenticado', array('status' => 401));
    }

    $cart_data = get_user_meta($user_id, '_persistent_cart', true);

    if (empty($cart_data)) {
        return rest_ensure_response(array(
            'success' => true,
            'cart' => array()
        ));
    }

    return rest_ensure_response(array(
        'success' => true,
        'cart' => $cart_data
    ));
}

/**
 * Guardar carrito del usuario autenticado
 */
function save_user_cart($request) {
    $user_id = get_current_user_id();

    if (!$user_id) {
        return new WP_Error('unauthorized', 'Usuario no autenticado', array('status' => 401));
    }

    $params = $request->get_json_params();
    $cart_items = isset($params['items']) ? $params['items'] : array();

    // Validar estructura del carrito
    if (!is_array($cart_items)) {
        return new WP_Error('invalid_data', 'Formato de carrito inválido', array('status' => 400));
    }

    // Guardar en user_meta
    update_user_meta($user_id, '_persistent_cart', $cart_items);

    return rest_ensure_response(array(
        'success' => true,
        'message' => 'Carrito guardado correctamente',
        'cart' => $cart_items
    ));
}

/**
 * Limpiar carrito del usuario autenticado
 */
function clear_user_cart($request) {
    $user_id = get_current_user_id();

    if (!$user_id) {
        return new WP_Error('unauthorized', 'Usuario no autenticado', array('status' => 401));
    }

    delete_user_meta($user_id, '_persistent_cart');

    return rest_ensure_response(array(
        'success' => true,
        'message' => 'Carrito limpiado correctamente'
    ));
}
```

## 🔐 Autenticación JWT

### Plugin Requerido
Instalar **JWT Authentication for WP REST API**
- Plugin: https://wordpress.org/plugins/jwt-authentication-for-wp-rest-api/
- O usar: https://github.com/Tmeister/wp-api-jwt-auth

### Configuración en `wp-config.php`
```php
define('JWT_AUTH_SECRET_KEY', 'tu-clave-secreta-super-segura-aqui');
define('JWT_AUTH_CORS_ENABLE', true);
```

### Configuración en `.htaccess`
```apache
RewriteEngine On
RewriteCond %{HTTP:Authorization} ^(.*)
RewriteRule ^(.*) - [E=HTTP_AUTHORIZATION:%1]
SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1
```

## 📡 Uso de los Endpoints

### 1. Login y obtener token JWT
```bash
POST https://tu-tienda.com/wp-json/jwt-auth/v1/token

Body:
{
  "username": "usuario@ejemplo.com",
  "password": "contraseña"
}

Response:
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user_email": "usuario@ejemplo.com",
  "user_nicename": "usuario",
  "user_display_name": "Usuario Demo"
}
```

### 2. Obtener carrito del usuario
```bash
GET https://tu-tienda.com/wp-json/custom/v1/cart

Headers:
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...

Response:
{
  "success": true,
  "cart": [
    {
      "id": 123,
      "name": "Producto Demo",
      "price": 29.99,
      "quantity": 2,
      "image": "https://...",
      "variationId": null,
      "maxStock": 10
    }
  ]
}
```

### 3. Guardar carrito del usuario
```bash
POST https://tu-tienda.com/wp-json/custom/v1/cart

Headers:
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
Content-Type: application/json

Body:
{
  "items": [
    {
      "id": 123,
      "name": "Producto Demo",
      "price": 29.99,
      "quantity": 2,
      "image": "https://...",
      "variationId": null,
      "maxStock": 10
    }
  ]
}

Response:
{
  "success": true,
  "message": "Carrito guardado correctamente",
  "cart": [...]
}
```

### 4. Limpiar carrito del usuario
```bash
DELETE https://tu-tienda.com/wp-json/custom/v1/cart

Headers:
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...

Response:
{
  "success": true,
  "message": "Carrito limpiado correctamente"
}
```

## 🛡️ Seguridad

1. **Autenticación obligatoria:** Todos los endpoints requieren JWT token válido
2. **User ID dinámico:** Se usa `get_current_user_id()` para prevenir manipulación
3. **Validación de datos:** Se valida el formato del carrito antes de guardar
4. **CORS habilitado:** Compatible con frontend en dominio diferente
5. **HTTPS requerido:** Siempre usar HTTPS en producción

## 📦 Almacenamiento

Los datos del carrito se guardan en:
- **Tabla:** `wp_usermeta`
- **Meta Key:** `_persistent_cart`
- **Formato:** Array JSON serializado

## ✅ Testing

Puedes probar los endpoints con:
- Postman
- Insomnia
- cURL
- Frontend Next.js

## 🚀 Siguiente Paso

Una vez implementados estos endpoints en WordPress, el frontend Next.js podrá:
1. Autenticar usuarios con JWT
2. Sincronizar carrito automáticamente
3. Persistir carrito en servidor MySQL de WooCommerce
4. Recuperar carrito al iniciar sesión desde cualquier dispositivo
