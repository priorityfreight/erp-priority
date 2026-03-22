-- =========================================================
-- GRADUAL STRONG UN/LOCODE REFERENCES
-- =========================================================

alter table public.clients
add column if not exists city_unlocode_id uuid references public.unlocodes(id);

alter table public.providers
add column if not exists city_unlocode_id uuid references public.unlocodes(id);

alter table public.opportunities
add column if not exists origin_unlocode_id uuid references public.unlocodes(id),
add column if not exists destination_unlocode_id uuid references public.unlocodes(id);

create index if not exists idx_clients_city_unlocode_id on public.clients(city_unlocode_id);
create index if not exists idx_providers_city_unlocode_id on public.providers(city_unlocode_id);
create index if not exists idx_opportunities_origin_unlocode_id on public.opportunities(origin_unlocode_id);
create index if not exists idx_opportunities_destination_unlocode_id on public.opportunities(destination_unlocode_id);

create or replace function public.resolve_unlocode_reference(
  p_unlocode text default null,
  p_unlocode_id uuid default null
)
returns table (
  resolved_id uuid,
  resolved_unlocode text,
  resolved_city text,
  resolved_country text
)
language sql
stable
as $$
  select
    u.id as resolved_id,
    u.unlocode as resolved_unlocode,
    case
      when coalesce(u.subdivision_code, '') <> '' then u.name || ', ' || u.subdivision_code
      else u.name
    end as resolved_city,
    u.country_name as resolved_country
  from public.unlocodes u
  where (
    p_unlocode_id is not null and u.id = p_unlocode_id
  ) or (
    p_unlocode_id is null
    and nullif(upper(btrim(coalesce(p_unlocode, ''))), '') is not null
    and u.unlocode = upper(btrim(p_unlocode))
  )
  limit 1;
$$;

create or replace function public.apply_client_location_fields()
returns trigger
language plpgsql
as $$
declare
  resolved record;
begin
  if nullif(btrim(coalesce(new.city_unlocode, '')), '') is null and new.city_unlocode_id is null then
    new.city_unlocode := null;
    new.city_unlocode_id := null;
    new.city := null;
    new.country := null;
    return new;
  end if;

  if nullif(btrim(coalesce(new.city_unlocode, '')), '') is not null then
    new.city_unlocode := upper(btrim(new.city_unlocode));
  else
    new.city_unlocode := null;
  end if;

  select *
  into resolved
  from public.resolve_unlocode_reference(new.city_unlocode, new.city_unlocode_id);

  if resolved is null then
    new.city_unlocode_id := null;
    return new;
  end if;

  new.city_unlocode_id := resolved.resolved_id;
  new.city_unlocode := resolved.resolved_unlocode;
  new.city := resolved.resolved_city;
  new.country := resolved.resolved_country;

  return new;
end;
$$;

drop trigger if exists set_client_location_fields on public.clients;

create trigger set_client_location_fields
before insert or update on public.clients
for each row
execute function public.apply_client_location_fields();

create or replace function public.apply_provider_location_fields()
returns trigger
language plpgsql
as $$
declare
  resolved record;
begin
  if nullif(btrim(coalesce(new.city_unlocode, '')), '') is null and new.city_unlocode_id is null then
    new.city_unlocode := null;
    new.city_unlocode_id := null;
    new.city := null;
    new.country := null;
    return new;
  end if;

  if nullif(btrim(coalesce(new.city_unlocode, '')), '') is not null then
    new.city_unlocode := upper(btrim(new.city_unlocode));
  else
    new.city_unlocode := null;
  end if;

  select *
  into resolved
  from public.resolve_unlocode_reference(new.city_unlocode, new.city_unlocode_id);

  if resolved is null then
    new.city_unlocode_id := null;
    return new;
  end if;

  new.city_unlocode_id := resolved.resolved_id;
  new.city_unlocode := resolved.resolved_unlocode;
  new.city := resolved.resolved_city;
  new.country := resolved.resolved_country;

  return new;
end;
$$;

drop trigger if exists set_provider_location_fields on public.providers;

create trigger set_provider_location_fields
before insert or update on public.providers
for each row
execute function public.apply_provider_location_fields();

create or replace function public.apply_opportunity_computed_fields()
returns trigger
language plpgsql
as $$
declare
  origin_reference record;
  destination_reference record;
  expired_before_update boolean;
begin
  expired_before_update := false;

  if tg_op = 'UPDATE' then
    expired_before_update := old.expiration_date is not null
      and old.expiration_date < current_date
      and old.status not in ('aceptado', 'rechazada', 'vencida');
  end if;

  if new.start_date is null then
    new.start_date := coalesce(new.created_at::date, current_date);
  end if;

  if expired_before_update
    and coalesce(new.status, '') <> 'vencida'
    and new.status is distinct from old.status then
    new.start_date := current_date;
  end if;

  new.expiration_date := public.calculate_opportunity_expiration_date(new.start_date);

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
    from public.resolve_unlocode_reference(new.origin_unlocode, new.origin_unlocode_id);

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
    from public.resolve_unlocode_reference(new.destination_unlocode, new.destination_unlocode_id);

    if destination_reference is not null then
      new.destination_unlocode_id := destination_reference.resolved_id;
      new.destination_unlocode := destination_reference.resolved_unlocode;
      new.destination := destination_reference.resolved_city;
    end if;
  end if;

  new.trade_lane := case
    when nullif(btrim(coalesce(new.origin, '')), '') is not null
      and nullif(btrim(coalesce(new.destination, '')), '') is not null
      then btrim(new.origin) || ' -> ' || btrim(new.destination)
    else null
  end;

  new.estimated_value := case
    when new.expected_profit_usd is not null and new.service_quantity is not null
      then new.expected_profit_usd * new.service_quantity
    else new.estimated_value
  end;

  new.title := coalesce(
    nullif(
      public.build_opportunity_title(
        new.client_id,
        new.service_type,
        new.transport_type,
        new.origin,
        new.destination
      ),
      ''
    ),
    coalesce(nullif(btrim(new.title), ''), 'Opportunity')
  );

  return new;
end;
$$;

update public.clients c
set city_unlocode_id = u.id
from public.unlocodes u
where c.city_unlocode = u.unlocode
  and (c.city_unlocode_id is distinct from u.id);

update public.providers p
set city_unlocode_id = u.id
from public.unlocodes u
where p.city_unlocode = u.unlocode
  and (p.city_unlocode_id is distinct from u.id);

update public.opportunities o
set origin_unlocode_id = u.id
from public.unlocodes u
where o.origin_unlocode = u.unlocode
  and (o.origin_unlocode_id is distinct from u.id);

update public.opportunities o
set destination_unlocode_id = u.id
from public.unlocodes u
where o.destination_unlocode = u.unlocode
  and (o.destination_unlocode_id is distinct from u.id);

create or replace view public.open_opportunities_view as
select
  o.id,
  o.title,
  o.stage,
  case
    when o.expiration_date is not null
      and o.expiration_date < current_date
      and o.status not in ('aceptado', 'rechazada', 'vencida')
      then 'vencida'
    else o.status
  end as status,
  o.service_type,
  o.transport_type,
  o.salesperson_id,
  concat_ws(' ', u.first_name, u.last_name) as salesperson_name,
  o.origin,
  o.origin_unlocode,
  o.destination,
  o.destination_unlocode,
  o.expected_profit_usd,
  o.service_quantity,
  o.estimated_value,
  o.start_date,
  o.expiration_date,
  o.created_at,
  c.id as client_id,
  c.company_name as client_name,
  o.origin_unlocode_id,
  o.destination_unlocode_id
from public.opportunities o
join public.clients c on c.id = o.client_id
left join public.users u on u.id = o.salesperson_id
where c.is_deleted = false;

create or replace view public.unlocode_country_summary_view as
select
  country_code,
  max(country_name) as country_name,
  count(*) as row_count
from public.unlocodes
group by country_code
order by country_code asc;
