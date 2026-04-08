insert into public.sales_accounting_concepts (
  concept,
  service_type,
  operation_type,
  vat_rate,
  sat_code
)
values
  ('Origin Charges', 'GENERAL', 'IMPORT', 16.00, '78101900'),
  ('Transport Organization Services', 'GENERAL', 'IMPORT', 16.00, '78101800')
on conflict (concept, service_type, operation_type, sat_code) do update
set
  vat_rate = excluded.vat_rate;
