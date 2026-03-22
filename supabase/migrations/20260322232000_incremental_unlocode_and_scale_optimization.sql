create extension if not exists pg_trgm;

alter table public.clients
add column if not exists search_text text not null default '';

update public.clients
set search_text = lower(
  regexp_replace(
    concat_ws(
      ' ',
      company_name,
      coalesce(tax_id, ''),
      coalesce(website, ''),
      coalesce(corporate_phone, ''),
      coalesce(country, ''),
      coalesce(city, ''),
      coalesce(city_unlocode, '')
    ),
    '\s+',
    ' ',
    'g'
  )
)
where search_text = '';

create index if not exists idx_clients_active_company_name
  on public.clients(company_name)
  where is_deleted = false;

create index if not exists idx_clients_search_text_trgm
  on public.clients using gin(search_text gin_trgm_ops);

create index if not exists idx_contacts_client_status_created_at
  on public.contacts(client_id, status, created_at desc);

create index if not exists idx_provider_contacts_provider_status_created_at
  on public.provider_contacts(provider_id, status, created_at desc);

create index if not exists idx_opportunities_client_created_at
  on public.opportunities(client_id, created_at desc);

create index if not exists idx_opportunities_client_status_created_at
  on public.opportunities(client_id, status, created_at desc);

create index if not exists idx_opportunities_status_expiration_date
  on public.opportunities(status, expiration_date);

create index if not exists idx_opportunities_title_trgm
  on public.opportunities using gin(title gin_trgm_ops);

create index if not exists idx_quotations_client_created_at
  on public.quotations(client_id, created_at desc);

create index if not exists idx_quotations_opportunity_created_at
  on public.quotations(opportunity_id, created_at desc);

create index if not exists idx_quotations_status_created_at
  on public.quotations(status, created_at desc);

create index if not exists idx_shipments_client_created_at
  on public.shipments(client_id, created_at desc);

create index if not exists idx_shipments_quotation_created_at
  on public.shipments(quotation_id, created_at desc);

create index if not exists idx_shipments_status_created_at
  on public.shipments(status, created_at desc);

create index if not exists idx_shipment_events_shipment_event_date
  on public.shipment_events(shipment_id, event_date desc);

create or replace function public.set_client_search_text()
returns trigger
language plpgsql
as $$
begin
  new.search_text := lower(
    regexp_replace(
      concat_ws(
        ' ',
        new.company_name,
        coalesce(new.tax_id, ''),
        coalesce(new.website, ''),
        coalesce(new.corporate_phone, ''),
        coalesce(new.country, ''),
        coalesce(new.city, ''),
        coalesce(new.city_unlocode, '')
      ),
      '\s+',
      ' ',
      'g'
    )
  );

  return new;
end;
$$;

drop trigger if exists set_clients_search_text on public.clients;

create trigger set_clients_search_text
before insert or update on public.clients
for each row
execute function public.set_client_search_text();

create or replace function public.search_clients(
  p_query text
)
returns setof public.clients
language sql
security definer
as $$
  with params as (
    select
      nullif(lower(btrim(p_query)), '') as normalized_query
  )
  select c.*
  from public.clients c
  cross join params p
  where c.is_deleted = false
    and (
      p.normalized_query is null
      or c.search_text ilike '%' || p.normalized_query || '%'
      or lower(c.company_name) like p.normalized_query || '%'
      or lower(coalesce(c.website, '')) like p.normalized_query || '%'
      or lower(coalesce(c.tax_id, '')) = p.normalized_query
      or lower(coalesce(c.city_unlocode, '')) = p.normalized_query
    )
  order by
    case
      when p.normalized_query is null then 0
      when lower(c.company_name) = p.normalized_query then 1000
      when lower(coalesce(c.tax_id, '')) = p.normalized_query then 950
      when lower(coalesce(c.city_unlocode, '')) = p.normalized_query then 925
      when lower(c.company_name) like p.normalized_query || '%' then 900
      when lower(coalesce(c.website, '')) like p.normalized_query || '%' then 800
      when lower(coalesce(c.city, '')) like p.normalized_query || '%' then 750
      when lower(coalesce(c.country, '')) like p.normalized_query || '%' then 700
      else greatest(
        similarity(c.search_text, p.normalized_query),
        similarity(lower(c.company_name), p.normalized_query)
      ) * 100
    end desc,
    c.company_name asc;
$$;

create or replace view public.client_overview_view as
with opportunity_stats as (
  select
    o.client_id,
    count(*) as total_opportunities,
    coalesce(
      sum(
        case
          when (
            case
              when o.expiration_date is not null
                and o.expiration_date < current_date
                and o.status not in ('aceptado', 'rechazada', 'vencida')
                then 'vencida'
              else o.status
            end
          ) not in ('aceptado', 'rechazada', 'vencida')
            then o.estimated_value
          else 0
        end
      ),
      0
    ) as pipeline_value
  from public.opportunities o
  group by o.client_id
),
quotation_stats as (
  select
    q.client_id,
    count(*) as total_quotations
  from public.quotations q
  group by q.client_id
),
shipment_stats as (
  select
    s.client_id,
    count(*) as total_shipments
  from public.shipments s
  group by s.client_id
)
select
  c.id,
  c.company_name as client_name,
  c.website,
  c.corporate_phone,
  c.country,
  c.city,
  c.status,
  c.account_owner_id,
  concat_ws(' ', u.first_name, u.last_name) as account_owner_name,
  c.created_at,
  coalesce(os.total_opportunities, 0) as total_opportunities,
  coalesce(qs.total_quotations, 0) as total_quotations,
  coalesce(ss.total_shipments, 0) as total_shipments,
  coalesce(os.pipeline_value, 0) as pipeline_value
from public.clients c
left join public.users u on u.id = c.account_owner_id
left join opportunity_stats os on os.client_id = c.id
left join quotation_stats qs on qs.client_id = c.id
left join shipment_stats ss on ss.client_id = c.id
where c.is_deleted = false;

create or replace view public.client_revenue_view as
with shipment_stats as (
  select
    s.client_id,
    count(*) as total_shipments
  from public.shipments s
  group by s.client_id
),
invoice_stats as (
  select
    ci.client_id,
    count(*) as total_invoices,
    coalesce(sum(ci.total_amount), 0) as billed_amount
  from public.client_invoices ci
  group by ci.client_id
),
quotation_profit as (
  select
    q.client_id,
    coalesce(sum(q.expected_profit), 0) as expected_profit
  from public.quotations q
  group by q.client_id
)
select
  c.id as client_id,
  c.company_name as client_name,
  coalesce(ss.total_shipments, 0) as total_shipments,
  coalesce(is2.total_invoices, 0) as total_invoices,
  coalesce(is2.billed_amount, 0) as billed_amount,
  coalesce(qp.expected_profit, 0) as expected_profit
from public.clients c
left join shipment_stats ss on ss.client_id = c.id
left join invoice_stats is2 on is2.client_id = c.id
left join quotation_profit qp on qp.client_id = c.id
where c.is_deleted = false;
