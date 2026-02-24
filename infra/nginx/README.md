# Nginx para web-telecom

`web-telecom.conf` esta preparado para:

- Servir la SPA exportada de Next.js.
- Hacer fallback a `index.html` para rutas cliente.
- Mantener `reportes-piolis` en `/reporte/` via proxy.

## Ajustes minimos

1. Cambiar `root` segun la ruta real del build `out/`.
2. Cambiar el host/puerto de `reportespiolis_upstream`.
3. Validar SSL/headers segun entorno.
