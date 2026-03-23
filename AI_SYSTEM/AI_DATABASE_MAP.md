# ERP DATABASE MAP

This document describes the canonical database structure for the Priority Logistics ERP.

Canonical source:

supabase/ERP_schema.sql

Supporting execution files:

supabase/ERP_functions.sql
supabase/ERP_views.sql
supabase/ERP_triggers.sql
supabase/ERP_policies.sql


--------------------------------------------------
CORE DOMAIN TABLES
--------------------------------------------------

Master Data

external_data_sources
unlocodes
service_transport_types


CRM

branches
roles
users
prospects
clients
contacts


Commercial

providers
provider_contacts
provider_service_offerings
incoterms
opportunities
quotations
quotation_costs


Operations

shipments
shipment_events


Finance

client_invoices
provider_invoices
commissions


Observability

audit_logs
automation_logs


--------------------------------------------------
PRIMARY BUSINESS FLOW
--------------------------------------------------

Prospect
 → Client
 → Opportunity
 → Quotation
 → Shipment
 → Client Invoice
 → Commission / Profit Review


Support relationships

External Data Source
 → UN/LOCODE rows

Client
 → Contacts

Quotation
 → Provider Costs

Provider
 → Provider Contacts

Provider
 → Provider Service Offerings

Shipment
 → Shipment Events

Shipment
 → Provider Invoice


--------------------------------------------------
KEY RELATIONSHIPS
--------------------------------------------------

users.role_id → roles.id
users.branch_id → branches.id
users.auth_user_id → auth.users.id

unlocodes.source_id → external_data_sources.id
clients.city_unlocode → unlocodes.unlocode (logical reference, not yet a foreign key)
clients.city_unlocode_id → unlocodes.id
providers.city_unlocode → unlocodes.unlocode (logical reference, not yet a foreign key)
providers.city_unlocode_id → unlocodes.id
opportunities.origin_unlocode → unlocodes.unlocode (logical reference, not yet a foreign key)
opportunities.origin_unlocode_id → unlocodes.id
opportunities.destination_unlocode → unlocodes.unlocode (logical reference, not yet a foreign key)
opportunities.destination_unlocode_id → unlocodes.id

prospects.branch_id → branches.id

clients.prospect_id → prospects.id
clients.branch_id → branches.id
clients.account_owner_id → users.id

contacts.client_id → clients.id

provider_contacts.provider_id → providers.id
provider_service_offerings.provider_id → providers.id
provider_service_offerings.service_transport_type_id → service_transport_types.id

opportunities.client_id → clients.id
opportunities.salesperson_id → users.id

quotations.client_id → clients.id
quotations.opportunity_id → opportunities.id
quotations.created_by → users.id
quotations.incoterm_id → incoterms.id

quotation_costs.quotation_id → quotations.id
quotation_costs.provider_id → providers.id

shipments.quotation_id → quotations.id
shipments.client_id → clients.id

shipment_events.shipment_id → shipments.id

client_invoices.shipment_id → shipments.id
client_invoices.client_id → clients.id

provider_invoices.provider_id → providers.id
provider_invoices.shipment_id → shipments.id

commissions.shipment_id → shipments.id
commissions.user_id → users.id


--------------------------------------------------
DEPENDENCY CHAIN
--------------------------------------------------

Level 1

branches
roles
external_data_sources
incoterms
providers


Level 2

users
unlocodes
service_transport_types
prospects
provider_contacts
provider_service_offerings


Level 3

clients


Level 4

contacts
opportunities


Level 5

quotations


Level 6

quotation_costs
shipments


Level 7

shipment_events
client_invoices
provider_invoices
commissions


Level 8

audit_logs
automation_logs


--------------------------------------------------
DATABASE FUNCTIONS
--------------------------------------------------

create_client_with_contacts()
Creates a client and optional contacts in one transaction.

resolve_login_identity()
Resolves a username or email login value into the canonical email used by Supabase Auth.
This function exists only to support username-based ERP login without storing passwords in public.users.

link_current_auth_user()
Links the current Supabase Auth identity to the matching ERP user profile by email when allowed.

get_current_erp_user()
Returns the active ERP user profile for the current authenticated session.

create_erp_user_profile()
Creates an ERP user profile from the admin-managed users directory.

update_erp_user_profile()
Updates an ERP user profile from the admin-managed users directory.

erp_is_authenticated_active_user()
Security helper used by RLS to allow access only to authenticated active ERP users.

erp_is_admin()
Security helper used by RLS for admin-only tables and writes.

add_contact_to_client()
Adds a contact to an existing client.

add_client_logistics_party()
Adds a consignee / shipper / AA record to an existing client.

create_opportunity()
Creates a new sales opportunity.

update_opportunity_status()
Updates opportunity lifecycle status.

Opportunity lifecycle statuses:
investigando
confirmado
cotizando
aceptado
rechazada
vencida

convert_opportunity_to_quotation()
Creates a quotation from an opportunity.

approve_quotation()
Approves a quotation.

create_shipment()
Creates a shipment from a quotation.

update_shipment_status()
Updates shipment lifecycle status.

mark_shipment_delivered()
Marks a shipment as delivered.

get_client_full()
Returns a full client profile with related records.

delete_client_logistics_party()
Deletes a consignee / shipper / AA record from a client.

soft_delete_client()
Soft deletes a client record.

search_clients()
Searches active clients by company, website, country, or city.
The canonical implementation uses clients.search_text plus ranked matching and active-client filtering.

search_unlocodes()
Searches UN/LOCODE rows by code, name, country, subdivision, or IATA code through the canonical reusable lookup contract.
The backend implementation uses hybrid indexing: B-tree for exact and filterable fields, plus pg_trgm-backed search_text matching for partial lookup.

create_provider()
Creates a provider with the canonical pricing company fields.

add_contact_to_provider()
Adds a contact to an existing provider.

get_provider_full()
Returns a provider profile with related contacts and offered services.

search_providers()
Searches provider rows by name, type, city, country, or company email.

create_service_transport_type()
Creates a sales master data row for service type and transport type.

update_service_transport_type()
Updates a sales master data row for service type and transport type.

delete_service_transport_type()
Deletes a sales master data row for service type and transport type.


--------------------------------------------------
ANALYTICS VIEWS
--------------------------------------------------

client_overview_view
Client summary view including canonical account owner reference and display name.
The canonical implementation must use aggregated joins, not repeated per-client correlated subqueries, once CRM volume grows.
sales_pipeline_view
open_opportunities_view
Canonical opportunity list and summary view with client, service, transport, owner, lane, values, and effective lifecycle status.
quotation_summary_view
active_shipments_view
delivered_shipments_view
client_revenue_view
monthly_sales_view
shipment_activity_view
client_contacts_view
provider_overview_view
provider_contacts_view
provider_service_offering_view
service_transport_type_lookup_view


--------------------------------------------------
AUTOMATION LAYER
--------------------------------------------------

quotation_approved_trigger
When a quotation becomes approved, create a shipment automatically.

shipment_reference_trigger
Generates shipment references before insert.

quotation_reference_trigger
Generates quotation references before insert.

audit triggers
Write insert, update, and delete activity to audit_logs.

opportunity lifecycle automation
Calculates estimated value, start date, expiration date, and expired lifecycle behavior.


--------------------------------------------------
MODIFICATION SAFETY RULE
--------------------------------------------------

Before modifying any table:

1. Check foreign key dependencies.
2. Check affected functions, views, and triggers.
3. Update AI_TABLE_DICTIONARY.md.
4. Update AI_DATABASE_RELATION_GRAPH.md.
5. Keep the migration file synchronized with the canonical schema.
