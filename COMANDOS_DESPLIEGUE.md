# 🚀 Comandos Rápidos de Despliegue

## 📦 PASO 1: Preparar Build Local

```bash
# 1. Instalar dependencias (si aún no lo hiciste)
npm install

# 2. Configurar variables de entorno
# Edita .env.local con tus datos:
# - NEXT_PUBLIC_WC_URL=https://tudominio.com
# - NEXT_PUBLIC_WC_CONSUMER_KEY=ck_xxxxx
# - NEXT_PUBLIC_WC_CONSUMER_SECRET=cs_xxxxx

# 3. Crear el build estático
npm run build

# ✅ Se creará la carpeta "out/" con todos los archivos
```

## 📁 PASO 2: Estructura de Archivos Generados

Después del build, verás esta estructura en la carpeta `out/`:

```
out/
├── _next/
│   ├── static/
│   │   ├── chunks/
│   │   ├── css/
│   │   └── media/
│   └── ...
├── carrito/
│   └── index.html
├── categoria/
│   └── [categorias-dinamicas]/
├── checkout/
│   └── index.html
├── confirmacion/
│   └── index.html
├── cuenta/
│   └── index.html
├── login/
│   └── index.html
├── producto/
│   └── [productos-dinamicos]/
├── registro/
│   └── index.html
├── tienda/
│   └── index.html
├── 404.html
├── index.html
└── ... (otros archivos estáticos)
```

## 🌐 PASO 3: Subir al Hosting Compartido

### Usando FileZilla (Recomendado):

```
1. Conectar FTP:
   - Host: ftp.tudominio.com
   - Usuario: tu_usuario_ftp
   - Contraseña: tu_password_ftp
   - Puerto: 21

2. Crear carpeta:
   - Ir a: public_html/
   - Crear carpeta: tienda/

3. Subir archivos:
   - Seleccionar TODO el contenido de out/
   - Arrastrarlo a public_html/tienda/
   - Esperar a que termine (5-15 min)
```

### Usando cPanel File Manager:

```
1. Acceder a cPanel > File Manager
2. Ir a: public_html/
3. Crear carpeta "tienda"
4. Comprimir carpeta "out/" en ZIP
5. Subir ZIP a public_html/tienda/
6. Extraer ZIP
7. Mover todo el contenido a tienda/
8. Eliminar ZIP
```

## ✅ PASO 4: Verificar Instalación

```
✅ Visita: https://tudominio.com/tienda/
✅ Deberías ver la página principal
✅ Verifica que los productos cargan
✅ Prueba login y carrito
```

## 🔄 PASO 5: Actualizar el Sitio

Cuando hagas cambios al código:

```bash
# 1. En tu PC, hacer cambios al código

# 2. Reconstruir
npm run build

# 3. Reemplazar archivos en el servidor
# - Eliminar contenido de public_html/tienda/
# - Subir nuevo contenido de out/
# - Limpiar caché del navegador (Ctrl+Shift+Del)
```

## 🐛 Solución Rápida de Problemas

### Productos no cargan:
```bash
# Verificar en .env.local:
NEXT_PUBLIC_WC_URL=https://tudominio.com
NEXT_PUBLIC_WC_CONSUMER_KEY=ck_correcto
NEXT_PUBLIC_WC_CONSUMER_SECRET=cs_correcto

# Reconstruir:
npm run build
```

### 404 en rutas dinámicas:
```bash
# Verificar que subiste:
- Carpeta categoria/
- Carpeta producto/
- Archivo .htaccess
```

### Estilos no se aplican:
```bash
# Verificar que subiste:
- Carpeta _next/ completa
- Todos los archivos CSS

# Limpiar caché del navegador:
Ctrl + Shift + Del
```

## 📞 Checklist Final

Antes de decir "terminado", verifica:

- [ ] WordPress tiene el código de functions.php
- [ ] Plugin JWT instalado y activo
- [ ] wp-config.php tiene JWT_AUTH_SECRET_KEY
- [ ] .htaccess de WordPress modificado
- [ ] Consumer Key y Secret generados
- [ ] .env.local configurado correctamente
- [ ] Build ejecutado (npm run build)
- [ ] Carpeta out/ generada
- [ ] Archivos subidos a public_html/tienda/
- [ ] .htaccess en public_html/tienda/
- [ ] SSL/HTTPS habilitado
- [ ] Productos cargan correctamente
- [ ] Login funciona
- [ ] Carrito sincroniza

## 🎉 URLs Finales

Después del despliegue:

```
Frontend: https://tudominio.com/tienda/
Backend API: https://tudominio.com/wp-json/wc/v3/
WordPress Admin: https://tudominio.com/wp-admin/
```

## 💡 Tips Importantes

1. **SIEMPRE** haz el build DESPUÉS de modificar .env.local
2. **NUNCA** subas la carpeta node_modules al servidor
3. **SOLO** sube el contenido de la carpeta out/
4. **LIMPIA** caché del navegador después de actualizar
5. **VERIFICA** que .htaccess esté en tienda/
6. **REVISA** la consola del navegador (F12) si hay errores

---

**Tiempo estimado total: 30-45 minutos**

**¿Necesitas ayuda?** Revisa MANUAL_DESPLIEGUE_HOSTING_COMPARTIDO.md
