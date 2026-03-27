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
- master data users / roles and permissions
- clients
- client detail
- contacts
- opportunities
- opportunity detail
- quotations
- quotation detail
- pricing/providers
- pricing/providers detail
- pricing/quotations
- master data
- UN/LOCODE lookup
- master data / sales / quotation rejection reasons
- master data / accounting / exchange rates

Planned in the canonical database but not implemented as frontend modules yet:

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
- frontend/app/quotations/page.tsx
- frontend/app/quotations/[id]/page.tsx
- frontend/app/quotations/[id]/document/page.tsx
- frontend/app/quotations/[id]/pricing-request/page.tsx
- frontend/app/pricing/providers/page.tsx
- frontend/app/pricing/providers/[id]/page.tsx
- frontend/app/pricing/quotations/page.tsx
- frontend/app/master-data/page.tsx
- frontend/app/master-data/users/page.tsx
- frontend/app/master-data/users/roles/page.tsx
- frontend/app/master-data/sales/service-types/page.tsx
- frontend/app/master-data/sales/accounting-concepts/page.tsx
- frontend/app/master-data/sales/quotation-rejection-reasons/page.tsx
- frontend/app/master-data/accounting/exchange-rates/page.tsx
- frontend/app/master-data/unlocode/page.tsx

Current shared layout components:

- frontend/src/components/layout/AppLayout.tsx
- frontend/src/components/layout/Brand.tsx
- frontend/src/components/layout/Sidebar.tsx
- frontend/src/components/layout/Topbar.tsx
- frontend/src/components/layout/PageContainer.tsx
- frontend/proxy.ts

Current brand assets:

- root source of truth: ASSETS/
- runtime asset copies: frontend/public/assets/

Current database modules:

- frontend/src/lib/db/clients.ts
- frontend/src/lib/db/contacts.ts
- frontend/src/lib/db/opportunities.ts
- frontend/src/lib/db/providers.ts
- frontend/src/lib/db/masterData.ts
- frontend/src/lib/db/users.ts
- frontend/src/lib/db/permissions.ts


--------------------------------------------------
CURRENT QUOTATION NORMALIZATION
--------------------------------------------------

- quotation header records no longer store redundant load-summary fields such as quotation-level commodities, quantity, weight, or volume
- all service types must use quotation_cargo_lines as the canonical load-detail structure
- quotation_options is now the canonical grouping layer for customer-facing commercial options inside a quotation
- one quotation option may contain multiple separate charge lines from different providers and accounting concepts
- quotation request capture must only store one commercial date on the header: required_quote_date
- purchase validity now lives per quotation option, not on the quotation header
- sales validity must mirror purchase validity by default and only Admin may override it per option
- CRM may decide which quotation options are included in the customer-facing proposal through include_in_customer_quote
- provider purchase capture and CRM sale capture may use MXN, USD, or EUR
- accounting totals and profit must be normalized to MXN using the latest available exchange rate dated on or before the previous day
- when a quotation is accepted, the USD and EUR rates used for accounting must be locked on the quotation record
- quotation cargo capture now uses a spreadsheet-style multi-row modal with an "Anadir otro tipo de carga" action
- the canonical cargo entry order is: cantidad, tipo, largo, ancho, alto, peso, commodities
- cargo summary calculations must accumulate all visible draft rows plus persisted quotation_cargo_lines rows


--------------------------------------------------
CURRENT EXCHANGE-RATE MODEL
--------------------------------------------------

- exchange_rates is the canonical accounting FX catalog
- BANXICO is the primary operational source for USD and EUR against MXN
- MANUAL rows are allowed only as controlled continuity fallback
- the frontend exposes Master Data / Accounting / Exchange Rates for review and controlled edits
- the system now supports:
  manual sync through the protected admin endpoint
  automatic Vercel cron sync every day at 6:00 a.m.
  refresh of open quotation MXN totals after new rates are loaded


--------------------------------------------------
AUTHORIZATION MODEL
--------------------------------------------------

Authentication:

- Supabase Auth is the only password and session source of truth
- public.users is the ERP identity directory linked through users.auth_user_id
- inactive ERP users must fail protected access even when an auth session exists

Authorization:

- route access is enforced through frontend/proxy.ts and erp_can_access_route()
- sidebar visibility is driven by get_current_navigation_items()
- the main sidebar is now a permission-aware retractable shell with grouped accordion modules, desktop collapse memory, and mobile drawer behavior
- permission_modules and permission_submodules define the visible ERP navigation surface
- permission_resources and role_resource_permissions define the live coarse-grained security layer
- permission_fields and role_field_permissions define the current field-permission registry
- for registered sensitive fields, field access is deny-by-default until an explicit role_field_permissions rule exists
- current default role intent is:
  Ventas → dashboard + CRM
  Pricing → dashboard + Pricing
  Operaciones → dashboard + live Operations routes when they exist
  Admin → all live modules plus users / roles management


--------------------------------------------------
CANONICAL DATABASE DOMAINS
--------------------------------------------------

Organization:

- branches
- roles
- users
- permission_modules
- permission_submodules
- permission_actions
- permission_conditions
- permission_resources
- permission_fields
- role_resource_permissions
- role_field_permissions
- users is the ERP profile directory, not the password store
- passwords and sessions are handled by Supabase Auth
- roles are currently:
  Ventas, Pricing, Operaciones, Admin
- the permissions registry is now the canonical authorization layer
- the current rollout enforces coarse-grained module, submodule, and resource access
- field permissions are already registered and editable for sensitive UI areas
- real scope conditions are now live first in quotations and CRM ownership:
  active users now require branch_id for branch-scoped resources, and current live users were backfilled to the only canonical branch
  live clients were backfilled so active, non-deleted CRM records now carry account_owner_id and branch_id
  live opportunities inherit salesperson_id from clients.account_owner_id when missing
  crm.clients.list and crm.clients.record now use owner_only
  crm.contacts.list and crm.contacts.record now inherit owner_only through the parent client
  crm.opportunities.list and crm.opportunities.record now use owner_only
  CRM quotation list, record, pricing_options, and customer_actions use owner_only
  Pricing queue keeps pendiente and renegociar_tarifa visible to the team
  Pricing workspace and cost section use owner_only after a quotation is taken
- assigned_branch_only is now wired for operations shipments record access
- do not activate owner_only or assigned_branch_only on additional resources until canonical owner or branch data is populated
- legacy deleted clients may still exist without owner or branch and must not be used as rollout references

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
- sales_accounting_concepts
- quotation_rejection_reasons

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
  operation_type
  incoterm_id
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

Quotations

- CRM list page uses crm_quotations_view
- Pricing list page uses pricing_quotations_view
- detail page uses quotation_summary_view plus quotation_cost_line_secure_view and quotation_cargo_lines
- quotations must always be created from an existing opportunity through create_quotation_from_opportunity()
- quotation references are backend-generated by service family:
  QPRIAIR, QPRIFCL, QPRILCL, QPRIFTL, QPRILTL, QPRICOU
- quotation lifecycle is:
  borrador
  pendiente
  cotizando
  lista_para_enviar
  enviada
  cancelada
  rechazada
  renegociar_tarifa
  aceptada
- pricing ownership is taken through take_quotation_for_pricing()
- request_quotation_pricing() is the controlled handoff from CRM capture into the pricing queue
- pricing workflow in the live UI is:
  borrador → CRM captures route and load information
  pendiente → quotation requested to pricing and ready to be taken
  cotizando → source providers, open provider request PDF, and capture provider purchase options
  lista_para_enviar → pricing proposal complete and ready to return to ventas
  renegociar_tarifa → ventas feedback visible to pricing together with target rate
- sales workflow in the live UI is:
  lista_para_enviar → ventas captures sale amounts by option_label and prepares the client-facing proposal
  enviada → the customer-facing quotation document has been sent and commercial follow-up actions become primary
  aceptada → booking creation is enabled
- charge lines use:
  option_label, provider_id, sales_accounting_concept_id, purchase_amount, sale_amount, profit_amount, vat_rate
- cargo/consolidation lines are service-specific related rows used mainly for:
  LTL, LCL, AIR, COURIER
- CRM quotation detail must hide pricing outcomes until pricing returns the quotation as lista_para_enviar or later
- CRM must treat purchase capture and sale capture as separate responsibilities:
  pricing owns purchase
  ventas owns sale
- quotation economic visibility is now field-permission aware:
  Ventas may see cost, sale_price, and expected_profit
  Pricing may see purchase/cost but must not see sale_price or expected_profit unless explicitly granted
- quotation_summary_view and quotation_cost_line_secure_view are the canonical masked reads for sensitive quotation economics
- quotation scope behavior is now:
  CRM owner sees only quotations created_by that ERP user
  another sales user must not see that quotation in search_quotations() or quotation_summary_view
  Pricing users may all see pendiente and renegociar_tarifa items in the queue
  once taken, cotizando and lista_para_enviar belong only to pricing_owner_id
- quotation detail must follow the live visual rule:
  top status block
  popup edit flow
  sectioned information layout
  route section separated from load information
  charge lines table first after pricing handoff is complete
  cargo detail table first when the service uses consolidation lines
- the client-facing quotation document is rendered from:
  frontend/app/quotations/[id]/document/page.tsx
- the document must hide provider and purchase values
- the provider-facing internal pricing request document is rendered from:
  frontend/app/quotations/[id]/pricing-request/page.tsx
- the provider-facing internal pricing request document must only include the capture completed before pricing costs
- ventas must be able to save sale amounts by quotation option before changing the quotation to enviada
- accepted quotations must expose a manual Create booking action
- accepted quotations must not auto-create shipments by trigger
- pricing provider sourcing must reuse provider_service_offering_view and provider_contacts_view
- pricing contact shortcuts should open prefilled email or WhatsApp messages using the quotation lane and purchase validity

Master Data

- Users directory is an admin-only submodule under Master Data
- the users module manages:
  name, role, email, phone, username, password provisioning, active/inactive status
- the users workspace now supports create, edit, activate, inactivate, and delete actions from the directory table
- the current admin cannot inactivate or delete their own active session identity
- deleting a user is blocked when the ERP profile still owns live CRM, quotation, or commission history; those users must be left inactive instead
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
