# AI BACKEND SYNC RULES

This document defines how the frontend, Supabase backend, and AI governance files must stay synchronized.

Use this file when:

- changing tables, functions, views, triggers, or policies
- updating generated Supabase types
- refactoring the frontend query layer
- keeping rollback safety without allowing silent long-term drift


--------------------------------------------------
CURRENT BACKEND STATE
--------------------------------------------------

- the linked Supabase cloud project is the canonical backend
- the active frontend must target the canonical backend first
- the live frontend query layer now runs in canonical-only mode for CRM and master data
- no new product capability may depend on fallback-only behavior


--------------------------------------------------
SOURCE OF TRUTH ORDER
--------------------------------------------------

1. supabase/ERP_schema.sql
2. supabase/ERP_functions.sql
3. supabase/ERP_views.sql
4. supabase/ERP_triggers.sql
5. supabase/ERP_policies.sql
6. applied migrations under supabase/migrations/
7. generated frontend/src/types/supabase.ts
8. frontend query modules under frontend/src/lib/db/
9. AI_SYSTEM governance files

AI documentation must follow the executable system.
It must not become an alternate source of truth.


--------------------------------------------------
SYNC PROCESS FOR BACKEND CHANGES
--------------------------------------------------

Before changing backend structure:

1. confirm the last stable snapshot
2. inspect dependent views, functions, triggers, query modules, and AI docs
3. plan the change against the canonical SQL files first

When applying a backend change:

1. update canonical SQL sources
2. add a migration file
3. apply the migration to the linked Supabase project
4. regenerate frontend/src/types/supabase.ts
5. update the frontend query layer if the contract changed
6. update AI_SYSTEM files in the same turn
7. run validation before treating the change as stable

When a change affects branding or shared visual identity:

1. keep the repository-level ASSETS/ folder as the design source of truth
2. copy only the runtime-ready assets required by Next.js into frontend/public/assets/
3. update all frontend logo consumers to read from frontend/public/assets/
4. if quote or provider document branding changes, keep both the web preview and PDF output aligned

When a change affects quotation outreach or document generation:

1. decide whether the primary channel is:
   customer PDF
   provider PDF
   provider email / WhatsApp outreach
2. keep AI_CONTEXT.md, AI_QUERY_GUIDE.md, and AI_QUERY_LIBRARY.md aligned with that decision
3. do not let helper text, preview routes, and actual primary workflow diverge

When a change affects scheduled accounting data:

1. keep exchange_rates as the canonical persisted dataset
2. prefer BANXICO ingestion over manual entry when the source is available
3. validate both manual admin sync and scheduled cron sync paths
4. refresh open quotation MXN totals after new rates are persisted
5. never mutate accepted quotation FX snapshots after they are locked


--------------------------------------------------
SYNC PROCESS FOR FRONTEND QUERY CHANGES
--------------------------------------------------

Before changing frontend data access:

1. verify the real schema in ERP_schema.sql
2. verify available views/functions in ERP_views.sql and ERP_functions.sql
3. verify the approved query pattern in AI_QUERY_GUIDE.md

Frontend query modules must:

- prefer canonical views for list and browse screens
- prefer canonical functions for writes and workflow transitions
- avoid raw table writes when a business function already exists
- avoid direct page-level access to imported master data


--------------------------------------------------
FALLBACK POLICY
--------------------------------------------------

Fallback code is allowed only for temporary rollback safety.

Approved temporary fallback categories:

- offline or recovery-oriented utilities that are not part of the live query path
- imported reference snapshots stored in-repo for reproducible recovery work

Fallback code must:

1. be clearly labeled as temporary rollback safety
2. stay outside the live query path unless the user explicitly approves rollback-oriented compatibility work
3. avoid introducing new product behavior unavailable in the canonical backend
4. be removed once validation confirms the canonical path is stable

Do not add new fallback branches unless the user explicitly accepts rollback-oriented compatibility work.


--------------------------------------------------
UN/LOCODE SYNC RULES
--------------------------------------------------

UN/LOCODE is a cross-module master dataset.

Current canonical query contract:

- table: unlocodes
- browse/select view: unlocode_lookup_view
- typeahead/search RPC: search_unlocodes()

Current frontend rule:

- all modules must reuse the shared UN/LOCODE query layer
- page components must not query unlocodes directly
- location fields must not use free text as the source of truth when a UN/LOCODE selection exists

Current import rule:

- add new countries with incremental country-scoped imports whenever possible
- use add-country or refresh-country sync modes instead of rebuilding the full catalog by default
- only prune stale rows when explicitly reconciling a single country snapshot
- do not delete or rewrite unrelated country data during a country expansion

Planned backend optimization path for the same contract:

- keep unlocodes as the single master table
- preserve unlocode_lookup_view and search_unlocodes() as the stable frontend contract
- optimize backend search with exact-match indexes plus trigram-based partial search
- move toward foreign-key-ready UN/LOCODE references in business modules over time

This optimization must preserve the frontend contract whenever possible.


--------------------------------------------------
SCALE INDEXING RULE
--------------------------------------------------

Before large-volume modules are extended:

1. verify the access path for client_id, opportunity_id, quotation_id, shipment_id, and provider_id
2. add composite indexes for common parent-child list screens ordered by created_at
3. prefer aggregated joins over repeated correlated subqueries in analytics views
4. move search and status filtering to the backend query layer when datasets stop being trivially small


--------------------------------------------------
PERMISSION REGISTRY SYNC RULE
--------------------------------------------------

The permissions system is metadata-driven.

When a live module or route is added:

1. register or update permission_modules
2. register or update permission_submodules
3. register or update permission_resources
4. register or update permission_fields when the screen contains sensitive fields
5. seed role_resource_permissions defaults
6. seed role_field_permissions defaults when field-level control is required
7. keep proxy/server route checks aligned with the registered route matchers
8. for registered sensitive fields, no explicit role_field_permissions rule must mean deny-by-default
9. expose sensitive quotation economics through masked reads such as quotation_summary_view and quotation_cost_line_secure_view
10. before activating owner_only or assigned_branch_only on a live resource, backfill canonical owner_id and branch_id data for existing records
11. if a resource inherits scope from a parent entity, document that derivation explicitly and validate it with temporary multi-user smoke tests

Do not ship a live route, sidebar link, or protected workflow without a matching permission registry path.


--------------------------------------------------
VALIDATION CHECKLIST
--------------------------------------------------

After backend or query-layer changes:

1. supabase db push or equivalent migration validation succeeds
2. npm run types succeeds
3. npm run lint succeeds
4. npm run build succeeds
5. critical reads and writes succeed against the linked Supabase project
6. AI_SYSTEM files are updated if behavior or contracts changed


--------------------------------------------------
DRIFT PREVENTION
--------------------------------------------------

Do not leave any of these states unresolved:

- schema changed but types were not regenerated
- view/function contracts changed but AI docs were not updated
- frontend relying on dashboard-only manual database changes
- fallback logic silently becoming the real product path

If drift is detected, stabilize first and only then continue adding modules.
