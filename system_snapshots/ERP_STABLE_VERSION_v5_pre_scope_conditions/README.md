# ERP_STABLE_VERSION_v5_pre_scope_conditions

Snapshot date:
2026-03-24

Purpose:
Rollback point before activating real permission conditions such as owner_only and assigned_branch_only in live ERP workflows.

Baseline:
- Login gate with Supabase Auth
- Canonical permissions registry and roles workspace
- Route-aware navigation driven by permissions
- Quotation sensitive field masking for cost, sale_price, and expected_profit
- Live CRM, Pricing, Master Data, and quotation workflows

Why this snapshot exists:
- The next phase changes record-level authorization behavior, not only navigation or field masking
- Role permissions will begin enforcing row ownership and branch scope on real business data
- Search RPCs and detail reads may need scope-aware filtering to remain aligned with RLS

Rollback expectation:
- If scope-aware permissions hide valid records or block live workflows unexpectedly, restore repo and database behavior to the state immediately prior to the scope-condition rollout
- Revalidate login, clients, opportunities, quotations, pricing workspace, and permissions workspace after rollback
