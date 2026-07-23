# 🚀 Manual de Despliegue - Netlify (RECOMENDADO)

## ✨ Por qué Netlify

- ✅ **100% GRATUITO** para tu tienda
- ✅ Configuración en 15 minutos
- ✅ Soporte completo para Next.js
- ✅ SSL/HTTPS automático
- ✅ Deploy con un solo comando
- ✅ No necesitas conocimientos técnicos avanzados

---

## 📋 PARTE 1: CONFIGURAR BACKEND WORDPRESS

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

> **⚠️ IMPORTANTE:** Genera una clave segura aquí: https://api.wordpress.org/secret-key/1.1/salt/

### Paso 1.3: Configurar .htaccess

1. En **File Manager**, busca el archivo `.htaccess` en la raíz de WordPress
2. Click derecho > **Edit**
3. **DESPUÉS** de `RewriteEngine On`, añade:

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
   - **Descripción:** Frontend Netlify
   - **Usuario:** Tu usuario admin
   - **Permisos:** Lectura/Escritura
4. Click **Generar clave API**
5. **COPIA Y GUARDA ESTAS CLAVES** (no las podrás ver de nuevo):
   ```
   Consumer key: ck_xxxxxxxxxxxxxxxxxxxxx
   Consumer secret: cs_xxxxxxxxxxxxxxxxxxxxx
   ```

### Paso 1.5: Añadir Endpoints Personalizados

1. Accede a **cPanel > File Manager**
2. Navega a: `wp-content/themes/TU-TEMA-ACTIVO/`
3. Abre el archivo `functions.php`
4. **AL FINAL DEL ARCHIVO**, pega este código:

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

✅ **BACKEND WORDPRESS COMPLETADO**

---

## 🎨 PARTE 2: DESPLEGAR FRONTEND EN NETLIFY

### Paso 2.1: Instalar Netlify CLI

Abre tu terminal y ejecuta:

```bash
npm install -g netlify-cli
```

### Paso 2.2: Login en Netlify

```bash
netlify login
```

Se abrirá tu navegador. **Inicia sesión** con:
- GitHub
- GitLab
- Bitbucket
- O Email

### Paso 2.3: Configurar Variables de Entorno

En tu proyecto, crea/edita el archivo `.env`:

```bash
NEXT_PUBLIC_WC_URL=https://tudominio.com
NEXT_PUBLIC_WC_CONSUMER_KEY=ck_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_WC_CONSUMER_SECRET=cs_xxxxxxxxxxxxxxxxxxxxx
```

Reemplaza con tus datos reales de WordPress/WooCommerce.

### Paso 2.4: Inicializar Proyecto en Netlify

Desde la raíz de tu proyecto:

```bash
netlify init
```

Responde las preguntas:

```
? What would you like to do?
  ❯ Create & configure a new site

? Team:
  ❯ Tu nombre/cuenta

? Site name (optional):
  ❯ mi-tienda-inforvel  (o el nombre que quieras)

? Your build command (hugo build/yarn run build/etc):
  ❯ npm run build

? Directory to deploy (blank for current dir):
  ❯ .next
```

### Paso 2.5: Configurar Variables en Netlify

```bash
# Añadir las 3 variables de entorno
netlify env:set NEXT_PUBLIC_WC_URL "https://tudominio.com"
netlify env:set NEXT_PUBLIC_WC_CONSUMER_KEY "ck_xxxxxxxxxxxxxxxxxxxxx"
netlify env:set NEXT_PUBLIC_WC_CONSUMER_SECRET "cs_xxxxxxxxxxxxxxxxxxxxx"
```

### Paso 2.6: Deploy a Producción

```bash
netlify deploy --prod
```

Espera 2-5 minutos mientras Netlify:
- 📦 Instala dependencias
- 🏗️ Construye el proyecto
- 🚀 Despliega en su CDN global

### Paso 2.7: Obtener URL del Sitio

Al terminar, verás:

```
✔ Deploy is live!

Website URL:       https://mi-tienda-inforvel.netlify.app
```

✅ **¡FRONTEND DESPLEGADO!**

---

## 🌐 PARTE 3: CONFIGURAR DOMINIO PERSONALIZADO (OPCIONAL)

### Opción A: Usar Subdominio (Recomendado)

Tu tienda estará en: `https://tienda.tudominio.com`

#### Paso 3A.1: Añadir Dominio en Netlify

```bash
netlify domains:add tienda.tudominio.com
```

O en el dashboard:
1. Ve a https://app.netlify.com
2. Selecciona tu sitio
3. **Domain settings > Add custom domain**
4. Ingresa: `tienda.tudominio.com`

#### Paso 3A.2: Configurar DNS en PiensaSolutions

1. Accede a **cPanel > Zone Editor**
2. Busca tu dominio
3. Click en **+ Add Record**
4. Añade un registro **CNAME**:
   ```
   Type: CNAME
   Name: tienda
   CNAME: tu-sitio.netlify.app
   TTL: 3600
   ```
5. **Guardar**

Espera 5-30 minutos a que propague el DNS.

#### Paso 3A.3: Habilitar HTTPS en Netlify

Netlify lo hace automáticamente. En 1-2 minutos tendrás SSL activo.

### Opción B: Usar Dominio Principal

Tu tienda estará en: `https://tudominio.com`

⚠️ **CUIDADO**: Esto reemplazará tu sitio WordPress principal.

**Mejor mantener WordPress en el dominio principal y usar subdominio para la tienda.**

---

## ✅ PARTE 4: VERIFICACIÓN Y PRUEBAS

### Paso 4.1: Verificar Frontend

Visita tu sitio:
- Netlify: `https://mi-tienda-inforvel.netlify.app`
- O tu dominio: `https://tienda.tudominio.com`

Deberías ver la página principal de tu tienda.

### Paso 4.2: Verificar Funcionalidades

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
- [ ] SSL/HTTPS funciona (candado verde)

### Paso 4.3: Monitoreo

Ve al dashboard de Netlify:
- https://app.netlify.com
- **Builds**: Ver historial de deploys
- **Functions**: Logs de funciones
- **Analytics**: Tráfico y rendimiento

---

## 🔄 PARTE 5: ACTUALIZAR EL SITIO

Cuando hagas cambios al código:

```bash
# 1. Hacer cambios en tu código local

# 2. Deploy nuevamente
netlify deploy --prod

# Eso es todo. Netlify hará todo el proceso automáticamente.
```

### Deploy Automático con Git (Opcional pero Recomendado)

1. Sube tu código a GitHub/GitLab:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/tu-usuario/tu-repo.git
   git push -u origin main
   ```

2. Conecta Netlify con tu repositorio:
   - https://app.netlify.com
   - **Site settings > Build & deploy > Link repository**
   - Selecciona GitHub/GitLab
   - Selecciona tu repositorio

3. Ahora cada push automáticamente desplegará:
   ```bash
   git add .
   git commit -m "Actualización de productos"
   git push
   # ✅ Deploy automático
   ```

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Problema 1: Build falla

```bash
# Ver logs detallados
netlify build

# Si hay errores, revisa:
- Variables de entorno configuradas
- Dependencies en package.json
```

### Problema 2: Productos no cargan

1. Verifica variables en Netlify:
   ```bash
   netlify env:list
   ```

2. Revisa que WordPress esté accesible:
   ```bash
   curl https://tudominio.com/wp-json/wc/v3/products
   ```

### Problema 3: CORS Error

1. Verifica que añadiste el código CORS en `functions.php`
2. En WordPress, ve a **Ajustes > Enlaces permanentes** > Click **Guardar**

### Problema 4: SSL no funciona

Netlify lo hace automáticamente. Si no funciona:
1. Ve a dashboard > **Domain settings > HTTPS**
2. Click **Verify DNS configuration**
3. Espera 24 horas máximo

---

## 💰 LÍMITES DEL PLAN GRATUITO

Netlify Free incluye:

- ✅ **100 GB bandwidth/mes** (suficiente para miles de visitas)
- ✅ **300 build minutes/mes** (suficiente para ~300 deploys)
- ✅ **Sitios ilimitados**
- ✅ **SSL automático**
- ✅ **CDN global**
- ✅ **Rollbacks instantáneos**

Si superas los límites, Netlify te avisará. El plan Pro cuesta $19/mes.

---

## 📊 ARQUITECTURA FINAL

```
┌───────────────────────────────────────┐
│  NETLIFY (Frontend)                   │
│  https://tienda.tudominio.com         │
│  ✅ Next.js 13                        │
│  ✅ Carrito profesional               │
│  ✅ Login/Registro                    │
│  ✅ SSL automático                    │
│  ✅ CDN global                        │
│  ✅ GRATIS                            │
└──────────────┬────────────────────────┘
               │
               │ WooCommerce REST API
               │ + JWT Authentication
               │
               ▼
┌───────────────────────────────────────┐
│  PIENSASOLUTIONS (Backend)            │
│  https://tudominio.com                │
│  ✅ WordPress 6.x                     │
│  ✅ WooCommerce                       │
│  ✅ MySQL Database                    │
│  ✅ Productos, Pedidos, Usuarios      │
└───────────────────────────────────────┘
```

---

## 🎉 ¡FELICIDADES!

Tu tienda está en producción con:

✅ Frontend moderno en Netlify (gratis)
✅ Backend robusto con WooCommerce
✅ SSL/HTTPS en ambos
✅ Carrito sincronizado
✅ Autenticación JWT
✅ Deploy automático
✅ CDN global

---

## 📞 SOPORTE NETLIFY

- Documentación: https://docs.netlify.com
- Status: https://www.netlifystatus.com
- Comunidad: https://answers.netlify.com
- Soporte: support@netlify.com

---

**Tiempo total de implementación: 30-45 minutos**
**Última actualización:** 2026-03-14
