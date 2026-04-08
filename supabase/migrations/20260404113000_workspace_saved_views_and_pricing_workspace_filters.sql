create table if not exists public.workspace_saved_views (
  id uuid primary key default gen_random_uuid(),
  workspace_key text not null,
  owner_user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  search_query text,
  status_lane text,
  filters_json jsonb not null default '{}'::jsonb,
  sort_json jsonb not null default '{}'::jsonb,
  visible_columns_json jsonb not null default '[]'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_workspace_saved_views_owner_workspace
  on public.workspace_saved_views(owner_user_id, workspace_key);

create unique index if not exists idx_workspace_saved_views_single_default
  on public.workspace_saved_views(owner_user_id, workspace_key)
  where is_default = true;

create index if not exists idx_workspace_saved_views_name
  on public.workspace_saved_views(owner_user_id, workspace_key, name);

drop trigger if exists trg_workspace_saved_views_updated_at on public.workspace_saved_views;
create trigger trg_workspace_saved_views_updated_at
before update on public.workspace_saved_views
for each row
execute function public.set_updated_at();

alter table public.workspace_saved_views enable row level security;

drop policy if exists "active_select_workspace_saved_views" on public.workspace_saved_views;
create policy "active_select_workspace_saved_views"
on public.workspace_saved_views
for select
using (
  public.erp_is_authenticated_active_user()
  and owner_user_id = public.erp_current_user_id()
);

drop policy if exists "active_insert_workspace_saved_views" on public.workspace_saved_views;
create policy "active_insert_workspace_saved_views"
on public.workspace_saved_views
for insert
with check (
  public.erp_is_authenticated_active_user()
  and owner_user_id = public.erp_current_user_id()
);

drop policy if exists "active_update_workspace_saved_views" on public.workspace_saved_views;
create policy "active_update_workspace_saved_views"
on public.workspace_saved_views
for update
using (
  public.erp_is_authenticated_active_user()
  and owner_user_id = public.erp_current_user_id()
)
with check (
  public.erp_is_authenticated_active_user()
  and owner_user_id = public.erp_current_user_id()
);

drop policy if exists "active_delete_workspace_saved_views" on public.workspace_saved_views;
create policy "active_delete_workspace_saved_views"
on public.workspace_saved_views
for delete
using (
  public.erp_is_authenticated_active_user()
  and owner_user_id = public.erp_current_user_id()
);

create or replace function public.set_workspace_saved_view_default(
  p_workspace_view_id uuid,
  p_workspace_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := public.erp_current_user_id();
  normalized_workspace_key text := nullif(btrim(coalesce(p_workspace_key, '')), '');
begin
  if current_user_id is null then
    raise exception 'Authenticated ERP user required';
  end if;

  update public.workspace_saved_views
  set is_default = false
  where owner_user_id = current_user_id
    and workspace_key = normalized_workspace_key;

  update public.workspace_saved_views
  set is_default = true
  where id = p_workspace_view_id
    and owner_user_id = current_user_id
    and workspace_key = normalized_workspace_key;

  if not found then
    raise exception 'Workspace saved view not found or not owned by current user';
  end if;
end;
$$;

create or replace function public.search_quotations(
  p_scope text default 'crm',
  p_query text default null,
  p_status text default null,
  p_limit integer default 25,
  p_offset integer default 0,
  p_pricing_owner_id uuid default null,
  p_service_type text default null,
  p_transport_type text default null,
  p_only_mine boolean default false
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
