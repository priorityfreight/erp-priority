-- =========================================
-- ERP SECURITY POLICIES
-- DEVELOPMENT MODE
-- =========================================
-- These policies allow full access while
-- developing the ERP modules.
-- Later they will be replaced with
-- strict multi-tenant security.
-- =========================================



-- =========================================
-- CLIENTS
-- =========================================

alter table clients enable row level security;

create policy "dev_select_clients"
on clients
for select
using (true);

create policy "dev_insert_clients"
on clients
for insert
with check (true);

create policy "dev_update_clients"
on clients
for update
using (true);

create policy "dev_delete_clients"
on clients
for delete
using (true);



-- =========================================
-- CONTACTS
-- =========================================

alter table contacts enable row level security;

create policy "dev_select_contacts"
on contacts
for select
using (true);

create policy "dev_insert_contacts"
on contacts
for insert
with check (true);

create policy "dev_update_contacts"
on contacts
for update
using (true);

create policy "dev_delete_contacts"
on contacts
for delete
using (true);

alter table client_logistics_parties enable row level security;

create policy "dev_select_client_logistics_parties"
on client_logistics_parties
for select
using (true);

create policy "dev_insert_client_logistics_parties"
on client_logistics_parties
for insert
with check (true);

create policy "dev_update_client_logistics_parties"
on client_logistics_parties
for update
using (true);

create policy "dev_delete_client_logistics_parties"
on client_logistics_parties
for delete
using (true);



-- =========================================
-- PROVIDERS
-- =========================================

alter table providers enable row level security;

create policy "dev_select_providers"
on providers
for select
using (true);

create policy "dev_insert_providers"
on providers
for insert
with check (true);

create policy "dev_update_providers"
on providers
for update
using (true);

create policy "dev_delete_providers"
on providers
for delete
using (true);

alter table provider_contacts enable row level security;

create policy "dev_select_provider_contacts"
on provider_contacts
for select
using (true);

create policy "dev_insert_provider_contacts"
on provider_contacts
for insert
with check (true);

create policy "dev_update_provider_contacts"
on provider_contacts
for update
using (true);

create policy "dev_delete_provider_contacts"
on provider_contacts
for delete
using (true);

alter table provider_service_offerings enable row level security;

create policy "dev_select_provider_service_offerings"
on provider_service_offerings
for select
using (true);

create policy "dev_insert_provider_service_offerings"
on provider_service_offerings
for insert
with check (true);

create policy "dev_update_provider_service_offerings"
on provider_service_offerings
for update
using (true);

create policy "dev_delete_provider_service_offerings"
on provider_service_offerings
for delete
using (true);



-- =========================================
-- OPPORTUNITIES
-- =========================================

alter table opportunities enable row level security;

create policy "dev_select_opportunities"
on opportunities
for select
using (true);

create policy "dev_insert_opportunities"
on opportunities
for insert
with check (true);

create policy "dev_update_opportunities"
on opportunities
for update
using (true);

create policy "dev_delete_opportunities"
on opportunities
for delete
using (true);



-- =========================================
-- MASTER DATA
-- =========================================

alter table external_data_sources enable row level security;

create policy "dev_select_external_data_sources"
on external_data_sources
for select
using (true);

create policy "dev_insert_external_data_sources"
on external_data_sources
for insert
with check (true);

create policy "dev_update_external_data_sources"
on external_data_sources
for update
using (true);

create policy "dev_delete_external_data_sources"
on external_data_sources
for delete
using (true);

alter table unlocodes enable row level security;

create policy "dev_select_unlocodes"
on unlocodes
for select
using (true);

create policy "dev_insert_unlocodes"
on unlocodes
for insert
with check (true);

create policy "dev_update_unlocodes"
on unlocodes
for update
using (true);

create policy "dev_delete_unlocodes"
on unlocodes
for delete
using (true);

alter table service_transport_types enable row level security;

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



-- =========================================
-- QUOTATIONS
-- =========================================

alter table quotations enable row level security;

create policy "dev_select_quotations"
on quotations
for select
using (true);

create policy "dev_insert_quotations"
on quotations
for insert
with check (true);

create policy "dev_update_quotations"
on quotations
for update
using (true);

create policy "dev_delete_quotations"
on quotations
for delete
using (true);



-- =========================================
-- SHIPMENTS
-- =========================================

alter table shipments enable row level security;

create policy "dev_select_shipments"
on shipments
for select
using (true);

create policy "dev_insert_shipments"
on shipments
for insert
with check (true);

create policy "dev_update_shipments"
on shipments
for update
using (true);

create policy "dev_delete_shipments"
on shipments
for delete
using (true);



-- =========================================
-- OBSERVABILITY
-- =========================================

alter table audit_logs enable row level security;

create policy "dev_select_audit_logs"
on audit_logs
for select
using (true);

create policy "dev_insert_audit_logs"
on audit_logs
for insert
with check (true);

create policy "dev_update_audit_logs"
on audit_logs
for update
using (true);

create policy "dev_delete_audit_logs"
on audit_logs
for delete
using (true);

alter table automation_logs enable row level security;

create policy "dev_select_automation_logs"
on automation_logs
for select
using (true);

create policy "dev_insert_automation_logs"
on automation_logs
for insert
with check (true);

create policy "dev_update_automation_logs"
on automation_logs
for update
using (true);

create policy "dev_delete_automation_logs"
on automation_logs
for delete
using (true);



-- =========================================
-- NOTES
-- =========================================
-- DEVELOPMENT MODE:
--
-- * All users can read/write everything
-- * Useful for testing modules
-- * Allows adding new columns quickly
-- * Avoids RLS errors during development
--
-- When ERP is stable we will migrate to:
--
-- organization_id based security
-- role-based access
-- user ownership rules
--
-- =========================================
