# 📁 Estructura del Proyecto

## Vista General

```
inforvel-ecommerce/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Layout principal
│   ├── page.tsx                 # Página de inicio
│   ├── globals.css              # Estilos globales
│   ├── carrito/                 # Carrito de compras
│   ├── categoria/[slug]/        # Páginas dinámicas de categorías
│   ├── checkout/                # Proceso de pago
│   ├── confirmacion/            # Confirmación de pedido
│   ├── cuenta/                  # Panel del usuario
│   ├── login/                   # Inicio de sesión
│   ├── producto/[slug]/         # Páginas dinámicas de productos
│   ├── registro/                # Registro de usuario
│   └── tienda/                  # Catálogo completo
│
├── components/                   # Componentes React
│   ├── checkout/
│   │   └── CheckoutForm.tsx     # Formulario de checkout con Stripe
│   ├── layout/
│   │   ├── Header.tsx           # Cabecera con navegación
│   │   ├── Footer.tsx           # Pie de página
│   │   ├── MiniCart.tsx         # Carrito lateral
│   │   └── SearchBar.tsx        # Buscador con autocompletado
│   ├── products/
│   │   ├── ProductCard.tsx      # Tarjeta de producto
│   │   └── ProductGrid.tsx      # Grid de productos
│   └── ui/                      # Componentes UI (shadcn)
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── sheet.tsx
│       ├── skeleton.tsx
│       ├── sonner.tsx
│       ├── toast.tsx
│       └── toaster.tsx
│
├── hooks/
│   └── use-toast.ts             # Hook personalizado para toasts
│
├── lib/
│   ├── store/
│   │   └── cartStore.ts         # Store de Zustand para el carrito
│   ├── supabase.ts              # Cliente y tipos de Supabase
│   ├── utils.ts                 # Funciones de utilidad
│   └── woocommerce.ts           # Cliente y funciones de WooCommerce API
│
├── public/
│   └── placeholder.png          # Imagen placeholder
│
├── supabase/
│   └── migrations/
│       └── 20260314121104_create_ecommerce_tables.sql
│
├── .env.example                 # Ejemplo de variables de entorno
├── .eslintrc.json              # Configuración de ESLint
├── .gitignore                  # Archivos ignorados por Git
├── components.json             # Configuración de shadcn/ui
├── DEPLOYMENT.md               # Guía de despliegue
├── next.config.js              # Configuración de Next.js
├── package.json                # Dependencias del proyecto
├── postcss.config.js           # Configuración de PostCSS
├── README.md                   # Documentación principal
├── tailwind.config.ts          # Configuración de Tailwind CSS
└── tsconfig.json               # Configuración de TypeScript
```

## 📄 Archivos Clave

### Configuración

- **`next.config.js`** - Configuración de Next.js
- **`tailwind.config.ts`** - Tema y plugins de Tailwind
- **`tsconfig.json`** - Configuración de TypeScript
- **`.env`** - Variables de entorno (no incluido en repo)
- **`.env.example`** - Plantilla de variables de entorno

### Aplicación

- **`app/layout.tsx`** - Layout principal con Header y Footer
- **`app/page.tsx`** - Página de inicio con productos destacados
- **`lib/woocommerce.ts`** - Todas las funciones de API de WooCommerce
- **`lib/supabase.ts`** - Cliente de Supabase y tipos
- **`lib/store/cartStore.ts`** - Estado global del carrito

### Componentes

- **`Header.tsx`** - Navegación, buscador, mini carrito
- **`Footer.tsx`** - Enlaces y categorías
- **`ProductCard.tsx`** - Tarjeta individual de producto
- **`CheckoutForm.tsx`** - Formulario de pago con Stripe

## 🎯 Rutas de la Aplicación

### Rutas Públicas

| Ruta | Descripción |
|------|-------------|
| `/` | Página de inicio |
| `/tienda` | Catálogo completo |
| `/categoria/[slug]` | Productos por categoría |
| `/producto/[slug]` | Detalle del producto |
| `/carrito` | Carrito de compras |
| `/login` | Inicio de sesión |
| `/registro` | Registro de usuario |

### Rutas Protegidas

| Ruta | Descripción |
|------|-------------|
| `/checkout` | Proceso de pago |
| `/cuenta` | Panel del usuario |
| `/confirmacion` | Confirmación de pedido |

## 📊 Base de Datos (Supabase)

### Tablas

1. **`user_profiles`**
   - Perfiles de usuario vinculados a auth.users
   - Información personal y WooCommerce customer_id

2. **`cart_items`**
   - Items del carrito para usuarios y guests
   - Sincronización entre sesiones

3. **`saved_addresses`**
   - Direcciones de facturación y envío
   - Soporte para múltiples direcciones

## 🔌 Integraciones

### WooCommerce REST API

Endpoints usados:
- `GET /products` - Listar productos
- `GET /products/{id}` - Detalle de producto
- `GET /products/categories` - Listar categorías
- `POST /orders` - Crear pedido
- `GET /orders` - Listar pedidos

### Stripe API

- Stripe Elements para formulario de pago
- PaymentIntent API para procesar pagos
- Webhooks para confirmaciones

### Supabase

- Auth: Autenticación de usuarios
- Database: PostgreSQL con RLS
- Real-time: (Opcional) Para actualizaciones en vivo

## 📦 Dependencias Principales

```json
{
  "@stripe/stripe-js": "^8.9.0",
  "@stripe/react-stripe-js": "^5.6.1",
  "@supabase/supabase-js": "^2.58.0",
  "axios": "^1.13.6",
  "zustand": "^5.0.11",
  "next": "13.5.1",
  "react": "18.2.0",
  "tailwindcss": "3.3.3"
}
```

## 🎨 Sistema de Diseño

### Colores Principales

- **Primario**: Blue (#3b82f6)
- **Fondo**: Gris oscuro (#000000)
- **Superficie**: Gris (#0a0a0a)
- **Borde**: Gris claro (#1f1f1f)

### Tipografía

- **Fuente**: Inter (Google Fonts)
- **Pesos**: 400, 500, 600, 700

### Componentes UI

Basados en shadcn/ui:
- Buttons
- Inputs
- Cards
- Dialogs
- Sheets
- Toasts

## 📝 Notas de Desarrollo

### Estado del Carrito

El carrito usa Zustand con persistencia en localStorage:
- Se sincroniza automáticamente
- Sobrevive a recargas de página
- Se puede migrar a Supabase para multi-dispositivo

### Autenticación

La autenticación usa Supabase Auth:
- Email/password por defecto
- Soporte para OAuth (Google, GitHub, etc.)
- JWT tokens en httpOnly cookies

### Optimizaciones

- Next.js Image para imágenes optimizadas
- Lazy loading de productos
- Server Components donde es posible
- Client Components solo cuando necesario

---

Esta estructura está optimizada para escalabilidad y mantenibilidad.
