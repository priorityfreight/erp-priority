create or replace function save_quotation_purchase_option(
  p_quotation_id uuid,
  p_quotation_option_id uuid default null,
  p_option_label text default null,
  p_purchase_valid_until date default null,
  p_lines jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_pricing_owner_id uuid;
  quotation_status text;
  resolved_option record;
  line_item jsonb;
  line_id uuid;
  concept_row sales_accounting_concepts%rowtype;
  normalized_purchase_currency text;
  current_sale_amount numeric;
  current_sale_currency text;
  saved_line_id uuid;
  kept_ids uuid[] := array[]::uuid[];
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
    case when p_quotation_option_id is null then 'create' else 'edit' end,
    quotation_pricing_owner_id,
    null
  ) then
    raise exception 'You do not have permission to save quotation purchase options'
      using errcode = '42501';
  end if;

  if not public.erp_can_edit_quotation_purchase_amount() then
    raise exception 'You do not have permission to edit quotation cost'
      using errcode = '42501';
  end if;

  if jsonb_typeof(coalesce(p_lines, '[]'::jsonb)) <> 'array' then
    raise exception 'p_lines must be a JSON array';
  end if;

  if jsonb_array_length(coalesce(p_lines, '[]'::jsonb)) = 0 then
    raise exception 'At least one purchase line is required';
  end if;

  select *
  into resolved_option
  from public.ensure_quotation_option(
    p_quotation_id => p_quotation_id,
    p_quotation_option_id => p_quotation_option_id,
    p_option_label => p_option_label
  );

  for line_item in
    select value
    from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  loop
    line_id := null;
    concept_row := null;
    current_sale_amount := null;
    current_sale_currency := null;

    if nullif(btrim(coalesce(line_item ->> 'id', '')), '') is not null then
      line_id := (line_item ->> 'id')::uuid;
    end if;

    if nullif(btrim(coalesce(line_item ->> 'provider_id', '')), '') is null then
      raise exception 'Each purchase line must include provider_id';
    end if;

    if nullif(btrim(coalesce(line_item ->> 'sales_accounting_concept_id', '')), '') is null then
      raise exception 'Each purchase line must include sales_accounting_concept_id';
    end if;

    select *
    into concept_row
    from sales_accounting_concepts
    where id = (line_item ->> 'sales_accounting_concept_id')::uuid;

    if not found then
      raise exception 'Sales accounting concept % not found', line_item ->> 'sales_accounting_concept_id';
    end if;

    normalized_purchase_currency := public.normalize_currency_code(
      coalesce(line_item ->> 'purchase_currency', 'MXN')
    );

    if line_id is null then
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
        (line_item ->> 'provider_id')::uuid,
        (line_item ->> 'sales_accounting_concept_id')::uuid,
        coalesce(concept_row.concept, 'Cargo'),
        coalesce((line_item ->> 'purchase_amount')::numeric, 0),
        (line_item ->> 'purchase_amount')::numeric,
        normalized_purchase_currency,
        null,
        null,
        null,
        normalized_purchase_currency,
        null,
        null,
        null,
        null,
        coalesce((line_item ->> 'vat_rate')::numeric, concept_row.vat_rate, 0),
        nullif(btrim(coalesce(line_item ->> 'notes', '')), '')
      )
      returning id into saved_line_id;
    else
      select
        qc.sale_amount,
        qc.sale_currency
      into current_sale_amount, current_sale_currency
      from quotation_costs qc
      where qc.id = line_id
        and qc.quotation_id = p_quotation_id;

      if not found then
        raise exception 'Quotation cost line % not found for quotation %', line_id, p_quotation_id;
      end if;

      update quotation_costs
      set
        quotation_option_id = resolved_option.id,
        option_label = resolved_option.option_label,
        provider_id = (line_item ->> 'provider_id')::uuid,
        sales_accounting_concept_id = (line_item ->> 'sales_accounting_concept_id')::uuid,
        service_name = coalesce(concept_row.concept, service_name),
        cost = coalesce((line_item ->> 'purchase_amount')::numeric, 0),
        purchase_amount = (line_item ->> 'purchase_amount')::numeric,
        purchase_currency = normalized_purchase_currency,
        purchase_exchange_rate_to_mxn = null,
        purchase_amount_mxn = null,
        sale_amount = current_sale_amount,
        sale_currency = coalesce(current_sale_currency, normalized_purchase_currency),
        sale_exchange_rate_to_mxn = null,
        sale_amount_mxn = null,
        profit_amount = case
          when current_sale_amount is null or (line_item ->> 'purchase_amount')::numeric is null then null
          else current_sale_amount - (line_item ->> 'purchase_amount')::numeric
        end,
        profit_amount_mxn = null,
        vat_rate = coalesce((line_item ->> 'vat_rate')::numeric, concept_row.vat_rate, 0),
        notes = nullif(btrim(coalesce(line_item ->> 'notes', '')), '')
      where id = line_id;

      saved_line_id := line_id;
    end if;

    kept_ids := array_append(kept_ids, saved_line_id);
  end loop;

  if p_quotation_option_id is not null then
    delete from quotation_costs qc
    where qc.quotation_option_id = resolved_option.id
      and not (qc.id = any(kept_ids));
  end if;

  if p_purchase_valid_until is not null then
    perform public.update_quotation_option_validity(
      p_quotation_option_id => resolved_option.id,
      p_purchase_valid_until => p_purchase_valid_until,
      p_sales_valid_until => null,
      p_override_sales_valid_until => false
    );
  end if;

  perform public.refresh_quotation_cost_line_mxn(p_quotation_id, current_date);
  perform public.recalculate_quotation_totals(p_quotation_id);

  return resolved_option.id;
end;
$$;
