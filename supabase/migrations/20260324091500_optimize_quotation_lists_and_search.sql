alter table quotations
  add column if not exists search_text text not null default '';

create index if not exists idx_quotations_pricing_owner_status_created_at
  on quotations(pricing_owner_id, status, created_at desc);

create index if not exists idx_quotations_search_text_trgm
  on quotations using gin(search_text gin_trgm_ops);

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
        coalesce(new.delivery_address, ''),
        coalesce(new.commodities, '')
      ),
      '\s+',
      ' ',
      'g'
    )
  );

  return new;
end;
$$;

update quotations
set reference_number = reference_number;

drop view if exists crm_quotations_view;
drop view if exists pricing_quotations_view;
drop view if exists quotation_summary_view;

create or replace view quotation_summary_view as
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
  c.id as client_id,
  c.company_name as client_name,
  o.id as opportunity_id,
  o.title as opportunity_title,
  o.salesperson_id,
  concat_ws(' ', su.first_name, su.last_name) as salesperson_name
from quotations q
join clients c on c.id = q.client_id
join opportunities o on o.id = q.opportunity_id
left join incoterms i on i.id = q.incoterm_id
left join users pu on pu.id = q.pricing_owner_id
left join users cu on cu.id = q.created_by
left join users su on su.id = o.salesperson_id
left join quotation_rejection_reasons rr on rr.id = q.rejection_reason_id
where c.is_deleted = false;

create view crm_quotations_view as
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

create view pricing_quotations_view as
select *
from quotation_summary_view
where status in (
  'pendiente',
  'cotizando',
  'lista_para_enviar',
  'renegociar_tarifa'
);

create or replace function search_quotations(
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
      greatest(coalesce(p_offset, 0), 0) as normalized_offset
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
  order by
    filtered.match_rank desc,
    filtered.created_at desc,
    filtered.id desc
  limit (select normalized_limit from params)
  offset (select normalized_offset from params);
$$;
