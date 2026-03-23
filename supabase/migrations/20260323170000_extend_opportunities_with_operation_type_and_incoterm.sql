alter table opportunities
add column if not exists operation_type text,
add column if not exists incoterm_id uuid references incoterms(id);

update opportunities
set operation_type = case
  when operation_type is null then null
  when lower(btrim(operation_type)) = 'import' then 'Import'
  when lower(btrim(operation_type)) = 'export' then 'Export'
  else operation_type
end
where operation_type is not null;

alter table opportunities
drop constraint if exists opportunities_allowed_operation_type;

alter table opportunities
add constraint opportunities_allowed_operation_type
check (operation_type is null or operation_type in ('Import', 'Export'));

create index if not exists idx_opportunities_operation_type on opportunities(operation_type);
create index if not exists idx_opportunities_incoterm_id on opportunities(incoterm_id);

insert into incoterms (
  code,
  description
)
values
  ('EXW', 'Ex Works'),
  ('FCA', 'Free Carrier'),
  ('CPT', 'Carriage Paid To'),
  ('CIP', 'Carriage and Insurance Paid To'),
  ('DAP', 'Delivered at Place'),
  ('DPU', 'Delivered at Place Unloaded'),
  ('DDP', 'Delivered Duty Paid'),
  ('FAS', 'Free Alongside Ship'),
  ('FOB', 'Free On Board'),
  ('CFR', 'Cost and Freight'),
  ('CIF', 'Cost, Insurance and Freight')
on conflict (code) do update
set description = excluded.description;

create or replace function create_opportunity(
  p_client_id uuid,
  p_title text default null,
  p_estimated_value numeric default null,
  p_origin text default null,
  p_destination text default null,
  p_stage text default 'qualification',
  p_service_type text default null,
  p_transport_type text default null,
  p_operation_type text default null,
  p_incoterm_id uuid default null,
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
    operation_type,
    incoterm_id,
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
    case
      when nullif(btrim(coalesce(p_operation_type, '')), '') is null then null
      when lower(btrim(p_operation_type)) = 'import' then 'Import'
      when lower(btrim(p_operation_type)) = 'export' then 'Export'
      else btrim(p_operation_type)
    end,
    p_incoterm_id,
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
  o.operation_type,
  o.incoterm_id,
  i.code as incoterm_code,
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
from opportunities o
join clients c on c.id = o.client_id
left join users u on u.id = o.salesperson_id
left join incoterms i on i.id = o.incoterm_id
where c.is_deleted = false;
