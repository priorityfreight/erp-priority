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
  ('AIR', 'Paqueteria'),
  ('FCL', 'Contenedor de 40'),
  ('LCL', 'Consolidado'),
  ('FTL', 'Caja Seca de 53'),
  ('FTL', 'Arrastre de contenedor'),
  ('LTL', 'Consolidado'),
  ('COURIER', 'Courier')
on conflict (service_type, transport_type) do nothing;

insert into quotation_reference_counters (
  service_type,
  prefix,
  last_value
)
values
  ('AIR', 'QPRIAIR', 0),
  ('FCL', 'QPRIFCL', 0),
  ('LCL', 'QPRILCL', 0),
  ('FTL', 'QPRIFTL', 0),
  ('LTL', 'QPRILTL', 0),
  ('COURIER', 'QPRICOU', 0)
on conflict (service_type) do update
set prefix = excluded.prefix;

insert into quotation_rejection_reasons (
  reason
)
values
  ('Tarifa fuera de presupuesto'),
  ('Proveedor sin disponibilidad'),
  ('Cliente cancelo la solicitud'),
  ('Transit time no cumple'),
  ('Condiciones comerciales no aceptadas')
on conflict (reason) do nothing;

insert into incoterms (
  code,
  description
)
values
  ('EXW', 'Ex Works'),
  ('FCA', 'Free Carrier'),
  ('CPT', 'Carriage Paid To'),
  ('CIP', 'Carriage and Insurance Paid To'),
  ('DAP', 'Delivered at Place'),
  ('DPU', 'Delivered at Place Unloaded'),
  ('DDP', 'Delivered Duty Paid'),
  ('FAS', 'Free Alongside Ship'),
  ('FOB', 'Free On Board'),
  ('CFR', 'Cost and Freight'),
  ('CIF', 'Cost, Insurance and Freight')
on conflict (code) do update
set description = excluded.description;
