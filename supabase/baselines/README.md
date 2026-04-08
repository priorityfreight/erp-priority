# Supabase Baselines

Files in this directory are clean-environment bootstrap artifacts.

They are not normal delta migrations.

Current canonical baseline:

- `20260408120000_prod_bootstrap_baseline.sql`

Rules:

- use this baseline only for clean environments such as `PROD`
- do not move this file into `supabase/migrations/`
- after applying the baseline, repair legacy migration history and then apply only newer delta migrations
- regenerate the baseline with `scripts/build-prod-bootstrap-baseline.sh` whenever canonical SQL changes before the production cutover
