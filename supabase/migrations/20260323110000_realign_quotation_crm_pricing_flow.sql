alter table quotations
  drop constraint if exists quotations_allowed_status;

alter table quotations
  alter column status set default 'borrador';

update quotations
set status = 'borrador'
where status is null;

alter table quotations
  add constraint quotations_allowed_status
  check (
    status in (
      'borrador',
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

alter table quotation_costs
  add column if not exists option_label text not null default 'Opcion 1';

create index if not exists idx_quotation_costs_quotation_option_label
  on quotation_costs(quotation_id, option_label);

alter table quotation_cargo_lines
  add column if not exists commodities text;

create or replace function request_quotation_pricing(
  p_quotation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update quotations
  set status = 'pendiente'
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
    'borrador',
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

create or replace function create_quotation_cost_line(
  p_quotation_id uuid,
  p_option_label text default 'Opcion 1',
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
    option_label,
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
    coalesce(nullif(btrim(coalesce(p_option_label, '')), ''), 'Opcion 1'),
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
  p_option_label text default 'Opcion 1',
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
    option_label = coalesce(nullif(btrim(coalesce(p_option_label, '')), ''), option_label),
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

create or replace function create_quotation_cargo_line(
  p_quotation_id uuid,
  p_load_type text,
  p_commodities text default null,
  p_piece_count integer default null,
  p_width numeric default null,
  p_length numeric default null,
  p_height numeric default null,
  p_weight numeric default null,
  p_freight_class text default null,
  p_cbm numeric default null,
  p_volumetric_weight_kg numeric default null,
  p_sort_order integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into quotation_cargo_lines (
    quotation_id,
    load_type,
    commodities,
    piece_count,
    width,
    length,
    height,
    weight,
    freight_class,
    cbm,
    volumetric_weight_kg,
    sort_order
  )
  values (
    p_quotation_id,
    nullif(btrim(coalesce(p_load_type, '')), ''),
    nullif(btrim(coalesce(p_commodities, '')), ''),
    p_piece_count,
    p_width,
    p_length,
    p_height,
    p_weight,
    nullif(btrim(coalesce(p_freight_class, '')), ''),
    p_cbm,
    p_volumetric_weight_kg,
    coalesce(p_sort_order, 1)
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function update_quotation_cargo_line(
  p_id uuid,
  p_load_type text,
  p_commodities text default null,
  p_piece_count integer default null,
  p_width numeric default null,
  p_length numeric default null,
  p_height numeric default null,
  p_weight numeric default null,
  p_freight_class text default null,
  p_cbm numeric default null,
  p_volumetric_weight_kg numeric default null,
  p_sort_order integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update quotation_cargo_lines
  set
    load_type = nullif(btrim(coalesce(p_load_type, '')), ''),
    commodities = nullif(btrim(coalesce(p_commodities, '')), ''),
    piece_count = p_piece_count,
    width = p_width,
    length = p_length,
    height = p_height,
    weight = p_weight,
    freight_class = nullif(btrim(coalesce(p_freight_class, '')), ''),
    cbm = p_cbm,
    volumetric_weight_kg = p_volumetric_weight_kg,
    sort_order = coalesce(p_sort_order, 1)
  where id = p_id;
end;
$$;

create or replace view crm_quotations_view as
select *
from quotation_summary_view
where status in (
  'borrador',
  'pendiente',
  'cotizando',
  'lista_para_enviar',
  'enviada',
  'cancelada',
  'rechazada',
  'renegociar_tarifa',
  'aceptada'
);
