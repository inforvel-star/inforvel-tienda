# 📘 Manual de Despliegue - Hosting Compartido PiensaSolutions

## 🎯 Objetivo
Desplegar una tienda WooCommerce headless con Next.js en hosting compartido de PiensaSolutions.

---

## 📋 Requisitos Previos

- [x] Acceso a cPanel de tu hosting en PiensaSolutions
- [x] WordPress + WooCommerce ya instalado y funcionando
- [x] Acceso FTP o File Manager de cPanel
- [x] Node.js instalado en tu computadora local (para hacer el build)

---

## 🏗️ PARTE 1: CONFIGURAR BACKEND WORDPRESS

### Paso 1.1: Instalar Plugin JWT Authentication

1. Accede al **Admin de WordPress** (https://tudominio.com/wp-admin)
2. Ve a **Plugins > Añadir nuevo**
3. Busca: `JWT Authentication for WP-API`
4. Instala el plugin por **Younes Rafie**
5. **Activa** el plugin

### Paso 1.2: Configurar wp-config.php

1. Accede a **cPanel > File Manager**
2. Navega a la raíz de tu WordPress (donde está `wp-config.php`)
3. Click derecho en `wp-config.php` > **Edit**
4. **ANTES** de la línea `/* That's all, stop editing! */` añade:

```php
/* JWT Authentication */
define('JWT_AUTH_SECRET_KEY', 'tu-clave-super-secreta-cambiala-por-algo-unico-y-largo');
define('JWT_AUTH_CORS_ENABLE', true);
```

5. **Guarda** el archivo

> **⚠️ IMPORTANTE:** Cambia `tu-clave-super-secreta...` por una clave única. Puedes generarla aquí: https://api.wordpress.org/secret-key/1.1/salt/

### Paso 1.3: Configurar .htaccess

1. En **File Manager**, busca el archivo `.htaccess` en la raíz de WordPress
2. Click derecho > **Edit**
3. **DESPUÉS** de `RewriteEngine On`, añade estas líneas:

```apache
# BEGIN JWT Authentication
RewriteCond %{HTTP:Authorization} ^(.*)
RewriteRule ^(.*) - [E=HTTP_AUTHORIZATION:%1]

SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1
# END JWT Authentication
```

4. **Guarda** el archivo

### Paso 1.4: Crear Consumer Key y Secret de WooCommerce

1. En WordPress Admin, ve a **WooCommerce > Ajustes > Avanzado > REST API**
2. Click en **Añadir clave**
3. Configura:
   - **Descripción:** Frontend Next.js
   - **Usuario:** Tu usuario admin
   - **Permisos:** Lectura/Escritura
4. Click **Generar clave API**
5. **COPIA Y GUARDA ESTAS CLAVES** (no las podrás ver de nuevo):
   - Consumer key: `ck_xxxxxxxxxxxxxxxxxxxxx`
   - Consumer secret: `cs_xxxxxxxxxxxxxxxxxxxxx`

### Paso 1.5: Añadir Endpoints Personalizados

1. Accede a **cPanel > File Manager**
2. Navega a: `wp-content/themes/TU-TEMA-ACTIVO/`
3. Abre el archivo `functions.php`
4. **AL FINAL DEL ARCHIVO**, pega el siguiente código:

```php
<?php
// ============================================
// ENDPOINTS PERSONALIZADOS WOOCOMMERCE HEADLESS
// ============================================

// 1. ENDPOINT: Obtener carrito del usuario
add_action('rest_api_init', function () {
    register_rest_route('custom/v1', '/cart', array(
        'methods' => 'GET',
        'callback' => 'get_user_cart',
        'permission_callback' => function() {
            return is_user_logged_in();
        }
    ));
});

function get_user_cart() {
    $user_id = get_current_user_id();
    $cart = get_user_meta($user_id, '_wc_cart', true);

    if (empty($cart)) {
        return new WP_REST_Response(array('items' => array()), 200);
    }

    return new WP_REST_Response(array('items' => $cart), 200);
}

// 2. ENDPOINT: Actualizar carrito del usuario
add_action('rest_api_init', function () {
    register_rest_route('custom/v1', '/cart', array(
        'methods' => 'POST',
        'callback' => 'update_user_cart',
        'permission_callback' => function() {
            return is_user_logged_in();
        }
    ));
});

function update_user_cart($request) {
    $user_id = get_current_user_id();
    $cart_items = $request->get_json_params();

    if (!isset($cart_items['items'])) {
        return new WP_Error('invalid_data', 'Datos de carrito inválidos', array('status' => 400));
    }

    update_user_meta($user_id, '_wc_cart', $cart_items['items']);

    return new WP_REST_Response(array(
        'success' => true,
        'message' => 'Carrito actualizado correctamente'
    ), 200);
}

// 3. ENDPOINT: Vaciar carrito del usuario
add_action('rest_api_init', function () {
    register_rest_route('custom/v1', '/cart', array(
        'methods' => 'DELETE',
        'callback' => 'clear_user_cart',
        'permission_callback' => function() {
            return is_user_logged_in();
        }
    ));
});

function clear_user_cart() {
    $user_id = get_current_user_id();
    delete_user_meta($user_id, '_wc_cart');

    return new WP_REST_Response(array(
        'success' => true,
        'message' => 'Carrito vaciado correctamente'
    ), 200);
}

// 4. HABILITAR CORS para solicitudes desde el frontend
add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function($value) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce');
        return $value;
    });
}, 15);
```

5. **Guarda** el archivo

### Paso 1.6: Verificar que Todo Funciona

1. Abre tu navegador y visita:
   ```
   https://tudominio.com/wp-json/wc/v3/products
   ```
2. Deberías ver una lista de productos en formato JSON

✅ **BACKEND COMPLETADO**

---

## 🎨 PARTE 2: PREPARAR FRONTEND NEXT.JS

### Paso 2.1: Configurar Variables de Entorno

1. En tu computadora, abre el proyecto Next.js
2. Crea/edita el archivo `.env.local` en la raíz del proyecto:

```bash
# URL de tu WordPress/WooCommerce
NEXT_PUBLIC_WC_URL=https://tudominio.com

# Credenciales de WooCommerce (las que copiaste en Paso 1.4)
NEXT_PUBLIC_WC_CONSUMER_KEY=ck_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_WC_CONSUMER_SECRET=cs_xxxxxxxxxxxxxxxxxxxxx
```

3. **Reemplaza** los valores con tus datos reales

### Paso 2.2: Modificar next.config.js para Hosting Compartido

1. Abre `next.config.js`
2. Reemplaza todo el contenido con:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Habilita exportación estática
  images: {
    unoptimized: true, // Necesario para hosting compartido
  },
  trailingSlash: true, // Añade / al final de URLs
  // Remover basePath si tu sitio está en la raíz
  // Si está en una subcarpeta, usa: basePath: '/nombre-subcarpeta'
}

module.exports = nextConfig
```

### Paso 2.3: Actualizar Rutas Dinámicas

1. Abre `app/producto/[slug]/page.tsx`
2. Añade la función `generateStaticParams`:

```typescript
// Al inicio del archivo, después de los imports
export async function generateStaticParams() {
  try {
    const products = await fetch(
      `${process.env.NEXT_PUBLIC_WC_URL}/wp-json/wc/v3/products?per_page=100&consumer_key=${process.env.NEXT_PUBLIC_WC_CONSUMER_KEY}&consumer_secret=${process.env.NEXT_PUBLIC_WC_CONSUMER_SECRET}`
    ).then((res) => res.json());

    return products.map((product: any) => ({
      slug: product.slug,
    }));
  } catch (error) {
    console.error('Error generating params:', error);
    return [];
  }
}
```

3. Haz lo mismo para `app/categoria/[slug]/page.tsx`:

```typescript
export async function generateStaticParams() {
  try {
    const categories = await fetch(
      `${process.env.NEXT_PUBLIC_WC_URL}/wp-json/wc/v3/products/categories?per_page=100&consumer_key=${process.env.NEXT_PUBLIC_WC_CONSUMER_KEY}&consumer_secret=${process.env.NEXT_PUBLIC_WC_CONSUMER_SECRET}`
    ).then((res) => res.json());

    return categories.map((category: any) => ({
      slug: category.slug,
    }));
  } catch (error) {
    console.error('Error generating params:', error);
    return [];
  }
}
```

### Paso 2.4: Construir el Proyecto

1. Abre la terminal en la raíz de tu proyecto
2. Ejecuta:

```bash
npm run build
```

3. Espera a que termine (puede tardar 1-3 minutos)
4. Verifica que se creó la carpeta `out/` en tu proyecto

✅ **BUILD COMPLETADO**

---

## 🚀 PARTE 3: SUBIR FRONTEND AL HOSTING

### Paso 3.1: Preparar Estructura de Carpetas

Tu hosting debe verse así después:

```
public_html/
├── (archivos de WordPress existentes)
├── wp-admin/
├── wp-content/
├── wp-includes/
└── tienda/              ← Nueva carpeta para el frontend
    ├── _next/
    ├── categoria/
    ├── producto/
    ├── carrito/
    ├── checkout/
    ├── index.html
    └── ... (otros archivos del build)
```

### Paso 3.2: Subir Archivos por FTP

#### Opción A: Usando FileZilla (Recomendado)

1. Descarga **FileZilla** (https://filezilla-project.org/)
2. Abre FileZilla y conéctate:
   - **Host:** ftp.tudominio.com (o el que te dio PiensaSolutions)
   - **Usuario:** Tu usuario FTP
   - **Contraseña:** Tu contraseña FTP
   - **Puerto:** 21
3. En el panel derecho (servidor), navega a `public_html/`
4. Click derecho > **Crear directorio** > Nombre: `tienda`
5. Entra a la carpeta `tienda/`
6. En el panel izquierdo (tu PC), navega a la carpeta `out/` de tu proyecto
7. **Selecciona TODO** el contenido de `out/`
8. Arrastra los archivos al panel derecho (carpeta `tienda/` del servidor)
9. Espera a que termine la subida (puede tardar 5-15 minutos)

#### Opción B: Usando cPanel File Manager

1. Accede a **cPanel**
2. Abre **File Manager**
3. Navega a `public_html/`
4. Click en **+ Folder** > Nombre: `tienda` > Create
5. Entra a la carpeta `tienda/`
6. Click en **Upload**
7. En tu computadora, comprime la carpeta `out/` en un archivo ZIP
8. Arrastra el ZIP al uploader
9. Espera a que termine la subida
10. Regresa al File Manager
11. Click derecho en el archivo ZIP > **Extract**
12. Mueve todo el contenido de la carpeta extraída directamente a `tienda/`
13. Elimina el ZIP y la carpeta vacía

### Paso 3.3: Configurar Dominio/Subdominio

#### Opción A: Usar Subcarpeta (Más Simple)
Tu sitio estará en: `https://tudominio.com/tienda/`

✅ **Ya está listo**, no necesitas hacer nada más.

#### Opción B: Usar Subdominio (Profesional)
Tu sitio estará en: `https://tienda.tudominio.com`

1. En **cPanel**, busca **Subdominios**
2. Click **Crear subdominio**
3. Configurar:
   - **Subdominio:** tienda
   - **Document Root:** public_html/tienda
4. Click **Crear**
5. Espera 5-10 minutos a que propague el DNS

### Paso 3.4: Configurar SSL (HTTPS)

1. En **cPanel**, busca **SSL/TLS Status**
2. Selecciona tu dominio/subdominio
3. Click en **Run AutoSSL**
4. Espera a que instale el certificado (2-5 minutos)

### Paso 3.5: Forzar HTTPS

1. En **File Manager**, navega a `public_html/tienda/`
2. Crea un archivo `.htaccess` (si no existe)
3. Añade este contenido:

```apache
# Forzar HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Manejo de rutas Next.js
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L]
```

4. **Guarda** el archivo

---

## ✅ PARTE 4: VERIFICACIÓN Y PRUEBAS

### Paso 4.1: Verificar Frontend

1. Abre tu navegador
2. Visita: `https://tudominio.com/tienda/` (o `https://tienda.tudominio.com`)
3. Deberías ver la página principal de tu tienda

### Paso 4.2: Verificar Conexión con Backend

1. En la tienda, navega a **Tienda** o **Productos**
2. Deberías ver los productos de WooCommerce
3. Si no aparecen, abre **Consola del navegador** (F12)
4. Revisa si hay errores de CORS o conexión

### Paso 4.3: Probar Funcionalidades

✅ **Checklist de pruebas:**

- [ ] Productos se muestran correctamente
- [ ] Puedes ver detalles de un producto
- [ ] Puedes añadir productos al carrito
- [ ] El contador del carrito se actualiza
- [ ] Puedes ver el carrito completo
- [ ] Puedes registrarte
- [ ] Puedes iniciar sesión
- [ ] Después de login, el carrito se sincroniza
- [ ] Puedes ver categorías
- [ ] La búsqueda funciona
- [ ] El checkout muestra el formulario

---

## 🐛 SOLUCIÓN DE PROBLEMAS COMUNES

### Problema 1: "404 Not Found" en productos/categorías

**Solución:**
1. Verifica que subiste TODA la carpeta `out/` incluyendo subcarpetas
2. Verifica que el `.htaccess` esté en `public_html/tienda/`

### Problema 2: Productos no cargan (error CORS)

**Solución:**
1. Verifica que añadiste el código CORS en `functions.php`
2. Verifica que el plugin JWT esté activo
3. En WordPress, ve a **Ajustes > Enlaces permanentes** > Click **Guardar** (sin cambiar nada)

### Problema 3: "Failed to fetch" en llamadas API

**Solución:**
1. Verifica que las variables en `.env.local` sean correctas
2. Verifica que hiciste el build DESPUÉS de configurar `.env.local`
3. Vuelve a hacer `npm run build` y sube de nuevo

### Problema 4: Login no funciona

**Solución:**
1. Verifica que el plugin JWT esté instalado y activo
2. Verifica que añadiste `JWT_AUTH_SECRET_KEY` en `wp-config.php`
3. Verifica que modificaste `.htaccess` de WordPress
4. Prueba visitar: `https://tudominio.com/wp-json/jwt-auth/v1/token` (debería responder)

### Problema 5: Imágenes no cargan

**Solución:**
1. Verifica que en `next.config.js` añadiste `images: { unoptimized: true }`
2. Vuelve a hacer el build

### Problema 6: Estilos CSS no se aplican

**Solución:**
1. Limpia caché del navegador (Ctrl + Shift + Del)
2. Verifica que subiste la carpeta `_next/` completa
3. Revisa en la consola del navegador si hay errores 404

---

## 🔄 ACTUALIZAR EL SITIO

Cuando hagas cambios al código:

1. En tu computadora local, haz los cambios
2. Ejecuta: `npm run build`
3. Sube solo los archivos que cambiaron de la carpeta `out/`
4. Limpia caché del navegador

**⚡ Tip:** Para actualizar todo, elimina el contenido de `public_html/tienda/` y sube todo de nuevo.

---

## 📞 SOPORTE

Si tienes problemas:

1. Revisa la **Consola del navegador** (F12 > Console)
2. Revisa los **logs de error** en cPanel > Error Log
3. Verifica que tu hosting soporte:
   - PHP 7.4 o superior
   - MySQL 5.6 o superior
   - Soporte para .htaccess
   - Permisos de escritura en wp-content

---

## 🎉 ¡FELICIDADES!

Tu tienda WooCommerce headless está en producción. Ahora tienes:

✅ Backend robusto con WooCommerce
✅ Frontend moderno con Next.js
✅ Carrito persistente sincronizado
✅ Sistema de autenticación JWT
✅ Experiencia de usuario profesional

---

**Última actualización:** 2026-03-14
**Versión:** 1.0.0
