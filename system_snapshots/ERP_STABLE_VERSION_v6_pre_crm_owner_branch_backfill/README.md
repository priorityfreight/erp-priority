## ERP_STABLE_VERSION_v6_pre_crm_owner_branch_backfill

Snapshot created on 2026-03-25 before activating CRM owner/branch backfill and extending `owner_only` / `assigned_branch_only` to additional resources.

### Purpose
- preserve a rollback point before touching live CRM ownership and branch defaults
- allow safe recovery if client/contact/opportunity scope enforcement needs to be reverted

### Scope to be introduced after this snapshot
- controlled backfill of `users.branch_id`
- controlled backfill of `clients.account_owner_id` and `clients.branch_id`
- controlled backfill of `opportunities.salesperson_id`
- trigger defaults so new CRM records inherit canonical owner/branch values
- owner-scoped enforcement for clients, contacts, client logistics parties, and opportunities

### Safe rollback
- restore repository state prior to this snapshot
- revert migrations applied after this snapshot if cloud rollback is needed
