# Inforvel Unified Catalog Sync

Plugin único para sincronizar catálogo desde **DMI** y **MegaSur** evitando duplicados y categorías inconsistentes.

## Qué hace

- Sincroniza DMI cada 5 minutos (cron) para aproximar tiempo real.
- Sincroniza MegaSur 1 vez al día (hora configurable).
- Deduplica por SKU (actualiza si existe, crea si no existe).
- Normaliza categorías y subcategorías con un único motor.
- Permite crear categorías faltantes (opcional).
- Incluye ejecución manual desde admin y por REST.
- Usa lock para evitar corridas simultáneas.

## Instalación

1. Copia esta carpeta al WordPress de producción en `wp-content/plugins/inforvel-unified-catalog-sync`.
2. Activa el plugin.
3. Ve a `WooCommerce > Unified Catalog Sync`.
4. Configura URLs de feed de DMI y MegaSur.
5. Guarda y ejecuta una sincronización manual `DMI + MegaSur`.

## Migración recomendada

1. Desactiva plugins antiguos de sync (DMI / MegaSur) para evitar conflictos.
2. Mantén activo solo este plugin para catálogo.
3. Ejecuta sync manual inicial (all) fuera de hora punta.
4. Revisa 20-30 productos representativos y su categoría.

## Endpoint REST

`POST /wp-json/iv-unified-sync/v1/sync`

Body opcional:

```json
{ "source": "all" }
```

Valores válidos de `source`: `all`, `dmi`, `megasur`.

Requiere sesión con permisos `manage_woocommerce`.
