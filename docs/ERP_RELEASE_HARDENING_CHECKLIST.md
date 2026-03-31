# ERP Release Hardening Checklist

This checklist is the minimum release gate before pushing a major ERP version to production-facing environments.

For the clean production backend bootstrap, also follow:

- [`PROD_BOOTSTRAP_CHECKLIST.md`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/docs/PROD_BOOTSTRAP_CHECKLIST.md)


--------------------------------------------------
SCOPE
--------------------------------------------------

Use this checklist when:

- quotation workflow changes
- pricing workflow changes
- permission or RLS changes
- exchange-rate logic changes
- branding or document assets change
- a major UI shell change lands


--------------------------------------------------
PRE-RELEASE CLEANUP
--------------------------------------------------

1. Sync brand assets

Run:

```bash
cd frontend
npm run sync:assets
```

2. Confirm no temporary test data should remain live

- temporary users
- temporary clients
- temporary opportunities
- temporary quotations
- temporary branches

3. Confirm AI governance files were updated when the workflow changed

- AI_CONTEXT.md
- AI_CURRENT_PROJECT_MAP.md
- AI_QUERY_GUIDE.md
- AI_UI_BUILDER.md
- AI_SYSTEM_AUDIT.md


--------------------------------------------------
BACKEND RELEASE GATE
--------------------------------------------------

1. Verify rollback snapshot exists for the change set.

2. Run database safety checks:

```bash
supabase db push --dry-run
supabase db push
```

3. Confirm no legacy RPC overloads remain active for changed actions.

Highest-risk areas:

- create_quotation_from_opportunity
- save_quotation_purchase_option
- create_quotation_cost_line
- update_quotation_cost_line

4. If backend contracts changed:

```bash
cd frontend
npm run types
```


--------------------------------------------------
FRONTEND RELEASE GATE
--------------------------------------------------

Run:

```bash
cd frontend
npm run lint
npm run build
npm run build-storybook
npm run validation:repo-gate
```

Preferred one-command option when browser automation is needed locally:

```bash
cd frontend
npm run validation:repo-gate:auto:headed
```

Also run:

```bash
git diff --check
```


--------------------------------------------------
SMOKE TEST SUITE
--------------------------------------------------

Auth

- valid login works
- inactive user is blocked
- route visibility matches role
- named-persona access matrix passes
- named-persona field masking passes
- Playwright critical workspace suite passes locally
- if direct browser launch is blocked on macOS, use the approved external browser-server fallback before re-running the Playwright critical suite
- Storybook workbench builds and the Priority stories render correctly
- final local repo gate returns `READY_FOR_REPO`

Users / Permissions

- admin can edit user
- admin can activate/inactivate user
- admin can delete a user without protected history
- non-admin cannot access users / roles admin surfaces

CRM

- create client
- create contact
- create opportunity
- edit client/contact/opportunity

Quotations

- opportunity -> quotation
- quotation request to pricing
- pricing take
- add multi-row cargo detail
- add multi-concept purchase option
- send proposal from pricing
- CRM selects customer-visible options
- CRM sends customer quotation
- customer PDF downloads correctly
- customer PDF hides provider and purchase data
- accepted quotation locks FX
- accepted quotation -> booking

Exchange rates

- exchange-rate catalog loads
- manual admin sync works
- latest available rate refreshes open quotation MXN totals


--------------------------------------------------
CLEANUP BACKLOG STILL OPEN
--------------------------------------------------

These items are still recommended before the next major module:

1. Upgrade the provider-facing pricing request to a real PDF flow instead of browser print.
2. Decide whether `/` or `/dashboard` is the canonical post-login landing route.
3. Remove `backendMode.ts` fallback branches once one more stabilization cycle passes.
4. Keep customer preview and customer PDF layouts synchronized whenever branding or commercial layout changes.


--------------------------------------------------
RECOMMENDED RELEASE ORDER
--------------------------------------------------

1. sync assets
2. confirm rollback snapshot
3. apply backend migration checks
4. regenerate types if needed
5. lint + build
6. smoke test key flows
7. commit
8. push
