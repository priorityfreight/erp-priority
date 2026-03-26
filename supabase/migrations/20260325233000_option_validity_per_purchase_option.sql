alter table if exists public.quotation_options
  add column if not exists purchase_valid_until date,
  add column if not exists sales_valid_until date,
  add column if not exists sales_validity_overridden boolean not null default false;

update public.quotation_options qo
set
  purchase_valid_until = coalesce(qo.purchase_valid_until, q.purchase_valid_until),
  sales_valid_until = coalesce(qo.sales_valid_until, q.sales_valid_until, q.purchase_valid_until, qo.purchase_valid_until),
  sales_validity_overridden = coalesce(
    qo.sales_validity_overridden,
    false
  ) or (
    q.sales_valid_until is not null
    and q.purchase_valid_until is not null
    and q.sales_valid_until <> q.purchase_valid_until
  )
from public.quotations q
where q.id = qo.quotation_id;

update public.quotation_options
set sales_valid_until = purchase_valid_until
where sales_valid_until is null
  and purchase_valid_until is not null;

drop function if exists public.ensure_quotation_option(uuid, uuid, text);

create or replace function public.ensure_quotation_option(
  p_quotation_id uuid,
  p_quotation_option_id uuid default null,
  p_option_label text default null
)
returns table (
  id uuid,
  option_label text,
  sort_order integer,
  include_in_customer_quote boolean,
  purchase_valid_until date,
  sales_valid_until date,
  sales_validity_overridden boolean
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
      qo.include_in_customer_quote,
      qo.purchase_valid_until,
      qo.sales_valid_until,
      qo.sales_validity_overridden
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
      qo.include_in_customer_quote,
      qo.purchase_valid_until,
      qo.sales_valid_until,
      qo.sales_validity_overridden
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
        existing_option.include_in_customer_quote,
        existing_option.purchase_valid_until,
        existing_option.sales_valid_until,
        existing_option.sales_validity_overridden;
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
    include_in_customer_quote,
    purchase_valid_until,
    sales_valid_until,
    sales_validity_overridden
  )
  values (
    p_quotation_id,
    coalesce(normalized_label, 'Opcion ' || next_sort_order),
    next_sort_order,
    true,
    null,
    null,
    false
  )
  returning
    quotation_options.id,
    quotation_options.option_label,
    quotation_options.sort_order,
    quotation_options.include_in_customer_quote,
    quotation_options.purchase_valid_until,
    quotation_options.sales_valid_until,
    quotation_options.sales_validity_overridden
  into existing_option;

  return query
  select
    existing_option.id,
    existing_option.option_label,
    existing_option.sort_order,
    existing_option.include_in_customer_quote,
    existing_option.purchase_valid_until,
    existing_option.sales_valid_until,
    existing_option.sales_validity_overridden;
end;
$$;

create or replace function public.update_quotation_option_validity(
  p_quotation_option_id uuid,
  p_purchase_valid_until date default null,
  p_sales_valid_until date default null,
  p_override_sales_valid_until boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_row record;
  can_edit_pricing boolean := false;
begin
  select
    q.id as quotation_id,
    q.pricing_owner_id,
    q.created_by,
    q.client_id,
    qo.purchase_valid_until,
    qo.sales_valid_until,
    qo.sales_validity_overridden
  into quotation_row
  from quotation_options qo
  join quotations q on q.id = qo.quotation_id
  where qo.id = p_quotation_option_id;

  if quotation_row is null then
    raise exception 'Quotation option % not found', p_quotation_option_id;
  end if;

  can_edit_pricing := public.erp_has_resource_access(
    'pricing.quotations.cost_section',
    'edit',
    quotation_row.pricing_owner_id,
    null
  );

  if p_purchase_valid_until is not null and not (can_edit_pricing or public.erp_is_admin()) then
    raise exception 'You do not have permission to edit purchase validity for this quotation option'
      using errcode = '42501';
  end if;

  if p_override_sales_valid_until and not public.erp_is_admin() then
    raise exception 'Only Admin may override quotation sales validity'
      using errcode = '42501';
  end if;

  if p_override_sales_valid_until and p_sales_valid_until is null then
    raise exception 'Sales validity is required when overriding quotation sales validity';
  end if;

  update quotation_options
  set
    purchase_valid_until = coalesce(p_purchase_valid_until, purchase_valid_until),
    sales_valid_until = case
      when p_override_sales_valid_until then p_sales_valid_until
      when p_purchase_valid_until is not null then p_purchase_valid_until
      else sales_valid_until
    end,
    sales_validity_overridden = case
      when p_override_sales_valid_until then true
      when p_purchase_valid_until is not null then false
      else sales_validity_overridden
    end,
    updated_at = now()
  where id = p_quotation_option_id;
end;
$$;

create or replace function public.search_quotations(
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
      null::date as purchase_valid_until,
      null::date as sales_valid_until,
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

create or replace function public.create_quotation_cost_line(
  p_quotation_id uuid,
  p_quotation_option_id uuid default null,
  p_option_label text default null,
  p_provider_id uuid default null,
  p_sales_accounting_concept_id uuid default null,
  p_purchase_amount numeric default null,
  p_purchase_currency text default 'USD',
  p_purchase_valid_until date default null,
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
  if p_purchase_valid_until is not null then
    perform public.update_quotation_option_validity(
      p_quotation_option_id => resolved_option.id,
      p_purchase_valid_until => p_purchase_valid_until,
      p_sales_valid_until => null,
      p_override_sales_valid_until => false
    );
  end if;
  perform recalculate_quotation_totals(p_quotation_id);

  return new_line_id;
end;
$$;

create or replace function public.update_quotation_cost_line(
  p_id uuid,
  p_quotation_option_id uuid default null,
  p_option_label text default null,
  p_provider_id uuid default null,
  p_sales_accounting_concept_id uuid default null,
  p_purchase_amount numeric default null,
  p_purchase_currency text default null,
  p_purchase_valid_until date default null,
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

  if p_purchase_valid_until is not null then
    perform public.update_quotation_option_validity(
      p_quotation_option_id => coalesce(resolved_option.id, previous_option_id),
      p_purchase_valid_until => p_purchase_valid_until,
      p_sales_valid_until => null,
      p_override_sales_valid_until => false
    );
  end if;

  perform public.refresh_quotation_cost_line_mxn(quotation_id_value, current_date);
  perform recalculate_quotation_totals(quotation_id_value);
end;
$$;

create or replace view public.quotation_summary_view as
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
  null::date as purchase_valid_until,
  null::date as sales_valid_until,
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

create or replace view public.quotation_cost_line_secure_view as
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
  qo.include_in_customer_quote,
  qo.purchase_valid_until as option_purchase_valid_until,
  qo.sales_valid_until as option_sales_valid_until,
  qo.sales_validity_overridden as option_sales_validity_overridden
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
