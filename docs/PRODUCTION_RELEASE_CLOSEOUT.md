# Production Release Closeout

This document is the single operational checklist for promoting the current ERP baseline to production.

Use it after the release branch has already been merged into `main` and the remaining work is operational:

- confirm cloud/database alignment
- confirm Vercel configuration
- confirm workspace UX smoke
- confirm mailing and mailbox signatures
- record final sign-off


## Release Scope

This release baseline includes:

- browse/list workspaces on `PriorityCollectionWorkspace`
- embedded browse/list tables on `PriorityCollectionTable`
- dense editing on `PriorityGrid`
- board/pipeline surfaces on `PriorityKanbanBoard`
- workspace persistence through `workspace_saved_views`
- Gmail-based shared inbox and mailbox administration
- mailbox signatures through `mailboxes.signature_image_url`
- remote signature rendering through `/api/mail/signature-image`


## Canonical Production Contracts

Before sign-off, confirm these are true in code and in the live environment:

- `PriorityDataTable` is not used as the active browse standard
- `search_quotations()` respects query, lane/status, filters, sort, page, and page size
- `workspace_saved_views` stores search, tabs/lanes, filters, sorting, and visible columns
- sales quotation email tabs show customer-facing threads only
- pricing/provider email flows show provider-facing threads only
- mailbox signatures resolve through the ERP domain, not only the original remote host


## Required Vercel Environment Variables

Set these in the Vercel project that points to `frontend/`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_OAUTH_REDIRECT_URI`
- `MAIL_ENCRYPTION_KEY`
- `CRON_SECRET`
- `NEXT_PUBLIC_APP_URL`

Rules:

- `SUPABASE_SERVICE_ROLE_KEY` must remain server-only
- `NEXT_PUBLIC_APP_URL` must match the public production domain exactly
- `GMAIL_OAUTH_REDIRECT_URI` must point to the production callback route


## Local Vercel Linking Rule

The `.vercel/` directory is local-only and must remain untracked.

If a teammate needs to validate production settings locally:

1. run `vercel link`
2. choose the correct account/team
3. link the project that deploys from `frontend/`
4. confirm Root Directory is `frontend`

Do not commit `.vercel/`.


## Database Alignment Gate

Before production smoke:

1. run `supabase migration list`
2. confirm local and remote are aligned through the latest release migration
3. confirm the remote project includes:
   - `workspace_saved_views`
   - the extended `search_quotations` contract
   - `mailboxes.signature_image_url`

If backend contracts changed since the last type generation:

```bash
cd frontend
npm run types
```


## Technical Gate

Run this before final production sign-off:

```bash
cd frontend
npm run validation:release
npm run lint
npm run build
npm run build-storybook
UI_TEST_LOGIN='...' UI_TEST_PASSWORD='...' npm run test:e2e:workspaces -- --headed
UI_TEST_LOGIN='...' UI_TEST_PASSWORD='...' npm run test:e2e:kanban -- --headed
```

Expected outcome:

- release-readiness gate passes with `0 failures`
- lint clean
- build clean
- Storybook build succeeds
- workspace suite passes
- kanban suite passes


## Workspace Smoke Checklist

Validate the following live surfaces:

- `/quotations`
- `/pricing/quotations`
- `/clients`
- `/opportunities`
- `/pricing/providers`
- `/contacts`

For each workspace, confirm:

- tabs/lanes are visible and coherent
- filters open and show the workspace column list
- saved views persist search, filters, sort, and visible columns
- visible vs available columns work
- column order can be changed and saved
- sorting works
- status color remains legible
- pagination matches the filtered dataset
- primary row/workspace CTAs are visible
- empty states are clean and intentional


## Mailing Smoke Checklist

Validate these surfaces:

- `/master-data/mail`
- `/mail`
- quotation detail `Email` tab
- any pricing/provider email flow that should stay provider-facing

Confirm:

- mailbox list loads
- mailbox create/edit works
- Gmail OAuth connect/reconnect works
- sync mode persists
- signature preview renders
- a mailbox with signature sends outbound mail with signature attached
- reply on an existing thread also includes the configured signature
- sales quotation email tabs do not show provider-only threads
- pricing/provider flows do not show customer-only threads


## Signature-Specific Smoke

For any mailbox using a remote image signature:

1. save the signature URL in `Master Data > Mail`
2. confirm preview renders in the ERP
3. send a real outbound test email
4. open the email outside the ERP
5. confirm the image resolves from the public ERP domain

If the signature preview works in-app but fails in the external recipient:

- verify `NEXT_PUBLIC_APP_URL`
- verify the production domain is reachable publicly
- verify the source URL is still accessible to the ERP proxy


## Vercel Post-Deploy Smoke

After the production deploy finishes:

1. open the public domain
2. confirm login redirect and authentication flow
3. confirm `/mail` loads
4. confirm `Master Data > Mail` loads
5. confirm a mailbox signature preview still renders in production
6. confirm quotation email tabs still respect customer-facing filtering
7. confirm production cron configuration still includes `/api/cron/exchange-rates?days=7`


## Sign-Off Record

Record these values in the release note:

- release SHA on `main`
- remote Supabase project ref
- latest migration applied
- Vercel production domain
- confirmation that `NEXT_PUBLIC_APP_URL` matches the production domain
- production Gmail OAuth redirect URI
- workspace smoke completed
- mailing smoke completed
- signature smoke completed
- approval owner
