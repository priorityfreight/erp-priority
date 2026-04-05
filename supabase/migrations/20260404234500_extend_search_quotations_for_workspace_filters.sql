create or replace function public.search_quotations(
  p_scope text default 'crm',
  p_query text default null,
  p_status text default null,
  p_limit integer default 25,
  p_offset integer default 0,
  p_pricing_owner_id uuid default null,
  p_service_type text default null,
  p_transport_type text default null,
  p_only_mine boolean default false,
  p_filters jsonb default '{}'::jsonb,
  p_sort jsonb default '{}'::jsonb
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
      p_pricing_owner_id as normalized_pricing_owner_id,
      nullif(btrim(p_service_type), '') as normalized_service_type,
      nullif(btrim(p_transport_type), '') as normalized_transport_type,
      coalesce(p_only_mine, false) as normalized_only_mine,
      coalesce(p_filters, '{}'::jsonb) as normalized_filters,
      case
        when lower(coalesce(p_sort ->> 'columnId', '')) in (
          'created_at',
          'required_quote_date',
          'reference_number',
          'client_name',
          'opportunity_title',
          'origin',
          'destination',
          'salesperson_name',
          'pricing_owner_name',
          'status',
          'service_type',
          'transport_type',
          'expected_profit'
        ) then lower(p_sort ->> 'columnId')
        else null
      end as normalized_sort_column,
      case
        when lower(coalesce(p_sort ->> 'direction', '')) in ('asc', 'desc')
          then lower(p_sort ->> 'direction')
        else null
      end as normalized_sort_direction,
      public.erp_current_user_id() as current_user_id
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
      null::text as commodities,
      null::integer as quantity,
      null::numeric as weight,
      null::numeric as volume,
      q.required_quote_date,
      q.purchase_valid_until,
      q.sales_valid_until,
      q.rejection_reason_id,
      rr.reason as rejection_reason,
      q.rejection_notes,
      q.cancellation_notes,
      q.target_rate,
      q.currency,
      q.estimated_cost,
      q.estimated_price,
      q.expected_profit,
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
        p.normalized_pricing_owner_id is null
        or q.pricing_owner_id = p.normalized_pricing_owner_id
      )
      and (
        p.normalized_service_type is null
        or q.service_type = p.normalized_service_type
      )
      and (
        p.normalized_transport_type is null
        or q.transport_type = p.normalized_transport_type
      )
      and (
        p.normalized_only_mine = false
        or (
          p.current_user_id is not null
          and q.pricing_owner_id = p.current_user_id
        )
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
      and not exists (
        select 1
        from jsonb_array_elements(coalesce(p.normalized_filters -> 'columnFilters', '[]'::jsonb)) as filter_rule(rule)
        where not (
          case coalesce(filter_rule.rule ->> 'column', '')
            when 'created_at' then
              (
                coalesce(nullif(filter_rule.rule ->> 'value', ''), '') = ''
                or q.created_at::date >= (filter_rule.rule ->> 'value')::date
              )
              and (
                coalesce(nullif(filter_rule.rule ->> 'valueTo', ''), '') = ''
                or q.created_at::date <= (filter_rule.rule ->> 'valueTo')::date
              )
            when 'required_quote_date' then
              (
                coalesce(nullif(filter_rule.rule ->> 'value', ''), '') = ''
                or q.required_quote_date >= (filter_rule.rule ->> 'value')::date
              )
              and (
                coalesce(nullif(filter_rule.rule ->> 'valueTo', ''), '') = ''
                or q.required_quote_date <= (filter_rule.rule ->> 'valueTo')::date
              )
            when 'expected_profit' then
              (
                coalesce(nullif(filter_rule.rule ->> 'value', ''), '') = ''
                or (
                  (filter_rule.rule ->> 'value') ~ '^-?[0-9]+(\.[0-9]+)?$'
                  and coalesce(q.expected_profit, 0) >= (filter_rule.rule ->> 'value')::numeric
                )
              )
              and (
                coalesce(nullif(filter_rule.rule ->> 'valueTo', ''), '') = ''
                or (
                  (filter_rule.rule ->> 'valueTo') ~ '^-?[0-9]+(\.[0-9]+)?$'
                  and coalesce(q.expected_profit, 0) <= (filter_rule.rule ->> 'valueTo')::numeric
                )
              )
            when 'status' then
              coalesce(nullif(filter_rule.rule ->> 'value', ''), '') = ''
              or lower(coalesce(q.status, '')) = lower(filter_rule.rule ->> 'value')
            when 'reference_number' then
              coalesce(nullif(filter_rule.rule ->> 'value', ''), '') = ''
              or lower(coalesce(q.reference_number, '')) ilike '%' || lower(filter_rule.rule ->> 'value') || '%'
            when 'client_name' then
              coalesce(nullif(filter_rule.rule ->> 'value', ''), '') = ''
              or lower(coalesce(c.company_name, '')) ilike '%' || lower(filter_rule.rule ->> 'value') || '%'
            when 'opportunity_title' then
              coalesce(nullif(filter_rule.rule ->> 'value', ''), '') = ''
              or lower(coalesce(o.title, '')) ilike '%' || lower(filter_rule.rule ->> 'value') || '%'
            when 'origin' then
              coalesce(nullif(filter_rule.rule ->> 'value', ''), '') = ''
              or lower(concat_ws(' ', coalesce(q.origin_unlocode, ''), coalesce(q.origin, '')))
                ilike '%' || lower(filter_rule.rule ->> 'value') || '%'
            when 'destination' then
              coalesce(nullif(filter_rule.rule ->> 'value', ''), '') = ''
              or lower(concat_ws(' ', coalesce(q.destination_unlocode, ''), coalesce(q.destination, '')))
                ilike '%' || lower(filter_rule.rule ->> 'value') || '%'
            when 'salesperson_name' then
              coalesce(nullif(filter_rule.rule ->> 'value', ''), '') = ''
              or lower(concat_ws(' ', coalesce(su.first_name, ''), coalesce(su.last_name, '')))
                ilike '%' || lower(filter_rule.rule ->> 'value') || '%'
            when 'pricing_owner_name' then
              coalesce(nullif(filter_rule.rule ->> 'value', ''), '') = ''
              or lower(concat_ws(' ', coalesce(pu.first_name, ''), coalesce(pu.last_name, '')))
                ilike '%' || lower(filter_rule.rule ->> 'value') || '%'
            when 'service_type' then
              coalesce(nullif(filter_rule.rule ->> 'value', ''), '') = ''
              or lower(coalesce(q.service_type, '')) ilike '%' || lower(filter_rule.rule ->> 'value') || '%'
            when 'transport_type' then
              coalesce(nullif(filter_rule.rule ->> 'value', ''), '') = ''
              or lower(coalesce(q.transport_type, '')) ilike '%' || lower(filter_rule.rule ->> 'value') || '%'
            else true
          end
        )
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
    case when p.normalized_sort_column = 'created_at' and p.normalized_sort_direction = 'asc' then filtered.created_at end asc nulls last,
    case when p.normalized_sort_column = 'created_at' and p.normalized_sort_direction = 'desc' then filtered.created_at end desc nulls last,
    case when p.normalized_sort_column = 'required_quote_date' and p.normalized_sort_direction = 'asc' then filtered.required_quote_date end asc nulls last,
    case when p.normalized_sort_column = 'required_quote_date' and p.normalized_sort_direction = 'desc' then filtered.required_quote_date end desc nulls last,
    case when p.normalized_sort_column = 'reference_number' and p.normalized_sort_direction = 'asc' then filtered.reference_number end asc nulls last,
    case when p.normalized_sort_column = 'reference_number' and p.normalized_sort_direction = 'desc' then filtered.reference_number end desc nulls last,
    case when p.normalized_sort_column = 'client_name' and p.normalized_sort_direction = 'asc' then filtered.client_name end asc nulls last,
    case when p.normalized_sort_column = 'client_name' and p.normalized_sort_direction = 'desc' then filtered.client_name end desc nulls last,
    case when p.normalized_sort_column = 'opportunity_title' and p.normalized_sort_direction = 'asc' then filtered.opportunity_title end asc nulls last,
    case when p.normalized_sort_column = 'opportunity_title' and p.normalized_sort_direction = 'desc' then filtered.opportunity_title end desc nulls last,
    case when p.normalized_sort_column = 'origin' and p.normalized_sort_direction = 'asc' then concat_ws(' ', coalesce(filtered.origin_unlocode, ''), coalesce(filtered.origin, '')) end asc nulls last,
    case when p.normalized_sort_column = 'origin' and p.normalized_sort_direction = 'desc' then concat_ws(' ', coalesce(filtered.origin_unlocode, ''), coalesce(filtered.origin, '')) end desc nulls last,
    case when p.normalized_sort_column = 'destination' and p.normalized_sort_direction = 'asc' then concat_ws(' ', coalesce(filtered.destination_unlocode, ''), coalesce(filtered.destination, '')) end asc nulls last,
    case when p.normalized_sort_column = 'destination' and p.normalized_sort_direction = 'desc' then concat_ws(' ', coalesce(filtered.destination_unlocode, ''), coalesce(filtered.destination, '')) end desc nulls last,
    case when p.normalized_sort_column = 'salesperson_name' and p.normalized_sort_direction = 'asc' then filtered.salesperson_name end asc nulls last,
    case when p.normalized_sort_column = 'salesperson_name' and p.normalized_sort_direction = 'desc' then filtered.salesperson_name end desc nulls last,
    case when p.normalized_sort_column = 'pricing_owner_name' and p.normalized_sort_direction = 'asc' then filtered.pricing_owner_name end asc nulls last,
    case when p.normalized_sort_column = 'pricing_owner_name' and p.normalized_sort_direction = 'desc' then filtered.pricing_owner_name end desc nulls last,
    case when p.normalized_sort_column = 'status' and p.normalized_sort_direction = 'asc' then filtered.status end asc nulls last,
    case when p.normalized_sort_column = 'status' and p.normalized_sort_direction = 'desc' then filtered.status end desc nulls last,
    case when p.normalized_sort_column = 'service_type' and p.normalized_sort_direction = 'asc' then filtered.service_type end asc nulls last,
    case when p.normalized_sort_column = 'service_type' and p.normalized_sort_direction = 'desc' then filtered.service_type end desc nulls last,
    case when p.normalized_sort_column = 'transport_type' and p.normalized_sort_direction = 'asc' then filtered.transport_type end asc nulls last,
    case when p.normalized_sort_column = 'transport_type' and p.normalized_sort_direction = 'desc' then filtered.transport_type end desc nulls last,
    case when p.normalized_sort_column = 'expected_profit' and p.normalized_sort_direction = 'asc' then filtered.expected_profit end asc nulls last,
    case when p.normalized_sort_column = 'expected_profit' and p.normalized_sort_direction = 'desc' then filtered.expected_profit end desc nulls last,
    case when p.normalized_sort_column is null and p.normalized_query is not null then filtered.match_rank end desc,
    filtered.created_at desc,
    filtered.id desc
  limit (select normalized_limit from params)
  offset (select normalized_offset from params);
$$;
