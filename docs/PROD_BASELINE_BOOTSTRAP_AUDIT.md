# PROD Baseline Bootstrap Audit

This document records the decision to bootstrap clean `PROD` environments from a canonical baseline instead of replaying the full historical migration chain.


## Why This Exists

The historical migration chain remains valuable as repository history and as the evolution path used by `DEV/TRAIN`, but it is no longer safe to treat that chain as the canonical bootstrap path for a clean production database.

During clean-`PROD` replay validation, the following issues were confirmed:

- some migrations assume intermediate table shapes that only existed in already-evolved environments
- some migrations contain backfills or operational cleanups that make sense on live `TRAIN` data but not on a blank database
- at least one migration is explicitly `TRAIN` cleanup only

Known examples:

- `20260322093000_canonical_backend_upgrade.sql` assumes a `providers.service_type` shape that does not exist in the original clean bootstrap order
- `20260323110000_realign_quotation_crm_pricing_flow.sql` touches `quotation_cargo_lines` before that table exists in a clean replay path
- `20260327190000_train_cleanup_purge_ephemeral_clients.sql` is operational cleanup for `TRAIN`, not part of a clean `PROD` bootstrap


## Canonical Bootstrap Decision

Clean `PROD` environments must now use:

1. [`supabase/baselines/20260408120000_prod_bootstrap_baseline.sql`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/supabase/baselines/20260408120000_prod_bootstrap_baseline.sql)
2. [`supabase/seeds/prod_seed.sql`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/supabase/seeds/prod_seed.sql)
3. [`scripts/build-prod-operational-master-data-seed.mjs`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/scripts/build-prod-operational-master-data-seed.mjs) + the generated operational snapshot for approved live catalogs
4. repair of legacy migration history up to `20260407113000`
5. any future delta migrations created after the baseline

Legacy cutoff:

- every migration from `20260307000432` through `20260407113000` is treated as legacy bootstrap history for clean-environment purposes
- future migrations created after the baseline are the only deltas that should be pushed on top of a newly bootstrapped `PROD`

The historical migrations under `supabase/migrations/` remain:

- repository history
- upgrade history for `DEV/TRAIN`
- reference material for evolution analysis

They do **not** remain the canonical bootstrap path for a new clean `PROD`.


## Seed Audit Result

The current [`supabase/seed.sql`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/supabase/seed.sql) was audited and found to be controlled enough for `PROD` bootstrap.

It currently contains only approved baseline data such as:

- roles
- permission registry and defaults
- external data source metadata
- service transport types
- quotation reference counters
- quotation rejection reasons
- incoterms

It does **not** contain:

- clients
- contacts
- opportunities
- quotations
- providers
- mailbox instances
- QA users
- saved workspace views
- the live `UN/LOCODE` snapshot
- the live `exchange_rates` snapshot

For clarity, the controlled production seed is now duplicated at:

- [`supabase/seeds/prod_seed.sql`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/supabase/seeds/prod_seed.sql)

And the reserved non-production fixture file is:

- [`supabase/seeds/train_seed.sql`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/supabase/seeds/train_seed.sql)


## Operational Master Data Snapshot

The production bootstrap now uses a second controlled layer for approved operational catalogs that are large or expected to evolve:

- `unlocodes`
- `exchange_rates`

That snapshot is generated from the current approved `DEV/TRAIN` source of truth with:

- [`scripts/build-prod-operational-master-data-seed.mjs`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/scripts/build-prod-operational-master-data-seed.mjs)

The generated file is:

- `supabase/seeds/generated/prod_operational_master_data.sql`

This generated file is intentionally not tracked in git. It is a controlled artifact built at cutover time from approved operational master data.

Additionally, `sales_accounting_concepts` has now been promoted to the canonical static seed because it is small, approved, and required for day-one operation.


## Operational Rule

Do not place the clean `PROD` bootstrap baseline under `supabase/migrations/`.

Reason:

- a new baseline file added to the normal migration chain would also try to run on already-bootstrapped environments and would create new drift or double-apply risk

Instead:

- keep the baseline under `supabase/baselines/`
- keep legacy migrations under `supabase/migrations/`
- after baseline application, mark legacy migration history as applied using [`scripts/repair-prod-baseline-history.sh`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/scripts/repair-prod-baseline-history.sh)


## Regeneration Rule

If canonical SQL changes before the final production cutover:

1. update canonical SQL sources
2. regenerate the baseline with [`scripts/build-prod-bootstrap-baseline.sh`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/scripts/build-prod-bootstrap-baseline.sh)
3. review the diff
4. keep `prod_seed.sql` aligned with the approved controlled seed
5. update AI and operational docs in the same change


## Validation Result On Real PROD

This strategy was validated against the new production-target Supabase project:

- `priority-erp-prod`
- ref `ppvmauboserovrdqniqu`

The successful sequence was:

1. clean the partially contaminated `public` schema in the fresh `PROD` project
2. apply [`supabase/baselines/20260408120000_prod_bootstrap_baseline.sql`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/supabase/baselines/20260408120000_prod_bootstrap_baseline.sql)
3. apply [`supabase/seeds/prod_seed.sql`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/supabase/seeds/prod_seed.sql)
4. repair legacy migration history through `20260407113000`
5. apply the post-baseline sync migration [`20260408133000_canonical_workspace_saved_views_and_mailbox_signature_sync.sql`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/supabase/migrations/20260408133000_canonical_workspace_saved_views_and_mailbox_signature_sync.sql)

The extra sync migration was required because the first generated baseline revealed that the canonical SQL sources were still missing:

- `public.workspace_saved_views`
- `public.mailboxes.signature_image_url`

Those gaps were then fixed in:

- [`ERP_schema.sql`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/supabase/ERP_schema.sql)
- [`ERP_functions.sql`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/supabase/ERP_functions.sql)
- [`ERP_triggers.sql`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/supabase/ERP_triggers.sql)
- [`ERP_policies.sql`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/supabase/ERP_policies.sql)

Then the baseline was regenerated so future clean `PROD` bootstraps include those objects from the start.
