# CURRENT PROJECT MAP

This document describes the repository as it exists today.

Use this file to answer:

- what code is actually present
- which modules are live
- which modules are only planned in the database
- where current structural risks remain


--------------------------------------------------
PROJECT ROOT STRUCTURE
--------------------------------------------------

Current top-level directories:

- AI_SYSTEM/
- architecture/
- backend/
- database/
- docs/
- frontend/
- master_data/
- supabase/
- system_snapshots/

Important note:

Several directories outside frontend/ and supabase/ are placeholders or incomplete.
The active application work is currently concentrated in:

- frontend/
- supabase/
- AI_SYSTEM/


--------------------------------------------------
AI SYSTEM FILES
--------------------------------------------------

Current AI governance files:

- AI_CONTEXT.md
- AI_SYSTEM_MAP.md
- AI_CURRENT_PROJECT_MAP.md
- AI_BLACKBOOK.md
- AI_MASTER_DATA.md
- AI_DATABASE_MAP.md
- AI_DATABASE_RELATION_GRAPH.md
- AI_TABLE_DICTIONARY.md
- AI_QUERY_GUIDE.md
- AI_QUERY_LIBRARY.md
- AI_DEV_RULES.md
- AI_BACKEND_SYNC_RULES.md
- AI_MODULE_BUILDER.md
- AI_UI_BUILDER.md
- AI_DESIGN_SYSTEM.md
- AI_COMPONENT_LIBRARY.md
- AI_PRIORITY_UI_REGISTRY.md
- AI_AUTOMATION_RULES.md
- AI_SYSTEM_AUDIT.md

Status summary:

- context and database governance documents are now aligned to the canonical schema
- AI_BLACKBOOK.md now records proven hardening lessons, recurring failure modes, and approved prevention patterns
- master data governance now covers external public datasets
- the linked Supabase cloud project is already migrated to the canonical backend
- live frontend query modules now assume the canonical backend as a hard requirement
- route access is now protected by login before homepage
- current auth implementation uses Supabase Auth sessions plus public.users active-profile validation
- route and sidebar access are now also permission-aware through the metadata-driven permissions registry
- AI_QUERY_LIBRARY.md documents the current frontend query layer
- AI_BACKEND_SYNC_RULES.md defines how SQL, types, query modules, and fallback safety must remain synchronized
- UI/design/component documents still contain target-state guidance beyond the current implementation
- the Priority UI layer now also has a formal registry document plus a typed in-repo registry for reusable component ownership


--------------------------------------------------
DATABASE LAYER
--------------------------------------------------

Location:

supabase/

Canonical files:

- ERP_schema.sql
- ERP_functions.sql
- ERP_triggers.sql
- ERP_views.sql
- ERP_policies.sql
- migrations/20260307000432_initial_erp_schema.sql
- migrations/20260322093000_canonical_backend_upgrade.sql
- migrations/20260322101500_dev_observability_policies.sql
- migrations/20260322113000_remove_legacy_artifacts.sql

Current database coverage:

- organization tables
- permissions registry tables
- master data tables
- CRM tables
- commercial tables
- operations tables
- finance tables
- audit and automation logs
- auth-linked ERP user directory through users.auth_user_id

The database supports more domains than the current frontend exposes.

Current master data coverage:

- external_data_sources
- unlocodes
- initial UN/LOCODE snapshot assets under master_data/unlocode/
- live UN/LOCODE rows imported into the linked Supabase cloud project
- service_transport_types locked sales catalog with canonical service type families
- sales_accounting_concepts editable SAT-aligned sales accounting catalog


--------------------------------------------------
APPLICATION LAYER
--------------------------------------------------

Frontend framework:

- Next.js App Router
- TypeScript

Current route files:

- frontend/app/login/page.tsx
- frontend/app/page.tsx
- frontend/app/dashboard/page.tsx
- frontend/app/master-data/users/page.tsx
- frontend/app/master-data/users/roles/page.tsx
- frontend/app/clients/page.tsx
- frontend/app/clients/[id]/page.tsx
- frontend/app/contacts/page.tsx
- frontend/app/opportunities/page.tsx
- frontend/app/opportunities/[id]/page.tsx
- frontend/app/quotations/page.tsx
- frontend/app/quotations/[id]/page.tsx
- frontend/app/quotations/[id]/document/page.tsx
- frontend/app/quotations/[id]/document/pdf/route.ts
- frontend/app/quotations/[id]/pricing-request/page.tsx
- frontend/app/quotations/[id]/pricing-request/pdf/route.ts
- frontend/app/pricing/providers/page.tsx
- frontend/app/pricing/providers/[id]/page.tsx
- frontend/app/pricing/quotations/page.tsx
- frontend/app/master-data/page.tsx
- frontend/app/master-data/sales/service-types/page.tsx
- frontend/app/master-data/sales/accounting-concepts/page.tsx
- frontend/app/master-data/sales/quotation-rejection-reasons/page.tsx
- frontend/app/master-data/accounting/exchange-rates/page.tsx
- frontend/app/master-data/unlocode/page.tsx

Current shared layout files:

- frontend/src/components/layout/AppLayout.tsx
- frontend/src/components/layout/Topbar.tsx
- frontend/src/components/layout/PageContainer.tsx
- frontend/proxy.ts
- the shared shell is now topbar-first with `NavigationMenu`, `PriorityCommandBar`, and `PriorityWorkspacePath`
- no live route should depend on a persistent desktop sidebar
- if `frontend/src/components/layout/Sidebar.tsx` still exists, it must be treated as legacy or secondary/mobile navigation only

Current shared CRM/UI components:

- frontend/src/components/crm/CrmOverview.tsx
- frontend/src/components/data/StatusBadge.tsx
- frontend/src/components/forms/ClientForm.tsx
- frontend/src/components/forms/ContactForm.tsx
- frontend/src/components/forms/OpportunityForm.tsx
- frontend/src/components/forms/ProviderForm.tsx
- frontend/src/components/forms/ProviderContactForm.tsx
- frontend/src/components/forms/ProviderServiceOfferingForm.tsx
- frontend/src/components/forms/UserForm.tsx
- frontend/src/components/forms/ClientLogisticsPartyForm.tsx
- frontend/src/components/master-data/ServiceTransportTypeManager.tsx
- frontend/src/components/master-data/UsersManager.tsx
- frontend/src/components/master-data/RolesPermissionsManager.tsx
- frontend/src/components/master-data/ExchangeRateManager.tsx
- UsersManager now includes admin-only table actions for edit, activate/inactivate, and delete
- frontend/src/components/priority/index.ts now acts as the public export surface for the approved Priority UI layer
- frontend/src/components/priority/registry.ts now acts as the typed in-repo registry for approved wrappers and hooks
- frontend/src/components/priority/collection/PriorityCollectionTable.tsx is now the canonical browse/list table for detail tabs, embedded lists, and master-data tables
- frontend/src/components/priority/PriorityDataTable.tsx remains only as a legacy compatibility wrapper while older imports are retired

Current frontend visual validation stack:

- frontend/playwright.config.ts
- frontend/tests/e2e/
- frontend/.storybook/
- frontend/src/stories/priority/
- frontend/vitest.config.ts
- docs/frontend-visual-validation-setup-2026-03-31.md
- Playwright is the real-app validation layer
- Storybook is the isolated visual workbench for Priority UI

Current query layer:

- frontend/src/lib/db/backendMode.ts
- frontend/src/lib/db/models.ts
- frontend/src/lib/db/clients.ts
- frontend/src/lib/db/contacts.ts
- frontend/src/lib/db/opportunities.ts
- frontend/src/lib/db/providers.ts
- frontend/src/lib/db/masterData.ts
- frontend/src/lib/db/index.ts
- frontend/src/lib/auth.ts
- frontend/src/lib/supabase/server.ts
- frontend/src/lib/db/permissions.ts
- frontend/src/lib/db/users.ts
- frontend/src/lib/mail/api.ts
- frontend/src/lib/mail/types.ts
- frontend/src/lib/mail/signatures.ts
- frontend/src/lib/server/mail/service.ts
- frontend/src/lib/server/mail/gmail.ts
- frontend brand assets now render from frontend/public/assets/ and must originate from the repository-level ASSETS/ folder

Current mail/workbench surfaces:

- frontend/app/mail/page.tsx
- frontend/app/master-data/mail/page.tsx
- frontend/app/api/mail/send/route.ts
- frontend/app/api/mail/signature-image/route.ts
- frontend/src/components/master-data/MailboxesManager.tsx
- frontend/src/features/mail/MailWorkbench.tsx
- frontend/src/features/mail/EntityMailTab.tsx

Current server-side master data utilities:

- frontend/src/lib/masterData/unlocodeSnapshot.ts
- frontend/app/api/master-data/unlocodes/route.ts

Current type contract:

- frontend/src/types/supabase.ts

Current implemented frontend modules:

- login access gate
- dashboard shell
- master data users
- master data roles and permissions
- clients
- contacts
- opportunities
- quotations
- pricing/providers
- pricing/quotations
- master data
- sales service types catalog
- sales accounting concepts catalog
- quotation rejection reasons catalog
- accounting exchange-rate catalog
- UN/LOCODE lookup

Current quotation document outputs:

- frontend/app/quotations/[id]/document/page.tsx is the live customer-document web preview
- frontend/app/quotations/[id]/document/pdf/route.ts is the canonical customer-facing PDF download endpoint
- customer PDFs are generated on demand and downloaded directly; they are not persisted in cloud storage
- frontend/app/quotations/[id]/pricing-request/page.tsx is the internal provider-facing web preview
- frontend/app/quotations/[id]/pricing-request/pdf/route.ts is the canonical provider-facing PDF download endpoint
- provider sourcing in the live UI now prioritizes bilingual outreach actions over the internal provider PDF

Pricing module status:

- pricing/providers is now a live route
- provider detail manages company profile, offered services, terms, and provider contacts
- provider contacts do not have a standalone route yet; they are managed within the provider detail page
- the pricing module already depends on canonical master data:
  UN/LOCODE and sales service transport types
- pricing/quotations now supports:
  grouped purchase options
  multi-concept cost capture per option
  inline option editing
  bilingual provider outreach actions
  internal provider PDF support

Current data-layer behavior:

- backendMode.ts now acts as a canonical-only guardrail
- the linked cloud backend must expose the canonical CRM and master-data objects for the live app to operate
- legacy direct writes are retired from the live CRM query layer
- historical snapshot assets may remain in-repo for recovery work, but they are not part of the live data path

Clients module status:

- create and update work against the canonical cloud backend
- list supports search, sorting, pagination, row actions, linked navigation, and modal-based client creation
- detail supports linked contact creation and linked record deletion
- extended client profile fields now include website, corporate phone, status, full address, postal code, and city with UN/LOCODE lookup
- extended client fields persist in Supabase, not just in browser overlay storage

Current missing frontend modules relative to the canonical schema:

- shipments
- client invoices
- provider invoices
- commissions


--------------------------------------------------
ERP WORKFLOW MAP
--------------------------------------------------

Canonical business flow:

Prospects
→ Clients
→ Opportunities
→ Quotations
→ Shipments
→ Finance

Current frontend support by stage:

Prospects:
database only

Clients:
database + frontend

Opportunities:
database + frontend

Quotations:
database + frontend

Shipments:
database only

Finance:
database only


--------------------------------------------------
QUERY AND VIEW USAGE
--------------------------------------------------

Current list/query modules use:

clients.ts

- client_overview_view
- search_clients()
- get_client_full()
- create_client_with_contacts()
- update_client_record()
- delete_client_record()
- add_client_logistics_party()
- delete_client_logistics_party()
- clients table for simple reads
- clients.account_owner_id is the canonical CRM owner field
- client_logistics_parties are returned through get_client_full() for the client detail related-data tabs

contacts.ts

- client_contacts_view
- add_contact_to_client()
- update_contact_record()
- delete_contact_record()
- contacts table for simple reads
- contacts.status is the canonical lifecycle field for contact availability
- contacts.phone is treated as direct phone for call and WhatsApp links

opportunities.ts

- open_opportunities_view
- create_opportunity()
- update_opportunity_record()
- delete_opportunity_record()
- opportunities table for simple reads
- update_opportunity_status()
- create_opportunity() inherits salesperson_id from the client owner when omitted
- opportunity detail target pattern is:
  top status control
  popup edit flow
  opportunity information section
  opportunity breakdown section
  dates section
- origin and destination must be standardized through UN/LOCODE
- service and transport must use sales master data catalog filtering

masterData.ts

- unlocode_lookup_view
- search_unlocodes()
- the canonical UN/LOCODE contract for all modules is:
  unlocodes + unlocode_lookup_view + search_unlocodes()
- service_transport_type_lookup_view
- service_transport_types is read-only from the application
- sales_accounting_concept_lookup_view
- create_sales_accounting_concept()
- update_sales_accounting_concept()
- delete_sales_accounting_concept()
- quotation_rejection_reason_lookup_view
- create_quotation_rejection_reason()
- update_quotation_rejection_reason()
- delete_quotation_rejection_reason()

quotations.ts

- crm_quotations_view
- pricing_quotations_view
- quotation_summary_view
- create_quotation_from_opportunity()
- take_quotation_for_pricing()
- update_quotation_status()
- create_quotation_cost_line()
- update_quotation_cost_line()
- delete_quotation_cost_line()
- create_quotation_cargo_line()
- update_quotation_cargo_line()
- delete_quotation_cargo_line()
- create_booking_from_quotation()
- getProviderPricingCandidates() via providers.ts for pricing-side sourcing suggestions
- quotations table for scoped detail updates on common commercial fields
- quotation_costs table for related charge line reads
- quotation_cargo_lines table for service-specific consolidation detail rows
- quote creation starts from opportunity detail via popup
- CRM and Pricing each expose a dedicated quotations list
- pricing quotations page exposes the live operational flow:
  borrador -> capture route and load information in CRM
  pendiente -> Tomar
  cotizando -> Proveedores + Cargos
  lista_para_enviar -> review captured purchases
  renegociar_tarifa -> show sales comment + target rate and recapture cost
- quotation detail follows the live visual rule:
  status block at top
  popup edit flow
  sectioned information layout
  route section separated from load information
  related charge lines as table first, popup create/edit second
  related cargo lines as table first, popup create/edit second for all service types
  cargo popup uses a spreadsheet-style multi-row capture with an "Anadir otro tipo de carga" action
  cargo popup calculates accumulated CBM, KG / VOL, clase estimada, cantidad total, and peso total across all draft and persisted rows
  client-facing document route under frontend/app/quotations/[id]/document/page.tsx
  provider-facing internal request route under frontend/app/quotations/[id]/pricing-request/page.tsx
  accepted quotations expose a manual Create booking action
- pricing quotations purchase workspace now uses a spreadsheet-style multi-row cost capture modal
- pricing cost capture groups multiple provider cost concepts into the same quotation option in one save action
- pricing cost capture column order is:
  proveedor
  concepto contable
  compra
  iva
  divisa
  valides
  notas del cargo
- pricing cost option edits now render inline inside the same option card
- pricing option save path now uses a batch backend contract to avoid repeated FX refresh and totals recalculation per line
- the pricing charges modal header now owns the `Enviar propuesta` action next to the close control


--------------------------------------------------
AUTOMATION LAYER
--------------------------------------------------

Current automation logic lives in:

- supabase/ERP_triggers.sql

Current workflow automations include:

- updated_at maintenance triggers
- quotation reference generation
- shipment reference generation
- quotation totals sync from charge lines
- audit logging

Current frontend has no scheduler or background job runner in the repository.


--------------------------------------------------
DEPENDENCY MAP
--------------------------------------------------

Canonical dependency chain:

ERP_schema.sql
→ ERP_functions.sql
→ ERP_triggers.sql
→ ERP_views.sql
→ frontend/src/types/supabase.ts
→ frontend/src/lib/db/
→ frontend/app/

Governance dependency chain:

AI_CONTEXT.md
→ AI_SYSTEM_MAP.md
→ AI_CURRENT_PROJECT_MAP.md
→ AI database docs
→ module/UI/automation rules


--------------------------------------------------
CURRENT RISKS
--------------------------------------------------

1. The database models more modules than the frontend currently exposes.
This is valid, but AI must not assume those routes already exist.

2. frontend/src/types/supabase.ts is generated from the linked canonical Supabase backend.

3. frontend/app/page.tsx now redirects to `/dashboard`, which is the canonical post-login landing route.

4. UI design documents describe a richer system than the live layout currently implements.


--------------------------------------------------
RESTRUCTURE RECOMMENDATIONS
--------------------------------------------------

High-priority recommendations:

1. Keep frontend/app, frontend/src/lib/db, and supabase/ as the active canonical paths.
Do not introduce apps/web or other parallel app roots unless a deliberate restructure is approved.

2. Regenerate frontend/src/types/supabase.ts after every schema migration that changes the public contract.

3. Build shipments and finance routes before exposing them in navigation.

4. For quotations, treat `/quotations/[id]/document/pdf` as the real customer-facing document output.
5. For provider sourcing, treat `/quotations/[id]/pricing-request/pdf` as the real provider-facing document output.
The `/quotations/[id]/document` page is only a web preview/reference surface.


--------------------------------------------------
END OF MAP
--------------------------------------------------
