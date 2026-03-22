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
- legacy and snapshot fallback code remains only as temporary rollback safety
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

- canonical vs legacy backend detection during transition periods
- local UN/LOCODE snapshot contingency when canonical master data is unavailable
- browser overlay storage for non-canonical client profile compatibility

Fallback code must:

1. be clearly labeled as temporary rollback safety
2. live behind the canonical path, never replace it as default behavior
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
