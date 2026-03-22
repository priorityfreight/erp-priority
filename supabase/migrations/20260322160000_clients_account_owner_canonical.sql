-- =========================================================
-- CLIENTS / CANONICAL ACCOUNT OWNER
-- =========================================================

alter table clients
  add column if not exists account_owner_id uuid references users(id);

create index if not exists idx_clients_account_owner_id
on clients(account_owner_id);

drop function if exists create_client_with_contacts(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
);

create or replace function create_client_with_contacts(
  p_company_name text,
  p_website text default null,
  p_corporate_phone text default null,
  p_country text default null,
  p_industry text default null,
  p_status text default 'prospecto',
  p_full_address text default null,
  p_postal_code text default null,
  p_city text default null,
  p_city_unlocode text default null,
  p_account_owner_id uuid default null,
  p_contacts jsonb default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_client_id uuid;
begin
  insert into clients (
    company_name,
    website,
    corporate_phone,
    country,
    industry,
    status,
    full_address,
    postal_code,
    city,
    city_unlocode,
    account_owner_id
  )
  values (
    p_company_name,
    p_website,
    p_corporate_phone,
    p_country,
    p_industry,
    coalesce(nullif(btrim(p_status), ''), 'prospecto'),
    p_full_address,
    p_postal_code,
    p_city,
    p_city_unlocode,
    p_account_owner_id
  )
  returning id into new_client_id;

  if p_contacts is not null then
    insert into contacts (
      client_id,
      name,
      email,
      phone,
      position,
      is_primary
    )
    select
      new_client_id,
      contact->>'name',
      contact->>'email',
      contact->>'phone',
      contact->>'position',
      coalesce((contact->>'is_primary')::boolean, false)
    from jsonb_array_elements(p_contacts) as contact;
  end if;

  return new_client_id;
end;
$$;

create or replace function create_opportunity(
  p_client_id uuid,
  p_title text default null,
  p_estimated_value numeric default null,
  p_origin text default null,
  p_destination text default null,
  p_stage text default 'qualification',
  p_service_type text default null,
  p_transport_type text default null,
  p_origin_unlocode text default null,
  p_destination_unlocode text default null,
  p_expected_profit_usd numeric default null,
  p_service_quantity integer default null,
  p_salesperson_id uuid default null,
  p_description text default null,
  p_status text default 'investigando'
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_opportunity_id uuid;
  resolved_salesperson_id uuid;
begin
  select coalesce(
    p_salesperson_id,
    (
      select c.account_owner_id
      from clients c
      where c.id = p_client_id
    )
  )
  into resolved_salesperson_id;

  insert into opportunities (
    client_id,
    salesperson_id,
    title,
    description,
    service_type,
    transport_type,
    estimated_value,
    origin,
    origin_unlocode,
    destination,
    destination_unlocode,
    stage,
    status,
    expected_profit_usd,
    service_quantity
  )
  values (
    p_client_id,
    resolved_salesperson_id,
    coalesce(nullif(btrim(p_title), ''), 'Opportunity'),
    nullif(btrim(p_description), ''),
    nullif(btrim(p_service_type), ''),
    nullif(btrim(p_transport_type), ''),
    p_estimated_value,
    nullif(btrim(p_origin), ''),
    nullif(btrim(p_origin_unlocode), ''),
    nullif(btrim(p_destination), ''),
    nullif(btrim(p_destination_unlocode), ''),
    coalesce(nullif(btrim(p_stage), ''), 'qualification'),
    coalesce(nullif(btrim(p_status), ''), 'investigando'),
    p_expected_profit_usd,
    p_service_quantity
  )
  returning id into new_opportunity_id;

  return new_opportunity_id;
end;
$$;

drop view if exists client_overview_view;

create view client_overview_view as
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
  (
    select count(*)
    from opportunities o
    where o.client_id = c.id
  ) as total_opportunities,
  (
    select count(*)
    from quotations q
    where q.client_id = c.id
  ) as total_quotations,
  (
    select count(*)
    from shipments s
    where s.client_id = c.id
  ) as total_shipments,
  (
    select coalesce(sum(o.estimated_value), 0)
    from opportunities o
    where o.client_id = c.id
      and (
        case
          when o.expiration_date is not null
            and o.expiration_date < current_date
            and o.status not in ('aceptado', 'rechazada', 'vencida')
            then 'vencida'
          else o.status
        end
      ) not in ('aceptado', 'rechazada', 'vencida')
  ) as pipeline_value
from clients c
left join users u on u.id = c.account_owner_id
where c.is_deleted = false;

grant execute on function create_client_with_contacts(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  uuid,
  jsonb
) to anon, authenticated;
