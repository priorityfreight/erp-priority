# Live/Local Current State Audit

Generated at: `2026-03-27T08:32:46.404Z`
Target kind: `protected-linked-cloud`
Target project ref: `chnxpajsawbfevuakhsm`
Protected target: `true`

## Executed Checks

- `validation:rollback`: ok
- `validation:inventory`: ok
- `validation:baseline`: ok
- `lint`: ok
- `build`: ok

## Current State Summary

- Scope is limited to live/local frontend modules and their connected query modules.
- Static inventory and current-state docs were regenerated from the repo.
- `lint` and `build` are executed as release-readiness smoke checks.
- Row-count baseline is read-only and safe even against the protected linked backend.
- Stress and cleanup are implemented with hard guards and require a staging clone target.

## Known Static Risk Signals

- Very large live route files remain concentrated in quotation detail, pricing quotations, client detail, and provider detail.
- Several live query modules still mix canonical RPC writes with direct table mutations.
- Rollback-safety fallback branches remain present in live data-access paths.

## Next Safe Step

- Point `VALIDATION_SUPABASE_URL`, `VALIDATION_SUPABASE_SERVICE_ROLE_KEY`, and `VALIDATION_TARGET_KIND=staging-clone` to a disposable clone and then run `npm run validation:stress` followed by `npm run validation:cleanup` or destroy the clone.
