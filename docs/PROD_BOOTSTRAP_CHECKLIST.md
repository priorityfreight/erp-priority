# PROD Bootstrap Checklist

This checklist defines the controlled bootstrap path for the clean `PROD` backend and the `LIVE` deployment.

Use it only after `TRAIN` passes the current hardening gate.

The canonical branch and environment mapping now is:

- `main` -> Vercel `Production` -> `PROD`
- `dev` -> stable Vercel `Preview` -> `DEV/TRAIN`

The canonical clean bootstrap sources now are:

- [`supabase/baselines/20260408120000_prod_bootstrap_baseline.sql`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/supabase/baselines/20260408120000_prod_bootstrap_baseline.sql)
- [`supabase/seeds/prod_seed.sql`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/supabase/seeds/prod_seed.sql)
- [`scripts/repair-prod-baseline-history.sh`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/scripts/repair-prod-baseline-history.sh)
- [`PROD_BASELINE_BOOTSTRAP_AUDIT.md`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/docs/PROD_BASELINE_BOOTSTRAP_AUDIT.md)


--------------------------------------------------
PRINCIPLES
--------------------------------------------------

- `PROD` starts clean.
- Promote structure from `TRAIN`, never incidental working data.
- Only controlled seeds and approved configuration may enter `PROD`.
- `LIVE` must point only to `PROD`.
- No validation prefixes or temporary users may exist in `PROD`.


--------------------------------------------------
ENTRY GATE
--------------------------------------------------

Before creating `PROD`, confirm all of the following:

- latest [`live-local-final-report.md`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/docs/validation/live-local-final-report.md) has no `critical` or `high` findings
- latest [`live-local-stress-sequence.md`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/docs/validation/live-local-stress-sequence.md) completed end to end
- latest [`live-local-clean-state.md`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/docs/validation/live-local-clean-state.md) reports `0` residue
- branding assets are synchronized and approved
- access matrix passes
- field-masking gate passes
- rollback branch/reference is recorded for the exact release SHA


--------------------------------------------------
SUPABASE PROD CREATION
--------------------------------------------------

1. Create a new Supabase project for `PROD`

- do not clone `TRAIN` data
- record the new project ref
- record region, plan tier, and owner

2. Configure secrets and environment inventory

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_OAUTH_REDIRECT_URI`
- `MAIL_ENCRYPTION_KEY`
- `NEXT_PUBLIC_APP_URL`
- cron secrets if used
- admin API secrets if used

3. Capture clean bootstrap evidence

- empty-table baseline
- project ref
- creation timestamp
- responsible release SHA


--------------------------------------------------
SCHEMA PROMOTION
--------------------------------------------------

1. Link the repo temporarily to the clean `PROD` project

```bash
supabase link --project-ref <prod-ref> --password '<prod-db-password>'
```

2. Apply the canonical baseline to the clean `PROD` database

```bash
psql "$PROD_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/baselines/20260408120000_prod_bootstrap_baseline.sql
```

3. Apply the controlled `PROD` seed

```bash
psql "$PROD_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seeds/prod_seed.sql
```

4. Generate and apply the approved operational master-data snapshot

Generate from the approved `DEV/TRAIN` source of truth:

```bash
node scripts/build-prod-operational-master-data-seed.mjs
```

Apply to `PROD`:

```bash
psql "$PROD_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seeds/generated/prod_operational_master_data.sql
```

This snapshot currently promotes:

- `unlocodes`
- `exchange_rates`

5. Mark legacy migrations as already represented by the baseline

```bash
./scripts/repair-prod-baseline-history.sh <prod-ref>
```

6. Apply any future migrations created after the baseline

```bash
supabase db push
```

7. Verify structure was promoted

- tables
- views
- functions
- triggers
- RLS policies
- grants

8. If backend contracts changed before release:

```bash
cd frontend
npm run types
```


--------------------------------------------------
CONTROLLED SEEDS ONLY
--------------------------------------------------

Allowed in `PROD`:

- roles
- permission actions
- permission conditions
- permission resources
- permission fields
- service transport types if managed canonically
- accounting concepts if managed canonically
- quotation rejection reasons if managed canonically
- required branch bootstrap records only if the business needs them to operate day one
- approved production seed data from `supabase/seeds/prod_seed.sql`
- approved operational master-data snapshot from `supabase/seeds/generated/prod_operational_master_data.sql`

Not allowed from `TRAIN`:

- clients
- contacts
- opportunities
- quotations
- providers created during hardening
- validation users
- exchange-rate test rows
- any `TEST_`, `LOADTEST_`, `QA_`, `STRESS_` data
- any optional fixtures from `supabase/seeds/train_seed.sql`


--------------------------------------------------
INITIAL ACCESS BOOTSTRAP
--------------------------------------------------

1. Create the first real Auth admin user in Supabase Auth
2. Create or activate the matching `public.users` record
3. Assign the correct admin role
4. Confirm login works in `LIVE`
5. Confirm inactive-user blocking still works


--------------------------------------------------
LIVE DEPLOYMENT CONFIGURATION
--------------------------------------------------

Before pointing `LIVE` to `PROD`, verify in Vercel:

- production env vars point to the new `PROD` project
- preview/dev env vars do not point to `PROD`
- no `TRAIN` write credentials are present in production
- PDF/document routes use the same approved branding assets
- Gmail OAuth redirect points to the production domain
- `NEXT_PUBLIC_APP_URL` matches the public production domain
- `Master Data > Mail` signature previews resolve through `/api/mail/signature-image`
- `main` is the only branch allowed to drive Vercel `Production`
- `dev` is the stable shared preview branch and continues to point to `DEV/TRAIN`


--------------------------------------------------
POST-BOOTSTRAP VALIDATION ON PROD
--------------------------------------------------

Run the safe subset first:

```bash
cd frontend
npm run lint
npm run build
npm run validation:smoke
```

Then run manual smoke against `PROD`:

- login with the initial admin
- dashboard load
- master data shell load
- users/roles workspace load
- access matrix sanity check by role
- field-masking sanity check by role
- customer document preview/PDF branding check
- pricing request preview/PDF branding check
- `Master Data > Mail` load, save, and Gmail reconnect check
- mailbox signature preview check
- shared inbox load at `/mail`
- outbound/reply smoke from one connected mailbox

Do not run destructive stress or ephemeral validation writes on `PROD`.

If a newly created `PROD` project already saw failed historical replay attempts, treat it as contaminated and recreate or reset it before applying the baseline.


--------------------------------------------------
CUTOVER RULE
--------------------------------------------------

`LIVE` may point to `PROD` only when:

- schema promotion is complete
- controlled seeds are complete
- first admin bootstrap is complete
- read-only and manual smoke pass
- branding is approved
- no open blocker remains in the release gate


--------------------------------------------------
FINAL SIGN-OFF RECORD
--------------------------------------------------

Record all of the following in the release note:

- release SHA
- `TRAIN` validation report timestamp
- `PROD` project ref
- migration batch applied
- seeds applied
- first admin bootstrap completed
- `LIVE` env vars switched
- smoke completed
- approval owner
