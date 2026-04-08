-- =========================================================
-- PRIORITY LOGISTICS ERP
-- PROD BOOTSTRAP BASELINE
-- GENERATED FROM CANONICAL SQL SOURCES
-- DO NOT TREAT THIS FILE AS A NORMAL DELTA MIGRATION
-- FOR CLEAN ENVIRONMENTS ONLY
-- =========================================================

-- Source order:
-- 1. ERP_schema.sql
-- 2. ERP_functions.sql
-- 3. ERP_views.sql
-- 4. ERP_triggers.sql
-- 5. ERP_policies.sql

-- ===== BEGIN ERP_schema.sql =====

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

create table permission_modules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  icon_key text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index idx_permission_modules_sort_order on permission_modules(sort_order);

create table permission_submodules (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references permission_modules(id) on delete cascade,
  code text not null unique,
  name text not null,
  route_path text,
  route_matchers text[] not null default '{}',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index idx_permission_submodules_module_id on permission_submodules(module_id);
create index idx_permission_submodules_route_path on permission_submodules(route_path);
create index idx_permission_submodules_sort_order on permission_submodules(sort_order);

create table permission_actions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  scope_type text not null default 'resource',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint permission_actions_scope_type_check
    check (scope_type in ('resource', 'field', 'both'))
);

create table permission_conditions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table permission_resources (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references permission_modules(id) on delete cascade,
  submodule_id uuid references permission_submodules(id) on delete cascade,
  resource_key text not null unique,
  name text not null,
  resource_type text not null,
  resource_group text,
  table_name text,
  view_name text,
  rpc_name text,
  entity_owner_field text,
  entity_branch_field text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index idx_permission_resources_module_id on permission_resources(module_id);
create index idx_permission_resources_submodule_id on permission_resources(submodule_id);
create index idx_permission_resources_resource_type on permission_resources(resource_type);
create index idx_permission_resources_sort_order on permission_resources(sort_order);

create table permission_fields (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references permission_resources(id) on delete cascade,
  field_key text not null,
  label text not null,
  data_type text,
  field_group text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint permission_fields_resource_field_unique unique (resource_id, field_key)
);

create index idx_permission_fields_resource_id on permission_fields(resource_id);
create index idx_permission_fields_group on permission_fields(field_group);

create table role_resource_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles(id) on delete cascade,
  resource_id uuid not null references permission_resources(id) on delete cascade,
  action_id uuid not null references permission_actions(id) on delete cascade,
  condition_id uuid not null references permission_conditions(id),
  allowed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint role_resource_permissions_unique unique (role_id, resource_id, action_id)
);

create index idx_role_resource_permissions_role_id on role_resource_permissions(role_id);
create index idx_role_resource_permissions_resource_id on role_resource_permissions(resource_id);

create table role_field_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles(id) on delete cascade,
  field_id uuid not null references permission_fields(id) on delete cascade,
  action_id uuid not null references permission_actions(id) on delete cascade,
  condition_id uuid not null references permission_conditions(id),
  allowed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint role_field_permissions_unique unique (role_id, field_id, action_id)
);

create index idx_role_field_permissions_role_id on role_field_permissions(role_id);
create index idx_role_field_permissions_field_id on role_field_permissions(field_id);


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
  constraint service_transport_types_allowed_service_type
    check (service_type in ('AIR', 'FCL', 'LCL', 'FTL', 'LTL', 'COURIER')),
  constraint service_transport_types_unique unique (service_type, transport_type)
);

create index idx_service_transport_types_service_type on service_transport_types(service_type);
create index idx_service_transport_types_transport_type on service_transport_types(transport_type);

create table sales_accounting_concepts (
  id uuid primary key default gen_random_uuid(),
  concept text not null,
  service_type text not null,
  operation_type text not null,
  vat_rate numeric(5,2) not null default 16.00,
  sat_code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint sales_accounting_concepts_allowed_service_type
    check (service_type in ('GENERAL', 'AIR', 'FCL', 'LCL', 'FTL', 'LTL', 'COURIER')),
  constraint sales_accounting_concepts_allowed_operation_type
    check (operation_type in ('IMPORT', 'EXPORT')),
  constraint sales_accounting_concepts_vat_rate_range
    check (vat_rate >= 0 and vat_rate <= 100),
  constraint sales_accounting_concepts_unique unique (concept, service_type, operation_type, sat_code)
);

create index idx_sales_accounting_concepts_service_type
  on sales_accounting_concepts(service_type);
create index idx_sales_accounting_concepts_operation_type
  on sales_accounting_concepts(operation_type);
create index idx_sales_accounting_concepts_sat_code
  on sales_accounting_concepts(sat_code);

create table exchange_rates (
  id uuid primary key default gen_random_uuid(),
  rate_date date not null,
  base_currency text not null,
  quote_currency text not null default 'MXN',
  rate_value numeric(18,6) not null,
  source text not null default 'BANXICO',
  source_series_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint exchange_rates_allowed_base_currency
    check (base_currency in ('USD', 'EUR')),
  constraint exchange_rates_allowed_quote_currency
    check (quote_currency = 'MXN'),
  constraint exchange_rates_allowed_source
    check (source in ('BANXICO', 'MANUAL')),
  constraint exchange_rates_positive_rate
    check (rate_value > 0),
  constraint exchange_rates_unique unique (rate_date, base_currency, quote_currency, source)
);

create index idx_exchange_rates_rate_date
  on exchange_rates(rate_date desc);
create index idx_exchange_rates_base_quote_date
  on exchange_rates(base_currency, quote_currency, rate_date desc);


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
  operation_type text,
  incoterm_id uuid references incoterms(id),
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
  updated_at timestamptz,
  constraint opportunities_allowed_operation_type
    check (operation_type is null or operation_type in ('Import', 'Export'))
);

create index idx_opportunities_client_id on opportunities(client_id);
create index idx_opportunities_salesperson_id on opportunities(salesperson_id);
create index idx_opportunities_status on opportunities(status);
create index idx_opportunities_stage on opportunities(stage);
create index idx_opportunities_service_type on opportunities(service_type);
create index idx_opportunities_transport_type on opportunities(transport_type);
create index idx_opportunities_operation_type on opportunities(operation_type);
create index idx_opportunities_incoterm_id on opportunities(incoterm_id);
create index idx_opportunities_expiration_date on opportunities(expiration_date);
create index idx_opportunities_origin_unlocode_id on opportunities(origin_unlocode_id);
create index idx_opportunities_destination_unlocode_id on opportunities(destination_unlocode_id);
create index idx_opportunities_client_created_at on opportunities(client_id, created_at desc);
create index idx_opportunities_client_status_created_at
  on opportunities(client_id, status, created_at desc);
create index idx_opportunities_status_expiration_date
  on opportunities(status, expiration_date);
create index idx_opportunities_title_trgm on opportunities using gin(title gin_trgm_ops);

create table quotation_rejection_reasons (
  id uuid primary key default gen_random_uuid(),
  reason text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table quotation_reference_counters (
  service_type text primary key,
  prefix text not null unique,
  last_value bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint quotation_reference_counters_allowed_service_type
    check (service_type in ('AIR', 'FCL', 'LCL', 'FTL', 'LTL', 'COURIER'))
);

create table quotations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id),
  opportunity_id uuid not null references opportunities(id),
  created_by uuid references users(id),
  pricing_owner_id uuid references users(id),
  reference_number text unique,
  status text not null default 'borrador',
  service_type text,
  transport_type text,
  operation_type text,
  origin text,
  origin_unlocode text,
  origin_unlocode_id uuid references unlocodes(id),
  destination text,
  destination_unlocode text,
  destination_unlocode_id uuid references unlocodes(id),
  pickup_address text,
  delivery_address text,
  incoterm_id uuid references incoterms(id),
  required_quote_date date,
  purchase_valid_until date,
  sales_valid_until date,
  rejection_reason_id uuid references quotation_rejection_reasons(id),
  rejection_notes text,
  cancellation_notes text,
  target_rate numeric,
  currency text not null default 'USD',
  estimated_cost numeric,
  estimated_price numeric,
  expected_profit numeric,
  accepted_usd_rate_date date,
  accepted_usd_to_mxn_rate numeric(18,6),
  accepted_eur_rate_date date,
  accepted_eur_to_mxn_rate numeric(18,6),
  exchange_rates_locked_at timestamptz,
  search_text text not null default '',
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint quotations_allowed_status
    check (
      status in (
        'borrador',
        'pendiente',
        'cotizando',
        'lista_para_enviar',
        'enviada',
        'cancelada',
        'rechazada',
        'renegociar_tarifa',
        'aceptada'
      )
    )
);

create index idx_quotations_client_id on quotations(client_id);
create index idx_quotations_opportunity_id on quotations(opportunity_id);
create index idx_quotations_status on quotations(status);
create index idx_quotations_pricing_owner_id on quotations(pricing_owner_id);
create index idx_quotations_client_created_at on quotations(client_id, created_at desc);
create index idx_quotations_opportunity_created_at
  on quotations(opportunity_id, created_at desc);
create index idx_quotations_status_created_at on quotations(status, created_at desc);
create index idx_quotations_pricing_owner_status_created_at
  on quotations(pricing_owner_id, status, created_at desc);
create index idx_quotations_search_text_trgm on quotations using gin(search_text gin_trgm_ops);

create table quotation_options (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations(id) on delete cascade,
  option_label text not null,
  sort_order integer not null,
  include_in_customer_quote boolean not null default true,
  purchase_valid_until date,
  sales_valid_until date,
  sales_validity_overridden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint quotation_options_unique_label unique (quotation_id, option_label),
  constraint quotation_options_unique_sort_order unique (quotation_id, sort_order)
);

create index idx_quotation_options_quotation_id on quotation_options(quotation_id);
create index idx_quotation_options_customer_visibility
  on quotation_options(quotation_id, include_in_customer_quote, sort_order);

create table quotation_costs (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations(id) on delete cascade,
  quotation_option_id uuid references quotation_options(id) on delete cascade,
  option_label text not null default 'Proveedor',
  provider_id uuid references providers(id),
  sales_accounting_concept_id uuid references sales_accounting_concepts(id),
  service_name text not null,
  cost numeric not null,
  purchase_amount numeric,
  purchase_currency text not null default 'USD',
  purchase_exchange_rate_to_mxn numeric(18,6),
  purchase_amount_mxn numeric,
  sale_amount numeric,
  sale_currency text not null default 'USD',
  sale_exchange_rate_to_mxn numeric(18,6),
  sale_amount_mxn numeric,
  profit_amount numeric,
  profit_amount_mxn numeric,
  vat_rate numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  constraint quotation_costs_allowed_purchase_currency
    check (purchase_currency in ('MXN', 'USD', 'EUR')),
  constraint quotation_costs_allowed_sale_currency
    check (sale_currency in ('MXN', 'USD', 'EUR'))
);

create index idx_quotation_costs_quotation_id on quotation_costs(quotation_id);
create index idx_quotation_costs_option_id on quotation_costs(quotation_option_id);
create index idx_quotation_costs_quotation_option_label on quotation_costs(quotation_id, option_label);
create index idx_quotation_costs_provider_id on quotation_costs(provider_id);

create table quotation_cargo_lines (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations(id) on delete cascade,
  load_type text not null,
  commodities text,
  piece_count integer,
  width numeric,
  length numeric,
  height numeric,
  weight numeric,
  freight_class text,
  cbm numeric,
  volumetric_weight_kg numeric,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index idx_quotation_cargo_lines_quotation_id
  on quotation_cargo_lines(quotation_id);
create index idx_quotation_cargo_lines_quotation_sort_order
  on quotation_cargo_lines(quotation_id, sort_order asc);


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
-- WORKSPACE PREFERENCES
-- =========================================================

create table workspace_saved_views (
  id uuid primary key default gen_random_uuid(),
  workspace_key text not null,
  owner_user_id uuid not null references users(id) on delete cascade,
  name text not null,
  search_query text,
  status_lane text,
  filters_json jsonb not null default '{}'::jsonb,
  sort_json jsonb not null default '{}'::jsonb,
  visible_columns_json jsonb not null default '[]'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index idx_workspace_saved_views_owner_workspace
  on workspace_saved_views(owner_user_id, workspace_key);

create unique index idx_workspace_saved_views_single_default
  on workspace_saved_views(owner_user_id, workspace_key)
  where is_default = true;

create index idx_workspace_saved_views_name
  on workspace_saved_views(owner_user_id, workspace_key, name);


-- =========================================================
-- COMMUNICATIONS LAYER
-- =========================================================

create table mailboxes (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  provider text not null default 'gmail',
  status text not null default 'draft',
  sync_mode text not null default 'manual',
  gmail_refresh_token_encrypted text,
  gmail_refresh_token_hint text,
  gmail_scope text,
  connected_email text,
  connected_by_user_id uuid references users(id),
  signature_image_url text,
  last_synced_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint mailboxes_provider_check
    check (provider in ('gmail')),
  constraint mailboxes_status_check
    check (status in ('draft', 'active', 'disabled', 'error')),
  constraint mailboxes_sync_mode_check
    check (sync_mode in ('manual', 'polling'))
);

create index idx_mailboxes_status on mailboxes(status);
create index idx_mailboxes_provider on mailboxes(provider);

comment on column mailboxes.signature_image_url is
  'Public image URL appended as the outbound email signature for this mailbox.';

create table mailbox_role_access (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references mailboxes(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint mailbox_role_access_unique unique (mailbox_id, role_id)
);

create index idx_mailbox_role_access_mailbox_id on mailbox_role_access(mailbox_id);
create index idx_mailbox_role_access_role_id on mailbox_role_access(role_id);

create table mail_threads (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references mailboxes(id) on delete cascade,
  gmail_thread_id text not null,
  subject text,
  subject_normalized text not null default '',
  snippet text,
  participants_json jsonb not null default '[]'::jsonb,
  latest_message_at timestamptz,
  oldest_message_at timestamptz,
  unread_count integer not null default 0,
  message_count integer not null default 0,
  has_attachments boolean not null default false,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint mail_threads_mailbox_gmail_thread_unique unique (mailbox_id, gmail_thread_id)
);

create index idx_mail_threads_mailbox_latest
  on mail_threads(mailbox_id, latest_message_at desc nulls last);
create index idx_mail_threads_mailbox_subject_trgm
  on mail_threads using gin(subject_normalized gin_trgm_ops);

create table mail_messages (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references mailboxes(id) on delete cascade,
  thread_id uuid not null references mail_threads(id) on delete cascade,
  gmail_message_id text not null,
  gmail_thread_id text not null,
  internet_message_id text,
  direction text not null default 'inbound',
  from_name text,
  from_address text,
  to_json jsonb not null default '[]'::jsonb,
  cc_json jsonb not null default '[]'::jsonb,
  bcc_json jsonb not null default '[]'::jsonb,
  reply_to_json jsonb not null default '[]'::jsonb,
  subject text,
  snippet text,
  sent_at timestamptz,
  received_at timestamptz,
  label_ids text[] not null default '{}'::text[],
  has_attachments boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint mail_messages_mailbox_gmail_message_unique unique (mailbox_id, gmail_message_id),
  constraint mail_messages_direction_check
    check (direction in ('inbound', 'outbound'))
);

create index idx_mail_messages_thread_sent_at
  on mail_messages(thread_id, sent_at asc nulls last, created_at asc);
create index idx_mail_messages_mailbox_received_at
  on mail_messages(mailbox_id, received_at desc nulls last);
create index idx_mail_messages_from_address on mail_messages(from_address);

create table mail_entity_links (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references mailboxes(id) on delete cascade,
  thread_id uuid not null references mail_threads(id) on delete cascade,
  message_id uuid references mail_messages(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  link_source text not null,
  confidence numeric(5,2) not null default 1,
  is_primary boolean not null default false,
  created_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  constraint mail_entity_links_entity_type_check
    check (entity_type in ('client', 'contact', 'quotation', 'shipment')),
  constraint mail_entity_links_source_check
    check (link_source in ('subject_reference', 'participant_email', 'manual'))
);

create index idx_mail_entity_links_thread_id on mail_entity_links(thread_id);
create index idx_mail_entity_links_entity on mail_entity_links(entity_type, entity_id);
create unique index idx_mail_entity_links_thread_level_unique
  on mail_entity_links(thread_id, entity_type, entity_id, link_source)
  where message_id is null;
create unique index idx_mail_entity_links_message_level_unique
  on mail_entity_links(message_id, entity_type, entity_id, link_source)
  where message_id is not null;

create table mail_sync_runs (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references mailboxes(id) on delete cascade,
  trigger_source text not null,
  status text not null,
  messages_scanned integer not null default 0,
  messages_upserted integer not null default 0,
  threads_upserted integer not null default 0,
  links_created integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint mail_sync_runs_trigger_source_check
    check (trigger_source in ('manual', 'cron')),
  constraint mail_sync_runs_status_check
    check (status in ('running', 'success', 'error'))
);

create index idx_mail_sync_runs_mailbox_started_at
  on mail_sync_runs(mailbox_id, started_at desc);


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


-- ===== BEGIN ERP_functions.sql =====

-- =========================================
-- ERP BUSINESS LOGIC FUNCTIONS
-- =========================================


-- =========================================
-- 0. AUTH ACCESS CONTROL
-- =========================================

create or replace function erp_is_authenticated_active_user()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.auth_user_id = auth.uid()
      and u.active = true
  );
$$;

create or replace function erp_current_role_name()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select r.name
  from public.users u
  left join public.roles r on r.id = u.role_id
  where u.auth_user_id = auth.uid()
    and u.active = true
  limit 1;
$$;

create or replace function erp_current_role_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select u.role_id
  from public.users u
  where u.auth_user_id = auth.uid()
    and u.active = true
  limit 1;
$$;

create or replace function erp_current_user_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select u.id
  from public.users u
  where u.auth_user_id = auth.uid()
    and u.active = true
  limit 1;
$$;

create or replace function erp_is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(lower(public.erp_current_role_name()) = 'admin', false);
$$;

create or replace function erp_current_branch_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select u.branch_id
  from public.users u
  where u.auth_user_id = auth.uid()
    and u.active = true
  limit 1;
$$;

create or replace function erp_has_role(
  p_role_name text
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(lower(public.erp_current_role_name()) = lower(btrim(coalesce(p_role_name, ''))), false);
$$;

create or replace function erp_condition_allows(
  p_condition_code text,
  p_owner_user_id uuid default null,
  p_branch_id uuid default null
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  normalized_condition text := lower(coalesce(btrim(p_condition_code), 'none'));
  current_user_id uuid := public.erp_current_user_id();
  current_branch_id uuid := public.erp_current_branch_id();
begin
  if normalized_condition = 'all' then
    return true;
  end if;

  if normalized_condition = 'owner_only' then
    return p_owner_user_id is not null
      and current_user_id is not null
      and p_owner_user_id = current_user_id;
  end if;

  if normalized_condition = 'assigned_branch_only' then
    return p_branch_id is not null
      and current_branch_id is not null
      and p_branch_id = current_branch_id;
  end if;

  return false;
end;
$$;

create or replace function erp_access_scope(
  p_resource_key text,
  p_action_code text
)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (
      select pc.code
      from public.role_resource_permissions rrp
      join public.roles r
        on r.id = rrp.role_id
      join public.permission_resources pr
        on pr.id = rrp.resource_id
      join public.permission_actions pa
        on pa.id = rrp.action_id
      join public.permission_conditions pc
        on pc.id = rrp.condition_id
      where lower(r.name) = lower(public.erp_current_role_name())
        and pr.resource_key = p_resource_key
        and lower(pa.code) = lower(p_action_code)
        and rrp.allowed = true
      limit 1
    ),
    'none'
  );
$$;

create or replace function erp_has_resource_access(
  p_resource_key text,
  p_action_code text default 'view',
  p_owner_user_id uuid default null,
  p_branch_id uuid default null
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  resolved_scope text;
  field_registered boolean := false;
begin
  if public.erp_is_admin() then
    return true;
  end if;

  if not public.erp_is_authenticated_active_user() then
    return false;
  end if;

  resolved_scope := public.erp_access_scope(p_resource_key, p_action_code);

  return public.erp_condition_allows(
    resolved_scope,
    p_owner_user_id,
    p_branch_id
  );
end;
$$;

create or replace function erp_has_module_access(
  p_module_code text,
  p_action_code text default 'view'
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.erp_has_resource_access(
    lower(coalesce(p_module_code, '')),
    lower(coalesce(p_action_code, 'view'))
  );
$$;

create or replace function erp_has_submodule_access(
  p_submodule_code text,
  p_action_code text default 'view'
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.erp_has_resource_access(
    lower(coalesce(p_submodule_code, '')),
    lower(coalesce(p_action_code, 'view'))
  );
$$;

create or replace function erp_can_manage_mailboxes()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.erp_is_admin()
    or public.erp_has_resource_access('crm.email.mailboxes', 'edit');
$$;

create or replace function erp_can_access_mailbox(
  p_mailbox_id uuid,
  p_action_code text default 'view'
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  current_role_id uuid := public.erp_current_role_id();
begin
  if public.erp_is_admin() then
    return true;
  end if;

  if not public.erp_is_authenticated_active_user() then
    return false;
  end if;

  if not public.erp_has_submodule_access('crm.email', coalesce(nullif(lower(btrim(p_action_code)), ''), 'view')) then
    return false;
  end if;

  if current_role_id is null then
    return false;
  end if;

  return exists (
    select 1
    from public.mailbox_role_access mra
    where mra.mailbox_id = p_mailbox_id
      and mra.role_id = current_role_id
  );
end;
$$;

create or replace function erp_has_field_access(
  p_resource_key text,
  p_field_key text,
  p_action_code text default 'view',
  p_owner_user_id uuid default null,
  p_branch_id uuid default null
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  resolved_scope text;
  field_registered boolean := false;
begin
  if public.erp_is_admin() then
    return true;
  end if;

  if not public.erp_is_authenticated_active_user() then
    return false;
  end if;

  select exists (
    select 1
    from public.permission_fields pf
    join public.permission_resources pr
      on pr.id = pf.resource_id
    where pr.resource_key = p_resource_key
      and pf.field_key = p_field_key
      and pf.active = true
  )
  into field_registered;

  select coalesce(pc.code, 'none')
  into resolved_scope
  from public.role_field_permissions rfp
  join public.roles r
    on r.id = rfp.role_id
  join public.permission_fields pf
    on pf.id = rfp.field_id
  join public.permission_resources pr
    on pr.id = pf.resource_id
  join public.permission_actions pa
    on pa.id = rfp.action_id
  join public.permission_conditions pc
    on pc.id = rfp.condition_id
  where lower(r.name) = lower(public.erp_current_role_name())
    and pr.resource_key = p_resource_key
    and pf.field_key = p_field_key
    and lower(pa.code) = lower(p_action_code)
    and rfp.allowed = true
  limit 1;

  if resolved_scope is null then
    if field_registered then
      return false;
    end if;

    return public.erp_has_resource_access(
      p_resource_key,
      p_action_code,
      p_owner_user_id,
      p_branch_id
    );
  end if;

  if resolved_scope = 'none' then
    return false;
  end if;

  return public.erp_condition_allows(
    resolved_scope,
    p_owner_user_id,
    p_branch_id
  );
end;
$$;

create or replace function erp_can_access_client_resource(
  p_resource_key text,
  p_action_code text default 'view',
  p_client_id uuid default null
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  client_owner_id uuid;
  client_branch_id uuid;
begin
  if p_client_id is null then
    return false;
  end if;

  select
    c.account_owner_id,
    c.branch_id
  into client_owner_id, client_branch_id
  from public.clients c
  where c.id = p_client_id
    and c.is_deleted = false;

  if not found then
    return false;
  end if;

  return public.erp_has_resource_access(
    p_resource_key,
    p_action_code,
    client_owner_id,
    client_branch_id
  );
end;
$$;

create or replace function erp_can_access_opportunity_resource(
  p_resource_key text,
  p_action_code text default 'view',
  p_salesperson_id uuid default null,
  p_client_id uuid default null
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  client_branch_id uuid;
begin
  if p_client_id is not null then
    select c.branch_id
    into client_branch_id
    from public.clients c
    where c.id = p_client_id
      and c.is_deleted = false;
  end if;

  return public.erp_has_resource_access(
    p_resource_key,
    p_action_code,
    p_salesperson_id,
    client_branch_id
  );
end;
$$;

create or replace function erp_can_access_crm_quotation_resource(
  p_resource_key text,
  p_action_code text default 'view',
  p_created_by uuid default null,
  p_client_id uuid default null
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  client_branch_id uuid;
begin
  if p_client_id is not null then
    select c.branch_id
    into client_branch_id
    from public.clients c
    where c.id = p_client_id
      and c.is_deleted = false;
  end if;

  return public.erp_has_resource_access(
    p_resource_key,
    p_action_code,
    p_created_by,
    client_branch_id
  );
end;
$$;

create or replace function resolve_default_branch_for_backfill()
returns uuid
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  resolved_branch_id uuid;
  branch_count integer;
begin
  select count(*)
  into branch_count
  from public.branches;

  if branch_count = 1 then
    select b.id
    into resolved_branch_id
    from public.branches b
    limit 1;

    return resolved_branch_id;
  end if;

  return null;
end;
$$;

create or replace function resolve_default_crm_owner_for_backfill()
returns uuid
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  resolved_owner_id uuid;
  owner_count integer;
begin
  select count(*)
  into owner_count
  from public.users u
  join public.roles r
    on r.id = u.role_id
  where u.active = true
    and lower(r.name) in ('ventas', 'admin');

  if owner_count = 1 then
    select u.id
    into resolved_owner_id
    from public.users u
    join public.roles r
      on r.id = u.role_id
    where u.active = true
      and lower(r.name) in ('ventas', 'admin')
    limit 1;

    return resolved_owner_id;
  end if;

  return null;
end;
$$;

create or replace function backfill_crm_owner_branch_defaults(
  p_default_owner_id uuid default null,
  p_default_branch_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_owner_id uuid := coalesce(
    p_default_owner_id,
    public.resolve_default_crm_owner_for_backfill()
  );
  resolved_branch_id uuid := coalesce(
    p_default_branch_id,
    public.resolve_default_branch_for_backfill()
  );
  updated_users integer := 0;
  updated_clients_owner integer := 0;
  updated_clients_branch integer := 0;
  updated_opportunities integer := 0;
begin
  if resolved_branch_id is not null then
    update public.users u
    set branch_id = resolved_branch_id
    where u.active = true
      and u.branch_id is null;

    get diagnostics updated_users = row_count;
  end if;

  with owner_candidates as (
    select
      c.id as client_id,
      coalesce(
        c.account_owner_id,
        (
          select o.salesperson_id
          from public.opportunities o
          where o.client_id = c.id
            and o.salesperson_id is not null
          order by o.created_at desc
          limit 1
        ),
        (
          select q.created_by
          from public.quotations q
          where q.client_id = c.id
            and q.created_by is not null
          order by q.created_at desc
          limit 1
        ),
        resolved_owner_id
      ) as resolved_owner_id
    from public.clients c
    where c.is_deleted = false
  )
  update public.clients c
  set account_owner_id = oc.resolved_owner_id
  from owner_candidates oc
  where c.id = oc.client_id
    and c.account_owner_id is null
    and oc.resolved_owner_id is not null;

  get diagnostics updated_clients_owner = row_count;

  update public.clients c
  set branch_id = coalesce(u.branch_id, resolved_branch_id)
  from public.users u
  where c.is_deleted = false
    and c.account_owner_id = u.id
    and c.branch_id is null
    and coalesce(u.branch_id, resolved_branch_id) is not null;

  get diagnostics updated_clients_branch = row_count;

  update public.opportunities o
  set salesperson_id = c.account_owner_id
  from public.clients c
  where o.client_id = c.id
    and o.salesperson_id is null
    and c.account_owner_id is not null;

  get diagnostics updated_opportunities = row_count;

  return jsonb_build_object(
    'resolved_default_owner_id', resolved_owner_id,
    'resolved_default_branch_id', resolved_branch_id,
    'updated_users_branch_id', updated_users,
    'updated_clients_owner', updated_clients_owner,
    'updated_clients_branch', updated_clients_branch,
    'updated_opportunities_salesperson', updated_opportunities
  );
end;
$$;

create or replace function erp_can_access_pricing_quotation(
  p_action_code text default 'view',
  p_status text default null,
  p_pricing_owner_id uuid default null
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  normalized_action text := lower(coalesce(btrim(p_action_code), 'view'));
  normalized_status text := lower(coalesce(btrim(p_status), ''));
begin
  if normalized_action = 'pricing_take' then
    return normalized_status in ('pendiente', 'renegociar_tarifa')
      and public.erp_has_resource_access('pricing.quotations', 'pricing_take');
  end if;

  if normalized_action = 'view' and normalized_status in ('pendiente', 'renegociar_tarifa') then
    return public.erp_has_resource_access('pricing.quotations.queue', 'view');
  end if;

  if normalized_action = 'view' then
    return public.erp_has_resource_access(
      'pricing.quotations.workspace',
      'view',
      p_pricing_owner_id,
      null
    );
  end if;

  return public.erp_has_resource_access(
    'pricing.quotations.workspace',
    normalized_action,
    p_pricing_owner_id,
    null
  );
end;
$$;

create or replace function set_workspace_saved_view_default(
  p_workspace_view_id uuid,
  p_workspace_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := public.erp_current_user_id();
  normalized_workspace_key text := nullif(btrim(coalesce(p_workspace_key, '')), '');
begin
  if current_user_id is null then
    raise exception 'Authenticated ERP user required';
  end if;

  update public.workspace_saved_views
  set is_default = false
  where owner_user_id = current_user_id
    and workspace_key = normalized_workspace_key;

  update public.workspace_saved_views
  set is_default = true
  where id = p_workspace_view_id
    and owner_user_id = current_user_id
    and workspace_key = normalized_workspace_key;

  if not found then
    raise exception 'Workspace saved view not found or not owned by current user';
  end if;
end;
$$;

create or replace function erp_can_access_operations_shipment(
  p_action_code text default 'view',
  p_client_id uuid default null
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  client_branch_id uuid;
begin
  if p_client_id is null then
    return false;
  end if;

  select c.branch_id
  into client_branch_id
  from public.clients c
  where c.id = p_client_id
    and c.is_deleted = false;

  if not found then
    return false;
  end if;

  return public.erp_has_resource_access(
    'operations.shipments.record',
    p_action_code,
    null,
    client_branch_id
  );
end;
$$;

create or replace function erp_can_view_quotation_cost()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.erp_has_field_access('crm.quotations.record', 'cost', 'view')
    or public.erp_has_field_access('pricing.quotations.cost_section', 'purchase_amount', 'view');
$$;

create or replace function erp_can_edit_quotation_purchase_amount()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.erp_has_field_access('pricing.quotations.cost_section', 'purchase_amount', 'edit');
$$;

create or replace function erp_can_view_quotation_sale_price()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.erp_has_field_access('crm.quotations.record', 'sale_price', 'view')
    or public.erp_has_field_access('pricing.quotations.cost_section', 'sale_amount', 'view');
$$;

create or replace function erp_can_edit_quotation_sale_price()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.erp_has_field_access('crm.quotations.record', 'sale_price', 'edit')
    or public.erp_has_field_access('pricing.quotations.cost_section', 'sale_amount', 'edit');
$$;

create or replace function erp_can_view_quotation_expected_profit()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.erp_has_field_access('crm.quotations.record', 'expected_profit', 'view')
    or public.erp_has_field_access('pricing.quotations.cost_section', 'profit_amount', 'view');
$$;

create or replace function erp_can_access_route(
  p_route_path text,
  p_action_code text default 'view'
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  with normalized as (
    select case
      when nullif(btrim(coalesce(p_route_path, '')), '') is null then '/'
      when p_route_path = '/' then '/'
      else regexp_replace(btrim(p_route_path), '/+$', '')
    end as route_path
  ),
  candidate_matchers as (
    select
      ps.code,
      coalesce(nullif(btrim(matcher), ''), ps.route_path) as matcher
    from public.permission_submodules ps
    cross join lateral unnest(
      case
        when array_length(ps.route_matchers, 1) is null or array_length(ps.route_matchers, 1) = 0
          then array[coalesce(ps.route_path, '')]::text[]
        else ps.route_matchers
      end
    ) as matcher
    where ps.active = true
  ),
  matched_route as (
    select cm.code
    from normalized n
    join candidate_matchers cm
      on (
        n.route_path = cm.matcher
        or (
          cm.matcher <> '/'
          and n.route_path like cm.matcher || '/%'
        )
      )
    order by char_length(cm.matcher) desc
    limit 1
  )
  select exists (
    select 1
    from matched_route mr
    where public.erp_has_submodule_access(mr.code, p_action_code)
  );
$$;

create or replace function get_current_navigation_items()
returns table (
  module_code text,
  module_name text,
  module_icon_key text,
  module_sort_order integer,
  submodule_code text,
  submodule_name text,
  route_path text,
  route_matchers text[],
  submodule_sort_order integer
)
language sql
security definer
stable
set search_path = public
as $$
  select
    pm.code as module_code,
    pm.name as module_name,
    pm.icon_key as module_icon_key,
    pm.sort_order as module_sort_order,
    ps.code as submodule_code,
    ps.name as submodule_name,
    ps.route_path,
    ps.route_matchers,
    ps.sort_order as submodule_sort_order
  from public.permission_submodules ps
  join public.permission_modules pm
    on pm.id = ps.module_id
  where ps.active = true
    and pm.active = true
    and public.erp_has_submodule_access(ps.code, 'view')
  order by
    pm.sort_order asc,
    ps.sort_order asc,
    ps.name asc;
$$;

create or replace function resolve_login_identity(
  p_login text
)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select u.email
  from public.users u
  where u.active = true
    and (
      lower(u.email) = lower(btrim(p_login))
      or lower(coalesce(u.username, '')) = lower(btrim(p_login))
    )
  limit 1;
$$;

create or replace function link_current_auth_user()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_auth_email text;
  linked_user_id uuid;
begin
  if auth.uid() is null then
    return null;
  end if;

  select au.email
  into current_auth_email
  from auth.users au
  where au.id = auth.uid();

  if current_auth_email is null then
    return null;
  end if;

  update public.users
  set
    auth_user_id = auth.uid(),
    email = lower(current_auth_email),
    updated_at = now()
  where lower(email) = lower(current_auth_email)
    and active = true
    and (auth_user_id is null or auth_user_id = auth.uid());

  select u.id
  into linked_user_id
  from public.users u
  where u.auth_user_id = auth.uid()
    and u.active = true
  limit 1;

  return linked_user_id;
end;
$$;

create or replace function get_current_erp_user()
returns table (
  id uuid,
  auth_user_id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  username text,
  active boolean,
  role_id uuid,
  role_name text,
  branch_id uuid
)
language sql
security definer
stable
set search_path = public
as $$
  select
    u.id,
    u.auth_user_id,
    u.first_name,
    u.last_name,
    u.email,
    u.phone,
    u.username,
    u.active,
    u.role_id,
    r.name as role_name,
    u.branch_id
  from public.users u
  left join public.roles r on r.id = u.role_id
  where u.auth_user_id = auth.uid()
    and u.active = true
  limit 1;
$$;

create or replace function create_erp_user_profile(
  p_first_name text,
  p_email text,
  p_last_name text default null,
  p_phone text default null,
  p_username text default null,
  p_role_name text default null,
  p_active boolean default true,
  p_auth_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_role_id uuid;
  new_user_id uuid;
begin
  if not public.erp_is_admin() then
    raise exception 'forbidden';
  end if;

  if nullif(btrim(coalesce(p_email, '')), '') is null then
    raise exception 'email_required';
  end if;

  if nullif(btrim(coalesce(p_role_name, '')), '') is not null then
    select r.id
    into resolved_role_id
    from public.roles r
    where lower(r.name) = lower(btrim(p_role_name))
    limit 1;

    if resolved_role_id is null then
      raise exception 'invalid_role';
    end if;
  end if;

  insert into public.users (
    auth_user_id,
    first_name,
    last_name,
    email,
    phone,
    username,
    role_id,
    active
  )
  values (
    p_auth_user_id,
    nullif(btrim(coalesce(p_first_name, '')), ''),
    nullif(btrim(coalesce(p_last_name, '')), ''),
    lower(btrim(p_email)),
    nullif(btrim(coalesce(p_phone, '')), ''),
    nullif(lower(btrim(coalesce(p_username, ''))), ''),
    resolved_role_id,
    coalesce(p_active, true)
  )
  returning id into new_user_id;

  return new_user_id;
end;
$$;

create or replace function update_erp_user_profile(
  p_user_id uuid,
  p_first_name text,
  p_email text,
  p_last_name text default null,
  p_phone text default null,
  p_username text default null,
  p_role_name text default null,
  p_active boolean default true,
  p_auth_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_role_id uuid;
begin
  if not public.erp_is_admin() then
    raise exception 'forbidden';
  end if;

  if nullif(btrim(coalesce(p_email, '')), '') is null then
    raise exception 'email_required';
  end if;

  if nullif(btrim(coalesce(p_role_name, '')), '') is not null then
    select r.id
    into resolved_role_id
    from public.roles r
    where lower(r.name) = lower(btrim(p_role_name))
    limit 1;

    if resolved_role_id is null then
      raise exception 'invalid_role';
    end if;
  end if;

  update public.users
  set
    auth_user_id = coalesce(p_auth_user_id, auth_user_id),
    first_name = nullif(btrim(coalesce(p_first_name, '')), ''),
    last_name = nullif(btrim(coalesce(p_last_name, '')), ''),
    email = lower(btrim(p_email)),
    phone = nullif(btrim(coalesce(p_phone, '')), ''),
    username = nullif(lower(btrim(coalesce(p_username, ''))), ''),
    role_id = resolved_role_id,
    active = coalesce(p_active, active),
    updated_at = now()
  where id = p_user_id;

  return p_user_id;
end;
$$;


-- =========================================
-- 1. CREATE CLIENT WITH CONTACTS
-- =========================================

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
  p_account_owner_id uuid default null,
  p_contacts jsonb default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_client_id uuid;
  resolved_account_owner_id uuid := coalesce(p_account_owner_id, public.erp_current_user_id());
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
    city_unlocode,
    account_owner_id
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
    p_city_unlocode,
    resolved_account_owner_id
  )
  returning id into new_client_id;

  if p_contacts is not null then
    insert into contacts (
      client_id,
      name,
      email,
      phone,
      linkedin_url,
      position,
      status,
      is_primary
    )
    select
      new_client_id,
      contact->>'name',
      contact->>'email',
      contact->>'phone',
      contact->>'linkedin_url',
      contact->>'position',
      coalesce(nullif(contact->>'status', ''), 'activo'),
      coalesce((contact->>'is_primary')::boolean, false)
    from jsonb_array_elements(p_contacts) as contact;
  end if;

  return new_client_id;
end;
$$;


-- =========================================
-- 2. ADD CONTACT TO CLIENT
-- =========================================

create or replace function add_contact_to_client(
  p_client_id uuid,
  p_name text,
  p_email text default null,
  p_phone text default null,
  p_linkedin_url text default null,
  p_position text default null,
  p_status text default 'activo',
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
    linkedin_url,
    position,
    status,
    is_primary
  )
  values (
    p_client_id,
    p_name,
    p_email,
    p_phone,
    p_linkedin_url,
    p_position,
    coalesce(nullif(btrim(p_status), ''), 'activo'),
    p_is_primary
  )
  returning id into new_contact_id;

  return new_contact_id;
end;
$$;


-- =========================================
-- 2.25 ADD CLIENT LOGISTICS PARTY
-- =========================================

create or replace function add_client_logistics_party(
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

  insert into client_logistics_parties (
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


-- =========================================
-- 2.5 DELETE CLIENT LOGISTICS PARTY
-- =========================================

create or replace function delete_client_logistics_party(
  p_party_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  delete from client_logistics_parties
  where id = p_party_id;
end;
$$;


-- =========================================
-- 2.75 RESOLVE UN/LOCODE REFERENCE
-- =========================================

create or replace function resolve_unlocode_reference(
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
  from unlocodes u
  where (
    p_unlocode_id is not null and u.id = p_unlocode_id
  ) or (
    p_unlocode_id is null
    and nullif(upper(btrim(coalesce(p_unlocode, ''))), '') is not null
    and u.unlocode = upper(btrim(p_unlocode))
  )
  limit 1;
$$;


-- =========================================
-- 3. OPPORTUNITY HELPERS
-- =========================================

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


-- =========================================
-- 4. CREATE OPPORTUNITY
-- =========================================

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


-- =========================================
-- 5. UPDATE OPPORTUNITY STATUS
-- =========================================

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


-- =========================================
-- 6. QUOTATION HELPERS
-- =========================================

create or replace function next_quotation_reference(
  p_service_type text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_service_type text;
  resolved_prefix text;
  next_value bigint;
begin
  normalized_service_type := upper(btrim(coalesce(p_service_type, '')));

  update quotation_reference_counters
  set
    last_value = last_value + 1,
    updated_at = now()
  where service_type = normalized_service_type
  returning prefix, last_value
  into resolved_prefix, next_value;

  if resolved_prefix is null then
    raise exception 'Unsupported quotation service type: %', p_service_type;
  end if;

  return resolved_prefix || '-' || lpad(next_value::text, 6, '0');
end;
$$;

create or replace function recalculate_quotation_totals(
  p_quotation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total_purchase numeric;
  total_sale numeric;
  total_profit numeric;
begin
  select
    coalesce(sum(coalesce(qc.purchase_amount_mxn, qc.purchase_amount, qc.cost, 0)), 0),
    coalesce(sum(coalesce(qc.sale_amount_mxn, qc.sale_amount, 0)), 0),
    coalesce(sum(coalesce(qc.profit_amount_mxn, qc.profit_amount, coalesce(qc.sale_amount_mxn, qc.sale_amount, 0) - coalesce(qc.purchase_amount_mxn, qc.purchase_amount, qc.cost, 0))), 0)
  into total_purchase, total_sale, total_profit
  from quotation_costs qc
  where qc.quotation_id = p_quotation_id;

  update quotations
  set
    estimated_cost = total_purchase,
    estimated_price = case when total_sale = 0 then null else total_sale end,
    expected_profit = case when total_sale = 0 and total_purchase = 0 then null else total_profit end
  where id = p_quotation_id;
end;
$$;

create or replace function normalize_currency_code(
  p_currency text
)
returns text
language plpgsql
immutable
as $$
declare
  normalized text := upper(nullif(btrim(coalesce(p_currency, '')), ''));
begin
  if normalized is null then
    return 'MXN';
  end if;

  if normalized not in ('MXN', 'USD', 'EUR') then
    raise exception 'Unsupported currency: %', p_currency;
  end if;

  return normalized;
end;
$$;

create or replace function get_exchange_rate_to_mxn(
  p_currency text,
  p_reference_date date default current_date
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_currency text := public.normalize_currency_code(p_currency);
  resolved_rate numeric;
begin
  if normalized_currency = 'MXN' then
    return 1;
  end if;

  select er.rate_value
  into resolved_rate
  from exchange_rates er
  where er.base_currency = normalized_currency
    and er.quote_currency = 'MXN'
    and er.rate_date <= coalesce(p_reference_date, current_date) - interval '1 day'
  order by er.rate_date desc,
    case when er.source = 'BANXICO' then 0 else 1 end asc
  limit 1;

  if resolved_rate is null then
    raise exception 'No exchange rate available for % -> MXN before %', normalized_currency, coalesce(p_reference_date, current_date);
  end if;

  return resolved_rate;
end;
$$;

create or replace function get_exchange_rate_snapshot_to_mxn(
  p_currency text,
  p_reference_date date default current_date
)
returns table (
  rate_date date,
  rate_value numeric,
  source text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_currency text := public.normalize_currency_code(p_currency);
begin
  if normalized_currency = 'MXN' then
    return query
    select
      coalesce(p_reference_date, current_date),
      1::numeric,
      'SYSTEM'::text;
    return;
  end if;

  return query
  select
    er.rate_date,
    er.rate_value,
    er.source
  from exchange_rates er
  where er.base_currency = normalized_currency
    and er.quote_currency = 'MXN'
    and er.rate_date <= coalesce(p_reference_date, current_date) - interval '1 day'
  order by er.rate_date desc,
    case when er.source = 'BANXICO' then 0 else 1 end asc
  limit 1;

  if not found then
    raise exception 'No exchange rate snapshot available for % -> MXN before %', normalized_currency, coalesce(p_reference_date, current_date);
  end if;
end;
$$;

create or replace function resolve_quotation_exchange_rate_to_mxn(
  p_quotation_id uuid,
  p_currency text,
  p_reference_date date default current_date
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_currency text := public.normalize_currency_code(p_currency);
  quotation_row record;
  snapshot_row record;
begin
  if normalized_currency = 'MXN' then
    return 1;
  end if;

  select
    q.status,
    q.accepted_usd_to_mxn_rate,
    q.accepted_eur_to_mxn_rate
  into quotation_row
  from quotations q
  where q.id = p_quotation_id;

  if quotation_row is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  if quotation_row.status = 'aceptada' then
    if normalized_currency = 'USD' and quotation_row.accepted_usd_to_mxn_rate is not null then
      return quotation_row.accepted_usd_to_mxn_rate;
    end if;

    if normalized_currency = 'EUR' and quotation_row.accepted_eur_to_mxn_rate is not null then
      return quotation_row.accepted_eur_to_mxn_rate;
    end if;
  end if;

  select *
  into snapshot_row
  from get_exchange_rate_snapshot_to_mxn(normalized_currency, p_reference_date);

  return snapshot_row.rate_value;
end;
$$;

create or replace function lock_quotation_exchange_rates(
  p_quotation_id uuid,
  p_reference_date date default current_date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  usd_snapshot record;
  eur_snapshot record;
begin
  select *
  into usd_snapshot
  from get_exchange_rate_snapshot_to_mxn('USD', p_reference_date);

  select *
  into eur_snapshot
  from get_exchange_rate_snapshot_to_mxn('EUR', p_reference_date);

  update quotations
  set
    accepted_usd_rate_date = usd_snapshot.rate_date,
    accepted_usd_to_mxn_rate = usd_snapshot.rate_value,
    accepted_eur_rate_date = eur_snapshot.rate_date,
    accepted_eur_to_mxn_rate = eur_snapshot.rate_value,
    exchange_rates_locked_at = now()
  where id = p_quotation_id;
end;
$$;

create or replace function ensure_quotation_option(
  p_quotation_id uuid,
  p_quotation_option_id uuid default null,
  p_option_label text default null
)
returns table (
  id uuid,
  option_label text,
  sort_order integer,
  include_in_customer_quote boolean,
  purchase_valid_until date,
  sales_valid_until date,
  sales_validity_overridden boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_option record;
  next_sort_order integer;
  normalized_label text;
begin
  perform 1
  from quotations q
  where q.id = p_quotation_id
  for update;

  if p_quotation_option_id is not null then
    return query
    select
      qo.id,
      qo.option_label,
      qo.sort_order,
      qo.include_in_customer_quote,
      qo.purchase_valid_until,
      qo.sales_valid_until,
      qo.sales_validity_overridden
    from quotation_options qo
    where qo.id = p_quotation_option_id
      and qo.quotation_id = p_quotation_id;

    if found then
      return;
    end if;

    raise exception 'Quotation option % not found for quotation %', p_quotation_option_id, p_quotation_id;
  end if;

  normalized_label := nullif(btrim(coalesce(p_option_label, '')), '');

  if normalized_label is not null then
    select
      qo.id,
      qo.option_label,
      qo.sort_order,
      qo.include_in_customer_quote,
      qo.purchase_valid_until,
      qo.sales_valid_until,
      qo.sales_validity_overridden
    into existing_option
    from quotation_options qo
    where qo.quotation_id = p_quotation_id
      and qo.option_label = normalized_label;

    if existing_option is not null then
      return query
      select
        existing_option.id,
        existing_option.option_label,
        existing_option.sort_order,
        existing_option.include_in_customer_quote,
        existing_option.purchase_valid_until,
        existing_option.sales_valid_until,
        existing_option.sales_validity_overridden;
      return;
    end if;
  end if;

  select coalesce(max(qo.sort_order), 0) + 1
  into next_sort_order
  from quotation_options qo
  where qo.quotation_id = p_quotation_id;

  insert into quotation_options (
    quotation_id,
    option_label,
    sort_order,
    include_in_customer_quote,
    purchase_valid_until,
    sales_valid_until,
    sales_validity_overridden
  )
  values (
    p_quotation_id,
    coalesce(normalized_label, 'Opcion ' || next_sort_order),
    next_sort_order,
    true,
    null,
    null,
    false
  )
  returning
    quotation_options.id,
    quotation_options.option_label,
    quotation_options.sort_order,
    quotation_options.include_in_customer_quote,
    quotation_options.purchase_valid_until,
    quotation_options.sales_valid_until,
    quotation_options.sales_validity_overridden
  into existing_option;

  return query
  select
    existing_option.id,
    existing_option.option_label,
    existing_option.sort_order,
    existing_option.include_in_customer_quote,
    existing_option.purchase_valid_until,
    existing_option.sales_valid_until,
    existing_option.sales_validity_overridden;
end;
$$;

create or replace function update_quotation_option_validity(
  p_quotation_option_id uuid,
  p_purchase_valid_until date default null,
  p_sales_valid_until date default null,
  p_override_sales_valid_until boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_row record;
  can_edit_pricing boolean := false;
begin
  select
    q.id as quotation_id,
    q.pricing_owner_id,
    q.created_by,
    q.client_id,
    qo.purchase_valid_until,
    qo.sales_valid_until,
    qo.sales_validity_overridden
  into quotation_row
  from quotation_options qo
  join quotations q on q.id = qo.quotation_id
  where qo.id = p_quotation_option_id;

  if quotation_row is null then
    raise exception 'Quotation option % not found', p_quotation_option_id;
  end if;

  can_edit_pricing := public.erp_has_resource_access(
    'pricing.quotations.cost_section',
    'edit',
    quotation_row.pricing_owner_id,
    null
  );

  if p_purchase_valid_until is not null and not (can_edit_pricing or public.erp_is_admin()) then
    raise exception 'You do not have permission to edit purchase validity for this quotation option'
      using errcode = '42501';
  end if;

  if p_override_sales_valid_until and not public.erp_is_admin() then
    raise exception 'Only Admin may override quotation sales validity'
      using errcode = '42501';
  end if;

  if p_override_sales_valid_until and p_sales_valid_until is null then
    raise exception 'Sales validity is required when overriding quotation sales validity';
  end if;

  update quotation_options
  set
    purchase_valid_until = coalesce(p_purchase_valid_until, purchase_valid_until),
    sales_valid_until = case
      when p_override_sales_valid_until then p_sales_valid_until
      when p_purchase_valid_until is not null then p_purchase_valid_until
      else sales_valid_until
    end,
    sales_validity_overridden = case
      when p_override_sales_valid_until then true
      when p_purchase_valid_until is not null then false
      else sales_validity_overridden
    end,
    updated_at = now()
  where id = p_quotation_option_id;
end;
$$;

create or replace function refresh_quotation_cost_line_mxn(
  p_quotation_id uuid,
  p_reference_date date default current_date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update quotation_costs qc
  set
    purchase_exchange_rate_to_mxn = public.resolve_quotation_exchange_rate_to_mxn(
      qc.quotation_id,
      qc.purchase_currency,
      p_reference_date
    ),
    purchase_amount_mxn = case
      when qc.purchase_amount is null then null
      else qc.purchase_amount * public.resolve_quotation_exchange_rate_to_mxn(
        qc.quotation_id,
        qc.purchase_currency,
        p_reference_date
      )
    end,
    sale_exchange_rate_to_mxn = public.resolve_quotation_exchange_rate_to_mxn(
      qc.quotation_id,
      qc.sale_currency,
      p_reference_date
    ),
    sale_amount_mxn = case
      when qc.sale_amount is null then null
      else qc.sale_amount * public.resolve_quotation_exchange_rate_to_mxn(
        qc.quotation_id,
        qc.sale_currency,
        p_reference_date
      )
    end,
    profit_amount_mxn = case
      when qc.sale_amount is null or qc.purchase_amount is null then null
      else
        (qc.sale_amount * public.resolve_quotation_exchange_rate_to_mxn(
          qc.quotation_id,
          qc.sale_currency,
          p_reference_date
        ))
        - (qc.purchase_amount * public.resolve_quotation_exchange_rate_to_mxn(
          qc.quotation_id,
          qc.purchase_currency,
          p_reference_date
        ))
    end
  where qc.quotation_id = p_quotation_id;
end;
$$;

create or replace function refresh_open_quotation_exchange_rates(
  p_reference_date date default current_date
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_row record;
  affected_count integer := 0;
begin
  for quotation_row in
    select q.id
    from quotations q
    where q.status <> 'aceptada'
  loop
    perform public.refresh_quotation_cost_line_mxn(quotation_row.id, p_reference_date);
    perform public.recalculate_quotation_totals(quotation_row.id);
    affected_count := affected_count + 1;
  end loop;

  return affected_count;
end;
$$;

create or replace function set_quotation_option_customer_visibility(
  p_quotation_option_id uuid,
  p_include_in_customer_quote boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_row record;
begin
  select
    q.id,
    q.created_by,
    q.client_id
  into quotation_row
  from quotation_options qo
  join quotations q on q.id = qo.quotation_id
  where qo.id = p_quotation_option_id;

  if quotation_row is null then
    raise exception 'Quotation option % not found', p_quotation_option_id;
  end if;

  if not public.erp_can_access_crm_quotation_resource(
    'crm.quotations.customer_actions',
    'edit',
    quotation_row.created_by,
    quotation_row.client_id
  ) then
    raise exception 'You do not have permission to select customer-visible options'
      using errcode = '42501';
  end if;

  update quotation_options
  set include_in_customer_quote = coalesce(p_include_in_customer_quote, true)
  where id = p_quotation_option_id;
end;
$$;

create or replace function create_quotation_from_opportunity(
  p_opportunity_id uuid,
  p_pickup_address text default null,
  p_delivery_address text default null,
  p_required_quote_date date default null,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_quotation_id uuid;
  opportunity_row opportunities%rowtype;
  resolved_created_by uuid;
begin
  perform sync_expired_opportunities();

  select *
  into opportunity_row
  from opportunities
  where id = p_opportunity_id;

  if not found then
    raise exception 'Opportunity % not found', p_opportunity_id;
  end if;

  if nullif(btrim(coalesce(opportunity_row.service_type, '')), '') is null then
    raise exception 'Opportunity % must define a service type before quoting', p_opportunity_id;
  end if;

  resolved_created_by := coalesce(p_created_by, erp_current_user_id(), opportunity_row.salesperson_id);

  insert into quotations (
    client_id,
    opportunity_id,
    created_by,
    status,
    service_type,
    transport_type,
    operation_type,
    origin,
    origin_unlocode,
    origin_unlocode_id,
    destination,
    destination_unlocode,
    destination_unlocode_id,
    pickup_address,
    delivery_address,
    incoterm_id,
    required_quote_date,
    purchase_valid_until,
    sales_valid_until
  )
  values (
    opportunity_row.client_id,
    opportunity_row.id,
    resolved_created_by,
    'borrador',
    opportunity_row.service_type,
    opportunity_row.transport_type,
    opportunity_row.operation_type,
    opportunity_row.origin,
    opportunity_row.origin_unlocode,
    opportunity_row.origin_unlocode_id,
    opportunity_row.destination,
    opportunity_row.destination_unlocode,
    opportunity_row.destination_unlocode_id,
    nullif(btrim(coalesce(p_pickup_address, '')), ''),
    nullif(btrim(coalesce(p_delivery_address, '')), ''),
    opportunity_row.incoterm_id,
    p_required_quote_date,
    null,
    null
  )
  returning id into new_quotation_id;

  update opportunities
  set status = 'cotizando'
  where id = p_opportunity_id
    and status not in ('aceptado', 'rechazada', 'vencida');

  return new_quotation_id;
end;
$$;

create or replace function request_quotation_pricing(
  p_quotation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_created_by uuid;
  quotation_client_id uuid;
begin
  select
    q.created_by,
    q.client_id
  into quotation_created_by, quotation_client_id
  from quotations q
  where q.id = p_quotation_id;

  if quotation_client_id is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  if not public.erp_can_access_crm_quotation_resource(
    'crm.quotations.record',
    'edit',
    quotation_created_by,
    quotation_client_id
  ) then
    raise exception 'You do not have permission to send this quotation to pricing'
      using errcode = '42501';
  end if;

  update quotations
  set status = 'pendiente'
  where id = p_quotation_id;
end;
$$;

create or replace function convert_opportunity_to_quotation(
  p_opportunity_id uuid,
  p_created_by uuid default null
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select create_quotation_from_opportunity(
    p_opportunity_id => p_opportunity_id,
    p_created_by => p_created_by
  );
$$;

create or replace function take_quotation_for_pricing(
  p_quotation_id uuid,
  p_pricing_owner_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_pricing_owner_id uuid;
  current_status text;
begin
  resolved_pricing_owner_id := coalesce(p_pricing_owner_id, erp_current_user_id());

  if resolved_pricing_owner_id is null then
    raise exception 'Pricing owner is required';
  end if;

  select q.status
  into current_status
  from quotations q
  where q.id = p_quotation_id;

  if current_status is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  if not public.erp_can_access_pricing_quotation(
    'pricing_take',
    current_status,
    null
  ) then
    raise exception 'You do not have permission to take this quotation'
      using errcode = '42501';
  end if;

  update quotations
  set
    pricing_owner_id = resolved_pricing_owner_id,
    status = 'cotizando'
  where id = p_quotation_id;
end;
$$;

create or replace function update_quotation_status(
  p_quotation_id uuid,
  p_status text,
  p_rejection_reason_id uuid default null,
  p_rejection_notes text default null,
  p_cancellation_notes text default null,
  p_target_rate numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_status text;
  quotation_created_by uuid;
  quotation_pricing_owner_id uuid;
  quotation_client_id uuid;
begin
  normalized_status := lower(btrim(coalesce(p_status, '')));

  if normalized_status = '' then
    raise exception 'Quotation status is required';
  end if;

  if normalized_status = 'rechazada' and p_rejection_reason_id is null then
    raise exception 'A rejection reason is required when rejecting a quotation';
  end if;

  if normalized_status = 'renegociar_tarifa' and p_target_rate is null then
    raise exception 'A target rate is required when requesting renegotiation';
  end if;

  select
    q.created_by,
    q.pricing_owner_id,
    q.client_id
  into quotation_created_by, quotation_pricing_owner_id, quotation_client_id
  from quotations q
  where q.id = p_quotation_id;

  if quotation_client_id is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  if normalized_status = 'lista_para_enviar' then
    if not public.erp_can_access_pricing_quotation(
      'edit',
      normalized_status,
      quotation_pricing_owner_id
    ) then
      raise exception 'You do not have permission to complete the pricing proposal'
        using errcode = '42501';
    end if;
  elsif normalized_status = 'enviada' then
    if not public.erp_has_resource_access('crm.quotations', 'send_quote')
      or not public.erp_can_access_crm_quotation_resource(
        'crm.quotations.customer_actions',
        'edit',
        quotation_created_by,
        quotation_client_id
      ) then
      raise exception 'You do not have permission to send this quotation'
        using errcode = '42501';
    end if;
  elsif normalized_status in ('cancelada', 'rechazada', 'renegociar_tarifa', 'aceptada') then
    if not public.erp_can_access_crm_quotation_resource(
      'crm.quotations.customer_actions',
      'edit',
      quotation_created_by,
      quotation_client_id
    ) then
      raise exception 'You do not have permission to change this quotation status'
        using errcode = '42501';
    end if;
  elsif normalized_status = 'pendiente' then
    if not public.erp_can_access_crm_quotation_resource(
      'crm.quotations.record',
      'edit',
      quotation_created_by,
      quotation_client_id
    ) then
      raise exception 'You do not have permission to request pricing for this quotation'
        using errcode = '42501';
    end if;
  end if;

  update quotations
  set
    status = normalized_status,
    rejection_reason_id = case when normalized_status = 'rechazada' then p_rejection_reason_id else null end,
    rejection_notes = case
      when normalized_status in ('rechazada', 'renegociar_tarifa') then nullif(btrim(coalesce(p_rejection_notes, '')), '')
      else null
    end,
    cancellation_notes = case when normalized_status = 'cancelada' then nullif(btrim(coalesce(p_cancellation_notes, '')), '') else null end,
    target_rate = case when normalized_status = 'renegociar_tarifa' then p_target_rate else null end
  where id = p_quotation_id;

  if normalized_status = 'aceptada' then
    perform public.lock_quotation_exchange_rates(p_quotation_id, current_date);
  end if;

  perform public.refresh_quotation_cost_line_mxn(p_quotation_id, current_date);
  perform public.recalculate_quotation_totals(p_quotation_id);
end;
$$;

create or replace function search_quotations(
  p_scope text default 'crm',
  p_query text default null,
  p_status text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid,
  client_id uuid,
  opportunity_id uuid,
  created_by uuid,
  pricing_owner_id uuid,
  reference_number text,
  status text,
  service_type text,
  transport_type text,
  operation_type text,
  incoterm_id uuid,
  incoterm_code text,
  origin text,
  origin_unlocode text,
  origin_unlocode_id uuid,
  destination text,
  destination_unlocode text,
  destination_unlocode_id uuid,
  pickup_address text,
  delivery_address text,
  required_quote_date date,
  purchase_valid_until date,
  sales_valid_until date,
  rejection_reason_id uuid,
  rejection_reason text,
  rejection_notes text,
  cancellation_notes text,
  target_rate numeric,
  currency text,
  estimated_cost numeric,
  estimated_price numeric,
  expected_profit numeric,
  can_view_cost boolean,
  can_edit_purchase_amount boolean,
  can_view_sale_price boolean,
  can_edit_sale_price boolean,
  can_view_expected_profit boolean,
  total_charge_lines bigint,
  created_at timestamptz,
  updated_at timestamptz,
  client_name text,
  opportunity_title text,
  salesperson_id uuid,
  salesperson_name text,
  pricing_owner_name text,
  created_by_name text,
  total_count bigint
)
language sql
security definer
set search_path = public
as $$
  with params as (
    select
      lower(coalesce(nullif(btrim(p_scope), ''), 'crm')) as normalized_scope,
      lower(nullif(btrim(p_query), '')) as normalized_query,
      lower(nullif(btrim(p_status), '')) as normalized_status,
      greatest(coalesce(p_limit, 25), 1) as normalized_limit,
      greatest(coalesce(p_offset, 0), 0) as normalized_offset,
      public.erp_can_view_quotation_cost() as can_view_cost,
      public.erp_can_edit_quotation_purchase_amount() as can_edit_purchase_amount,
      public.erp_can_view_quotation_sale_price() as can_view_sale_price,
      public.erp_can_edit_quotation_sale_price() as can_edit_sale_price,
      public.erp_can_view_quotation_expected_profit() as can_view_expected_profit
  ),
  filtered as (
    select
      q.id,
      q.client_id,
      q.opportunity_id,
      q.created_by,
      q.pricing_owner_id,
      q.reference_number,
      q.status,
      q.service_type,
      q.transport_type,
      q.operation_type,
      q.incoterm_id,
      i.code as incoterm_code,
      q.origin,
      q.origin_unlocode,
      q.origin_unlocode_id,
      q.destination,
      q.destination_unlocode,
      q.destination_unlocode_id,
      q.pickup_address,
      q.delivery_address,
      q.required_quote_date,
      null::date as purchase_valid_until,
      null::date as sales_valid_until,
      q.rejection_reason_id,
      rr.reason as rejection_reason,
      q.rejection_notes,
      q.cancellation_notes,
      q.target_rate,
      q.currency,
      case when p.can_view_cost then q.estimated_cost else null end as estimated_cost,
      case when p.can_view_sale_price then q.estimated_price else null end as estimated_price,
      case when p.can_view_expected_profit then q.expected_profit else null end as expected_profit,
      p.can_view_cost,
      p.can_edit_purchase_amount,
      p.can_view_sale_price,
      p.can_edit_sale_price,
      p.can_view_expected_profit,
      (
        select count(*)
        from quotation_costs qc
        where qc.quotation_id = q.id
      ) as total_charge_lines,
      q.created_at,
      q.updated_at,
      c.company_name as client_name,
      o.title as opportunity_title,
      o.salesperson_id,
      concat_ws(' ', su.first_name, su.last_name) as salesperson_name,
      concat_ws(' ', pu.first_name, pu.last_name) as pricing_owner_name,
      concat_ws(' ', cu.first_name, cu.last_name) as created_by_name,
      case
        when p.normalized_query is null then 0
        when lower(coalesce(q.reference_number, '')) = p.normalized_query then 1000
        when lower(coalesce(q.reference_number, '')) like p.normalized_query || '%' then 950
        when lower(c.company_name) = p.normalized_query then 900
        when lower(c.company_name) like p.normalized_query || '%' then 875
        when lower(coalesce(o.title, '')) like p.normalized_query || '%' then 850
        when upper(coalesce(q.origin_unlocode, '')) = upper(p.normalized_query) then 825
        when upper(coalesce(q.destination_unlocode, '')) = upper(p.normalized_query) then 825
        else greatest(
          similarity(q.search_text, p.normalized_query),
          similarity(c.search_text, p.normalized_query),
          similarity(lower(coalesce(o.title, '')), p.normalized_query)
        ) * 100
      end as match_rank
    from quotations q
    join clients c on c.id = q.client_id
    join opportunities o on o.id = q.opportunity_id
    left join incoterms i on i.id = q.incoterm_id
    left join quotation_rejection_reasons rr on rr.id = q.rejection_reason_id
    left join users pu on pu.id = q.pricing_owner_id
    left join users cu on cu.id = q.created_by
    left join users su on su.id = o.salesperson_id
    cross join params p
    where c.is_deleted = false
      and (
        (
          p.normalized_scope = 'crm'
          and public.erp_can_access_crm_quotation_resource(
            'crm.quotations.list',
            'view',
            q.created_by,
            q.client_id
          )
        )
        or (
          p.normalized_scope = 'pricing'
          and q.status in ('pendiente', 'cotizando', 'lista_para_enviar', 'renegociar_tarifa')
          and public.erp_can_access_pricing_quotation(
            'view',
            q.status,
            q.pricing_owner_id
          )
        )
      )
      and (
        p.normalized_status is null
        or q.status = p.normalized_status
      )
      and (
        p.normalized_query is null
        or q.search_text % p.normalized_query
        or q.search_text ilike '%' || p.normalized_query || '%'
        or c.search_text % p.normalized_query
        or c.search_text ilike '%' || p.normalized_query || '%'
        or lower(coalesce(o.title, '')) ilike '%' || p.normalized_query || '%'
        or lower(concat_ws(' ', pu.first_name, pu.last_name)) ilike '%' || p.normalized_query || '%'
      )
  )
  select
    filtered.id,
    filtered.client_id,
    filtered.opportunity_id,
    filtered.created_by,
    filtered.pricing_owner_id,
    filtered.reference_number,
    filtered.status,
    filtered.service_type,
    filtered.transport_type,
    filtered.operation_type,
    filtered.incoterm_id,
    filtered.incoterm_code,
    filtered.origin,
    filtered.origin_unlocode,
    filtered.origin_unlocode_id,
    filtered.destination,
    filtered.destination_unlocode,
    filtered.destination_unlocode_id,
    filtered.pickup_address,
    filtered.delivery_address,
    filtered.required_quote_date,
    filtered.purchase_valid_until,
    filtered.sales_valid_until,
    filtered.rejection_reason_id,
    filtered.rejection_reason,
    filtered.rejection_notes,
    filtered.cancellation_notes,
    filtered.target_rate,
    filtered.currency,
    filtered.estimated_cost,
    filtered.estimated_price,
    filtered.expected_profit,
    filtered.can_view_cost,
    filtered.can_edit_purchase_amount,
    filtered.can_view_sale_price,
    filtered.can_edit_sale_price,
    filtered.can_view_expected_profit,
    filtered.total_charge_lines,
    filtered.created_at,
    filtered.updated_at,
    filtered.client_name,
    filtered.opportunity_title,
    filtered.salesperson_id,
    filtered.salesperson_name,
    filtered.pricing_owner_name,
    filtered.created_by_name,
    count(*) over() as total_count
  from filtered
  cross join params p
  order by
    filtered.match_rank desc,
    filtered.created_at desc,
    filtered.id desc
  limit (select normalized_limit from params)
  offset (select normalized_offset from params);
$$;

create or replace function approve_quotation(
  p_quotation_id uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  select update_quotation_status(
    p_quotation_id => p_quotation_id,
    p_status => 'aceptada'
  );
$$;

create or replace function create_quotation_cost_line(
  p_quotation_id uuid,
  p_quotation_option_id uuid default null,
  p_option_label text default null,
  p_provider_id uuid default null,
  p_sales_accounting_concept_id uuid default null,
  p_purchase_amount numeric default null,
  p_purchase_currency text default 'USD',
  p_purchase_valid_until date default null,
  p_sale_amount numeric default null,
  p_sale_currency text default 'USD',
  p_vat_rate numeric default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_line_id uuid;
  concept_row sales_accounting_concepts%rowtype;
  quotation_pricing_owner_id uuid;
  quotation_status text;
  normalized_purchase_currency text;
  normalized_sale_currency text;
  resolved_option record;
begin
  select
    q.pricing_owner_id,
    q.status
  into quotation_pricing_owner_id, quotation_status
  from quotations q
  where q.id = p_quotation_id;

  if quotation_status is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  if not public.erp_has_resource_access(
    'pricing.quotations.cost_section',
    'create',
    quotation_pricing_owner_id,
    null
  ) then
    raise exception 'You do not have permission to create quotation costs'
      using errcode = '42501';
  end if;

  if p_purchase_amount is not null and not public.erp_can_edit_quotation_purchase_amount() then
    raise exception 'You do not have permission to edit quotation cost'
      using errcode = '42501';
  end if;

  if p_sale_amount is not null and not public.erp_can_edit_quotation_sale_price() then
    raise exception 'You do not have permission to edit quotation sale price'
      using errcode = '42501';
  end if;

  if p_sales_accounting_concept_id is not null then
    select *
    into concept_row
    from sales_accounting_concepts
    where id = p_sales_accounting_concept_id;

    if not found then
      raise exception 'Sales accounting concept % not found', p_sales_accounting_concept_id;
    end if;
  end if;

  normalized_purchase_currency := public.normalize_currency_code(p_purchase_currency);
  normalized_sale_currency := public.normalize_currency_code(coalesce(p_sale_currency, p_purchase_currency));

  select *
  into resolved_option
  from public.ensure_quotation_option(
    p_quotation_id => p_quotation_id,
    p_quotation_option_id => p_quotation_option_id,
    p_option_label => p_option_label
  );

  insert into quotation_costs (
    quotation_id,
    quotation_option_id,
    option_label,
    provider_id,
    sales_accounting_concept_id,
    service_name,
    cost,
    purchase_amount,
    purchase_currency,
    purchase_exchange_rate_to_mxn,
    purchase_amount_mxn,
    sale_amount,
    sale_currency,
    sale_exchange_rate_to_mxn,
    sale_amount_mxn,
    profit_amount,
    profit_amount_mxn,
    vat_rate,
    notes
  )
  values (
    p_quotation_id,
    resolved_option.id,
    resolved_option.option_label,
    p_provider_id,
    p_sales_accounting_concept_id,
    coalesce(concept_row.concept, 'Cargo'),
    coalesce(p_purchase_amount, 0),
    p_purchase_amount,
    normalized_purchase_currency,
    null,
    null,
    p_sale_amount,
    normalized_sale_currency,
    null,
    null,
    case
      when p_sale_amount is null or p_purchase_amount is null then null
      else p_sale_amount - p_purchase_amount
    end,
    null,
    coalesce(p_vat_rate, concept_row.vat_rate, 0),
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning id into new_line_id;

  perform public.refresh_quotation_cost_line_mxn(p_quotation_id, current_date);
  if p_purchase_valid_until is not null then
    perform public.update_quotation_option_validity(
      p_quotation_option_id => resolved_option.id,
      p_purchase_valid_until => p_purchase_valid_until,
      p_sales_valid_until => null,
      p_override_sales_valid_until => false
    );
  end if;
  perform recalculate_quotation_totals(p_quotation_id);

  return new_line_id;
end;
$$;

create or replace function update_quotation_cost_line(
  p_id uuid,
  p_quotation_option_id uuid default null,
  p_option_label text default null,
  p_provider_id uuid default null,
  p_sales_accounting_concept_id uuid default null,
  p_purchase_amount numeric default null,
  p_purchase_currency text default null,
  p_purchase_valid_until date default null,
  p_sale_amount numeric default null,
  p_sale_currency text default null,
  p_vat_rate numeric default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_id_value uuid;
  previous_option_id uuid;
  quotation_created_by uuid;
  quotation_pricing_owner_id uuid;
  quotation_client_id uuid;
  concept_row sales_accounting_concepts%rowtype;
  current_purchase_amount numeric;
  current_purchase_currency text;
  current_sale_amount numeric;
  current_sale_currency text;
  can_edit_pricing boolean := false;
  can_edit_sales boolean := false;
  normalized_purchase_currency text;
  normalized_sale_currency text;
  resolved_option record;
begin
  select quotation_id
  into quotation_id_value
  from quotation_costs
  where id = p_id;

  if quotation_id_value is null then
    raise exception 'Quotation cost line % not found', p_id;
  end if;

  select
    quotation_option_id,
    purchase_amount,
    purchase_currency,
    sale_amount,
    sale_currency
  into previous_option_id, current_purchase_amount, current_purchase_currency, current_sale_amount, current_sale_currency
  from quotation_costs
  where id = p_id;

  select
    q.created_by,
    q.pricing_owner_id,
    q.client_id
  into quotation_created_by, quotation_pricing_owner_id, quotation_client_id
  from quotations q
  where q.id = quotation_id_value;

  can_edit_pricing := public.erp_has_resource_access(
    'pricing.quotations.cost_section',
    'edit',
    quotation_pricing_owner_id,
    null
  );

  can_edit_sales := public.erp_can_access_crm_quotation_resource(
    'crm.quotations.customer_actions',
    'edit',
    quotation_created_by,
    quotation_client_id
  );

  if not can_edit_pricing and not can_edit_sales then
    raise exception 'You do not have permission to update quotation costs'
      using errcode = '42501';
  end if;

  if not can_edit_pricing and (
    p_purchase_amount is not null
    or p_provider_id is not null
    or p_sales_accounting_concept_id is not null
    or p_vat_rate is not null
    or p_notes is not null
  ) then
    raise exception 'You do not have permission to edit purchase-side quotation costs'
      using errcode = '42501';
  end if;

  if p_purchase_amount is not null and not public.erp_can_edit_quotation_purchase_amount() then
    raise exception 'You do not have permission to edit quotation cost'
      using errcode = '42501';
  end if;

  if p_sale_amount is not null and not can_edit_sales then
    raise exception 'You do not have permission to edit quotation sale price'
      using errcode = '42501';
  end if;

  if p_sale_amount is not null and not public.erp_can_edit_quotation_sale_price() then
    raise exception 'You do not have permission to edit quotation sale price'
      using errcode = '42501';
  end if;

  if p_sales_accounting_concept_id is not null then
    select *
    into concept_row
    from sales_accounting_concepts
    where id = p_sales_accounting_concept_id;

    if not found then
      raise exception 'Sales accounting concept % not found', p_sales_accounting_concept_id;
    end if;
  end if;

  normalized_purchase_currency := coalesce(
    case when p_purchase_currency is null then null else public.normalize_currency_code(p_purchase_currency) end,
    current_purchase_currency,
    'MXN'
  );
  normalized_sale_currency := coalesce(
    case when p_sale_currency is null then null else public.normalize_currency_code(p_sale_currency) end,
    current_sale_currency,
    normalized_purchase_currency,
    'MXN'
  );

  if p_quotation_option_id is not null or nullif(btrim(coalesce(p_option_label, '')), '') is not null then
    select *
    into resolved_option
    from public.ensure_quotation_option(
      p_quotation_id => quotation_id_value,
      p_quotation_option_id => p_quotation_option_id,
      p_option_label => p_option_label
    );
  end if;

  update quotation_costs
  set
    quotation_option_id = coalesce(resolved_option.id, quotation_option_id),
    option_label = coalesce(resolved_option.option_label, option_label),
    provider_id = p_provider_id,
    sales_accounting_concept_id = p_sales_accounting_concept_id,
    service_name = coalesce(concept_row.concept, service_name),
    cost = coalesce(p_purchase_amount, cost),
    purchase_amount = coalesce(p_purchase_amount, purchase_amount),
    purchase_currency = normalized_purchase_currency,
    purchase_exchange_rate_to_mxn = null,
    purchase_amount_mxn = null,
    sale_amount = coalesce(p_sale_amount, sale_amount),
    sale_currency = normalized_sale_currency,
    sale_exchange_rate_to_mxn = null,
    sale_amount_mxn = null,
    profit_amount = case
      when coalesce(p_sale_amount, current_sale_amount) is null
        or coalesce(p_purchase_amount, current_purchase_amount) is null then null
      else coalesce(p_sale_amount, current_sale_amount) - coalesce(p_purchase_amount, current_purchase_amount)
    end,
    profit_amount_mxn = null,
    vat_rate = coalesce(p_vat_rate, concept_row.vat_rate, vat_rate),
    notes = nullif(btrim(coalesce(p_notes, '')), '')
  where id = p_id;

  if previous_option_id is not null
    and previous_option_id <> coalesce(resolved_option.id, previous_option_id)
    and not exists (
      select 1
      from quotation_costs qc
      where qc.quotation_option_id = previous_option_id
    ) then
    delete from quotation_options
    where id = previous_option_id;
  end if;

  if p_purchase_valid_until is not null then
    perform public.update_quotation_option_validity(
      p_quotation_option_id => coalesce(resolved_option.id, previous_option_id),
      p_purchase_valid_until => p_purchase_valid_until,
      p_sales_valid_until => null,
      p_override_sales_valid_until => false
    );
  end if;

  perform public.refresh_quotation_cost_line_mxn(quotation_id_value, current_date);
  perform recalculate_quotation_totals(quotation_id_value);
end;
$$;

create or replace function save_quotation_purchase_option(
  p_quotation_id uuid,
  p_quotation_option_id uuid default null,
  p_option_label text default null,
  p_purchase_valid_until date default null,
  p_lines jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_pricing_owner_id uuid;
  quotation_status text;
  resolved_option record;
  line_item jsonb;
  line_id uuid;
  concept_row sales_accounting_concepts%rowtype;
  normalized_purchase_currency text;
  current_sale_amount numeric;
  current_sale_currency text;
  saved_line_id uuid;
  kept_ids uuid[] := array[]::uuid[];
begin
  select
    q.pricing_owner_id,
    q.status
  into quotation_pricing_owner_id, quotation_status
  from quotations q
  where q.id = p_quotation_id;

  if quotation_status is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  if not public.erp_has_resource_access(
    'pricing.quotations.cost_section',
    case when p_quotation_option_id is null then 'create' else 'edit' end,
    quotation_pricing_owner_id,
    null
  ) then
    raise exception 'You do not have permission to save quotation purchase options'
      using errcode = '42501';
  end if;

  if not public.erp_can_edit_quotation_purchase_amount() then
    raise exception 'You do not have permission to edit quotation cost'
      using errcode = '42501';
  end if;

  if jsonb_typeof(coalesce(p_lines, '[]'::jsonb)) <> 'array' then
    raise exception 'p_lines must be a JSON array';
  end if;

  if jsonb_array_length(coalesce(p_lines, '[]'::jsonb)) = 0 then
    raise exception 'At least one purchase line is required';
  end if;

  select *
  into resolved_option
  from public.ensure_quotation_option(
    p_quotation_id => p_quotation_id,
    p_quotation_option_id => p_quotation_option_id,
    p_option_label => p_option_label
  );

  for line_item in
    select value
    from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  loop
    line_id := null;
    concept_row := null;
    current_sale_amount := null;
    current_sale_currency := null;

    if nullif(btrim(coalesce(line_item ->> 'id', '')), '') is not null then
      line_id := (line_item ->> 'id')::uuid;
    end if;

    if nullif(btrim(coalesce(line_item ->> 'provider_id', '')), '') is null then
      raise exception 'Each purchase line must include provider_id';
    end if;

    if nullif(btrim(coalesce(line_item ->> 'sales_accounting_concept_id', '')), '') is null then
      raise exception 'Each purchase line must include sales_accounting_concept_id';
    end if;

    select *
    into concept_row
    from sales_accounting_concepts
    where id = (line_item ->> 'sales_accounting_concept_id')::uuid;

    if not found then
      raise exception 'Sales accounting concept % not found', line_item ->> 'sales_accounting_concept_id';
    end if;

    normalized_purchase_currency := public.normalize_currency_code(
      coalesce(line_item ->> 'purchase_currency', 'MXN')
    );

    if line_id is null then
      insert into quotation_costs (
        quotation_id,
        quotation_option_id,
        option_label,
        provider_id,
        sales_accounting_concept_id,
        service_name,
        cost,
        purchase_amount,
        purchase_currency,
        purchase_exchange_rate_to_mxn,
        purchase_amount_mxn,
        sale_amount,
        sale_currency,
        sale_exchange_rate_to_mxn,
        sale_amount_mxn,
        profit_amount,
        profit_amount_mxn,
        vat_rate,
        notes
      )
      values (
        p_quotation_id,
        resolved_option.id,
        resolved_option.option_label,
        (line_item ->> 'provider_id')::uuid,
        (line_item ->> 'sales_accounting_concept_id')::uuid,
        coalesce(concept_row.concept, 'Cargo'),
        coalesce((line_item ->> 'purchase_amount')::numeric, 0),
        (line_item ->> 'purchase_amount')::numeric,
        normalized_purchase_currency,
        null,
        null,
        null,
        normalized_purchase_currency,
        null,
        null,
        null,
        null,
        coalesce((line_item ->> 'vat_rate')::numeric, concept_row.vat_rate, 0),
        nullif(btrim(coalesce(line_item ->> 'notes', '')), '')
      )
      returning id into saved_line_id;
    else
      select
        qc.sale_amount,
        qc.sale_currency
      into current_sale_amount, current_sale_currency
      from quotation_costs qc
      where qc.id = line_id
        and qc.quotation_id = p_quotation_id;

      if not found then
        raise exception 'Quotation cost line % not found for quotation %', line_id, p_quotation_id;
      end if;

      update quotation_costs
      set
        quotation_option_id = resolved_option.id,
        option_label = resolved_option.option_label,
        provider_id = (line_item ->> 'provider_id')::uuid,
        sales_accounting_concept_id = (line_item ->> 'sales_accounting_concept_id')::uuid,
        service_name = coalesce(concept_row.concept, service_name),
        cost = coalesce((line_item ->> 'purchase_amount')::numeric, 0),
        purchase_amount = (line_item ->> 'purchase_amount')::numeric,
        purchase_currency = normalized_purchase_currency,
        purchase_exchange_rate_to_mxn = null,
        purchase_amount_mxn = null,
        sale_amount = current_sale_amount,
        sale_currency = coalesce(current_sale_currency, normalized_purchase_currency),
        sale_exchange_rate_to_mxn = null,
        sale_amount_mxn = null,
        profit_amount = case
          when current_sale_amount is null or (line_item ->> 'purchase_amount')::numeric is null then null
          else current_sale_amount - (line_item ->> 'purchase_amount')::numeric
        end,
        profit_amount_mxn = null,
        vat_rate = coalesce((line_item ->> 'vat_rate')::numeric, concept_row.vat_rate, 0),
        notes = nullif(btrim(coalesce(line_item ->> 'notes', '')), '')
      where id = line_id;

      saved_line_id := line_id;
    end if;

    kept_ids := array_append(kept_ids, saved_line_id);
  end loop;

  if p_quotation_option_id is not null then
    delete from quotation_costs qc
    where qc.quotation_option_id = resolved_option.id
      and not (qc.id = any(kept_ids));
  end if;

  if p_purchase_valid_until is not null then
    perform public.update_quotation_option_validity(
      p_quotation_option_id => resolved_option.id,
      p_purchase_valid_until => p_purchase_valid_until,
      p_sales_valid_until => null,
      p_override_sales_valid_until => false
    );
  end if;

  perform public.refresh_quotation_cost_line_mxn(p_quotation_id, current_date);
  perform public.recalculate_quotation_totals(p_quotation_id);

  return resolved_option.id;
end;
$$;

create or replace function update_quotation_option_sales_amounts(
  p_quotation_id uuid,
  p_quotation_option_id uuid,
  p_sales_amounts jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from quotations q
    where q.id = p_quotation_id
      and public.erp_can_access_crm_quotation_resource(
        'crm.quotations.customer_actions',
        'edit',
        q.created_by,
        q.client_id
      )
  ) then
    raise exception 'You do not have permission to edit sale amounts for this quotation'
      using errcode = '42501';
  end if;

  if not public.erp_can_edit_quotation_sale_price() then
    raise exception 'You do not have permission to edit quotation sale price'
      using errcode = '42501';
  end if;

  if p_sales_amounts is null or jsonb_typeof(p_sales_amounts) <> 'object' then
    raise exception 'Sales amounts payload must be a JSON object keyed by quotation cost line id';
  end if;

  update quotation_costs qc
  set
    sale_amount = updates.sale_amount,
    sale_currency = updates.sale_currency,
    sale_exchange_rate_to_mxn = null,
    sale_amount_mxn = null,
    profit_amount = case
      when updates.sale_amount is null or qc.purchase_amount is null then null
      else updates.sale_amount - qc.purchase_amount
    end,
    profit_amount_mxn = null
  from (
    select
      key::uuid as line_id,
      case
        when jsonb_typeof(value) = 'object' then nullif(btrim(value ->> 'sale_amount'), '')::numeric
        else nullif(btrim(trim(both '"' from value::text)), '')::numeric
      end as sale_amount,
      coalesce(
        case
          when jsonb_typeof(value) = 'object' then public.normalize_currency_code(value ->> 'sale_currency')
          else null
        end,
        qc_existing.sale_currency,
        qc_existing.purchase_currency,
        'MXN'
      ) as sale_currency
    from jsonb_each(p_sales_amounts)
    join quotation_costs qc_existing
      on qc_existing.id = key::uuid
  ) as updates
  where qc.id = updates.line_id
    and qc.quotation_id = p_quotation_id
    and qc.quotation_option_id = p_quotation_option_id;

  perform public.refresh_quotation_cost_line_mxn(p_quotation_id, current_date);
  perform recalculate_quotation_totals(p_quotation_id);
end;
$$;

create or replace function delete_quotation_cost_line(
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_id_value uuid;
  quotation_pricing_owner_id uuid;
  quotation_option_id_value uuid;
begin
  select
    quotation_id,
    quotation_option_id
  into quotation_id_value
    , quotation_option_id_value
  from quotation_costs
  where id = p_id;

  select q.pricing_owner_id
  into quotation_pricing_owner_id
  from quotations q
  where q.id = quotation_id_value;

  if quotation_id_value is null then
    raise exception 'Quotation cost line % not found', p_id;
  end if;

  if not public.erp_has_resource_access(
    'pricing.quotations.cost_section',
    'delete',
    quotation_pricing_owner_id,
    null
  ) then
    raise exception 'You do not have permission to delete quotation costs'
      using errcode = '42501';
  end if;

  delete from quotation_costs
  where id = p_id;

  if quotation_option_id_value is not null and not exists (
    select 1
    from quotation_costs qc
    where qc.quotation_option_id = quotation_option_id_value
  ) then
    delete from quotation_options
    where id = quotation_option_id_value;
  end if;

  if quotation_id_value is not null then
    perform public.refresh_quotation_cost_line_mxn(quotation_id_value, current_date);
    perform recalculate_quotation_totals(quotation_id_value);
  end if;
end;
$$;

create or replace function create_quotation_cargo_line(
  p_quotation_id uuid,
  p_load_type text,
  p_commodities text default null,
  p_piece_count integer default null,
  p_width numeric default null,
  p_length numeric default null,
  p_height numeric default null,
  p_weight numeric default null,
  p_freight_class text default null,
  p_cbm numeric default null,
  p_volumetric_weight_kg numeric default null,
  p_sort_order integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  quotation_created_by uuid;
  quotation_client_id uuid;
begin
  select
    q.created_by,
    q.client_id
  into quotation_created_by, quotation_client_id
  from quotations q
  where q.id = p_quotation_id;

  if quotation_client_id is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  if not public.erp_can_access_crm_quotation_resource(
    'crm.quotations.record',
    'edit',
    quotation_created_by,
    quotation_client_id
  ) then
    raise exception 'You do not have permission to edit quotation cargo lines'
      using errcode = '42501';
  end if;

  insert into quotation_cargo_lines (
    quotation_id,
    load_type,
    commodities,
    piece_count,
    width,
    length,
    height,
    weight,
    freight_class,
    cbm,
    volumetric_weight_kg,
    sort_order
  )
  values (
    p_quotation_id,
    nullif(btrim(coalesce(p_load_type, '')), ''),
    nullif(btrim(coalesce(p_commodities, '')), ''),
    p_piece_count,
    p_width,
    p_length,
    p_height,
    p_weight,
    nullif(btrim(coalesce(p_freight_class, '')), ''),
    p_cbm,
    p_volumetric_weight_kg,
    coalesce(p_sort_order, 1)
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function update_quotation_cargo_line(
  p_id uuid,
  p_load_type text,
  p_commodities text default null,
  p_piece_count integer default null,
  p_width numeric default null,
  p_length numeric default null,
  p_height numeric default null,
  p_weight numeric default null,
  p_freight_class text default null,
  p_cbm numeric default null,
  p_volumetric_weight_kg numeric default null,
  p_sort_order integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_created_by uuid;
  quotation_client_id uuid;
begin
  select
    q.created_by,
    q.client_id
  into quotation_created_by, quotation_client_id
  from quotations q
  join quotation_cargo_lines qcl on qcl.quotation_id = q.id
  where qcl.id = p_id;

  if quotation_client_id is null then
    raise exception 'Quotation cargo line % not found', p_id;
  end if;

  if not public.erp_can_access_crm_quotation_resource(
    'crm.quotations.record',
    'edit',
    quotation_created_by,
    quotation_client_id
  ) then
    raise exception 'You do not have permission to edit quotation cargo lines'
      using errcode = '42501';
  end if;

  update quotation_cargo_lines
  set
    load_type = nullif(btrim(coalesce(p_load_type, '')), ''),
    commodities = nullif(btrim(coalesce(p_commodities, '')), ''),
    piece_count = p_piece_count,
    width = p_width,
    length = p_length,
    height = p_height,
    weight = p_weight,
    freight_class = nullif(btrim(coalesce(p_freight_class, '')), ''),
    cbm = p_cbm,
    volumetric_weight_kg = p_volumetric_weight_kg,
    sort_order = coalesce(p_sort_order, 1)
  where id = p_id;
end;
$$;

create or replace function delete_quotation_cargo_line(
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_created_by uuid;
  quotation_client_id uuid;
begin
  select
    q.created_by,
    q.client_id
  into quotation_created_by, quotation_client_id
  from quotations q
  join quotation_cargo_lines qcl on qcl.quotation_id = q.id
  where qcl.id = p_id;

  if quotation_client_id is null then
    raise exception 'Quotation cargo line % not found', p_id;
  end if;

  if not public.erp_can_access_crm_quotation_resource(
    'crm.quotations.record',
    'edit',
    quotation_created_by,
    quotation_client_id
  ) then
    raise exception 'You do not have permission to delete quotation cargo lines'
      using errcode = '42501';
  end if;

  delete from quotation_cargo_lines
  where id = p_id;
end;
$$;

create or replace function create_booking_from_quotation(
  p_quotation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status text;
  quotation_created_by uuid;
  quotation_client_id uuid;
  shipment_id uuid;
begin
  select
    q.status,
    q.created_by,
    q.client_id
  into current_status, quotation_created_by, quotation_client_id
  from quotations
  where id = p_quotation_id;

  if current_status is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  if not public.erp_has_resource_access('crm.quotations', 'create_booking')
    or not public.erp_can_access_crm_quotation_resource(
      'crm.quotations.customer_actions',
      'edit',
      quotation_created_by,
      quotation_client_id
    ) then
    raise exception 'You do not have permission to create a booking from this quotation'
      using errcode = '42501';
  end if;

  if current_status <> 'aceptada' then
    raise exception 'Quotation % must be aceptada before booking', p_quotation_id;
  end if;

  shipment_id := create_shipment(p_quotation_id);
  return shipment_id;
end;
$$;

create or replace function create_quotation_rejection_reason(
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into quotation_rejection_reasons (
    reason
  )
  values (
    nullif(btrim(coalesce(p_reason, '')), '')
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function update_quotation_rejection_reason(
  p_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update quotation_rejection_reasons
  set reason = nullif(btrim(coalesce(p_reason, '')), '')
  where id = p_id;
end;
$$;

create or replace function delete_quotation_rejection_reason(
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from quotation_rejection_reasons
  where id = p_id;
end;
$$;


-- =========================================
-- 7. CREATE SHIPMENT
-- =========================================

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


-- =========================================
-- 8. UPDATE SHIPMENT STATUS
-- =========================================

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


-- =========================================
-- 9. MARK SHIPMENT DELIVERED
-- =========================================

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


-- =========================================
-- 10. GET FULL CLIENT DATA
-- =========================================

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
  if not public.erp_can_access_client_resource(
    'crm.clients.record',
    'view',
    p_client_id
  ) then
    return null;
  end if;

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
    'logistics_parties', coalesce(
      (
        select jsonb_agg(to_jsonb(clp) order by clp.created_at desc)
        from client_logistics_parties clp
        where clp.client_id = c.id
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


-- =========================================
-- 11. SOFT DELETE CLIENT
-- =========================================

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


-- =========================================
-- 12. SEARCH CLIENTS
-- =========================================

create or replace function search_clients(
  p_query text
)
returns setof clients
language sql
security definer
as $$
  with params as (
    select
      nullif(lower(btrim(p_query)), '') as normalized_query
  )
  select c.*
  from clients c
  cross join params p
  where c.is_deleted = false
    and public.erp_can_access_client_resource(
      'crm.clients.list',
      'view',
      c.id
    )
    and (
      p.normalized_query is null
      or c.search_text ilike '%' || p.normalized_query || '%'
      or lower(c.company_name) like p.normalized_query || '%'
      or lower(coalesce(c.website, '')) like p.normalized_query || '%'
      or lower(coalesce(c.tax_id, '')) = p.normalized_query
      or lower(coalesce(c.city_unlocode, '')) = p.normalized_query
    )
  order by
    case
      when p.normalized_query is null then 0
      when lower(c.company_name) = p.normalized_query then 1000
      when lower(coalesce(c.tax_id, '')) = p.normalized_query then 950
      when lower(coalesce(c.city_unlocode, '')) = p.normalized_query then 925
      when lower(c.company_name) like p.normalized_query || '%' then 900
      when lower(coalesce(c.website, '')) like p.normalized_query || '%' then 800
      when lower(coalesce(c.city, '')) like p.normalized_query || '%' then 750
      when lower(coalesce(c.country, '')) like p.normalized_query || '%' then 700
      else greatest(
        similarity(c.search_text, p.normalized_query),
        similarity(lower(c.company_name), p.normalized_query)
      ) * 100
    end desc,
    c.company_name asc;
$$;


-- =========================================
-- 13. SEARCH UN/LOCODES
-- =========================================

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
  with params as (
    select
      nullif(lower(btrim(p_query)), '') as normalized_query,
      nullif(upper(btrim(p_query)), '') as normalized_code,
      nullif(upper(btrim(p_country_code)), '') as normalized_country_code,
      nullif(btrim(p_function_classifier), '') as normalized_function_classifier,
      char_length(nullif(lower(btrim(p_query)), '')) as normalized_query_length
  )
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
  cross join params p
  where (
    p.normalized_query is null
    or u.search_text ilike '%' || p.normalized_query || '%'
    or u.unlocode = p.normalized_code
  )
    and (
      p.normalized_country_code is null
      or u.country_code = p.normalized_country_code
    )
    and (
      p.normalized_function_classifier is null
      or coalesce(u.function_classifier, '') like '%' || p.normalized_function_classifier || '%'
    )
  order by
    case
      when p.normalized_query is null then 0
      when u.unlocode = p.normalized_code then 1000
      when u.unlocode like p.normalized_code || '%' then 900
      when lower(u.name) like p.normalized_query || '%' then 800
      when lower(coalesce(u.name_without_diacritics, '')) like p.normalized_query || '%' then 775
      when lower(coalesce(u.country_name, '')) like p.normalized_query || '%' then 650
      when lower(coalesce(u.iata_code, '')) = p.normalized_query then 625
      when coalesce(p.normalized_query_length, 0) < 4 then 0
      else greatest(
        similarity(u.search_text, p.normalized_query),
        similarity(lower(coalesce(u.name_without_diacritics, '')), p.normalized_query),
        similarity(lower(coalesce(u.name, '')), p.normalized_query)
      ) * 100
    end desc,
    u.country_code asc,
    u.name asc,
    u.location_code asc
  limit least(greatest(coalesce(p_limit, 50), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
$$;


-- =========================================
-- ADMIN PERMISSION UPSERT HELPERS
-- =========================================

create or replace function upsert_role_resource_permission(
  p_role_id uuid,
  p_resource_id uuid,
  p_action_id uuid,
  p_condition_id uuid,
  p_allowed boolean
)
returns void
language plpgsql
security definer
as $$
begin
  if not public.erp_is_admin() then
    raise exception 'Only admins can update role resource permissions';
  end if;

  insert into public.role_resource_permissions (
    role_id,
    resource_id,
    action_id,
    condition_id,
    allowed
  )
  values (
    p_role_id,
    p_resource_id,
    p_action_id,
    p_condition_id,
    p_allowed
  )
  on conflict (role_id, resource_id, action_id)
  do update set
    condition_id = excluded.condition_id,
    allowed = excluded.allowed;
end;
$$;

create or replace function upsert_role_field_permission(
  p_role_id uuid,
  p_field_id uuid,
  p_action_id uuid,
  p_condition_id uuid,
  p_allowed boolean
)
returns void
language plpgsql
security definer
as $$
begin
  if not public.erp_is_admin() then
    raise exception 'Only admins can update role field permissions';
  end if;

  insert into public.role_field_permissions (
    role_id,
    field_id,
    action_id,
    condition_id,
    allowed
  )
  values (
    p_role_id,
    p_field_id,
    p_action_id,
    p_condition_id,
    p_allowed
  )
  on conflict (role_id, field_id, action_id)
  do update set
    condition_id = excluded.condition_id,
    allowed = excluded.allowed;
end;
$$;


-- =========================================
-- 14. CREATE SERVICE TRANSPORT TYPE
-- =========================================

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


-- =========================================
-- 15. UPDATE SERVICE TRANSPORT TYPE
-- =========================================

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


-- =========================================
-- 16. DELETE SERVICE TRANSPORT TYPE
-- =========================================

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


-- =========================================
-- 17. CREATE SALES ACCOUNTING CONCEPT
-- =========================================

create or replace function create_sales_accounting_concept(
  p_concept text,
  p_service_type text,
  p_operation_type text,
  p_vat_rate numeric,
  p_sat_code text
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_record_id uuid;
begin
  insert into sales_accounting_concepts (
    concept,
    service_type,
    operation_type,
    vat_rate,
    sat_code
  )
  values (
    nullif(btrim(p_concept), ''),
    upper(nullif(btrim(p_service_type), '')),
    upper(nullif(btrim(p_operation_type), '')),
    coalesce(p_vat_rate, 0),
    upper(nullif(btrim(p_sat_code), ''))
  )
  returning id into new_record_id;

  return new_record_id;
end;
$$;


-- =========================================
-- 18. UPDATE SALES ACCOUNTING CONCEPT
-- =========================================

create or replace function update_sales_accounting_concept(
  p_id uuid,
  p_concept text,
  p_service_type text,
  p_operation_type text,
  p_vat_rate numeric,
  p_sat_code text
)
returns void
language plpgsql
security definer
as $$
begin
  update sales_accounting_concepts
  set
    concept = nullif(btrim(p_concept), ''),
    service_type = upper(nullif(btrim(p_service_type), '')),
    operation_type = upper(nullif(btrim(p_operation_type), '')),
    vat_rate = coalesce(p_vat_rate, 0),
    sat_code = upper(nullif(btrim(p_sat_code), ''))
  where id = p_id;
end;
$$;


-- =========================================
-- 19. DELETE SALES ACCOUNTING CONCEPT
-- =========================================

create or replace function delete_sales_accounting_concept(
  p_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  delete from sales_accounting_concepts
  where id = p_id;
end;
$$;


-- =========================================
-- 19.5 CREATE EXCHANGE RATE
-- =========================================

create or replace function create_exchange_rate(
  p_rate_date date,
  p_base_currency text,
  p_rate_value numeric,
  p_quote_currency text default 'MXN',
  p_source text default 'BANXICO',
  p_source_series_code text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_record_id uuid;
begin
  insert into exchange_rates (
    rate_date,
    base_currency,
    quote_currency,
    rate_value,
    source,
    source_series_code
  )
  values (
    p_rate_date,
    public.normalize_currency_code(p_base_currency),
    public.normalize_currency_code(coalesce(p_quote_currency, 'MXN')),
    p_rate_value,
    upper(nullif(btrim(coalesce(p_source, 'BANXICO')), '')),
    nullif(upper(btrim(coalesce(p_source_series_code, ''))), '')
  )
  returning id into new_record_id;

  return new_record_id;
end;
$$;


-- =========================================
-- 19.6 UPDATE EXCHANGE RATE
-- =========================================

create or replace function update_exchange_rate(
  p_id uuid,
  p_rate_date date,
  p_base_currency text,
  p_quote_currency text,
  p_rate_value numeric,
  p_source text,
  p_source_series_code text default null
)
returns void
language plpgsql
security definer
as $$
begin
  update exchange_rates
  set
    rate_date = p_rate_date,
    base_currency = public.normalize_currency_code(p_base_currency),
    quote_currency = public.normalize_currency_code(coalesce(p_quote_currency, 'MXN')),
    rate_value = p_rate_value,
    source = upper(nullif(btrim(coalesce(p_source, 'BANXICO')), '')),
    source_series_code = nullif(upper(btrim(coalesce(p_source_series_code, ''))), '')
  where id = p_id;
end;
$$;


-- =========================================
-- 19.7 DELETE EXCHANGE RATE
-- =========================================

create or replace function delete_exchange_rate(
  p_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  delete from exchange_rates
  where id = p_id;
end;
$$;


-- =========================================
-- 20. CREATE PROVIDER
-- =========================================

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


-- =========================================
-- 18. ADD CONTACT TO PROVIDER
-- =========================================

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


-- =========================================
-- 19. GET PROVIDER FULL
-- =========================================

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


-- =========================================
-- 20. SEARCH PROVIDERS
-- =========================================

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

create or replace function delete_client_record(
  p_client_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  perform soft_delete_client(p_client_id);
  return p_client_id;
end;
$$;

create or replace function purge_ephemeral_client_record(
  p_client_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  client_name text;
begin
  select company_name
  into client_name
  from clients
  where id = p_client_id
  for update;

  if client_name is null then
    raise exception 'Client % not found', p_client_id;
  end if;

  if not (
    client_name ilike 'TEST_%'
    or client_name ilike 'LOADTEST_%'
    or client_name ilike 'QA_%'
    or client_name ilike 'STRESS_%'
    or client_name ilike 'PURGED_TEST_CLIENT_%'
  ) then
    raise exception 'Client % is not marked as ephemeral test data', p_client_id;
  end if;

  perform set_config('app.allow_test_hard_delete', 'on', true);

  delete from clients
  where id = p_client_id;

  return p_client_id;
end;
$$;

create or replace function update_client_record(
  p_client_id uuid,
  p_changes jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_id uuid;
begin
  update clients
  set
    company_name = case
      when p_changes ? 'company_name' then nullif(btrim(coalesce(p_changes->>'company_name', '')), '')
      else company_name
    end,
    account_owner_id = case
      when p_changes ? 'account_owner_id' then (p_changes->>'account_owner_id')::uuid
      else account_owner_id
    end,
    country = case
      when p_changes ? 'country' then nullif(btrim(coalesce(p_changes->>'country', '')), '')
      else country
    end,
    industry = case
      when p_changes ? 'industry' then nullif(btrim(coalesce(p_changes->>'industry', '')), '')
      else industry
    end,
    website = case
      when p_changes ? 'website' then nullif(btrim(coalesce(p_changes->>'website', '')), '')
      else website
    end,
    corporate_phone = case
      when p_changes ? 'corporate_phone' then nullif(btrim(coalesce(p_changes->>'corporate_phone', '')), '')
      else corporate_phone
    end,
    status = case
      when p_changes ? 'status' then nullif(btrim(coalesce(p_changes->>'status', '')), '')
      else status
    end,
    full_address = case
      when p_changes ? 'full_address' then nullif(btrim(coalesce(p_changes->>'full_address', '')), '')
      else full_address
    end,
    postal_code = case
      when p_changes ? 'postal_code' then nullif(btrim(coalesce(p_changes->>'postal_code', '')), '')
      else postal_code
    end,
    city = case
      when p_changes ? 'city' then nullif(btrim(coalesce(p_changes->>'city', '')), '')
      else city
    end,
    city_unlocode = case
      when p_changes ? 'city_unlocode' then nullif(upper(btrim(coalesce(p_changes->>'city_unlocode', ''))), '')
      else city_unlocode
    end,
    tax_id = case
      when p_changes ? 'tax_id' then nullif(btrim(coalesce(p_changes->>'tax_id', '')), '')
      else tax_id
    end
  where id = p_client_id
  returning id into updated_id;

  if updated_id is null then
    raise exception 'Client % not found', p_client_id;
  end if;

  return updated_id;
end;
$$;

create or replace function update_contact_record(
  p_contact_id uuid,
  p_changes jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text;
  updated_id uuid;
begin
  if p_changes ? 'name' then
    normalized_name := nullif(btrim(coalesce(p_changes->>'name', '')), '');
    if normalized_name is null then
      raise exception 'Contact name is required';
    end if;
  end if;

  update contacts
  set
    name = case when p_changes ? 'name' then normalized_name else name end,
    email = case
      when p_changes ? 'email' then nullif(btrim(coalesce(p_changes->>'email', '')), '')
      else email
    end,
    phone = case
      when p_changes ? 'phone' then nullif(btrim(coalesce(p_changes->>'phone', '')), '')
      else phone
    end,
    linkedin_url = case
      when p_changes ? 'linkedin_url' then nullif(btrim(coalesce(p_changes->>'linkedin_url', '')), '')
      else linkedin_url
    end,
    position = case
      when p_changes ? 'position' then nullif(btrim(coalesce(p_changes->>'position', '')), '')
      else position
    end,
    status = case
      when p_changes ? 'status' then coalesce(nullif(btrim(coalesce(p_changes->>'status', '')), ''), 'activo')
      else status
    end,
    is_primary = case
      when p_changes ? 'is_primary' then coalesce((p_changes->>'is_primary')::boolean, false)
      else is_primary
    end
  where id = p_contact_id
  returning id into updated_id;

  if updated_id is null then
    raise exception 'Contact % not found', p_contact_id;
  end if;

  return updated_id;
end;
$$;

create or replace function delete_contact_record(
  p_contact_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from contacts
  where id = p_contact_id;
end;
$$;

create or replace function update_opportunity_record(
  p_opportunity_id uuid,
  p_changes jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_id uuid;
begin
  update opportunities
  set
    client_id = case
      when p_changes ? 'client_id' then (p_changes->>'client_id')::uuid
      else client_id
    end,
    salesperson_id = case
      when p_changes ? 'salesperson_id' then (p_changes->>'salesperson_id')::uuid
      else salesperson_id
    end,
    title = case
      when p_changes ? 'title' then coalesce(nullif(btrim(coalesce(p_changes->>'title', '')), ''), 'Opportunity')
      else title
    end,
    description = case
      when p_changes ? 'description' then nullif(btrim(coalesce(p_changes->>'description', '')), '')
      else description
    end,
    service_type = case
      when p_changes ? 'service_type' then nullif(btrim(coalesce(p_changes->>'service_type', '')), '')
      else service_type
    end,
    transport_type = case
      when p_changes ? 'transport_type' then nullif(btrim(coalesce(p_changes->>'transport_type', '')), '')
      else transport_type
    end,
    operation_type = case
      when p_changes ? 'operation_type' then nullif(btrim(coalesce(p_changes->>'operation_type', '')), '')
      else operation_type
    end,
    incoterm_id = case
      when p_changes ? 'incoterm_id' then (p_changes->>'incoterm_id')::uuid
      else incoterm_id
    end,
    origin = case
      when p_changes ? 'origin' then nullif(btrim(coalesce(p_changes->>'origin', '')), '')
      else origin
    end,
    origin_unlocode = case
      when p_changes ? 'origin_unlocode' then nullif(upper(btrim(coalesce(p_changes->>'origin_unlocode', ''))), '')
      else origin_unlocode
    end,
    destination = case
      when p_changes ? 'destination' then nullif(btrim(coalesce(p_changes->>'destination', '')), '')
      else destination
    end,
    destination_unlocode = case
      when p_changes ? 'destination_unlocode' then nullif(upper(btrim(coalesce(p_changes->>'destination_unlocode', ''))), '')
      else destination_unlocode
    end,
    expected_profit_usd = case
      when p_changes ? 'expected_profit_usd' then (p_changes->>'expected_profit_usd')::numeric
      else expected_profit_usd
    end,
    service_quantity = case
      when p_changes ? 'service_quantity' then (p_changes->>'service_quantity')::integer
      else service_quantity
    end,
    estimated_value = case
      when p_changes ? 'estimated_value' then (p_changes->>'estimated_value')::numeric
      else estimated_value
    end
  where id = p_opportunity_id
  returning id into updated_id;

  if updated_id is null then
    raise exception 'Opportunity % not found', p_opportunity_id;
  end if;

  return updated_id;
end;
$$;

create or replace function delete_opportunity_record(
  p_opportunity_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from opportunities
  where id = p_opportunity_id;
end;
$$;

create or replace function update_quotation_record(
  p_quotation_id uuid,
  p_changes jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_id uuid;
begin
  update quotations
  set
    pickup_address = case
      when p_changes ? 'pickup_address' then nullif(btrim(coalesce(p_changes->>'pickup_address', '')), '')
      else pickup_address
    end,
    delivery_address = case
      when p_changes ? 'delivery_address' then nullif(btrim(coalesce(p_changes->>'delivery_address', '')), '')
      else delivery_address
    end,
    required_quote_date = case
      when p_changes ? 'required_quote_date' then (p_changes->>'required_quote_date')::date
      else required_quote_date
    end,
    target_rate = case
      when p_changes ? 'target_rate' then (p_changes->>'target_rate')::numeric
      else target_rate
    end,
    rejection_reason_id = case
      when p_changes ? 'rejection_reason_id' then (p_changes->>'rejection_reason_id')::uuid
      else rejection_reason_id
    end,
    rejection_notes = case
      when p_changes ? 'rejection_notes' then nullif(btrim(coalesce(p_changes->>'rejection_notes', '')), '')
      else rejection_notes
    end,
    cancellation_notes = case
      when p_changes ? 'cancellation_notes' then nullif(btrim(coalesce(p_changes->>'cancellation_notes', '')), '')
      else cancellation_notes
    end
  where id = p_quotation_id
  returning id into updated_id;

  if updated_id is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  return updated_id;
end;
$$;

create or replace function update_provider_record(
  p_provider_id uuid,
  p_changes jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text;
  updated_id uuid;
begin
  if p_changes ? 'name' then
    normalized_name := nullif(btrim(coalesce(p_changes->>'name', '')), '');
    if normalized_name is null then
      raise exception 'Provider name is required';
    end if;
  end if;

  update providers
  set
    name = case when p_changes ? 'name' then normalized_name else name end,
    tax_id = case
      when p_changes ? 'tax_id' then nullif(btrim(coalesce(p_changes->>'tax_id', '')), '')
      else tax_id
    end,
    provider_type = case
      when p_changes ? 'provider_type' then nullif(btrim(coalesce(p_changes->>'provider_type', '')), '')
      else provider_type
    end,
    corporate_phone = case
      when p_changes ? 'corporate_phone' then nullif(btrim(coalesce(p_changes->>'corporate_phone', '')), '')
      else corporate_phone
    end,
    company_email = case
      when p_changes ? 'company_email' then nullif(btrim(coalesce(p_changes->>'company_email', '')), '')
      else company_email
    end,
    website = case
      when p_changes ? 'website' then nullif(btrim(coalesce(p_changes->>'website', '')), '')
      else website
    end,
    full_address = case
      when p_changes ? 'full_address' then nullif(btrim(coalesce(p_changes->>'full_address', '')), '')
      else full_address
    end,
    postal_code = case
      when p_changes ? 'postal_code' then nullif(btrim(coalesce(p_changes->>'postal_code', '')), '')
      else postal_code
    end,
    city = case
      when p_changes ? 'city' then nullif(btrim(coalesce(p_changes->>'city', '')), '')
      else city
    end,
    city_unlocode = case
      when p_changes ? 'city_unlocode' then nullif(upper(btrim(coalesce(p_changes->>'city_unlocode', ''))), '')
      else city_unlocode
    end,
    country = case
      when p_changes ? 'country' then nullif(btrim(coalesce(p_changes->>'country', '')), '')
      else country
    end,
    credit_active = case
      when p_changes ? 'credit_active' then coalesce((p_changes->>'credit_active')::boolean, false)
      else credit_active
    end,
    credit_amount = case
      when p_changes ? 'credit_amount' then (p_changes->>'credit_amount')::numeric
      else credit_amount
    end,
    credit_days = case
      when p_changes ? 'credit_days' then (p_changes->>'credit_days')::integer
      else credit_days
    end,
    status = case
      when p_changes ? 'status' then coalesce(nullif(btrim(coalesce(p_changes->>'status', '')), ''), 'en_proceso_de_alta')
      else status
    end
  where id = p_provider_id
  returning id into updated_id;

  if updated_id is null then
    raise exception 'Provider % not found', p_provider_id;
  end if;

  return updated_id;
end;
$$;

create or replace function delete_provider_record(
  p_provider_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from providers
  where id = p_provider_id;
end;
$$;

create or replace function update_provider_contact_record(
  p_contact_id uuid,
  p_changes jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text;
  updated_id uuid;
begin
  if p_changes ? 'name' then
    normalized_name := nullif(btrim(coalesce(p_changes->>'name', '')), '');
    if normalized_name is null then
      raise exception 'Provider contact name is required';
    end if;
  end if;

  update provider_contacts
  set
    name = case when p_changes ? 'name' then normalized_name else name end,
    email = case
      when p_changes ? 'email' then nullif(btrim(coalesce(p_changes->>'email', '')), '')
      else email
    end,
    phone = case
      when p_changes ? 'phone' then nullif(btrim(coalesce(p_changes->>'phone', '')), '')
      else phone
    end,
    linkedin_url = case
      when p_changes ? 'linkedin_url' then nullif(btrim(coalesce(p_changes->>'linkedin_url', '')), '')
      else linkedin_url
    end,
    position = case
      when p_changes ? 'position' then nullif(btrim(coalesce(p_changes->>'position', '')), '')
      else position
    end,
    status = case
      when p_changes ? 'status' then coalesce(nullif(btrim(coalesce(p_changes->>'status', '')), ''), 'activo')
      else status
    end
  where id = p_contact_id
  returning id into updated_id;

  if updated_id is null then
    raise exception 'Provider contact % not found', p_contact_id;
  end if;

  return updated_id;
end;
$$;

create or replace function delete_provider_contact_record(
  p_contact_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from provider_contacts
  where id = p_contact_id;
end;
$$;

create or replace function create_provider_service_offering_record(
  p_provider_id uuid,
  p_service_transport_type_id uuid,
  p_terms_and_conditions text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_offering_id uuid;
begin
  insert into provider_service_offerings (
    provider_id,
    service_transport_type_id,
    terms_and_conditions
  )
  values (
    p_provider_id,
    p_service_transport_type_id,
    nullif(btrim(coalesce(p_terms_and_conditions, '')), '')
  )
  returning id into new_offering_id;

  return new_offering_id;
end;
$$;

create or replace function update_provider_service_offering_record(
  p_offering_id uuid,
  p_changes jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_id uuid;
begin
  update provider_service_offerings
  set
    service_transport_type_id = case
      when p_changes ? 'service_transport_type_id' then (p_changes->>'service_transport_type_id')::uuid
      else service_transport_type_id
    end,
    terms_and_conditions = case
      when p_changes ? 'terms_and_conditions' then nullif(btrim(coalesce(p_changes->>'terms_and_conditions', '')), '')
      else terms_and_conditions
    end
  where id = p_offering_id
  returning id into updated_id;

  if updated_id is null then
    raise exception 'Provider service offering % not found', p_offering_id;
  end if;

  return updated_id;
end;
$$;

create or replace function delete_provider_service_offering_record(
  p_offering_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from provider_service_offerings
  where id = p_offering_id;
end;
$$;


-- ===== BEGIN ERP_views.sql =====

-- =========================================
-- ERP ANALYTICS VIEWS
-- =========================================


-- =========================================
-- CLIENT OVERVIEW
-- =========================================

create or replace view client_overview_view as
with opportunity_stats as (
  select
    o.client_id,
    count(*) as total_opportunities,
    coalesce(
      sum(
        case
          when (
            case
              when o.expiration_date is not null
                and o.expiration_date < current_date
                and o.status not in ('aceptado', 'rechazada', 'vencida')
                then 'vencida'
              else o.status
            end
          ) not in ('aceptado', 'rechazada', 'vencida')
            then o.estimated_value
          else 0
        end
      ),
      0
    ) as pipeline_value
  from opportunities o
  group by o.client_id
),
quotation_stats as (
  select
    q.client_id,
    count(*) as total_quotations
  from quotations q
  group by q.client_id
),
shipment_stats as (
  select
    s.client_id,
    count(*) as total_shipments
  from shipments s
  group by s.client_id
)
select
  c.id,
  c.company_name as client_name,
  c.website,
  c.corporate_phone,
  c.country,
  c.city,
  c.status,
  c.account_owner_id,
  concat_ws(' ', u.first_name, u.last_name) as account_owner_name,
  c.created_at,
  coalesce(os.total_opportunities, 0) as total_opportunities,
  coalesce(qs.total_quotations, 0) as total_quotations,
  coalesce(ss.total_shipments, 0) as total_shipments,
  coalesce(os.pipeline_value, 0) as pipeline_value
from clients c
left join users u on u.id = c.account_owner_id
left join opportunity_stats os on os.client_id = c.id
left join quotation_stats qs on qs.client_id = c.id
left join shipment_stats ss on ss.client_id = c.id
where c.is_deleted = false
  and public.erp_can_access_client_resource(
    'crm.clients.list',
    'view',
    c.id
  );


-- =========================================
-- SALES PIPELINE
-- =========================================

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


-- =========================================
-- OPEN OPPORTUNITIES
-- =========================================

create or replace view open_opportunities_view as
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
where c.is_deleted = false
  and public.erp_can_access_opportunity_resource(
    'crm.opportunities.list',
    'view',
    o.salesperson_id,
    o.client_id
  );


-- =========================================
-- UN/LOCODE COUNTRY SUMMARY
-- =========================================

create or replace view unlocode_country_summary_view as
select
  country_code,
  max(country_name) as country_name,
  count(*) as row_count
from unlocodes
group by country_code
order by country_code asc;


-- =========================================
-- QUOTATION SUMMARY
-- =========================================

create or replace view quotation_summary_view as
with permission_flags as (
  select
    public.erp_can_view_quotation_cost() as can_view_cost,
    public.erp_can_edit_quotation_purchase_amount() as can_edit_purchase_amount,
    public.erp_can_view_quotation_sale_price() as can_view_sale_price,
    public.erp_can_edit_quotation_sale_price() as can_edit_sale_price,
    public.erp_can_view_quotation_expected_profit() as can_view_expected_profit
)
select
  q.id,
  q.reference_number,
  q.status,
  q.service_type,
  q.transport_type,
  q.operation_type,
  q.origin,
  q.origin_unlocode,
  q.destination,
  q.destination_unlocode,
  q.pickup_address,
  q.delivery_address,
  q.required_quote_date,
  null::date as purchase_valid_until,
  null::date as sales_valid_until,
  q.target_rate,
  q.pricing_owner_id,
  concat_ws(' ', pu.first_name, pu.last_name) as pricing_owner_name,
  q.created_by,
  concat_ws(' ', cu.first_name, cu.last_name) as created_by_name,
  q.incoterm_id,
  i.code as incoterm_code,
  q.rejection_reason_id,
  rr.reason as rejection_reason,
  q.rejection_notes,
  q.cancellation_notes,
  q.currency,
  case when pf.can_view_cost then q.estimated_cost else null end as estimated_cost,
  case when pf.can_view_sale_price then q.estimated_price else null end as estimated_price,
  case when pf.can_view_expected_profit then q.expected_profit else null end as expected_profit,
  (
    select count(*)
    from quotation_costs qc
    where qc.quotation_id = q.id
  ) as total_charge_lines,
  q.created_at,
  q.updated_at,
  c.id as client_id,
  c.company_name as client_name,
  o.id as opportunity_id,
  o.title as opportunity_title,
  o.salesperson_id,
  concat_ws(' ', su.first_name, su.last_name) as salesperson_name,
  pf.can_view_cost,
  pf.can_edit_purchase_amount,
  pf.can_view_sale_price,
  pf.can_edit_sale_price,
  pf.can_view_expected_profit,
  q.accepted_usd_rate_date,
  q.accepted_usd_to_mxn_rate,
  q.accepted_eur_rate_date,
  q.accepted_eur_to_mxn_rate,
  q.exchange_rates_locked_at
from quotations q
join clients c on c.id = q.client_id
join opportunities o on o.id = q.opportunity_id
left join incoterms i on i.id = q.incoterm_id
left join users pu on pu.id = q.pricing_owner_id
left join users cu on cu.id = q.created_by
left join users su on su.id = o.salesperson_id
left join quotation_rejection_reasons rr on rr.id = q.rejection_reason_id
cross join permission_flags pf
where c.is_deleted = false
  and (
    public.erp_can_access_crm_quotation_resource(
      'crm.quotations.record',
      'view',
      q.created_by,
      q.client_id
    )
    or public.erp_can_access_pricing_quotation(
      'view',
      q.status,
      q.pricing_owner_id
    )
    or public.erp_can_access_operations_shipment(
      'view',
      q.client_id
    )
  );

create or replace view quotation_cost_line_secure_view as
with permission_flags as (
  select
    public.erp_can_view_quotation_cost() as can_view_cost,
    public.erp_can_edit_quotation_purchase_amount() as can_edit_purchase_amount,
    public.erp_can_view_quotation_sale_price() as can_view_sale_price,
    public.erp_can_edit_quotation_sale_price() as can_edit_sale_price,
    public.erp_can_view_quotation_expected_profit() as can_view_expected_profit
)
select
  qc.id,
  qc.quotation_id,
  qc.option_label,
  qc.provider_id,
  p.name as provider_name,
  qc.sales_accounting_concept_id,
  sac.concept as accounting_concept,
  qc.service_name,
  case when pf.can_view_cost then qc.cost else null end as cost,
  case when pf.can_view_cost then qc.purchase_amount else null end as purchase_amount,
  qc.purchase_currency,
  case when pf.can_view_cost then qc.purchase_amount_mxn else null end as purchase_amount_mxn,
  case when pf.can_view_sale_price then qc.sale_amount else null end as sale_amount,
  qc.sale_currency,
  case when pf.can_view_sale_price then qc.sale_amount_mxn else null end as sale_amount_mxn,
  case when pf.can_view_expected_profit then qc.profit_amount else null end as profit_amount,
  case when pf.can_view_expected_profit then qc.profit_amount_mxn else null end as profit_amount_mxn,
  qc.vat_rate,
  qc.notes,
  qc.created_at,
  pf.can_view_cost,
  pf.can_edit_purchase_amount,
  pf.can_view_sale_price,
  pf.can_edit_sale_price,
  pf.can_view_expected_profit,
  qc.quotation_option_id,
  qo.sort_order as option_sort_order,
  qo.include_in_customer_quote,
  qo.purchase_valid_until as option_purchase_valid_until,
  qo.sales_valid_until as option_sales_valid_until,
  qo.sales_validity_overridden as option_sales_validity_overridden
from quotation_costs qc
join quotations q on q.id = qc.quotation_id
left join quotation_options qo on qo.id = qc.quotation_option_id
left join providers p on p.id = qc.provider_id
left join sales_accounting_concepts sac on sac.id = qc.sales_accounting_concept_id
cross join permission_flags pf
where
  public.erp_has_resource_access(
    'pricing.quotations.cost_section',
    'view',
    q.pricing_owner_id,
    null
  )
  or public.erp_can_access_crm_quotation_resource(
    'crm.quotations.pricing_options',
    'view',
    q.created_by,
    q.client_id
  );

create or replace view crm_quotations_view as
select *
from quotation_summary_view
where public.erp_can_access_crm_quotation_resource(
  'crm.quotations.list',
  'view',
  created_by,
  client_id
)
and status in (
  'borrador',
  'pendiente',
  'cotizando',
  'lista_para_enviar',
  'enviada',
  'cancelada',
  'rechazada',
  'renegociar_tarifa',
  'aceptada'
);

create or replace view pricing_quotations_view as
select *
from quotation_summary_view
where public.erp_can_access_pricing_quotation(
  'view',
  status,
  pricing_owner_id
)
and status in (
  'pendiente',
  'cotizando',
  'lista_para_enviar',
  'renegociar_tarifa'
);

create or replace view quotation_rejection_reason_lookup_view as
select
  id,
  reason,
  created_at,
  updated_at
from quotation_rejection_reasons
order by reason asc;


-- =========================================
-- ACTIVE SHIPMENTS
-- =========================================

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


-- =========================================
-- DELIVERED SHIPMENTS
-- =========================================

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


-- =========================================
-- CLIENT REVENUE
-- =========================================

create or replace view client_revenue_view as
with shipment_stats as (
  select
    s.client_id,
    count(*) as total_shipments
  from shipments s
  group by s.client_id
),
invoice_stats as (
  select
    ci.client_id,
    count(*) as total_invoices,
    coalesce(sum(ci.total_amount), 0) as billed_amount
  from client_invoices ci
  group by ci.client_id
),
quotation_profit as (
  select
    q.client_id,
    coalesce(sum(q.expected_profit), 0) as expected_profit
  from quotations q
  group by q.client_id
)
select
  c.id as client_id,
  c.company_name as client_name,
  coalesce(ss.total_shipments, 0) as total_shipments,
  coalesce(is2.total_invoices, 0) as total_invoices,
  coalesce(is2.billed_amount, 0) as billed_amount,
  coalesce(qp.expected_profit, 0) as expected_profit
from clients c
left join shipment_stats ss on ss.client_id = c.id
left join invoice_stats is2 on is2.client_id = c.id
left join quotation_profit qp on qp.client_id = c.id
where c.is_deleted = false;


-- =========================================
-- MONTHLY SALES
-- =========================================

create or replace view monthly_sales_view as
select
  date_trunc('month', created_at) as month,
  count(*) as opportunities,
  coalesce(sum(estimated_value), 0) as total_value
from opportunities
group by month
order by month desc;


-- =========================================
-- SHIPMENT ACTIVITY
-- =========================================

create or replace view shipment_activity_view as
select
  status,
  count(*) as shipments
from shipments
group by status;


-- =========================================
-- CLIENT CONTACT LIST
-- =========================================

create or replace view client_contacts_view as
select
  ct.id,
  ct.client_id,
  ct.name,
  ct.email,
  ct.phone,
  ct.linkedin_url,
  ct.position,
  ct.status,
  ct.is_primary,
  ct.created_at,
  ct.updated_at,
  c.company_name as client_name
from contacts ct
join clients c on c.id = ct.client_id
where c.is_deleted = false
  and public.erp_can_access_client_resource(
    'crm.contacts.list',
    'view',
    ct.client_id
  );


-- =========================================
-- PROVIDER OVERVIEW
-- =========================================

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


-- =========================================
-- PROVIDER CONTACT LIST
-- =========================================

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


-- =========================================
-- PROVIDER SERVICE OFFERINGS
-- =========================================

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


-- =========================================
-- UN/LOCODE LOOKUP
-- =========================================

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
  end as display_name,
  u.search_text
from unlocodes u;


-- =========================================
-- SERVICE TRANSPORT TYPE LOOKUP
-- =========================================

create or replace view service_transport_type_lookup_view as
select
  stt.id,
  stt.service_type,
  stt.transport_type,
  stt.created_at,
  stt.updated_at
from service_transport_types stt
order by stt.service_type asc, stt.transport_type asc;


-- =========================================
-- SALES ACCOUNTING CONCEPT LOOKUP
-- =========================================

create or replace view sales_accounting_concept_lookup_view as
select
  sac.id,
  sac.concept,
  sac.service_type,
  sac.operation_type,
  sac.vat_rate,
  sac.sat_code,
  sac.created_at,
  sac.updated_at
from sales_accounting_concepts sac
order by sac.service_type asc, sac.operation_type asc, sac.concept asc;


-- =========================================
-- EXCHANGE RATE LOOKUP
-- =========================================

create or replace view exchange_rate_lookup_view as
select
  er.id,
  er.rate_date,
  er.base_currency,
  er.quote_currency,
  er.rate_value,
  er.source,
  er.source_series_code,
  er.created_at,
  er.updated_at
from exchange_rates er
order by er.rate_date desc, er.base_currency asc, er.quote_currency asc;


-- =========================================
-- PERMISSION RESOURCE CATALOG
-- =========================================

create or replace view permission_resource_catalog_view as
select
  pm.id as module_id,
  pm.code as module_code,
  pm.name as module_name,
  pm.icon_key as module_icon_key,
  pm.sort_order as module_sort_order,
  pm.active as module_active,
  ps.id as submodule_id,
  ps.code as submodule_code,
  ps.name as submodule_name,
  ps.route_path,
  ps.route_matchers,
  ps.sort_order as submodule_sort_order,
  ps.active as submodule_active,
  pr.id as resource_id,
  pr.resource_key,
  pr.name as resource_name,
  pr.resource_type,
  pr.resource_group,
  pr.table_name,
  pr.view_name,
  pr.rpc_name,
  pr.entity_owner_field,
  pr.entity_branch_field,
  pr.sort_order as resource_sort_order,
  pr.active as resource_active,
  pr.created_at,
  pr.updated_at
from permission_resources pr
join permission_modules pm on pm.id = pr.module_id
left join permission_submodules ps on ps.id = pr.submodule_id
order by
  pm.sort_order asc,
  coalesce(ps.sort_order, 0) asc,
  pr.sort_order asc,
  pr.name asc;


-- =========================================
-- PERMISSION FIELD CATALOG
-- =========================================

create or replace view permission_field_catalog_view as
select
  pr.resource_key,
  pr.name as resource_name,
  pf.id as field_id,
  pf.resource_id,
  pf.field_key,
  pf.label,
  pf.data_type,
  pf.field_group,
  pf.sort_order,
  pf.active,
  pf.created_at,
  pf.updated_at
from permission_fields pf
join permission_resources pr on pr.id = pf.resource_id
order by
  pr.sort_order asc,
  pf.field_group asc,
  pf.sort_order asc,
  pf.label asc;


-- =========================================
-- ROLE RESOURCE PERMISSION MATRIX
-- =========================================

create or replace view role_resource_permission_matrix_view as
select
  r.id as role_id,
  r.name as role_name,
  prc.module_id,
  prc.module_code,
  prc.module_name,
  prc.module_icon_key,
  prc.module_sort_order,
  prc.submodule_id,
  prc.submodule_code,
  prc.submodule_name,
  prc.route_path,
  prc.route_matchers,
  prc.submodule_sort_order,
  prc.resource_id,
  prc.resource_key,
  prc.resource_name,
  prc.resource_type,
  prc.resource_group,
  pa.id as action_id,
  pa.code as action_code,
  pa.name as action_name,
  coalesce(rrp.allowed, false) as allowed,
  pc.id as condition_id,
  coalesce(pc.code, 'none') as condition_code,
  coalesce(pc.name, 'None') as condition_name,
  rrp.id as role_permission_id
from roles r
cross join permission_resource_catalog_view prc
cross join permission_actions pa
left join role_resource_permissions rrp
  on rrp.role_id = r.id
 and rrp.resource_id = prc.resource_id
 and rrp.action_id = pa.id
left join permission_conditions pc
  on pc.id = rrp.condition_id
where pa.active = true
  and pa.scope_type in ('resource', 'both')
  and prc.resource_active = true
order by
  r.name asc,
  prc.module_sort_order asc,
  coalesce(prc.submodule_sort_order, 0) asc,
  prc.resource_sort_order asc,
  pa.name asc;


-- =========================================
-- ROLE FIELD PERMISSION MATRIX
-- =========================================

create or replace view role_field_permission_matrix_view as
select
  r.id as role_id,
  r.name as role_name,
  pfc.resource_key,
  pfc.resource_name,
  pfc.field_id,
  pfc.field_key,
  pfc.label as field_label,
  pfc.data_type,
  pfc.field_group,
  pfc.sort_order as field_sort_order,
  pa.id as action_id,
  pa.code as action_code,
  pa.name as action_name,
  coalesce(rfp.allowed, false) as allowed,
  pc.id as condition_id,
  coalesce(pc.code, 'none') as condition_code,
  coalesce(pc.name, 'None') as condition_name,
  rfp.id as role_field_permission_id
from roles r
cross join permission_field_catalog_view pfc
cross join permission_actions pa
left join role_field_permissions rfp
  on rfp.role_id = r.id
 and rfp.field_id = pfc.field_id
 and rfp.action_id = pa.id
left join permission_conditions pc
  on pc.id = rfp.condition_id
where pa.active = true
  and pa.scope_type in ('field', 'both')
  and pfc.active = true
order by
  r.name asc,
  pfc.resource_key asc,
  pfc.field_group asc,
  pfc.sort_order asc,
  pa.name asc;


-- ===== BEGIN ERP_triggers.sql =====

-- =========================================
-- ERP AUTOMATION LAYER
-- =========================================


-- =========================================
-- 1. AUTO TIMESTAMPS
-- =========================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_branches_updated_at
before update on branches
for each row
execute function set_updated_at();

create trigger set_roles_updated_at
before update on roles
for each row
execute function set_updated_at();

create trigger set_users_updated_at
before update on users
for each row
execute function set_updated_at();

create trigger set_permission_modules_updated_at
before update on permission_modules
for each row
execute function set_updated_at();

create trigger set_permission_submodules_updated_at
before update on permission_submodules
for each row
execute function set_updated_at();

create trigger set_permission_actions_updated_at
before update on permission_actions
for each row
execute function set_updated_at();

create trigger set_permission_conditions_updated_at
before update on permission_conditions
for each row
execute function set_updated_at();

create trigger set_permission_resources_updated_at
before update on permission_resources
for each row
execute function set_updated_at();

create trigger set_permission_fields_updated_at
before update on permission_fields
for each row
execute function set_updated_at();

create trigger set_role_resource_permissions_updated_at
before update on role_resource_permissions
for each row
execute function set_updated_at();

create trigger set_role_field_permissions_updated_at
before update on role_field_permissions
for each row
execute function set_updated_at();

create trigger set_external_data_sources_updated_at
before update on external_data_sources
for each row
execute function set_updated_at();

create trigger set_unlocodes_updated_at
before update on unlocodes
for each row
execute function set_updated_at();

create trigger set_service_transport_types_updated_at
before update on service_transport_types
for each row
execute function set_updated_at();

create trigger set_sales_accounting_concepts_updated_at
before update on sales_accounting_concepts
for each row
execute function set_updated_at();

create trigger set_exchange_rates_updated_at
before update on exchange_rates
for each row
execute function set_updated_at();

create trigger set_quotation_reference_counters_updated_at
before update on quotation_reference_counters
for each row
execute function set_updated_at();

create trigger set_prospects_updated_at
before update on prospects
for each row
execute function set_updated_at();

create trigger set_clients_updated_at
before update on clients
for each row
execute function set_updated_at();

create trigger set_contacts_updated_at
before update on contacts
for each row
execute function set_updated_at();

create trigger set_client_logistics_parties_updated_at
before update on client_logistics_parties
for each row
execute function set_updated_at();

create trigger set_providers_updated_at
before update on providers
for each row
execute function set_updated_at();

create trigger set_provider_contacts_updated_at
before update on provider_contacts
for each row
execute function set_updated_at();

create trigger set_provider_service_offerings_updated_at
before update on provider_service_offerings
for each row
execute function set_updated_at();

create trigger set_incoterms_updated_at
before update on incoterms
for each row
execute function set_updated_at();

create trigger set_opportunities_updated_at
before update on opportunities
for each row
execute function set_updated_at();

create trigger set_quotations_updated_at
before update on quotations
for each row
execute function set_updated_at();

create trigger set_quotation_rejection_reasons_updated_at
before update on quotation_rejection_reasons
for each row
execute function set_updated_at();

create trigger set_quotation_cargo_lines_updated_at
before update on quotation_cargo_lines
for each row
execute function set_updated_at();

create trigger set_shipments_updated_at
before update on shipments
for each row
execute function set_updated_at();

create trigger set_client_invoices_updated_at
before update on client_invoices
for each row
execute function set_updated_at();

create trigger set_provider_invoices_updated_at
before update on provider_invoices
for each row
execute function set_updated_at();

create trigger set_workspace_saved_views_updated_at
before update on workspace_saved_views
for each row
execute function set_updated_at();

create trigger set_mailboxes_updated_at
before update on mailboxes
for each row
execute function set_updated_at();

create trigger set_mail_threads_updated_at
before update on mail_threads
for each row
execute function set_updated_at();

create trigger set_mail_messages_updated_at
before update on mail_messages
for each row
execute function set_updated_at();

create trigger set_mail_sync_runs_updated_at
before update on mail_sync_runs
for each row
execute function set_updated_at();


-- =========================================
-- 1.0 AUTH USER SYNC
-- =========================================

create or replace function sync_public_user_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.email is null then
    return new;
  end if;

  update public.users
  set
    auth_user_id = new.id,
    email = lower(new.email),
    updated_at = now()
  where lower(email) = lower(new.email)
    and (auth_user_id is null or auth_user_id = new.id);

  if not found then
    insert into public.users (
      auth_user_id,
      email,
      active
    )
    values (
      new.id,
      lower(new.email),
      false
    )
    on conflict (auth_user_id)
    do update set
      email = excluded.email,
      updated_at = now();
  end if;

  return new;
end;
$$;

create trigger sync_public_user_from_auth_trigger
after insert or update of email on auth.users
for each row
execute function sync_public_user_from_auth();


-- =========================================
-- 1.1 UN/LOCODE SEARCH TEXT
-- =========================================

create or replace function set_unlocode_search_text()
returns trigger
language plpgsql
as $$
begin
  new.search_text := lower(
    regexp_replace(
      concat_ws(
        ' ',
        new.unlocode,
        new.country_code,
        new.location_code,
        new.country_name,
        new.name,
        coalesce(new.name_without_diacritics, ''),
        coalesce(new.subdivision_code, ''),
        coalesce(new.iata_code, '')
      ),
      '\s+',
      ' ',
      'g'
    )
  );

  return new;
end;
$$;

create trigger set_unlocodes_search_text
before insert or update on unlocodes
for each row
execute function set_unlocode_search_text();


-- =========================================
-- 1.2 CLIENT SEARCH TEXT
-- =========================================

create or replace function set_client_search_text()
returns trigger
language plpgsql
as $$
begin
  new.search_text := lower(
    regexp_replace(
      concat_ws(
        ' ',
        new.company_name,
        coalesce(new.tax_id, ''),
        coalesce(new.website, ''),
        coalesce(new.corporate_phone, ''),
        coalesce(new.country, ''),
        coalesce(new.city, ''),
        coalesce(new.city_unlocode, '')
      ),
      '\s+',
      ' ',
      'g'
    )
  );

  return new;
end;
$$;

-- =========================================
-- 1.3 CLIENT LOCATION FIELDS
-- =========================================

create or replace function apply_client_location_fields()
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
  from resolve_unlocode_reference(new.city_unlocode, new.city_unlocode_id);

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

create or replace function apply_client_owner_branch_defaults()
returns trigger
language plpgsql
as $$
declare
  resolved_branch_id uuid;
begin
  if new.account_owner_id is null then
    new.account_owner_id := public.erp_current_user_id();
  end if;

  if new.account_owner_id is not null and new.branch_id is null then
    select u.branch_id
    into resolved_branch_id
    from public.users u
    where u.id = new.account_owner_id;

    new.branch_id := resolved_branch_id;
  end if;

  return new;
end;
$$;

drop trigger if exists set_client_owner_branch_defaults on clients;

create trigger set_client_owner_branch_defaults
before insert or update on clients
for each row
execute function apply_client_owner_branch_defaults();

drop trigger if exists set_client_location_fields on clients;

create trigger set_client_location_fields
before insert or update on clients
for each row
execute function apply_client_location_fields();

create trigger set_clients_search_text
before insert or update on clients
for each row
execute function set_client_search_text();


-- =========================================
-- 1.4 CLIENT LOGISTICS PARTY LOCATION FIELDS
-- =========================================

create or replace function apply_client_logistics_party_location_fields()
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
  from resolve_unlocode_reference(new.city_unlocode, new.city_unlocode_id);

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

drop trigger if exists set_client_logistics_party_location_fields on client_logistics_parties;

create trigger set_client_logistics_party_location_fields
before insert or update on client_logistics_parties
for each row
execute function apply_client_logistics_party_location_fields();


-- =========================================
-- 1.6 OPPORTUNITY COMPUTED FIELDS
-- =========================================

create or replace function apply_opportunity_computed_fields()
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

  new.expiration_date := calculate_opportunity_expiration_date(new.start_date);

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
    from resolve_unlocode_reference(new.origin_unlocode, new.origin_unlocode_id);

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
    from resolve_unlocode_reference(new.destination_unlocode, new.destination_unlocode_id);

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

create or replace function apply_opportunity_owner_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.salesperson_id is null and new.client_id is not null then
    select c.account_owner_id
    into new.salesperson_id
    from public.clients c
    where c.id = new.client_id
      and c.is_deleted = false;
  end if;

  return new;
end;
$$;

drop trigger if exists set_opportunity_owner_defaults on opportunities;

create trigger set_opportunity_owner_defaults
before insert or update on opportunities
for each row
execute function apply_opportunity_owner_defaults();

create trigger set_opportunity_computed_fields
before insert or update on opportunities
for each row
execute function apply_opportunity_computed_fields();


-- =========================================
-- 1.7 QUOTATION COMPUTED FIELDS
-- =========================================

create or replace function apply_quotation_computed_fields()
returns trigger
language plpgsql
as $$
declare
  origin_reference record;
  destination_reference record;
begin
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
    from resolve_unlocode_reference(new.origin_unlocode, new.origin_unlocode_id);

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
    from resolve_unlocode_reference(new.destination_unlocode, new.destination_unlocode_id);

    if destination_reference is not null then
      new.destination_unlocode_id := destination_reference.resolved_id;
      new.destination_unlocode := destination_reference.resolved_unlocode;
      new.destination := destination_reference.resolved_city;
    end if;
  end if;

  new.search_text := lower(
    regexp_replace(
      concat_ws(
        ' ',
        coalesce(new.reference_number, ''),
        coalesce(new.status, ''),
        coalesce(new.service_type, ''),
        coalesce(new.transport_type, ''),
        coalesce(new.operation_type, ''),
        coalesce(new.origin, ''),
        coalesce(new.origin_unlocode, ''),
        coalesce(new.destination, ''),
        coalesce(new.destination_unlocode, ''),
        coalesce(new.pickup_address, ''),
        coalesce(new.delivery_address, '')
      ),
      '\s+',
      ' ',
      'g'
    )
  );

  return new;
end;
$$;

drop trigger if exists set_quotation_computed_fields on quotations;

create trigger set_quotation_computed_fields
before insert or update on quotations
for each row
execute function apply_quotation_computed_fields();


-- =========================================
-- 1.8 PROVIDER COMPUTED FIELDS
-- =========================================

create or replace function apply_provider_location_fields()
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
  from resolve_unlocode_reference(new.city_unlocode, new.city_unlocode_id);

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

drop trigger if exists set_provider_location_fields on providers;

create trigger set_provider_location_fields
before insert or update on providers
for each row
execute function apply_provider_location_fields();

create trigger set_commissions_updated_at
before update on commissions
for each row
execute function set_updated_at();


-- =========================================
-- 2. REFERENCE GENERATORS
-- =========================================

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
    new.reference_number := next_quotation_reference(new.service_type);
  end if;

  return new;
end;
$$;

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

create trigger shipment_reference_trigger
before insert on shipments
for each row
execute function set_shipment_reference();


-- =========================================
-- 3. QUOTATION TOTALS SYNC
-- =========================================

create or replace function sync_quotation_totals_from_cost_lines()
returns trigger
language plpgsql
as $$
declare
  quotation_id_value uuid;
begin
  quotation_id_value := case
    when tg_op = 'DELETE' then old.quotation_id
    else new.quotation_id
  end;

  if quotation_id_value is not null then
    perform recalculate_quotation_totals(quotation_id_value);
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists quotation_cost_totals_trigger on quotation_costs;

create trigger quotation_cost_totals_trigger
after insert or update or delete on quotation_costs
for each row
execute function sync_quotation_totals_from_cost_lines();


-- =========================================
-- 4. SOFT DELETE PROTECTION
-- =========================================

create or replace function prevent_hard_delete()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.allow_test_hard_delete', true) = 'on' then
    return old;
  end if;

  raise exception 'Hard delete not allowed. Use the soft_delete_client() function.';
  return old;
end;
$$;

create trigger prevent_clients_delete
before delete on clients
for each row
execute function prevent_hard_delete();


-- =========================================
-- 5. AUDIT TRAIL
-- =========================================

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
      public.erp_current_user_id(),
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
    public.erp_current_user_id(),
    to_jsonb(new)
  );

  return new;
end;
$$;

create trigger audit_clients
after insert or update or delete on clients
for each row
execute function audit_trigger();

create trigger audit_client_logistics_parties
after insert or update or delete on client_logistics_parties
for each row
execute function audit_trigger();

create trigger audit_providers
after insert or update or delete on providers
for each row
execute function audit_trigger();

create trigger audit_provider_contacts
after insert or update or delete on provider_contacts
for each row
execute function audit_trigger();

create trigger audit_provider_service_offerings
after insert or update or delete on provider_service_offerings
for each row
execute function audit_trigger();

create trigger audit_sales_accounting_concepts
after insert or update or delete on sales_accounting_concepts
for each row
execute function audit_trigger();

create trigger audit_quotation_rejection_reasons
after insert or update or delete on quotation_rejection_reasons
for each row
execute function audit_trigger();

create trigger audit_opportunities
after insert or update or delete on opportunities
for each row
execute function audit_trigger();

create trigger audit_quotations
after insert or update or delete on quotations
for each row
execute function audit_trigger();

create trigger audit_quotation_costs
after insert or update or delete on quotation_costs
for each row
execute function audit_trigger();

create trigger audit_quotation_cargo_lines
after insert or update or delete on quotation_cargo_lines
for each row
execute function audit_trigger();

create trigger audit_shipments
after insert or update or delete on shipments
for each row
execute function audit_trigger();

create trigger audit_client_invoices
after insert or update or delete on client_invoices
for each row
execute function audit_trigger();

create trigger audit_provider_invoices
after insert or update or delete on provider_invoices
for each row
execute function audit_trigger();


-- ===== BEGIN ERP_policies.sql =====

-- =========================================
-- ERP SECURITY POLICIES
-- CANONICAL ACCESS CONTROL
-- =========================================
-- Authentication:
-- - Supabase Auth handles password verification and sessions.
-- - public.users stores ERP profile, role, username, and active status.
--
-- Authorization:
-- - all ERP data access requires an authenticated active ERP user
-- - admin-managed tables require erp_is_admin()
-- =========================================


-- =========================================
-- ORGANIZATION
-- =========================================

alter table branches enable row level security;
alter table roles enable row level security;
alter table users enable row level security;
alter table permission_modules enable row level security;
alter table permission_submodules enable row level security;
alter table permission_actions enable row level security;
alter table permission_conditions enable row level security;
alter table permission_resources enable row level security;
alter table permission_fields enable row level security;
alter table role_resource_permissions enable row level security;
alter table role_field_permissions enable row level security;
alter table branches force row level security;
alter table roles force row level security;
alter table users force row level security;
alter table permission_modules force row level security;
alter table permission_submodules force row level security;
alter table permission_actions force row level security;
alter table permission_conditions force row level security;
alter table permission_resources force row level security;
alter table permission_fields force row level security;
alter table role_resource_permissions force row level security;
alter table role_field_permissions force row level security;

create policy "active_select_branches"
on branches
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_branches"
on branches
for insert
with check (public.erp_is_admin());

create policy "admin_update_branches"
on branches
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_branches"
on branches
for delete
using (public.erp_is_admin());

create policy "active_select_roles"
on roles
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_roles"
on roles
for insert
with check (public.erp_is_admin());

create policy "admin_update_roles"
on roles
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_roles"
on roles
for delete
using (public.erp_is_admin());

create policy "active_select_users"
on users
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_users"
on users
for insert
with check (public.erp_is_admin());

create policy "admin_update_users"
on users
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_users"
on users
for delete
using (public.erp_is_admin());

create policy "active_select_permission_modules"
on permission_modules
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_permission_modules"
on permission_modules
for insert
with check (public.erp_is_admin());

create policy "admin_update_permission_modules"
on permission_modules
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_permission_modules"
on permission_modules
for delete
using (public.erp_is_admin());

create policy "active_select_permission_submodules"
on permission_submodules
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_permission_submodules"
on permission_submodules
for insert
with check (public.erp_is_admin());

create policy "admin_update_permission_submodules"
on permission_submodules
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_permission_submodules"
on permission_submodules
for delete
using (public.erp_is_admin());

create policy "active_select_permission_actions"
on permission_actions
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_permission_actions"
on permission_actions
for insert
with check (public.erp_is_admin());

create policy "admin_update_permission_actions"
on permission_actions
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_permission_actions"
on permission_actions
for delete
using (public.erp_is_admin());

create policy "active_select_permission_conditions"
on permission_conditions
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_permission_conditions"
on permission_conditions
for insert
with check (public.erp_is_admin());

create policy "admin_update_permission_conditions"
on permission_conditions
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_permission_conditions"
on permission_conditions
for delete
using (public.erp_is_admin());

create policy "active_select_permission_resources"
on permission_resources
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_permission_resources"
on permission_resources
for insert
with check (public.erp_is_admin());

create policy "admin_update_permission_resources"
on permission_resources
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_permission_resources"
on permission_resources
for delete
using (public.erp_is_admin());

create policy "active_select_permission_fields"
on permission_fields
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_permission_fields"
on permission_fields
for insert
with check (public.erp_is_admin());

create policy "admin_update_permission_fields"
on permission_fields
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_permission_fields"
on permission_fields
for delete
using (public.erp_is_admin());

create policy "role_select_role_resource_permissions"
on role_resource_permissions
for select
using (
  public.erp_is_admin()
  or role_id in (
    select u.role_id
    from public.users u
    where u.auth_user_id = auth.uid()
      and u.active = true
      and u.role_id is not null
  )
);

create policy "admin_insert_role_resource_permissions"
on role_resource_permissions
for insert
with check (public.erp_is_admin());

create policy "admin_update_role_resource_permissions"
on role_resource_permissions
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_role_resource_permissions"
on role_resource_permissions
for delete
using (public.erp_is_admin());

create policy "role_select_role_field_permissions"
on role_field_permissions
for select
using (
  public.erp_is_admin()
  or role_id in (
    select u.role_id
    from public.users u
    where u.auth_user_id = auth.uid()
      and u.active = true
      and u.role_id is not null
  )
);

create policy "admin_insert_role_field_permissions"
on role_field_permissions
for insert
with check (public.erp_is_admin());

create policy "admin_update_role_field_permissions"
on role_field_permissions
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_role_field_permissions"
on role_field_permissions
for delete
using (public.erp_is_admin());


-- =========================================
-- MASTER DATA
-- =========================================

alter table external_data_sources enable row level security;
alter table unlocodes enable row level security;
alter table service_transport_types enable row level security;
alter table sales_accounting_concepts enable row level security;
alter table exchange_rates enable row level security;
alter table incoterms enable row level security;
alter table external_data_sources force row level security;
alter table unlocodes force row level security;
alter table service_transport_types force row level security;
alter table sales_accounting_concepts force row level security;
alter table exchange_rates force row level security;
alter table incoterms force row level security;

create policy "active_select_external_data_sources"
on external_data_sources
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_external_data_sources"
on external_data_sources
for insert
with check (public.erp_is_admin());

create policy "admin_update_external_data_sources"
on external_data_sources
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_external_data_sources"
on external_data_sources
for delete
using (public.erp_is_admin());

create policy "active_select_unlocodes"
on unlocodes
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_unlocodes"
on unlocodes
for insert
with check (public.erp_is_admin());

create policy "admin_update_unlocodes"
on unlocodes
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_unlocodes"
on unlocodes
for delete
using (public.erp_is_admin());

create policy "active_select_service_transport_types"
on service_transport_types
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_service_transport_types"
on service_transport_types
for insert
with check (public.erp_is_admin());

create policy "admin_update_service_transport_types"
on service_transport_types
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_service_transport_types"
on service_transport_types
for delete
using (public.erp_is_admin());

create policy "active_select_sales_accounting_concepts"
on sales_accounting_concepts
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_sales_accounting_concepts"
on sales_accounting_concepts
for insert
with check (public.erp_is_admin());

create policy "admin_update_sales_accounting_concepts"
on sales_accounting_concepts
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_sales_accounting_concepts"
on sales_accounting_concepts
for delete
using (public.erp_is_admin());

create policy "active_select_exchange_rates"
on exchange_rates
for select
using (public.erp_has_submodule_access('master_data.accounting.exchange_rates', 'view'));

create policy "active_insert_exchange_rates"
on exchange_rates
for insert
with check (public.erp_has_submodule_access('master_data.accounting.exchange_rates', 'create'));

create policy "active_update_exchange_rates"
on exchange_rates
for update
using (public.erp_has_submodule_access('master_data.accounting.exchange_rates', 'edit'))
with check (public.erp_has_submodule_access('master_data.accounting.exchange_rates', 'edit'));

create policy "active_delete_exchange_rates"
on exchange_rates
for delete
using (public.erp_has_submodule_access('master_data.accounting.exchange_rates', 'delete'));

create policy "active_select_incoterms"
on incoterms
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_incoterms"
on incoterms
for insert
with check (public.erp_is_admin());

create policy "admin_update_incoterms"
on incoterms
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_incoterms"
on incoterms
for delete
using (public.erp_is_admin());


-- =========================================
-- CRM
-- =========================================

alter table prospects enable row level security;
alter table clients enable row level security;
alter table contacts enable row level security;
alter table client_logistics_parties enable row level security;
alter table prospects force row level security;
alter table clients force row level security;
alter table contacts force row level security;
alter table client_logistics_parties force row level security;

create policy "active_select_prospects"
on prospects
for select
using (public.erp_has_module_access('crm', 'view'));

create policy "active_insert_prospects"
on prospects
for insert
with check (public.erp_has_module_access('crm', 'create'));

create policy "active_update_prospects"
on prospects
for update
using (public.erp_has_module_access('crm', 'edit'))
with check (public.erp_has_module_access('crm', 'edit'));

create policy "active_delete_prospects"
on prospects
for delete
using (public.erp_has_module_access('crm', 'delete'));

create policy "active_select_clients"
on clients
for select
using (
  public.erp_can_access_client_resource(
    'crm.clients.list',
    'view',
    id
  )
);

create policy "active_insert_clients"
on clients
for insert
with check (public.erp_has_submodule_access('crm.clients', 'create'));

create policy "active_update_clients"
on clients
for update
using (
  public.erp_can_access_client_resource(
    'crm.clients.record',
    'edit',
    id
  )
)
with check (
  public.erp_can_access_client_resource(
    'crm.clients.record',
    'edit',
    id
  )
);

create policy "active_delete_clients"
on clients
for delete
using (
  public.erp_can_access_client_resource(
    'crm.clients.record',
    'delete',
    id
  )
);

create policy "active_select_contacts"
on contacts
for select
using (
  public.erp_can_access_client_resource(
    'crm.contacts.list',
    'view',
    client_id
  )
);

create policy "active_insert_contacts"
on contacts
for insert
with check (
  public.erp_can_access_client_resource(
    'crm.clients.record',
    'edit',
    client_id
  )
);

create policy "active_update_contacts"
on contacts
for update
using (
  public.erp_can_access_client_resource(
    'crm.contacts.record',
    'edit',
    client_id
  )
)
with check (
  public.erp_can_access_client_resource(
    'crm.contacts.record',
    'edit',
    client_id
  )
);

create policy "active_delete_contacts"
on contacts
for delete
using (
  public.erp_can_access_client_resource(
    'crm.contacts.record',
    'delete',
    client_id
  )
);

create policy "active_select_client_logistics_parties"
on client_logistics_parties
for select
using (
  public.erp_can_access_client_resource(
    'crm.clients.record',
    'view',
    client_id
  )
);

create policy "active_insert_client_logistics_parties"
on client_logistics_parties
for insert
with check (
  public.erp_can_access_client_resource(
    'crm.clients.record',
    'edit',
    client_id
  )
);

create policy "active_update_client_logistics_parties"
on client_logistics_parties
for update
using (
  public.erp_can_access_client_resource(
    'crm.clients.record',
    'edit',
    client_id
  )
)
with check (
  public.erp_can_access_client_resource(
    'crm.clients.record',
    'edit',
    client_id
  )
);

create policy "active_delete_client_logistics_parties"
on client_logistics_parties
for delete
using (
  public.erp_can_access_client_resource(
    'crm.clients.record',
    'delete',
    client_id
  )
);


-- =========================================
-- COMMERCIAL / PRICING
-- =========================================

alter table providers enable row level security;
alter table provider_contacts enable row level security;
alter table provider_service_offerings enable row level security;
alter table opportunities enable row level security;
alter table quotations enable row level security;
alter table quotation_options enable row level security;
alter table quotation_costs enable row level security;
alter table quotation_cargo_lines enable row level security;
alter table quotation_rejection_reasons enable row level security;
alter table providers force row level security;
alter table provider_contacts force row level security;
alter table provider_service_offerings force row level security;
alter table opportunities force row level security;
alter table quotations force row level security;
alter table quotation_options force row level security;
alter table quotation_costs force row level security;
alter table quotation_cargo_lines force row level security;
alter table quotation_rejection_reasons force row level security;

create policy "active_select_providers"
on providers
for select
using (
  public.erp_has_submodule_access('pricing.providers', 'view')
  or public.erp_has_resource_access('crm.quotations.pricing_options', 'view')
);

create policy "active_insert_providers"
on providers
for insert
with check (public.erp_has_submodule_access('pricing.providers', 'create'));

create policy "active_update_providers"
on providers
for update
using (public.erp_has_submodule_access('pricing.providers', 'edit'))
with check (public.erp_has_submodule_access('pricing.providers', 'edit'));

create policy "active_delete_providers"
on providers
for delete
using (public.erp_has_submodule_access('pricing.providers', 'delete'));

create policy "active_select_provider_contacts"
on provider_contacts
for select
using (
  public.erp_has_submodule_access('pricing.providers', 'view')
  or public.erp_has_resource_access('crm.quotations.pricing_options', 'view')
);

create policy "active_insert_provider_contacts"
on provider_contacts
for insert
with check (public.erp_has_submodule_access('pricing.providers', 'create'));

create policy "active_update_provider_contacts"
on provider_contacts
for update
using (public.erp_has_submodule_access('pricing.providers', 'edit'))
with check (public.erp_has_submodule_access('pricing.providers', 'edit'));

create policy "active_delete_provider_contacts"
on provider_contacts
for delete
using (public.erp_has_submodule_access('pricing.providers', 'delete'));

create policy "active_select_provider_service_offerings"
on provider_service_offerings
for select
using (
  public.erp_has_submodule_access('pricing.providers', 'view')
  or public.erp_has_resource_access('crm.quotations.pricing_options', 'view')
);

create policy "active_insert_provider_service_offerings"
on provider_service_offerings
for insert
with check (public.erp_has_submodule_access('pricing.providers', 'create'));

create policy "active_update_provider_service_offerings"
on provider_service_offerings
for update
using (public.erp_has_submodule_access('pricing.providers', 'edit'))
with check (public.erp_has_submodule_access('pricing.providers', 'edit'));

create policy "active_delete_provider_service_offerings"
on provider_service_offerings
for delete
using (public.erp_has_submodule_access('pricing.providers', 'delete'));

create policy "active_select_opportunities"
on opportunities
for select
using (
  public.erp_can_access_opportunity_resource(
    'crm.opportunities.list',
    'view',
    salesperson_id,
    client_id
  )
);

create policy "active_insert_opportunities"
on opportunities
for insert
with check (
  public.erp_can_access_client_resource(
    'crm.clients.record',
    'edit',
    client_id
  )
);

create policy "active_update_opportunities"
on opportunities
for update
using (
  public.erp_can_access_opportunity_resource(
    'crm.opportunities.record',
    'edit',
    salesperson_id,
    client_id
  )
)
with check (
  public.erp_can_access_opportunity_resource(
    'crm.opportunities.record',
    'edit',
    salesperson_id,
    client_id
  )
);

create policy "active_delete_opportunities"
on opportunities
for delete
using (
  public.erp_can_access_opportunity_resource(
    'crm.opportunities.record',
    'delete',
    salesperson_id,
    client_id
  )
);

create policy "active_select_quotations"
on quotations
for select
using (
  public.erp_can_access_crm_quotation_resource(
    'crm.quotations.record',
    'view',
    created_by,
    client_id
  )
  or public.erp_can_access_pricing_quotation(
    'view',
    status,
    pricing_owner_id
  )
  or public.erp_can_access_operations_shipment(
    'view',
    client_id
  )
);

create policy "active_insert_quotations"
on quotations
for insert
with check (public.erp_has_submodule_access('crm.quotations', 'create'));

create policy "active_update_quotations"
on quotations
for update
using (
  public.erp_can_access_crm_quotation_resource(
    'crm.quotations.record',
    'edit',
    created_by,
    client_id
  )
  or public.erp_can_access_crm_quotation_resource(
    'crm.quotations.customer_actions',
    'edit',
    created_by,
    client_id
  )
  or public.erp_can_access_pricing_quotation(
    'edit',
    status,
    pricing_owner_id
  )
)
with check (
  public.erp_can_access_crm_quotation_resource(
    'crm.quotations.record',
    'edit',
    created_by,
    client_id
  )
  or public.erp_can_access_crm_quotation_resource(
    'crm.quotations.customer_actions',
    'edit',
    created_by,
    client_id
  )
  or public.erp_can_access_pricing_quotation(
    'edit',
    status,
    pricing_owner_id
  )
);

create policy "active_delete_quotations"
on quotations
for delete
using (
  public.erp_can_access_crm_quotation_resource(
    'crm.quotations.record',
    'delete',
    created_by,
    client_id
  )
);

create policy "active_select_quotation_options"
on quotation_options
for select
using (
  exists (
    select 1
    from quotations q
    where q.id = quotation_options.quotation_id
      and (
        public.erp_has_resource_access(
          'pricing.quotations.cost_section',
          'view',
          q.pricing_owner_id,
          null
        )
        or public.erp_can_access_crm_quotation_resource(
          'crm.quotations.pricing_options',
          'view',
          q.created_by,
          q.client_id
        )
      )
  )
);

create policy "active_update_quotation_options"
on quotation_options
for update
using (
  exists (
    select 1
    from quotations q
    where q.id = quotation_options.quotation_id
      and public.erp_can_access_crm_quotation_resource(
        'crm.quotations.customer_actions',
        'edit',
        q.created_by,
        q.client_id
      )
  )
)
with check (
  exists (
    select 1
    from quotations q
    where q.id = quotation_options.quotation_id
      and public.erp_can_access_crm_quotation_resource(
        'crm.quotations.customer_actions',
        'edit',
        q.created_by,
        q.client_id
      )
  )
);

create policy "active_select_quotation_costs"
on quotation_costs
for select
using (
  exists (
    select 1
    from quotations q
    where q.id = quotation_costs.quotation_id
      and (
        public.erp_has_resource_access(
          'pricing.quotations.cost_section',
          'view',
          q.pricing_owner_id,
          null
        )
        or public.erp_can_access_crm_quotation_resource(
          'crm.quotations.pricing_options',
          'view',
          q.created_by,
          q.client_id
        )
      )
  )
);

create policy "active_insert_quotation_costs"
on quotation_costs
for insert
with check (
  exists (
    select 1
    from quotations q
    where q.id = quotation_costs.quotation_id
      and public.erp_has_resource_access(
        'pricing.quotations.cost_section',
        'create',
        q.pricing_owner_id,
        null
      )
  )
);

create policy "active_update_quotation_costs"
on quotation_costs
for update
using (
  exists (
    select 1
    from quotations q
    where q.id = quotation_costs.quotation_id
      and public.erp_has_resource_access(
        'pricing.quotations.cost_section',
        'edit',
        q.pricing_owner_id,
        null
      )
  )
)
with check (
  exists (
    select 1
    from quotations q
    where q.id = quotation_costs.quotation_id
      and public.erp_has_resource_access(
        'pricing.quotations.cost_section',
        'edit',
        q.pricing_owner_id,
        null
      )
  )
);

create policy "active_delete_quotation_costs"
on quotation_costs
for delete
using (
  exists (
    select 1
    from quotations q
    where q.id = quotation_costs.quotation_id
      and public.erp_has_resource_access(
        'pricing.quotations.cost_section',
        'delete',
        q.pricing_owner_id,
        null
      )
  )
);

create policy "active_select_quotation_cargo_lines"
on quotation_cargo_lines
for select
using (
  exists (
    select 1
    from quotations q
    where q.id = quotation_cargo_lines.quotation_id
      and (
        public.erp_can_access_crm_quotation_resource(
          'crm.quotations.record',
          'view',
          q.created_by,
          q.client_id
        )
        or public.erp_can_access_pricing_quotation(
          'view',
          q.status,
          q.pricing_owner_id
        )
      )
  )
);

create policy "active_insert_quotation_cargo_lines"
on quotation_cargo_lines
for insert
with check (
  exists (
    select 1
    from quotations q
    where q.id = quotation_cargo_lines.quotation_id
      and public.erp_can_access_crm_quotation_resource(
        'crm.quotations.record',
        'edit',
        q.created_by,
        q.client_id
      )
  )
);

create policy "active_update_quotation_cargo_lines"
on quotation_cargo_lines
for update
using (
  exists (
    select 1
    from quotations q
    where q.id = quotation_cargo_lines.quotation_id
      and public.erp_can_access_crm_quotation_resource(
        'crm.quotations.record',
        'edit',
        q.created_by,
        q.client_id
      )
  )
)
with check (
  exists (
    select 1
    from quotations q
    where q.id = quotation_cargo_lines.quotation_id
      and public.erp_can_access_crm_quotation_resource(
        'crm.quotations.record',
        'edit',
        q.created_by,
        q.client_id
      )
  )
);

create policy "active_delete_quotation_cargo_lines"
on quotation_cargo_lines
for delete
using (
  exists (
    select 1
    from quotations q
    where q.id = quotation_cargo_lines.quotation_id
      and public.erp_can_access_crm_quotation_resource(
        'crm.quotations.record',
        'delete',
        q.created_by,
        q.client_id
      )
  )
);

create policy "active_select_quotation_rejection_reasons"
on quotation_rejection_reasons
for select
using (public.erp_is_authenticated_active_user());

create policy "active_insert_quotation_rejection_reasons"
on quotation_rejection_reasons
for insert
with check (public.erp_has_submodule_access('master_data.sales.rejection_reasons', 'create'));

create policy "active_update_quotation_rejection_reasons"
on quotation_rejection_reasons
for update
using (public.erp_has_submodule_access('master_data.sales.rejection_reasons', 'edit'))
with check (public.erp_has_submodule_access('master_data.sales.rejection_reasons', 'edit'));

create policy "active_delete_quotation_rejection_reasons"
on quotation_rejection_reasons
for delete
using (public.erp_has_submodule_access('master_data.sales.rejection_reasons', 'delete'));


-- =========================================
-- OPERATIONS / FINANCE
-- =========================================

alter table shipments enable row level security;
alter table shipment_events enable row level security;
alter table client_invoices enable row level security;
alter table provider_invoices enable row level security;
alter table commissions enable row level security;
alter table shipments force row level security;
alter table shipment_events force row level security;
alter table client_invoices force row level security;
alter table provider_invoices force row level security;
alter table commissions force row level security;

create policy "active_select_shipments"
on shipments
for select
using (
  public.erp_can_access_operations_shipment(
    'view',
    client_id
  )
  or public.erp_can_access_crm_quotation_resource(
    'crm.quotations.customer_actions',
    'view',
    (
      select q.created_by
      from quotations q
      where q.id = shipments.quotation_id
    ),
    client_id
  )
);

create policy "active_insert_shipments"
on shipments
for insert
with check (
  public.erp_can_access_operations_shipment(
    'create',
    client_id
  )
);

create policy "active_update_shipments"
on shipments
for update
using (
  public.erp_can_access_operations_shipment(
    'edit',
    client_id
  )
)
with check (
  public.erp_can_access_operations_shipment(
    'edit',
    client_id
  )
);

create policy "active_delete_shipments"
on shipments
for delete
using (
  public.erp_can_access_operations_shipment(
    'delete',
    client_id
  )
);

create policy "active_select_shipment_events"
on shipment_events
for select
using (
  exists (
    select 1
    from shipments s
    where s.id = shipment_events.shipment_id
      and public.erp_can_access_operations_shipment(
        'view',
        s.client_id
      )
  )
);

create policy "active_insert_shipment_events"
on shipment_events
for insert
with check (
  exists (
    select 1
    from shipments s
    where s.id = shipment_events.shipment_id
      and public.erp_can_access_operations_shipment(
        'create',
        s.client_id
      )
  )
);

create policy "active_update_shipment_events"
on shipment_events
for update
using (
  exists (
    select 1
    from shipments s
    where s.id = shipment_events.shipment_id
      and public.erp_can_access_operations_shipment(
        'edit',
        s.client_id
      )
  )
)
with check (
  exists (
    select 1
    from shipments s
    where s.id = shipment_events.shipment_id
      and public.erp_can_access_operations_shipment(
        'edit',
        s.client_id
      )
  )
);

create policy "active_delete_shipment_events"
on shipment_events
for delete
using (
  exists (
    select 1
    from shipments s
    where s.id = shipment_events.shipment_id
      and public.erp_can_access_operations_shipment(
        'delete',
        s.client_id
      )
  )
);

create policy "active_select_client_invoices"
on client_invoices
for select
using (
  public.erp_has_module_access('finance', 'view')
  or public.erp_is_admin()
);

create policy "active_insert_client_invoices"
on client_invoices
for insert
with check (
  public.erp_has_module_access('finance', 'create')
  or public.erp_is_admin()
);

create policy "active_update_client_invoices"
on client_invoices
for update
using (
  public.erp_has_module_access('finance', 'edit')
  or public.erp_is_admin()
)
with check (
  public.erp_has_module_access('finance', 'edit')
  or public.erp_is_admin()
);

create policy "active_delete_client_invoices"
on client_invoices
for delete
using (
  public.erp_has_module_access('finance', 'delete')
  or public.erp_is_admin()
);

create policy "active_select_provider_invoices"
on provider_invoices
for select
using (
  public.erp_has_module_access('finance', 'view')
  or public.erp_is_admin()
);

create policy "active_insert_provider_invoices"
on provider_invoices
for insert
with check (
  public.erp_has_module_access('finance', 'create')
  or public.erp_is_admin()
);

create policy "active_update_provider_invoices"
on provider_invoices
for update
using (
  public.erp_has_module_access('finance', 'edit')
  or public.erp_is_admin()
)
with check (
  public.erp_has_module_access('finance', 'edit')
  or public.erp_is_admin()
);

create policy "active_delete_provider_invoices"
on provider_invoices
for delete
using (
  public.erp_has_module_access('finance', 'delete')
  or public.erp_is_admin()
);

create policy "active_select_commissions"
on commissions
for select
using (
  public.erp_has_module_access('finance', 'view')
  or public.erp_is_admin()
);

create policy "active_insert_commissions"
on commissions
for insert
with check (
  public.erp_has_module_access('finance', 'create')
  or public.erp_is_admin()
);

create policy "active_update_commissions"
on commissions
for update
using (
  public.erp_has_module_access('finance', 'edit')
  or public.erp_is_admin()
)
with check (
  public.erp_has_module_access('finance', 'edit')
  or public.erp_is_admin()
);

create policy "active_delete_commissions"
on commissions
for delete
using (
  public.erp_has_module_access('finance', 'delete')
  or public.erp_is_admin()
);


-- =========================================
-- WORKSPACE PREFERENCES
-- =========================================

alter table workspace_saved_views enable row level security;
alter table workspace_saved_views force row level security;

create policy "active_select_workspace_saved_views"
on workspace_saved_views
for select
using (
  public.erp_is_authenticated_active_user()
  and owner_user_id = public.erp_current_user_id()
);

create policy "active_insert_workspace_saved_views"
on workspace_saved_views
for insert
with check (
  public.erp_is_authenticated_active_user()
  and owner_user_id = public.erp_current_user_id()
);

create policy "active_update_workspace_saved_views"
on workspace_saved_views
for update
using (
  public.erp_is_authenticated_active_user()
  and owner_user_id = public.erp_current_user_id()
)
with check (
  public.erp_is_authenticated_active_user()
  and owner_user_id = public.erp_current_user_id()
);

create policy "active_delete_workspace_saved_views"
on workspace_saved_views
for delete
using (
  public.erp_is_authenticated_active_user()
  and owner_user_id = public.erp_current_user_id()
);


-- =========================================
-- COMMUNICATIONS
-- =========================================

alter table mailboxes enable row level security;
alter table mailbox_role_access enable row level security;
alter table mail_threads enable row level security;
alter table mail_messages enable row level security;
alter table mail_entity_links enable row level security;
alter table mail_sync_runs enable row level security;

alter table mailboxes force row level security;
alter table mailbox_role_access force row level security;
alter table mail_threads force row level security;
alter table mail_messages force row level security;
alter table mail_entity_links force row level security;
alter table mail_sync_runs force row level security;

create policy "active_select_mailboxes"
on mailboxes
for select
using (
  public.erp_can_access_mailbox(id, 'view')
  or public.erp_can_manage_mailboxes()
);

create policy "admin_insert_mailboxes"
on mailboxes
for insert
with check (public.erp_can_manage_mailboxes());

create policy "admin_update_mailboxes"
on mailboxes
for update
using (public.erp_can_manage_mailboxes())
with check (public.erp_can_manage_mailboxes());

create policy "admin_delete_mailboxes"
on mailboxes
for delete
using (public.erp_can_manage_mailboxes());

create policy "admin_select_mailbox_role_access"
on mailbox_role_access
for select
using (public.erp_can_manage_mailboxes());

create policy "admin_insert_mailbox_role_access"
on mailbox_role_access
for insert
with check (public.erp_can_manage_mailboxes());

create policy "admin_update_mailbox_role_access"
on mailbox_role_access
for update
using (public.erp_can_manage_mailboxes())
with check (public.erp_can_manage_mailboxes());

create policy "admin_delete_mailbox_role_access"
on mailbox_role_access
for delete
using (public.erp_can_manage_mailboxes());

create policy "active_select_mail_threads"
on mail_threads
for select
using (public.erp_can_access_mailbox(mailbox_id, 'view'));

create policy "admin_insert_mail_threads"
on mail_threads
for insert
with check (public.erp_can_manage_mailboxes());

create policy "admin_update_mail_threads"
on mail_threads
for update
using (public.erp_can_manage_mailboxes())
with check (public.erp_can_manage_mailboxes());

create policy "admin_delete_mail_threads"
on mail_threads
for delete
using (public.erp_can_manage_mailboxes());

create policy "active_select_mail_messages"
on mail_messages
for select
using (public.erp_can_access_mailbox(mailbox_id, 'view'));

create policy "admin_insert_mail_messages"
on mail_messages
for insert
with check (public.erp_can_manage_mailboxes());

create policy "admin_update_mail_messages"
on mail_messages
for update
using (public.erp_can_manage_mailboxes())
with check (public.erp_can_manage_mailboxes());

create policy "admin_delete_mail_messages"
on mail_messages
for delete
using (public.erp_can_manage_mailboxes());

create policy "active_select_mail_entity_links"
on mail_entity_links
for select
using (public.erp_can_access_mailbox(mailbox_id, 'view'));

create policy "admin_insert_mail_entity_links"
on mail_entity_links
for insert
with check (public.erp_can_manage_mailboxes());

create policy "admin_update_mail_entity_links"
on mail_entity_links
for update
using (public.erp_can_manage_mailboxes())
with check (public.erp_can_manage_mailboxes());

create policy "admin_delete_mail_entity_links"
on mail_entity_links
for delete
using (public.erp_can_manage_mailboxes());

create policy "active_select_mail_sync_runs"
on mail_sync_runs
for select
using (
  public.erp_can_access_mailbox(mailbox_id, 'view')
  or public.erp_can_manage_mailboxes()
);

create policy "admin_insert_mail_sync_runs"
on mail_sync_runs
for insert
with check (public.erp_can_manage_mailboxes());

create policy "admin_update_mail_sync_runs"
on mail_sync_runs
for update
using (public.erp_can_manage_mailboxes())
with check (public.erp_can_manage_mailboxes());

create policy "admin_delete_mail_sync_runs"
on mail_sync_runs
for delete
using (public.erp_can_manage_mailboxes());


-- =========================================
-- OBSERVABILITY
-- =========================================

alter table audit_logs enable row level security;
alter table automation_logs enable row level security;
alter table audit_logs force row level security;
alter table automation_logs force row level security;

create policy "admin_select_audit_logs"
on audit_logs
for select
using (public.erp_is_admin());

create policy "active_insert_audit_logs"
on audit_logs
for insert
with check (public.erp_is_authenticated_active_user());

create policy "admin_select_automation_logs"
on automation_logs
for select
using (public.erp_is_admin());

create policy "active_insert_automation_logs"
on automation_logs
for insert
with check (public.erp_is_authenticated_active_user());


-- =========================================
-- PRIVILEGE HARDENING
-- =========================================

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

revoke execute on all functions in schema public from anon;
grant execute on all functions in schema public to authenticated;
grant execute on function public.resolve_login_identity(text) to anon;
grant execute on function public.erp_current_branch_id() to authenticated;
grant execute on function public.erp_current_role_id() to authenticated;
grant execute on function public.erp_has_role(text) to authenticated;
grant execute on function public.erp_condition_allows(text, uuid, uuid) to authenticated;
grant execute on function public.erp_access_scope(text, text) to authenticated;
grant execute on function public.erp_has_resource_access(text, text, uuid, uuid) to authenticated;
grant execute on function public.erp_has_module_access(text, text) to authenticated;
grant execute on function public.erp_has_submodule_access(text, text) to authenticated;
grant execute on function public.erp_can_manage_mailboxes() to authenticated;
grant execute on function public.erp_can_access_mailbox(uuid, text) to authenticated;
grant execute on function public.erp_has_field_access(text, text, text, uuid, uuid) to authenticated;
grant execute on function public.erp_can_access_client_resource(text, text, uuid) to authenticated;
grant execute on function public.erp_can_access_opportunity_resource(text, text, uuid, uuid) to authenticated;
grant execute on function public.erp_can_access_crm_quotation_resource(text, text, uuid, uuid) to authenticated;
grant execute on function public.erp_can_access_pricing_quotation(text, text, uuid) to authenticated;
grant execute on function public.erp_can_access_operations_shipment(text, uuid) to authenticated;
grant execute on function public.erp_can_view_quotation_cost() to authenticated;
grant execute on function public.erp_can_edit_quotation_purchase_amount() to authenticated;
grant execute on function public.erp_can_view_quotation_sale_price() to authenticated;
grant execute on function public.erp_can_edit_quotation_sale_price() to authenticated;
grant execute on function public.erp_can_view_quotation_expected_profit() to authenticated;
grant execute on function public.erp_can_access_route(text, text) to authenticated;
grant execute on function public.get_current_navigation_items() to authenticated;
