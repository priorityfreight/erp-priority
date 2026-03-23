create table if not exists sales_accounting_concepts (
  id uuid primary key default gen_random_uuid(),
  concept text not null,
  service_type text not null,
  operation_type text not null,
  vat_rate numeric(5,2) not null default 16.00,
  sat_code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint sales_accounting_concepts_allowed_service_type
    check (service_type in ('GENERAL', 'AIR', 'FCL', 'LCL', 'FTL', 'LTL', 'COURIER')),
  constraint sales_accounting_concepts_allowed_operation_type
    check (operation_type in ('IMPORT', 'EXPORT')),
  constraint sales_accounting_concepts_vat_rate_range
    check (vat_rate >= 0 and vat_rate <= 100),
  constraint sales_accounting_concepts_unique unique (concept, service_type, operation_type, sat_code)
);

create index if not exists idx_sales_accounting_concepts_service_type
  on sales_accounting_concepts(service_type);
create index if not exists idx_sales_accounting_concepts_operation_type
  on sales_accounting_concepts(operation_type);
create index if not exists idx_sales_accounting_concepts_sat_code
  on sales_accounting_concepts(sat_code);

alter table sales_accounting_concepts enable row level security;
alter table sales_accounting_concepts force row level security;

drop policy if exists "active_select_sales_accounting_concepts" on sales_accounting_concepts;
create policy "active_select_sales_accounting_concepts"
on sales_accounting_concepts
for select
using (public.erp_is_authenticated_active_user());

drop policy if exists "admin_insert_sales_accounting_concepts" on sales_accounting_concepts;
create policy "admin_insert_sales_accounting_concepts"
on sales_accounting_concepts
for insert
with check (public.erp_is_admin());

drop policy if exists "admin_update_sales_accounting_concepts" on sales_accounting_concepts;
create policy "admin_update_sales_accounting_concepts"
on sales_accounting_concepts
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

drop policy if exists "admin_delete_sales_accounting_concepts" on sales_accounting_concepts;
create policy "admin_delete_sales_accounting_concepts"
on sales_accounting_concepts
for delete
using (public.erp_is_admin());

create or replace function create_sales_accounting_concept(
  p_concept text,
  p_service_type text,
  p_operation_type text,
  p_vat_rate numeric,
  p_sat_code text
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_record_id uuid;
begin
  insert into sales_accounting_concepts (
    concept,
    service_type,
    operation_type,
    vat_rate,
    sat_code
  )
  values (
    nullif(btrim(p_concept), ''),
    upper(nullif(btrim(p_service_type), '')),
    upper(nullif(btrim(p_operation_type), '')),
    coalesce(p_vat_rate, 0),
    upper(nullif(btrim(p_sat_code), ''))
  )
  returning id into new_record_id;

  return new_record_id;
end;
$$;

create or replace function update_sales_accounting_concept(
  p_id uuid,
  p_concept text,
  p_service_type text,
  p_operation_type text,
  p_vat_rate numeric,
  p_sat_code text
)
returns void
language plpgsql
security definer
as $$
begin
  update sales_accounting_concepts
  set
    concept = nullif(btrim(p_concept), ''),
    service_type = upper(nullif(btrim(p_service_type), '')),
    operation_type = upper(nullif(btrim(p_operation_type), '')),
    vat_rate = coalesce(p_vat_rate, 0),
    sat_code = upper(nullif(btrim(p_sat_code), ''))
  where id = p_id;
end;
$$;

create or replace function delete_sales_accounting_concept(
  p_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  delete from sales_accounting_concepts
  where id = p_id;
end;
$$;

create or replace view sales_accounting_concept_lookup_view as
select
  sac.id,
  sac.concept,
  sac.service_type,
  sac.operation_type,
  sac.vat_rate,
  sac.sat_code,
  sac.created_at,
  sac.updated_at
from sales_accounting_concepts sac
order by sac.service_type asc, sac.operation_type asc, sac.concept asc;

drop trigger if exists set_sales_accounting_concepts_updated_at on sales_accounting_concepts;
create trigger set_sales_accounting_concepts_updated_at
before update on sales_accounting_concepts
for each row
execute function set_updated_at();

drop trigger if exists audit_sales_accounting_concepts on sales_accounting_concepts;
create trigger audit_sales_accounting_concepts
after insert or update or delete on sales_accounting_concepts
for each row
execute function audit_trigger();
