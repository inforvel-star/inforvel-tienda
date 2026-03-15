# E-commerce Inforvel - Frontend Headless

E-commerce profesional construido con Next.js 13, integrado con WooCommerce REST API y Stripe para pagos.

## 🚀 Características

- ✅ Frontend 100% independiente (headless)
- ✅ Integración completa con WooCommerce REST API
- ✅ Checkout propio con Stripe Elements
- ✅ Carrito persistente (localStorage + Zustand)
- ✅ Autenticación con Supabase
- ✅ Base de datos Supabase con RLS
- ✅ Diseño moderno y responsive
- ✅ SEO optimizado
- ✅ TypeScript

## 📦 Tecnologías

- **Framework**: Next.js 13 (App Router)
- **Estilos**: Tailwind CSS + shadcn/ui
- **Estado**: Zustand
- **Base de datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Pagos**: Stripe
- **API**: WooCommerce REST API

## 🛠️ Instalación

1. Clona el repositorio
```bash
git clone <tu-repo>
cd <nombre-proyecto>
```

2. Instala las dependencias
```bash
npm install
```

3. Configura las variables de entorno

Crea un archivo `.env` con:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key

# WooCommerce
NEXT_PUBLIC_WC_URL=https://tu-tienda.com
NEXT_PUBLIC_WC_CONSUMER_KEY=ck_tu_consumer_key
NEXT_PUBLIC_WC_CONSUMER_SECRET=cs_tu_consumer_secret

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_tu_key
STRIPE_SECRET_KEY=sk_test_tu_key
```

4. Ejecuta las migraciones de Supabase

Las migraciones ya están aplicadas. Si necesitas recrearlas, revisa:
```
supabase/migrations/20260314121104_create_ecommerce_tables.sql
```

5. Inicia el servidor de desarrollo
```bash
npm run dev
```

## 📁 Estructura del Proyecto

```
├── app/                      # Páginas de Next.js (App Router)
│   ├── carrito/             # Carrito de compras
│   ├── categoria/[slug]/    # Páginas de categorías dinámicas
│   ├── checkout/            # Proceso de pago
│   ├── confirmacion/        # Confirmación de pedido
│   ├── cuenta/              # Panel del usuario
│   ├── login/               # Inicio de sesión
│   ├── producto/[slug]/     # Páginas de productos dinámicas
│   ├── registro/            # Registro de usuario
│   └── tienda/              # Catálogo completo
├── components/
│   ├── checkout/            # Componentes de checkout
│   ├── layout/              # Header, Footer, MiniCart, SearchBar
│   ├── products/            # ProductCard, ProductGrid
│   └── ui/                  # Componentes UI (shadcn)
├── lib/
│   ├── store/               # Zustand store (carrito)
│   ├── supabase.ts          # Cliente de Supabase
│   ├── utils.ts             # Utilidades
│   └── woocommerce.ts       # API de WooCommerce
└── supabase/
    └── migrations/          # Migraciones de base de datos
```

## 🔑 Funcionalidades Principales

### Páginas

- **`/`** - Página de inicio con productos destacados
- **`/tienda`** - Catálogo completo con filtros
- **`/categoria/[slug]`** - Productos por categoría
- **`/producto/[slug]`** - Detalle del producto con galería
- **`/carrito`** - Carrito de compras
- **`/checkout`** - Proceso de pago con Stripe
- **`/confirmacion`** - Confirmación de pedido
- **`/login`** - Inicio de sesión
- **`/registro`** - Registro de usuario
- **`/cuenta`** - Panel del usuario con pedidos

### API de WooCommerce

Funciones disponibles en `lib/woocommerce.ts`:

- `getProducts()` - Obtener productos
- `getProduct(id)` - Obtener producto por ID
- `getProductBySlug(slug)` - Obtener producto por slug
- `getCategories()` - Obtener categorías
- `searchProducts(query)` - Buscar productos
- `createOrder(data)` - Crear pedido
- `getOrders(customerId)` - Obtener pedidos

### Base de Datos

Tablas de Supabase:

- **`user_profiles`** - Perfiles de usuario
- **`cart_items`** - Items del carrito
- **`saved_addresses`** - Direcciones guardadas

## 🎨 Personalización

### Colores

El tema principal usa azul (`blue-500`). Para cambiarlo, modifica:
- `tailwind.config.ts`
- Busca y reemplaza `blue-500` por tu color preferido

### Logo

Reemplaza el logo en:
- `components/layout/Header.tsx`
- `components/layout/Footer.tsx`

## 📝 Scripts

```bash
npm run dev          # Desarrollo
npm run build        # Compilar para producción
npm run start        # Iniciar servidor de producción
npm run lint         # Lint del código
npm run typecheck    # Verificar tipos TypeScript
```

## 🔒 Seguridad

- ✅ Row Level Security (RLS) en todas las tablas
- ✅ Autenticación segura con Supabase
- ✅ Pagos seguros con Stripe
- ✅ Variables de entorno para credenciales

## 🚀 Despliegue

### Vercel (Recomendado)

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno
3. Despliega

### Netlify

1. Configura el build command: `npm run build`
2. Configura el publish directory: `.next`
3. Añade las variables de entorno
4. Despliega

## 📄 Licencia

Este proyecto es de código abierto.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue o pull request.

## 📧 Contacto

Para soporte o consultas: tu@email.com

---

Desarrollado con ❤️ usando Next.js y WooCommerce
