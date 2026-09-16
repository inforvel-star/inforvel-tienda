# Desarrollo del plugin dmi-sync

Development-only package for the `dmi-sync` production plugin.

It adds title-first, high-confidence rules for the four regressions found in the
August 2026 catalog audit:

- Switch -> Switches
- Monitor -> Monitores PC
- Fuente de alimentación -> Fuentes de Alimentación
- Portátil real -> Portátiles

The rules run before provider family/subfamily, long-description inference and
fuzzy category matching. They intentionally contain negative cases for monitor
and laptop accessories.

## Verify in development

```bash
php wordpress-plugin/dmi-sync/tests/megasur-category-guardrails-test.php
php scripts/diagnose-megasur-category-guardrails.php /path/to/miscategorized_products.csv
```

`integration.patch` documents the integration points in the installed
plugin. It must not be applied to production until development review and an
explicit production authorization.

## Metadatos de compatibilidad para el configurador de PC

`includes/class-pc-compatibility-extractor.php` implementa, sin depender de la
interfaz visual del configurador:

- lectura del array anidado `specifications` de DMI;
- normalización de sockets, DDR, formatos, vatios y medidas en milímetros;
- tabla cerrada de sockets para los 37 procesadores DMI auditados;
- herencia secundaria desde un producto DMI enlazado;
- fallback por texto y detección de categorías incorrectas;
- prioridad por campo y protección total de `_iv_compat_source=manual`;
- persistencia detrás de la feature flag `iv_pc_compatibility_enabled`, cuyo
  valor por defecto es desactivado.
- allowlist defensiva `iv_pc_compatibility_enabled_components`; una lista vacía
  no procesa nada y la primera fase validada usa `["motherboard"]`.

El 29 de agosto de 2026 se desplegó el código en producción con la flag ausente
(`OFF`) y la allowlist vacía. No debe activarse hasta revisar el primer ciclo
nocturno completo. La activación inicial prevista es exclusivamente:

```bash
wp option update iv_pc_compatibility_enabled_components '["motherboard"]' --format=json
wp option update iv_pc_compatibility_enabled 1
```

Antes de ejecutar esos comandos hay que comprobar los informes
`production-post-cycle-audit-*.json`, confirmar cero errores nuevos y mantener
un procedimiento de reversión inmediata poniendo la flag a `0`.

### Verificación sin escrituras

```bash
php wordpress-plugin/dmi-sync/tests/pc-compatibility-extractor-test.php
php -d memory_limit=768M wordpress-plugin/dmi-sync/tools/dmi-compatibility-dry-run.php
php -d memory_limit=1024M wordpress-plugin/dmi-sync/tools/woocommerce-compatibility-dry-run.php
```

Los informes se guardan en `wordpress-plugin/dmi-sync/artifacts/`. Ambos dry-run
son de solo lectura. El segundo consulta el WooCommerce activo, pero no carga ni
instala el overlay de desarrollo y no ejecuta ninguna función de escritura.

No se debe copiar ni activar esta integración en producción hasta revisar los
informes, probar una copia de la base de datos y recibir autorización explícita.

Pendiente no bloqueante de infraestructura: instalar y verificar el agente de
backup externo de Piensa Solutions. El `mysqldump` local previo al resize no
sustituye una copia fuera del VPS.

No se eliminan ceros iniciales del EAN: forman parte válida de GTIN-14 y hacerlo
sin validar la longitud podría crear colisiones. El enlace por EAN puede
mejorarse después comparando variantes GTIN validadas, pero no forma parte de
esta primera activación y su cobertura observada es secundaria.
