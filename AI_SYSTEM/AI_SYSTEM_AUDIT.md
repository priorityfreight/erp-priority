# AI SYSTEM AUDIT

This document tracks the health of the AI governance system for the Priority Logistics ERP repository.

It should be updated whenever:

- AI documents are added or removed
- the canonical schema changes
- the live frontend module inventory changes
- major governance drift is discovered


--------------------------------------------------
AUDIT SCOPE
--------------------------------------------------

This audit covers the active AI governance files in AI_SYSTEM/:

- AI_CONTEXT.md
- AI_SYSTEM_MAP.md
- AI_CURRENT_PROJECT_MAP.md
- AI_MASTER_DATA.md
- AI_DATABASE_MAP.md
- AI_DATABASE_RELATION_GRAPH.md
- AI_TABLE_DICTIONARY.md
- AI_QUERY_GUIDE.md
- AI_QUERY_LIBRARY.md
- AI_DEV_RULES.md
- AI_MODULE_BUILDER.md
- AI_UI_BUILDER.md
- AI_DESIGN_SYSTEM.md
- AI_COMPONENT_LIBRARY.md
- AI_AUTOMATION_RULES.md


--------------------------------------------------
CURRENT STATUS
--------------------------------------------------

Overall status:

Partially aligned, materially improved after Sprint 1 through Sprint 3 remediation, with the
quotation RPC stabilization pass completed on 2026-03-25.

What is now aligned:

- canonical schema, functions, views, and triggers
- master data governance for external public datasets
- AI database governance documents
- frontend clients, contacts, and opportunities query layer
- current repo path inventory in the top-level context documents

What still has residual drift:

- UI/design/component documents are more aspirational than descriptive
- generated Supabase types can drift again if future schema changes do not explicitly clean legacy RPC signatures
- some planned ERP modules exist only at the database layer
- the quotation domain has historically changed faster than its migration cleanup discipline


--------------------------------------------------
DOCUMENT HEALTH REVIEW
--------------------------------------------------

AI_CONTEXT.md

Status:
Aligned to the live repository and canonical boundaries.

AI_SYSTEM_MAP.md

Status:
Aligned to the active AI document set and actual repo paths.

AI_CURRENT_PROJECT_MAP.md

Status:
Aligned to the current repository inventory.

Operational note:
The linked Supabase cloud backend was migrated to the canonical schema and master data contract on 2026-03-22.

AI_MASTER_DATA.md

Status:
Defines the cross-cutting rules for public datasets and repeatable import pipelines.

AI_DATABASE_MAP.md
AI_DATABASE_RELATION_GRAPH.md
AI_TABLE_DICTIONARY.md
AI_QUERY_GUIDE.md

Status:
Aligned to the canonical Sprint 1 schema baseline and the post-migration cloud backend.

AI_QUERY_LIBRARY.md

Status:
Now documents the live frontend query layer.

AI_DEV_RULES.md

Status:
Useful and active, but depends on the higher-level docs staying current.

AI_MODULE_BUILDER.md

Status:
Useful for new module creation, but must be read with the current project map so planned modules are not mistaken for live ones.

AI_UI_BUILDER.md
AI_DESIGN_SYSTEM.md
AI_COMPONENT_LIBRARY.md

Status:
Target-state guidance.
These are not reliable descriptions of the current UI by themselves.

AI_AUTOMATION_RULES.md

Status:
Conceptually aligned with the trigger-based automation layer, though future validation should continue as automation expands.


--------------------------------------------------
PRIMARY RISKS
--------------------------------------------------

1. Database breadth exceeds frontend breadth.
This is acceptable architecturally, but it remains the biggest source of AI confusion if inventory docs are ignored.

2. frontend/src/types/supabase.ts can drift whenever older RPC signatures remain active remotely.
The current stabilization pass restored canonical quotation RPC signatures, but the discipline must
continue in future migrations.

3. UI governance docs still describe a richer shell and component system than the current app implements.

4. The app currently has both "/" and "/dashboard" as user-facing entry points.

5. Quotation process changes must now be treated as a governed area:
   - one canonical RPC contract per action
   - explicit `drop function if exists` cleanup for legacy signatures
   - regenerated frontend types after backend changes


--------------------------------------------------
DUPLICATION AND OVERLAP
--------------------------------------------------

Expected overlap:

- AI_CONTEXT.md defines boundaries
- AI_CURRENT_PROJECT_MAP.md defines current implementation inventory
- AI_SYSTEM_MAP.md defines document responsibilities

This overlap is intentional and useful.

Risky overlap:

- AI_UI_BUILDER.md, AI_DESIGN_SYSTEM.md, and AI_COMPONENT_LIBRARY.md can be mistaken for current implementation docs

Mitigation:

- treat them as target-state guidance
- verify live code before relying on them for inventory


--------------------------------------------------
AUDIT CONCLUSIONS
--------------------------------------------------

The highest-risk governance failure from the earlier audit was documentation describing a different project than the codebase.

That issue is now substantially reduced.

The remaining high-impact gaps are:

1. keep quotation RPC cleanup discipline in future migrations and regenerate Supabase types after backend changes
2. decide whether "/" or "/dashboard" is the canonical entry point
3. implement planned modules before exposing them in navigation or presenting them as complete UI areas
4. continue tightening UI governance docs so target state and live state are clearly separated


--------------------------------------------------
MAINTENANCE RULE
--------------------------------------------------

Whenever a future audit finds drift, update:

- AI_CONTEXT.md
- AI_SYSTEM_MAP.md
- AI_CURRENT_PROJECT_MAP.md
- the affected specialized document

in the same change set.
