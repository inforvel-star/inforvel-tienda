# Monitorizacion Continua (DEV)

## Objetivo
Detectar de forma temprana regresiones de seguridad, disponibilidad y negocio antes de subir cambios a produccion.

## Puerta obligatoria antes de desplegar en dev
Ejecutar desde `/var/www/frontend`:

```bash
npm run qa:gate:dev
```

Este gate ejecuta:
1. `typecheck`
2. `build`
3. regresion de seguridad critica
4. smoke funcional de APIs y cabeceras

## Alertas recomendadas (cada 1-5 min)
1. `GET /api/products?per_page=1` debe responder `200`.
2. `GET /api/refurbished` debe responder `200` y `products.length > 0`.
3. `GET /api/orders` sin autenticacion debe responder `401`.
4. `GET /api/points?customerId=1` sin autenticacion debe responder `401`.
5. `POST /api/points` sin `x-internal-token` debe responder `403`.
6. `GET /api/me?email=test@example.com` sin sesion debe responder `401`.
7. Cabeceras en respuestas: `Strict-Transport-Security` y `Content-Security-Policy`.
8. No exponer `X-Powered-By`.

## Operacion diaria
1. Validar estado de procesos:
```bash
runuser -u inforvel -- pm2 status
```
2. Revisar logs de desarrollo:
```bash
tail -n 200 /root/.pm2/logs/frontend-dev-error.log
tail -n 200 /root/.pm2/logs/frontend-dev-out.log
```
3. Ejecutar pruebas rapidas:
```bash
npm run qa:security:dev
npm run qa:smoke:dev
```

## Criterio de bloqueo
No desplegar en dev si falla cualquiera de estos puntos:
1. Build/typecheck fallan.
2. Un endpoint critico cambia su codigo de estado esperado.
3. `api/refurbished` vuelve a vacio.
4. Faltan cabeceras de seguridad o aparece `X-Powered-By`.
