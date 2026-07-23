# 📝 Cómo Modificar la Página Principal (Home)

## ✅ Cambios Realizados

He actualizado la página principal (`app/page.tsx`) para que tenga el diseño exacto del HTML que me compartiste.

### Lo que incluye ahora:

1. **Hero Section** - Banner principal con fondo negro y degradado azul/púrpura
2. **Servicios Especializados** - Grid con 6 servicios principales
3. **Cómo Funciona** - Proceso en 4 pasos
4. **Tienda** - Productos destacados de WooCommerce
5. **Por Qué Nos Eligen** - Ventajas y estadísticas
6. **Testimonios** - Reseñas de clientes
7. **CTA Final** - Llamada a la acción
8. **Footer** - Pie de página completo

---

## 🎨 Personalización

### 1. Cambiar Textos

Abre el archivo: `app/page.tsx`

#### Hero (líneas 98-108):
```typescript
<h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-4xl mx-auto mb-6 leading-tight">
  Tu solución tecnológica <br className="hidden md:block" />
  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
    rápida y profesional
  </span>
</h1>

<p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
  Expertos en reparación de dispositivos y venta de equipamiento premium.
  Solucionamos tus problemas hoy mismo.
</p>
```

#### Servicios (líneas 31-38):
```typescript
const services: Service[] = [
  { icon: 'smartphone', title: 'Reparación de móviles', description: 'Pantallas, baterías, cámaras y más' },
  { icon: 'laptop', title: 'Reparación de ordenadores', description: 'PC y portátiles. Hardware y software' },
  { icon: 'hard-drive', title: 'Instalación de SSD', description: 'Mejora el rendimiento de tu equipo' },
  { icon: 'package', title: 'Mantenimiento preventivo', description: 'Limpieza y optimización completa' },
  { icon: 'cpu', title: 'Montaje de equipos', description: 'PC gaming y workstation a medida' },
  { icon: 'zap', title: 'Recuperación de datos', description: 'Rescata tu información perdida' },
];
```

#### Testimonios (líneas 47-54):
```typescript
const testimonials: Testimonial[] = [
  { name: 'María García', text: 'Excelente servicio. Repararon mi portátil en menos de 24h. Muy profesionales.', rating: 5 },
  { name: 'Carlos Ruiz', text: 'Cambio de SSD increíble. Mi PC va 10 veces más rápido. 100% recomendable.', rating: 5 },
  // ... añade más testimonios aquí
];
```

### 2. Cambiar Colores

Los colores principales están en clases de Tailwind CSS:

- **Fondo negro:** `bg-black`
- **Texto blanco:** `text-white`
- **Gris oscuro:** `text-zinc-400` o `text-zinc-900`
- **Azul acento:** `text-blue-400`, `bg-blue-500`
- **Degradado:** `from-blue-400 via-indigo-400 to-purple-400`

Para cambiar el degradado del título (línea 100):
```typescript
<span className="text-transparent bg-clip-text bg-gradient-to-r from-NUEVO-COLOR via-NUEVO-COLOR to-NUEVO-COLOR">
  rápida y profesional
</span>
```

### 3. Cambiar Estadísticas (líneas 257-273):

```typescript
<div className="grid grid-cols-2 gap-6 text-center">
  <div className="p-4">
    <div className="text-4xl font-bold mb-2">99%</div>
    <div className="text-sm text-zinc-400">Reparaciones exitosas</div>
  </div>
  <div className="p-4">
    <div className="text-4xl font-bold mb-2">24h</div>
    <div className="text-sm text-zinc-400">Tiempo medio resolución</div>
  </div>
  {/* Cambia estos números y textos */}
</div>
```

### 4. Cambiar Número de Teléfono

Busca todas las apariciones de: `tel:+34652369650` y reemplaza con tu número.

Ubicaciones:
- Línea 111: Botón hero
- Línea 309: CTA final
- Línea 362: Footer

### 5. Cambiar Redes Sociales (líneas 332-336):

```typescript
<div className="flex gap-4 text-zinc-400">
  <a href="TU_URL_TWITTER" className="hover:text-white transition-colors"><Twitter className="w-5 h-5" /></a>
  <a href="TU_URL_INSTAGRAM" className="hover:text-white transition-colors"><Instagram className="w-5 h-5" /></a>
  <a href="TU_URL_LINKEDIN" className="hover:text-white transition-colors"><Linkedin className="w-5 h-5" /></a>
</div>
```

### 6. Modificar Productos Mostrados (línea 63):

```typescript
const data = await woocommerce.getProducts({ per_page: 8 });
```

Cambia `8` por el número de productos que quieras mostrar (4, 12, 16, etc.)

---

## 🎯 Estructura de Archivos

```
app/
├── page.tsx           ← PÁGINA PRINCIPAL (la que acabamos de cambiar)
├── layout.tsx         ← Layout general (header, footer común)
├── globals.css        ← Estilos globales y animaciones
├── tienda/
│   └── page.tsx       ← Página de tienda completa
├── producto/
│   └── [slug]/
│       └── page.tsx   ← Página individual de producto
└── carrito/
    └── page.tsx       ← Página del carrito
```

---

## 🔄 Ver los Cambios

### En desarrollo local:

```bash
npm run dev
```

Visita: http://localhost:3000

### Actualizar en Netlify:

```bash
npm run build
netlify deploy --prod
```

---

## 💡 Tips de Personalización

### Añadir un Nuevo Servicio:

En `app/page.tsx`, línea 31, añade:

```typescript
const services: Service[] = [
  // ... servicios existentes ...
  { icon: 'tu-icono', title: 'Nuevo Servicio', description: 'Descripción aquí' },
];
```

Iconos disponibles: `smartphone`, `laptop`, `hard-drive`, `package`, `cpu`, `zap`

### Cambiar el Orden de Secciones:

Las secciones están organizadas de arriba a abajo. Para reordenar, simplemente corta y pega los bloques `<section>...</section>`.

Por ejemplo, para poner "Testimonios" antes de "Tienda":
1. Localiza `{/* Testimonials */}` (línea 280)
2. Corta todo el bloque hasta `</section>`
3. Pégalo donde quieras

### Ocultar una Sección:

Comenta el bloque completo con `{/* */}`:

```typescript
{/*
<section id="testimonios" className="...">
  ...todo el contenido...
</section>
*/}
```

---

## 🐛 Problemas Comunes

### "Los productos no se cargan"
**Solución:** Verifica que las variables de entorno en `.env` sean correctas:
```
NEXT_PUBLIC_WC_URL=https://tudominio.com
NEXT_PUBLIC_WC_CONSUMER_KEY=ck_xxxxx
NEXT_PUBLIC_WC_CONSUMER_SECRET=cs_xxxxx
```

### "El diseño se ve diferente"
**Solución:** Limpia caché del navegador (Ctrl + Shift + R) o prueba en modo incógnito.

### "Los colores no son exactamente iguales"
**Solución:** Los colores están en las clases de Tailwind. Busca:
- `bg-zinc-900` (fondo gris muy oscuro)
- `border-zinc-800` (bordes grises)
- `text-zinc-400` (texto gris claro)

Y ajusta el número (100-900) para más claro o más oscuro.

---

## 📱 Responsive Design

El diseño ya es completamente responsive. Las clases que lo hacen posible:

- `sm:` - Pantallas pequeñas (640px+)
- `md:` - Pantallas medianas (768px+)
- `lg:` - Pantallas grandes (1024px+)

Ejemplo:
```typescript
className="text-5xl md:text-7xl"
```
Significa: texto de 5xl en móvil, 7xl en tablet/desktop.

---

## 🎨 Colores del Proyecto

| Color | Clase Tailwind | Uso |
|-------|----------------|-----|
| Negro puro | `bg-black` | Fondo principal |
| Gris muy oscuro | `bg-zinc-950` | Tarjetas |
| Gris oscuro | `bg-zinc-900` | Fondos alternos |
| Gris medio | `text-zinc-400` | Texto secundario |
| Blanco | `text-white` | Texto principal |
| Azul | `text-blue-400` | Acentos y enlaces |
| Verde | `text-green-400` | Estados positivos |
| Púrpura | `text-purple-400` | Degradados |

---

## 📚 Recursos Útiles

- **Tailwind CSS:** https://tailwindcss.com/docs
- **Lucide Icons:** https://lucide.dev/icons
- **Next.js:** https://nextjs.org/docs

---

## ✅ Checklist de Personalización

- [ ] Cambié el título principal
- [ ] Actualicé la descripción
- [ ] Modifiqué los servicios
- [ ] Cambié el número de teléfono
- [ ] Actualicé las redes sociales
- [ ] Personalicé las estadísticas
- [ ] Añadí testimonios reales
- [ ] Ajusté los colores a mi marca
- [ ] Probé en móvil y desktop
- [ ] Hice build y deploy

---

**¡Tu página principal está lista! Ahora puedes personalizarla como quieras.**

Si necesitas ayuda con algo específico, consulta este documento o la documentación de Tailwind CSS.

**Última actualización:** 2026-03-14
