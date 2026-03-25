create or replace function erp_can_view_quotation_cost()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.erp_has_field_access('crm.quotations.record', 'cost', 'view')
    or public.erp_has_field_access('pricing.quotations.cost_section', 'purchase_amount', 'view');
$$;

create or replace function erp_can_edit_quotation_purchase_amount()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.erp_has_field_access('pricing.quotations.cost_section', 'purchase_amount', 'edit');
$$;

create or replace function erp_can_view_quotation_sale_price()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.erp_has_field_access('crm.quotations.record', 'sale_price', 'view')
    or public.erp_has_field_access('pricing.quotations.cost_section', 'sale_amount', 'view');
$$;

create or replace function erp_can_edit_quotation_sale_price()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.erp_has_field_access('crm.quotations.record', 'sale_price', 'edit')
    or public.erp_has_field_access('pricing.quotations.cost_section', 'sale_amount', 'edit');
$$;

create or replace function erp_can_view_quotation_expected_profit()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.erp_has_field_access('crm.quotations.record', 'expected_profit', 'view')
    or public.erp_has_field_access('pricing.quotations.cost_section', 'profit_amount', 'view');
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
where c.is_deleted = false;

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
  case when pf.can_view_sale_price then qc.sale_amount else null end as sale_amount,
  case when pf.can_view_expected_profit then qc.profit_amount else null end as profit_amount,
  qc.vat_rate,
  qc.currency,
  qc.notes,
  qc.created_at,
  pf.can_view_cost,
  pf.can_edit_purchase_amount,
  pf.can_view_sale_price,
  pf.can_edit_sale_price,
  pf.can_view_expected_profit
from quotation_costs qc
left join providers p on p.id = qc.provider_id
left join sales_accounting_concepts sac on sac.id = qc.sales_accounting_concept_id
cross join permission_flags pf;

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
        p.normalized_scope = 'crm'
        or (
          p.normalized_scope = 'pricing'
          and q.status in ('pendiente', 'cotizando', 'lista_para_enviar', 'renegociar_tarifa')
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
  if not public.erp_has_resource_access('pricing.quotations.cost_section', 'create') then
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
  current_purchase_amount numeric;
  current_sale_amount numeric;
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

  if not public.erp_has_resource_access('pricing.quotations.cost_section', 'edit')
    and not public.erp_has_resource_access('crm.quotations.record', 'edit') then
    raise exception 'You do not have permission to update quotation costs'
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
  normalized_option_label text := coalesce(nullif(btrim(coalesce(p_option_label, '')), ''), 'Opcion 1');
begin
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

  perform recalculate_quotation_totals(p_quotation_id);
end;
$$;

delete from role_field_permissions rfp
using roles r, permission_fields pf, permission_resources pr, permission_actions pa
where rfp.role_id = r.id
  and rfp.field_id = pf.id
  and pf.resource_id = pr.id
  and rfp.action_id = pa.id
  and r.name = 'Pricing'
  and pr.resource_key = 'pricing.quotations.cost_section'
  and pf.field_key = 'sale_amount'
  and pa.code = 'view';

grant execute on function public.erp_can_view_quotation_cost() to authenticated;
grant execute on function public.erp_can_edit_quotation_purchase_amount() to authenticated;
grant execute on function public.erp_can_view_quotation_sale_price() to authenticated;
grant execute on function public.erp_can_edit_quotation_sale_price() to authenticated;
grant execute on function public.erp_can_view_quotation_expected_profit() to authenticated;
