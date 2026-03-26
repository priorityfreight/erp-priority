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
