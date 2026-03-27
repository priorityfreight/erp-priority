# ERP Stable Version v13 Pre Customer PDF

Fecha: 2026-03-26

## Motivo del snapshot
- Antes de convertir la cotizacion comercial a PDF real.
- Antes de cambiar el enlace comercial para cliente.
- Antes de ajustar el documento para remover estatus y seguimiento comercial.

## Baseline preservado
- Flujo CRM <-> Pricing de cotizaciones
- `quotation_options` y costos por opcion
- `quotation_cargo_lines` para informacion de carga
- FX BANXICO y consolidacion contable en MXN
- Branding desde `assets/`
- Permisos y visibilidad por rol

## Riesgo controlado
- El documento HTML actual sigue existiendo como referencia.
- El cambio nuevo se enfoca en salida PDF real y presentacion comercial al cliente.
