# Live/Local Static Validation Signals

Generated at: `2026-03-27T18:30:21.048Z`

- [MEDIUM] Large live route component (898 LOC) — `frontend/src/components/master-data/RolesPermissionsManager.tsx`
  This route deserves targeted smoke and concurrency coverage because behavior is concentrated in one client-heavy file.
- [MEDIUM] Mixed RPC workflows and direct table mutations — `frontend/src/lib/db/clients.ts`
  This live query module mixes canonical RPC paths with direct writes, which increases drift and makes concurrency issues harder to reason about.
- [MEDIUM] Fallback or legacy branches remain in live data access — `frontend/src/lib/db/clients.ts`
  Temporary rollback-safety logic is still present in a live module, so canonical-vs-fallback behavior needs explicit regression coverage.
- [MEDIUM] Fallback or legacy branches remain in live data access — `frontend/src/lib/db/backendMode.ts`
  Temporary rollback-safety logic is still present in a live module, so canonical-vs-fallback behavior needs explicit regression coverage.
- [MEDIUM] Large live route component (1101 LOC) — `frontend/app/clients/[id]/page.tsx`
  This route deserves targeted smoke and concurrency coverage because behavior is concentrated in one client-heavy file.
- [MEDIUM] High local state density (29 useState calls) — `frontend/app/clients/[id]/page.tsx`
  The page manages enough local state to make stale UI, missed refreshes, or unnecessary rerenders more likely under heavy usage.
- [MEDIUM] Mixed RPC workflows and direct table mutations — `frontend/src/lib/db/contacts.ts`
  This live query module mixes canonical RPC paths with direct writes, which increases drift and makes concurrency issues harder to reason about.
- [MEDIUM] Mixed RPC workflows and direct table mutations — `frontend/src/lib/db/opportunities.ts`
  This live query module mixes canonical RPC paths with direct writes, which increases drift and makes concurrency issues harder to reason about.
- [MEDIUM] Fallback or legacy branches remain in live data access — `frontend/src/lib/db/masterData.ts`
  Temporary rollback-safety logic is still present in a live module, so canonical-vs-fallback behavior needs explicit regression coverage.
- [HIGH] Very large live route component (1567 LOC) — `frontend/app/quotations/[id]/page.tsx`
  This route is large enough to increase regressions, rerender cost, and validation surface during concurrent workflows.
- [MEDIUM] Large live route component (705 LOC) — `frontend/app/pricing/providers/[id]/page.tsx`
  This route deserves targeted smoke and concurrency coverage because behavior is concentrated in one client-heavy file.
- [MEDIUM] Large live route component (1063 LOC) — `frontend/app/pricing/quotations/page.tsx`
  This route deserves targeted smoke and concurrency coverage because behavior is concentrated in one client-heavy file.
- [MEDIUM] Fallback or legacy branches remain in live data access — `frontend/src/lib/masterData/unlocodeSnapshot.ts`
  Temporary rollback-safety logic is still present in a live module, so canonical-vs-fallback behavior needs explicit regression coverage.
