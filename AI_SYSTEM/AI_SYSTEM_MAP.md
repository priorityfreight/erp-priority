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
4. AI_MASTER_DATA.md when working on shared catalogs or external datasets
5. AI_DATABASE_MAP.md
6. AI_DATABASE_RELATION_GRAPH.md
7. AI_TABLE_DICTIONARY.md
8. AI_QUERY_GUIDE.md
9. AI_QUERY_LIBRARY.md
10. AI_DEV_RULES.md
11. AI_BACKEND_SYNC_RULES.md
12. AI_MODULE_BUILDER.md
13. AI_UI_BUILDER.md
14. AI_DESIGN_SYSTEM.md
15. AI_COMPONENT_LIBRARY.md
16. AI_AUTOMATION_RULES.md
17. AI_SYSTEM_AUDIT.md when validating governance quality


--------------------------------------------------
DOCUMENT RESPONSIBILITIES
--------------------------------------------------

AI_CONTEXT.md

Purpose:
Defines the high-level product, architecture, implementation boundaries, and current AI guardrails.

AI_CURRENT_PROJECT_MAP.md

Purpose:
Describes what currently exists in the repository, including live routes, query modules, and structural risks.

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

AI_AUTOMATION_RULES.md

Purpose:
Defines trigger-based and workflow automation rules.

AI_SYSTEM_AUDIT.md

Purpose:
Tracks the health of the governance layer itself.


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
