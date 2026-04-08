# Branching and Environment Strategy

This document defines the canonical GitHub, Vercel, and Supabase strategy for Priority Logistics ERP.

Use it as the operating rule for all work after the initial browse + mailing baseline closeout.


## Canonical Branch Model

The repository uses two long-lived branches:

- `main`
- `dev`

Meaning:

- `main` = production-ready code only
- `dev` = stable development integration branch

Do not introduce a parallel `master` branch.
The repository already uses `main` as the production branch and it should remain the single production target.


## Branch Responsibilities

### `main`

- deploys to Vercel `Production`
- points only to the clean `PROD` database environment
- accepts changes only through reviewed pull requests
- should remain release-ready as much as possible

### `dev`

- deploys to a stable Vercel `Preview` environment
- points to the current `DEV/TRAIN` database environment
- is the integration branch for active feature work
- may contain changes that are validated but not yet promoted to production

### feature branches

- branch from `dev`
- merge back into `dev` first
- promote from `dev` into `main` only after validation and release review

Recommended naming:

- `codex/<topic>`
- `feature/<topic>`
- `fix/<topic>`


## GitHub Protection Rules

Apply branch protection to both long-lived branches.

### `main`

- no direct pushes
- pull request required
- squash merge preferred
- required review from at least one approver
- required checks:
  - `npm run validation:release`
  - `npm run lint`
  - `npm run build`
  - `npm run build-storybook`
  - headed smoke or the approved CI equivalent for workspaces and kanban

### `dev`

- no direct pushes for routine team work
- pull request required
- at least one review recommended
- required checks:
  - `npm run lint`
  - `npm run build`
  - any module-specific smoke required by the current lot


## Vercel Strategy

The Vercel mapping is:

- `main` -> `Production`
- `dev` -> stable `Preview`

Operational rule:

- production domains must point to the deployment created from `main`
- the stable preview used by the team should be the latest deployment from `dev`
- feature branches may generate extra previews, but those are temporary and must not be treated as the canonical shared dev environment

Recommended domain pattern:

- production canonical domain -> final business domain when approved
- stable development URL -> latest `dev` preview deployment URL in Vercel


## Database Strategy

Yes: the correct architecture now is to use two remote databases.

### Current database

Treat the currently linked Supabase backend as:

- `DEV/TRAIN`

Meaning:

- active development
- validation
- QA-style smoke
- mailbox/OAuth iteration
- destructive or prefixed validation only here

### New database

Create a separate clean Supabase project for:

- `PROD`

Meaning:

- production-only backend
- no inherited QA or incidental operational data from `DEV/TRAIN`
- schema promoted from migrations only
- controlled seeds only
- production Vercel env vars point only here


## Promotion Rule

Promote structure, never incidental working data.

Allowed to move from `DEV/TRAIN` to `PROD`:

- migrations
- canonical SQL
- functions
- views
- triggers
- RLS policies
- regenerated types
- approved controlled seeds
- approved mailbox and role configuration only when intentionally bootstrapped

Not allowed to move automatically:

- clients
- contacts
- opportunities
- quotations
- provider working data
- QA data
- temporary validation users
- ephemeral saved views


## Environment Variable Split

### Vercel `Production` (`main`)

Must point only to `PROD`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `GMAIL_OAUTH_REDIRECT_URI`
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `MAIL_ENCRYPTION_KEY`
- `CRON_SECRET`

### Vercel stable `Preview` (`dev`)

Must point only to `DEV/TRAIN`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `GMAIL_OAUTH_REDIRECT_URI`
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `MAIL_ENCRYPTION_KEY`
- `CRON_SECRET`

Rule:

- production secrets and dev/train secrets must not silently drift or be mixed
- once `PROD` exists, `main` must not point back to `DEV/TRAIN`


## Working Flow

1. create a feature branch from `dev`
2. build and validate on the feature branch
3. merge into `dev`
4. validate the integrated result on the stable `dev` preview
5. open a promotion PR from `dev` to `main`
6. run final release gate
7. squash merge into `main`
8. verify production deploy on Vercel


## Immediate Next Actions

1. create and push the `dev` branch from current `main`
2. protect `main`
3. protect `dev`
4. create the new clean Supabase `PROD` project
5. keep the current linked backend as `DEV/TRAIN`
6. map Vercel `Production` env vars to `PROD`
7. map Vercel stable `Preview` env vars to `DEV/TRAIN`
8. run the controlled `PROD` bootstrap checklist before production cutover
9. bootstrap clean `PROD` from the canonical baseline under `supabase/baselines/`, not by replaying the full historical migration chain


## Decision Summary

The approved strategy is:

- one repo
- `main` for production
- `dev` for stable development preview
- current Supabase backend stays as `DEV/TRAIN`
- a new clean Supabase project becomes `PROD`

This is the lowest-risk path that keeps development fast without mixing validation data into production.
