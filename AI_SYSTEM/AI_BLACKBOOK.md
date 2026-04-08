# AI BLACKBOOK

This document is the operational memory of the project.

Its purpose is to capture:

- real failures already seen in this ERP
- the root causes behind those failures
- the solutions that worked
- the prevention rules that must guide future development

This is not a roadmap.
This is not aspirational guidance.

It is the repository’s technical black book:

- known failure patterns
- approved recovery patterns
- hardening rules learned through execution


--------------------------------------------------
WHEN TO READ THIS
--------------------------------------------------

Read this file:

- before starting structural work
- before adding a new live module
- before changing route orchestration
- before changing write paths
- before touching permissions or masking
- before changing shell branding or document branding
- before preparing a release candidate or PROD bootstrap


--------------------------------------------------
HOW TO USE THIS FILE
--------------------------------------------------

For each new change:

1. look for a similar prior failure pattern here
2. reuse the approved solution if it already exists
3. if the change introduces a new real failure mode, add it here after fixing it

Rule:

- do not treat this document as optional memory
- if a problem was already solved once, future development should not rediscover it from zero


--------------------------------------------------
CURRENT HARDENING LESSONS
--------------------------------------------------

These lessons were learned during the live/local stabilization pass completed in March 2026.

1. Environment separation must be explicit

Observed problem:

- the same linked backend risked being treated as both working environment and future production source

Root cause:

- environment roles were not formalized early enough

Approved solution:

- current linked Supabase backend is `TRAIN`
- future production must use a separate clean `PROD`
- `LIVE` must point only to `PROD`
- structure promotes from `TRAIN`; incidental data does not

Prevention rule:

- never blur `TRAIN` and `PROD`
- never run destructive validation against `PROD`


2. Destructive testing without cleanup discipline is unacceptable

Observed problem:

- realistic hardening required writes, but the dataset was protected

Root cause:

- validation needed stronger operational rules than ordinary dev testing

Approved solution:

- all destructive validation uses explicit prefixes: `TEST_`, `LOADTEST_`, `QA_`, `STRESS_`
- every destructive run writes a ledger
- cleanup is deterministic
- post-cleanup `clean-state` is mandatory

Prevention rule:

- if a test cannot guarantee cleanup, redesign the harness before running it


3. Large live routes become hidden risk multipliers

Observed problem:

- quotation detail, pricing quotations, client detail, provider detail, and roles/permissions accumulated dense orchestration

Root cause:

- route components carried too much fetch logic, mutation flow, status handling, and visual composition in one file

Approved solution:

- move orchestration into controllers/hooks
- move rendering into feature views
- keep route files thin

Prevention rule:

- new live route files should stay lightweight
- complex workflows belong in feature controllers and feature views, not in the route entry file


4. Mixed RPC paths and direct table writes create drift

Observed problem:

- live query modules mixed canonical RPC workflows with direct inserts, updates, deletes, or upserts

Root cause:

- business logic was not centralized strongly enough in backend contracts

Approved solution:

- move risk-bearing writes behind canonical RPCs
- allow direct writes only when they are trivial, atomic, safe, and explicitly intentional

Prevention rule:

- any write with workflow logic, state transition, cascade behavior, or concurrency risk must use a canonical backend function


5. Compatibility fallback branches silently prolong debt

Observed problem:

- fallback and legacy branches stayed in active data paths longer than necessary

Root cause:

- compatibility logic was allowed to coexist with canonical paths without a forced retirement rule

Approved solution:

- retire fallback branches from live query paths
- if a fallback must remain, restrict it to recovery-only use and document it

Prevention rule:

- fallback logic must never remain as a silent live-path alternative after stabilization


6. Auth sign-in rate limits distort load tests

Observed problem:

- heavier validation tiers initially failed from auth throttling, not from ERP logic

Root cause:

- destructive validation signed in too many users during peak execution

Approved solution:

- pre-bootstrap validation users
- reuse pooled authenticated sessions
- move a subset of authenticated checks outside the main concurrency peak

Prevention rule:

- load tests must measure ERP behavior, not repeated auth bursts


7. Route access must be validated by persona, not assumed

Observed problem:

- route and sidebar permissions could not be treated as correct just because the page loaded for admins

Root cause:

- access behavior was not enforced as a named-persona gate

Approved solution:

- add `access-matrix` validation using named personas
- verify both allowed routes and expected denials
- verify route presence in navigation as well as backend access result

Prevention rule:

- permission-sensitive work is incomplete unless named-persona access checks pass


8. Field-level masking must be validated separately from route access

Observed problem:

- route-level access does not prove that sensitive economic fields are masked correctly

Root cause:

- field permissions existed in backend but were not part of the release gate

Approved solution:

- add named-persona `field-masking` validation


9. Local browser audit on macOS must use inline env vars when passwords contain special characters

Observed problem:

- terminal sessions entered `dquote>` and Playwright started with incomplete credentials
- the browser opened but only the login user field was filled reliably

Root cause:

- shell parsing broke on `!` inside double quotes
- E2E helpers still referenced legacy login labels after the login screen copy changed

Approved solution:

- run headed local browser audits with inline env vars using single quotes:
  - `UI_TEST_LOGIN='adanrodriguez' UI_TEST_PASSWORD='Adan26!' npm run test:e2e:critical -- --headed`
  - `UI_TEST_LOGIN='adanrodriguez' UI_TEST_PASSWORD='Adan26!' npm run test:e2e -- --headed`
- keep Playwright login selectors compatible with both current and legacy labels:
  - `Usuario o correo|Usuario`
  - `Contraseña|Contrasena`

Prevention rule:

- when local browser audits use credentials containing `!`, prefer inline env vars with single quotes
- update E2E expectations whenever the shell or page copy is renamed, especially after localization changes
- validate quotation economics and pricing-cost visibility separately from route visibility

Prevention rule:

- whenever sensitive fields exist, field masking must be treated as its own gate


9. Shell branding assets can fail independently from document branding assets

Observed problem:

- shell and login branding repeatedly rendered broken images while document assets still worked

Root cause:

- runtime shell branding depended on asset-path/render behavior that proved fragile during local execution

Approved solution:

- centralize brand references in `frontend/src/lib/brand.ts`
- keep document/PDF branding separate from shell branding
- when runtime shell assets are unstable, fall back to a code-rendered shell lockup so the app remains functional

Prevention rule:

- shell branding must never block the ERP from being usable
- branding infrastructure should degrade gracefully


10. Report artifacts must describe the latest real run, not a stale prior run

Observed problem:

- some reports lagged behind the latest validation artifacts

Root cause:

- the reporting layer was not always reading the newest sequence/access artifacts

Approved solution:

- ensure reports read the latest sequence/access artifacts before final scoring
- regenerate the final report after the latest real validation pass whenever new artifacts are introduced

Prevention rule:

- do not treat a generated report as current unless it is tied to the newest validation artifacts


11. Leaving premium forms half-migrated creates visual drift and operator friction

Observed problem:

- several live forms mixed Priority sections with raw inputs, custom buttons, and ad hoc headings

Root cause:

- the first UI modernization wave improved workspaces and tables faster than the remaining modal and detail forms

Approved solution:

- standardize live forms on `PriorityFormHeader`, `PriorityFormSection`, `PriorityFormField`, `PriorityInfoField`, and `PrioritySubmitBar`
- standardize next-generation forms on `react-hook-form + zod + PriorityFormEngine`
- use `PriorityGrid` instead of ad hoc raw tables when the workflow is truly dense, editable, or matrix-like
- use `ToggleGroup` for short exclusive choice sets and `Switch` for real boolean states
- use `PrioritySectionAlert` for inline validation, sync, and guidance messages
- keep the default form density at two columns unless a third column has a strong workflow reason

Prevention rule:

- new forms must not reintroduce raw form markup when an approved Priority wrapper already exists
- if a form needs richer interaction, extend the wrapper layer instead of bypassing it locally
- when a workflow truly behaves like spreadsheet capture, keep the tabular interaction but standardize the surrounding shell with shared headers, alerts, summary cards, and submit bars

11. UI foundations drift when wrappers are not treated as contracts

Observed problem:

- the frontend started mixing raw primitives, custom markup, and one-off visual fixes across live modules

Root cause:

- reusable wrappers existed, but not every new surface treated them as the mandatory ERP-facing contract

Approved solution:

- keep `shadcn/ui` as the only primitive foundation
- keep `Priority UI` as the public contract for ERP surfaces
- when an official `shadcn` primitive or pattern is better than a custom wrapper internals, rebase the wrapper instead of exposing the primitive directly to pages

Prevention rule:

- do not let pages choose between raw primitives and branded wrappers arbitrarily
- migrate internals if needed, but keep the ERP contract stable


12. Typography becomes inconsistent if every page improvises scale and tracking

Observed problem:

- live pages accumulated many independent text sizes, uppercase treatments, and tracking values

Root cause:

- typography was described conceptually in the design system, but not enforced through shared implementation

Approved solution:

- introduce semantic typography wrappers and shared text roles
- move new and migrated surfaces to those roles first
- keep readability above decorative tracking or visual novelty

Prevention rule:

- new UI must not invent text hierarchy ad hoc when a semantic typography role exists

11. Destructive confirmation must be centralized, not embedded ad hoc

Observed problem:

- live pages and controllers accumulated `window.confirm` calls with inconsistent copy and browser-native UX

Root cause:

- destructive confirmation was treated as a quick local interaction instead of a system pattern

Approved solution:

- destructive actions now use the shared `usePriorityConfirm` hook backed by `AlertDialog`
- pages and controllers render the same destructive confirmation system
- confirmation copy is explicit about impact and uses the same visual grammar across CRM and pricing

Prevention rule:

- do not add new `window.confirm` calls in live frontend code
- destructive actions must use the shared confirmation hook or an approved wrapper around it


12. Core CRM lists must not stay on legacy table markup

Observed problem:

- clients, contacts, opportunities, and quotations kept bespoke filters, raw tables, and uneven empty/loading states long after the administrative pattern had matured

Root cause:

- the system had a professional workspace pattern in master data, but the core CRM list pages had not yet been brought onto the same foundation

Approved solution:

- migrate core list workspaces to `PriorityCollectionWorkspace`
- standardize toolbar search/filter controls with `PrioritySearchField`, `PriorityFilterPopover`, and `PrioritySavedViews`
- standardize lane-based state orientation with `PriorityStatusLanes`
- standardize visible first-column actions with `PriorityActionRail`
- standardize loading with `Skeleton`
- standardize empty states via the workspace layer
- move long forms like contacts and opportunities to `PriorityFormSection` and `PrioritySubmitBar`

Prevention rule:

- new browse/list workspaces should not introduce raw tables if `PriorityCollectionWorkspace` already fits the use case
- new live forms should not fall back to legacy raw inputs/buttons when the Priority form layer exists


13. Visual review is incomplete if it depends only on live routes or only on isolated components

Observed problem:

- route-level review caught workflow issues but made fine visual drift slow to inspect
- isolated component review did not exist, which made typography, contrast, spacing, and wrapper consistency harder to audit systematically

Root cause:

- the frontend had one validation layer for business and data correctness, but not a second controlled workbench for component-level visual review

Approved solution:

- keep `Playwright` as the real-app validation layer for auth, routes, screenshots, traces, and reproducible flows
- keep `Storybook` as the isolated visual workbench for `Priority UI`
- use Storybook to review wrappers and compositions before changing multiple live screens

Prevention rule:

- do not rely only on live pages for fine UI review
- do not rely only on isolated components for release confidence
- use both layers together when auditing the frontend

- regenerate the final report after the latest gates finish
- ensure sequence, access, masking, break, stress, cleanup, and clean-state artifacts are part of the same cycle

Prevention rule:

- do not trust a report unless it is tied to the latest artifact set


--------------------------------------------------
RECURRING FAILURE PATTERNS AND APPROVED RESPONSES
--------------------------------------------------

Pattern:
Oversized route file

Response:

- split orchestration from rendering
- create controller hook
- create feature view
- keep route file thin


Pattern:
Same workflow implemented by multiple write styles

Response:

- standardize on one canonical RPC
- update query layer to use it consistently
- remove or quarantine direct writes


Pattern:
Load test fails from auth burst, not ERP behavior

Response:

- bootstrap sessions first
- pool them
- cap pool size
- move non-core auth checks outside the main peak


Pattern:
Validation leaves residue

Response:

- stop the sequence
- run cleanup
- run clean-state
- if cleanup cannot guarantee zero residue, destroy the writable environment or redesign the harness


Pattern:
Permission checks pass for admin only

Response:

- add named personas
- verify expected allow and expected deny cases
- include navigation visibility, route access, and field masking


Pattern:
Branding asset renders broken in shell

Response:

- centralize brand references
- verify asset sync path
- keep a code-rendered fallback lockup available until runtime assets are stable


Pattern:
Priority wrapper diverges from the best available shadcn pattern

Response:

- keep the ERP-facing wrapper name stable
- rebase the wrapper internally onto the official `shadcn` primitive or pattern
- document the new canonical internal base in `AI_SYSTEM`
- do not expose raw primitives directly to pages just because the internals improved


Pattern:
Dense workspaces fall back to raw tables, raw date inputs, or scattered action buttons

Response:

- move tabular sections to `PriorityCollectionTable` or `PriorityCollectionWorkspace`, depending on whether the screen is embedded or full-workspace
- compose date selection through `PriorityDateField`
- group related secondary actions with `ButtonGroup`
- add `HoverCard`/`ResizablePanelGroup` only when they reduce navigation friction or scroll depth
- if still unstable, use a temporary code-rendered shell lockup
- keep document branding independent


Pattern:
Report says green but artifacts suggest drift

Response:

- trust raw artifacts first
- regenerate report from latest artifacts
- fix the reporting pipeline before treating the run as valid


--------------------------------------------------
NON-NEGOTIABLE RULES FOR FUTURE MODULES
--------------------------------------------------

When creating future modules:

1. start from canonical backend contracts, not ad hoc frontend writes
2. keep route files thin
3. separate rendering from orchestration
4. add persona-aware access expectations early
5. add field-masking expectations when economics, finance, or admin data appear
6. prefer deterministic logic over AI-generated ambiguity
7. update AI_SYSTEM in the same change set when structural rules change
8. do not let fallback logic become permanent
9. do not ship unresolved cleanup residue
10. do not open `PROD` until the hardening gate remains green


11. Component foundations must stay singular

Observed problem:

- the frontend needed a modern component system, but adding multiple foundations would have duplicated primitives, interaction models, and styling rules

Root cause:

- without a single approved foundation, every module could choose a different modal, table, combobox, or form pattern

Approved solution:

- `shadcn/ui` is the only approved primitive foundation
- primitives live in `frontend/src/components/ui/`
- branded ERP wrappers live in `frontend/src/components/priority/`
- new UI should prefer the Priority layer over ad hoc markup

Prevention rule:

- do not add a second UI foundation
- if a new pattern is needed, build it as a Priority wrapper or composition on top of the approved foundation


12. Blocking browser alerts damage ERP usability

Observed problem:

- validation and mutation failures were surfaced through `alert()` across multiple live modules

Root cause:

- feedback had not yet been centralized as a first-class UI concern

Approved solution:

- use toast-based feedback and structured form messaging
- centralize feedback helpers instead of relying on browser alerts

Prevention rule:

- ordinary validation, success, and mutation feedback must not use raw `alert()`
- destructive confirmations may stay on explicit confirm flows until they are migrated to approved dialogs


13. Administrative workspaces need a consistent operating shape

Observed problem:

- administrative modules were functionally correct but visually inconsistent, with ad hoc filters, handmade tables, raw confirm dialogs, and uneven form structure

Root cause:

- master data screens evolved independently before the Priority UI layer existed

Approved solution:

- use summary cards for top-line metrics
- use a toolbar built from `PriorityInput` and `PrioritySelectField`
- use `PriorityCollectionWorkspace` for full browse workspaces and `PriorityCollectionTable` for embedded/read-mostly list surfaces
- use `AlertDialog` for destructive confirmation
- use `PriorityFormSection` plus `PrioritySubmitBar` inside modal editing flows

Prevention rule:

- new master data modules should start from the approved administrative workspace pattern unless a workflow clearly requires a denser custom layout


14. Long forms must be sectioned, not stacked blindly

Observed problem:

- several forms worked, but they read like long stacks of inputs without enough hierarchy for fast ERP usage

Root cause:

- forms were built field-by-field before a shared section pattern existed

Approved solution:

- structure forms with `PriorityFormSection`, grouped fields, read-only info cards, and a consistent submit rail
- keep complex workflows readable by splitting data into meaningful sections rather than one continuous column of fields

Prevention rule:

- any new medium or long form should be sectioned by business meaning, not just by implementation convenience


15. Dense workspaces need internal tabs before they become scroll mazes

Observed problem:

- detail and configuration workspaces tended to grow as long vertical pages, forcing users to scroll through unrelated sections to reach the right context

Root cause:

- internal navigation inside the same record or workspace was not formalized early enough

Approved solution:

- keep global navigation topbar-first with `NavigationMenu` and `PriorityCommandBar`
- keep local backtracking inside `PriorityWorkspacePath`
- use internal tabs only inside dense single-record or single-workspace surfaces
- current approved tabbed workspaces are client detail, provider detail, quotation detail, and roles & permissions

Prevention rule:

- when a workspace contains multiple sibling sub-processes of the same record, evaluate tabs before adding more stacked sections


16. Workspace filters must operate on the backend dataset, not only the current page

Observed problem:

- quotation workspace filters, sort, and presets looked complete in UI, but initially only filtered the already loaded client page
- views such as "Ganadas ADAN" could silently omit records from other pages while counters and pagination still reflected the unfiltered dataset

Root cause:

- the workspace query contract was split between backend pagination and frontend-only filtering
- `search_quotations()` had not yet been extended to accept the full workspace state

Approved solution:

- move `query`, `lane/status`, `columnFilters`, `sort`, `page`, and `pageSize` into the backend query contract
- make `totalCount` and pagination respond to the filtered dataset returned by `search_quotations()`
- treat frontend filtering as a temporary fallback only, never the canonical path for operational workspaces

Prevention rule:

- a saved view or filter builder is not considered real until the dataset, counters, and pagination all come from the backend contract


17. Browse columns, filters, and sorting must come from one shared schema

Observed problem:

- quotation columns, filter options, chips, and sorting behavior drifted because parts of the workspace still used hard-coded lists by column name
- the filter modal could fall out of sync with the visible table and with saved views

Root cause:

- column labels, filter kinds, backend keys, and visible/default behavior were modeled in multiple places

Approved solution:

- define a single workspace column schema containing:
  - `id`
  - `label`
  - `visible by default`
  - `sortable`
  - `filterable`
  - `filterKind`
  - `filterOptions`
  - backend column key
- derive the filter builder, chips, sorting, and column modal from that one schema

Prevention rule:

- do not hard-code browse workspace behavior by column name in multiple places once a column schema exists


18. Column presets must persist in the same workspace system as saved views

Observed problem:

- workspace column layouts originally lived in isolated `localStorage` state, while saved views lived in the shared workspace persistence layer
- this created split behavior between search/filter presets and column presets

Root cause:

- column preference was treated as a UI-only concern instead of part of workspace state

Approved solution:

- persist column layouts through `workspace_saved_views`, using the same canonical persistence layer as search, lanes, filters, and sorting
- allow internal system rows when needed, but keep them hidden from normal saved-view lists

Prevention rule:

- user workspace state must not be split across unrelated persistence systems unless the split is explicitly intentional and documented


19. Workspace migration SQL must not reintroduce legacy RPC shapes

Observed problem:

- the workspace-saved-views migration attempted to recreate an older `search_quotations()` body that referenced removed quotation header columns such as `commodities`, `quantity`, `weight`, and `volume`
- `supabase db push` failed only when the migration actually hit the linked remote database

Root cause:

- a newer migration added workspace features, but it still embedded a stale version of the quotation RPC body
- the migration was not validated against the current canonical schema after quotation-header cleanup

Approved solution:

- update both workspace migrations so the RPC output shape stays compatible without depending on removed physical columns
- run `supabase db push --dry-run` before pushing live migrations
- treat migration SQL as versioned code that must stay aligned with current canonical schema, not as a historical dump

Prevention rule:

- any migration that recreates an RPC must be rechecked against the live canonical table shape before release or remote push


20. HTML5 drag-and-drop is too brittle for precision workspace ordering

Observed problem:

- the first implementation of workspace column ordering tended to drop items at the end of a list instead of at the user’s intended insertion point
- card-based layouts also made column ordering visually noisy and harder to control

Root cause:

- native drag-and-drop did not provide a stable insertion model for precise list ordering in this workspace
- the visual metaphor was too heavy for a utilitarian settings modal

Approved solution:

- move to list-based ordering with explicit insertion handling and clearer vertical structure
- adopt an open-source sortable stack such as `dnd-kit` for stable drag behavior
- keep explicit `subir/bajar` controls as a precision fallback when direct drag is inconvenient

Prevention rule:

- do not rely on raw HTML5 drag-and-drop for ERP ordering surfaces that require exact insertion behavior


21. Base select/popover primitives must be revalidated inside modal workspaces

Observed problem:

- workspace filter modals could open correctly while the actual select list for choosing a filter column appeared missing or collapsed

Root cause:

- the shared `Select` viewport sizing still respected trigger-height assumptions that failed inside larger modal compositions
- layering and viewport constraints were validated in ordinary forms but not in workspace overlays

Approved solution:

- fix the base `Select` viewport sizing and z-index behavior at the shared primitive level
- validate the primitive again inside the actual workspace modal where it will be used

Prevention rule:

- when a primitive is reused inside workspace modals, validate the primitive in that exact overlay context, not only in isolated form fields


22. Browser automation failures can come from the host environment, not the product

Observed problem:

- Playwright browser execution from the Codex-hosted macOS environment failed with Chromium launch errors such as `MachPortRendezvousServer ... Permission denied (1100)`
- list-based test discovery, lint, and build still passed, and the same suites could run from a normal local terminal

Root cause:

- browser launch restrictions in the host environment were independent from the frontend application health

Approved solution:

- treat build, lint, migrations, and Playwright test listing as reliable signals inside Codex
- treat full browser execution as an environment-sensitive step that may need to run from a normal local terminal or an approved external browser-server path
- never misclassify host browser-launch failures as app regressions without additional evidence

Prevention rule:

- separate product failures from host-browser failures during release validation, and document the difference explicitly in the final audit


23. Legacy wrappers should be reduced to compatibility facades once the new baseline is live

Observed problem:

- `PriorityDataTable` continued to appear as if it were the active standard long after `PriorityCollectionWorkspace` and `PriorityCollectionTable` had become the real browse/list baseline
- this created documentation drift and kept encouraging the wrong component choice

Root cause:

- the legacy wrapper remained fully functional and still looked like a first-class choice in exports, registry, and docs

Approved solution:

- introduce `PriorityCollectionTable` as the canonical non-workspace browse table
- keep `PriorityDataTable` only as a compatibility wrapper while older imports are retired
- update `AI_SYSTEM`, stories, registry, and migration docs in the same change set

Prevention rule:

- once a new UI baseline is live, old wrappers must be demoted explicitly in both code and governance docs, not just informally avoided


24. QA/example cleanup must be scripted, previewable, and backend-safe

Observed problem:

- UI and E2E flows created realistic QA artifacts in TRAIN, including `Cliente QA Proceso`, `Proveedor QA`, `@priority.test`, `example.com`, and `Vista QA`
- manual cleanup worked, but ad hoc one-off deletion is too easy to forget and too risky to repeat by hand
- client records could not be hard-deleted because backend policy correctly forced the safer `soft_delete_client()` path

Root cause:

- example data creation was easy and repeatable, but the project lacked one canonical reusable script for non-ledger QA/example cleanup outside the live-validation harness
- cleanup assumptions were split between manual DB operations and ledger-based validation cleanup

Approved solution:

- add a reusable script at `frontend/scripts/validation/cleanup-qa-example-data.mjs`
- support two modes:
  - preview: `cd frontend && npm run validation:cleanup:qa-preview`
  - apply: `cd frontend && npm run validation:cleanup:qa-apply`
- make the script delete dependent records first (`workspace_saved_views`, quotations, cargo/cost children, opportunities, provider artifacts)
- for clients, neutralize identifying fields and then call `soft_delete_client()` instead of hard delete
- emit JSON and Markdown cleanup summaries under `docs/validation/`

Prevention rule:

- do not manually purge QA/example UI data from ERP tables when the reusable cleanup script can target it safely
- any new QA/example naming pattern must be added to the cleanup script in the same change that introduces the pattern


25. Remote signature images must be treated as a rendering integration, not just a saved URL

Observed problem:

- mailbox signatures based on Google Drive links still rendered as broken images in the ERP and would remain fragile in outbound mail

Root cause:

- a shared Drive URL is not enough by itself
- Drive may require URL normalization and can still block direct browser embedding through cross-origin resource rules

Approved solution:

- persist the mailbox signature as a normalized public URL
- render remote signatures through the ERP-owned proxy route `/api/mail/signature-image` when the upstream host is hotlink-sensitive
- require `NEXT_PUBLIC_APP_URL` in production so outbound emails can resolve the proxied signature from the public ERP domain

Prevention rule:

- do not treat "store image URL" as a complete signature feature if the chosen host does not guarantee stable direct embedding from the ERP domain


26. Email tabs linked by quotation reference still need participant-context filtering

Observed problem:

- quotation email views in sales showed provider-sourcing emails just because the subject contained the quotation reference

Root cause:

- automatic mail linking by exact quotation reference is useful, but it is not sufficient to decide whether a thread belongs in the sales or pricing context

Approved solution:

- keep subject-reference linking as the indexing/linking strategy
- additionally filter quotation email views by participant context:
  - sales sees customer-facing threads
  - pricing/provider workflows see provider-facing threads

Prevention rule:

- any embedded ERP mail view must combine entity linking with operational participant rules before it is treated as the final user-facing thread set


--------------------------------------------------
31. CLEAN PROD MUST NOT REPLAY THE FULL MIGRATION HISTORY
--------------------------------------------------

Problem:

- the historical migration chain evolved on top of a live `TRAIN` backend and was not consistently written to replay from a completely blank database
- when a clean `PROD` project was created and the full chain was replayed, migrations failed because some files assumed intermediate table shapes or object existence from earlier live states

Examples observed:

- `20260322093000_canonical_backend_upgrade.sql` assumed `providers.service_type` existed in a way that was not true for the original clean order
- `20260323110000_realign_quotation_crm_pricing_flow.sql` touched `quotation_cargo_lines` before that table existed in the clean replay path
- `20260327190000_train_cleanup_purge_ephemeral_clients.sql` is operational cleanup for `TRAIN`, not clean bootstrap logic

Approved solution:

- treat the historical migration chain as legacy evolution history for `DEV/TRAIN`
- generate a canonical clean bootstrap baseline from the current SQL sources
- keep that baseline outside `supabase/migrations/`
- repair legacy migration history as applied after the baseline is loaded into a clean `PROD`
- keep controlled production seed data separate from any future `TRAIN` fixtures

Prevention rule:

- do not assume a long-lived migration chain is automatically safe for clean-environment bootstrap
- before any real production cutover, validate replay against a blank backend
- once a clean baseline exists, do not append it to the normal delta migration chain


--------------------------------------------------
32. A BASELINE IS ONLY AS GOOD AS THE CANONICAL SQL THAT FEEDS IT
--------------------------------------------------

Problem:

- the first clean `PROD` baseline was generated from the canonical SQL files and loaded successfully, but post-bootstrap verification showed that two recent production features were still missing:
  - `public.workspace_saved_views`
  - `public.mailboxes.signature_image_url`

Root cause:

- the latest product changes existed as delta migrations and working code, but the canonical SQL sources had not been updated to include them

Approved solution:

- treat the canonical SQL files as first-class architecture, not as stale references
- when a feature becomes part of the production baseline, update:
  - schema
  - functions
  - triggers
  - policies
- regenerate the clean `PROD` baseline immediately after that update
- add an idempotent sync migration if any live environment is already missing the newly canonicalized objects

Prevention rule:

- never assume that "migration exists" means "canonical SQL is current"
- every production bootstrap change must be validated in both directions:
  - clean baseline generation
  - live env delta synchronization


--------------------------------------------------
MINIMUM RELEASE MEMORY
--------------------------------------------------

Before any serious release or PROD bootstrap, remember:

- clean-state matters as much as stress success
- permission gating matters as much as CRUD success
- field masking matters as much as route visibility
- canonical RPC usage matters as much as passing UI smoke
- shell branding must be functional, but must never be allowed to destabilize the ERP


--------------------------------------------------
UPDATE RULE
--------------------------------------------------

Update this file whenever:

- a new real failure mode is discovered
- a new stabilization pattern is proven
- a recurring anti-pattern is formally banned
- release/hardening discipline changes in a meaningful way

If the system learns, this file should learn too.
