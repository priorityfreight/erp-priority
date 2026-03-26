create table if not exists exchange_rates (
  id uuid primary key default gen_random_uuid(),
  rate_date date not null,
  base_currency text not null,
  quote_currency text not null default 'MXN',
  rate_value numeric(18,6) not null,
  source text not null default 'BANXICO',
  source_series_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint exchange_rates_allowed_base_currency
    check (base_currency in ('USD', 'EUR')),
  constraint exchange_rates_allowed_quote_currency
    check (quote_currency = 'MXN'),
  constraint exchange_rates_allowed_source
    check (source in ('BANXICO', 'MANUAL')),
  constraint exchange_rates_positive_rate
    check (rate_value > 0),
  constraint exchange_rates_unique unique (rate_date, base_currency, quote_currency, source)
);

create index if not exists idx_exchange_rates_rate_date
  on exchange_rates(rate_date desc);

create index if not exists idx_exchange_rates_base_quote_date
  on exchange_rates(base_currency, quote_currency, rate_date desc);

drop trigger if exists set_exchange_rates_updated_at on exchange_rates;

create trigger set_exchange_rates_updated_at
before update on exchange_rates
for each row
execute function set_updated_at();

drop view if exists pricing_quotations_view;
drop view if exists crm_quotations_view;
drop view if exists quotation_summary_view;
drop view if exists quotation_cost_line_secure_view;
drop view if exists exchange_rate_lookup_view;

alter table quotation_costs
  add column if not exists purchase_currency text not null default 'USD',
  add column if not exists purchase_exchange_rate_to_mxn numeric(18,6),
  add column if not exists purchase_amount_mxn numeric,
  add column if not exists sale_currency text not null default 'USD',
  add column if not exists sale_exchange_rate_to_mxn numeric(18,6),
  add column if not exists sale_amount_mxn numeric,
  add column if not exists profit_amount_mxn numeric;

alter table quotation_costs
  alter column option_label set default 'Proveedor';

update quotation_costs qc
set
  purchase_currency = coalesce(nullif(qc.purchase_currency, ''), nullif(qc.currency, ''), 'MXN'),
  purchase_exchange_rate_to_mxn = coalesce(
    qc.purchase_exchange_rate_to_mxn,
    case when coalesce(nullif(qc.purchase_currency, ''), nullif(qc.currency, ''), 'MXN') = 'MXN' then 1 else null end
  ),
  purchase_amount_mxn = coalesce(qc.purchase_amount_mxn, qc.purchase_amount, qc.cost),
  sale_currency = coalesce(nullif(qc.sale_currency, ''), nullif(qc.currency, ''), coalesce(nullif(qc.purchase_currency, ''), nullif(qc.currency, ''), 'MXN')),
  sale_exchange_rate_to_mxn = coalesce(
    qc.sale_exchange_rate_to_mxn,
    case when coalesce(nullif(qc.sale_currency, ''), nullif(qc.currency, ''), coalesce(nullif(qc.purchase_currency, ''), nullif(qc.currency, ''), 'MXN')) = 'MXN' then 1 else null end
  ),
  sale_amount_mxn = coalesce(qc.sale_amount_mxn, qc.sale_amount),
  profit_amount_mxn = coalesce(qc.profit_amount_mxn, qc.profit_amount, qc.sale_amount, 0) - coalesce(qc.purchase_amount_mxn, qc.purchase_amount, qc.cost, 0)
where
  qc.purchase_amount_mxn is null
  or qc.sale_amount_mxn is null
  or qc.profit_amount_mxn is null
  or qc.purchase_exchange_rate_to_mxn is null
  or qc.sale_exchange_rate_to_mxn is null;

alter table quotation_costs
  drop column if exists currency;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quotation_costs_allowed_purchase_currency'
      and conrelid = 'quotation_costs'::regclass
  ) then
    alter table quotation_costs
      add constraint quotation_costs_allowed_purchase_currency
      check (purchase_currency in ('MXN', 'USD', 'EUR'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'quotation_costs_allowed_sale_currency'
      and conrelid = 'quotation_costs'::regclass
  ) then
    alter table quotation_costs
      add constraint quotation_costs_allowed_sale_currency
      check (sale_currency in ('MXN', 'USD', 'EUR'));
  end if;
end $$;

alter table quotations
  drop column if exists commodities,
  drop column if exists cargo_type,
  drop column if exists quantity,
  drop column if exists weight,
  drop column if exists volume;

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

  new.search_text := lower(
    regexp_replace(
      concat_ws(
        ' ',
        coalesce(new.reference_number, ''),
        coalesce(new.status, ''),
        coalesce(new.service_type, ''),
        coalesce(new.transport_type, ''),
        coalesce(new.operation_type, ''),
        coalesce(new.origin, ''),
        coalesce(new.origin_unlocode, ''),
        coalesce(new.destination, ''),
        coalesce(new.destination_unlocode, ''),
        coalesce(new.pickup_address, ''),
        coalesce(new.delivery_address, '')
      ),
      '\s+',
      ' ',
      'g'
    )
  );

  return new;
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
    coalesce(sum(coalesce(qc.purchase_amount_mxn, qc.purchase_amount, qc.cost, 0)), 0),
    coalesce(sum(coalesce(qc.sale_amount_mxn, qc.sale_amount, 0)), 0),
    coalesce(sum(coalesce(qc.profit_amount_mxn, qc.profit_amount, coalesce(qc.sale_amount_mxn, qc.sale_amount, 0) - coalesce(qc.purchase_amount_mxn, qc.purchase_amount, qc.cost, 0))), 0)
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

create or replace function normalize_currency_code(
  p_currency text
)
returns text
language plpgsql
immutable
as $$
declare
  normalized text := upper(nullif(btrim(coalesce(p_currency, '')), ''));
begin
  if normalized is null then
    return 'MXN';
  end if;

  if normalized not in ('MXN', 'USD', 'EUR') then
    raise exception 'Unsupported currency: %', p_currency;
  end if;

  return normalized;
end;
$$;

create or replace function get_exchange_rate_to_mxn(
  p_currency text,
  p_reference_date date default current_date
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_currency text := public.normalize_currency_code(p_currency);
  resolved_rate numeric;
begin
  if normalized_currency = 'MXN' then
    return 1;
  end if;

  select er.rate_value
  into resolved_rate
  from exchange_rates er
  where er.base_currency = normalized_currency
    and er.quote_currency = 'MXN'
    and er.rate_date <= coalesce(p_reference_date, current_date) - interval '1 day'
  order by er.rate_date desc,
    case when er.source = 'BANXICO' then 0 else 1 end asc
  limit 1;

  if resolved_rate is null then
    raise exception 'No exchange rate available for % -> MXN before %', normalized_currency, coalesce(p_reference_date, current_date);
  end if;

  return resolved_rate;
end;
$$;

create or replace function create_quotation_from_opportunity(
  p_opportunity_id uuid,
  p_pickup_address text default null,
  p_delivery_address text default null,
  p_required_quote_date date default null,
  p_purchase_valid_until date default null,
  p_sales_valid_until date default null,
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

drop function if exists search_quotations(text, text, text, integer, integer);

create function search_quotations(
  p_scope text default 'crm',
  p_query text default null,
  p_status text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid,
  client_id uuid,
  opportunity_id uuid,
  created_by uuid,
  pricing_owner_id uuid,
  reference_number text,
  status text,
  service_type text,
  transport_type text,
  operation_type text,
  incoterm_id uuid,
  incoterm_code text,
  origin text,
  origin_unlocode text,
  origin_unlocode_id uuid,
  destination text,
  destination_unlocode text,
  destination_unlocode_id uuid,
  pickup_address text,
  delivery_address text,
  required_quote_date date,
  purchase_valid_until date,
  sales_valid_until date,
  rejection_reason_id uuid,
  rejection_reason text,
  rejection_notes text,
  cancellation_notes text,
  target_rate numeric,
  currency text,
  estimated_cost numeric,
  estimated_price numeric,
  expected_profit numeric,
  can_view_cost boolean,
  can_edit_purchase_amount boolean,
  can_view_sale_price boolean,
  can_edit_sale_price boolean,
  can_view_expected_profit boolean,
  total_charge_lines bigint,
  created_at timestamptz,
  updated_at timestamptz,
  client_name text,
  opportunity_title text,
  salesperson_id uuid,
  salesperson_name text,
  pricing_owner_name text,
  created_by_name text,
  total_count bigint
)
language sql
security definer
set search_path = public
as $$
  with params as (
    select
      lower(coalesce(nullif(btrim(p_scope), ''), 'crm')) as normalized_scope,
      lower(nullif(btrim(p_query), '')) as normalized_query,
      lower(nullif(btrim(p_status), '')) as normalized_status,
      greatest(coalesce(p_limit, 25), 1) as normalized_limit,
      greatest(coalesce(p_offset, 0), 0) as normalized_offset,
      public.erp_can_view_quotation_cost() as can_view_cost,
      public.erp_can_edit_quotation_purchase_amount() as can_edit_purchase_amount,
      public.erp_can_view_quotation_sale_price() as can_view_sale_price,
      public.erp_can_edit_quotation_sale_price() as can_edit_sale_price,
      public.erp_can_view_quotation_expected_profit() as can_view_expected_profit
  ),
  filtered as (
    select
      q.id,
      q.client_id,
      q.opportunity_id,
      q.created_by,
      q.pricing_owner_id,
      q.reference_number,
      q.status,
      q.service_type,
      q.transport_type,
      q.operation_type,
      q.incoterm_id,
      i.code as incoterm_code,
      q.origin,
      q.origin_unlocode,
      q.origin_unlocode_id,
      q.destination,
      q.destination_unlocode,
      q.destination_unlocode_id,
      q.pickup_address,
      q.delivery_address,
      q.required_quote_date,
      q.purchase_valid_until,
      q.sales_valid_until,
      q.rejection_reason_id,
      rr.reason as rejection_reason,
      q.rejection_notes,
      q.cancellation_notes,
      q.target_rate,
      q.currency,
      case when p.can_view_cost then q.estimated_cost else null end as estimated_cost,
      case when p.can_view_sale_price then q.estimated_price else null end as estimated_price,
      case when p.can_view_expected_profit then q.expected_profit else null end as expected_profit,
      p.can_view_cost,
      p.can_edit_purchase_amount,
      p.can_view_sale_price,
      p.can_edit_sale_price,
      p.can_view_expected_profit,
      (
        select count(*)
        from quotation_costs qc
        where qc.quotation_id = q.id
      ) as total_charge_lines,
      q.created_at,
      q.updated_at,
      c.company_name as client_name,
      o.title as opportunity_title,
      o.salesperson_id,
      concat_ws(' ', su.first_name, su.last_name) as salesperson_name,
      concat_ws(' ', pu.first_name, pu.last_name) as pricing_owner_name,
      concat_ws(' ', cu.first_name, cu.last_name) as created_by_name,
      case
        when p.normalized_query is null then 0
        when lower(coalesce(q.reference_number, '')) = p.normalized_query then 1000
        when lower(coalesce(q.reference_number, '')) like p.normalized_query || '%' then 950
        when lower(c.company_name) = p.normalized_query then 900
        when lower(c.company_name) like p.normalized_query || '%' then 875
        when lower(coalesce(o.title, '')) like p.normalized_query || '%' then 850
        when upper(coalesce(q.origin_unlocode, '')) = upper(p.normalized_query) then 825
        when upper(coalesce(q.destination_unlocode, '')) = upper(p.normalized_query) then 825
        else greatest(
          similarity(q.search_text, p.normalized_query),
          similarity(c.search_text, p.normalized_query),
          similarity(lower(coalesce(o.title, '')), p.normalized_query)
        ) * 100
      end as match_rank
    from quotations q
    join clients c on c.id = q.client_id
    join opportunities o on o.id = q.opportunity_id
    left join incoterms i on i.id = q.incoterm_id
    left join quotation_rejection_reasons rr on rr.id = q.rejection_reason_id
    left join users pu on pu.id = q.pricing_owner_id
    left join users cu on cu.id = q.created_by
    left join users su on su.id = o.salesperson_id
    cross join params p
    where c.is_deleted = false
      and (
        (
          p.normalized_scope = 'crm'
          and public.erp_can_access_crm_quotation_resource(
            'crm.quotations.list',
            'view',
            q.created_by,
            q.client_id
          )
        )
        or (
          p.normalized_scope = 'pricing'
          and q.status in ('pendiente', 'cotizando', 'lista_para_enviar', 'renegociar_tarifa')
          and public.erp_can_access_pricing_quotation(
            'view',
            q.status,
            q.pricing_owner_id
          )
        )
      )
      and (
        p.normalized_status is null
        or q.status = p.normalized_status
      )
      and (
        p.normalized_query is null
        or q.search_text % p.normalized_query
        or q.search_text ilike '%' || p.normalized_query || '%'
        or c.search_text % p.normalized_query
        or c.search_text ilike '%' || p.normalized_query || '%'
        or lower(coalesce(o.title, '')) ilike '%' || p.normalized_query || '%'
        or lower(concat_ws(' ', pu.first_name, pu.last_name)) ilike '%' || p.normalized_query || '%'
      )
  )
  select
    filtered.id,
    filtered.client_id,
    filtered.opportunity_id,
    filtered.created_by,
    filtered.pricing_owner_id,
    filtered.reference_number,
    filtered.status,
    filtered.service_type,
    filtered.transport_type,
    filtered.operation_type,
    filtered.incoterm_id,
    filtered.incoterm_code,
    filtered.origin,
    filtered.origin_unlocode,
    filtered.origin_unlocode_id,
    filtered.destination,
    filtered.destination_unlocode,
    filtered.destination_unlocode_id,
    filtered.pickup_address,
    filtered.delivery_address,
    filtered.required_quote_date,
    filtered.purchase_valid_until,
    filtered.sales_valid_until,
    filtered.rejection_reason_id,
    filtered.rejection_reason,
    filtered.rejection_notes,
    filtered.cancellation_notes,
    filtered.target_rate,
    filtered.currency,
    filtered.estimated_cost,
    filtered.estimated_price,
    filtered.expected_profit,
    filtered.can_view_cost,
    filtered.can_edit_purchase_amount,
    filtered.can_view_sale_price,
    filtered.can_edit_sale_price,
    filtered.can_view_expected_profit,
    filtered.total_charge_lines,
    filtered.created_at,
    filtered.updated_at,
    filtered.client_name,
    filtered.opportunity_title,
    filtered.salesperson_id,
    filtered.salesperson_name,
    filtered.pricing_owner_name,
    filtered.created_by_name,
    count(*) over() as total_count
  from filtered
  cross join params p
  order by
    filtered.match_rank desc,
    filtered.created_at desc,
    filtered.id desc
  limit (select normalized_limit from params)
  offset (select normalized_offset from params);
$$;

create or replace function create_quotation_cost_line(
  p_quotation_id uuid,
  p_option_label text default 'Proveedor',
  p_provider_id uuid default null,
  p_sales_accounting_concept_id uuid default null,
  p_purchase_amount numeric default null,
  p_purchase_currency text default 'USD',
  p_sale_amount numeric default null,
  p_sale_currency text default 'USD',
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
  provider_name_value text;
  quotation_pricing_owner_id uuid;
  quotation_status text;
  normalized_purchase_currency text;
  normalized_sale_currency text;
  purchase_exchange_rate numeric;
  sale_exchange_rate numeric;
begin
  select
    q.pricing_owner_id,
    q.status
  into quotation_pricing_owner_id, quotation_status
  from quotations q
  where q.id = p_quotation_id;

  if quotation_status is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  if not public.erp_has_resource_access(
    'pricing.quotations.cost_section',
    'create',
    quotation_pricing_owner_id,
    null
  ) then
    raise exception 'You do not have permission to create quotation costs'
      using errcode = '42501';
  end if;

  if p_purchase_amount is not null and not public.erp_can_edit_quotation_purchase_amount() then
    raise exception 'You do not have permission to edit quotation cost'
      using errcode = '42501';
  end if;

  if p_sale_amount is not null and not public.erp_can_edit_quotation_sale_price() then
    raise exception 'You do not have permission to edit quotation sale price'
      using errcode = '42501';
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

  if p_provider_id is not null then
    select p.name
    into provider_name_value
    from providers p
    where p.id = p_provider_id;
  end if;

  normalized_purchase_currency := public.normalize_currency_code(p_purchase_currency);
  normalized_sale_currency := public.normalize_currency_code(coalesce(p_sale_currency, p_purchase_currency));
  purchase_exchange_rate := public.get_exchange_rate_to_mxn(normalized_purchase_currency, current_date);
  sale_exchange_rate := public.get_exchange_rate_to_mxn(normalized_sale_currency, current_date);

  insert into quotation_costs (
    quotation_id,
    option_label,
    provider_id,
    sales_accounting_concept_id,
    service_name,
    cost,
    purchase_amount,
    purchase_currency,
    purchase_exchange_rate_to_mxn,
    purchase_amount_mxn,
    sale_amount,
    sale_currency,
    sale_exchange_rate_to_mxn,
    sale_amount_mxn,
    profit_amount,
    profit_amount_mxn,
    vat_rate,
    notes
  )
  values (
    p_quotation_id,
    coalesce(nullif(btrim(coalesce(p_option_label, '')), ''), provider_name_value, 'Proveedor'),
    p_provider_id,
    p_sales_accounting_concept_id,
    coalesce(concept_row.concept, 'Cargo'),
    coalesce(p_purchase_amount, 0),
    p_purchase_amount,
    normalized_purchase_currency,
    purchase_exchange_rate,
    case
      when p_purchase_amount is null then null
      else p_purchase_amount * purchase_exchange_rate
    end,
    p_sale_amount,
    normalized_sale_currency,
    sale_exchange_rate,
    case
      when p_sale_amount is null then null
      else p_sale_amount * sale_exchange_rate
    end,
    case
      when p_sale_amount is null or p_purchase_amount is null then null
      else p_sale_amount - p_purchase_amount
    end,
    case
      when p_sale_amount is null or p_purchase_amount is null then null
      else (p_sale_amount * sale_exchange_rate) - (p_purchase_amount * purchase_exchange_rate)
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
  p_option_label text default 'Proveedor',
  p_provider_id uuid default null,
  p_sales_accounting_concept_id uuid default null,
  p_purchase_amount numeric default null,
  p_purchase_currency text default null,
  p_sale_amount numeric default null,
  p_sale_currency text default null,
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
  quotation_created_by uuid;
  quotation_pricing_owner_id uuid;
  quotation_client_id uuid;
  concept_row sales_accounting_concepts%rowtype;
  provider_name_value text;
  current_purchase_amount numeric;
  current_purchase_currency text;
  current_purchase_exchange_rate numeric;
  current_sale_amount numeric;
  current_sale_currency text;
  current_sale_exchange_rate numeric;
  can_edit_pricing boolean := false;
  can_edit_sales boolean := false;
  normalized_purchase_currency text;
  normalized_sale_currency text;
begin
  select quotation_id
  into quotation_id_value
  from quotation_costs
  where id = p_id;

  if quotation_id_value is null then
    raise exception 'Quotation cost line % not found', p_id;
  end if;

  select
    purchase_amount,
    purchase_currency,
    purchase_exchange_rate_to_mxn,
    sale_amount,
    sale_currency,
    sale_exchange_rate_to_mxn
  into current_purchase_amount, current_purchase_currency, current_purchase_exchange_rate, current_sale_amount, current_sale_currency, current_sale_exchange_rate
  from quotation_costs
  where id = p_id;

  select
    q.created_by,
    q.pricing_owner_id,
    q.client_id
  into quotation_created_by, quotation_pricing_owner_id, quotation_client_id
  from quotations q
  where q.id = quotation_id_value;

  can_edit_pricing := public.erp_has_resource_access(
    'pricing.quotations.cost_section',
    'edit',
    quotation_pricing_owner_id,
    null
  );

  can_edit_sales := public.erp_can_access_crm_quotation_resource(
    'crm.quotations.customer_actions',
    'edit',
    quotation_created_by,
    quotation_client_id
  );

  if not can_edit_pricing and not can_edit_sales then
    raise exception 'You do not have permission to update quotation costs'
      using errcode = '42501';
  end if;

  if not can_edit_pricing and (
    p_purchase_amount is not null
    or p_provider_id is not null
    or p_sales_accounting_concept_id is not null
    or p_vat_rate is not null
    or p_notes is not null
  ) then
    raise exception 'You do not have permission to edit purchase-side quotation costs'
      using errcode = '42501';
  end if;

  if p_purchase_amount is not null and not public.erp_can_edit_quotation_purchase_amount() then
    raise exception 'You do not have permission to edit quotation cost'
      using errcode = '42501';
  end if;

  if p_sale_amount is not null and not can_edit_sales then
    raise exception 'You do not have permission to edit quotation sale price'
      using errcode = '42501';
  end if;

  if p_sale_amount is not null and not public.erp_can_edit_quotation_sale_price() then
    raise exception 'You do not have permission to edit quotation sale price'
      using errcode = '42501';
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

  if p_provider_id is not null then
    select p.name
    into provider_name_value
    from providers p
    where p.id = p_provider_id;
  end if;

  normalized_purchase_currency := coalesce(
    case when p_purchase_currency is null then null else public.normalize_currency_code(p_purchase_currency) end,
    current_purchase_currency,
    'MXN'
  );
  normalized_sale_currency := coalesce(
    case when p_sale_currency is null then null else public.normalize_currency_code(p_sale_currency) end,
    current_sale_currency,
    normalized_purchase_currency,
    'MXN'
  );

  update quotation_costs
  set
    option_label = coalesce(nullif(btrim(coalesce(p_option_label, '')), ''), provider_name_value, option_label),
    provider_id = p_provider_id,
    sales_accounting_concept_id = p_sales_accounting_concept_id,
    service_name = coalesce(concept_row.concept, service_name),
    cost = coalesce(p_purchase_amount, cost),
    purchase_amount = coalesce(p_purchase_amount, purchase_amount),
    purchase_currency = normalized_purchase_currency,
    purchase_exchange_rate_to_mxn = public.get_exchange_rate_to_mxn(normalized_purchase_currency, current_date),
    purchase_amount_mxn = case
      when coalesce(p_purchase_amount, current_purchase_amount) is null then null
      else coalesce(p_purchase_amount, current_purchase_amount) * public.get_exchange_rate_to_mxn(normalized_purchase_currency, current_date)
    end,
    sale_amount = coalesce(p_sale_amount, sale_amount),
    sale_currency = normalized_sale_currency,
    sale_exchange_rate_to_mxn = public.get_exchange_rate_to_mxn(normalized_sale_currency, current_date),
    sale_amount_mxn = case
      when coalesce(p_sale_amount, current_sale_amount) is null then null
      else coalesce(p_sale_amount, current_sale_amount) * public.get_exchange_rate_to_mxn(normalized_sale_currency, current_date)
    end,
    profit_amount = case
      when coalesce(p_sale_amount, current_sale_amount) is null
        or coalesce(p_purchase_amount, current_purchase_amount) is null then null
      else coalesce(p_sale_amount, current_sale_amount) - coalesce(p_purchase_amount, current_purchase_amount)
    end,
    profit_amount_mxn = case
      when coalesce(p_sale_amount, current_sale_amount) is null
        or coalesce(p_purchase_amount, current_purchase_amount) is null then null
      else
        (coalesce(p_sale_amount, current_sale_amount) * public.get_exchange_rate_to_mxn(normalized_sale_currency, current_date))
        - (coalesce(p_purchase_amount, current_purchase_amount) * public.get_exchange_rate_to_mxn(normalized_purchase_currency, current_date))
    end,
    vat_rate = coalesce(p_vat_rate, concept_row.vat_rate, vat_rate),
    notes = nullif(btrim(coalesce(p_notes, '')), '')
  where id = p_id;

  perform recalculate_quotation_totals(quotation_id_value);
end;
$$;

create or replace function update_quotation_option_sales_amounts(
  p_quotation_id uuid,
  p_option_label text,
  p_sales_amounts jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_option_label text := coalesce(nullif(btrim(coalesce(p_option_label, '')), ''), 'Proveedor');
begin
  if not exists (
    select 1
    from quotations q
    where q.id = p_quotation_id
      and public.erp_can_access_crm_quotation_resource(
        'crm.quotations.customer_actions',
        'edit',
        q.created_by,
        q.client_id
      )
  ) then
    raise exception 'You do not have permission to edit sale amounts for this quotation'
      using errcode = '42501';
  end if;

  if not public.erp_can_edit_quotation_sale_price() then
    raise exception 'You do not have permission to edit quotation sale price'
      using errcode = '42501';
  end if;

  if p_sales_amounts is null or jsonb_typeof(p_sales_amounts) <> 'object' then
    raise exception 'Sales amounts payload must be a JSON object keyed by quotation cost line id';
  end if;

  update quotation_costs qc
  set
    sale_amount = updates.sale_amount,
    sale_currency = updates.sale_currency,
    sale_exchange_rate_to_mxn = public.get_exchange_rate_to_mxn(updates.sale_currency, current_date),
    sale_amount_mxn = case
      when updates.sale_amount is null then null
      else updates.sale_amount * public.get_exchange_rate_to_mxn(updates.sale_currency, current_date)
    end,
    profit_amount = case
      when updates.sale_amount is null or qc.purchase_amount is null then null
      else updates.sale_amount - qc.purchase_amount
    end,
    profit_amount_mxn = case
      when updates.sale_amount is null or qc.purchase_amount is null then null
      else
        (updates.sale_amount * public.get_exchange_rate_to_mxn(updates.sale_currency, current_date))
        - coalesce(qc.purchase_amount_mxn, qc.purchase_amount * public.get_exchange_rate_to_mxn(qc.purchase_currency, current_date))
    end
  from (
    select
      key::uuid as line_id,
      case
        when jsonb_typeof(value) = 'object' then nullif(btrim(value ->> 'sale_amount'), '')::numeric
        else nullif(btrim(trim(both '"' from value::text)), '')::numeric
      end as sale_amount,
      coalesce(
        case
          when jsonb_typeof(value) = 'object' then public.normalize_currency_code(value ->> 'sale_currency')
          else null
        end,
        qc_existing.sale_currency,
        qc_existing.purchase_currency,
        'MXN'
      ) as sale_currency
    from jsonb_each(p_sales_amounts)
    join quotation_costs qc_existing
      on qc_existing.id = key::uuid
  ) as updates
  where qc.id = updates.line_id
    and qc.quotation_id = p_quotation_id
    and qc.option_label = normalized_option_label;

  perform recalculate_quotation_totals(p_quotation_id);
end;
$$;

create or replace function create_exchange_rate(
  p_rate_date date,
  p_base_currency text,
  p_rate_value numeric,
  p_quote_currency text default 'MXN',
  p_source text default 'BANXICO',
  p_source_series_code text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_record_id uuid;
begin
  insert into exchange_rates (
    rate_date,
    base_currency,
    quote_currency,
    rate_value,
    source,
    source_series_code
  )
  values (
    p_rate_date,
    public.normalize_currency_code(p_base_currency),
    public.normalize_currency_code(coalesce(p_quote_currency, 'MXN')),
    p_rate_value,
    upper(nullif(btrim(coalesce(p_source, 'BANXICO')), '')),
    nullif(upper(btrim(coalesce(p_source_series_code, ''))), '')
  )
  returning id into new_record_id;

  return new_record_id;
end;
$$;

create or replace function update_exchange_rate(
  p_id uuid,
  p_rate_date date,
  p_base_currency text,
  p_quote_currency text,
  p_rate_value numeric,
  p_source text,
  p_source_series_code text default null
)
returns void
language plpgsql
security definer
as $$
begin
  update exchange_rates
  set
    rate_date = p_rate_date,
    base_currency = public.normalize_currency_code(p_base_currency),
    quote_currency = public.normalize_currency_code(coalesce(p_quote_currency, 'MXN')),
    rate_value = p_rate_value,
    source = upper(nullif(btrim(coalesce(p_source, 'BANXICO')), '')),
    source_series_code = nullif(upper(btrim(coalesce(p_source_series_code, ''))), '')
  where id = p_id;
end;
$$;

create or replace function delete_exchange_rate(
  p_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  delete from exchange_rates
  where id = p_id;
end;
$$;

create or replace view quotation_summary_view as
with permission_flags as (
  select
    public.erp_can_view_quotation_cost() as can_view_cost,
    public.erp_can_edit_quotation_purchase_amount() as can_edit_purchase_amount,
    public.erp_can_view_quotation_sale_price() as can_view_sale_price,
    public.erp_can_edit_quotation_sale_price() as can_edit_sale_price,
    public.erp_can_view_quotation_expected_profit() as can_view_expected_profit
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
  case when pf.can_view_cost then q.estimated_cost else null end as estimated_cost,
  case when pf.can_view_sale_price then q.estimated_price else null end as estimated_price,
  case when pf.can_view_expected_profit then q.expected_profit else null end as expected_profit,
  (
    select count(*)
    from quotation_costs qc
    where qc.quotation_id = q.id
  ) as total_charge_lines,
  q.created_at,
  q.updated_at,
  c.id as client_id,
  c.company_name as client_name,
  o.id as opportunity_id,
  o.title as opportunity_title,
  o.salesperson_id,
  concat_ws(' ', su.first_name, su.last_name) as salesperson_name,
  pf.can_view_cost,
  pf.can_edit_purchase_amount,
  pf.can_view_sale_price,
  pf.can_edit_sale_price,
  pf.can_view_expected_profit
from quotations q
join clients c on c.id = q.client_id
join opportunities o on o.id = q.opportunity_id
left join incoterms i on i.id = q.incoterm_id
left join users pu on pu.id = q.pricing_owner_id
left join users cu on cu.id = q.created_by
left join users su on su.id = o.salesperson_id
left join quotation_rejection_reasons rr on rr.id = q.rejection_reason_id
cross join permission_flags pf
where c.is_deleted = false
  and (
    public.erp_can_access_crm_quotation_resource(
      'crm.quotations.record',
      'view',
      q.created_by,
      q.client_id
    )
    or public.erp_can_access_pricing_quotation(
      'view',
      q.status,
      q.pricing_owner_id
    )
    or public.erp_can_access_operations_shipment(
      'view',
      q.client_id
    )
  );

create or replace view quotation_cost_line_secure_view as
with permission_flags as (
  select
    public.erp_can_view_quotation_cost() as can_view_cost,
    public.erp_can_edit_quotation_purchase_amount() as can_edit_purchase_amount,
    public.erp_can_view_quotation_sale_price() as can_view_sale_price,
    public.erp_can_edit_quotation_sale_price() as can_edit_sale_price,
    public.erp_can_view_quotation_expected_profit() as can_view_expected_profit
)
select
  qc.id,
  qc.quotation_id,
  qc.option_label,
  qc.provider_id,
  p.name as provider_name,
  qc.sales_accounting_concept_id,
  sac.concept as accounting_concept,
  qc.service_name,
  case when pf.can_view_cost then qc.cost else null end as cost,
  case when pf.can_view_cost then qc.purchase_amount else null end as purchase_amount,
  qc.purchase_currency,
  case when pf.can_view_cost then qc.purchase_amount_mxn else null end as purchase_amount_mxn,
  case when pf.can_view_sale_price then qc.sale_amount else null end as sale_amount,
  qc.sale_currency,
  case when pf.can_view_sale_price then qc.sale_amount_mxn else null end as sale_amount_mxn,
  case when pf.can_view_expected_profit then qc.profit_amount else null end as profit_amount,
  case when pf.can_view_expected_profit then qc.profit_amount_mxn else null end as profit_amount_mxn,
  qc.vat_rate,
  qc.notes,
  qc.created_at,
  pf.can_view_cost,
  pf.can_edit_purchase_amount,
  pf.can_view_sale_price,
  pf.can_edit_sale_price,
  pf.can_view_expected_profit
from quotation_costs qc
join quotations q on q.id = qc.quotation_id
left join providers p on p.id = qc.provider_id
left join sales_accounting_concepts sac on sac.id = qc.sales_accounting_concept_id
cross join permission_flags pf
where
  public.erp_has_resource_access(
    'pricing.quotations.cost_section',
    'view',
    q.pricing_owner_id,
    null
  )
  or public.erp_can_access_crm_quotation_resource(
    'crm.quotations.pricing_options',
    'view',
    q.created_by,
    q.client_id
  );

create or replace view exchange_rate_lookup_view as
select
  er.id,
  er.rate_date,
  er.base_currency,
  er.quote_currency,
  er.rate_value,
  er.source,
  er.source_series_code,
  er.created_at,
  er.updated_at
from exchange_rates er
order by er.rate_date desc, er.base_currency asc, er.quote_currency asc;

alter table exchange_rates enable row level security;
alter table exchange_rates force row level security;

drop policy if exists "active_select_exchange_rates" on exchange_rates;
drop policy if exists "active_insert_exchange_rates" on exchange_rates;
drop policy if exists "active_update_exchange_rates" on exchange_rates;
drop policy if exists "active_delete_exchange_rates" on exchange_rates;

create policy "active_select_exchange_rates"
on exchange_rates
for select
using (public.erp_has_submodule_access('master_data.accounting.exchange_rates', 'view'));

create policy "active_insert_exchange_rates"
on exchange_rates
for insert
with check (public.erp_has_submodule_access('master_data.accounting.exchange_rates', 'create'));

create policy "active_update_exchange_rates"
on exchange_rates
for update
using (public.erp_has_submodule_access('master_data.accounting.exchange_rates', 'edit'))
with check (public.erp_has_submodule_access('master_data.accounting.exchange_rates', 'edit'));

create policy "active_delete_exchange_rates"
on exchange_rates
for delete
using (public.erp_has_submodule_access('master_data.accounting.exchange_rates', 'delete'));

insert into permission_submodules (
  module_id,
  code,
  name,
  route_path,
  route_matchers,
  sort_order,
  active
)
select
  pm.id,
  'master_data.accounting.exchange_rates',
  'Contabilidad / Tipo de cambio',
  '/master-data/accounting/exchange-rates',
  array['/master-data/accounting/exchange-rates']::text[],
  80,
  true
from permission_modules pm
where pm.code = 'master_data'
on conflict (code) do update
set
  module_id = excluded.module_id,
  name = excluded.name,
  route_path = excluded.route_path,
  route_matchers = excluded.route_matchers,
  sort_order = excluded.sort_order,
  active = excluded.active;

insert into permission_resources (
  module_id,
  submodule_id,
  resource_key,
  name,
  resource_type,
  resource_group,
  table_name,
  view_name,
  rpc_name,
  entity_owner_field,
  entity_branch_field,
  sort_order,
  active
)
select
  pm.id,
  ps.id,
  'master_data.accounting.exchange_rates',
  'Exchange Rates Catalog',
  'submodule',
  'Navigation',
  'exchange_rates',
  'exchange_rate_lookup_view',
  null,
  null,
  null,
  390,
  true
from permission_modules pm
join permission_submodules ps
  on ps.code = 'master_data.accounting.exchange_rates'
where pm.code = 'master_data'
on conflict (resource_key) do update
set
  module_id = excluded.module_id,
  submodule_id = excluded.submodule_id,
  name = excluded.name,
  resource_type = excluded.resource_type,
  resource_group = excluded.resource_group,
  table_name = excluded.table_name,
  view_name = excluded.view_name,
  rpc_name = excluded.rpc_name,
  entity_owner_field = excluded.entity_owner_field,
  entity_branch_field = excluded.entity_branch_field,
  sort_order = excluded.sort_order,
  active = excluded.active;
