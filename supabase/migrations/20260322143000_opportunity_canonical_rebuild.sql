-- =========================================================
-- OPPORTUNITIES / CANONICAL CRM REBUILD
-- =========================================================

alter table opportunities
  add column if not exists transport_type text,
  add column if not exists origin_unlocode text,
  add column if not exists destination_unlocode text,
  add column if not exists expected_profit_usd numeric,
  add column if not exists service_quantity integer,
  add column if not exists start_date date,
  add column if not exists expiration_date date;

alter table opportunities
  alter column status set default 'investigando';

create index if not exists idx_opportunities_service_type
on opportunities(service_type);

create index if not exists idx_opportunities_transport_type
on opportunities(transport_type);

create index if not exists idx_opportunities_expiration_date
on opportunities(expiration_date);

update opportunities
set status = case
  when status = 'open' then 'investigando'
  when status = 'active' then 'confirmado'
  when status = 'quoted' then 'cotizando'
  when status = 'won' then 'aceptado'
  when status = 'lost' then 'rechazada'
  else status
end;

create or replace function calculate_opportunity_expiration_date(
  p_start_date date
)
returns date
language sql
immutable
as $$
  select
    case
      when p_start_date is null then null
      else (
        date_trunc('month', (p_start_date::timestamp + interval '6 months'))
        + interval '1 month'
        - interval '1 day'
      )::date
    end
$$;

create or replace function build_opportunity_title(
  p_client_id uuid,
  p_service_type text default null,
  p_transport_type text default null,
  p_origin text default null,
  p_destination text default null
)
returns text
language plpgsql
stable
as $$
declare
  client_name text;
  lane_label text;
begin
  select company_name
  into client_name
  from clients
  where id = p_client_id;

  lane_label := case
    when nullif(btrim(coalesce(p_origin, '')), '') is not null
      and nullif(btrim(coalesce(p_destination, '')), '') is not null
      then btrim(p_origin) || ' -> ' || btrim(p_destination)
    when nullif(btrim(coalesce(p_origin, '')), '') is not null
      then btrim(p_origin)
    when nullif(btrim(coalesce(p_destination, '')), '') is not null
      then btrim(p_destination)
    else null
  end;

  return concat_ws(
    ' · ',
    nullif(btrim(coalesce(client_name, '')), ''),
    nullif(
      concat_ws(
        ' / ',
        nullif(btrim(coalesce(p_service_type, '')), ''),
        nullif(btrim(coalesce(p_transport_type, '')), '')
      ),
      ''
    ),
    lane_label
  );
end;
$$;

create or replace function sync_expired_opportunities()
returns integer
language plpgsql
security definer
as $$
declare
  affected_rows integer;
begin
  update opportunities
  set status = 'vencida'
  where expiration_date is not null
    and expiration_date < current_date
    and status not in ('aceptado', 'rechazada', 'vencida');

  get diagnostics affected_rows = row_count;
  return affected_rows;
end;
$$;

drop function if exists create_opportunity(uuid, text, numeric, text, text, text);

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
begin
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
    p_salesperson_id,
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

create or replace function update_opportunity_status(
  p_opportunity_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
as $$
begin
  perform sync_expired_opportunities();

  update opportunities
  set status = p_status
  where id = p_opportunity_id;
end;
$$;

create or replace function convert_opportunity_to_quotation(
  p_opportunity_id uuid,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_quotation_id uuid;
  opportunity_row opportunities%rowtype;
begin
  select *
  into opportunity_row
  from opportunities
  where id = p_opportunity_id;

  if not found then
    raise exception 'Opportunity % not found', p_opportunity_id;
  end if;

  insert into quotations (
    client_id,
    opportunity_id,
    created_by,
    status,
    service_type,
    origin,
    destination
  )
  values (
    opportunity_row.client_id,
    opportunity_row.id,
    p_created_by,
    'draft',
    opportunity_row.service_type,
    opportunity_row.origin,
    opportunity_row.destination
  )
  returning id into new_quotation_id;

  update opportunities
  set status = 'cotizando'
  where id = p_opportunity_id;

  return new_quotation_id;
end;
$$;

create or replace function apply_opportunity_computed_fields()
returns trigger
language plpgsql
as $$
declare
  normalized_origin text;
  normalized_destination text;
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

  new.expiration_date := calculate_opportunity_expiration_date(new.start_date);

  if new.origin_unlocode is not null then
    select
      case
        when subdivision_code is not null and subdivision_code <> ''
          then name || ', ' || subdivision_code
        else name
      end
    into normalized_origin
    from unlocodes
    where unlocode = new.origin_unlocode;

    if normalized_origin is not null then
      new.origin := normalized_origin;
    end if;
  end if;

  if new.destination_unlocode is not null then
    select
      case
        when subdivision_code is not null and subdivision_code <> ''
          then name || ', ' || subdivision_code
        else name
      end
    into normalized_destination
    from unlocodes
    where unlocode = new.destination_unlocode;

    if normalized_destination is not null then
      new.destination := normalized_destination;
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
      build_opportunity_title(
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

drop trigger if exists set_opportunity_computed_fields on opportunities;
create trigger set_opportunity_computed_fields
before insert or update on opportunities
for each row
execute function apply_opportunity_computed_fields();

create or replace view client_overview_view as
select
  c.id,
  c.company_name as client_name,
  c.website,
  c.corporate_phone,
  c.country,
  c.city,
  c.status,
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
where c.is_deleted = false;

update opportunities
set
  start_date = coalesce(start_date, created_at::date),
  expiration_date = calculate_opportunity_expiration_date(coalesce(start_date, created_at::date)),
  trade_lane = case
    when nullif(btrim(coalesce(origin, '')), '') is not null
      and nullif(btrim(coalesce(destination, '')), '') is not null
      then btrim(origin) || ' -> ' || btrim(destination)
    else null
  end,
  title = coalesce(
    nullif(
      build_opportunity_title(
        client_id,
        service_type,
        transport_type,
        origin,
        destination
      ),
      ''
    ),
    coalesce(nullif(btrim(title), ''), 'Opportunity')
  );

select sync_expired_opportunities();

create or replace view sales_pipeline_view as
select
  stage,
  case
    when expiration_date is not null
      and expiration_date < current_date
      and status not in ('aceptado', 'rechazada', 'vencida')
      then 'vencida'
    else status
  end as status,
  count(*) as opportunities,
  coalesce(sum(estimated_value), 0) as pipeline_value
from opportunities
group by
  stage,
  case
    when expiration_date is not null
      and expiration_date < current_date
      and status not in ('aceptado', 'rechazada', 'vencida')
      then 'vencida'
    else status
  end;

drop view if exists open_opportunities_view;

create view open_opportunities_view as
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
  c.company_name as client_name
from opportunities o
join clients c on c.id = o.client_id
left join users u on u.id = o.salesperson_id
where c.is_deleted = false;

grant select on open_opportunities_view to anon, authenticated;
grant execute on function sync_expired_opportunities() to anon, authenticated;
grant execute on function create_opportunity(
  uuid,
  text,
  numeric,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  integer,
  uuid,
  text,
  text
) to anon, authenticated;
grant execute on function update_opportunity_status(uuid, text) to anon, authenticated;
