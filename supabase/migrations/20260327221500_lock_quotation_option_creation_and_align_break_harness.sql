create or replace function ensure_quotation_option(
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
  perform 1
  from quotations q
  where q.id = p_quotation_id
  for update;

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
