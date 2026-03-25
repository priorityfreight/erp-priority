# ERP_STABLE_VERSION_v4_pre_permissions_registry

Snapshot date:
2026-03-24

Purpose:
Rollback point before introducing the canonical permissions registry, role-aware navigation, and coarse-grained role enforcement across frontend and backend.

Baseline:
- Active login gate with Supabase Auth
- Master Data / Users
- CRM modules: clients, contacts, opportunities, quotations
- Pricing modules: providers, pricing quotations
- Master Data catalogs and UN/LOCODE
- Existing quotation stability optimizations pending local commit

Why this snapshot exists:
- The next phase changes authorization architecture, not only UI
- RLS policies will move from active-user-only checks to permission-aware checks
- Sidebar, route visibility, and roles administration will begin consuming the new permissions registry

Rollback expectation:
- If the permissions rollout introduces instability, restore the repo and database to the state immediately prior to the permissions registry migration set
- Validate login, CRM, pricing quotations, and master data users after rollback
