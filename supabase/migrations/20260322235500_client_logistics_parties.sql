create table if not exists public.client_logistics_parties (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  party_type text not null default 'shipper',
  name text not null,
  full_address text,
  postal_code text,
  city_unlocode text,
  city_unlocode_id uuid references public.unlocodes(id),
  city text,
  country text,
  contact_name text,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint client_logistics_parties_type_check
    check (party_type in ('shipper', 'consignee', 'aa'))
);

create index if not exists idx_client_logistics_parties_client_id
  on public.client_logistics_parties(client_id);

create index if not exists idx_client_logistics_parties_type
  on public.client_logistics_parties(party_type);

create index if not exists idx_client_logistics_parties_city_unlocode_id
  on public.client_logistics_parties(city_unlocode_id);

create or replace function public.add_client_logistics_party(
  p_client_id uuid,
  p_party_type text,
  p_name text,
  p_full_address text default null,
  p_postal_code text default null,
  p_city_unlocode text default null,
  p_contact_name text default null,
  p_contact_email text default null,
  p_contact_phone text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  normalized_party_type text;
  new_party_id uuid;
begin
  normalized_party_type := lower(coalesce(nullif(btrim(p_party_type), ''), 'shipper'));

  if normalized_party_type not in ('shipper', 'consignee', 'aa') then
    raise exception 'Invalid party_type. Expected shipper, consignee, or aa';
  end if;

  if nullif(btrim(coalesce(p_name, '')), '') is null then
    raise exception 'name is required';
  end if;

  insert into public.client_logistics_parties (
    client_id,
    party_type,
    name,
    full_address,
    postal_code,
    city_unlocode,
    contact_name,
    contact_email,
    contact_phone
  )
  values (
    p_client_id,
    normalized_party_type,
    btrim(p_name),
    nullif(btrim(coalesce(p_full_address, '')), ''),
    nullif(btrim(coalesce(p_postal_code, '')), ''),
    nullif(upper(btrim(coalesce(p_city_unlocode, ''))), ''),
    nullif(btrim(coalesce(p_contact_name, '')), ''),
    nullif(btrim(coalesce(p_contact_email, '')), ''),
    nullif(btrim(coalesce(p_contact_phone, '')), '')
  )
  returning id into new_party_id;

  return new_party_id;
end;
$$;

create or replace function public.delete_client_logistics_party(
  p_party_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  delete from public.client_logistics_parties
  where id = p_party_id;
end;
$$;

create or replace function public.apply_client_logistics_party_location_fields()
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

drop trigger if exists set_client_logistics_parties_updated_at on public.client_logistics_parties;
create trigger set_client_logistics_parties_updated_at
before update on public.client_logistics_parties
for each row
execute function public.set_updated_at();

drop trigger if exists set_client_logistics_party_location_fields on public.client_logistics_parties;
create trigger set_client_logistics_party_location_fields
before insert or update on public.client_logistics_parties
for each row
execute function public.apply_client_logistics_party_location_fields();

create or replace function public.get_client_full(
  p_client_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'client', to_jsonb(c),
    'contacts', coalesce(
      (
        select jsonb_agg(to_jsonb(ct) order by ct.created_at desc)
        from public.contacts ct
        where ct.client_id = c.id
      ),
      '[]'::jsonb
    ),
    'logistics_parties', coalesce(
      (
        select jsonb_agg(to_jsonb(clp) order by clp.created_at desc)
        from public.client_logistics_parties clp
        where clp.client_id = c.id
      ),
      '[]'::jsonb
    ),
    'opportunities', coalesce(
      (
        select jsonb_agg(to_jsonb(o) order by o.created_at desc)
        from public.opportunities o
        where o.client_id = c.id
      ),
      '[]'::jsonb
    ),
    'quotations', coalesce(
      (
        select jsonb_agg(to_jsonb(q) order by q.created_at desc)
        from public.quotations q
        where q.client_id = c.id
      ),
      '[]'::jsonb
    ),
    'shipments', coalesce(
      (
        select jsonb_agg(to_jsonb(s) order by s.created_at desc)
        from public.shipments s
        where s.client_id = c.id
      ),
      '[]'::jsonb
    )
  )
  into result
  from public.clients c
  where c.id = p_client_id
    and c.is_deleted = false;

  return result;
end;
$$;

alter table public.client_logistics_parties enable row level security;

drop policy if exists "dev_select_client_logistics_parties" on public.client_logistics_parties;
drop policy if exists "dev_insert_client_logistics_parties" on public.client_logistics_parties;
drop policy if exists "dev_update_client_logistics_parties" on public.client_logistics_parties;
drop policy if exists "dev_delete_client_logistics_parties" on public.client_logistics_parties;

create policy "dev_select_client_logistics_parties"
on public.client_logistics_parties
for select
using (true);

create policy "dev_insert_client_logistics_parties"
on public.client_logistics_parties
for insert
with check (true);

create policy "dev_update_client_logistics_parties"
on public.client_logistics_parties
for update
using (true);

create policy "dev_delete_client_logistics_parties"
on public.client_logistics_parties
for delete
using (true);

drop trigger if exists audit_client_logistics_parties on public.client_logistics_parties;
create trigger audit_client_logistics_parties
after insert or update or delete on public.client_logistics_parties
for each row
execute function public.audit_trigger();
