drop function if exists public.create_quotation_cost_line(
  uuid,
  uuid,
  text,
  uuid,
  uuid,
  numeric,
  text,
  numeric,
  text,
  numeric,
  text
);

drop function if exists public.update_quotation_cost_line(
  uuid,
  uuid,
  text,
  uuid,
  uuid,
  numeric,
  text,
  numeric,
  text,
  numeric,
  text
);

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

  perform public.recalculate_quotation_totals(p_quotation_id);

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
  perform public.recalculate_quotation_totals(quotation_id_value);
end;
$$;
