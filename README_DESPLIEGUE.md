# 🚀 Guía de Despliegue - Tienda WooCommerce Headless

## 📌 Resumen Ejecutivo

Tu proyecto es una **tienda online moderna** con:
- **Frontend:** Next.js 13 (React)
- **Backend:** WordPress + WooCommerce
- **Características:** Carrito profesional, login/registro, sincronización de carrito, checkout

---

## ⚠️ IMPORTANTE: Hosting Compartido vs Netlify

### 🏠 Tu Hosting Compartido (PiensaSolutions)

**Limitación crítica:** NO soporta Node.js

**Lo que necesitas saber:**
- ❌ No puedes subir Next.js directamente a hosting compartido
- ❌ Las páginas dinámicas requieren un servidor Node.js
- ✅ WordPress/WooCommerce SÍ funciona ahí (backend)

### ☁️ Solución: Arquitectura Híbrida

```
BACKEND (WordPress)          →  PiensaSolutions (ya lo tienes)
FRONTEND (Next.js)          →  Netlify/Vercel (GRATIS)
```

**Ventajas:**
- ✅ WordPress sigue en tu hosting actual
- ✅ Frontend en plataforma especializada (gratis)
- ✅ Mejor rendimiento
- ✅ SSL automático
- ✅ Deploy en minutos

---

## 📚 Manuales Disponibles

### 1️⃣ OPCIONES_HOSTING.md
**Léelo primero** para entender las opciones de despliegue.

### 2️⃣ MANUAL_DESPLIEGUE_NETLIFY.md ⭐ RECOMENDADO
**Manual completo paso a paso** para desplegar en Netlify (gratis).
- Tiempo: 30-45 minutos
- Dificultad: Baja
- Costo: $0

### 3️⃣ MANUAL_DESPLIEGUE_HOSTING_COMPARTIDO.md
Para hosting compartido, pero con limitaciones importantes.
- Tiempo: 1-2 horas
- Dificultad: Alta
- Limitaciones: Sin rutas dinámicas

### 4️⃣ COMANDOS_DESPLIEGUE.md
Comandos rápidos de referencia.

### 5️⃣ WOOCOMMERCE_ENDPOINTS.md
Código PHP para añadir a WordPress.

---

## 🎯 Pasos Rápidos (Netlify)

### Paso 1: Configurar WordPress (30 min)

```bash
1. Instalar plugin JWT Authentication
2. Editar wp-config.php
3. Editar .htaccess
4. Crear Consumer Key y Secret en WooCommerce
5. Añadir código de endpoints a functions.php
```

Ver detalles en: `MANUAL_DESPLIEGUE_NETLIFY.md` → Parte 1

### Paso 2: Deploy a Netlify (15 min)

```bash
# Instalar CLI
npm install -g netlify-cli

# Login
netlify login

# Configurar variables
# (edita .env con tus datos de WordPress)

# Deploy
netlify init
netlify deploy --prod
```

Ver detalles en: `MANUAL_DESPLIEGUE_NETLIFY.md` → Parte 2

### Paso 3: Configurar Dominio (10 min - opcional)

```bash
# Añadir subdominio
netlify domains:add tienda.tudominio.com

# Configurar DNS en cPanel
# (añadir registro CNAME)
```

Ver detalles en: `MANUAL_DESPLIEGUE_NETLIFY.md` → Parte 3

---

## 🏗️ Arquitectura Final

```
┌─────────────────────────────────────────────┐
│              USUARIOS                       │
└─────────────────┬───────────────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
┌──────────────────┐  ┌──────────────────┐
│  NETLIFY         │  │  PIENSASOLUTIONS │
│  (Frontend)      │◄─┤  (Backend)       │
│                  │  │                  │
│ ✅ Next.js       │  │ ✅ WordPress     │
│ ✅ UI/UX         │  │ ✅ WooCommerce   │
│ ✅ Carrito UI    │  │ ✅ MySQL         │
│ ✅ Login UI      │  │ ✅ Productos     │
│ ✅ SSL gratis    │  │ ✅ Pedidos       │
│ ✅ CDN global    │  │ ✅ Usuarios      │
│                  │  │ ✅ Pagos         │
│ $0/mes          │  │ Ya lo tienes    │
└──────────────────┘  └──────────────────┘
```

**URL Frontend:** https://tienda.tudominio.com
**URL Backend API:** https://tudominio.com/wp-json/wc/v3/
**Admin WordPress:** https://tudominio.com/wp-admin/

---

## ✅ Checklist de Implementación

### Backend (WordPress)
- [ ] Plugin JWT instalado y activo
- [ ] wp-config.php configurado con JWT_AUTH_SECRET_KEY
- [ ] .htaccess modificado para autorización
- [ ] Consumer Key y Secret generados
- [ ] Código de endpoints en functions.php
- [ ] CORS habilitado

### Frontend (Netlify)
- [ ] Variables de entorno configuradas (.env)
- [ ] Netlify CLI instalado
- [ ] Proyecto inicializado en Netlify
- [ ] Variables configuradas en Netlify
- [ ] Deploy exitoso
- [ ] Dominio personalizado configurado (opcional)
- [ ] SSL/HTTPS activo

### Pruebas
- [ ] Productos se muestran
- [ ] Categorías funcionan
- [ ] Páginas de producto funcionan
- [ ] Carrito añade productos
- [ ] Registro de usuarios funciona
- [ ] Login funciona
- [ ] Carrito se sincroniza al login
- [ ] Checkout muestra formulario
- [ ] SSL funciona (candado verde)

---

## 📊 Comparativa de Opciones

| Aspecto | Netlify | Hosting Compartido |
|---------|---------|-------------------|
| **Costo** | Gratis | Ya lo tienes |
| **Configuración** | 45 min | 2-3 horas |
| **Dificultad** | ⭐⭐ Fácil | ⭐⭐⭐⭐⭐ Difícil |
| **Node.js** | ✅ Sí | ❌ No |
| **Rutas dinámicas** | ✅ Funciona | ❌ No funciona |
| **SSL** | ✅ Automático | ⚠️ Manual |
| **CDN** | ✅ Incluido | ❌ No |
| **Performance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Mantenimiento** | Mínimo | Alto |
| **Actualizaciones** | 1 comando | FTP manual |

**Recomendación:** Netlify es la mejor opción para tu caso.

---

## 🔄 Flujo de Actualización

### Con Netlify:
```bash
# 1. Hacer cambios en el código
# 2. Deploy
netlify deploy --prod
# ✅ Listo en 2-3 minutos
```

### Con Git (automatizado):
```bash
git add .
git commit -m "Actualización"
git push
# ✅ Deploy automático
```

---

## 🐛 Solución de Problemas Comunes

### "Productos no cargan"
**Causa:** Variables de entorno incorrectas
**Solución:** Verificar `.env` y rebuild

### "CORS Error"
**Causa:** Código CORS no añadido en WordPress
**Solución:** Revisar `functions.php`

### "404 en /producto/algo"
**Causa:** Rutas dinámicas no funcionan en hosting compartido
**Solución:** Usar Netlify/Vercel

### "Login no funciona"
**Causa:** Plugin JWT no configurado
**Solución:** Verificar `wp-config.php` y `.htaccess`

---

## 💡 Preguntas Frecuentes

### ¿Puedo usar mi hosting compartido?
Sí, pero solo para WordPress (backend). El frontend debe ir en Netlify.

### ¿Netlify es realmente gratis?
Sí, para proyectos pequeños/medianos. Incluye 100GB bandwidth/mes.

### ¿Necesito saber programar?
No para el despliegue. Los manuales son paso a paso.

### ¿Qué pasa si supero los límites de Netlify?
Netlify te avisará. El plan Pro cuesta $19/mes.

### ¿Puedo usar mi dominio actual?
Sí, con un subdominio: tienda.tudominio.com

### ¿WordPress queda en mi hosting?
Sí, no necesitas moverlo. Solo añades código.

### ¿Los clientes verán diferencia?
No, será transparente. Tendrán mejor experiencia.

---

## 📞 Soporte

### Documentación:
- Netlify: https://docs.netlify.com
- Next.js: https://nextjs.org/docs
- WooCommerce: https://woocommerce.com/docs

### Comunidad:
- Netlify: https://answers.netlify.com
- Next.js: https://github.com/vercel/next.js/discussions

---

## 📈 Siguientes Pasos (Después del Deploy)

1. **Añadir productos** en WordPress
2. **Personalizar diseño** (colores, logos)
3. **Configurar métodos de pago** en WooCommerce
4. **Configurar envío** en WooCommerce
5. **SEO**: Meta descriptions, títulos
6. **Analytics**: Google Analytics, Facebook Pixel
7. **Marketing**: Email marketing, redes sociales

---

## 🎉 Resumen

**Mejor opción:** Netlify + WordPress (híbrido)

**Tiempo total:** 45-60 minutos

**Costo:** $0

**Resultado:** Tienda profesional, rápida y segura

---

**¡Empieza con MANUAL_DESPLIEGUE_NETLIFY.md!**

**Última actualización:** 2026-03-14
**Versión:** 1.0.0
