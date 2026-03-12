# web-telecom

Monorepo Next.js para migrar `servicios-telecom` a una sola SPA, con excepcion de `reportes-piolis`.

## Objetivo

- Unificar las apps actuales (`portal`, `guardias`, `pedidos`, `monitor`) en una SPA Next.js.
- Mantener `reportes-piolis` fuera del monorepo y exponerlo via Nginx (`/reporte/`).
- Centralizar diseno en un design system compartido (`packages/tokens` y `packages/ui`).

## Estructura

```txt
apps/
  spa/                # Nueva aplicacion principal (Next.js App Router)
packages/
  tokens/             # Design tokens (CSS vars + TS)
  ui/                 # Componentes base reutilizables
infra/
  nginx/
    web-telecom.conf  # Config SPA + proxy a reportes
```

## Rutas objetivo

- `/` portal principal
- `/guardias/`
- `/pedidos/`
- `/monitor/`
- `/reporte/` (proxy al sistema legado)

## Design system

- Tokens de marca y tema claro/oscuro en `packages/tokens/src/tokens.css`.
- Primitivas visuales en `packages/ui/src/` (`Button`, `PortalShell`, `PortalHeader`, `ServiceCard`, `ModuleShell`).
- Las pantallas de `apps/spa` consumen estos componentes para mantener paridad visual con el portal original.

## Comandos

```bash
pnpm install
pnpm dev:spa
pnpm build:spa
pnpm typecheck
pnpm docker:build:spa
```

`pnpm dev:spa` publica el servidor en `0.0.0.0:3000` para acceso desde la red local.

## Nota de despliegue

La app `apps/spa` corre en modo servidor Next.js (App Router) para soportar features del portal como `/api/internos`.
`/api/internos` parsea `internos.xlsx` en el primer acceso y luego sirve resultados desde cache en memoria.

## Separacion de repos

Este repo queda dedicado a la SPA y su design system.

- `telecom-spa` (este repo): codigo y build de la SPA
- `telecom-reportespiolis`: servicio legacy de reportes
- `telecom-deploy`: compose + nginx + variables de entorno para despliegue

El deploy de stack ya no depende de `docker-compose.stack.yml` en este repo; se maneja desde `telecom-deploy` con build desde codigo fuente clonado en `sources/`.

## Seguridad

- No versionar `.env` en este repo.
- Las contraseñas de usuario se gestionan via variables de entorno (`USER_<NAME>_PASSWORD`) en `telecom-deploy/.env`.
- Los tokens de sesion se firman con `SESSION_SECRET` (generado automaticamente por `./setup`).
