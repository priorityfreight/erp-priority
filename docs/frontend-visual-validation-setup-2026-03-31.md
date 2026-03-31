# Frontend Visual Validation Setup

## Decision

The project now uses:

- `Playwright` as the primary browser-level frontend validation tool
- `Storybook` as the secondary visual workbench for isolated review of `Priority UI`

This stack was chosen because:

- the stack is already `Next.js + React + npm`, so Playwright integrates cleanly
- current validation scripts are strong on backend/data health but do not validate the rendered frontend visually
- Playwright runs against the real app, not a separate component sandbox
- it supports screenshots, traces, video, and reproducible navigation with low friction
- it fits well with Codex workflows because artifacts are generated locally and can be inspected after each run
- Storybook gives a controlled environment to inspect typography, tables, empty states, forms, actions, and component density without depending on seeded ERP data
- together they cover both:
  - real user flow validation
  - point-by-point visual inspection of the design system

## Scope

This setup is intentionally minimal but useful:

- one Playwright config
- screenshots and traces enabled
- unauthenticated visual/functional checks
- optional authenticated smoke when env credentials are provided
- authenticated critical workspace coverage for:
  - roles and permissions
  - clients detail
  - providers detail
  - quotations detail
- one Storybook workbench focused on `Priority UI`
- curated stories for:
  - foundations
  - data entry
  - tables and empty states

## New scripts

- `npm run test:e2e`
- `npm run test:e2e:critical`
- `npm run test:e2e:headed`
- `npm run test:e2e:ui`
- `npm run test:e2e:report`
- `npm run test:e2e:install`
- `npm run test:e2e:server`
- `npm run test:e2e:server:headless`
- `npm run storybook`
- `npm run build-storybook`
- `npm run storybook:test`
- `npm run validation:repo-gate`
- `npm run validation:repo-gate:headed`
- `npm run validation:repo-gate:auto`
- `npm run validation:repo-gate:auto:headed`

## Authenticated test env

Optional env vars for authenticated smoke:

- `UI_TEST_LOGIN`
- `UI_TEST_PASSWORD`

If they are not present, authenticated smoke tests are skipped automatically.

## Artifacts

Generated locally:

- `playwright-report/`
- `.playwright/test-results/`

Artifacts include:

- screenshots
- trace files
- retained videos on failures

## Recommended usage

1. Run `npm run test:e2e` for baseline browser validation.
2. Run `npm run test:e2e:headed` when you want to watch the browser.
3. Run `npm run test:e2e:ui` for the Playwright interactive runner.
4. Run `npm run storybook` when you want to inspect `Priority UI` without depending on live ERP data.
5. Review:
   - `Priority/Foundations`
   - `Priority/Data Entry`
   - `Priority/Tables And States`
6. Open `playwright-report` after a run when you need evidence or debugging context.

## Browser selection

The configuration now supports two browser execution modes:

1. direct launch
2. external Playwright browser server

Direct launch fallback order:

1. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` if explicitly provided
2. the Playwright-managed Chromium binary
3. `/Applications/Google Chrome.app/...` on macOS

This keeps the setup closer to what a real user sees and reduces friction when running locally outside Codex.

External browser server mode:

- start it in a normal local terminal with `npm run test:e2e:server`
- keep that process open
- the server writes `.playwright/browser-server.json`
- Playwright config and `validation:repo-gate` automatically connect through that websocket when the metadata file exists

This mode is now the recommended fallback when macOS/Codex prevents Playwright from launching Chrome or Chromium directly.

Automatic mode:

- `npm run validation:repo-gate:auto`
- `npm run validation:repo-gate:auto:headed`

These scripts:

1. start the Playwright browser server automatically if one is not already available
2. wait for `.playwright/browser-server.json`
3. run the repo gate
4. stop the temporary browser server and clean the metadata file

This is now the preferred operational path when the goal is simply to get a final reproducible frontend gate without manually juggling two terminals.

## Current limitation inside Codex

The Playwright setup is installed and configured, but direct browser launch can still be blocked in the Codex desktop runtime on macOS. Crash reports show Chrome/Chromium aborting during native application registration when launched as a child of the Codex runtime.

Because of that, the supported workaround is now:

1. start the external browser server from a normal local terminal
2. keep it open during validation
3. run `npm run validation:repo-gate` or `npm run validation:repo-gate:headed`

Or more simply:

1. run `npm run validation:repo-gate:auto:headed`

In a normal local terminal session, the same setup should use system Chrome and produce:

- screenshots
- trace files
- HTML report
- reproducible navigation flows
- Storybook component inspection and docs

## Next improvement

The next high-value step is to add richer authenticated assertions inside those workspaces:

- verify quotation tabs and commercial actions by role
- verify provider contacts and service offerings with seeded expectations
- verify client tabs and linked opportunities with stable personas
- verify masking and route denial cases for non-admin users
- add stories for:
  - `PriorityDialog`
  - `PriorityFormSection`
  - `PriorityDateField`
  - page-level compositions used in quotations and providers

That should be done using stable test personas dedicated to browser validation.
