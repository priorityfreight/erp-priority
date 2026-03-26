# ERP Stability Audit — 2026-03-25

## Executive Summary

This audit was executed to stabilize the current ERP before expanding additional modules.
The system already contains significant valid progress, but quotations accumulated the most
technical drift because the process evolved faster than the RPC contracts and generated types.

The objective of this pass is:

- preserve all valid current business improvements
- remove legacy contracts that no longer represent the live process
- restore a single canonical contract for quotation creation and pricing cost capture
- document what is active, deprecated, broken, and pending

## Completed Stabilization Results

This pass has already completed the critical quotation cleanup:

- `create_quotation_from_opportunity` now exposes a single canonical signature aligned to the live workflow
- legacy overloads of `create_quotation_cost_line` and `update_quotation_cost_line` were removed
- `ensure_quotation_option` now exposes option-level validity fields in the generated type contract
- `update_quotation_option_validity` is now present in generated types and the frontend no longer needs a loose RPC escape hatch
- `frontend/src/types/supabase.ts` was regenerated from the live project after cleanup

Validation completed:

- `supabase db push --dry-run`
- `supabase db push`
- `npm run types`
- `npm run lint`
- `npm run build`
- live RPC check for `create_quotation_from_opportunity`
- live `search_quotations()` smoke check
- live end-to-end quotation smoke:
  - opportunity -> quotation
  - request pricing
  - take quotation
  - create pricing cost line
  - option-level validity
  - sale amount update
  - quotation accepted
  - FX locked on acceptance
  - booking created

## Severity Summary

### Critical

1. `create_quotation_from_opportunity` had multiple active overloads in Supabase cloud.
   - Root cause: legacy migration-defined signatures were left active after the quotation flow changed.
   - Business impact: quotation creation from opportunities failed in live use.
   - Technical impact: PostgREST returned `PGRST203` because it could not choose a single candidate RPC.
   - Decision: remove legacy overloads and keep a single canonical signature aligned to the live process.

### High

2. `create_quotation_cost_line` and `update_quotation_cost_line` still exposed legacy overloads.
   - Root cause: successive quotation redesigns added new signatures without fully dropping older ones.
   - Business impact: pricing capture remained fragile and types stayed ambiguous.
   - Technical impact: generated types showed unions for obsolete contracts.
   - Decision: explicitly drop obsolete signatures and recreate one canonical version.

3. `ensure_quotation_option` and generated types were out of sync.
   - Root cause: the backend now returns option-level validity fields, but generated types still reflected an older return contract.
   - Business impact: frontend had to use temporary escape hatches for newer option-validity behavior.
   - Technical impact: weaker compile-time guarantees and higher regression risk.
   - Decision: recreate the canonical function and regenerate types after cleanup.

### Medium

4. Quotation header validity fields are still physical in the schema.
   - Root cause: the process moved validity to `quotation_options`, but legacy header columns remain.
   - Business impact: confusion risk if reused by mistake.
   - Technical impact: schema retains deprecated columns.
   - Decision: keep physical columns temporarily for low-risk migration, but treat them as deprecated and keep them out of live flow.

5. Frontend and AI governance docs required a stabilization pass to distinguish live process from historical process.
   - Root cause: rapid iteration across CRM/Pricing/FX/UI.
   - Business impact: higher onboarding and maintenance cost.
   - Technical impact: harder to identify which behavior is canonical.
   - Decision: update audit and core AI governance docs in the same change set.

## Canonical Current Process

### Quotations

- `quotations` is the commercial header.
- `quotation_options` is the customer-facing option grouping layer.
- `quotation_costs` stores purchase/sale lines per option.
- `quotation_cargo_lines` stores cargo detail for all service types.
- `required_quote_date` lives in the header.
- `purchase_valid_until` and `sales_valid_until` live at option level.
- `sales_valid_until` follows purchase validity by default and may only be overridden by Admin.
- provider names never appear in the customer-facing quotation document.
- customer name never appears in the provider RFQ.
- profit is normalized to MXN using stored exchange rates.

## Keep / Correct / Remove Matrix

### Keep

- permissions registry and permission-aware navigation
- quotation option model
- option-level validity logic
- quotation cargo-line unified workflow
- BANXICO FX synchronization
- sensitive field permissions for cost / sale price / expected profit

### Correct

- quotation RPC signatures
- generated Supabase types
- quotation views that expose deprecated header validity semantics
- AI system audit and database guidance docs

### Remove

- legacy overloads of `create_quotation_from_opportunity`
- legacy overloads of `create_quotation_cost_line`
- legacy overloads of `update_quotation_cost_line`
- any live dependency on header-level purchase/sales validity rules

## Audit Backlog

### 1. Blocking operational fixes

- maintain the new quotation RPC cleanup discipline for future migrations
- keep type generation tied to backend changes
- preserve live smoke tests for quotation creation and pricing flow

### 2. Structural debt

- continue deprecating header-level validity semantics
- audit other evolving domains for similar overload drift

### 3. Frontend / UX cleanup

- remove any remaining copy or controls that suggest the old quotation process
- keep branding sourced only from the centralized assets path

### 4. Performance / scalability

- continue expanding paginated RPC search patterns across remaining list-heavy modules
- keep expensive financial aggregations out of list views

## Release Gate

This stabilization pass is only considered complete when all of the following pass:

- `supabase db push --dry-run`
- `supabase db push`
- `npm run types`
- `npm run lint`
- `npm run build`
- real quotation smoke tests in cloud

## Acceptance Criteria

- quotation creation works again from opportunities
- no active legacy overloads remain for the critical quotation RPCs
- generated types reflect the real backend contract
- current quotation UI follows the current process only
- roles and sensitive-field permissions still work after cleanup
