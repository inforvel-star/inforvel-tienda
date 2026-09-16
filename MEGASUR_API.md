# MegaSur Sync y API

Este proyecto incluye una integración separada para MegaSur que no toca el catálogo actual de WooCommerce.

## Qué hace

- Descarga el feed de MegaSur.
- Solo reemplaza el catálogo activo cuando la respuesta es JSON válido.
- Mantiene únicamente dos snapshots persistentes:
  - `storage/megasur/current.json`
  - `storage/megasur/previous.json`
- Calcula diferencias entre ambos al vuelo:
  - productos añadidos
  - productos eliminados
  - productos modificados

## Script manual

```bash
cd /var/www/frontend
npm run megasur:sync
```

## Cron cada hora

```cron
0 * * * * cd /var/www/frontend && /usr/bin/npm run megasur:sync >> /var/www/frontend/logs/megasur-sync.log 2>&1
```

Si quieres proteger la sincronización manual por API, define:

```bash
MEGASUR_SYNC_TOKEN=tu_token_secreto
```

## Endpoints

### `GET /api/megasur/products`

Devuelve los productos extraídos del snapshot actual y ya normalizados.

Parámetros opcionales:

- `search`
- `limit`
- `offset`

Ejemplo:

```bash
curl "http://localhost:3000/api/megasur/products?search=hp&limit=20"
```

Cada producto devuelve, entre otros:

- `key`
- `referencia`
- `partNumber`
- `ean`
- `nombre`
- `fabricante`
- `familia`
- `subfamilia`
- `stock`
- `pvd`
- `pvp`
- `imagenes`
- `raw` con el registro original de MegaSur

### `GET /api/megasur/products/[key]`

Devuelve un producto concreto a partir de su `key`.

### `GET /api/megasur/changes`

Devuelve el diff entre `previous.json` y `current.json`.

### `POST /api/megasur/sync`

Fuerza una sincronización inmediata.

Si `MEGASUR_SYNC_TOKEN` está definido, enviar:

```bash
curl -X POST "http://localhost:3000/api/megasur/sync" \
  -H "Authorization: Bearer tu_token_secreto"
```

## Observación importante sobre MegaSur

En este momento el proveedor puede devolver un mensaje temporal como:

`Actualmente estamos procesando su solicitud...`

Cuando eso ocurre, el script falla sin sobrescribir `current.json`, para no perder el catálogo válido anterior.
