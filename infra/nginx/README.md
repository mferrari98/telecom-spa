# Nginx para web-telecom

> **Nota:** La configuracion de Nginx se gestiona desde el repositorio `telecom-deploy/nginx/`.
> Este directorio (`infra/nginx/`) es referencia historica.

La configuracion actual (`telecom-deploy/nginx/nginx.conf`) hace:

- TLS con certificado autofirmado (generado al arrancar el contenedor)
- Proxy reverso: `/` → `spa:3000`, `/reporte/` → `reportespiolis:3000`
- Healthcheck en `/healthz`
- Security headers (HSTS, CSP, X-Frame-Options, etc.)
- Rate limiting por zona (`general` y `api`)
- Cache de assets estaticos (`/_next/static/`)
