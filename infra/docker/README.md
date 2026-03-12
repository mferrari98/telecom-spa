# Stack Docker (Nginx + SPA + Reportes)

> **Nota:** El despliegue se gestiona desde el repositorio `telecom-deploy`.
> Este directorio (`infra/docker/`) es referencia historica.

El stack se levanta con:

```bash
# Desde telecom-deploy/
docker compose -p webtelecom up -d --build --remove-orphans
```

Servicios:

- `nginx` (reverse proxy, unico puerto publico)
- `spa` (Portal + Deudores + Guardias + Pedidos)
- `reportespiolis`

## Variables de entorno

Ver `telecom-deploy/.env.example` para las variables requeridas:

- `SESSION_SECRET` — secreto para tokens de sesion
- `USER_ADMIN_PASSWORD` — contraseña admin
- `USER_OPERADOR_PASSWORD` — contraseña operador
- `USER_SERVICOOP_PASSWORD` — contraseña servicoop

## Rutas

- Portal SPA: `https://HOST/`
- Reportes: `https://HOST/reporte/`

Nginx usa certificado autofirmado (advertencia de confianza en el navegador).

## Archivo internos.xlsx (opcional)

`spa` busca `INTERNALS_XLSX_PATH=/app/data/internos.xlsx`.

Si no existe, la app arranca con lista vacia. Se puede cargar desde la web:

- Iniciar sesion como admin
- Abrir `Busqueda internos`
- Usar `Cargar documento` y elegir un `.xlsx`

## Reportespiolis y carpeta compartida

El servicio `reportespiolis` usa un bind mount de solo lectura:

- `/mnt/compartido:/mnt/compartido:ro`

Si esa ruta no existe en el host, `/reporte/` mostrara estado sin reporte.
