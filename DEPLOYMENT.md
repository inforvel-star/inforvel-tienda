# Guía de Despliegue

## 📋 Pre-requisitos

Antes de desplegar, asegúrate de tener:

1. ✅ Cuenta de Supabase con proyecto creado
2. ✅ Tienda WooCommerce configurada y accesible
3. ✅ Cuenta de Stripe (modo test o producción)
4. ✅ Las credenciales de API de cada servicio

## 🔧 Configuración

### 1. Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Copia la URL y la clave anónima desde: `Project Settings > API`
3. Ejecuta las migraciones:
   - Ve a `SQL Editor` en tu proyecto de Supabase
   - Copia el contenido de `supabase/migrations/20260314121104_create_ecommerce_tables.sql`
   - Pégalo y ejecuta

### 2. WooCommerce

1. En tu WordPress/WooCommerce, ve a: `WooCommerce > Settings > Advanced > REST API`
2. Haz clic en "Add key"
3. Configura:
   - Descripción: "Frontend Headless"
   - Usuario: Tu usuario admin
   - Permisos: Read/Write
4. Guarda y copia las claves generadas (Consumer Key y Consumer Secret)

### 3. Stripe

1. Crea una cuenta en [Stripe](https://stripe.com)
2. Ve a `Developers > API keys`
3. Copia:
   - Publishable key (pk_test_...)
   - Secret key (sk_test_...)

## 🚀 Despliegue en Vercel

### Paso 1: Preparar el repositorio

```bash
# Inicializa git si no lo has hecho
git init
git add .
git commit -m "Initial commit"

# Sube a GitHub/GitLab/Bitbucket
git remote add origin <tu-repo-url>
git push -u origin main
```

### Paso 2: Conectar con Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Haz clic en "Add New Project"
3. Importa tu repositorio
4. Configura las variables de entorno:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_WC_URL=https://tu-tienda.com
NEXT_PUBLIC_WC_CONSUMER_KEY=ck_xxxxxxxxxxxxx
NEXT_PUBLIC_WC_CONSUMER_SECRET=cs_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

5. Haz clic en "Deploy"

### Paso 3: Configurar dominio (Opcional)

1. En Vercel, ve a `Settings > Domains`
2. Añade tu dominio personalizado
3. Configura los DNS según las instrucciones

## 🌐 Despliegue en Netlify

### Paso 1: Preparar build

1. Asegúrate de que `netlify.toml` esté configurado:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### Paso 2: Desplegar

1. Ve a [netlify.com](https://netlify.com)
2. Haz clic en "Add new site"
3. Importa tu repositorio
4. Configura las variables de entorno (mismas que Vercel)
5. Deploy

## 🐳 Despliegue con Docker

### Crear Dockerfile

```dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

### Construir y ejecutar

```bash
# Build
docker build -t ecommerce-inforvel .

# Run
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=<tu-url> \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-key> \
  -e NEXT_PUBLIC_WC_URL=<tu-url> \
  -e NEXT_PUBLIC_WC_CONSUMER_KEY=<tu-key> \
  -e NEXT_PUBLIC_WC_CONSUMER_SECRET=<tu-secret> \
  -e NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<tu-key> \
  -e STRIPE_SECRET_KEY=<tu-key> \
  ecommerce-inforvel
```

## ✅ Verificación Post-Despliegue

Después de desplegar, verifica:

1. ✅ La página de inicio carga correctamente
2. ✅ Los productos se muestran desde WooCommerce
3. ✅ El buscador funciona
4. ✅ El carrito guarda productos
5. ✅ El login/registro funciona
6. ✅ El checkout con Stripe funciona (modo test)
7. ✅ Se crean pedidos en WooCommerce

## 🔒 Seguridad en Producción

### Antes de producción:

1. ✅ Cambia las claves de Stripe de test a live
2. ✅ Configura webhooks de Stripe
3. ✅ Habilita HTTPS en tu dominio
4. ✅ Configura políticas CORS en WooCommerce
5. ✅ Revisa las políticas RLS en Supabase
6. ✅ Configura rate limiting
7. ✅ Añade monitoreo de errores (Sentry)

### Variables de entorno de producción

Asegúrate de usar:
- `pk_live_...` para Stripe (no `pk_test_`)
- `sk_live_...` para Stripe (no `sk_test_`)
- URLs de producción (no localhost)

## 🐛 Troubleshooting

### Error: Cannot connect to WooCommerce

- Verifica que la URL de WooCommerce sea accesible públicamente
- Comprueba que las credenciales sean correctas
- Asegúrate de que SSL esté habilitado

### Error: Stripe payment fails

- Verifica las claves de Stripe
- Comprueba que el webhook esté configurado
- Revisa los logs en el dashboard de Stripe

### Error: Cannot authenticate users

- Verifica las credenciales de Supabase
- Comprueba que las migraciones se hayan ejecutado
- Revisa las políticas RLS

## 📊 Monitoreo

Configura monitoreo con:
- **Vercel Analytics** - Para métricas de rendimiento
- **Sentry** - Para tracking de errores
- **Google Analytics** - Para análisis de usuarios
- **Stripe Dashboard** - Para monitoreo de pagos

## 🔄 Actualizaciones

Para actualizar la aplicación:

```bash
git add .
git commit -m "Update: descripción del cambio"
git push origin main
```

Vercel/Netlify desplegará automáticamente los cambios.

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs en tu plataforma de hosting
2. Verifica las variables de entorno
3. Comprueba la consola del navegador
4. Revisa la documentación de cada servicio

---

¡Tu e-commerce está listo para producción! 🎉
