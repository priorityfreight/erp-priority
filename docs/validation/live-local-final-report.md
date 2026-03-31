# Live/Local Validation Final Report

Generated at: `2026-03-28T08:30:08.710Z`
Target kind: `train`
Target project ref: `chnxpajsawbfevuakhsm`
Protected target: `true`

## Scores

- Maturity: 81/100
- Stability: 80/100
- Performance: 76/100
- Scalability: 74/100

## Resolved Hardening Signals

- Audited live CRM, quotation, provider, and permission query modules currently avoid direct base-table writes.
- Audited live CRM and master-data query paths are operating in canonical-only mode without fallback markers.

## Top Critical Issues

- No critical or high issues were detected in this reporting cycle.

## Root Cause Analysis

## Quick Wins

- Re-run rollback, baseline, smoke, break scenarios, stress, cleanup, and clean-state on every hardening batch touching live workflows.

## Long-Term Improvements

- Keep moving screen-level orchestration into narrower workflow modules to reduce page state density.
- Introduce a fuller authenticated route/masking suite with named personas and expected denials.
- Keep TRAIN under repeated destructive validation until operations/accounting can be added without opening new critical findings.

## Recommended Next Step Before New Modules

- Continue the TRAIN hardening program and close critical/high findings before creating PROD or adding any new live module.

## Bulletproofing Checklist

- Rollback branch verified before every hardening pass.
- Row-count baseline captured before any write validation.
- Read-only smoke passes.
- Named-persona access matrix passes.
- Named-persona field-masking checks pass.
- Break-scenario suite passes.
- Clean-state scan reports zero prefixed rows.
- Lint and build pass.
- Large-route regressions reviewed in quotation detail, pricing quotations, client detail, and provider detail.
- Mixed write-path modules reviewed for RPC normalization.

## Prioritized Optimization Roadmap

1. Keep authenticated route and masking coverage in the unattended TRAIN gate with named personas and expected denials.
2. Keep repeating break scenarios and stress validation before opening PROD.

## Tests To Repeat After Every Major Change

- login and route access
- named-persona navigation visibility and expected route denials
- named-persona field masking for quotation economics and pricing costs
- clients list and client detail
- opportunity creation and opportunity -> quotation
- quotation detail cargo workflow
- pricing quotation purchase-option batch save
- customer document preview/PDF alignment
- pricing request preview/PDF alignment
- roles/permissions masking and navigation visibility
- exchange-rate reads and admin sync path
- UN/LOCODE lookup
- rollback, baseline, lint, build, read-only smoke, break scenarios, and clean-state validation

## Cleanup Validation Report

- Clean state: `true`
- Residue scan tables with prefixed rows: `0`
- Stress executed on TRAIN: `true`
- Stress session pool required counts: `{"sales":18,"pricing":7,"admin":5,"authenticated":5}`
- Stress session pool signed-in counts: `{"sales":18,"pricing":7,"admin":5}`
- Stress session pool cap: `30`
- Authenticated checks mode: `post-peak-pooled-subset`
- Authenticated checks executed: `3/3`

## Final Stability Statement

The current environment was left clean and stable. No prefixed validation residue was detected in the scanned live/local tables.
