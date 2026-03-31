# AI SYSTEM MAP

This document maps the AI governance system for the Priority Logistics ERP repository.

Its purpose is to show:

- which AI documents exist
- which one is authoritative for each concern
- the order AI agents should read them
- how those documents relate to the actual codebase


--------------------------------------------------
READ ORDER
--------------------------------------------------

AI agents should read documents in this order:

1. AI_CONTEXT.md
2. AI_SYSTEM_MAP.md
3. AI_CURRENT_PROJECT_MAP.md
4. AI_BLACKBOOK.md before structural work, hardening, releases, or new module patterns
5. AI_MASTER_DATA.md when working on shared catalogs or external datasets
6. AI_DATABASE_MAP.md
7. AI_DATABASE_RELATION_GRAPH.md
8. AI_TABLE_DICTIONARY.md
9. AI_QUERY_GUIDE.md
10. AI_QUERY_LIBRARY.md
11. AI_DEV_RULES.md
12. AI_BACKEND_SYNC_RULES.md
13. AI_MODULE_BUILDER.md
14. AI_UI_BUILDER.md
15. AI_DESIGN_SYSTEM.md
16. AI_COMPONENT_LIBRARY.md
17. AI_PRIORITY_UI_REGISTRY.md
18. AI_AUTOMATION_RULES.md
19. AI_SYSTEM_AUDIT.md when validating governance quality


--------------------------------------------------
DOCUMENT RESPONSIBILITIES
--------------------------------------------------

AI_CONTEXT.md

Purpose:
Defines the high-level product, architecture, implementation boundaries, and current AI guardrails.

AI_CURRENT_PROJECT_MAP.md

Purpose:
Describes what currently exists in the repository, including live routes, query modules, and structural risks.

AI_BLACKBOOK.md

Purpose:
Captures real failure patterns, hardening lessons, approved fixes, and prevention rules learned through execution.

AI_MASTER_DATA.md

Purpose:
Defines the rules for shared reference datasets, external public data imports, and editable internal catalogs under MASTER DATA.

AI_DATABASE_MAP.md

Purpose:
Defines the canonical database domains, layers, and object inventory.

AI_DATABASE_RELATION_GRAPH.md

Purpose:
Defines business relationships and relational dependency paths.

AI_TABLE_DICTIONARY.md

Purpose:
Defines canonical tables, key columns, and table-level meaning.

AI_QUERY_GUIDE.md

Purpose:
Defines query priorities, write safety rules, and view/function usage policy.

AI_QUERY_LIBRARY.md

Purpose:
Documents the current frontend query modules and which database objects they are allowed to use.

AI_DEV_RULES.md

Purpose:
Defines coding conventions and repository-level implementation rules.

AI_BACKEND_SYNC_RULES.md

Purpose:
Defines how canonical backend SQL, generated types, frontend query modules, and fallback safety must stay synchronized.

AI_MODULE_BUILDER.md

Purpose:
Defines how to create new ERP modules without breaking schema, query, route, or documentation alignment.

AI_UI_BUILDER.md

Purpose:
Defines frontend structure rules and navigation expectations.

AI_DESIGN_SYSTEM.md

Purpose:
Defines visual design guidelines.

AI_COMPONENT_LIBRARY.md

Purpose:
Defines shared UI building blocks and target reusable components.

AI_PRIORITY_UI_REGISTRY.md

Purpose:
Defines the approved ERP-facing Priority UI catalog, its public surface, and the technical base behind each wrapper.

AI_AUTOMATION_RULES.md

Purpose:
Defines trigger-based and workflow automation rules.

AI_SYSTEM_AUDIT.md

Purpose:
Tracks the health of the governance layer itself.


--------------------------------------------------
LIVE VS PLANNED RULE
--------------------------------------------------

AI_SYSTEM must describe two things at the same time without mixing them:

1. the live ERP that already exists today
2. the planned ERP domains that remain only at database or roadmap level

Rule:

- current-state documents must describe the live system exactly as implemented
- planned modules must remain documented, but they must not overwrite or distort the current live inventory
- when a live workflow changes, update the current-state documents first
- do not rewrite planned-module guidance unless those modules are actually implemented or their database contract changes


--------------------------------------------------
ACTUAL REPOSITORY LAYERS
--------------------------------------------------

Current repository layers:

Frontend application:

- frontend/app/
- frontend/src/components/
- frontend/src/lib/
- frontend/src/types/

Database layer:

- supabase/ERP_schema.sql
- supabase/ERP_functions.sql
- supabase/ERP_triggers.sql
- supabase/ERP_views.sql
- supabase/migrations/

AI governance layer:

- AI_SYSTEM/

Snapshots and historical baselines:

- system_snapshots/

The repository does not currently use:

- apps/web/
- core/modules/
- supabase/schema/

AI must not invent those paths.


--------------------------------------------------
AUTHORITATIVE CHAINS
--------------------------------------------------

Database truth:

ERP_schema.sql
→ ERP_functions.sql / ERP_views.sql / ERP_triggers.sql
→ AI database documents
→ frontend/src/types/supabase.ts
→ frontend/src/lib/db/
→ frontend/app/

Frontend inventory truth:

frontend/app/
frontend/src/components/layout/
frontend/src/lib/db/
→ AI_CURRENT_PROJECT_MAP.md
→ AI_CONTEXT.md

Governance truth:

AI_CONTEXT.md
→ AI_SYSTEM_MAP.md
→ AI_BLACKBOOK.md
→ specialized rule documents


--------------------------------------------------
CODE GENERATION WORKFLOW
--------------------------------------------------

When generating or modifying code, the AI should follow this flow:

Step 1

Read AI_CONTEXT.md for current system boundaries.

Step 2

Read AI_CURRENT_PROJECT_MAP.md to confirm what exists today.

Step 3

If the change touches data:

- verify AI_MASTER_DATA.md when the change adds or modifies shared catalogs or public datasets
- verify ERP_schema.sql
- verify AI_DATABASE_MAP.md
- verify AI_DATABASE_RELATION_GRAPH.md
- verify AI_TABLE_DICTIONARY.md
- apply AI_QUERY_GUIDE.md
- check AI_QUERY_LIBRARY.md

Step 4

Apply AI_DEV_RULES.md.

Step 5

If creating a module:

- follow AI_MODULE_BUILDER.md
- update inventory docs
- only expose navigation after the route is real

Step 6

If building UI:

- follow AI_UI_BUILDER.md
- follow AI_DESIGN_SYSTEM.md
- reuse AI_COMPONENT_LIBRARY.md when components actually exist

Step 7

If changing workflow automation:

- follow AI_AUTOMATION_RULES.md


--------------------------------------------------
AI SAFETY PRINCIPLES
--------------------------------------------------

The AI must never:

1. treat planned frontend modules as implemented routes
2. bypass canonical write functions when an approved function exists
3. create schema changes without updating aligned AI database docs
4. assume empty or missing documentation means a feature exists
5. reference stale repository paths that are not in the live codebase
6. mix this repository with a different business system or external project unless the user explicitly authorizes it
7. treat TRAIN as production or recommend writes/tests against PROD


--------------------------------------------------
ENVIRONMENT GOVERNANCE
--------------------------------------------------

Official environment model for the current stage:

- `LOCAL` = developer application/runtime workspace
- `TRAIN` = current remote backend used for controlled development validation, smoke tests, hardening, and supervised business rehearsal
- `LIVE` = deployed application surface
- `PROD` = clean production backend for real operation

Architecture rule:

- `LOCAL` may work against `TRAIN`
- `LIVE` must work against `PROD`
- `TRAIN` and `PROD` must remain separate Supabase projects
- AI should optimize for this 2-database topology unless the user explicitly requests a more complex environment strategy

Promotion rule:

- move approved structure from TRAIN to PROD through canonical migrations, seeds, and documented config
- do not promote incidental TRAIN data into PROD
- while TRAIN is in hardening phase, prefer stability-only work and do not add new live modules unless the user explicitly re-prioritizes


--------------------------------------------------
MAINTENANCE RULES
--------------------------------------------------

Whenever a new AI document is added:

- include it in this map
- define its owner concern
- place it correctly in read order

Whenever module inventory changes:

- update AI_CONTEXT.md
- update AI_CURRENT_PROJECT_MAP.md

Whenever database objects change:

- update the canonical SQL
- update the database docs
- refresh the frontend type contract

Whenever the governance layer drifts:

- update AI_SYSTEM_AUDIT.md
