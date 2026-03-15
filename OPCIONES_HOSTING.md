# 🌐 Opciones de Hosting para Tu Tienda Next.js + WooCommerce

## ⚠️ IMPORTANTE: Limitaciones de Hosting Compartido

**Next.js requiere Node.js** para funcionar correctamente con páginas dinámicas (productos, categorías).

El hosting compartido tradicional de PiensaSolutions **NO soporta Node.js**, solo PHP y archivos estáticos.

---

## 🎯 OPCIÓN 1: NETLIFY (✅ RECOMENDADO - GRATIS)

### Ventajas:
- ✅ **100% GRATIS** para proyectos pequeños/medianos
- ✅ Soporte completo para Next.js
- ✅ Deploy automático desde Git
- ✅ SSL/HTTPS incluido
- ✅ CDN global incluido
- ✅ Sin configuración complicada

### Pasos de Despliegue:

#### A. Preparación Local

```bash
# 1. Instalar Netlify CLI
npm install -g netlify-cli

# 2. Login en Netlify
netlify login
```

#### B. Configurar Variables de Entorno

Crea archivo `.env` en tu proyecto:

```bash
NEXT_PUBLIC_WC_URL=https://tudominio.com
NEXT_PUBLIC_WC_CONSUMER_KEY=ck_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_WC_CONSUMER_SECRET=cs_xxxxxxxxxxxxxxxxxxxxx
```

#### C. Deploy

```bash
# Desde la raíz de tu proyecto
netlify init

# Seguir las instrucciones:
# - Create & configure a new site
# - Team: Tu cuenta personal
# - Site name: mi-tienda-inforvel (o el que quieras)
# - Build command: npm run build
# - Deploy directory: .next

# Deploy a producción
netlify deploy --prod
```

#### D. Configurar Variables en Netlify Dashboard

1. Ve a: https://app.netlify.com
2. Selecciona tu sitio
3. **Site settings > Environment variables**
4. Añade las 3 variables del archivo `.env`

#### E. Verificar

```
Tu sitio estará en: https://mi-tienda-inforvel.netlify.app
```

### Conectar Dominio Propio (Opcional):

1. En Netlify Dashboard > **Domain settings**
2. **Add custom domain**
3. Ingresa: `tienda.tudominio.com`
4. Sigue instrucciones para configurar DNS en PiensaSolutions

---

## 🎯 OPCIÓN 2: VERCEL (✅ TAMBIÉN RECOMENDADO - GRATIS)

### Ventajas:
- ✅ **100% GRATIS** para uso personal
- ✅ Creado por los mismos desarrolladores de Next.js
- ✅ Mejor rendimiento para Next.js
- ✅ Deploy automático desde Git
- ✅ SSL/HTTPS incluido

### Pasos de Despliegue:

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel

# Seguir instrucciones:
# - Set up and deploy: Yes
# - Project name: mi-tienda-inforvel
# - Override settings: No

# 4. Deploy a producción
vercel --prod
```

### Configurar Variables:

```bash
# Desde la terminal
vercel env add NEXT_PUBLIC_WC_URL production
vercel env add NEXT_PUBLIC_WC_CONSUMER_KEY production
vercel env add NEXT_PUBLIC_WC_CONSUMER_SECRET production

# O en el dashboard: https://vercel.com
# Tu proyecto > Settings > Environment Variables
```

---

## 🎯 OPCIÓN 3: HOSTING COMPARTIDO PIENSASOLUTIONS (⚠️ LIMITADO)

### ⚠️ Limitaciones:
- ❌ NO soporta Node.js
- ❌ NO soporta rutas dinámicas (/producto/[slug])
- ❌ NO soporta SSR (Server Side Rendering)
- ✅ SOLO archivos estáticos HTML/CSS/JS

### Lo que SÍ puedes hacer:

Convertir el proyecto a **100% estático** (perderás funcionalidad):

```bash
# En next.config.js, añadir:
output: 'export'

# Crear páginas estáticas manualmente
npm run build
```

### Problemas que tendrás:

1. **Rutas dinámicas NO funcionarán**:
   - `/producto/[slug]` → Error 404
   - `/categoria/[slug]` → Error 404

2. **Login con JWT puede fallar** por CORS

3. **Carrito solo localStorage** (no se sincroniza al backend)

### Solución alternativa:

Usa solo estas páginas estáticas:
- `/` - Inicio
- `/tienda` - Catálogo completo
- `/carrito` - Ver carrito (solo localStorage)
- `/login` y `/registro` - Formularios

Y elimina:
- Páginas de producto individual
- Páginas de categoría

---

## 🎯 OPCIÓN 4: VPS CON NODE.JS

### Proveedores recomendados:
- **DigitalOcean** - Desde $6/mes
- **Linode/Akamai** - Desde $5/mes
- **Vultr** - Desde $5/mes
- **AWS Lightsail** - Desde $5/mes

### Requisitos:
- Conocimientos de SSH y terminal Linux
- Configurar Node.js, PM2, Nginx
- Gestionar certificados SSL

### Pasos generales:

```bash
# 1. Conectar al VPS
ssh root@tu-ip-vps

# 2. Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 3. Instalar PM2 (gestor de procesos)
npm install -g pm2

# 4. Clonar proyecto
git clone tu-repositorio.git
cd tu-proyecto

# 5. Instalar dependencias
npm install

# 6. Build
npm run build

# 7. Iniciar con PM2
pm2 start npm --name "tienda" -- start
pm2 startup
pm2 save

# 8. Configurar Nginx como proxy inverso
# ...configuración de nginx...
```

---

## 📊 COMPARATIVA DE OPCIONES

| Característica | Netlify | Vercel | Hosting Compartido | VPS |
|----------------|---------|--------|-------------------|-----|
| **Precio** | Gratis | Gratis | Ya lo tienes | $5-6/mes |
| **Dificultad** | ⭐ Fácil | ⭐ Fácil | ⭐⭐⭐⭐ Difícil | ⭐⭐⭐⭐⭐ Muy difícil |
| **Node.js** | ✅ | ✅ | ❌ | ✅ |
| **Rutas dinámicas** | ✅ | ✅ | ❌ | ✅ |
| **SSL/HTTPS** | ✅ Auto | ✅ Auto | ⚠️ Manual | ⚠️ Manual |
| **Deploy** | Automático | Automático | Manual (FTP) | Manual (SSH) |
| **Mantenimiento** | 0 | 0 | Bajo | Alto |

---

## 🎯 RECOMENDACIÓN FINAL

### Para tu caso (hosting compartido PiensaSolutions):

**MEJOR OPCIÓN: Netlify o Vercel (GRATIS)**

1. ✅ Mantén tu **WordPress en PiensaSolutions** (backend)
2. ✅ Despliega el **frontend Next.js en Netlify/Vercel** (gratis)
3. ✅ Todo funciona perfectamente
4. ✅ Sin costos adicionales
5. ✅ Deploy en 5 minutos

### Arquitectura recomendada:

```
┌─────────────────────────────────────┐
│  NETLIFY/VERCEL (Frontend)          │
│  https://tienda.tudominio.com       │
│  ✅ Next.js                          │
│  ✅ Rutas dinámicas                 │
│  ✅ SSL automático                  │
│  ✅ GRATIS                           │
└──────────────┬──────────────────────┘
               │
               │ API REST
               │
               ▼
┌─────────────────────────────────────┐
│  PIENSASOLUTIONS (Backend)          │
│  https://tudominio.com              │
│  ✅ WordPress + WooCommerce         │
│  ✅ Base de datos MySQL             │
│  ✅ Productos, pedidos, usuarios    │
│  ✅ Ya lo tienes pagado             │
└─────────────────────────────────────┘
```

---

## 📝 PRÓXIMOS PASOS

### Si eliges Netlify/Vercel:

1. **Sigue el manual**: `MANUAL_DESPLIEGUE_NETLIFY.md` (lo creo abajo)
2. **Tiempo estimado**: 15-20 minutos
3. **Dificultad**: Baja

### Si insistes en hosting compartido:

1. **Sigue el manual**: `MANUAL_DESPLIEGUE_HOSTING_COMPARTIDO.md`
2. **Tiempo estimado**: 1-2 horas
3. **Dificultad**: Alta
4. **Resultado**: Funcionalidad limitada

---

**Última actualización**: 2026-03-14
