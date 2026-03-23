-- =========================================================
-- PRIORITY LOGISTICS ERP
-- CANONICAL DATABASE SCHEMA
-- PostgreSQL / Supabase
-- =========================================================

create extension if not exists "pgcrypto";
create extension if not exists pg_trgm;


-- =========================================================
-- ORGANIZATION LAYER
-- =========================================================

create table branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table users (
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

create index idx_users_role_id on users(role_id);
create index idx_users_branch_id on users(branch_id);


-- =========================================================
-- MASTER DATA LAYER
-- =========================================================

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

create index idx_external_data_sources_code on external_data_sources(code);

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
  search_text text not null default '',
  source_page_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint unlocodes_country_location_unique unique (country_code, location_code)
);

create index idx_unlocodes_country_code on unlocodes(country_code);
create index idx_unlocodes_unlocode_pattern on unlocodes(unlocode text_pattern_ops);
create index idx_unlocodes_search_text_trgm on unlocodes using gin(search_text gin_trgm_ops);
create index idx_unlocodes_name_trgm on unlocodes using gin(name gin_trgm_ops);
create index idx_unlocodes_name_without_diacritics_trgm on unlocodes using gin(name_without_diacritics gin_trgm_ops);

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


-- =========================================================
-- CRM LAYER
-- =========================================================

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

create index idx_prospects_branch_id on prospects(branch_id);
create index idx_prospects_status on prospects(status);

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
  city_unlocode_id uuid references unlocodes(id),
  tax_id text,
  search_text text not null default '',
  status text not null default 'prospecto',
  account_owner_id uuid references users(id),
  branch_id uuid references branches(id),
  credit_limit numeric,
  credit_days integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  is_deleted boolean not null default false
);

create index idx_clients_prospect_id on clients(prospect_id);
create index idx_clients_branch_id on clients(branch_id);
create index idx_clients_status on clients(status);
create index idx_clients_account_owner_id on clients(account_owner_id);
create index idx_clients_city_unlocode_id on clients(city_unlocode_id);
create index idx_clients_active_company_name on clients(company_name) where is_deleted = false;
create index idx_clients_search_text_trgm on clients using gin(search_text gin_trgm_ops);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  linkedin_url text,
  position text,
  status text not null default 'activo',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index idx_contacts_client_id on contacts(client_id);
create index idx_contacts_status on contacts(status);
create index idx_contacts_client_status_created_at on contacts(client_id, status, created_at desc);

create table client_logistics_parties (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  party_type text not null default 'shipper',
  name text not null,
  full_address text,
  postal_code text,
  city_unlocode text,
  city_unlocode_id uuid references unlocodes(id),
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

create index idx_client_logistics_parties_client_id on client_logistics_parties(client_id);
create index idx_client_logistics_parties_type on client_logistics_parties(party_type);
create index idx_client_logistics_parties_city_unlocode_id
  on client_logistics_parties(city_unlocode_id);


-- =========================================================
-- COMMERCIAL REFERENCE LAYER
-- =========================================================

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
  city_unlocode_id uuid references unlocodes(id),
  city text,
  country text,
  credit_active boolean not null default false,
  credit_amount numeric,
  credit_days integer,
  status text not null default 'en_proceso_de_alta',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index idx_providers_provider_type on providers(provider_type);
create index idx_providers_status on providers(status);
create index idx_providers_city_unlocode on providers(city_unlocode);
create index idx_providers_city_unlocode_id on providers(city_unlocode_id);

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

create index idx_provider_contacts_provider_id on provider_contacts(provider_id);
create index idx_provider_contacts_status on provider_contacts(status);
create index idx_provider_contacts_provider_status_created_at
  on provider_contacts(provider_id, status, created_at desc);

create table provider_service_offerings (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  service_transport_type_id uuid not null references service_transport_types(id),
  terms_and_conditions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (provider_id, service_transport_type_id)
);

create index idx_provider_service_offerings_provider_id
  on provider_service_offerings(provider_id);
create index idx_provider_service_offerings_service_transport_type_id
  on provider_service_offerings(service_transport_type_id);

create table incoterms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);


-- =========================================================
-- SALES LAYER
-- =========================================================

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id),
  salesperson_id uuid references users(id),
  title text not null,
  description text,
  trade_lane text,
  service_type text,
  transport_type text,
  origin text,
  origin_unlocode text,
  origin_unlocode_id uuid references unlocodes(id),
  destination text,
  destination_unlocode text,
  destination_unlocode_id uuid references unlocodes(id),
  stage text not null default 'qualification',
  status text not null default 'investigando',
  expected_profit_usd numeric,
  service_quantity integer,
  estimated_value numeric,
  probability integer,
  estimated_close_date date,
  start_date date,
  expiration_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index idx_opportunities_client_id on opportunities(client_id);
create index idx_opportunities_salesperson_id on opportunities(salesperson_id);
create index idx_opportunities_status on opportunities(status);
create index idx_opportunities_stage on opportunities(stage);
create index idx_opportunities_service_type on opportunities(service_type);
create index idx_opportunities_transport_type on opportunities(transport_type);
create index idx_opportunities_expiration_date on opportunities(expiration_date);
create index idx_opportunities_origin_unlocode_id on opportunities(origin_unlocode_id);
create index idx_opportunities_destination_unlocode_id on opportunities(destination_unlocode_id);
create index idx_opportunities_client_created_at on opportunities(client_id, created_at desc);
create index idx_opportunities_client_status_created_at
  on opportunities(client_id, status, created_at desc);
create index idx_opportunities_status_expiration_date
  on opportunities(status, expiration_date);
create index idx_opportunities_title_trgm on opportunities using gin(title gin_trgm_ops);

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

create index idx_quotations_client_id on quotations(client_id);
create index idx_quotations_opportunity_id on quotations(opportunity_id);
create index idx_quotations_status on quotations(status);
create index idx_quotations_client_created_at on quotations(client_id, created_at desc);
create index idx_quotations_opportunity_created_at
  on quotations(opportunity_id, created_at desc);
create index idx_quotations_status_created_at on quotations(status, created_at desc);

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

create index idx_quotation_costs_quotation_id on quotation_costs(quotation_id);
create index idx_quotation_costs_provider_id on quotation_costs(provider_id);


-- =========================================================
-- OPERATIONS LAYER
-- =========================================================

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

create index idx_shipments_quotation_id on shipments(quotation_id);
create index idx_shipments_client_id on shipments(client_id);
create index idx_shipments_status on shipments(status);
create index idx_shipments_client_created_at on shipments(client_id, created_at desc);
create index idx_shipments_quotation_created_at on shipments(quotation_id, created_at desc);
create index idx_shipments_status_created_at on shipments(status, created_at desc);

create table shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references shipments(id) on delete cascade,
  event_type text not null,
  event_date timestamptz not null default now(),
  location text,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_shipment_events_shipment_id on shipment_events(shipment_id);
create index idx_shipment_events_shipment_event_date
  on shipment_events(shipment_id, event_date desc);


-- =========================================================
-- FINANCE LAYER
-- =========================================================

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

create index idx_client_invoices_shipment_id on client_invoices(shipment_id);
create index idx_client_invoices_client_id on client_invoices(client_id);
create index idx_client_invoices_status on client_invoices(status);

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

create index idx_provider_invoices_provider_id on provider_invoices(provider_id);
create index idx_provider_invoices_shipment_id on provider_invoices(shipment_id);
create index idx_provider_invoices_status on provider_invoices(status);

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

create index idx_commissions_shipment_id on commissions(shipment_id);
create index idx_commissions_user_id on commissions(user_id);


-- =========================================================
-- OBSERVABILITY LAYER
-- =========================================================

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  action text not null,
  user_id uuid references users(id),
  payload jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_table_name on audit_logs(table_name);
create index idx_audit_logs_record_id on audit_logs(record_id);

create table automation_logs (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  action text not null,
  status text not null,
  error_message text,
  created_at timestamptz not null default now()
);
