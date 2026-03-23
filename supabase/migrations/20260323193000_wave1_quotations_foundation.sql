create table if not exists quotation_rejection_reasons (
  id uuid primary key default gen_random_uuid(),
  reason text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists quotation_reference_counters (
  service_type text primary key,
  prefix text not null unique,
  last_value bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table quotation_reference_counters
drop constraint if exists quotation_reference_counters_allowed_service_type;

alter table quotation_reference_counters
add constraint quotation_reference_counters_allowed_service_type
check (service_type in ('AIR', 'FCL', 'LCL', 'FTL', 'LTL', 'COURIER'));

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

alter table quotations
  add column if not exists pricing_owner_id uuid references users(id),
  add column if not exists transport_type text,
  add column if not exists operation_type text,
  add column if not exists origin_unlocode text,
  add column if not exists origin_unlocode_id uuid references unlocodes(id),
  add column if not exists destination_unlocode text,
  add column if not exists destination_unlocode_id uuid references unlocodes(id),
  add column if not exists pickup_address text,
  add column if not exists delivery_address text,
  add column if not exists commodities text,
  add column if not exists quantity integer,
  add column if not exists required_quote_date date,
  add column if not exists purchase_valid_until date,
  add column if not exists sales_valid_until date,
  add column if not exists rejection_reason_id uuid references quotation_rejection_reasons(id),
  add column if not exists rejection_notes text,
  add column if not exists cancellation_notes text,
  add column if not exists target_rate numeric;

alter table quotations alter column status set default 'pendiente';

update quotations
set status = case
  when lower(coalesce(status, '')) = 'draft' then 'pendiente'
  when lower(coalesce(status, '')) = 'approved' then 'aceptada'
  when lower(coalesce(status, '')) in (
    'pendiente',
    'cotizando',
    'lista_para_enviar',
    'enviada',
    'cancelada',
    'rechazada',
    'renegociar_tarifa',
    'aceptada'
  ) then lower(status)
  else 'pendiente'
end;

alter table quotations
drop constraint if exists quotations_allowed_status;

alter table quotations
drop constraint if exists quotations_status_check;

alter table quotations
add constraint quotations_allowed_status
check (
  status in (
    'pendiente',
    'cotizando',
    'lista_para_enviar',
    'enviada',
    'cancelada',
    'rechazada',
    'renegociar_tarifa',
    'aceptada'
  )
);

create index if not exists idx_quotations_pricing_owner_id on quotations(pricing_owner_id);
create index if not exists idx_quotations_client_created_at on quotations(client_id, created_at desc);
create index if not exists idx_quotations_opportunity_created_at on quotations(opportunity_id, created_at desc);
create index if not exists idx_quotations_status_created_at on quotations(status, created_at desc);

alter table quotation_costs
  add column if not exists sales_accounting_concept_id uuid references sales_accounting_concepts(id),
  add column if not exists purchase_amount numeric,
  add column if not exists sale_amount numeric,
  add column if not exists profit_amount numeric,
  add column if not exists vat_rate numeric not null default 0;

create table if not exists quotation_cargo_lines (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations(id) on delete cascade,
  load_type text not null,
  piece_count integer,
  width numeric,
  length numeric,
  height numeric,
  weight numeric,
  freight_class text,
  cbm numeric,
  volumetric_weight_kg numeric,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_quotation_cargo_lines_quotation_id
  on quotation_cargo_lines(quotation_id);
create index if not exists idx_quotation_cargo_lines_quotation_sort_order
  on quotation_cargo_lines(quotation_id, sort_order asc);

alter table quotation_rejection_reasons enable row level security;
alter table quotation_rejection_reasons force row level security;
alter table quotation_cargo_lines enable row level security;
alter table quotation_cargo_lines force row level security;

drop policy if exists "active_select_quotation_rejection_reasons" on quotation_rejection_reasons;
drop policy if exists "active_insert_quotation_rejection_reasons" on quotation_rejection_reasons;
drop policy if exists "active_update_quotation_rejection_reasons" on quotation_rejection_reasons;
drop policy if exists "active_delete_quotation_rejection_reasons" on quotation_rejection_reasons;
drop policy if exists "active_select_quotation_cargo_lines" on quotation_cargo_lines;
drop policy if exists "active_insert_quotation_cargo_lines" on quotation_cargo_lines;
drop policy if exists "active_update_quotation_cargo_lines" on quotation_cargo_lines;
drop policy if exists "active_delete_quotation_cargo_lines" on quotation_cargo_lines;

create policy "active_select_quotation_rejection_reasons"
on quotation_rejection_reasons
for select
using (public.erp_is_authenticated_active_user());

create policy "active_insert_quotation_rejection_reasons"
on quotation_rejection_reasons
for insert
with check (public.erp_is_authenticated_active_user());

create policy "active_update_quotation_rejection_reasons"
on quotation_rejection_reasons
for update
using (public.erp_is_authenticated_active_user())
with check (public.erp_is_authenticated_active_user());

create policy "active_delete_quotation_rejection_reasons"
on quotation_rejection_reasons
for delete
using (public.erp_is_authenticated_active_user());

create policy "active_select_quotation_cargo_lines"
on quotation_cargo_lines
for select
using (public.erp_is_authenticated_active_user());

create policy "active_insert_quotation_cargo_lines"
on quotation_cargo_lines
for insert
with check (public.erp_is_authenticated_active_user());

create policy "active_update_quotation_cargo_lines"
on quotation_cargo_lines
for update
using (public.erp_is_authenticated_active_user())
with check (public.erp_is_authenticated_active_user());

create policy "active_delete_quotation_cargo_lines"
on quotation_cargo_lines
for delete
using (public.erp_is_authenticated_active_user());

create or replace function next_quotation_reference(
  p_service_type text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_service_type text;
  resolved_prefix text;
  next_value bigint;
begin
  normalized_service_type := upper(btrim(coalesce(p_service_type, '')));

  update quotation_reference_counters
  set
    last_value = last_value + 1,
    updated_at = now()
  where service_type = normalized_service_type
  returning prefix, last_value
  into resolved_prefix, next_value;

  if resolved_prefix is null then
    raise exception 'Unsupported quotation service type: %', p_service_type;
  end if;

  return resolved_prefix || '-' || lpad(next_value::text, 6, '0');
end;
$$;

create or replace function recalculate_quotation_totals(
  p_quotation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total_purchase numeric;
  total_sale numeric;
  total_profit numeric;
begin
  select
    coalesce(sum(coalesce(qc.purchase_amount, qc.cost, 0)), 0),
    coalesce(sum(coalesce(qc.sale_amount, 0)), 0),
    coalesce(sum(coalesce(qc.profit_amount, coalesce(qc.sale_amount, 0) - coalesce(qc.purchase_amount, qc.cost, 0))), 0)
  into total_purchase, total_sale, total_profit
  from quotation_costs qc
  where qc.quotation_id = p_quotation_id;

  update quotations
  set
    estimated_cost = total_purchase,
    estimated_price = case when total_sale = 0 then null else total_sale end,
    expected_profit = case when total_sale = 0 and total_purchase = 0 then null else total_profit end
  where id = p_quotation_id;
end;
$$;

create or replace function create_quotation_from_opportunity(
  p_opportunity_id uuid,
  p_pickup_address text default null,
  p_delivery_address text default null,
  p_commodities text default null,
  p_required_quote_date date default null,
  p_purchase_valid_until date default null,
  p_sales_valid_until date default null,
  p_quantity integer default null,
  p_weight numeric default null,
  p_volume numeric default null,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_quotation_id uuid;
  opportunity_row opportunities%rowtype;
  resolved_created_by uuid;
begin
  perform sync_expired_opportunities();

  select *
  into opportunity_row
  from opportunities
  where id = p_opportunity_id;

  if not found then
    raise exception 'Opportunity % not found', p_opportunity_id;
  end if;

  if nullif(btrim(coalesce(opportunity_row.service_type, '')), '') is null then
    raise exception 'Opportunity % must define a service type before quoting', p_opportunity_id;
  end if;

  resolved_created_by := coalesce(p_created_by, erp_current_user_id(), opportunity_row.salesperson_id);

  insert into quotations (
    client_id,
    opportunity_id,
    created_by,
    status,
    service_type,
    transport_type,
    operation_type,
    origin,
    origin_unlocode,
    origin_unlocode_id,
    destination,
    destination_unlocode,
    destination_unlocode_id,
    pickup_address,
    delivery_address,
    commodities,
    quantity,
    weight,
    volume,
    incoterm_id,
    required_quote_date,
    purchase_valid_until,
    sales_valid_until
  )
  values (
    opportunity_row.client_id,
    opportunity_row.id,
    resolved_created_by,
    'pendiente',
    opportunity_row.service_type,
    opportunity_row.transport_type,
    opportunity_row.operation_type,
    opportunity_row.origin,
    opportunity_row.origin_unlocode,
    opportunity_row.origin_unlocode_id,
    opportunity_row.destination,
    opportunity_row.destination_unlocode,
    opportunity_row.destination_unlocode_id,
    nullif(btrim(coalesce(p_pickup_address, '')), ''),
    nullif(btrim(coalesce(p_delivery_address, '')), ''),
    nullif(btrim(coalesce(p_commodities, '')), ''),
    p_quantity,
    p_weight,
    p_volume,
    opportunity_row.incoterm_id,
    p_required_quote_date,
    p_purchase_valid_until,
    p_sales_valid_until
  )
  returning id into new_quotation_id;

  update opportunities
  set status = 'cotizando'
  where id = p_opportunity_id
    and status not in ('aceptado', 'rechazada', 'vencida');

  return new_quotation_id;
end;
$$;

create or replace function convert_opportunity_to_quotation(
  p_opportunity_id uuid,
  p_created_by uuid default null
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select create_quotation_from_opportunity(
    p_opportunity_id => p_opportunity_id,
    p_created_by => p_created_by
  );
$$;

create or replace function take_quotation_for_pricing(
  p_quotation_id uuid,
  p_pricing_owner_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_pricing_owner_id uuid;
begin
  resolved_pricing_owner_id := coalesce(p_pricing_owner_id, erp_current_user_id());

  if resolved_pricing_owner_id is null then
    raise exception 'Pricing owner is required';
  end if;

  update quotations
  set
    pricing_owner_id = resolved_pricing_owner_id,
    status = 'cotizando'
  where id = p_quotation_id;
end;
$$;

create or replace function update_quotation_status(
  p_quotation_id uuid,
  p_status text,
  p_rejection_reason_id uuid default null,
  p_rejection_notes text default null,
  p_cancellation_notes text default null,
  p_target_rate numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_status text;
begin
  normalized_status := lower(btrim(coalesce(p_status, '')));

  if normalized_status = '' then
    raise exception 'Quotation status is required';
  end if;

  if normalized_status = 'rechazada' and p_rejection_reason_id is null then
    raise exception 'A rejection reason is required when rejecting a quotation';
  end if;

  if normalized_status = 'renegociar_tarifa' and p_target_rate is null then
    raise exception 'A target rate is required when requesting renegotiation';
  end if;

  update quotations
  set
    status = normalized_status,
    rejection_reason_id = case when normalized_status = 'rechazada' then p_rejection_reason_id else null end,
    rejection_notes = case when normalized_status = 'rechazada' then nullif(btrim(coalesce(p_rejection_notes, '')), '') else null end,
    cancellation_notes = case when normalized_status = 'cancelada' then nullif(btrim(coalesce(p_cancellation_notes, '')), '') else null end,
    target_rate = case when normalized_status = 'renegociar_tarifa' then p_target_rate else null end
  where id = p_quotation_id;
end;
$$;

create or replace function approve_quotation(
  p_quotation_id uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  select update_quotation_status(
    p_quotation_id => p_quotation_id,
    p_status => 'aceptada'
  );
$$;

create or replace function create_quotation_cost_line(
  p_quotation_id uuid,
  p_provider_id uuid default null,
  p_sales_accounting_concept_id uuid default null,
  p_purchase_amount numeric default null,
  p_sale_amount numeric default null,
  p_vat_rate numeric default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_line_id uuid;
  concept_row sales_accounting_concepts%rowtype;
begin
  if p_sales_accounting_concept_id is not null then
    select *
    into concept_row
    from sales_accounting_concepts
    where id = p_sales_accounting_concept_id;

    if not found then
      raise exception 'Sales accounting concept % not found', p_sales_accounting_concept_id;
    end if;
  end if;

  insert into quotation_costs (
    quotation_id,
    provider_id,
    sales_accounting_concept_id,
    service_name,
    cost,
    purchase_amount,
    sale_amount,
    profit_amount,
    vat_rate,
    notes
  )
  values (
    p_quotation_id,
    p_provider_id,
    p_sales_accounting_concept_id,
    coalesce(concept_row.concept, 'Cargo'),
    coalesce(p_purchase_amount, 0),
    p_purchase_amount,
    p_sale_amount,
    case
      when p_sale_amount is null or p_purchase_amount is null then null
      else p_sale_amount - p_purchase_amount
    end,
    coalesce(p_vat_rate, concept_row.vat_rate, 0),
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning id into new_line_id;

  perform recalculate_quotation_totals(p_quotation_id);

  return new_line_id;
end;
$$;

create or replace function update_quotation_cost_line(
  p_id uuid,
  p_provider_id uuid default null,
  p_sales_accounting_concept_id uuid default null,
  p_purchase_amount numeric default null,
  p_sale_amount numeric default null,
  p_vat_rate numeric default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_id_value uuid;
  concept_row sales_accounting_concepts%rowtype;
begin
  select quotation_id
  into quotation_id_value
  from quotation_costs
  where id = p_id;

  if quotation_id_value is null then
    raise exception 'Quotation cost line % not found', p_id;
  end if;

  if p_sales_accounting_concept_id is not null then
    select *
    into concept_row
    from sales_accounting_concepts
    where id = p_sales_accounting_concept_id;

    if not found then
      raise exception 'Sales accounting concept % not found', p_sales_accounting_concept_id;
    end if;
  end if;

  update quotation_costs
  set
    provider_id = p_provider_id,
    sales_accounting_concept_id = p_sales_accounting_concept_id,
    service_name = coalesce(concept_row.concept, service_name),
    cost = coalesce(p_purchase_amount, cost),
    purchase_amount = p_purchase_amount,
    sale_amount = p_sale_amount,
    profit_amount = case
      when p_sale_amount is null or p_purchase_amount is null then null
      else p_sale_amount - p_purchase_amount
    end,
    vat_rate = coalesce(p_vat_rate, concept_row.vat_rate, vat_rate),
    notes = nullif(btrim(coalesce(p_notes, '')), '')
  where id = p_id;

  perform recalculate_quotation_totals(quotation_id_value);
end;
$$;

create or replace function delete_quotation_cost_line(
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_id_value uuid;
begin
  select quotation_id
  into quotation_id_value
  from quotation_costs
  where id = p_id;

  delete from quotation_costs
  where id = p_id;

  if quotation_id_value is not null then
    perform recalculate_quotation_totals(quotation_id_value);
  end if;
end;
$$;

create or replace function create_quotation_rejection_reason(
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into quotation_rejection_reasons (
    reason
  )
  values (
    nullif(btrim(coalesce(p_reason, '')), '')
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function update_quotation_rejection_reason(
  p_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update quotation_rejection_reasons
  set reason = nullif(btrim(coalesce(p_reason, '')), '')
  where id = p_id;
end;
$$;

create or replace function delete_quotation_rejection_reason(
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from quotation_rejection_reasons
  where id = p_id;
end;
$$;

drop view if exists crm_quotations_view;
drop view if exists pricing_quotations_view;
drop view if exists quotation_summary_view;
drop view if exists quotation_rejection_reason_lookup_view;

create view quotation_summary_view as
with charge_totals as (
  select
    qc.quotation_id,
    count(*) as total_charge_lines,
    coalesce(sum(coalesce(qc.purchase_amount, qc.cost, 0)), 0) as total_purchase_amount,
    coalesce(sum(coalesce(qc.sale_amount, 0)), 0) as total_sale_amount,
    coalesce(sum(coalesce(qc.profit_amount, coalesce(qc.sale_amount, 0) - coalesce(qc.purchase_amount, qc.cost, 0))), 0) as total_profit_amount
  from quotation_costs qc
  group by qc.quotation_id
)
select
  q.id,
  q.reference_number,
  q.status,
  q.service_type,
  q.transport_type,
  q.operation_type,
  q.origin,
  q.origin_unlocode,
  q.destination,
  q.destination_unlocode,
  q.pickup_address,
  q.delivery_address,
  q.commodities,
  q.quantity,
  q.weight,
  q.volume,
  q.required_quote_date,
  q.purchase_valid_until,
  q.sales_valid_until,
  q.target_rate,
  q.pricing_owner_id,
  concat_ws(' ', pu.first_name, pu.last_name) as pricing_owner_name,
  q.created_by,
  concat_ws(' ', cu.first_name, cu.last_name) as created_by_name,
  q.incoterm_id,
  i.code as incoterm_code,
  q.rejection_reason_id,
  rr.reason as rejection_reason,
  q.rejection_notes,
  q.cancellation_notes,
  q.currency,
  coalesce(ct.total_purchase_amount, q.estimated_cost, 0) as estimated_cost,
  coalesce(ct.total_sale_amount, q.estimated_price, 0) as estimated_price,
  coalesce(ct.total_profit_amount, q.expected_profit, 0) as expected_profit,
  coalesce(ct.total_charge_lines, 0) as total_charge_lines,
  q.created_at,
  q.updated_at,
  c.id as client_id,
  c.company_name as client_name,
  o.id as opportunity_id,
  o.title as opportunity_title,
  o.salesperson_id,
  concat_ws(' ', su.first_name, su.last_name) as salesperson_name,
  q.origin_unlocode_id,
  q.destination_unlocode_id
from quotations q
join clients c on c.id = q.client_id
join opportunities o on o.id = q.opportunity_id
left join incoterms i on i.id = q.incoterm_id
left join users pu on pu.id = q.pricing_owner_id
left join users cu on cu.id = q.created_by
left join users su on su.id = o.salesperson_id
left join quotation_rejection_reasons rr on rr.id = q.rejection_reason_id
left join charge_totals ct on ct.quotation_id = q.id
where c.is_deleted = false;

create view crm_quotations_view as
select *
from quotation_summary_view
where status in (
  'pendiente',
  'cotizando',
  'lista_para_enviar',
  'enviada',
  'cancelada',
  'rechazada',
  'renegociar_tarifa',
  'aceptada'
);

create view pricing_quotations_view as
select *
from quotation_summary_view
where status in (
  'pendiente',
  'cotizando',
  'lista_para_enviar',
  'renegociar_tarifa'
);

create view quotation_rejection_reason_lookup_view as
select
  id,
  reason,
  created_at,
  updated_at
from quotation_rejection_reasons
order by reason asc;

create or replace function apply_quotation_computed_fields()
returns trigger
language plpgsql
as $$
declare
  origin_reference record;
  destination_reference record;
begin
  if nullif(btrim(coalesce(new.origin_unlocode, '')), '') is not null then
    new.origin_unlocode := upper(btrim(new.origin_unlocode));
  else
    new.origin_unlocode := null;
  end if;

  if nullif(btrim(coalesce(new.destination_unlocode, '')), '') is not null then
    new.destination_unlocode := upper(btrim(new.destination_unlocode));
  else
    new.destination_unlocode := null;
  end if;

  if new.origin_unlocode is null and new.origin_unlocode_id is null then
    new.origin := null;
  else
    select *
    into origin_reference
    from resolve_unlocode_reference(new.origin_unlocode, new.origin_unlocode_id);

    if origin_reference is not null then
      new.origin_unlocode_id := origin_reference.resolved_id;
      new.origin_unlocode := origin_reference.resolved_unlocode;
      new.origin := origin_reference.resolved_city;
    end if;
  end if;

  if new.destination_unlocode is null and new.destination_unlocode_id is null then
    new.destination := null;
  else
    select *
    into destination_reference
    from resolve_unlocode_reference(new.destination_unlocode, new.destination_unlocode_id);

    if destination_reference is not null then
      new.destination_unlocode_id := destination_reference.resolved_id;
      new.destination_unlocode := destination_reference.resolved_unlocode;
      new.destination := destination_reference.resolved_city;
    end if;
  end if;

  return new;
end;
$$;

create or replace function set_quotation_reference()
returns trigger
language plpgsql
as $$
begin
  if new.reference_number is null then
    new.reference_number := next_quotation_reference(new.service_type);
  end if;

  return new;
end;
$$;

create or replace function sync_quotation_totals_from_cost_lines()
returns trigger
language plpgsql
as $$
declare
  quotation_id_value uuid;
begin
  quotation_id_value := case
    when tg_op = 'DELETE' then old.quotation_id
    else new.quotation_id
  end;

  if quotation_id_value is not null then
    perform recalculate_quotation_totals(quotation_id_value);
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists set_quotation_reference_counters_updated_at on quotation_reference_counters;
create trigger set_quotation_reference_counters_updated_at
before update on quotation_reference_counters
for each row
execute function set_updated_at();

drop trigger if exists set_quotation_rejection_reasons_updated_at on quotation_rejection_reasons;
create trigger set_quotation_rejection_reasons_updated_at
before update on quotation_rejection_reasons
for each row
execute function set_updated_at();

drop trigger if exists set_quotation_cargo_lines_updated_at on quotation_cargo_lines;
create trigger set_quotation_cargo_lines_updated_at
before update on quotation_cargo_lines
for each row
execute function set_updated_at();

drop trigger if exists set_quotation_computed_fields on quotations;
create trigger set_quotation_computed_fields
before insert or update on quotations
for each row
execute function apply_quotation_computed_fields();

drop trigger if exists quotation_reference_trigger on quotations;
create trigger quotation_reference_trigger
before insert on quotations
for each row
execute function set_quotation_reference();

drop trigger if exists quotation_approved_trigger on quotations;
drop function if exists create_shipment_from_quotation();

drop trigger if exists quotation_cost_totals_trigger on quotation_costs;
create trigger quotation_cost_totals_trigger
after insert or update or delete on quotation_costs
for each row
execute function sync_quotation_totals_from_cost_lines();

drop trigger if exists audit_quotation_rejection_reasons on quotation_rejection_reasons;
create trigger audit_quotation_rejection_reasons
after insert or update or delete on quotation_rejection_reasons
for each row
execute function audit_trigger();

drop trigger if exists audit_quotation_costs on quotation_costs;
create trigger audit_quotation_costs
after insert or update or delete on quotation_costs
for each row
execute function audit_trigger();

drop trigger if exists audit_quotation_cargo_lines on quotation_cargo_lines;
create trigger audit_quotation_cargo_lines
after insert or update or delete on quotation_cargo_lines
for each row
execute function audit_trigger();
