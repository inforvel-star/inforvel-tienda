# Catalog Unifier MVP (Bloques 1 + 2)

Servicio externo (aislado del front) para unificar catálogo de MegaSur + DMI, deduplicar por EAN/PN y preparar un catálogo único para WooCommerce.

## Objetivo de este MVP

- Estructura de carpetas y flujo de pipeline.
- Base de datos SQLite local con trazabilidad de ejecuciones.
- Ingesta de proveedores (MegaSur listo, DMI listo con credenciales o JSON local).
- Deduplicación por EAN/PN quedándose con el menor coste.
- Mapeo avanzado de categorías con auditoría de no-categorizados.
- Pricing según margen normal (20%) o margen semanal por marca (10%) + 5€ envío.
- Export a JSON y CSV listo para conectar a publicación.
- Publicación controlada a WooCommerce con modos `off`, `simulate`, `apply`.

## Estructura

- `catalog-unifier/src`: código del pipeline.
- `catalog-unifier/config`: reglas de categorías, atributos y rotación semanal.
- `catalog-unifier/db/schema.sql`: esquema SQLite.
- `catalog-unifier/storage`: base de datos local.
- `catalog-unifier/output`: export por ejecución.
- `catalog-unifier/docs/flow.md`: flujo funcional.

## Ejecución rápida

```bash
cd /var/www/frontend
node catalog-unifier/src/cli.js run --source=all --dry-run
```

## Segundo bloque: publicación controlada

Simulación segura (sin escribir en WooCommerce):

```bash
node catalog-unifier/src/cli.js run --source=all --dry-run --publish=simulate --publish-limit=200
```

Aplicación real (escritura en WooCommerce):

```bash
node catalog-unifier/src/cli.js run --source=all --apply --publish=apply --publish-limit=200
```

Scripts npm ya preparados:

- `npm run catalog:unifier:mvp`
- `npm run catalog:unifier:bootstrap:wp`
- `npm run catalog:unifier:simulate`
- `npm run catalog:unifier:publish`
- `npm run catalog:unifier:cron:run`
- `npm run catalog:unifier:health:48h`
- `npm run catalog:unifier:cron:install`

Bootstrap automático desde WordPress (rellena `.env` con DMI/WC cuando existen en `wp_options`):

```bash
npm run catalog:unifier:bootstrap:wp
```

Notas de seguridad:

- `--publish-limit` evita lanzar todo el catálogo de golpe.
- Si faltan credenciales WooCommerce, el publicador se salta y lo deja reportado.
- Por defecto `--publish=off`.

## Variables de entorno

Copia y ajusta:

```bash
cp catalog-unifier/.env.example catalog-unifier/.env
```

Mínimo recomendado para primer arranque:

- `MEGASUR_LOCAL_PATH=./storage/megasur/current.json`
- `DMI_*` opcional (si no se configura, DMI se omite en este MVP)

Para publicación controlada:

- `UNIFIER_WC_URL`
- `UNIFIER_WC_CONSUMER_KEY`
- `UNIFIER_WC_CONSUMER_SECRET`
- `UNIFIER_WC_CREATE_CATEGORIES=1|0`

Para robustez DMI:

- `DMI_CACHE_PATH` snapshot local de respaldo.
- `DMI_CACHE_MAX_AGE_MINUTES` uso preferente de caché reciente para evitar rate-limit.

Para control de almacenamiento (evitar saturación de VPS):

- `UNIFIER_DB_KEEP_RUNS` cuántas ejecuciones conservar en SQLite (por defecto `5`).
- `UNIFIER_OUTPUT_KEEP_RUNS` cuántos lotes de export conservar en `output/` (por defecto `5`).
- `UNIFIER_STORE_RAW_STAGING=0` evita guardar payload crudo gigante por producto en `staged_products`.
- `UNIFIER_STORE_RAW_UNIFIED_SOURCES=0` evita guardar fuentes crudas completas en `unified_products`.
- `UNIFIER_DB_VACUUM_ON_PRUNE=1` compacta la base tras purgar runs antiguos.
- `UNIFIER_EXPORT_PRETTY_JSON=0` genera JSON compacto (menos tamaño en disco).
- `UNIFIER_EXPORT_INCLUDE_RAW_JSON=0` evita incluir `raw/sources` gigantes en el JSON exportado.

## Resultado de cada ejecución

- Inserta corrida en `sync_runs`.
- Guarda productos normalizados en `staged_products`.
- Guarda catálogo consolidado en `unified_products`.
- Guarda atributos en `product_attributes`.
- Guarda acciones de publicación en `publish_actions`.
- Genera archivos de salida en `catalog-unifier/output/`.
- Ejecuta retención automática en DB y en `output/` según las variables `UNIFIER_*_KEEP_RUNS`.

## Cron controlado (dev)

Instala cron (2 corridas diarias en 06:10 y 18:10, hora del servidor):

```bash
npm run catalog:unifier:cron:install
```

Runner programado:

- `scripts/catalog-unifier-scheduled.sh`
- Protecciones: `flock` (sin solapes), `timeout` (90m), umbral minimo de disco (`MIN_FREE_MB`), limpieza de logs antiguos.
- Log diario: `logs/catalog-unifier/run-YYYY-MM-DD.log`

Revision operativa 48h:

```bash
npm run catalog:unifier:health:48h
```

Salida esperada: total de runs, ok/error, skips por lock o disco y uso actual de almacenamiento.
