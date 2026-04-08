# Priority Logistics ERP – AI Context

This file is the highest-level context document for AI-assisted development in this repository.

Read this file first, then follow:

1. AI_SYSTEM_MAP.md
2. AI_CURRENT_PROJECT_MAP.md
3. database governance documents
4. module, UI, and automation rules


--------------------------------------------------
REPOSITORY IDENTITY AND PROJECT BOUNDARY
--------------------------------------------------

This repository is exclusively for Priority Logistics ERP.

Hard boundary:

- this codebase, schema, AI governance layer, and deployment pipeline belong only to Priority Logistics ERP
- other businesses, other products, and other domains must never be merged into this repository unless the user explicitly approves a controlled consolidation
- if another project exists for the same owner, AI must treat it as a separate system with separate context, separate architecture, and separate rules
- if user instructions from another project appear here, AI must not apply them blindly; first confirm whether they are truly intended for Priority Logistics ERP

Current explicit separation rule:

- Priority Logistics ERP and the separate window-washing / WhatsApp-operated business system are different projects
- they must not be mixed in architecture, workflows, entities, modules, prompts, or recommendations unless the user explicitly asks for that crossover


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
ENVIRONMENT TOPOLOGY
--------------------------------------------------

Current recommended topology for this stage of the project:

1. LOCAL application
2. TRAIN database environment (current linked backend under active validation)
3. LIVE application deployment
4. PROD database environment (new clean production backend with no inherited test data)

Operational interpretation:

- the current Supabase backend should now be treated as TRAIN, not as final production
- the future production cutover should use a new clean PROD database
- LIVE must point only to PROD
- LOCAL may point to TRAIN during active development and validation

Decision rule for now:

- use 2 database environments only: TRAIN and PROD
- do not add a third remote database environment unless a concrete business or release need appears
- keep infrastructure simple and low-cost until the ERP proves stable under controlled training usage

Promotion rule:

- promote structure, not working data
- schema, migrations, functions, views, triggers, policies, controlled seeds, and approved configuration may move from TRAIN to PROD
- ad hoc operational records, test records, and incidental working data must not be copied from TRAIN into PROD

Safety rule:

- no stress, load, or ephemeral validation writes may run against PROD
- TRAIN is the only remote environment allowed for destructive validation and temporary audit data

Current hardening phase rule:

- until TRAIN passes hardening exit criteria, the project is in stability-only mode
- stability-only mode prioritizes fixes, refactors, cleanup, validation, and observability over new module construction
- destructive validation on TRAIN must always use explicit test prefixes, ledger tracking, cleanup routines, and post-cleanup clean-state verification
- when destructive validation needs authenticated personas, it may bootstrap ephemeral validation users only in TRAIN or an approved writable clone
- those validation users must be clearly identifiable, stored only in runtime artifacts, and removed from both `public.users` and `auth.users` during cleanup
- stress validation should prefer reusable authenticated session pools over repeated sign-in bursts, especially at heavy and stress load levels
- authenticated route checks should run after the main concurrency peak or against a controlled subset so they do not distort the load signal
- named-persona access-matrix validation must run before destructive break and stress tiers whenever session users are bootstrapped for TRAIN
- named-persona field-masking validation must run before destructive break and stress tiers whenever sensitive quotation or pricing fields are in scope
- stress artifacts must record the configured pool counts, the signed-in pool counts actually used, and the authenticated post-peak check count so every destructive run remains auditable

Frontend foundation rule:

- `shadcn/ui` is the only approved primitive UI foundation for this repository
- `frontend/src/components/priority/` is the ERP-facing wrapper layer and should remain the stable public interface for live modules
- if an official `shadcn` primitive or pattern is adopted after a custom wrapper already exists, rebase the wrapper internally instead of bypassing `Priority UI`
- current canonical internal bases for the approved wrapper layer include `frontend/src/components/ui/combobox.tsx`, `frontend/src/components/ui/data-table.tsx`, and `frontend/src/components/ui/empty.tsx`
- semantic typography is part of the frontend foundation and must be applied through shared roles, not improvised per page
- live forms must use the shared Priority form layer (`PriorityFormHeader`, `PriorityFormSection`, `PriorityFormField`, `PriorityInfoField`, `PrioritySubmitBar`) instead of raw input/button markup
- the canonical next-generation form stack is now `react-hook-form + zod + PriorityFormEngine`
- feature teams must define schemas and field definitions instead of inventing ad hoc stateful form engines inside pages
- dynamic catalogs and dependent fields must flow through shared adapters or custom schema-field renderers instead of per-screen imperative glue
- required markers must reflect actual schema or workflow requirements; do not visually overstate optional capture
- helper text inside forms should be sparse and operational: keep it only when it reduces a user error or clarifies derived behavior
- approved modal sizing for live ERP forms is:
  - `compact` for short utility or catalog forms
  - `standard` for most create/edit dialogs
  - `workspace` for long record forms and hybrid form-plus-grid workflows
- approved form density modes for live ERP forms are:
  - `compact` for short modals with inline submit actions
  - `workspace` for long create/edit flows with wider multi-column capture
- desktop dialogs should prefer generous horizontal room and slightly tighter internal spacing over narrow, overly vertical form stacks
- `PriorityDialog` and `PriorityForm` are the canonical density controls for live form UX; do not compensate per screen with ad hoc padding overrides unless the workflow truly requires it
- live ERP forms are desktop-first by default: on large screens they should visually occupy most of the available workspace, typically around 80% of the viewport width once the dialog shell is open
- do not preserve mobile-like max widths in desktop dialogs just because the same form also supports mobile; mobile should collapse by breakpoint, not constrain desktop
- sticky submit rails should be reserved for long workspace forms; compact modal forms should prefer an inline footer with lower visual weight
- `ToggleGroup` is the preferred control for short mutually exclusive choices; `Switch` is the preferred control for true on/off states
- `PriorityCollectionWorkspace` is now the default shell for read-mostly browse/list surfaces
- the default browse workspace stack is:
  - `PrioritySearchField`
  - `PriorityFilterPopover`
  - `PrioritySavedViews`
  - `PriorityStatusLanes`
  - `PriorityActionRail`
  - active table or board surface inside `PriorityCollectionWorkspace`
- `PriorityKanbanBoard` is the approved board mode for pipeline-style modules such as opportunities
- `PriorityCollectionTable` is the canonical browse/list table for detail tabs, embedded lists, and admin/master-data lists that do not need the full workspace shell
- `PriorityDataTable` is now a legacy compatibility wrapper and should only remain where migration has not happened yet
- `PriorityGrid` on top of `ag-grid-community` is the approved dense editing shell for ERP-grade row, matrix, and inline-editing workflows
- internal mailing is now a first-class ERP capability, not an external experiment:
  - `Master Data > Mail` owns mailbox setup, role access, OAuth connection, sync mode, and mailbox signature configuration
  - `/mail` is the shared inbox/workbench for authorized users
  - embedded `Email` tabs in ERP entities must respect operational context instead of showing every linked thread indiscriminately
- mailbox signatures now use the canonical `public URL + ERP proxy` strategy:
  - the mailbox record stores `signature_image_url`
  - `/api/mail/signature-image` is the approved render path for remote signatures such as Google Drive
  - `NEXT_PUBLIC_APP_URL` must point to the public ERP domain so outbound emails can resolve the proxied signature outside the app
- the final production handoff for workspaces + mailing + Vercel must follow `docs/PRODUCTION_RELEASE_CLOSEOUT.md`
- quotation email context rules are now explicit:
  - sales quotation detail must show customer-facing threads only
  - pricing/provider outreach must show provider-facing threads only
- every `PriorityGrid` workflow must define a mobile fallback pattern before it is approved for live use
- the approved Priority UI catalog is documented in `AI_PRIORITY_UI_REGISTRY.md` and mirrored in `frontend/src/components/priority/registry.ts`
- live ERP screens should now prefer a workspace-first framing:
  - compact contextual headers
  - metric strips only when they help decision-making
  - summary rails for orientation on dense detail/admin screens
  - less hero chrome and less card mosaic behavior on product surfaces
- list workspaces with no records should switch into a compact empty-workspace mode:
  - denser header
  - toolbar first
  - no decorative metric strip
  - empty state visible near the fold
- the current approved workspace framing layer includes `PriorityWorkspaceHeader`, `PriorityMetricStrip`, `PriorityMetricCard`, and `PrioritySummaryRail`
- `PriorityWorkspacePath` is the approved interactive breadcrumb/path layer inside workspace headers; do not duplicate that context again in the desktop topbar
- the approved cross-workspace navigation assist layer now includes `PriorityCommandBar` for fast desktop movement and lower training cost
- the canonical shell is now topbar-first:
  - `NavigationMenu` in the topbar for module navigation
  - `PriorityCommandBar` for global movement and quick actions
  - `PriorityWorkspacePath` inside workspace headers for local backtracking
  - no persistent desktop sidebar
- frontend visual validation is now a two-layer system:
  - `Playwright` for real route/auth/browser validation under `frontend/tests/e2e/`
  - `Storybook` for isolated visual review of Priority UI under `frontend/src/stories/priority/`
- the current Playwright suites are organized by intent:
  - `test:e2e` for broad browser smoke
  - `test:e2e:critical` for critical authenticated workspaces
  - `test:e2e:forms` for create/edit form coverage across CRM, providers, quotations, pricing, and admin catalogs
  - `test:e2e:grids` for list tables, dense admin grids, provider offerings, and quotation/pricing capture grids
  - `test:e2e:product` for final product-level screenshots across shell, representative forms, and dense grids
  - `test:e2e:process` for full cross-role workflow audits from CRM to pricing to sales and renegotiation
  - `test:e2e:workspaces` for browse workspace lanes, visible CTAs, saved views, and empty-state behavior
  - `test:e2e:kanban` for board mode validation and saved-view persistence in pipeline screens
- after major form or modal changes, run `test:e2e:forms` before broader visual signoff so form regressions surface early
- after major table, empty-workspace, or dense-grid changes, run `test:e2e:grids` before broader visual signoff so list/grid regressions surface early
- before final release-style UX review, run `test:e2e:product` to capture a single fresh evidence set for shell, forms, and grids
- Storybook does not replace route-level validation; it exists to inspect typography, actions, forms, tables, and empty states before or alongside live-screen audits
- when macOS prevents direct Playwright browser launch under Codex or another non-terminal host runtime, the approved fallback is an external Playwright browser server started from a normal local terminal via `npm run test:e2e:server`
- when `.playwright/browser-server.json` exists, Playwright config and `validation:repo-gate` may connect through that websocket instead of launching a browser process directly
- `npm run validation:repo-gate:auto` and `npm run validation:repo-gate:auto:headed` are the preferred operational wrappers for repository handoff because they can bootstrap that browser server automatically and clean it afterward
- when running headed local browser audits with credentials that contain shell-sensitive characters such as `!`, prefer inline env vars with single quotes:
  - `UI_TEST_LOGIN='adanrodriguez' UI_TEST_PASSWORD='Adan26!' npm run test:e2e:critical -- --headed`
  - `UI_TEST_LOGIN='adanrodriguez' UI_TEST_PASSWORD='Adan26!' npm run test:e2e -- --headed`
- the official local handoff gate for repository closeout is `npm run validation:repo-gate`
- `READY_FOR_REPO` or `NOT_READY_FOR_REPO` must come from that reproducible gate artifact, not from subjective review alone
- the approved reusable cleanup path for ad hoc UI/E2E QA example data is:
  - preview: `cd frontend && npm run validation:cleanup:qa-preview`
  - apply: `cd frontend && npm run validation:cleanup:qa-apply`
- that cleanup targets example artifacts created through patterns such as `Cliente QA Proceso`, `Proveedor QA`, `@priority.test`, `example.com`, and `Vista QA`
- the cleanup script deletes dependent quotation/provider artifacts first and then neutralizes plus soft-deletes QA clients through backend-safe flows; do not hard-delete clients directly
- the current live schema-driven forms already migrated to `PriorityFormEngine` are:
  - login access
  - client profile
  - contact create/edit
  - opportunity create/edit
  - provider profile
  - provider contact
  - provider service offering
  - user create/edit
  - client logistics party
  - quotation header
- quotation status updates, quotation sales-option capture, and role-permission clone flows are approved shared-shell modals even when they are not full schema-rendered forms
- the current live browse workspace migrations completed on the new foundation are:
  - pricing quotations
  - quotations
  - opportunities
  - clients
  - providers
- the current live `PriorityGrid` workflows remain quotation charge line capture, quotation cargo line capture, provider offerings detail capture, and roles/permissions-style dense editing


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
- frontend/app/quotations/[id]/document/pdf/route.ts
- frontend/app/quotations/[id]/pricing-request/page.tsx
- frontend/app/quotations/[id]/pricing-request/pdf/route.ts
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
- frontend/src/components/layout/Topbar.tsx
- frontend/src/components/layout/PageContainer.tsx
- frontend/proxy.ts
- frontend/src/components/layout/Sidebar.tsx remains legacy-only and is no longer the canonical shell path

Current brand assets:

- root source of truth: ASSETS/
- official shell, login, and topbar lockup: frontend/public/assets/logo_vSVG.svg
- document and PDF runtime assets: frontend/public/assets/
- canonical asset registry and metadata source: frontend/src/lib/brand.ts
- live routes, layout components, and PDF routes must not hardcode logo paths directly
- custom prototype assets under frontend/public/brand/ are optional references only and must not override the approved synced shell lockup

Current UI foundation:

- `shadcn/ui` with `radix` is the only approved primitive foundation for the frontend
- primitives live under `frontend/src/components/ui/`
- branded ERP wrappers and compositions live under `frontend/src/components/priority/`
- new UI work must prefer the Priority wrapper layer over ad hoc raw primitive usage when wrappers already exist
- the global navigation model is now topbar-first without a persistent sidebar
- tabs are approved only as internal organization inside dense workspaces, not as a replacement for shell navigation

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
- pricing purchase capture now uses a spreadsheet-style multi-row modal with an "Anadir otro concepto" action
- a single quotation option may be captured through multiple purchase concepts in one modal save
- purchase capture column order is: proveedor, concepto contable, compra, iva, divisa, valides, notas del cargo
- option totals must accumulate by purchase option; do not surface a global "Compra acumulada MXN" summary card in the pricing capture modal
- editing an existing purchase option must happen inline inside the same option card, not in a detached editor below the list
- pricing purchase saves should use a single batch option-save path so FX refresh and quotation total recalculation happen once per option save
- the `Enviar propuesta` action belongs in the pricing modal header next to the close control
- the customer-facing quotation must be delivered through the server PDF route at frontend/app/quotations/[id]/document/pdf/route.ts
- customer quotation PDFs are generated on demand in memory and downloaded directly; they must not be stored in Supabase, Vercel, or any other cloud bucket
- the web document preview under frontend/app/quotations/[id]/document/page.tsx is a reference surface and must stay synchronized with the downloadable PDF
- the customer-facing quotation must hide status and commercial-tracking panels
- each customer-visible quotation option must render independently with its own totals and REMARKS section
- the institutional sentence belongs at the end of the customer quotation, not in the header
- customer quotation layout should keep quotation summary, route, and load information together on page 1 whenever content volume allows
- when an option does not fit cleanly, the PDF should move the whole option block to the next page instead of splitting the section mid-page
- the provider-facing pricing request PDF route remains available at frontend/app/quotations/[id]/pricing-request/pdf/route.ts as a controlled internal document output
- provider-facing pricing request PDFs are generated on demand in memory and downloaded directly; they must not be stored in Supabase, Vercel, or any other cloud bucket
- the web preview under frontend/app/quotations/[id]/pricing-request/page.tsx is a reference surface and must stay synchronized with the downloadable provider PDF
- provider-facing pricing requests may show service, operation type, route, required date, and cargo information, but must never expose the client name or commercial sale amounts
- the provider-sourcing workflow currently prioritizes polished email and WhatsApp outreach over the internal provider PDF
- provider outreach actions must expose separate Spanish and English variants so pricing can select the language per supplier
- provider outreach content must include:
  incoterm
  pickup origin
  POL
  POD
  delivery destination
  cargo details as compact load rows followed by one consolidated commodities line
  cargo ready date


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
- topbar module navigation is driven by the permission-aware navigation registry
- the canonical shell no longer uses a persistent desktop sidebar
- if a sidebar-like surface exists, it is only a secondary or mobile navigation helper
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
  cotizando → source providers, launch bilingual outreach, and capture provider purchase options
  lista_para_enviar → pricing proposal complete and ready to return to ventas
  renegociar_tarifa → ventas feedback visible to pricing together with target rate
- sales workflow in the live UI is:
  lista_para_enviar → ventas captures sale amounts by commercial option and prepares the client-facing proposal
  enviada → the customer-facing quotation document has been sent and commercial follow-up actions become primary
  aceptada → booking creation is enabled
- charge lines use:
  quotation_option_id as the canonical grouping key plus provider_id, sales_accounting_concept_id, purchase_amount, sale_amount, profit_amount, vat_rate
- cargo/consolidation lines are now the canonical load-detail structure for all service types
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
- live master-data reads now run in canonical-only mode; UN/LOCODE snapshot assets may remain in-repo for recovery work, but they are no longer part of the live query path
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
- customer quotations now have a real PDF route at `frontend/app/quotations/[id]/document/pdf/route.ts`
- customer PDF is the commercial source of truth for sharing with clients; it must not expose provider names, purchase costs, internal status, or the commercial status-tracking panel
- if multiple customer-visible options are selected, the PDF must render each option separately with its own validity, totals, and `REMARKS` section built from charge-line notes
