# 📚 Guía de Estructura del Proyecto Inforvel

Esta guía te ayudará a entender qué archivo modificar según lo que quieras cambiar en el proyecto.

---

## 📁 Estructura General

```
project/
├── app/                    # Páginas y rutas de Next.js
├── components/             # Componentes reutilizables
├── lib/                    # Utilidades y configuración
├── public/                 # Archivos estáticos
└── ...archivos de config
```

---

## 🎨 DISEÑO Y ESTILOS GLOBALES

### Para cambiar colores, fuentes y estilos globales:
**Archivo:** `app/globals.css`

**Qué contiene:**
- Variables de color CSS
- Estilos base de Tailwind
- Animaciones personalizadas (fade-in-up)
- Clase `.scrollbar-hide`

**Ejemplo de cambios comunes:**
```css
/* Cambiar colores del tema */
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  /* ...más variables */
}

/* Añadir nueva animación */
@keyframes slide-in {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
```

---

## 🏗️ LAYOUT Y ESTRUCTURA BASE

### Para cambiar header, footer o estructura general:
**Archivo:** `app/layout.tsx`

**Qué contiene:**
- Metadatos del sitio (título, descripción, OG tags)
- Estructura HTML base
- Header y Footer globales
- Tema oscuro aplicado (`dark` class)
- Fuente (Inter)

**Cuándo modificar:**
- Cambiar título del sitio en pestaña del navegador
- Modificar descripción para SEO
- Cambiar fuente del proyecto
- Añadir scripts globales (analytics, etc.)
- Cambiar tema (oscuro/claro)

---

## 🏠 PÁGINA PRINCIPAL (HOME)

### Para modificar la página de inicio:
**Archivo:** `app/page.tsx`

**Secciones que contiene:**
1. **Hero Section** (líneas 90-120)
   - Título principal
   - Descripción
   - Botones de acción (Solicitar reparación, Ver tienda)

2. **Servicios** (líneas 122-141)
   - Lista de 6 servicios
   - Modifica el array `services` (líneas 31-38)

3. **Cómo Funciona** (líneas 143-164)
   - 4 pasos del proceso
   - Modifica el array `steps` (líneas 40-45)

4. **Tienda** (líneas 166-212)
   - Productos destacados de WooCommerce
   - Cambia cantidad en `per_page: 8` (línea 63)

5. **Por Qué Nos Eligen** (líneas 214-278)
   - 3 ventajas principales
   - Estadísticas (99%, 24h, 5.0, +1k)

6. **Testimonios** (líneas 280-300)
   - Reseñas de clientes
   - Modifica el array `testimonials` (líneas 47-54)

7. **CTA Final** (líneas 302-318)
   - Llamada a la acción final

**Cambios comunes:**
```typescript
// Cambiar número de teléfono (aparece 2 veces)
<a href="tel:+34652369650">

// Añadir nuevo servicio
const services: Service[] = [
  // ...servicios existentes...
  { icon: 'nuevo-icono', title: 'Nuevo Servicio', description: 'Descripción' },
];

// Cambiar estadísticas (líneas 257-273)
<div className="text-4xl font-bold mb-2">99%</div>
<div className="text-sm text-zinc-400">Reparaciones exitosas</div>
```

---

## 🛍️ PÁGINA TIENDA

### Para modificar la tienda:
**Archivo:** `app/tienda/page.tsx`

**Qué contiene:**
- Grid de todos los productos
- Filtros laterales (precio, disponibilidad)
- Selector de ordenamiento

**Cambios comunes:**
```typescript
// Cambiar cantidad de productos mostrados
const products = await woocommerce.getProducts({ per_page: 24 });

// Añadir filtro de categoría
// Modificar sección <aside> (líneas 28-73)

// Cambiar opciones de ordenamiento
// Modificar <select> (líneas 81-86)
```

---

## 📝 PÁGINAS DE BLOG

### Lista de artículos:
**Archivo:** `app/blog/page.tsx`

**Qué contiene:**
- Grid de posts de WordPress
- Tarjetas con imagen, fecha, autor, extracto
- Carga automática desde WordPress API

**Cambios comunes:**
```typescript
// Cambiar cantidad de posts
const posts = await getPosts({ per_page: 12 });

// Cambiar diseño del grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
```

### Artículo individual:
**Archivo:** `app/blog/[slug]/page.tsx`

**Qué contiene:**
- Contenido completo del post
- Imagen destacada
- Metadatos (fecha, autor)
- Estilos de prose para contenido

**Cambios comunes:**
```typescript
// Cambiar estilos del contenido
<div className="prose prose-invert prose-lg ...">

// Modificar botón "Volver"
<Link href="/blog" className="...">
```

---

## 📦 PÁGINA DE PRODUCTO INDIVIDUAL

### Para modificar la vista de producto:
**Archivo:** `app/producto/[slug]/page.tsx`

**Qué contiene:**
- Imágenes del producto
- Información (precio, descripción, stock)
- Botón añadir al carrito
- Productos relacionados

---

## 🛒 CARRITO Y CHECKOUT

### Carrito de compras:
**Archivo:** `app/carrito/page.tsx`

**Qué contiene:**
- Lista de productos en carrito
- Resumen de precios
- Botones para continuar/limpiar

### Checkout:
**Archivo:** `app/checkout/page.tsx`

**Qué contiene:**
- Formulario de datos de envío
- Resumen del pedido
- Métodos de pago

---

## 👤 PÁGINAS DE USUARIO

### Login:
**Archivo:** `app/login/page.tsx`

### Registro:
**Archivo:** `app/registro/page.tsx`

### Cuenta:
**Archivo:** `app/cuenta/page.tsx`

---

## 🧩 COMPONENTES COMPARTIDOS

### Header (barra superior):
**Archivo:** `components/layout/Header.tsx`

**Qué contiene:**
- Logo
- Menú de navegación
- Buscador
- Carrito mini
- Enlaces a login/registro

**Cambios comunes:**
```typescript
// Añadir enlace al menú
<Link href="/nueva-pagina">Nueva Página</Link>

// Cambiar logo
<ShoppingBag className="w-4 h-4 text-white" />
```

### Footer (pie de página):
**Archivo:** `components/layout/Footer.tsx`

**Qué contiene:**
- Logo y descripción
- 4 columnas de enlaces:
  1. Servicios
  2. Tienda
  3. Empresa (incluye Blog)
  4. Legal
- Redes sociales
- Copyright

**Cambios comunes:**
```typescript
// Cambiar enlaces de redes sociales (líneas 27-35)
<a href="TU_URL" className="...">

// Añadir nueva columna
<div>
  <h4 className="font-medium mb-4">Nueva Sección</h4>
  <ul className="space-y-3 text-sm text-zinc-400">
    ...
  </ul>
</div>

// Cambiar número de teléfono (línea 90)
<a href="tel:+34652369650">
```

### Barra de búsqueda:
**Archivo:** `components/layout/SearchBar.tsx`

### Mini carrito (desplegable):
**Archivo:** `components/layout/MiniCart.tsx`

### Tarjeta de producto:
**Archivo:** `components/products/ProductCard.tsx`

**Qué contiene:**
- Imagen del producto
- Nombre y precio
- Badge de descuento (si aplica)
- Link al producto

**Cambios comunes:**
```typescript
// Cambiar diseño de la tarjeta
<div className="relative aspect-square ...">

// Añadir botón "Añadir al carrito" rápido
<Button>Añadir</Button>
```

### Grid de productos:
**Archivo:** `components/products/ProductGrid.tsx`

**Qué contiene:**
- Layout responsive de productos
- Usa ProductCard para cada item

---

## ⚙️ CONFIGURACIÓN Y UTILIDADES

### Integración WooCommerce:
**Archivo:** `lib/woocommerce.ts`

**Qué contiene:**
- Cliente de WooCommerce
- Funciones para obtener productos
- Funciones para obtener categorías
- Tipos TypeScript

**Cambios comunes:**
```typescript
// Cambiar credenciales (usa variables de entorno)
const WC_URL = process.env.NEXT_PUBLIC_WC_URL;

// Añadir nueva función
export async function getProductsByTag(tagId: number) {
  // ...
}
```

### Integración WordPress (Blog):
**Archivo:** `lib/wordpress.ts`

**Qué contiene:**
- Funciones para obtener posts
- Función para obtener post por slug
- Tipos TypeScript para posts

**Cambios comunes:**
```typescript
// Cambiar tiempo de revalidación
next: { revalidate: 60 } // segundos

// Añadir filtro por categoría
export async function getPostsByCategory(categoryId: number) {
  // ...
}
```

### Carrito (estado global):
**Archivo:** `lib/store/cartStore.ts`

**Qué contiene:**
- Store de Zustand para el carrito
- Funciones: addItem, removeItem, updateQuantity, clearCart
- Persistencia en localStorage

**Cambios comunes:**
```typescript
// Añadir nueva función al store
addCoupon: (code: string) => set((state) => ({
  coupon: code
})),
```

### Utilidades generales:
**Archivo:** `lib/utils.ts`

**Qué contiene:**
- Función `cn()` para combinar clases de Tailwind

---

## 🎯 COMPONENTES UI (shadcn/ui)

Todos los componentes de UI están en `components/ui/`:

- **button.tsx** - Botones con variantes
- **card.tsx** - Tarjetas
- **dialog.tsx** - Modales
- **input.tsx** - Campos de entrada
- **select.tsx** - Selectores
- **toast.tsx** - Notificaciones
- **badge.tsx** - Etiquetas
- **sheet.tsx** - Panel lateral
- **skeleton.tsx** - Loading skeleton

**Para modificar un botón en toda la web:**
```typescript
// Edita: components/ui/button.tsx
// Cambia las variantes o estilos base
```

---

## 🔧 ARCHIVOS DE CONFIGURACIÓN

### Variables de entorno:
**Archivo:** `.env`

```env
# WooCommerce
NEXT_PUBLIC_WC_URL=https://inforvel.online
NEXT_PUBLIC_WC_CONSUMER_KEY=ck_xxxxx
NEXT_PUBLIC_WC_CONSUMER_SECRET=cs_xxxxx
```

**Cuándo modificar:**
- Cambiar URL de la tienda
- Actualizar credenciales de WooCommerce
- Añadir nuevas API keys

### Configuración Next.js:
**Archivo:** `next.config.js`

**Cuándo modificar:**
- Añadir dominios de imágenes externas
- Configurar redirects
- Variables de entorno públicas

### Configuración Tailwind:
**Archivo:** `tailwind.config.ts`

**Cuándo modificar:**
- Añadir colores personalizados
- Extender tema
- Añadir plugins

### Configuración TypeScript:
**Archivo:** `tsconfig.json`

**Cuándo modificar:**
- Cambiar alias de imports (@/)
- Ajustar opciones del compilador

---

## 📋 CASOS DE USO COMUNES

### Quiero cambiar el logo:
1. Ir a `components/layout/Header.tsx`
2. Modificar líneas 18-23 (logo en header)
3. Ir a `components/layout/Footer.tsx`
4. Modificar líneas 17-22 (logo en footer)

### Quiero cambiar el color principal (azul):
1. Ir a `app/globals.css`
2. Cambiar variables CSS o buscar `blue-` en todos los archivos
3. Reemplazar con tu color preferido

### Quiero añadir una nueva página:
1. Crear `app/nueva-pagina/page.tsx`
2. Copiar estructura de otra página
3. Añadir enlace en `components/layout/Header.tsx`
4. Añadir enlace en `components/layout/Footer.tsx` (opcional)

### Quiero cambiar textos del home:
1. Ir a `app/page.tsx`
2. Buscar el texto que quieres cambiar
3. Modificar directamente

### Quiero añadir un servicio:
1. Ir a `app/page.tsx`
2. Buscar `const services` (línea 31)
3. Añadir objeto al array:
```typescript
{ icon: 'icon-name', title: 'Título', description: 'Descripción' }
```

### Quiero cambiar los testimonios:
1. Ir a `app/page.tsx`
2. Buscar `const testimonials` (línea 47)
3. Modificar array con nuevos testimonios

### Quiero cambiar el número de productos en la home:
1. Ir a `app/page.tsx`
2. Buscar `per_page: 8` (línea 63)
3. Cambiar el número

### Quiero modificar el footer:
1. Ir a `components/layout/Footer.tsx`
2. Modificar secciones entre líneas 15-111

### Quiero cambiar redes sociales:
1. **Footer:** `components/layout/Footer.tsx` (líneas 27-35)
2. Reemplazar `href="#"` con tus URLs

---

## 🗂️ RESUMEN RÁPIDO: ¿QUÉ ARCHIVO TOCO?

| Quiero cambiar... | Archivo |
|-------------------|---------|
| **Home completa** | `app/page.tsx` |
| **Servicios del home** | `app/page.tsx` (línea 31) |
| **Testimonios** | `app/page.tsx` (línea 47) |
| **Estadísticas** | `app/page.tsx` (líneas 257-273) |
| **Header/Menú** | `components/layout/Header.tsx` |
| **Footer** | `components/layout/Footer.tsx` |
| **Colores globales** | `app/globals.css` |
| **Logo** | `components/layout/Header.tsx` + `Footer.tsx` |
| **Página tienda** | `app/tienda/page.tsx` |
| **Blog (lista)** | `app/blog/page.tsx` |
| **Blog (artículo)** | `app/blog/[slug]/page.tsx` |
| **Producto individual** | `app/producto/[slug]/page.tsx` |
| **Carrito** | `app/carrito/page.tsx` |
| **Checkout** | `app/checkout/page.tsx` |
| **Login** | `app/login/page.tsx` |
| **Registro** | `app/registro/page.tsx` |
| **Mi cuenta** | `app/cuenta/page.tsx` |
| **Tarjeta de producto** | `components/products/ProductCard.tsx` |
| **WooCommerce config** | `lib/woocommerce.ts` |
| **WordPress config** | `lib/wordpress.ts` |
| **Estado del carrito** | `lib/store/cartStore.ts` |
| **Variables de entorno** | `.env` |
| **Metadatos SEO** | `app/layout.tsx` |

---

## 💡 TIPS DE DESARROLLO

### Buscar algo en todo el proyecto:
```bash
# Buscar texto
grep -r "texto a buscar" .

# Buscar en archivos específicos
grep -r "texto" --include="*.tsx" .
```

### Ver cambios en tiempo real:
```bash
npm run dev
# Abre http://localhost:3000
```

### Compilar para producción:
```bash
npm run build
```

### Desplegar a Netlify:
```bash
npm run build
netlify deploy --prod
```

---

## 🎨 COLORES DEL PROYECTO

| Color | Clase Tailwind | Uso |
|-------|----------------|-----|
| Negro puro | `bg-black` | Fondo principal |
| Gris muy oscuro | `bg-zinc-950` | Tarjetas |
| Gris oscuro | `bg-zinc-900` | Fondos alternos |
| Gris medio | `text-zinc-400` | Texto secundario |
| Gris claro | `border-zinc-800` | Bordes |
| Blanco | `text-white` | Texto principal |
| Azul | `text-blue-400`, `bg-blue-500` | Acentos, enlaces, CTA |
| Verde | `text-green-400` | Estados positivos |
| Púrpura | `text-purple-400` | Degradados |
| Rojo | `text-red-400` | Errores |

---

## 📞 SOPORTE

Si tienes dudas sobre qué archivo modificar:

1. Busca el texto que ves en pantalla usando `grep` o el buscador de tu editor
2. Revisa esta guía
3. Mira la estructura de carpetas

**Última actualización:** 2026-03-15

---

**Recuerda:** Siempre haz un backup antes de hacer cambios grandes y prueba en local con `npm run dev` antes de desplegar.
