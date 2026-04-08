# Vercel Deploy Guide

Priority Logistics ERP deploys from the `frontend/` directory.

Branch strategy:

- `main` deploys to `Production`
- `dev` is the stable shared `Preview` branch

Environment strategy:

- current linked Supabase backend = `DEV/TRAIN`
- new clean Supabase backend = `PROD`
- Vercel `Production` must point only to `PROD`
- Vercel `Preview` for `dev` must point only to `DEV/TRAIN`


## Project Setup

1. Import the GitHub repository into Vercel.
2. Set the project Root Directory to:

   `frontend`

3. Framework preset:

   `Next.js`

4. Local linking note:

   - `frontend/.vercel` is local-only and must stay untracked
   - run `vercel link` locally when you need CLI access to the correct project
   - the linked Vercel project must also use `frontend` as Root Directory


## Required Environment Variables

Add these variables in Vercel Project Settings:

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

Use `frontend/.env.example` as the reference shape.

See [`BRANCHING_AND_ENVIRONMENT_STRATEGY.md`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/docs/BRANCHING_AND_ENVIRONMENT_STRATEGY.md) for the canonical branch and environment mapping.


## Security Rules

- `SUPABASE_SERVICE_ROLE_KEY` must be added only as a server-side environment variable in Vercel.
- Never expose the service role key in client-side code or public documentation.
- The login gate depends on:
  - Supabase Auth
  - protected route proxy
  - active ERP user profile in `public.users`


## Deployment Notes

- The app blocks access before homepage and redirects unauthenticated users to `/login`.
- The `MASTER DATA / USERS` admin module requires `SUPABASE_SERVICE_ROLE_KEY` to provision credentials.
- The first working admin user is managed in Supabase Auth plus `public.users`.
- `Master Data > Mail` requires the Gmail OAuth variables and `MAIL_ENCRYPTION_KEY`.
- Mailbox signatures that use Google Drive or similar remote sources rely on `/api/mail/signature-image`.
- `NEXT_PUBLIC_APP_URL` must match the public Vercel production domain so proxied mailbox signatures render correctly in outbound mail.


## Validation Before Production

1. Confirm login works from `/login`
2. Confirm an inactive user cannot enter
3. Confirm anonymous requests cannot read ERP business tables
4. Confirm `MASTER DATA / USERS` can create and update users
5. Confirm `MASTER DATA / MAIL` can load, save a mailbox, and preview a signature image
6. Confirm `/mail` loads and authorized users can read/reply from a connected mailbox
7. Confirm `npm run build` passes locally before promoting
8. Confirm `npm run validation:release` passes from `frontend/`
9. Use [`PRODUCTION_RELEASE_CLOSEOUT.md`](/Users/joseadanrodriguez/Priority%20ERP/priority-logistics-erp/docs/PRODUCTION_RELEASE_CLOSEOUT.md) as the final production sign-off checklist
