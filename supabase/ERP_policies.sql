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
alter table branches force row level security;
alter table roles force row level security;
alter table users force row level security;

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


-- =========================================
-- MASTER DATA
-- =========================================

alter table external_data_sources enable row level security;
alter table unlocodes enable row level security;
alter table service_transport_types enable row level security;
alter table incoterms enable row level security;
alter table external_data_sources force row level security;
alter table unlocodes force row level security;
alter table service_transport_types force row level security;
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
using (public.erp_is_authenticated_active_user());

create policy "active_insert_prospects"
on prospects
for insert
with check (public.erp_is_authenticated_active_user());

create policy "active_update_prospects"
on prospects
for update
using (public.erp_is_authenticated_active_user())
with check (public.erp_is_authenticated_active_user());

create policy "active_delete_prospects"
on prospects
for delete
using (public.erp_is_authenticated_active_user());

create policy "active_select_clients"
on clients
for select
using (public.erp_is_authenticated_active_user());

create policy "active_insert_clients"
on clients
for insert
with check (public.erp_is_authenticated_active_user());

create policy "active_update_clients"
on clients
for update
using (public.erp_is_authenticated_active_user())
with check (public.erp_is_authenticated_active_user());

create policy "active_delete_clients"
on clients
for delete
using (public.erp_is_authenticated_active_user());

create policy "active_select_contacts"
on contacts
for select
using (public.erp_is_authenticated_active_user());

create policy "active_insert_contacts"
on contacts
for insert
with check (public.erp_is_authenticated_active_user());

create policy "active_update_contacts"
on contacts
for update
using (public.erp_is_authenticated_active_user())
with check (public.erp_is_authenticated_active_user());

create policy "active_delete_contacts"
on contacts
for delete
using (public.erp_is_authenticated_active_user());

create policy "active_select_client_logistics_parties"
on client_logistics_parties
for select
using (public.erp_is_authenticated_active_user());

create policy "active_insert_client_logistics_parties"
on client_logistics_parties
for insert
with check (public.erp_is_authenticated_active_user());

create policy "active_update_client_logistics_parties"
on client_logistics_parties
for update
using (public.erp_is_authenticated_active_user())
with check (public.erp_is_authenticated_active_user());

create policy "active_delete_client_logistics_parties"
on client_logistics_parties
for delete
using (public.erp_is_authenticated_active_user());


-- =========================================
-- COMMERCIAL / PRICING
-- =========================================

alter table providers enable row level security;
alter table provider_contacts enable row level security;
alter table provider_service_offerings enable row level security;
alter table opportunities enable row level security;
alter table quotations enable row level security;
alter table quotation_costs enable row level security;
alter table providers force row level security;
alter table provider_contacts force row level security;
alter table provider_service_offerings force row level security;
alter table opportunities force row level security;
alter table quotations force row level security;
alter table quotation_costs force row level security;

create policy "active_select_providers"
on providers
for select
using (public.erp_is_authenticated_active_user());

create policy "active_insert_providers"
on providers
for insert
with check (public.erp_is_authenticated_active_user());

create policy "active_update_providers"
on providers
for update
using (public.erp_is_authenticated_active_user())
with check (public.erp_is_authenticated_active_user());

create policy "active_delete_providers"
on providers
for delete
using (public.erp_is_authenticated_active_user());

create policy "active_select_provider_contacts"
on provider_contacts
for select
using (public.erp_is_authenticated_active_user());

create policy "active_insert_provider_contacts"
on provider_contacts
for insert
with check (public.erp_is_authenticated_active_user());

create policy "active_update_provider_contacts"
on provider_contacts
for update
using (public.erp_is_authenticated_active_user())
with check (public.erp_is_authenticated_active_user());

create policy "active_delete_provider_contacts"
on provider_contacts
for delete
using (public.erp_is_authenticated_active_user());

create policy "active_select_provider_service_offerings"
on provider_service_offerings
for select
using (public.erp_is_authenticated_active_user());

create policy "active_insert_provider_service_offerings"
on provider_service_offerings
for insert
with check (public.erp_is_authenticated_active_user());

create policy "active_update_provider_service_offerings"
on provider_service_offerings
for update
using (public.erp_is_authenticated_active_user())
with check (public.erp_is_authenticated_active_user());

create policy "active_delete_provider_service_offerings"
on provider_service_offerings
for delete
using (public.erp_is_authenticated_active_user());

create policy "active_select_opportunities"
on opportunities
for select
using (public.erp_is_authenticated_active_user());

create policy "active_insert_opportunities"
on opportunities
for insert
with check (public.erp_is_authenticated_active_user());

create policy "active_update_opportunities"
on opportunities
for update
using (public.erp_is_authenticated_active_user())
with check (public.erp_is_authenticated_active_user());

create policy "active_delete_opportunities"
on opportunities
for delete
using (public.erp_is_authenticated_active_user());

create policy "active_select_quotations"
on quotations
for select
using (public.erp_is_authenticated_active_user());

create policy "active_insert_quotations"
on quotations
for insert
with check (public.erp_is_authenticated_active_user());

create policy "active_update_quotations"
on quotations
for update
using (public.erp_is_authenticated_active_user())
with check (public.erp_is_authenticated_active_user());

create policy "active_delete_quotations"
on quotations
for delete
using (public.erp_is_authenticated_active_user());

create policy "active_select_quotation_costs"
on quotation_costs
for select
using (public.erp_is_authenticated_active_user());

create policy "active_insert_quotation_costs"
on quotation_costs
for insert
with check (public.erp_is_authenticated_active_user());

create policy "active_update_quotation_costs"
on quotation_costs
for update
using (public.erp_is_authenticated_active_user())
with check (public.erp_is_authenticated_active_user());

create policy "active_delete_quotation_costs"
on quotation_costs
for delete
using (public.erp_is_authenticated_active_user());


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
using (public.erp_is_authenticated_active_user());

create policy "active_insert_shipments"
on shipments
for insert
with check (public.erp_is_authenticated_active_user());

create policy "active_update_shipments"
on shipments
for update
using (public.erp_is_authenticated_active_user())
with check (public.erp_is_authenticated_active_user());

create policy "active_delete_shipments"
on shipments
for delete
using (public.erp_is_authenticated_active_user());

create policy "active_select_shipment_events"
on shipment_events
for select
using (public.erp_is_authenticated_active_user());

create policy "active_insert_shipment_events"
on shipment_events
for insert
with check (public.erp_is_authenticated_active_user());

create policy "active_update_shipment_events"
on shipment_events
for update
using (public.erp_is_authenticated_active_user())
with check (public.erp_is_authenticated_active_user());

create policy "active_delete_shipment_events"
on shipment_events
for delete
using (public.erp_is_authenticated_active_user());

create policy "active_select_client_invoices"
on client_invoices
for select
using (public.erp_is_authenticated_active_user());

create policy "active_insert_client_invoices"
on client_invoices
for insert
with check (public.erp_is_authenticated_active_user());

create policy "active_update_client_invoices"
on client_invoices
for update
using (public.erp_is_authenticated_active_user())
with check (public.erp_is_authenticated_active_user());

create policy "active_delete_client_invoices"
on client_invoices
for delete
using (public.erp_is_authenticated_active_user());

create policy "active_select_provider_invoices"
on provider_invoices
for select
using (public.erp_is_authenticated_active_user());

create policy "active_insert_provider_invoices"
on provider_invoices
for insert
with check (public.erp_is_authenticated_active_user());

create policy "active_update_provider_invoices"
on provider_invoices
for update
using (public.erp_is_authenticated_active_user())
with check (public.erp_is_authenticated_active_user());

create policy "active_delete_provider_invoices"
on provider_invoices
for delete
using (public.erp_is_authenticated_active_user());

create policy "active_select_commissions"
on commissions
for select
using (public.erp_is_authenticated_active_user());

create policy "active_insert_commissions"
on commissions
for insert
with check (public.erp_is_authenticated_active_user());

create policy "active_update_commissions"
on commissions
for update
using (public.erp_is_authenticated_active_user())
with check (public.erp_is_authenticated_active_user());

create policy "active_delete_commissions"
on commissions
for delete
using (public.erp_is_authenticated_active_user());


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
