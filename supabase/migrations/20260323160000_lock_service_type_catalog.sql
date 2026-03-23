update service_transport_types
set
  service_type = upper(btrim(service_type)),
  updated_at = now()
where service_type is not null
  and service_type <> upper(btrim(service_type));

insert into service_transport_types (
  service_type,
  transport_type
)
select
  'COURIER',
  'Courier'
where not exists (
  select 1
  from service_transport_types
  where service_type = 'COURIER'
);

alter table service_transport_types
drop constraint if exists service_transport_types_allowed_service_type;

alter table service_transport_types
add constraint service_transport_types_allowed_service_type
check (service_type in ('AIR', 'FCL', 'LCL', 'FTL', 'LTL', 'COURIER'));

create or replace function create_service_transport_type(
  p_service_type text,
  p_transport_type text
)
returns uuid
language plpgsql
security definer
as $$
begin
  raise exception 'service_transport_types catalog is locked; manage canonical values through migrations only';
end;
$$;

create or replace function update_service_transport_type(
  p_id uuid,
  p_service_type text,
  p_transport_type text
)
returns void
language plpgsql
security definer
as $$
begin
  raise exception 'service_transport_types catalog is locked; manage canonical values through migrations only';
end;
$$;

create or replace function delete_service_transport_type(
  p_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  raise exception 'service_transport_types catalog is locked; manage canonical values through migrations only';
end;
$$;
