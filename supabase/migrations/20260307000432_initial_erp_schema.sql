-- PRIORITY LOGISTICS ERP
-- INITIAL CANONICAL SCHEMA

create extension if not exists "pgcrypto";

create table branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  first_name text,
  last_name text,
  email text not null unique,
  phone text,
  username text,
  role_id uuid references roles(id),
  branch_id uuid references branches(id),
  base_salary numeric,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index idx_users_role_id on users(role_id);
create index idx_users_branch_id on users(branch_id);
create index idx_users_active on users(active);
create unique index idx_users_username_unique on users(lower(username));

create table external_data_sources (
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

create table unlocodes (
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

create index idx_external_data_sources_code on external_data_sources(code);
create index idx_unlocodes_country_code on unlocodes(country_code);
create index idx_unlocodes_name on unlocodes(name);
create index idx_unlocodes_name_without_diacritics on unlocodes(name_without_diacritics);
create index idx_unlocodes_subdivision_code on unlocodes(subdivision_code);

create table service_transport_types (
  id uuid primary key default gen_random_uuid(),
  service_type text not null,
  transport_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint service_transport_types_unique unique (service_type, transport_type)
);

create index idx_service_transport_types_service_type on service_transport_types(service_type);
create index idx_service_transport_types_transport_type on service_transport_types(transport_type);

create table prospects (
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

create table clients (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references prospects(id),
  company_name text not null,
  industry text,
  country text,
  website text,
  corporate_phone text,
  full_address text,
  postal_code text,
  city text,
  city_unlocode text,
  tax_id text,
  status text not null default 'prospecto',
  branch_id uuid references branches(id),
  credit_limit numeric,
  credit_days integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  is_deleted boolean not null default false
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  position text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tax_id text,
  provider_type text,
  corporate_phone text,
  company_email text,
  website text,
  full_address text,
  postal_code text,
  city_unlocode text,
  city text,
  country text,
  credit_active boolean not null default false,
  credit_amount numeric,
  credit_days integer,
  status text not null default 'en_proceso_de_alta',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table provider_contacts (
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

create table provider_service_offerings (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  service_transport_type_id uuid not null references service_transport_types(id),
  terms_and_conditions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (provider_id, service_transport_type_id)
);

create table incoterms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id),
  salesperson_id uuid references users(id),
  title text not null,
  description text,
  trade_lane text,
  service_type text,
  origin text,
  destination text,
  stage text not null default 'qualification',
  status text not null default 'open',
  estimated_value numeric,
  probability integer,
  estimated_close_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table quotations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id),
  opportunity_id uuid not null references opportunities(id),
  created_by uuid references users(id),
  reference_number text unique,
  status text not null default 'draft',
  service_type text,
  origin text,
  destination text,
  cargo_type text,
  weight numeric,
  volume numeric,
  incoterm_id uuid references incoterms(id),
  currency text not null default 'USD',
  estimated_cost numeric,
  estimated_price numeric,
  expected_profit numeric,
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table quotation_costs (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations(id) on delete cascade,
  provider_id uuid references providers(id),
  service_name text not null,
  cost numeric not null,
  currency text not null default 'USD',
  notes text,
  created_at timestamptz not null default now()
);

create table shipments (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations(id),
  client_id uuid not null references clients(id),
  shipment_reference text unique,
  status text not null default 'pending',
  origin text,
  destination text,
  booking_number text,
  departure_date date,
  arrival_date date,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references shipments(id) on delete cascade,
  event_type text not null,
  event_date timestamptz not null default now(),
  location text,
  notes text,
  created_at timestamptz not null default now()
);

create table client_invoices (
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

create table provider_invoices (
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

create table commissions (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references shipments(id),
  user_id uuid not null references users(id),
  expected_profit numeric,
  actual_profit numeric,
  commission_percentage numeric,
  commission_amount numeric,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  action text not null,
  user_id uuid references users(id),
  payload jsonb,
  created_at timestamptz not null default now()
);

create table automation_logs (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  action text not null,
  status text not null,
  error_message text,
  created_at timestamptz not null default now()
);
