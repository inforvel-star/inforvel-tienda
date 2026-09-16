# 🛡️ Guía de Seguridad WordPress (Headless API)

> Esta guía cubre los cambios que debes hacer **directamente en el servidor WordPress** (no en el código Next.js).

---

## ✅ Paso 1 — Proteger `/wp-login.php` por IP

**En el archivo `.htaccess`** de la raíz de WordPress, añade esto:

```apache
# Proteger wp-login.php solo para tu IP
<Files wp-login.php>
  Order deny,allow
  Deny from all
  Allow from TU_IP_AQUI
</Files>

# Proteger /wp-admin/ solo para tu IP
<IfModule mod_rewrite.c>
  RewriteEngine on
  RewriteCond %{REQUEST_URI} ^/wp-admin
  RewriteCond %{REMOTE_ADDR} !^TU_IP_AQUI$
  RewriteRule ^.*$ - [F]
</IfModule>
```

> **¿Cómo saber tu IP?** Ve a https://www.whatismyip.com/ y copia tu IP pública. Si tienes IP dinámica, considera usar una VPN con IP fija.

---

## ✅ Paso 2 — `wp-config.php`: hardening

Añade estas líneas **antes** de `/* That's all, stop editing! */`:

```php
// Desactiva el editor de archivos desde el panel de WP
define('DISALLOW_FILE_EDIT', true);

// Desactiva la instalación/actualización de plugins/temas desde el panel
define('DISALLOW_FILE_MODS', true);

// Desactiva la depuración en producción
define('WP_DEBUG', false);
define('WP_DEBUG_LOG', false);
define('WP_DEBUG_DISPLAY', false);

// Cambia el prefijo de la base de datos (solo si instalas desde cero)
// $table_prefix = 'infrv_';  // en lugar de 'wp_'
```

---

## ✅ Paso 3 — Desactivar XML-RPC

XML-RPC es un endpoint antiguo que puede ser abusado para ataques de fuerza bruta.

**Opción A — En `functions.php` del tema (o en un plugin propio):**

```php
// Desactivar XML-RPC completamente
add_filter('xmlrpc_enabled', '__return_false');

// Eliminar el header que anuncia XML-RPC
add_filter('wp_headers', function($headers) {
    unset($headers['X-Pingback']);
    return $headers;
});
remove_action('wp_head', 'rsd_link');
remove_action('wp_head', 'wlwmanifest_link');
```

**Opción B — En `.htaccess` (más efectivo):**

```apache
# Bloquear XML-RPC
<Files xmlrpc.php>
  Order deny,allow
  Deny from all
</Files>
```

---

## ✅ Paso 4 — Restringir endpoints innecesarios de la API REST

Añade en `functions.php` del tema (o en un plugin):

```php
// Ocultar lista de usuarios de la API (evita enumeración)
add_filter('rest_endpoints', function($endpoints) {
    if (!current_user_can('administrator')) {
        unset($endpoints['/wp/v2/users']);
        unset($endpoints['/wp/v2/users/(?P<id>[\d]+)']);
    }
    return $endpoints;
});

// Requerir autenticación para modificar datos vía API
add_filter('rest_authentication_errors', function($result) {
    if (!empty($result)) return $result;
    // Solo bloquear métodos que modifiquen datos
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
        if (!is_user_logged_in()) {
            return new WP_Error(
                'rest_not_logged_in',
                'Solo usuarios autenticados pueden modificar datos.',
                ['status' => 401]
            );
        }
    }
    return $result;
});
```

---

## ✅ Paso 5 — Plugins recomendados

| Plugin | Función |
|---|---|
| **WPS Hide Login** | Cambia la URL de `/wp-login.php` a algo personalizado |
| **Wordfence Security** | Firewall WAF, escaneo de malware, 2FA |
| **WP 2FA** | Doble factor de autenticación para el panel |

**Instalación:** Panel WP → Plugins → Añadir nuevo → buscar por nombre.

---

## ✅ Paso 6 — Regenerar las claves API de WooCommerce

> ⚠️ Las claves actuales estuvieron expuestas en el bundle del navegador. Aunque ya hemos corregido el código, es buena práctica generar un nuevo par de claves.

1. Ve a **WooCommerce → Ajustes → Avanzado → API REST**
2. Localiza las claves actuales (`ck_690b...`)
3. Haz clic en **Revocar** para eliminarlas
4. Crea un nuevo par: **Añadir clave**
   - Descripción: `Frontend Next.js`
   - Usuario: tu usuario administrador
   - Permisos: **Lectura/Escritura**
5. Copia las nuevas claves y actualiza `.env.local`:
   ```
   WC_CONSUMER_KEY=ck_NUEVA_CLAVE
   WC_CONSUMER_SECRET=cs_NUEVO_SECRET
   ```
6. Reinicia el servidor Next.js

---

## ✅ Paso 7 — Habilitar 2FA (doble factor)

1. Instala **WP 2FA** o **Wordfence** (incluye 2FA)
2. Ve a **Usuarios → Tu perfil** y activa 2FA
3. Escanea el código QR con **Google Authenticator** o **Authy**

---

## 🧠 Resumen de prioridades

| Acción | Prioridad |
|---|---|
| Regenerar API keys WooCommerce | 🔴 URGENTE |
| Proteger wp-login.php por IP | 🔴 Alta |
| Desactivar XML-RPC | 🔴 Alta |
| Instalar Wordfence | 🔴 Alta |
| `DISALLOW_FILE_EDIT` en wp-config | 🟡 Media |
| Activar 2FA | 🟡 Media |
| Cambiar URL de login (WPS Hide Login) | 🟢 Recomendado |
