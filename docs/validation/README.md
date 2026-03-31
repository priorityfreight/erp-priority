# Live/Local Validation Toolkit

This toolkit is intentionally limited to the modules and routes that already exist in the live/local frontend.

Included live/local scope:
- login and access control
- dashboard
- users
- roles and permissions
- clients and client detail
- contacts
- opportunities and opportunity detail
- quotations and quotation detail
- customer quotation preview/PDF
- pricing request preview/PDF
- pricing/providers and provider detail
- pricing/quotations
- master data shell
- service transport types
- sales accounting concepts
- quotation rejection reasons
- exchange rates
- UN/LOCODE lookup

Excluded from this toolkit as standalone modules:
- shipments module
- client invoices
- provider invoices
- commissions
- advanced reporting modules not live in the frontend

## Commands

Run from [`frontend/package.json`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/frontend/package.json):

- `npm run validation:rollback`
  Verifies the current repo state and confirms the rollback branch exists before edits or write tests.

- `npm run validation:inventory`
  Regenerates the live/local module matrix and static risk signals.

- `npm run validation:baseline`
  Captures read-only row counts for the tables used by live modules.

- `npm run validation:bootstrap-sessions`
  Creates an ephemeral session pool for `sales`, `pricing`, and `admin` in TRAIN or an approved writable clone, sized to the current `VALIDATION_LOAD_LEVEL`, then writes runtime credentials to `frontend/.validation/session-users.generated.json`.

- `npm run validation:audit`
  Runs rollback verification, inventory, row-count baseline, `lint`, and `build`, then writes a current-state audit report.

- `npm run validation:access-matrix`
  Signs in named personas from the generated session pool and verifies expected allow/deny route behavior plus navigation visibility before destructive tiers run.

- `npm run validation:field-masking`
  Signs in named personas from the generated session pool and verifies expected allow/deny behavior for sensitive field-level permissions before destructive tiers run.

- `npm run validation:break`
  Runs destructive break scenarios on TRAIN or an approved writable clone, then writes a structured break report and ledger.

- `npm run validation:stress`
  Runs the multi-user harness with retries, per-scenario timing, and thresholds. This command refuses to write unless the target is explicitly configured as `TRAIN` with an explicit unlock or as a staging clone.

- `npm run validation:stress-sequence`
  Runs the full rollback -> baseline -> smoke -> access-matrix -> field-masking -> break -> light/medium/heavy/stress -> cleanup -> report sequence and stops immediately if any load tier leaves residue or fails.

- `npm run validation:cleanup`
  Cleans test data using the last run ledger. Preferred strategy remains destroying the staging clone after tests.

## Safety Guardrails

- The protected linked project ref `chnxpajsawbfevuakhsm` is treated as read-only for validation.
- `validation:stress` and `validation:cleanup` require:
- `validation:bootstrap-sessions` requires:
  - `VALIDATION_TARGET_KIND=train` plus `VALIDATION_ALLOW_TRAIN_WRITES=true`, or
  - `VALIDATION_TARGET_KIND=staging-clone`
  - `VALIDATION_SUPABASE_URL`
  - `VALIDATION_SUPABASE_SERVICE_ROLE_KEY`
  - `VALIDATION_SUPABASE_ANON_KEY` for later authenticated sign-in flows
- All generated runtime artifacts go to `frontend/.validation/`.
- All committed reports go to `docs/validation/`.
- The stress harness records created IDs so cleanup can run deterministically.
- Test prefixes are limited to `TEST_`, `LOADTEST_`, `QA_`, and `STRESS_`.
- Validation session users use the generated domain `validation.priority-erp.test` and are removed from both `public.users` and `auth.users` by `validation:cleanup`.
- `validation:access-matrix` is the named-persona preflight gate for route visibility and expected denials before destructive workflows start.
- `validation:field-masking` is the named-persona preflight gate for sensitive field access before destructive workflows start.
- `validation:stress` reuses pre-signed session pools instead of signing in on every job. Authenticated route checks run after the concurrency peak and only against a controlled subset of pooled sessions.
- Session pool sizing is proportional to the load level but capped to an auth-safe maximum so the harness measures ERP behavior instead of Auth sign-in throttling.
- Each stress summary records the required session-pool counts, the signed-in pool counts actually used, and how many authenticated post-peak checks were executed.

## Optional Environment Variables

- `VALIDATION_SUPABASE_URL`
- `VALIDATION_SUPABASE_ANON_KEY`
- `VALIDATION_SUPABASE_SERVICE_ROLE_KEY`
- `VALIDATION_TARGET_KIND`
- `VALIDATION_ALLOW_TRAIN_WRITES`
- `VALIDATION_LOAD_LEVEL`
- `VALIDATION_PREFIX`
- `VALIDATION_SESSION_USERS_FILE`

If `VALIDATION_SESSION_USERS_FILE` is omitted, destructive commands fall back to `frontend/.validation/session-users.generated.json` when it exists. Read-only commands still fall back to `frontend/.env.local`. Write commands always refuse PROD, and TRAIN still requires explicit unlock.
