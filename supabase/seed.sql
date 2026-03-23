insert into roles (
  name,
  description
)
values
  ('Ventas', 'Commercial CRM and client ownership users'),
  ('Pricing', 'Provider and pricing users'),
  ('Operaciones', 'Operational shipment users'),
  ('Admin', 'ERP administrators')
on conflict (name) do update
set description = excluded.description;

insert into external_data_sources (
  code,
  name,
  provider,
  source_url,
  license,
  refresh_strategy
)
values (
  'unece_unlocode',
  'UN/LOCODE',
  'UNECE',
  'https://service.unece.org/trade/locode/{country}.htm',
  'UNECE public reference pages',
  'manual snapshot regeneration via scripts/import-unlocode.mjs'
)
on conflict (code) do update
set
  name = excluded.name,
  provider = excluded.provider,
  source_url = excluded.source_url,
  license = excluded.license,
  refresh_strategy = excluded.refresh_strategy;

insert into service_transport_types (
  service_type,
  transport_type
)
values
  ('Maritimo', 'LCL'),
  ('Terrestre', 'Caja de 53'),
  ('Aereo', 'Paqueteria'),
  ('Terrestre', 'Arrastre de contenedor')
on conflict (service_type, transport_type) do nothing;
