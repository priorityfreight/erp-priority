alter table providers
  add column if not exists tax_id text,
  add column if not exists provider_type text,
  add column if not exists corporate_phone text,
  add column if not exists company_email text,
  add column if not exists website text,
  add column if not exists full_address text,
  add column if not exists postal_code text,
  add column if not exists city_unlocode text,
  add column if not exists city text,
  add column if not exists credit_active boolean not null default false,
  add column if not exists credit_amount numeric,
  add column if not exists credit_days integer;

update providers
set
  corporate_phone = coalesce(corporate_phone, phone),
  company_email = coalesce(company_email, email)
where corporate_phone is null
   or company_email is null;

drop index if exists idx_providers_service_type;
create index if not exists idx_providers_provider_type on providers(provider_type);
create index if not exists idx_providers_status on providers(status);
create index if not exists idx_providers_city_unlocode on providers(city_unlocode);

alter table providers
  alter column status set default 'en_proceso_de_alta';

alter table providers
  drop column if exists service_type,
  drop column if exists email,
  drop column if exists phone,
  drop column if exists credit_terms;

create table if not exists provider_contacts (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  linkedin_url text,
  position text,
  status text not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_provider_contacts_provider_id
  on provider_contacts(provider_id);
create index if not exists idx_provider_contacts_status
  on provider_contacts(status);

create table if not exists provider_service_offerings (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  service_transport_type_id uuid not null references service_transport_types(id),
  terms_and_conditions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (provider_id, service_transport_type_id)
);

create index if not exists idx_provider_service_offerings_provider_id
  on provider_service_offerings(provider_id);
create index if not exists idx_provider_service_offerings_service_transport_type_id
  on provider_service_offerings(service_transport_type_id);

create or replace function create_provider(
  p_name text,
  p_tax_id text default null,
  p_provider_type text default null,
  p_corporate_phone text default null,
  p_company_email text default null,
  p_website text default null,
  p_full_address text default null,
  p_postal_code text default null,
  p_city_unlocode text default null,
  p_status text default 'en_proceso_de_alta',
  p_credit_active boolean default false,
  p_credit_amount numeric default null,
  p_credit_days integer default null,
  p_service_offerings jsonb default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_provider_id uuid;
begin
  insert into providers (
    name,
    tax_id,
    provider_type,
    corporate_phone,
    company_email,
    website,
    full_address,
    postal_code,
    city_unlocode,
    status,
    credit_active,
    credit_amount,
    credit_days
  )
  values (
    p_name,
    nullif(btrim(p_tax_id), ''),
    nullif(btrim(p_provider_type), ''),
    nullif(btrim(p_corporate_phone), ''),
    nullif(btrim(p_company_email), ''),
    nullif(btrim(p_website), ''),
    nullif(btrim(p_full_address), ''),
    nullif(btrim(p_postal_code), ''),
    nullif(upper(btrim(p_city_unlocode)), ''),
    coalesce(nullif(btrim(p_status), ''), 'en_proceso_de_alta'),
    coalesce(p_credit_active, false),
    p_credit_amount,
    p_credit_days
  )
  returning id into new_provider_id;

  if p_service_offerings is not null then
    insert into provider_service_offerings (
      provider_id,
      service_transport_type_id,
      terms_and_conditions
    )
    select
      new_provider_id,
      (offering->>'service_transport_type_id')::uuid,
      nullif(btrim(offering->>'terms_and_conditions'), '')
    from jsonb_array_elements(p_service_offerings) as offering
    where nullif(offering->>'service_transport_type_id', '') is not null;
  end if;

  return new_provider_id;
end;
$$;

create or replace function add_contact_to_provider(
  p_provider_id uuid,
  p_name text,
  p_email text default null,
  p_phone text default null,
  p_linkedin_url text default null,
  p_position text default null,
  p_status text default 'activo'
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_contact_id uuid;
begin
  insert into provider_contacts (
    provider_id,
    name,
    email,
    phone,
    linkedin_url,
    position,
    status
  )
  values (
    p_provider_id,
    p_name,
    nullif(btrim(p_email), ''),
    nullif(btrim(p_phone), ''),
    nullif(btrim(p_linkedin_url), ''),
    nullif(btrim(p_position), ''),
    coalesce(nullif(btrim(p_status), ''), 'activo')
  )
  returning id into new_contact_id;

  return new_contact_id;
end;
$$;

create or replace function get_provider_full(
  p_provider_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  provider_record jsonb;
  contacts_data jsonb;
  service_offerings_data jsonb;
begin
  select to_jsonb(p)
  into provider_record
  from providers p
  where p.id = p_provider_id;

  if provider_record is null then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', pc.id,
        'provider_id', pc.provider_id,
        'name', pc.name,
        'email', pc.email,
        'phone', pc.phone,
        'linkedin_url', pc.linkedin_url,
        'position', pc.position,
        'status', pc.status,
        'created_at', pc.created_at,
        'updated_at', pc.updated_at,
        'provider_name', p.name
      )
      order by pc.name asc
    ),
    '[]'::jsonb
  )
  into contacts_data
  from provider_contacts pc
  join providers p on p.id = pc.provider_id
  where pc.provider_id = p_provider_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', pso.id,
        'provider_id', pso.provider_id,
        'provider_name', p.name,
        'service_transport_type_id', pso.service_transport_type_id,
        'service_type', stt.service_type,
        'transport_type', stt.transport_type,
        'terms_and_conditions', pso.terms_and_conditions,
        'created_at', pso.created_at,
        'updated_at', pso.updated_at
      )
      order by stt.service_type asc, stt.transport_type asc
    ),
    '[]'::jsonb
  )
  into service_offerings_data
  from provider_service_offerings pso
  join providers p on p.id = pso.provider_id
  join service_transport_types stt on stt.id = pso.service_transport_type_id
  where pso.provider_id = p_provider_id;

  return jsonb_build_object(
    'provider', provider_record,
    'contacts', contacts_data,
    'service_offerings', service_offerings_data
  );
end;
$$;

create or replace function search_providers(
  p_query text
)
returns setof providers
language plpgsql
security definer
as $$
begin
  return query
  select *
  from providers
  where
    name ilike '%' || p_query || '%'
    or coalesce(provider_type, '') ilike '%' || p_query || '%'
    or coalesce(company_email, '') ilike '%' || p_query || '%'
    or coalesce(city, '') ilike '%' || p_query || '%'
    or coalesce(country, '') ilike '%' || p_query || '%'
  order by name asc;
end;
$$;

create or replace view provider_overview_view as
select
  p.id,
  p.name as provider_name,
  p.provider_type,
  p.city,
  p.country,
  p.status,
  p.credit_active,
  p.credit_amount,
  p.credit_days,
  count(distinct pc.id) as total_contacts,
  count(distinct pso.id) as total_service_offerings
from providers p
left join provider_contacts pc on pc.provider_id = p.id
left join provider_service_offerings pso on pso.provider_id = p.id
group by
  p.id,
  p.name,
  p.provider_type,
  p.city,
  p.country,
  p.status,
  p.credit_active,
  p.credit_amount,
  p.credit_days;

create or replace view provider_contacts_view as
select
  pc.id,
  pc.provider_id,
  pc.name,
  pc.email,
  pc.phone,
  pc.linkedin_url,
  pc.position,
  pc.status,
  pc.created_at,
  pc.updated_at,
  p.name as provider_name
from provider_contacts pc
join providers p on p.id = pc.provider_id;

create or replace view provider_service_offering_view as
select
  pso.id,
  pso.provider_id,
  p.name as provider_name,
  pso.service_transport_type_id,
  stt.service_type,
  stt.transport_type,
  pso.terms_and_conditions,
  pso.created_at,
  pso.updated_at
from provider_service_offerings pso
join providers p on p.id = pso.provider_id
join service_transport_types stt on stt.id = pso.service_transport_type_id;

create or replace function apply_provider_location_fields()
returns trigger
language plpgsql
as $$
declare
  normalized_city text;
  normalized_country text;
begin
  if nullif(btrim(coalesce(new.city_unlocode, '')), '') is null then
    new.city_unlocode := null;
    new.city := null;
    new.country := null;
    return new;
  end if;

  new.city_unlocode := upper(btrim(new.city_unlocode));

  select
    case
      when subdivision_code is not null and subdivision_code <> ''
        then name || ', ' || subdivision_code
      else name
    end,
    country_name
  into normalized_city, normalized_country
  from unlocodes
  where unlocode = new.city_unlocode;

  new.city := normalized_city;
  new.country := normalized_country;

  return new;
end;
$$;

drop trigger if exists set_provider_location_fields on providers;
create trigger set_provider_location_fields
before insert or update on providers
for each row
execute function apply_provider_location_fields();

drop trigger if exists set_provider_contacts_updated_at on provider_contacts;
create trigger set_provider_contacts_updated_at
before update on provider_contacts
for each row
execute function set_updated_at();

drop trigger if exists set_provider_service_offerings_updated_at on provider_service_offerings;
create trigger set_provider_service_offerings_updated_at
before update on provider_service_offerings
for each row
execute function set_updated_at();

drop trigger if exists audit_providers on providers;
create trigger audit_providers
after insert or update or delete on providers
for each row
execute function audit_trigger();

drop trigger if exists audit_provider_contacts on provider_contacts;
create trigger audit_provider_contacts
after insert or update or delete on provider_contacts
for each row
execute function audit_trigger();

drop trigger if exists audit_provider_service_offerings on provider_service_offerings;
create trigger audit_provider_service_offerings
after insert or update or delete on provider_service_offerings
for each row
execute function audit_trigger();

alter table providers enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'providers' and policyname = 'dev_select_providers'
  ) then
    create policy "dev_select_providers" on providers for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'providers' and policyname = 'dev_insert_providers'
  ) then
    create policy "dev_insert_providers" on providers for insert with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'providers' and policyname = 'dev_update_providers'
  ) then
    create policy "dev_update_providers" on providers for update using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'providers' and policyname = 'dev_delete_providers'
  ) then
    create policy "dev_delete_providers" on providers for delete using (true);
  end if;
end $$;

alter table provider_contacts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'provider_contacts' and policyname = 'dev_select_provider_contacts'
  ) then
    create policy "dev_select_provider_contacts" on provider_contacts for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'provider_contacts' and policyname = 'dev_insert_provider_contacts'
  ) then
    create policy "dev_insert_provider_contacts" on provider_contacts for insert with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'provider_contacts' and policyname = 'dev_update_provider_contacts'
  ) then
    create policy "dev_update_provider_contacts" on provider_contacts for update using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'provider_contacts' and policyname = 'dev_delete_provider_contacts'
  ) then
    create policy "dev_delete_provider_contacts" on provider_contacts for delete using (true);
  end if;
end $$;

alter table provider_service_offerings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'provider_service_offerings' and policyname = 'dev_select_provider_service_offerings'
  ) then
    create policy "dev_select_provider_service_offerings" on provider_service_offerings for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'provider_service_offerings' and policyname = 'dev_insert_provider_service_offerings'
  ) then
    create policy "dev_insert_provider_service_offerings" on provider_service_offerings for insert with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'provider_service_offerings' and policyname = 'dev_update_provider_service_offerings'
  ) then
    create policy "dev_update_provider_service_offerings" on provider_service_offerings for update using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'provider_service_offerings' and policyname = 'dev_delete_provider_service_offerings'
  ) then
    create policy "dev_delete_provider_service_offerings" on provider_service_offerings for delete using (true);
  end if;
end $$;
