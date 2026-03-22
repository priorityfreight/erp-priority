-- =========================================================
-- MASTER DATA / SALES / SERVICE TRANSPORT TYPES
-- =========================================================

create table if not exists service_transport_types (
  id uuid primary key default gen_random_uuid(),
  service_type text not null,
  transport_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint service_transport_types_unique unique (service_type, transport_type)
);

create index if not exists idx_service_transport_types_service_type
on service_transport_types(service_type);

create index if not exists idx_service_transport_types_transport_type
on service_transport_types(transport_type);

create or replace function create_service_transport_type(
  p_service_type text,
  p_transport_type text
)
returns uuid
language plpgsql
security definer
as $$
declare
  normalized_service_type text;
  normalized_transport_type text;
  new_record_id uuid;
begin
  normalized_service_type := nullif(btrim(p_service_type), '');
  normalized_transport_type := nullif(btrim(p_transport_type), '');

  if normalized_service_type is null then
    raise exception 'service_type is required';
  end if;

  if normalized_transport_type is null then
    raise exception 'transport_type is required';
  end if;

  insert into service_transport_types (
    service_type,
    transport_type
  )
  values (
    normalized_service_type,
    normalized_transport_type
  )
  returning id into new_record_id;

  return new_record_id;
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
declare
  normalized_service_type text;
  normalized_transport_type text;
begin
  normalized_service_type := nullif(btrim(p_service_type), '');
  normalized_transport_type := nullif(btrim(p_transport_type), '');

  if normalized_service_type is null then
    raise exception 'service_type is required';
  end if;

  if normalized_transport_type is null then
    raise exception 'transport_type is required';
  end if;

  update service_transport_types
  set
    service_type = normalized_service_type,
    transport_type = normalized_transport_type
  where id = p_id;
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
  delete from service_transport_types
  where id = p_id;
end;
$$;

create or replace view service_transport_type_lookup_view as
select
  stt.id,
  stt.service_type,
  stt.transport_type,
  stt.created_at,
  stt.updated_at
from service_transport_types stt
order by stt.service_type asc, stt.transport_type asc;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_service_transport_types_updated_at on service_transport_types;
create trigger set_service_transport_types_updated_at
before update on service_transport_types
for each row
execute function set_updated_at();

grant select, insert, update, delete on service_transport_types to anon, authenticated;
grant select on service_transport_type_lookup_view to anon, authenticated;
grant execute on function create_service_transport_type(text, text) to anon, authenticated;
grant execute on function update_service_transport_type(uuid, text, text) to anon, authenticated;
grant execute on function delete_service_transport_type(uuid) to anon, authenticated;

alter table service_transport_types enable row level security;

drop policy if exists "dev_select_service_transport_types" on service_transport_types;
drop policy if exists "dev_insert_service_transport_types" on service_transport_types;
drop policy if exists "dev_update_service_transport_types" on service_transport_types;
drop policy if exists "dev_delete_service_transport_types" on service_transport_types;

create policy "dev_select_service_transport_types"
on service_transport_types
for select
using (true);

create policy "dev_insert_service_transport_types"
on service_transport_types
for insert
with check (true);

create policy "dev_update_service_transport_types"
on service_transport_types
for update
using (true);

create policy "dev_delete_service_transport_types"
on service_transport_types
for delete
using (true);

insert into service_transport_types (
  service_type,
  transport_type
)
values
  ('Maritimo', 'LCL'),
  ('Terrestre', 'Caja de 53'),
  ('Aereo', 'Paqueteria'),
  ('Terrestre', 'Arrastre de contenedor')
on conflict (service_type, transport_type) do nothing;
