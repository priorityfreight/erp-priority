# ERP_STABLE_VERSION_v1

Snapshot date: 2026-03-22

This snapshot marks the current ERP repository as the first stabilized base
before continuing with additional modules.


--------------------------------------------------
VALIDATED STATE
--------------------------------------------------

Validated commands:

- supabase db push
- npm run types
- npm run lint
- npm run build
- remote Supabase smoke check against:
  client_overview_view
  get_client_full
  provider_overview_view
  unlocode_lookup_view
  unlocode_country_summary_view
  search_unlocodes
  service_transport_type_lookup_view

Validated frontend routes:

- /
- /dashboard
- /clients
- /clients/[id]
- /contacts
- /opportunities
- /opportunities/[id]
- /master-data
- /master-data/unlocode
- /master-data/sales/service-types
- /pricing/providers
- /pricing/providers/[id]

Validated live feature scope:

- CRM clients with canonical owner, derived UN/LOCODE location fields, and modal editing
- client detail tabs for contacts, consignee and shippers, and opportunities
- contacts with status, linkedin, direct phone, and WhatsApp link support
- opportunities with canonical service type, transport type, UN/LOCODE origin and destination, and expiration logic
- master data for UN/LOCODE and sales service transport types
- pricing/providers with provider contacts and service offerings


--------------------------------------------------
STABILIZATION WORK COMPLETED
--------------------------------------------------

Frontend stabilization:

- reduced repeated remote search churn on clients and providers with deferred search input
- reduced local filter churn on contacts and opportunities with deferred search input
- centralized UN/LOCODE lookup behavior into a shared hook
- removed duplicated UN/LOCODE async logic across client, provider, and opportunity forms
- improved provider and contact query modules to fetch only needed columns instead of select *
- kept list/detail modal patterns consistent across live modules
- standardized related-record management on client detail through tabbed tables plus modal creation
- kept fallback paths marked as temporary rollback safety instead of normal runtime behavior

Backend stabilization:

- fixed create_client_with_contacts() so optional contact payloads align with the canonical contacts schema
- reduced repeated sync_expired_opportunities() calls with a throttle in the frontend query layer
- kept providers canonical objects aligned across schema, functions, views, triggers, policies, and migrations
- optimized UN/LOCODE search with pg_trgm, search_text, and stronger references through *_unlocode_id
- added incremental country import and refresh flow for UN/LOCODE so new countries can be added safely without rebuilding the full catalog
- added client_logistics_parties as a canonical child entity for consignee and shipper data

AI system stabilization:

- aligned AI_TABLE_DICTIONARY.md with provider canonical tables
- aligned AI_DATABASE_RELATION_GRAPH.md with provider canonical relationships
- aligned AI_QUERY_GUIDE.md with provider canonical views and functions
- aligned AI_MODULE_BUILDER.md with pricing/providers as a live module
- added AI_BACKEND_SYNC_RULES.md and marked canonical cloud backend as the primary source of truth
- aligned AI master data guidance with reusable UN/LOCODE search and incremental country loading


--------------------------------------------------
HEALTH REPORT
--------------------------------------------------

System health score: 91/100

What was optimized:

- repeated UN/LOCODE lookup logic
- repeated remote search requests on list pages
- over-fetching in several Supabase reads
- unnecessary repeated opportunity expiration sync calls
- a broken canonical client creation function path
- documentation drift between provider schema/query/module docs

What was removed or refactored:

- duplicated form-level UN/LOCODE effects
- redundant search pressure on provider and client list pages
- redundant backend mode/user reloads on every client search
- stale AI_MODULE_BUILDER baseline treating pricing/providers as database-only
- fragmented client related-data layout in detail pages
- one-off UN/LOCODE country loading workflow that did not scale safely

Remaining issues:

- / and /dashboard still render the same overview; there is no single canonical entry route yet
- some list pages still load full datasets and then filter client-side, which is acceptable now but not ideal for large scale
- backendMode fallback logic still exists in the codebase as temporary rollback safety and should be removed after final validation
- AI governance files still contain some narrative overlap even after alignment
- the worktree still contains repo noise such as .DS_Store artifacts that should be excluded before publishing

Recommendations before scaling modules:

1. choose one canonical entry route between / and /dashboard
2. move large-list filtering for contacts and opportunities fully to the database when volumes increase
3. remove temporary fallback code after final production validation
4. clean repo noise and confirm the final file set before publishing
5. commit this stabilized baseline before introducing quotations or shipment modules
