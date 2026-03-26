alter table quotations
  add column if not exists accepted_usd_rate_date date,
  add column if not exists accepted_usd_to_mxn_rate numeric(18,6),
  add column if not exists accepted_eur_rate_date date,
  add column if not exists accepted_eur_to_mxn_rate numeric(18,6),
  add column if not exists exchange_rates_locked_at timestamptz;

create table if not exists quotation_options (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations(id) on delete cascade,
  option_label text not null,
  sort_order integer not null,
  include_in_customer_quote boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint quotation_options_unique_label unique (quotation_id, option_label),
  constraint quotation_options_unique_sort_order unique (quotation_id, sort_order)
);

create index if not exists idx_quotation_options_quotation_id
  on quotation_options(quotation_id);
create index if not exists idx_quotation_options_customer_visibility
  on quotation_options(quotation_id, include_in_customer_quote, sort_order);

alter table quotation_costs
  add column if not exists quotation_option_id uuid references quotation_options(id) on delete cascade;

create index if not exists idx_quotation_costs_option_id
  on quotation_costs(quotation_option_id);

with option_source as (
  select
    qc.quotation_id,
    coalesce(nullif(btrim(qc.option_label), ''), 'Opcion 1') as option_label,
    min(qc.created_at) as first_created_at
  from quotation_costs qc
  group by qc.quotation_id, coalesce(nullif(btrim(qc.option_label), ''), 'Opcion 1')
),
ranked_options as (
  select
    option_source.quotation_id,
    option_source.option_label,
    row_number() over (
      partition by option_source.quotation_id
      order by option_source.first_created_at asc, option_source.option_label asc
    ) as sort_order,
    option_source.first_created_at
  from option_source
)
insert into quotation_options (
  quotation_id,
  option_label,
  sort_order,
  include_in_customer_quote,
  created_at
)
select
  ranked_options.quotation_id,
  ranked_options.option_label,
  ranked_options.sort_order,
  true,
  ranked_options.first_created_at
from ranked_options
on conflict (quotation_id, option_label) do nothing;

update quotation_costs qc
set
  quotation_option_id = qo.id,
  option_label = qo.option_label
from quotation_options qo
where qo.quotation_id = qc.quotation_id
  and qo.option_label = coalesce(nullif(btrim(qc.option_label), ''), 'Opcion 1')
  and qc.quotation_option_id is null;

alter table quotation_options enable row level security;
alter table quotation_options force row level security;

drop policy if exists "active_select_quotation_options" on quotation_options;
drop policy if exists "active_update_quotation_options" on quotation_options;

create policy "active_select_quotation_options"
on quotation_options
for select
using (
  exists (
    select 1
    from quotations q
    where q.id = quotation_options.quotation_id
      and (
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
        )
      )
  )
);

create policy "active_update_quotation_options"
on quotation_options
for update
using (
  exists (
    select 1
    from quotations q
    where q.id = quotation_options.quotation_id
      and public.erp_can_access_crm_quotation_resource(
        'crm.quotations.customer_actions',
        'edit',
        q.created_by,
        q.client_id
      )
  )
)
with check (
  exists (
    select 1
    from quotations q
    where q.id = quotation_options.quotation_id
      and public.erp_can_access_crm_quotation_resource(
        'crm.quotations.customer_actions',
        'edit',
        q.created_by,
        q.client_id
      )
  )
);

drop function if exists create_quotation_cost_line(uuid, text, uuid, uuid, numeric, text, numeric, text, numeric, text);
drop function if exists update_quotation_cost_line(uuid, text, uuid, uuid, numeric, text, numeric, text, numeric, text);
drop function if exists update_quotation_option_sales_amounts(uuid, text, jsonb);

create or replace function get_exchange_rate_snapshot_to_mxn(
  p_currency text,
  p_reference_date date default current_date
)
returns table (
  rate_date date,
  rate_value numeric,
  source text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_currency text := public.normalize_currency_code(p_currency);
begin
  if normalized_currency = 'MXN' then
    return query
    select
      coalesce(p_reference_date, current_date),
      1::numeric,
      'SYSTEM'::text;
    return;
  end if;

  return query
  select
    er.rate_date,
    er.rate_value,
    er.source
  from exchange_rates er
  where er.base_currency = normalized_currency
    and er.quote_currency = 'MXN'
    and er.rate_date <= coalesce(p_reference_date, current_date) - interval '1 day'
  order by er.rate_date desc,
    case when er.source = 'BANXICO' then 0 else 1 end asc
  limit 1;

  if not found then
    raise exception 'No exchange rate snapshot available for % -> MXN before %', normalized_currency, coalesce(p_reference_date, current_date);
  end if;
end;
$$;

create or replace function resolve_quotation_exchange_rate_to_mxn(
  p_quotation_id uuid,
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
  quotation_row record;
  snapshot_row record;
begin
  if normalized_currency = 'MXN' then
    return 1;
  end if;

  select
    q.status,
    q.accepted_usd_to_mxn_rate,
    q.accepted_eur_to_mxn_rate
  into quotation_row
  from quotations q
  where q.id = p_quotation_id;

  if quotation_row is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  if quotation_row.status = 'aceptada' then
    if normalized_currency = 'USD' and quotation_row.accepted_usd_to_mxn_rate is not null then
      return quotation_row.accepted_usd_to_mxn_rate;
    end if;

    if normalized_currency = 'EUR' and quotation_row.accepted_eur_to_mxn_rate is not null then
      return quotation_row.accepted_eur_to_mxn_rate;
    end if;
  end if;

  select *
  into snapshot_row
  from get_exchange_rate_snapshot_to_mxn(normalized_currency, p_reference_date);

  return snapshot_row.rate_value;
end;
$$;

create or replace function lock_quotation_exchange_rates(
  p_quotation_id uuid,
  p_reference_date date default current_date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  usd_snapshot record;
  eur_snapshot record;
begin
  select *
  into usd_snapshot
  from get_exchange_rate_snapshot_to_mxn('USD', p_reference_date);

  select *
  into eur_snapshot
  from get_exchange_rate_snapshot_to_mxn('EUR', p_reference_date);

  update quotations
  set
    accepted_usd_rate_date = usd_snapshot.rate_date,
    accepted_usd_to_mxn_rate = usd_snapshot.rate_value,
    accepted_eur_rate_date = eur_snapshot.rate_date,
    accepted_eur_to_mxn_rate = eur_snapshot.rate_value,
    exchange_rates_locked_at = now()
  where id = p_quotation_id;
end;
$$;

create or replace function ensure_quotation_option(
  p_quotation_id uuid,
  p_quotation_option_id uuid default null,
  p_option_label text default null
)
returns table (
  id uuid,
  option_label text,
  sort_order integer,
  include_in_customer_quote boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_option record;
  next_sort_order integer;
  normalized_label text;
begin
  if p_quotation_option_id is not null then
    return query
    select
      qo.id,
      qo.option_label,
      qo.sort_order,
      qo.include_in_customer_quote
    from quotation_options qo
    where qo.id = p_quotation_option_id
      and qo.quotation_id = p_quotation_id;

    if found then
      return;
    end if;

    raise exception 'Quotation option % not found for quotation %', p_quotation_option_id, p_quotation_id;
  end if;

  normalized_label := nullif(btrim(coalesce(p_option_label, '')), '');

  if normalized_label is not null then
    select
      qo.id,
      qo.option_label,
      qo.sort_order,
      qo.include_in_customer_quote
    into existing_option
    from quotation_options qo
    where qo.quotation_id = p_quotation_id
      and qo.option_label = normalized_label;

    if existing_option is not null then
      return query
      select
        existing_option.id,
        existing_option.option_label,
        existing_option.sort_order,
        existing_option.include_in_customer_quote;
      return;
    end if;
  end if;

  select coalesce(max(qo.sort_order), 0) + 1
  into next_sort_order
  from quotation_options qo
  where qo.quotation_id = p_quotation_id;

  insert into quotation_options (
    quotation_id,
    option_label,
    sort_order,
    include_in_customer_quote
  )
  values (
    p_quotation_id,
    coalesce(normalized_label, 'Opcion ' || next_sort_order),
    next_sort_order,
    true
  )
  returning
    quotation_options.id,
    quotation_options.option_label,
    quotation_options.sort_order,
    quotation_options.include_in_customer_quote
  into existing_option;

  return query
  select
    existing_option.id,
    existing_option.option_label,
    existing_option.sort_order,
    existing_option.include_in_customer_quote;
end;
$$;

create or replace function refresh_quotation_cost_line_mxn(
  p_quotation_id uuid,
  p_reference_date date default current_date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update quotation_costs qc
  set
    purchase_exchange_rate_to_mxn = public.resolve_quotation_exchange_rate_to_mxn(
      qc.quotation_id,
      qc.purchase_currency,
      p_reference_date
    ),
    purchase_amount_mxn = case
      when qc.purchase_amount is null then null
      else qc.purchase_amount * public.resolve_quotation_exchange_rate_to_mxn(
        qc.quotation_id,
        qc.purchase_currency,
        p_reference_date
      )
    end,
    sale_exchange_rate_to_mxn = public.resolve_quotation_exchange_rate_to_mxn(
      qc.quotation_id,
      qc.sale_currency,
      p_reference_date
    ),
    sale_amount_mxn = case
      when qc.sale_amount is null then null
      else qc.sale_amount * public.resolve_quotation_exchange_rate_to_mxn(
        qc.quotation_id,
        qc.sale_currency,
        p_reference_date
      )
    end,
    profit_amount_mxn = case
      when qc.sale_amount is null or qc.purchase_amount is null then null
      else
        (qc.sale_amount * public.resolve_quotation_exchange_rate_to_mxn(
          qc.quotation_id,
          qc.sale_currency,
          p_reference_date
        ))
        - (qc.purchase_amount * public.resolve_quotation_exchange_rate_to_mxn(
          qc.quotation_id,
          qc.purchase_currency,
          p_reference_date
        ))
    end
  where qc.quotation_id = p_quotation_id;
end;
$$;

create or replace function refresh_open_quotation_exchange_rates(
  p_reference_date date default current_date
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_row record;
  affected_count integer := 0;
begin
  for quotation_row in
    select q.id
    from quotations q
    where q.status <> 'aceptada'
  loop
    perform public.refresh_quotation_cost_line_mxn(quotation_row.id, p_reference_date);
    perform public.recalculate_quotation_totals(quotation_row.id);
    affected_count := affected_count + 1;
  end loop;

  return affected_count;
end;
$$;

create or replace function set_quotation_option_customer_visibility(
  p_quotation_option_id uuid,
  p_include_in_customer_quote boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_row record;
begin
  select
    q.id,
    q.created_by,
    q.client_id
  into quotation_row
  from quotation_options qo
  join quotations q on q.id = qo.quotation_id
  where qo.id = p_quotation_option_id;

  if quotation_row is null then
    raise exception 'Quotation option % not found', p_quotation_option_id;
  end if;

  if not public.erp_can_access_crm_quotation_resource(
    'crm.quotations.customer_actions',
    'edit',
    quotation_row.created_by,
    quotation_row.client_id
  ) then
    raise exception 'You do not have permission to select customer-visible options'
      using errcode = '42501';
  end if;

  update quotation_options
  set include_in_customer_quote = coalesce(p_include_in_customer_quote, true)
  where id = p_quotation_option_id;
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
  quotation_created_by uuid;
  quotation_pricing_owner_id uuid;
  quotation_client_id uuid;
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

  select
    q.created_by,
    q.pricing_owner_id,
    q.client_id
  into quotation_created_by, quotation_pricing_owner_id, quotation_client_id
  from quotations q
  where q.id = p_quotation_id;

  if quotation_client_id is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  if normalized_status = 'lista_para_enviar' then
    if not public.erp_can_access_pricing_quotation(
      'edit',
      normalized_status,
      quotation_pricing_owner_id
    ) then
      raise exception 'You do not have permission to complete the pricing proposal'
        using errcode = '42501';
    end if;
  elsif normalized_status = 'enviada' then
    if not public.erp_has_resource_access('crm.quotations', 'send_quote')
      or not public.erp_can_access_crm_quotation_resource(
        'crm.quotations.customer_actions',
        'edit',
        quotation_created_by,
        quotation_client_id
      ) then
      raise exception 'You do not have permission to send this quotation'
        using errcode = '42501';
    end if;
  elsif normalized_status in ('cancelada', 'rechazada', 'renegociar_tarifa', 'aceptada') then
    if not public.erp_can_access_crm_quotation_resource(
      'crm.quotations.customer_actions',
      'edit',
      quotation_created_by,
      quotation_client_id
    ) then
      raise exception 'You do not have permission to change this quotation status'
        using errcode = '42501';
    end if;
  elsif normalized_status = 'pendiente' then
    if not public.erp_can_access_crm_quotation_resource(
      'crm.quotations.record',
      'edit',
      quotation_created_by,
      quotation_client_id
    ) then
      raise exception 'You do not have permission to request pricing for this quotation'
        using errcode = '42501';
    end if;
  end if;

  update quotations
  set
    status = normalized_status,
    rejection_reason_id = case when normalized_status = 'rechazada' then p_rejection_reason_id else null end,
    rejection_notes = case
      when normalized_status in ('rechazada', 'renegociar_tarifa') then nullif(btrim(coalesce(p_rejection_notes, '')), '')
      else null
    end,
    cancellation_notes = case when normalized_status = 'cancelada' then nullif(btrim(coalesce(p_cancellation_notes, '')), '') else null end,
    target_rate = case when normalized_status = 'renegociar_tarifa' then p_target_rate else null end
  where id = p_quotation_id;

  if normalized_status = 'aceptada' then
    perform public.lock_quotation_exchange_rates(p_quotation_id, current_date);
  end if;

  perform public.refresh_quotation_cost_line_mxn(p_quotation_id, current_date);
  perform public.recalculate_quotation_totals(p_quotation_id);
end;
$$;

create or replace function create_quotation_cost_line(
  p_quotation_id uuid,
  p_quotation_option_id uuid default null,
  p_option_label text default null,
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
  quotation_pricing_owner_id uuid;
  quotation_status text;
  normalized_purchase_currency text;
  normalized_sale_currency text;
  resolved_option record;
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

  normalized_purchase_currency := public.normalize_currency_code(p_purchase_currency);
  normalized_sale_currency := public.normalize_currency_code(coalesce(p_sale_currency, p_purchase_currency));

  select *
  into resolved_option
  from public.ensure_quotation_option(
    p_quotation_id => p_quotation_id,
    p_quotation_option_id => p_quotation_option_id,
    p_option_label => p_option_label
  );

  insert into quotation_costs (
    quotation_id,
    quotation_option_id,
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
    resolved_option.id,
    resolved_option.option_label,
    p_provider_id,
    p_sales_accounting_concept_id,
    coalesce(concept_row.concept, 'Cargo'),
    coalesce(p_purchase_amount, 0),
    p_purchase_amount,
    normalized_purchase_currency,
    null,
    null,
    p_sale_amount,
    normalized_sale_currency,
    null,
    null,
    case
      when p_sale_amount is null or p_purchase_amount is null then null
      else p_sale_amount - p_purchase_amount
    end,
    null,
    coalesce(p_vat_rate, concept_row.vat_rate, 0),
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning id into new_line_id;

  perform public.refresh_quotation_cost_line_mxn(p_quotation_id, current_date);
  perform recalculate_quotation_totals(p_quotation_id);

  return new_line_id;
end;
$$;

create or replace function update_quotation_cost_line(
  p_id uuid,
  p_quotation_option_id uuid default null,
  p_option_label text default null,
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
  previous_option_id uuid;
  quotation_created_by uuid;
  quotation_pricing_owner_id uuid;
  quotation_client_id uuid;
  concept_row sales_accounting_concepts%rowtype;
  current_purchase_amount numeric;
  current_purchase_currency text;
  current_sale_amount numeric;
  current_sale_currency text;
  can_edit_pricing boolean := false;
  can_edit_sales boolean := false;
  normalized_purchase_currency text;
  normalized_sale_currency text;
  resolved_option record;
begin
  select quotation_id
  into quotation_id_value
  from quotation_costs
  where id = p_id;

  if quotation_id_value is null then
    raise exception 'Quotation cost line % not found', p_id;
  end if;

  select
    quotation_option_id,
    purchase_amount,
    purchase_currency,
    sale_amount,
    sale_currency
  into previous_option_id, current_purchase_amount, current_purchase_currency, current_sale_amount, current_sale_currency
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

  if p_quotation_option_id is not null or nullif(btrim(coalesce(p_option_label, '')), '') is not null then
    select *
    into resolved_option
    from public.ensure_quotation_option(
      p_quotation_id => quotation_id_value,
      p_quotation_option_id => p_quotation_option_id,
      p_option_label => p_option_label
    );
  end if;

  update quotation_costs
  set
    quotation_option_id = coalesce(resolved_option.id, quotation_option_id),
    option_label = coalesce(resolved_option.option_label, option_label),
    provider_id = p_provider_id,
    sales_accounting_concept_id = p_sales_accounting_concept_id,
    service_name = coalesce(concept_row.concept, service_name),
    cost = coalesce(p_purchase_amount, cost),
    purchase_amount = coalesce(p_purchase_amount, purchase_amount),
    purchase_currency = normalized_purchase_currency,
    purchase_exchange_rate_to_mxn = null,
    purchase_amount_mxn = null,
    sale_amount = coalesce(p_sale_amount, sale_amount),
    sale_currency = normalized_sale_currency,
    sale_exchange_rate_to_mxn = null,
    sale_amount_mxn = null,
    profit_amount = case
      when coalesce(p_sale_amount, current_sale_amount) is null
        or coalesce(p_purchase_amount, current_purchase_amount) is null then null
      else coalesce(p_sale_amount, current_sale_amount) - coalesce(p_purchase_amount, current_purchase_amount)
    end,
    profit_amount_mxn = null,
    vat_rate = coalesce(p_vat_rate, concept_row.vat_rate, vat_rate),
    notes = nullif(btrim(coalesce(p_notes, '')), '')
  where id = p_id;

  if previous_option_id is not null
    and previous_option_id <> coalesce(resolved_option.id, previous_option_id)
    and not exists (
      select 1
      from quotation_costs qc
      where qc.quotation_option_id = previous_option_id
    ) then
    delete from quotation_options
    where id = previous_option_id;
  end if;

  perform public.refresh_quotation_cost_line_mxn(quotation_id_value, current_date);
  perform recalculate_quotation_totals(quotation_id_value);
end;
$$;

create or replace function update_quotation_option_sales_amounts(
  p_quotation_id uuid,
  p_quotation_option_id uuid,
  p_sales_amounts jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
    sale_exchange_rate_to_mxn = null,
    sale_amount_mxn = null,
    profit_amount = case
      when updates.sale_amount is null or qc.purchase_amount is null then null
      else updates.sale_amount - qc.purchase_amount
    end,
    profit_amount_mxn = null
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
    and qc.quotation_option_id = p_quotation_option_id;

  perform public.refresh_quotation_cost_line_mxn(p_quotation_id, current_date);
  perform recalculate_quotation_totals(p_quotation_id);
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
  quotation_pricing_owner_id uuid;
  quotation_option_id_value uuid;
begin
  select
    quotation_id,
    quotation_option_id
  into quotation_id_value
    , quotation_option_id_value
  from quotation_costs
  where id = p_id;

  select q.pricing_owner_id
  into quotation_pricing_owner_id
  from quotations q
  where q.id = quotation_id_value;

  if quotation_id_value is null then
    raise exception 'Quotation cost line % not found', p_id;
  end if;

  if not public.erp_has_resource_access(
    'pricing.quotations.cost_section',
    'delete',
    quotation_pricing_owner_id,
    null
  ) then
    raise exception 'You do not have permission to delete quotation costs'
      using errcode = '42501';
  end if;

  delete from quotation_costs
  where id = p_id;

  if quotation_option_id_value is not null and not exists (
    select 1
    from quotation_costs qc
    where qc.quotation_option_id = quotation_option_id_value
  ) then
    delete from quotation_options
    where id = quotation_option_id_value;
  end if;

  if quotation_id_value is not null then
    perform public.refresh_quotation_cost_line_mxn(quotation_id_value, current_date);
    perform recalculate_quotation_totals(quotation_id_value);
  end if;
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
  pf.can_view_expected_profit,
  q.accepted_usd_rate_date,
  q.accepted_usd_to_mxn_rate,
  q.accepted_eur_rate_date,
  q.accepted_eur_to_mxn_rate,
  q.exchange_rates_locked_at
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
  pf.can_view_expected_profit,
  qc.quotation_option_id,
  qo.sort_order as option_sort_order,
  qo.include_in_customer_quote
from quotation_costs qc
join quotations q on q.id = qc.quotation_id
left join quotation_options qo on qo.id = qc.quotation_option_id
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
