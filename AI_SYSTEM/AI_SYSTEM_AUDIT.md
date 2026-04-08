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
- AI_BLACKBOOK.md
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

Latest browse-baseline note:

- on 2026-04-05 the browse/list baseline was tightened again around `PriorityCollectionWorkspace`, `PriorityCollectionTable`, `PrioritySavedViews`, and `PriorityKanbanBoard`
- quotation workspaces now push lane/status, column filters, sorting, pagination, and page size through `search_quotations()` instead of filtering only the current client page
- `workspace_saved_views` is now the canonical persistence layer for search, filters, sorting, lanes/tabs, and visible-column preferences
- `PriorityDataTable` no longer acts as the approved browse standard; it remains only as a compatibility wrapper around `PriorityCollectionTable`
- on 2026-04-07 mailing was promoted into the live baseline:
  - `Master Data > Mail` became the canonical mailbox admin surface
  - mailbox signatures were formalized through `mailboxes.signature_image_url`
  - `/api/mail/signature-image` was added as the approved proxy path for remote signature images such as Google Drive
  - quotation email tabs were tightened so sales sees customer-facing threads and pricing sees provider-facing threads
  - production sign-off for the merged baseline now routes through `docs/PRODUCTION_RELEASE_CLOSEOUT.md` so Vercel, DB, workspace smoke, and mailing smoke stay on one checklist
- on 2026-04-08 the branch/environment strategy was formalized:
  - `main` is the production branch
  - `dev` is the stable shared development integration branch
  - Vercel maps `main` to `Production` and `dev` to the stable shared `Preview`
  - the current linked Supabase backend is treated as `DEV/TRAIN`
  - a separate clean Supabase backend remains the required `PROD` target
- on 2026-04-08 the clean `PROD` bootstrap strategy was formalized:
  - replaying the full historical migration chain is no longer considered safe for a blank production database
  - `supabase/baselines/20260408120000_prod_bootstrap_baseline.sql` is now the canonical clean bootstrap artifact
  - `supabase/seeds/prod_seed.sql` is the controlled production seed
  - historical migrations remain repository history and TRAIN upgrade history, not the canonical clean bootstrap path

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
- repository-identity policy is now explicit: this repo is only for Priority Logistics ERP and must not be mixed with other business systems unless the user explicitly requests it
- environment policy is now explicit: the current linked backend is treated as TRAIN and the future production cutover must use a separate clean PROD backend
- branch policy is now explicit: `main` and `dev` are the only long-lived branches; `main` is production and `dev` is the stable integration branch
- hardening-phase policy is now explicit: TRAIN is allowed to run destructive validation only with prefixed ephemeral data, ledger tracking, cleanup, and clean-state verification
- AI governance now includes a formal black book so proven hardening lessons and recurring failure patterns are preserved for future module work instead of rediscovered ad hoc

What is now aligned:

- canonical schema, functions, views, and triggers
- master data governance for external public datasets
- AI database governance documents
- frontend clients, contacts, and opportunities query layer
- current repo path inventory in the top-level context documents
- live quotation cargo capture behavior and the AI documents that describe it
- provider-facing pricing-request now has both a web preview and a real internal PDF route
- "/" now redirects to the canonical "/dashboard" entry point
- AI governance now explicitly defines project-boundary rules and a simplified TRAIN/PROD environment model
- the governance layer now includes a reusable operational-memory file for hardening lessons, approved fixes, and prevention rules
- the live CRM and master-data query layer now operate in canonical-only mode; fallback branches were retired from the active path on 2026-03-27
- the Priority UI layer now has a formal registry, typed export surface, and isolated Storybook workbench for visual review
- browser-level frontend validation now has a formal Playwright setup for screenshots, traces, and critical-route coverage
- repository closeout now also has a single local gate script intended to produce a final `READY_FOR_REPO` or `NOT_READY_FOR_REPO` decision artifact
- the visual-validation stack now includes an external Playwright browser-server fallback so local macOS launcher failures do not block frontend automation entirely
- the validation stack now also includes an automatic repo-gate wrapper that can bootstrap the external browser server, run the handoff gate, and clean temporary metadata in one command

What still has residual drift:

- UI/design/component documents are more aspirational than descriptive
- generated Supabase types can drift again if future schema changes do not explicitly clean legacy RPC signatures
- some planned ERP modules exist only at the database layer
- the quotation domain has historically changed faster than its migration cleanup discipline
- remaining fallback assets are now recovery-only and no longer part of the live query path
- local browser execution for Playwright remains environment-dependent; Codex sandbox cannot be treated as the final browser-proof source of truth
- direct browser launch can fail under Codex-hosted macOS execution even when the app is healthy; the sanctioned fallback is to connect to an externally started Playwright browser server from a normal local terminal


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

AI_BLACKBOOK.md

Status:
New operational-memory document capturing real failure modes, validated fixes, and prevention rules.

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
AI_PRIORITY_UI_REGISTRY.md

Status:
Materially improved.
They now describe the approved foundation, wrapper registry, and visual-review workflow more accurately, but should still be read together with the current project map and live routes.

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

4. generated Supabase types still require disciplined regeneration when new RPCs are added to the canonical backend.

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

1. Continue tightening shared quotation document tokens so the preview pages and downloadable PDFs cannot drift visually.

2. Add a small release smoke suite for:
   - opportunity → quotation
   - pricing option capture
   - customer option selection
   - PDF download
   - accepted quotation → booking
3. Keep Storybook stories aligned with live Priority wrappers whenever the wrapper contract changes.


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
