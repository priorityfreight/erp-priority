
-- =========================================================
-- PRIORITY LOGISTICS ERP
-- CORE DATABASE SCHEMA
-- PostgreSQL / Supabase
-- =========================================================


-- =========================================================
-- EXTENSIONS
-- =========================================================

create extension if not exists "pgcrypto";


-- =========================================================
-- BRANCHES
-- =========================================================

create table branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);


-- =========================================================
-- ROLES
-- =========================================================

create table roles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text
);


-- =========================================================
-- USERS
-- =========================================================

create table users (
  id uuid primary key default gen_random_uuid(),

  first_name text,
  last_name text,
  email text unique not null,

  role_id uuid references roles(id),
  branch_id uuid references branches(id),

  base_salary numeric,

  active boolean default true,

  created_at timestamptz default now(),
  updated_at timestamptz
);


-- =========================================================
-- PROSPECTS
-- =========================================================

create table prospects (
  id uuid primary key default gen_random_uuid(),

  company_name text,
  contact_name text,
  email text,
  phone text,

  branch_id uuid references branches(id),

  created_at timestamptz default now()
);


-- =========================================================
-- CLIENTS
-- =========================================================

create table clients (
  id uuid primary key default gen_random_uuid(),

  company_name text not null,
  tax_id text,

  address text,
  phone text,

  credit_limit numeric,
  credit_days integer,

  created_at timestamptz default now(),
  updated_at timestamptz,

  is_deleted boolean default false
);


-- =========================================================
-- CONTACTS
-- =========================================================

create table contacts (
  id uuid primary key default gen_random_uuid(),

  client_id uuid not null references clients(id) on delete cascade,

  name text not null,
  email text,
  phone text,
  position text,

  created_at timestamptz default now()
);

create index idx_contacts_client
on contacts(client_id);


-- =========================================================
-- PROVIDERS (SUPPLIERS)
-- =========================================================

create table providers (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  country text,
  service_type text,

  credit_terms text,

  created_at timestamptz default now()
);


-- =========================================================
-- OPPORTUNITIES
-- =========================================================

create table opportunities (
  id uuid primary key default gen_random_uuid(),

  client_id uuid references clients(id),
  salesperson_id uuid references users(id),

  trade_lane text,
  service_type text,

  description text,

  probability integer,
  estimated_close_date date,

  created_at timestamptz default now()
);

create index idx_opportunities_client
on opportunities(client_id);


-- =========================================================
-- INCOTERMS
-- =========================================================

create table incoterms (
  id uuid primary key default gen_random_uuid(),

  code text unique not null,
  description text
);


-- =========================================================
-- QUOTATIONS
-- =========================================================

create table quotations (
  id uuid primary key default gen_random_uuid(),

  opportunity_id uuid references opportunities(id),

  created_by uuid references users(id),

  status text,

  service_type text,

  origin text,
  destination text,

  incoterm_id uuid references incoterms(id),

  estimated_cost numeric,
  estimated_price numeric,
  expected_profit numeric,

  created_at timestamptz default now()
);

create index idx_quotations_opportunity
on quotations(opportunity_id);


-- =========================================================
-- QUOTATION COSTS (PROVIDER RATES)
-- =========================================================

create table quotation_costs (
  id uuid primary key default gen_random_uuid(),

  quotation_id uuid references quotations(id),
  provider_id uuid references providers(id),

  service_name text,

  cost numeric,
  currency text,

  created_at timestamptz default now()
);


-- =========================================================
-- SHIPMENTS
-- =========================================================

create table shipments (
  id uuid primary key default gen_random_uuid(),

  quotation_id uuid references quotations(id),

  shipment_reference text unique,

  status text,

  booking_number text,

  created_at timestamptz default now()
);

create index idx_shipments_quotation
on shipments(quotation_id);


-- =========================================================
-- SHIPMENT EVENTS (TRACKING)
-- =========================================================

create table shipment_events (
  id uuid primary key default gen_random_uuid(),

  shipment_id uuid references shipments(id),

  event_type text,
  event_date timestamptz,

  notes text
);

create index idx_shipment_events_shipment
on shipment_events(shipment_id);


-- =========================================================
-- CLIENT INVOICES (ACCOUNTS RECEIVABLE)
-- =========================================================

create table client_invoices (
  id uuid primary key default gen_random_uuid(),

  shipment_id uuid references shipments(id),
  client_id uuid references clients(id),

  total_amount numeric,
  currency text,

  status text,

  created_at timestamptz default now()
);


-- =========================================================
-- PROVIDER INVOICES (ACCOUNTS PAYABLE)
-- =========================================================

create table provider_invoices (
  id uuid primary key default gen_random_uuid(),

  provider_id uuid references providers(id),
  shipment_id uuid references shipments(id),

  total_amount numeric,
  currency text,

  status text,

  created_at timestamptz default now()
);


-- =========================================================
-- COMMISSIONS
-- =========================================================

create table commissions (
  id uuid primary key default gen_random_uuid(),

  shipment_id uuid references shipments(id),
  user_id uuid references users(id),

  expected_profit numeric,
  commission_amount numeric,

  created_at timestamptz default now()
);


-- =========================================================
-- AUDIT LOGS
-- =========================================================

create table audit_logs (
  id uuid primary key default gen_random_uuid(),

  table_name text,
  record_id uuid,

  action text,

  user_id uuid references users(id),

  created_at timestamptz default now()
);
