create or replace function public.erp_can_access_client_resource(
  p_resource_key text,
  p_action_code text default 'view',
  p_client_id uuid default null
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  client_owner_id uuid;
  client_branch_id uuid;
begin
  if p_client_id is null then
    return false;
  end if;

  select
    c.account_owner_id,
    c.branch_id
  into client_owner_id, client_branch_id
  from public.clients c
  where c.id = p_client_id
    and c.is_deleted = false;

  if not found then
    return false;
  end if;

  return public.erp_has_resource_access(
    p_resource_key,
    p_action_code,
    client_owner_id,
    client_branch_id
  );
end;
$$;

create or replace function public.erp_can_access_crm_quotation_resource(
  p_resource_key text,
  p_action_code text default 'view',
  p_created_by uuid default null,
  p_client_id uuid default null
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  client_branch_id uuid;
begin
  if p_client_id is not null then
    select c.branch_id
    into client_branch_id
    from public.clients c
    where c.id = p_client_id
      and c.is_deleted = false;
  end if;

  return public.erp_has_resource_access(
    p_resource_key,
    p_action_code,
    p_created_by,
    client_branch_id
  );
end;
$$;

create or replace function public.erp_can_access_pricing_quotation(
  p_action_code text default 'view',
  p_status text default null,
  p_pricing_owner_id uuid default null
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  normalized_action text := lower(coalesce(btrim(p_action_code), 'view'));
  normalized_status text := lower(coalesce(btrim(p_status), ''));
begin
  if normalized_action = 'pricing_take' then
    return normalized_status in ('pendiente', 'renegociar_tarifa')
      and public.erp_has_resource_access('pricing.quotations', 'pricing_take');
  end if;

  if normalized_action = 'view' and normalized_status in ('pendiente', 'renegociar_tarifa') then
    return public.erp_has_resource_access('pricing.quotations.queue', 'view');
  end if;

  if normalized_action = 'view' then
    return public.erp_has_resource_access(
      'pricing.quotations.workspace',
      'view',
      p_pricing_owner_id,
      null
    );
  end if;

  return public.erp_has_resource_access(
    'pricing.quotations.workspace',
    normalized_action,
    p_pricing_owner_id,
    null
  );
end;
$$;

create or replace function public.erp_can_access_operations_shipment(
  p_action_code text default 'view',
  p_client_id uuid default null
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  client_branch_id uuid;
begin
  if p_client_id is null then
    return false;
  end if;

  select c.branch_id
  into client_branch_id
  from public.clients c
  where c.id = p_client_id
    and c.is_deleted = false;

  if not found then
    return false;
  end if;

  return public.erp_has_resource_access(
    'operations.shipments.record',
    p_action_code,
    null,
    client_branch_id
  );
end;
$$;

create or replace function public.request_quotation_pricing(
  p_quotation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_created_by uuid;
  quotation_client_id uuid;
begin
  select
    q.created_by,
    q.client_id
  into quotation_created_by, quotation_client_id
  from quotations q
  where q.id = p_quotation_id;

  if quotation_client_id is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  if not public.erp_can_access_crm_quotation_resource(
    'crm.quotations.record',
    'edit',
    quotation_created_by,
    quotation_client_id
  ) then
    raise exception 'You do not have permission to send this quotation to pricing'
      using errcode = '42501';
  end if;

  update quotations
  set status = 'pendiente'
  where id = p_quotation_id;
end;
$$;

create or replace function public.take_quotation_for_pricing(
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
  current_status text;
begin
  resolved_pricing_owner_id := coalesce(p_pricing_owner_id, public.erp_current_user_id());

  if resolved_pricing_owner_id is null then
    raise exception 'Pricing owner is required';
  end if;

  select q.status
  into current_status
  from quotations q
  where q.id = p_quotation_id;

  if current_status is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  if not public.erp_can_access_pricing_quotation(
    'pricing_take',
    current_status,
    null
  ) then
    raise exception 'You do not have permission to take this quotation'
      using errcode = '42501';
  end if;

  update quotations
  set
    pricing_owner_id = resolved_pricing_owner_id,
    status = 'cotizando'
  where id = p_quotation_id;
end;
$$;

create or replace function public.update_quotation_status(
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
  commodities text,
  quantity integer,
  weight numeric,
  volume numeric,
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
      q.commodities,
      q.quantity,
      q.weight,
      q.volume,
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
    filtered.commodities,
    filtered.quantity,
    filtered.weight,
    filtered.volume,
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
  quotation_pricing_owner_id uuid;
  quotation_status text;
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

  perform public.recalculate_quotation_totals(p_quotation_id);

  return new_line_id;
end;
$$;

create or replace function public.update_quotation_cost_line(
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
  quotation_created_by uuid;
  quotation_pricing_owner_id uuid;
  quotation_client_id uuid;
  concept_row sales_accounting_concepts%rowtype;
  current_purchase_amount numeric;
  current_sale_amount numeric;
  can_edit_pricing boolean := false;
  can_edit_sales boolean := false;
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
    sale_amount
  into current_purchase_amount, current_sale_amount
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

  update quotation_costs
  set
    option_label = coalesce(nullif(btrim(coalesce(p_option_label, '')), ''), option_label),
    provider_id = p_provider_id,
    sales_accounting_concept_id = p_sales_accounting_concept_id,
    service_name = coalesce(concept_row.concept, service_name),
    cost = coalesce(p_purchase_amount, cost),
    purchase_amount = coalesce(p_purchase_amount, purchase_amount),
    sale_amount = coalesce(p_sale_amount, sale_amount),
    profit_amount = case
      when coalesce(p_sale_amount, current_sale_amount) is null
        or coalesce(p_purchase_amount, current_purchase_amount) is null then null
      else coalesce(p_sale_amount, current_sale_amount) - coalesce(p_purchase_amount, current_purchase_amount)
    end,
    vat_rate = coalesce(p_vat_rate, concept_row.vat_rate, vat_rate),
    notes = nullif(btrim(coalesce(p_notes, '')), '')
  where id = p_id;

  perform public.recalculate_quotation_totals(quotation_id_value);
end;
$$;

create or replace function public.update_quotation_option_sales_amounts(
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
  normalized_option_label text := coalesce(nullif(btrim(coalesce(p_option_label, '')), ''), 'Opcion 1');
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
    profit_amount = case
      when updates.sale_amount is null or qc.purchase_amount is null then null
      else updates.sale_amount - qc.purchase_amount
    end
  from (
    select
      key::uuid as line_id,
      nullif(btrim(value), '')::numeric as sale_amount
    from jsonb_each_text(p_sales_amounts)
  ) as updates
  where qc.id = updates.line_id
    and qc.quotation_id = p_quotation_id
    and qc.option_label = normalized_option_label;

  perform public.recalculate_quotation_totals(p_quotation_id);
end;
$$;

create or replace function public.delete_quotation_cost_line(
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
begin
  select quotation_id
  into quotation_id_value
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

  if quotation_id_value is not null then
    perform public.recalculate_quotation_totals(quotation_id_value);
  end if;
end;
$$;

create or replace function public.create_quotation_cargo_line(
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
  quotation_created_by uuid;
  quotation_client_id uuid;
begin
  select
    q.created_by,
    q.client_id
  into quotation_created_by, quotation_client_id
  from quotations q
  where q.id = p_quotation_id;

  if quotation_client_id is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  if not public.erp_can_access_crm_quotation_resource(
    'crm.quotations.record',
    'edit',
    quotation_created_by,
    quotation_client_id
  ) then
    raise exception 'You do not have permission to edit quotation cargo lines'
      using errcode = '42501';
  end if;

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

create or replace function public.update_quotation_cargo_line(
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
declare
  quotation_created_by uuid;
  quotation_client_id uuid;
begin
  select
    q.created_by,
    q.client_id
  into quotation_created_by, quotation_client_id
  from quotations q
  join quotation_cargo_lines qcl on qcl.quotation_id = q.id
  where qcl.id = p_id;

  if quotation_client_id is null then
    raise exception 'Quotation cargo line % not found', p_id;
  end if;

  if not public.erp_can_access_crm_quotation_resource(
    'crm.quotations.record',
    'edit',
    quotation_created_by,
    quotation_client_id
  ) then
    raise exception 'You do not have permission to edit quotation cargo lines'
      using errcode = '42501';
  end if;

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

create or replace function public.delete_quotation_cargo_line(
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_created_by uuid;
  quotation_client_id uuid;
begin
  select
    q.created_by,
    q.client_id
  into quotation_created_by, quotation_client_id
  from quotations q
  join quotation_cargo_lines qcl on qcl.quotation_id = q.id
  where qcl.id = p_id;

  if quotation_client_id is null then
    raise exception 'Quotation cargo line % not found', p_id;
  end if;

  if not public.erp_can_access_crm_quotation_resource(
    'crm.quotations.record',
    'edit',
    quotation_created_by,
    quotation_client_id
  ) then
    raise exception 'You do not have permission to delete quotation cargo lines'
      using errcode = '42501';
  end if;

  delete from quotation_cargo_lines
  where id = p_id;
end;
$$;

create or replace function public.create_booking_from_quotation(
  p_quotation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status text;
  quotation_created_by uuid;
  quotation_client_id uuid;
  shipment_id uuid;
begin
  select
    q.status,
    q.created_by,
    q.client_id
  into current_status, quotation_created_by, quotation_client_id
  from quotations q
  where q.id = p_quotation_id;

  if current_status is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  if not public.erp_has_resource_access('crm.quotations', 'create_booking')
    or not public.erp_can_access_crm_quotation_resource(
      'crm.quotations.customer_actions',
      'edit',
      quotation_created_by,
      quotation_client_id
    ) then
    raise exception 'You do not have permission to create a booking from this quotation'
      using errcode = '42501';
  end if;

  if current_status <> 'aceptada' then
    raise exception 'Quotation % must be aceptada before booking', p_quotation_id;
  end if;

  shipment_id := public.create_shipment(p_quotation_id);
  return shipment_id;
end;
$$;

drop policy if exists "active_select_quotations" on public.quotations;
drop policy if exists "active_update_quotations" on public.quotations;
drop policy if exists "active_delete_quotations" on public.quotations;
drop policy if exists "active_select_quotation_costs" on public.quotation_costs;
drop policy if exists "active_insert_quotation_costs" on public.quotation_costs;
drop policy if exists "active_update_quotation_costs" on public.quotation_costs;
drop policy if exists "active_delete_quotation_costs" on public.quotation_costs;
drop policy if exists "active_select_quotation_cargo_lines" on public.quotation_cargo_lines;
drop policy if exists "active_insert_quotation_cargo_lines" on public.quotation_cargo_lines;
drop policy if exists "active_update_quotation_cargo_lines" on public.quotation_cargo_lines;
drop policy if exists "active_delete_quotation_cargo_lines" on public.quotation_cargo_lines;
drop policy if exists "active_select_shipments" on public.shipments;
drop policy if exists "active_insert_shipments" on public.shipments;
drop policy if exists "active_update_shipments" on public.shipments;
drop policy if exists "active_delete_shipments" on public.shipments;
drop policy if exists "active_select_shipment_events" on public.shipment_events;
drop policy if exists "active_insert_shipment_events" on public.shipment_events;
drop policy if exists "active_update_shipment_events" on public.shipment_events;
drop policy if exists "active_delete_shipment_events" on public.shipment_events;

create policy "active_select_quotations"
on public.quotations
for select
using (
  public.erp_can_access_crm_quotation_resource(
    'crm.quotations.record',
    'view',
    created_by,
    client_id
  )
  or public.erp_can_access_pricing_quotation(
    'view',
    status,
    pricing_owner_id
  )
  or public.erp_can_access_operations_shipment(
    'view',
    client_id
  )
);

create policy "active_update_quotations"
on public.quotations
for update
using (
  public.erp_can_access_crm_quotation_resource(
    'crm.quotations.record',
    'edit',
    created_by,
    client_id
  )
  or public.erp_can_access_crm_quotation_resource(
    'crm.quotations.customer_actions',
    'edit',
    created_by,
    client_id
  )
  or public.erp_can_access_pricing_quotation(
    'edit',
    status,
    pricing_owner_id
  )
)
with check (
  public.erp_can_access_crm_quotation_resource(
    'crm.quotations.record',
    'edit',
    created_by,
    client_id
  )
  or public.erp_can_access_crm_quotation_resource(
    'crm.quotations.customer_actions',
    'edit',
    created_by,
    client_id
  )
  or public.erp_can_access_pricing_quotation(
    'edit',
    status,
    pricing_owner_id
  )
);

create policy "active_delete_quotations"
on public.quotations
for delete
using (
  public.erp_can_access_crm_quotation_resource(
    'crm.quotations.record',
    'delete',
    created_by,
    client_id
  )
);

create policy "active_select_quotation_costs"
on public.quotation_costs
for select
using (
  exists (
    select 1
    from public.quotations q
    where q.id = quotation_costs.quotation_id
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

create policy "active_insert_quotation_costs"
on public.quotation_costs
for insert
with check (
  exists (
    select 1
    from public.quotations q
    where q.id = quotation_costs.quotation_id
      and public.erp_has_resource_access(
        'pricing.quotations.cost_section',
        'create',
        q.pricing_owner_id,
        null
      )
  )
);

create policy "active_update_quotation_costs"
on public.quotation_costs
for update
using (
  exists (
    select 1
    from public.quotations q
    where q.id = quotation_costs.quotation_id
      and public.erp_has_resource_access(
        'pricing.quotations.cost_section',
        'edit',
        q.pricing_owner_id,
        null
      )
  )
)
with check (
  exists (
    select 1
    from public.quotations q
    where q.id = quotation_costs.quotation_id
      and public.erp_has_resource_access(
        'pricing.quotations.cost_section',
        'edit',
        q.pricing_owner_id,
        null
      )
  )
);

create policy "active_delete_quotation_costs"
on public.quotation_costs
for delete
using (
  exists (
    select 1
    from public.quotations q
    where q.id = quotation_costs.quotation_id
      and public.erp_has_resource_access(
        'pricing.quotations.cost_section',
        'delete',
        q.pricing_owner_id,
        null
      )
  )
);

create policy "active_select_quotation_cargo_lines"
on public.quotation_cargo_lines
for select
using (
  exists (
    select 1
    from public.quotations q
    where q.id = quotation_cargo_lines.quotation_id
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
      )
  )
);

create policy "active_insert_quotation_cargo_lines"
on public.quotation_cargo_lines
for insert
with check (
  exists (
    select 1
    from public.quotations q
    where q.id = quotation_cargo_lines.quotation_id
      and public.erp_can_access_crm_quotation_resource(
        'crm.quotations.record',
        'edit',
        q.created_by,
        q.client_id
      )
  )
);

create policy "active_update_quotation_cargo_lines"
on public.quotation_cargo_lines
for update
using (
  exists (
    select 1
    from public.quotations q
    where q.id = quotation_cargo_lines.quotation_id
      and public.erp_can_access_crm_quotation_resource(
        'crm.quotations.record',
        'edit',
        q.created_by,
        q.client_id
      )
  )
)
with check (
  exists (
    select 1
    from public.quotations q
    where q.id = quotation_cargo_lines.quotation_id
      and public.erp_can_access_crm_quotation_resource(
        'crm.quotations.record',
        'edit',
        q.created_by,
        q.client_id
      )
  )
);

create policy "active_delete_quotation_cargo_lines"
on public.quotation_cargo_lines
for delete
using (
  exists (
    select 1
    from public.quotations q
    where q.id = quotation_cargo_lines.quotation_id
      and public.erp_can_access_crm_quotation_resource(
        'crm.quotations.record',
        'delete',
        q.created_by,
        q.client_id
      )
  )
);

create policy "active_select_shipments"
on public.shipments
for select
using (
  public.erp_can_access_operations_shipment(
    'view',
    client_id
  )
  or public.erp_can_access_crm_quotation_resource(
    'crm.quotations.customer_actions',
    'view',
    (
      select q.created_by
      from public.quotations q
      where q.id = shipments.quotation_id
    ),
    client_id
  )
);

create policy "active_insert_shipments"
on public.shipments
for insert
with check (
  public.erp_can_access_operations_shipment(
    'create',
    client_id
  )
);

create policy "active_update_shipments"
on public.shipments
for update
using (
  public.erp_can_access_operations_shipment(
    'edit',
    client_id
  )
)
with check (
  public.erp_can_access_operations_shipment(
    'edit',
    client_id
  )
);

create policy "active_delete_shipments"
on public.shipments
for delete
using (
  public.erp_can_access_operations_shipment(
    'delete',
    client_id
  )
);

create policy "active_select_shipment_events"
on public.shipment_events
for select
using (
  exists (
    select 1
    from public.shipments s
    where s.id = shipment_events.shipment_id
      and public.erp_can_access_operations_shipment(
        'view',
        s.client_id
      )
  )
);

create policy "active_insert_shipment_events"
on public.shipment_events
for insert
with check (
  exists (
    select 1
    from public.shipments s
    where s.id = shipment_events.shipment_id
      and public.erp_can_access_operations_shipment(
        'create',
        s.client_id
      )
  )
);

create policy "active_update_shipment_events"
on public.shipment_events
for update
using (
  exists (
    select 1
    from public.shipments s
    where s.id = shipment_events.shipment_id
      and public.erp_can_access_operations_shipment(
        'edit',
        s.client_id
      )
  )
)
with check (
  exists (
    select 1
    from public.shipments s
    where s.id = shipment_events.shipment_id
      and public.erp_can_access_operations_shipment(
        'edit',
        s.client_id
      )
  )
);

create policy "active_delete_shipment_events"
on public.shipment_events
for delete
using (
  exists (
    select 1
    from public.shipments s
    where s.id = shipment_events.shipment_id
      and public.erp_can_access_operations_shipment(
        'delete',
        s.client_id
      )
  )
);

grant execute on function public.erp_can_access_client_resource(text, text, uuid) to authenticated;
grant execute on function public.erp_can_access_crm_quotation_resource(text, text, uuid, uuid) to authenticated;
grant execute on function public.erp_can_access_pricing_quotation(text, text, uuid) to authenticated;
grant execute on function public.erp_can_access_operations_shipment(text, uuid) to authenticated;

with desired_scope_updates as (
  select *
  from (
    values
      ('Ventas', 'crm.quotations.list', 'view', 'owner_only', true),
      ('Ventas', 'crm.quotations.record', 'view', 'owner_only', true),
      ('Ventas', 'crm.quotations.record', 'edit', 'owner_only', true),
      ('Ventas', 'crm.quotations.pricing_options', 'view', 'owner_only', true),
      ('Ventas', 'crm.quotations.customer_actions', 'view', 'owner_only', true),
      ('Ventas', 'crm.quotations.customer_actions', 'edit', 'owner_only', true),
      ('Pricing', 'pricing.quotations.workspace', 'view', 'owner_only', true),
      ('Pricing', 'pricing.quotations.workspace', 'edit', 'owner_only', true),
      ('Pricing', 'pricing.quotations.cost_section', 'view', 'owner_only', true),
      ('Pricing', 'pricing.quotations.cost_section', 'create', 'owner_only', true),
      ('Pricing', 'pricing.quotations.cost_section', 'edit', 'owner_only', true),
      ('Pricing', 'pricing.quotations.cost_section', 'delete', 'owner_only', true),
      ('Operaciones', 'operations.shipments.record', 'view', 'assigned_branch_only', true),
      ('Operaciones', 'operations.shipments.record', 'create', 'assigned_branch_only', true),
      ('Operaciones', 'operations.shipments.record', 'edit', 'assigned_branch_only', true),
      ('Operaciones', 'operations.shipments.record', 'delete', 'assigned_branch_only', true)
  ) as t(role_name, resource_key, action_code, condition_code, allowed)
)
insert into public.role_resource_permissions (
  role_id,
  resource_id,
  action_id,
  condition_id,
  allowed
)
select
  r.id,
  pr.id,
  pa.id,
  pc.id,
  dsu.allowed
from desired_scope_updates dsu
join public.roles r
  on r.name = dsu.role_name
join public.permission_resources pr
  on pr.resource_key = dsu.resource_key
join public.permission_actions pa
  on pa.code = dsu.action_code
 and pa.scope_type in ('resource', 'both')
join public.permission_conditions pc
  on pc.code = dsu.condition_code
on conflict (role_id, resource_id, action_id) do update
set
  condition_id = excluded.condition_id,
  allowed = excluded.allowed;
