# Stack Docker (Nginx + SPA + Reportes)

Este stack levanta:

- `nginx` (reverse proxy)
- `spa` (Portal + Deudores + Guardias + Pedidos)
- `reportespiolis`

Solo `nginx` publica puerto al host. `spa` y `reportespiolis` quedan accesibles solo dentro de la red Docker.

## 1) Variables de entorno

```bash
cp .env.stack.example .env
```

Opcional: cambiar puerto HTTPS.

Credenciales Basic Auth (Nginx) por defecto:

- usuario: `comu`
- password: `adminwiz`

Se pueden cambiar en `.env` con `BASIC_AUTH_USER` y `BASIC_AUTH_PASS`.
Luego aplica cambios con `docker compose -p webtelecom -f docker-compose.stack.yml up -d --build nginx`.

## 2) Levantar sin conflictos con otros compose

Usa un `project name` fijo para aislar nombres y red:

```bash
docker compose -p webtelecom -f docker-compose.stack.yml up -d --build
```

Para bajar:

```bash
docker compose -p webtelecom -f docker-compose.stack.yml down
```

## 3) Rutas

- Portal SPA: `https://HOST:WEB_HTTPS_PORT/`
- Reportes: `https://HOST:WEB_HTTPS_PORT/reporte/`

El Nginx del stack usa certificado autofirmado, por lo que el navegador mostrara advertencia de confianza.

## 4) Archivo internos.xlsx (opcional)

`spa` busca `INTERNALS_XLSX_PATH=/app/data/internos.xlsx`.

Si no existe, la app arranca igual con lista vacia.

Si quieres cargar internos reales, copia un archivo en el volumen `spa_data`
o agrega un bind mount en `docker-compose.stack.yml`.

## 5) Reportespiolis y carpeta compartida

El servicio `reportespiolis` usa un bind mount de solo lectura:

- `/mnt/compartido:/mnt/compartido:ro`

Si esa ruta no existe en el host, `/reporte/` mostrara estado sin reporte.
