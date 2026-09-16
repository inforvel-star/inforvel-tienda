# Flujo MVP - Catalog Unifier

1. Ingesta de proveedores
- MegaSur: JSON local (`storage/megasur/current.json`) o URL remota.
- DMI: API autenticada o JSON local fallback.

2. Normalización
- Unifica campos base (`ean`, `pn`, `brand`, `cost`, `stock`, `imagen`).
- Convierte números en formato ES/EN.

3. Deduplicación
- Cluster por EAN y/o PN.
- Si hay duplicado, gana el producto con **menor coste**.
- Si empatan, se prioriza: imagen válida, mayor stock, nombre más largo.

4. Categorías
- Reglas por proveedor (`config/category-map.json`).
- Reglas por keywords sobre nombre/descripcion.
- Fallback limpio para evitar categorías genéricas o rotas.

5. Atributos estandarizados
- Siempre incluye `Marca`, `EAN`, `PN`.
- Plantillas por familia (Portátiles, Ratones, Smartphones) con extracción regex.

6. Pricing
- Precio final = `coste * (1 + margen)` + `5€ envío`.
- Margen por defecto: 20%.
- Marca activa de la semana: 10%.

7. Persistencia y export
- Guarda staging y catálogo unificado en SQLite.
- Exporta `JSON` y `CSV` por ejecución.

8. Publicación (siguiente fase)
- Publicación controlada con modos:
  - `off`: no publica (default).
  - `simulate`: valida create/update/categorías sin escribir.
  - `apply`: publica en WooCommerce con límite configurable.
- Guarda plan/resultado en `publish_actions` y archivo `*-publish-plan.json`.
