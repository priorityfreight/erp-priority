-- =========================================================
-- PRIORITY LOGISTICS ERP
-- CANONICAL BACKEND UPGRADE
-- =========================================================

create extension if not exists "pgcrypto";


-- =========================================================
-- LEGACY TO CANONICAL COLUMN BRIDGE
-- =========================================================

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clients'
      and column_name = 'name'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clients'
      and column_name = 'company_name'
  ) then
    alter table public.clients rename column name to company_name;
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clients'
      and column_name = 'email'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clients'
      and column_name = 'website'
  ) then
    alter table public.clients rename column email to website;
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clients'
      and column_name = 'phone'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clients'
      and column_name = 'corporate_phone'
  ) then
    alter table public.clients rename column phone to corporate_phone;
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clients'
      and column_name = 'address'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clients'
      and column_name = 'full_address'
  ) then
    alter table public.clients rename column address to full_address;
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'shipments'
      and column_name = 'shipment_number'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'shipments'
      and column_name = 'shipment_reference'
  ) then
    alter table public.shipments rename column shipment_number to shipment_reference;
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'commissions'
      and column_name = 'salesperson_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'commissions'
      and column_name = 'user_id'
  ) then
    alter table public.commissions rename column salesperson_id to user_id;
  end if;
end;
$$;


-- =========================================================
-- ORGANIZATION LAYER
-- =========================================================

create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create unique index if not exists idx_roles_name_unique on roles(name);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text,
  email text not null unique,
  role_id uuid references roles(id),
  branch_id uuid references branches(id),
  base_salary numeric,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'companies'
  ) then
    insert into branches (id, name, created_at)
    select
      c.id,
      c.name,
      coalesce(c.created_at, now())
    from companies c
    on conflict (id) do update
    set name = excluded.name;
  end if;
end;
$$;

alter table if exists users add column if not exists first_name text;
alter table if exists users add column if not exists last_name text;
alter table if exists users add column if not exists role_id uuid references roles(id);
alter table if exists users add column if not exists branch_id uuid references branches(id);
alter table if exists users add column if not exists base_salary numeric;
alter table if exists users add column if not exists active boolean not null default true;
alter table if exists users add column if not exists updated_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'name'
  ) then
    update public.users
    set first_name = coalesce(first_name, nullif(split_part(name, ' ', 1), ''))
    where coalesce(first_name, '') = ''
      and coalesce(name, '') <> '';

    update public.users
    set last_name = coalesce(
      last_name,
      nullif(
        btrim(substr(name, length(split_part(name, ' ', 1)) + 1)),
        ''
      )
    )
    where coalesce(last_name, '') = ''
      and coalesce(name, '') <> '';
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'company_id'
  ) then
    update public.users
    set branch_id = coalesce(branch_id, company_id)
    where company_id is not null;
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'role'
  ) then
    insert into roles (name)
    select distinct u.role
    from public.users u
    where u.role is not null
      and btrim(u.role) <> ''
      and not exists (
        select 1
        from roles r
        where lower(r.name) = lower(u.role)
      );

    update public.users u
    set role_id = r.id
    from roles r
    where lower(r.name) = lower(u.role)
      and u.role_id is null;
  end if;
end;
$$;

create index if not exists idx_users_role_id on users(role_id);
create index if not exists idx_users_branch_id on users(branch_id);


-- =========================================================
-- MASTER DATA LAYER
-- =========================================================

create table if not exists external_data_sources (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  provider text not null,
  source_url text not null,
  license text,
  refresh_strategy text,
  last_imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_external_data_sources_code on external_data_sources(code);

create table if not exists unlocodes (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references external_data_sources(id),
  country_code text not null,
  location_code text not null,
  unlocode text not null unique,
  country_name text not null,
  name text not null,
  name_without_diacritics text,
  subdivision_code text,
  function_classifier text,
  status text,
  change_indicator text,
  date_code text,
  iata_code text,
  coordinates text,
  remarks text,
  source_page_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint unlocodes_country_location_unique unique (country_code, location_code)
);

create index if not exists idx_unlocodes_country_code on unlocodes(country_code);
create index if not exists idx_unlocodes_name on unlocodes(name);
create index if not exists idx_unlocodes_name_without_diacritics on unlocodes(name_without_diacritics);
create index if not exists idx_unlocodes_subdivision_code on unlocodes(subdivision_code);

insert into external_data_sources (
  code,
  name,
  provider,
  source_url,
  license,
  refresh_strategy
)
values (
  'unece_unlocode',
  'UN/LOCODE',
  'UNECE',
  'https://service.unece.org/trade/locode/{country}.htm',
  'UNECE public reference pages',
  'manual snapshot regeneration via scripts/import-unlocode.mjs'
)
on conflict (code) do update
set
  name = excluded.name,
  provider = excluded.provider,
  source_url = excluded.source_url,
  license = excluded.license,
  refresh_strategy = excluded.refresh_strategy;


-- =========================================================
-- CRM LAYER
-- =========================================================

create table if not exists prospects (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text,
  email text,
  phone text,
  source text,
  status text not null default 'new',
  branch_id uuid references branches(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_prospects_branch_id on prospects(branch_id);
create index if not exists idx_prospects_status on prospects(status);

alter table if exists clients add column if not exists prospect_id uuid references prospects(id);
alter table if exists clients add column if not exists company_name text;
alter table if exists clients add column if not exists industry text;
alter table if exists clients add column if not exists country text;
alter table if exists clients add column if not exists website text;
alter table if exists clients add column if not exists corporate_phone text;
alter table if exists clients add column if not exists full_address text;
alter table if exists clients add column if not exists postal_code text;
alter table if exists clients add column if not exists city text;
alter table if exists clients add column if not exists city_unlocode text;
alter table if exists clients add column if not exists tax_id text;
alter table if exists clients add column if not exists status text;
alter table if exists clients add column if not exists branch_id uuid references branches(id);
alter table if exists clients add column if not exists credit_limit numeric;
alter table if exists clients add column if not exists credit_days integer;
alter table if exists clients add column if not exists updated_at timestamptz;
alter table if exists clients add column if not exists is_deleted boolean not null default false;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clients'
      and column_name = 'company_id'
  ) then
    update public.clients
    set branch_id = coalesce(branch_id, company_id)
    where company_id is not null;
  end if;
end;
$$;

update clients
set
  company_name = coalesce(nullif(company_name, ''), 'Unnamed Client'),
  status = coalesce(nullif(status, ''), 'cliente'),
  is_deleted = coalesce(is_deleted, false)
where true;

alter table clients alter column company_name set not null;
alter table clients alter column status set not null;
alter table clients alter column status set default 'prospecto';
alter table clients alter column is_deleted set default false;

create index if not exists idx_clients_prospect_id on clients(prospect_id);
create index if not exists idx_clients_branch_id on clients(branch_id);
create index if not exists idx_clients_status on clients(status);

alter table if exists contacts add column if not exists updated_at timestamptz;
alter table if exists contacts add column if not exists is_primary boolean not null default false;

delete from contacts where client_id is null;
update contacts
set name = coalesce(nullif(name, ''), 'Unnamed Contact')
where true;

alter table contacts alter column client_id set not null;
alter table contacts alter column name set not null;

create index if not exists idx_contacts_client_id on contacts(client_id);


-- =========================================================
-- COMMERCIAL REFERENCE LAYER
-- =========================================================

create table if not exists providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text,
  service_type text,
  email text,
  phone text,
  credit_terms text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_providers_service_type on providers(service_type);
create index if not exists idx_providers_status on providers(status);

create table if not exists incoterms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);


-- =========================================================
-- SALES LAYER
-- =========================================================

alter table if exists opportunities add column if not exists salesperson_id uuid references users(id);
alter table if exists opportunities add column if not exists description text;
alter table if exists opportunities add column if not exists trade_lane text;
alter table if exists opportunities add column if not exists service_type text;
alter table if exists opportunities add column if not exists probability integer;
alter table if exists opportunities add column if not exists estimated_close_date date;
alter table if exists opportunities add column if not exists updated_at timestamptz;

delete from opportunities where client_id is null;
update opportunities
set
  title = coalesce(nullif(title, ''), 'Untitled Opportunity'),
  status = coalesce(nullif(status, ''), 'open'),
  stage = coalesce(nullif(stage, ''), 'qualification')
where true;

alter table opportunities alter column client_id set not null;
alter table opportunities alter column title set not null;
alter table opportunities alter column status set not null;
alter table opportunities alter column status set default 'open';
alter table opportunities alter column stage set not null;
alter table opportunities alter column stage set default 'qualification';

create index if not exists idx_opportunities_client_id on opportunities(client_id);
create index if not exists idx_opportunities_salesperson_id on opportunities(salesperson_id);
create index if not exists idx_opportunities_status on opportunities(status);
create index if not exists idx_opportunities_stage on opportunities(stage);

alter table if exists quotations add column if not exists client_id uuid references clients(id);
alter table if exists quotations add column if not exists created_by uuid references users(id);
alter table if exists quotations add column if not exists reference_number text;
alter table if exists quotations add column if not exists currency text;
alter table if exists quotations add column if not exists estimated_cost numeric;
alter table if exists quotations add column if not exists estimated_price numeric;
alter table if exists quotations add column if not exists expected_profit numeric;
alter table if exists quotations add column if not exists valid_until date;
alter table if exists quotations add column if not exists incoterm_id uuid references incoterms(id);
alter table if exists quotations add column if not exists updated_at timestamptz;

update quotations q
set client_id = o.client_id
from opportunities o
where q.opportunity_id = o.id
  and q.client_id is null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'quotations'
      and column_name = 'total_price'
  ) then
    update quotations
    set
      status = coalesce(nullif(status, ''), 'draft'),
      currency = coalesce(nullif(currency, ''), 'USD'),
      estimated_price = coalesce(estimated_price, total_price)
    where true;
  else
    update quotations
    set
      status = coalesce(nullif(status, ''), 'draft'),
      currency = coalesce(nullif(currency, ''), 'USD')
    where true;
  end if;
end;
$$;

delete from quotations where opportunity_id is null or client_id is null;

alter table quotations alter column client_id set not null;
alter table quotations alter column opportunity_id set not null;
alter table quotations alter column status set not null;
alter table quotations alter column status set default 'draft';
alter table quotations alter column currency set not null;
alter table quotations alter column currency set default 'USD';

create unique index if not exists idx_quotations_reference_number_unique
on quotations(reference_number)
where reference_number is not null;
create index if not exists idx_quotations_client_id on quotations(client_id);
create index if not exists idx_quotations_opportunity_id on quotations(opportunity_id);
create index if not exists idx_quotations_status on quotations(status);

create table if not exists quotation_costs (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations(id) on delete cascade,
  provider_id uuid references providers(id),
  service_name text not null,
  cost numeric not null,
  currency text not null default 'USD',
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_quotation_costs_quotation_id on quotation_costs(quotation_id);
create index if not exists idx_quotation_costs_provider_id on quotation_costs(provider_id);


-- =========================================================
-- OPERATIONS LAYER
-- =========================================================

alter table if exists shipments add column if not exists client_id uuid references clients(id);
alter table if exists shipments add column if not exists shipment_reference text;
alter table if exists shipments add column if not exists origin text;
alter table if exists shipments add column if not exists destination text;
alter table if exists shipments add column if not exists booking_number text;
alter table if exists shipments add column if not exists delivered_at timestamptz;
alter table if exists shipments add column if not exists created_at timestamptz not null default now();
alter table if exists shipments add column if not exists updated_at timestamptz;

update shipments s
set
  client_id = q.client_id,
  origin = coalesce(s.origin, q.origin),
  destination = coalesce(s.destination, q.destination)
from quotations q
where s.quotation_id = q.id
  and (
    s.client_id is null
    or s.origin is null
    or s.destination is null
  );

update shipments
set status = coalesce(nullif(status, ''), 'pending')
where true;

delete from shipments where quotation_id is null or client_id is null;

alter table shipments alter column quotation_id set not null;
alter table shipments alter column client_id set not null;
alter table shipments alter column status set not null;
alter table shipments alter column status set default 'pending';

create unique index if not exists idx_shipments_reference_unique
on shipments(shipment_reference)
where shipment_reference is not null;
create index if not exists idx_shipments_quotation_id on shipments(quotation_id);
create index if not exists idx_shipments_client_id on shipments(client_id);
create index if not exists idx_shipments_status on shipments(status);

create table if not exists shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references shipments(id) on delete cascade,
  event_type text not null,
  event_date timestamptz not null default now(),
  location text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_shipment_events_shipment_id on shipment_events(shipment_id);


-- =========================================================
-- FINANCE LAYER
-- =========================================================

create table if not exists client_invoices (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid references shipments(id),
  client_id uuid not null references clients(id),
  invoice_number text unique,
  total_amount numeric not null,
  currency text not null default 'USD',
  status text not null default 'pending',
  issue_date date,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'invoices'
  ) then
    insert into client_invoices (
      id,
      shipment_id,
      client_id,
      invoice_number,
      total_amount,
      currency,
      status,
      issue_date
    )
    select
      i.id,
      i.shipment_id,
      s.client_id,
      i.invoice_number,
      coalesce(i.total, 0),
      'USD',
      'pending',
      i.issued_date
    from invoices i
    join shipments s on s.id = i.shipment_id
    on conflict (id) do update
    set
      shipment_id = excluded.shipment_id,
      client_id = excluded.client_id,
      invoice_number = excluded.invoice_number,
      total_amount = excluded.total_amount,
      issue_date = excluded.issue_date;
  end if;
end;
$$;

create index if not exists idx_client_invoices_shipment_id on client_invoices(shipment_id);
create index if not exists idx_client_invoices_client_id on client_invoices(client_id);
create index if not exists idx_client_invoices_status on client_invoices(status);

create table if not exists provider_invoices (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id),
  shipment_id uuid references shipments(id),
  invoice_number text unique,
  total_amount numeric not null,
  currency text not null default 'USD',
  status text not null default 'pending',
  issue_date date,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_provider_invoices_provider_id on provider_invoices(provider_id);
create index if not exists idx_provider_invoices_shipment_id on provider_invoices(shipment_id);
create index if not exists idx_provider_invoices_status on provider_invoices(status);

alter table if exists commissions add column if not exists expected_profit numeric;
alter table if exists commissions add column if not exists actual_profit numeric;
alter table if exists commissions add column if not exists status text;
alter table if exists commissions add column if not exists created_at timestamptz not null default now();
alter table if exists commissions add column if not exists updated_at timestamptz;

update commissions
set status = coalesce(nullif(status, ''), 'pending')
where true;

delete from commissions where user_id is null or shipment_id is null;

alter table commissions alter column user_id set not null;
alter table commissions alter column shipment_id set not null;
alter table commissions alter column status set not null;
alter table commissions alter column status set default 'pending';

create index if not exists idx_commissions_shipment_id on commissions(shipment_id);
create index if not exists idx_commissions_user_id on commissions(user_id);


-- =========================================================
-- OBSERVABILITY LAYER
-- =========================================================

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  action text not null,
  user_id uuid references users(id),
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_table_name on audit_logs(table_name);
create index if not exists idx_audit_logs_record_id on audit_logs(record_id);

create table if not exists automation_logs (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  action text not null,
  status text not null,
  error_message text,
  created_at timestamptz not null default now()
);


-- =========================================================
-- ERP BUSINESS LOGIC FUNCTIONS
-- =========================================================

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
    city_unlocode
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
    p_city_unlocode
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

create or replace function add_contact_to_client(
  p_client_id uuid,
  p_name text,
  p_email text default null,
  p_phone text default null,
  p_position text default null,
  p_is_primary boolean default false
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_contact_id uuid;
begin
  insert into contacts (
    client_id,
    name,
    email,
    phone,
    position,
    is_primary
  )
  values (
    p_client_id,
    p_name,
    p_email,
    p_phone,
    p_position,
    p_is_primary
  )
  returning id into new_contact_id;

  return new_contact_id;
end;
$$;

create or replace function create_opportunity(
  p_client_id uuid,
  p_title text,
  p_estimated_value numeric default null,
  p_origin text default null,
  p_destination text default null,
  p_stage text default 'qualification'
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
    title,
    estimated_value,
    origin,
    destination,
    stage,
    status
  )
  values (
    p_client_id,
    p_title,
    p_estimated_value,
    p_origin,
    p_destination,
    p_stage,
    'open'
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
  set status = 'quoted'
  where id = p_opportunity_id;

  return new_quotation_id;
end;
$$;

create or replace function approve_quotation(
  p_quotation_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  update quotations
  set status = 'approved'
  where id = p_quotation_id;
end;
$$;

create or replace function create_shipment(
  p_quotation_id uuid
)
returns uuid
language plpgsql
security definer
as $$
declare
  existing_shipment_id uuid;
  quotation_row quotations%rowtype;
  new_shipment_id uuid;
begin
  select id
  into existing_shipment_id
  from shipments
  where quotation_id = p_quotation_id
  limit 1;

  if existing_shipment_id is not null then
    return existing_shipment_id;
  end if;

  select *
  into quotation_row
  from quotations
  where id = p_quotation_id;

  if not found then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  insert into shipments (
    quotation_id,
    client_id,
    status,
    origin,
    destination
  )
  values (
    quotation_row.id,
    quotation_row.client_id,
    'pending',
    quotation_row.origin,
    quotation_row.destination
  )
  returning id into new_shipment_id;

  return new_shipment_id;
end;
$$;

create or replace function update_shipment_status(
  p_shipment_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
as $$
begin
  update shipments
  set status = p_status
  where id = p_shipment_id;
end;
$$;

create or replace function mark_shipment_delivered(
  p_shipment_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  update shipments
  set
    status = 'delivered',
    delivered_at = now()
  where id = p_shipment_id;
end;
$$;

create or replace function get_client_full(
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
        from contacts ct
        where ct.client_id = c.id
      ),
      '[]'::jsonb
    ),
    'opportunities', coalesce(
      (
        select jsonb_agg(to_jsonb(o) order by o.created_at desc)
        from opportunities o
        where o.client_id = c.id
      ),
      '[]'::jsonb
    ),
    'quotations', coalesce(
      (
        select jsonb_agg(to_jsonb(q) order by q.created_at desc)
        from quotations q
        where q.client_id = c.id
      ),
      '[]'::jsonb
    ),
    'shipments', coalesce(
      (
        select jsonb_agg(to_jsonb(s) order by s.created_at desc)
        from shipments s
        where s.client_id = c.id
      ),
      '[]'::jsonb
    )
  )
  into result
  from clients c
  where c.id = p_client_id
    and c.is_deleted = false;

  return result;
end;
$$;

create or replace function soft_delete_client(
  p_client_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  update clients
  set
    is_deleted = true,
    status = 'inactive'
  where id = p_client_id;
end;
$$;

create or replace function search_clients(
  p_query text
)
returns setof clients
language plpgsql
security definer
as $$
begin
  return query
  select *
  from clients
  where is_deleted = false
    and (
      company_name ilike '%' || p_query || '%'
      or coalesce(website, '') ilike '%' || p_query || '%'
      or coalesce(country, '') ilike '%' || p_query || '%'
      or coalesce(city, '') ilike '%' || p_query || '%'
    )
  order by company_name asc;
end;
$$;

create or replace function search_unlocodes(
  p_query text default null,
  p_country_code text default null,
  p_function_classifier text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  source_id uuid,
  country_code text,
  location_code text,
  unlocode text,
  country_name text,
  name text,
  name_without_diacritics text,
  subdivision_code text,
  function_classifier text,
  status text,
  change_indicator text,
  date_code text,
  iata_code text,
  coordinates text,
  remarks text,
  source_page_url text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
as $$
  select
    u.id,
    u.source_id,
    u.country_code,
    u.location_code,
    u.unlocode,
    u.country_name,
    u.name,
    u.name_without_diacritics,
    u.subdivision_code,
    u.function_classifier,
    u.status,
    u.change_indicator,
    u.date_code,
    u.iata_code,
    u.coordinates,
    u.remarks,
    u.source_page_url,
    u.created_at,
    u.updated_at
  from unlocodes u
  where (
    p_query is null
    or btrim(p_query) = ''
    or u.unlocode ilike '%' || btrim(p_query) || '%'
    or u.name ilike '%' || btrim(p_query) || '%'
    or coalesce(u.name_without_diacritics, '') ilike '%' || btrim(p_query) || '%'
    or coalesce(u.country_name, '') ilike '%' || btrim(p_query) || '%'
    or coalesce(u.subdivision_code, '') ilike '%' || btrim(p_query) || '%'
    or coalesce(u.iata_code, '') ilike '%' || btrim(p_query) || '%'
  )
    and (
      p_country_code is null
      or btrim(p_country_code) = ''
      or u.country_code = upper(btrim(p_country_code))
    )
    and (
      p_function_classifier is null
      or btrim(p_function_classifier) = ''
      or coalesce(u.function_classifier, '') ilike '%' || btrim(p_function_classifier) || '%'
    )
  order by u.country_code asc, u.name asc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
$$;


-- =========================================================
-- ERP ANALYTICS VIEWS
-- =========================================================

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
      and o.status <> 'lost'
  ) as pipeline_value
from clients c
where c.is_deleted = false;

create or replace view sales_pipeline_view as
select
  stage,
  status,
  count(*) as opportunities,
  coalesce(sum(estimated_value), 0) as pipeline_value
from opportunities
group by stage, status;

create or replace view open_opportunities_view as
select
  o.id,
  o.title,
  o.stage,
  o.status,
  o.origin,
  o.destination,
  o.estimated_value,
  o.created_at,
  c.id as client_id,
  c.company_name as client_name
from opportunities o
join clients c on c.id = o.client_id
where o.status not in ('won', 'lost', 'cancelled')
  and c.is_deleted = false;

create or replace view quotation_summary_view as
select
  q.id,
  q.reference_number,
  q.status,
  q.service_type,
  q.origin,
  q.destination,
  q.currency,
  q.estimated_cost,
  q.estimated_price,
  q.expected_profit,
  q.created_at,
  c.id as client_id,
  c.company_name as client_name,
  o.id as opportunity_id,
  o.title as opportunity_title
from quotations q
join clients c on c.id = q.client_id
join opportunities o on o.id = q.opportunity_id
where c.is_deleted = false;

create or replace view active_shipments_view as
select
  s.id,
  s.shipment_reference,
  s.status,
  s.origin,
  s.destination,
  s.booking_number,
  s.departure_date,
  s.arrival_date,
  s.created_at,
  c.id as client_id,
  c.company_name as client_name,
  q.reference_number as quotation_reference
from shipments s
join clients c on c.id = s.client_id
join quotations q on q.id = s.quotation_id
where s.status not in ('delivered', 'cancelled')
  and c.is_deleted = false;

create or replace view delivered_shipments_view as
select
  s.id,
  s.shipment_reference,
  s.status,
  s.origin,
  s.destination,
  s.departure_date,
  s.arrival_date,
  s.delivered_at,
  s.created_at,
  c.id as client_id,
  c.company_name as client_name,
  q.reference_number as quotation_reference
from shipments s
join clients c on c.id = s.client_id
join quotations q on q.id = s.quotation_id
where s.status = 'delivered'
  and c.is_deleted = false;

create or replace view client_revenue_view as
select
  c.id as client_id,
  c.company_name as client_name,
  (
    select count(*)
    from shipments s
    where s.client_id = c.id
  ) as total_shipments,
  (
    select count(*)
    from client_invoices ci
    where ci.client_id = c.id
  ) as total_invoices,
  (
    select coalesce(sum(ci.total_amount), 0)
    from client_invoices ci
    where ci.client_id = c.id
  ) as billed_amount,
  (
    select coalesce(sum(q.expected_profit), 0)
    from quotations q
    where q.client_id = c.id
  ) as expected_profit
from clients c
where c.is_deleted = false;

create or replace view monthly_sales_view as
select
  date_trunc('month', created_at) as month,
  count(*) as opportunities,
  coalesce(sum(estimated_value), 0) as total_value
from opportunities
group by month
order by month desc;

create or replace view shipment_activity_view as
select
  status,
  count(*) as shipments
from shipments
group by status;

create or replace view client_contacts_view as
select
  ct.id,
  ct.client_id,
  ct.name,
  ct.email,
  ct.phone,
  ct.position,
  ct.is_primary,
  ct.created_at,
  c.company_name as client_name
from contacts ct
join clients c on c.id = ct.client_id
where c.is_deleted = false;

create or replace view unlocode_lookup_view as
select
  u.id,
  u.source_id,
  u.country_code,
  u.location_code,
  u.unlocode,
  u.country_name,
  u.name,
  u.name_without_diacritics,
  u.subdivision_code,
  u.function_classifier,
  u.status,
  u.change_indicator,
  u.date_code,
  u.iata_code,
  u.coordinates,
  u.remarks,
  u.source_page_url,
  u.created_at,
  u.updated_at,
  case
    when coalesce(u.subdivision_code, '') <> '' then u.unlocode || ' - ' || u.name || ' (' || u.subdivision_code || ')'
    else u.unlocode || ' - ' || u.name
  end as display_name
from unlocodes u;


-- =========================================================
-- ERP AUTOMATION LAYER
-- =========================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_branches_updated_at on branches;
create trigger set_branches_updated_at
before update on branches
for each row
execute function set_updated_at();

drop trigger if exists set_roles_updated_at on roles;
create trigger set_roles_updated_at
before update on roles
for each row
execute function set_updated_at();

drop trigger if exists set_users_updated_at on users;
create trigger set_users_updated_at
before update on users
for each row
execute function set_updated_at();

drop trigger if exists set_external_data_sources_updated_at on external_data_sources;
create trigger set_external_data_sources_updated_at
before update on external_data_sources
for each row
execute function set_updated_at();

drop trigger if exists set_unlocodes_updated_at on unlocodes;
create trigger set_unlocodes_updated_at
before update on unlocodes
for each row
execute function set_updated_at();

drop trigger if exists set_prospects_updated_at on prospects;
create trigger set_prospects_updated_at
before update on prospects
for each row
execute function set_updated_at();

drop trigger if exists set_clients_updated_at on clients;
create trigger set_clients_updated_at
before update on clients
for each row
execute function set_updated_at();

drop trigger if exists set_contacts_updated_at on contacts;
create trigger set_contacts_updated_at
before update on contacts
for each row
execute function set_updated_at();

drop trigger if exists set_providers_updated_at on providers;
create trigger set_providers_updated_at
before update on providers
for each row
execute function set_updated_at();

drop trigger if exists set_incoterms_updated_at on incoterms;
create trigger set_incoterms_updated_at
before update on incoterms
for each row
execute function set_updated_at();

drop trigger if exists set_opportunities_updated_at on opportunities;
create trigger set_opportunities_updated_at
before update on opportunities
for each row
execute function set_updated_at();

drop trigger if exists set_quotations_updated_at on quotations;
create trigger set_quotations_updated_at
before update on quotations
for each row
execute function set_updated_at();

drop trigger if exists set_shipments_updated_at on shipments;
create trigger set_shipments_updated_at
before update on shipments
for each row
execute function set_updated_at();

drop trigger if exists set_client_invoices_updated_at on client_invoices;
create trigger set_client_invoices_updated_at
before update on client_invoices
for each row
execute function set_updated_at();

drop trigger if exists set_provider_invoices_updated_at on provider_invoices;
create trigger set_provider_invoices_updated_at
before update on provider_invoices
for each row
execute function set_updated_at();

drop trigger if exists set_commissions_updated_at on commissions;
create trigger set_commissions_updated_at
before update on commissions
for each row
execute function set_updated_at();

create or replace function generate_reference(prefix text)
returns text
language plpgsql
as $$
begin
  return prefix || '-' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 6);
end;
$$;

create or replace function set_quotation_reference()
returns trigger
language plpgsql
as $$
begin
  if new.reference_number is null then
    new.reference_number := generate_reference('QT');
  end if;

  return new;
end;
$$;

drop trigger if exists quotation_reference_trigger on quotations;
create trigger quotation_reference_trigger
before insert on quotations
for each row
execute function set_quotation_reference();

create or replace function set_shipment_reference()
returns trigger
language plpgsql
as $$
begin
  if new.shipment_reference is null then
    new.shipment_reference := generate_reference('SHP');
  end if;

  return new;
end;
$$;

drop trigger if exists shipment_reference_trigger on shipments;
create trigger shipment_reference_trigger
before insert on shipments
for each row
execute function set_shipment_reference();

create or replace function create_shipment_from_quotation()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'approved' and coalesce(old.status, '') <> 'approved' then
    begin
      perform create_shipment(new.id);

      insert into automation_logs (event, action, status)
      values ('quotation_approved', 'create_shipment', 'success');
    exception
      when others then
        insert into automation_logs (event, action, status, error_message)
        values ('quotation_approved', 'create_shipment', 'failed', sqlerrm);
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists quotation_approved_trigger on quotations;
create trigger quotation_approved_trigger
after update on quotations
for each row
execute function create_shipment_from_quotation();

create or replace function prevent_hard_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Hard delete not allowed. Use the soft_delete_client() function.';
  return old;
end;
$$;

drop trigger if exists prevent_clients_delete on clients;
create trigger prevent_clients_delete
before delete on clients
for each row
execute function prevent_hard_delete();

create or replace function audit_trigger()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    insert into audit_logs (
      table_name,
      record_id,
      action,
      user_id,
      payload
    )
    values (
      tg_table_name,
      old.id,
      tg_op,
      auth.uid(),
      to_jsonb(old)
    );

    return old;
  end if;

  insert into audit_logs (
    table_name,
    record_id,
    action,
    user_id,
    payload
  )
  values (
    tg_table_name,
    new.id,
    tg_op,
    auth.uid(),
    to_jsonb(new)
  );

  return new;
end;
$$;

drop trigger if exists audit_clients on clients;
create trigger audit_clients
after insert or update or delete on clients
for each row
execute function audit_trigger();

drop trigger if exists audit_opportunities on opportunities;
create trigger audit_opportunities
after insert or update or delete on opportunities
for each row
execute function audit_trigger();

drop trigger if exists audit_quotations on quotations;
create trigger audit_quotations
after insert or update or delete on quotations
for each row
execute function audit_trigger();

drop trigger if exists audit_shipments on shipments;
create trigger audit_shipments
after insert or update or delete on shipments
for each row
execute function audit_trigger();

drop trigger if exists audit_client_invoices on client_invoices;
create trigger audit_client_invoices
after insert or update or delete on client_invoices
for each row
execute function audit_trigger();

drop trigger if exists audit_provider_invoices on provider_invoices;
create trigger audit_provider_invoices
after insert or update or delete on provider_invoices
for each row
execute function audit_trigger();


-- =========================================================
-- ERP SECURITY POLICIES
-- DEVELOPMENT MODE
-- =========================================================

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;

alter table clients enable row level security;
drop policy if exists "dev_select_clients" on clients;
drop policy if exists "dev_insert_clients" on clients;
drop policy if exists "dev_update_clients" on clients;
drop policy if exists "dev_delete_clients" on clients;
create policy "dev_select_clients" on clients for select using (true);
create policy "dev_insert_clients" on clients for insert with check (true);
create policy "dev_update_clients" on clients for update using (true);
create policy "dev_delete_clients" on clients for delete using (true);

alter table contacts enable row level security;
drop policy if exists "dev_select_contacts" on contacts;
drop policy if exists "dev_insert_contacts" on contacts;
drop policy if exists "dev_update_contacts" on contacts;
drop policy if exists "dev_delete_contacts" on contacts;
create policy "dev_select_contacts" on contacts for select using (true);
create policy "dev_insert_contacts" on contacts for insert with check (true);
create policy "dev_update_contacts" on contacts for update using (true);
create policy "dev_delete_contacts" on contacts for delete using (true);

alter table opportunities enable row level security;
drop policy if exists "dev_select_opportunities" on opportunities;
drop policy if exists "dev_insert_opportunities" on opportunities;
drop policy if exists "dev_update_opportunities" on opportunities;
drop policy if exists "dev_delete_opportunities" on opportunities;
create policy "dev_select_opportunities" on opportunities for select using (true);
create policy "dev_insert_opportunities" on opportunities for insert with check (true);
create policy "dev_update_opportunities" on opportunities for update using (true);
create policy "dev_delete_opportunities" on opportunities for delete using (true);

alter table external_data_sources enable row level security;
drop policy if exists "dev_select_external_data_sources" on external_data_sources;
drop policy if exists "dev_insert_external_data_sources" on external_data_sources;
drop policy if exists "dev_update_external_data_sources" on external_data_sources;
drop policy if exists "dev_delete_external_data_sources" on external_data_sources;
create policy "dev_select_external_data_sources" on external_data_sources for select using (true);
create policy "dev_insert_external_data_sources" on external_data_sources for insert with check (true);
create policy "dev_update_external_data_sources" on external_data_sources for update using (true);
create policy "dev_delete_external_data_sources" on external_data_sources for delete using (true);

alter table unlocodes enable row level security;
drop policy if exists "dev_select_unlocodes" on unlocodes;
drop policy if exists "dev_insert_unlocodes" on unlocodes;
drop policy if exists "dev_update_unlocodes" on unlocodes;
drop policy if exists "dev_delete_unlocodes" on unlocodes;
create policy "dev_select_unlocodes" on unlocodes for select using (true);
create policy "dev_insert_unlocodes" on unlocodes for insert with check (true);
create policy "dev_update_unlocodes" on unlocodes for update using (true);
create policy "dev_delete_unlocodes" on unlocodes for delete using (true);

alter table quotations enable row level security;
drop policy if exists "dev_select_quotations" on quotations;
drop policy if exists "dev_insert_quotations" on quotations;
drop policy if exists "dev_update_quotations" on quotations;
drop policy if exists "dev_delete_quotations" on quotations;
create policy "dev_select_quotations" on quotations for select using (true);
create policy "dev_insert_quotations" on quotations for insert with check (true);
create policy "dev_update_quotations" on quotations for update using (true);
create policy "dev_delete_quotations" on quotations for delete using (true);

alter table shipments enable row level security;
drop policy if exists "dev_select_shipments" on shipments;
drop policy if exists "dev_insert_shipments" on shipments;
drop policy if exists "dev_update_shipments" on shipments;
drop policy if exists "dev_delete_shipments" on shipments;
create policy "dev_select_shipments" on shipments for select using (true);
create policy "dev_insert_shipments" on shipments for insert with check (true);
create policy "dev_update_shipments" on shipments for update using (true);
create policy "dev_delete_shipments" on shipments for delete using (true);

alter table audit_logs enable row level security;
drop policy if exists "dev_select_audit_logs" on audit_logs;
drop policy if exists "dev_insert_audit_logs" on audit_logs;
drop policy if exists "dev_update_audit_logs" on audit_logs;
drop policy if exists "dev_delete_audit_logs" on audit_logs;
create policy "dev_select_audit_logs" on audit_logs for select using (true);
create policy "dev_insert_audit_logs" on audit_logs for insert with check (true);
create policy "dev_update_audit_logs" on audit_logs for update using (true);
create policy "dev_delete_audit_logs" on audit_logs for delete using (true);

alter table automation_logs enable row level security;
drop policy if exists "dev_select_automation_logs" on automation_logs;
drop policy if exists "dev_insert_automation_logs" on automation_logs;
drop policy if exists "dev_update_automation_logs" on automation_logs;
drop policy if exists "dev_delete_automation_logs" on automation_logs;
create policy "dev_select_automation_logs" on automation_logs for select using (true);
create policy "dev_insert_automation_logs" on automation_logs for insert with check (true);
create policy "dev_update_automation_logs" on automation_logs for update using (true);
create policy "dev_delete_automation_logs" on automation_logs for delete using (true);
