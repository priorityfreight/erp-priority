# Live/Local Validation Rollback Metadata

- Generated at: `2026-03-28T08:25:41.113Z`
- Branch: `main`
- Commit: `7256931394dafbd58adde1f710ee46de78a53b4e`
- Rollback branch: `codex/live-local-validation-baseline-20260327`
- Rollback branch exists: `true`
- Target kind: `train`
- Target project ref: `chnxpajsawbfevuakhsm`
- Protected target: `true`

```text
## main...origin/main [ahead 1]
 M AI_SYSTEM/AI_BACKEND_SYNC_RULES.md
 M AI_SYSTEM/AI_COMPONENT_LIBRARY.md
 M AI_SYSTEM/AI_CONTEXT.md
 M AI_SYSTEM/AI_CURRENT_PROJECT_MAP.md
 M AI_SYSTEM/AI_DESIGN_SYSTEM.md
 M AI_SYSTEM/AI_QUERY_GUIDE.md
 M AI_SYSTEM/AI_QUERY_LIBRARY.md
 M AI_SYSTEM/AI_SYSTEM_AUDIT.md
 M AI_SYSTEM/AI_SYSTEM_MAP.md
 M docs/ERP_RELEASE_HARDENING_CHECKLIST.md
 M frontend/.gitignore
 M frontend/app/clients/[id]/page.tsx
 M frontend/app/clients/page.tsx
 M frontend/app/contacts/page.tsx
 M frontend/app/globals.css
 M frontend/app/layout.tsx
 M frontend/app/opportunities/[id]/page.tsx
 M frontend/app/opportunities/page.tsx
 M frontend/app/pricing/providers/[id]/page.tsx
 M frontend/app/pricing/providers/page.tsx
 M frontend/app/pricing/quotations/page.tsx
 M frontend/app/quotations/[id]/document/page.tsx
 M frontend/app/quotations/[id]/document/pdf/route.ts
 M frontend/app/quotations/[id]/page.tsx
 M frontend/app/quotations/[id]/pricing-request/page.tsx
 M frontend/app/quotations/[id]/pricing-request/pdf/route.ts
 M frontend/app/quotations/page.tsx
 M frontend/package-lock.json
 M frontend/package.json
 M frontend/src/components/data/Modal.tsx
 M frontend/src/components/forms/ClientForm.tsx
 M frontend/src/components/forms/ContactForm.tsx
 M frontend/src/components/forms/OpportunityForm.tsx
 M frontend/src/components/forms/QuotationForm.tsx
 M frontend/src/components/forms/UnlocodeLookupField.tsx
 M frontend/src/components/forms/UserForm.tsx
 M frontend/src/components/layout/Brand.tsx
 M frontend/src/components/master-data/ExchangeRateManager.tsx
 M frontend/src/components/master-data/MasterDataOverview.tsx
 M frontend/src/components/master-data/QuotationRejectionReasonManager.tsx
 M frontend/src/components/master-data/RolesPermissionsManager.tsx
 M frontend/src/components/master-data/SalesAccountingConceptManager.tsx
 M frontend/src/components/master-data/ServiceTransportTypeManager.tsx
 M frontend/src/components/master-data/UsersManager.tsx
 M frontend/src/lib/db/backendMode.ts
 M frontend/src/lib/db/clients.ts
 M frontend/src/lib/db/contacts.ts
 M frontend/src/lib/db/index.ts
 M frontend/src/lib/db/masterData.ts
 M frontend/src/lib/db/models.ts
 M frontend/src/lib/db/opportunities.ts
 M frontend/src/lib/db/permissions.ts
 M frontend/src/lib/db/providers.ts
 M frontend/src/lib/db/quotations.ts
 M frontend/src/lib/masterData/unlocodeSnapshot.ts
 M supabase/ERP_functions.sql
 M supabase/ERP_triggers.sql
?? AI_SYSTEM/AI_BLACKBOOK.md
?? assets/logo_HSVG.svg
?? assets/logo_vSVG.svg
?? docs/PROD_BOOTSTRAP_CHECKLIST.md
?? docs/architecture/
?? docs/validation/
?? frontend/components.json
?? frontend/public/assets/logo_HSVG.svg
?? frontend/public/assets/logo_vSVG.svg
?? frontend/public/brand/priority-wordmark-dark.svg
?? frontend/public/brand/priority-wordmark-light.svg
?? frontend/scripts/validation/
?? frontend/src/components/layout/AppProviders.tsx
?? frontend/src/components/priority/
?? frontend/src/components/ui/
?? frontend/src/features/
?? frontend/src/lib/brand.ts
?? frontend/src/lib/db/rpcPatch.ts
?? frontend/src/lib/feedback.ts
?? frontend/src/lib/utils.ts
?? supabase/migrations/20260327113000_canonical_live_write_paths.sql
?? supabase/migrations/20260327190000_train_cleanup_purge_ephemeral_clients.sql
?? supabase/migrations/20260327221500_lock_quotation_option_creation_and_align_break_harness.sql
?? supabase/migrations/20260327233000_permissions_rpc_and_unlocode_short_query_optimization.sql
```
