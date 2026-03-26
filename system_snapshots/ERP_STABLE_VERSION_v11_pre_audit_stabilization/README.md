# ERP Stable Version v11 — Pre Audit Stabilization

Date:
2026-03-25

Purpose:
Rollback checkpoint created before the master audit and stabilization pass focused on:

- canonical cleanup of quotation RPC contracts
- elimination of legacy overloads still active in Supabase cloud
- frontend/backend contract alignment
- audit reporting of current-state stability, drift, and cleanup decisions

Baseline preserved at this checkpoint:

- auth access control with route-aware permissions
- roles and permissions registry
- quotation workflow CRM <-> Pricing
- quotation option model with option-level validity
- quotation cargo-line unified model
- BANXICO exchange-rate sync and MXN profit normalization
- UN/LOCODE dataset and canonical lookup flow
- centralized branding/assets and retractable permission-aware sidebar

High-risk items expected to change after this checkpoint:

- `create_quotation_from_opportunity` signature
- legacy overloaded quotation RPCs still active remotely
- regenerated Supabase types for quotation RPCs
- audit documentation and cleanup backlog

Rollback rule:
If the stabilization pass introduces regressions in quotation creation, pricing capture, or
type generation, use this checkpoint as the documented pre-change baseline.
