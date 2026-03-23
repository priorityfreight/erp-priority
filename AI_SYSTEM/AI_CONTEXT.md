# Priority Logistics ERP – AI Context

This file is the highest-level context document for AI-assisted development in this repository.

Read this file first, then follow:

1. AI_SYSTEM_MAP.md
2. AI_CURRENT_PROJECT_MAP.md
3. database governance documents
4. module, UI, and automation rules


--------------------------------------------------
SYSTEM PURPOSE
--------------------------------------------------

Priority Logistics ERP is a freight forwarding CRM + ERP platform.

Canonical business flow:

Prospects
→ Clients
→ Opportunities
→ Quotations
→ Shipments
→ Finance

The database supports the full business flow.
The current frontend only implements a subset of that flow.


--------------------------------------------------
CURRENT IMPLEMENTATION STATUS
--------------------------------------------------

Implemented in the live frontend:

- login access gate
- dashboard shell
- master data users
- clients
- client detail
- contacts
- opportunities
- opportunity detail
- pricing/providers
- pricing/providers detail
- master data
- UN/LOCODE lookup

Planned in the canonical database but not implemented as frontend modules yet:

- quotations
- shipments
- client invoices
- provider invoices
- commissions
- advanced reporting

AI must treat planned modules as real database domains but not as live frontend routes unless those routes actually exist.


--------------------------------------------------
CANONICAL SOURCES OF TRUTH
--------------------------------------------------

Database structure:

- supabase/ERP_schema.sql
- supabase/migrations/20260307000432_initial_erp_schema.sql

Database business logic:

- supabase/ERP_functions.sql
- supabase/ERP_triggers.sql
- supabase/ERP_views.sql

Frontend data access:

- frontend/src/lib/db/

Frontend type contract:

- frontend/src/types/supabase.ts

AI governance:

- AI_SYSTEM/


--------------------------------------------------
REPOSITORY ARCHITECTURE
--------------------------------------------------

Current application structure:

frontend/app/
frontend/src/components/layout/
frontend/src/lib/db/
frontend/src/types/
master_data/
supabase/
AI_SYSTEM/

Current live route files:

- frontend/app/login/page.tsx
- frontend/app/page.tsx
- frontend/app/dashboard/page.tsx
- frontend/app/clients/page.tsx
- frontend/app/clients/[id]/page.tsx
- frontend/app/contacts/page.tsx
- frontend/app/opportunities/page.tsx
- frontend/app/opportunities/[id]/page.tsx
- frontend/app/pricing/providers/page.tsx
- frontend/app/pricing/providers/[id]/page.tsx
- frontend/app/master-data/page.tsx
- frontend/app/master-data/users/page.tsx
- frontend/app/master-data/unlocode/page.tsx

Current shared layout components:

- frontend/src/components/layout/AppLayout.tsx
- frontend/src/components/layout/Sidebar.tsx
- frontend/src/components/layout/Topbar.tsx
- frontend/src/components/layout/PageContainer.tsx
- frontend/proxy.ts

Current database modules:

- frontend/src/lib/db/clients.ts
- frontend/src/lib/db/contacts.ts
- frontend/src/lib/db/opportunities.ts
- frontend/src/lib/db/providers.ts
- frontend/src/lib/db/masterData.ts
- frontend/src/lib/db/users.ts


--------------------------------------------------
CANONICAL DATABASE DOMAINS
--------------------------------------------------

Organization:

- branches
- roles
- users
- users is the ERP profile directory, not the password store
- passwords and sessions are handled by Supabase Auth
- roles are currently:
  Ventas, Pricing, Operaciones, Admin

CRM:

- prospects
- clients
- contacts

Commercial:

- providers
- incoterms
- opportunities
- quotations
- quotation_costs

Master Data:

- external_data_sources
- unlocodes
- service_transport_types

Operations:

- shipments
- shipment_events

Finance:

- client_invoices
- provider_invoices
- commissions

Observability:

- audit_logs
- automation_logs


--------------------------------------------------
IMPLEMENTED FRONTEND MODULES
--------------------------------------------------

Clients

- list page uses client_overview_view
- detail page uses get_client_full()
- create uses create_client_with_contacts()
- delete uses soft_delete_client()
- list supports search, sorting, pagination, and direct row actions
- detail page manages linked contacts, consignee and shipper records, and linked opportunities
- extended client fields now persist directly in the canonical backend:
  website, corporate_phone, status, full_address, postal_code, city, city_unlocode, account_owner_id
- account_owner_id is the canonical seller owner of the client account
- client logistics records are stored separately from the client profile and support:
  party_type, name, full_address, postal_code, city_unlocode, contact_name, contact_email, contact_phone

Contacts

- list page uses client_contacts_view
- create uses add_contact_to_client()
- canonical contact fields include:
  name, position, phone, linkedin_url, email, status, created_at, updated_at
- phone is used as direct phone and may generate a WhatsApp deep link
- WhatsApp links must normalize captured phone numbers to international format
- when a direct phone is captured as a local 10-digit Mexico number, the UI should normalize it with country code 52
- contact statuses are:
  activo
  ya_no_trabaja
- email validation inside the ERP is limited to format validation unless an external verification service is added

Opportunities

- list page uses open_opportunities_view
- create uses create_opportunity()
- detail page reads opportunities plus client relation
- status lifecycle is:
  investigando
  confirmado
  cotizando
  aceptado
  rechazada
  vencida
- opportunity information fields are:
  client_id
  salesperson_id
  service_type
  transport_type
  origin_unlocode
  destination_unlocode
- opportunity breakdown fields are:
  expected_profit_usd
  service_quantity
  estimated_value
- date fields are:
  created_at
  start_date
  expiration_date
- estimated_value must be calculated as expected_profit_usd * service_quantity
- start_date defaults from created_at and must reset when an expired opportunity is reactivated
- expiration_date must be the last day of the month, six months after start_date
- opportunities must use UN/LOCODE for origin and destination standardization
- transport type must be filtered by the selected service type from master data
- salesperson_id inherits from clients.account_owner_id by default on opportunity creation

Master Data

- Users directory is an admin-only submodule under Master Data
- the users module manages:
  name, role, email, phone, username, password provisioning, active/inactive status
- password creation and updates must be executed through a protected server path using the service role key
- UN/LOCODE lookup uses unlocode_lookup_view and search_unlocodes()
- the canonical UN/LOCODE contract for all modules is:
  unlocodes + unlocode_lookup_view + search_unlocodes()
- clients, providers, and opportunities now persist gradual strong references to UN/LOCODE rows while keeping compatible text codes
- UN/LOCODE snapshot fallback remains only as temporary rollback safety and must not be extended as a permanent product path
- no module should use free-text origin, destination, or city fields as the source of truth when a UN/LOCODE selection exists
- the next backend optimization for UN/LOCODE must preserve the same frontend contract while improving indexing and ranking
- the linked Supabase dev backend already contains the imported UN/LOCODE dataset


--------------------------------------------------
PRICING MODULE
--------------------------------------------------

Pricing

- Pricing is the provider sourcing and rate foundation module
- the first live submodule is Providers
- Provider Contacts are managed from the provider detail screen
- provider status is controlled from the top-level header, outside the popup edit form

Provider sections:

- Informacion de la empresa
- Ubicacion de la empresa
- Tipos de servicio que ofrece
- Credito y cobranza
- Terminos y condiciones por tipo de servicio
- Contactos de proveedor

Provider company fields:

- status values:
  en_proceso_de_alta, activo, inactivo
- name
- tax_id
- provider_type
- corporate_phone
- company_email
- website
- full_address
- postal_code
- city_unlocode
- city
- country
- credit_active
- credit_amount
- credit_days

Provider service rules:

- a provider may offer multiple service and transport combinations
- offered services must be selected from MASTER DATA / Sales / Service Types
- transport types must remain filtered by the selected service type
- terms and conditions must be stored per provider service type, not as one global free-text field

Provider contact fields:

- provider_id
- name
- email
- phone
- linkedin_url
- position
- status
- created_at
- updated_at

Provider contact rules:

- email validation inside the ERP is limited to format validation unless an external verification service is integrated
- phone should generate a WhatsApp deep link after international normalization
- LinkedIn must validate as a linkedin.com URL

Implemented pricing backend objects:

- providers
- provider_contacts
- provider_service_offerings
- provider_overview_view
- provider_contacts_view
- provider_service_offering_view
- create_provider()
- add_contact_to_provider()
- get_provider_full()
- search_providers()


--------------------------------------------------
DATA ACCESS RULES
--------------------------------------------------

The frontend must not query Supabase directly from page components.

All queries must go through:

frontend/src/lib/db/

Priority order:

1. analytics views for list and summary screens
2. database functions for creates, workflow actions, and soft deletes
3. tables only for simple detail reads where no canonical view or function exists

Do not invent legacy fields such as:

- clients.name
- quotations.client_name
- shipments.client_id unless confirmed in the schema


--------------------------------------------------
MODULE INVENTORY RULE
--------------------------------------------------

Do not add navigation links, imports, or route references for modules that are not implemented.

Before treating a module as live in the frontend, verify all three exist:

1. route file under frontend/app/
2. query module under frontend/src/lib/db/
3. reachable navigation entry if the module should be user-visible


--------------------------------------------------
CURRENT UI REALITY
--------------------------------------------------

The current UI is a simple shell, not the full target ERP experience.

Present today:

- left sidebar
- top bar with page title and placeholder search affordance
- page container layout
- CRUD-oriented list and detail screens for CRM modules

Not implemented yet:

- global search behavior
- notifications
- quotations UI
- shipments UI
- invoices UI
- full dashboard analytics

AI must not describe these as complete unless the code exists.


--------------------------------------------------
AI SAFETY RULES
--------------------------------------------------

The AI must never:

1. describe planned modules as implemented modules
2. add raw write queries when a canonical function already exists
3. create UI routes that are linked in navigation before the module is actually built
4. modify schema-level objects without updating the matching AI database documents
5. assume autogenerated Supabase types are current without checking frontend/src/types/supabase.ts
6. add public datasets without recording provenance and import rules in AI_MASTER_DATA.md


--------------------------------------------------
WHEN CHANGING THE SYSTEM
--------------------------------------------------

If database structure changes:

- update ERP_schema.sql
- update migration baseline if it is still the canonical bootstrap
- update AI_DATABASE_MAP.md
- update AI_DATABASE_RELATION_GRAPH.md
- update AI_TABLE_DICTIONARY.md
- update AI_QUERY_GUIDE.md
- refresh frontend/src/types/supabase.ts

If frontend module inventory changes:

- update AI_CONTEXT.md
- update AI_CURRENT_PROJECT_MAP.md
- update AI_SYSTEM_MAP.md if the document set changes
- update navigation only when the route is ready


--------------------------------------------------
SUMMARY
--------------------------------------------------

The database models a broader ERP than the current frontend exposes.

For AI generation in this repository:

- trust the canonical SQL and aligned AI database docs for domain truth
- trust AI_CURRENT_PROJECT_MAP.md for what exists in code right now
- treat quotations, shipments, and finance UI as planned work until implemented
- access to all live ERP routes is protected before homepage through the login gate
- login accepts username or email plus password
- only users with an active ERP profile in public.users may continue past login
- public.users stores profile, role, username, phone, and active status
- passwords must never be stored in public.users or any other ERP business table
- first-user bootstrap currently requires creating the auth user in Supabase Auth and activating the matching public.users profile
