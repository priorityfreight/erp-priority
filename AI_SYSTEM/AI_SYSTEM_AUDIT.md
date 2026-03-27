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

Latest stabilization note:

- quotation cargo capture was simplified again on 2026-03-26
- the prior single-row cargo-entry assumption is no longer canonical
- the live quotation detail now uses a multi-row spreadsheet-style cargo modal with accumulated calculations
- AI governance documents were updated in the same change set to keep the cargo workflow synchronized
- pricing cost capture was also normalized into a multi-row spreadsheet-style modal on 2026-03-26
- the older stacked single-charge layout is no longer the canonical pricing capture pattern
- pricing option persistence was optimized into a batch-save path so multi-line option edits no longer trigger repeated quotation recalculation per row
- customer-facing quotation output was upgraded again on 2026-03-27
- the canonical customer document is now the server-side PDF download route under frontend/app/quotations/[id]/document/pdf/route.ts
- customer quotation PDFs are generated in memory and downloaded directly; they are not persisted in cloud storage
- the customer quotation preview remains a separate web reference surface and must stay synchronized with the real PDF
- customer quotation layout now treats route, load information, and per-option commercial presentation as governed UX areas

What is now aligned:

- canonical schema, functions, views, and triggers
- master data governance for external public datasets
- AI database governance documents
- frontend clients, contacts, and opportunities query layer
- current repo path inventory in the top-level context documents
- live quotation cargo capture behavior and the AI documents that describe it
- provider-facing pricing-request now has both a web preview and a real internal PDF route
- "/" now redirects to the canonical "/dashboard" entry point

What still has residual drift:

- UI/design/component documents are more aspirational than descriptive
- generated Supabase types can drift again if future schema changes do not explicitly clean legacy RPC signatures
- some planned ERP modules exist only at the database layer
- the quotation domain has historically changed faster than its migration cleanup discipline
- backendMode.ts remains as rollback safety even though the linked cloud environment is now canonical


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

4. backendMode.ts still remains as temporary rollback safety even though the linked cloud environment is now canonical.

5. Quotation process changes must now be treated as a governed area:
   - one canonical RPC contract per action
   - explicit `drop function if exists` cleanup for legacy signatures
   - regenerated frontend types after backend changes
   - synchronized AI_SYSTEM updates whenever live quotation UX rules change
   - synchronized customer-preview and customer-PDF layouts whenever branding or commercial structure changes


--------------------------------------------------
RELEASE-READINESS CLEANUP BACKLOG
--------------------------------------------------

Current version is materially improved and close to release-ready, but these cleanup items should be treated as the next controlled hardening pass:

1. Keep backendMode.ts only as temporary rollback safety; remove fallback branches once the next stabilization cycle passes.

2. Continue tightening shared quotation document tokens so the preview pages and downloadable PDFs cannot drift visually.

3. Add a small release smoke suite for:
   - opportunity → quotation
   - pricing option capture
   - customer option selection
   - PDF download
   - accepted quotation → booking


--------------------------------------------------
AUTOMATION OPPORTUNITIES
--------------------------------------------------

Highest-value automation opportunities before the next major module:

1. Daily or pre-release smoke-test execution for login, CRM, quotations, pricing, and booking.

2. Branding asset sync from repository-level ASSETS/ into frontend/public/assets/ to avoid broken or outdated runtime logos.

3. Quotation-governance checklist automation reminding that any change to:
   - pricing capture UX
   - customer quotation output
   - provider pricing request output
   must also update AI_CONTEXT, AI_QUERY_GUIDE, AI_UI_BUILDER, and AI_SYSTEM_AUDIT.


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
2. implement planned modules before exposing them in navigation or presenting them as complete UI areas
3. keep quotation cargo UX rules synchronized across live code, AI_CONTEXT, AI_QUERY_GUIDE, and AI_UI_BUILDER whenever the spreadsheet modal evolves
4. continue tightening UI governance docs so target state and live state are clearly separated
5. keep customer-document and provider-document previews synchronized with their real PDF outputs whenever quotation layout changes


--------------------------------------------------
MAINTENANCE RULE
--------------------------------------------------

Whenever a future audit finds drift, update:

- AI_CONTEXT.md
- AI_SYSTEM_MAP.md
- AI_CURRENT_PROJECT_MAP.md
- the affected specialized document

in the same change set.
