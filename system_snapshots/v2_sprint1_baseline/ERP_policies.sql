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