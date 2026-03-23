# Vercel Deploy Guide

Priority Logistics ERP deploys from the `frontend/` directory.


## Project Setup

1. Import the GitHub repository into Vercel.
2. Set the project Root Directory to:

   `frontend`

3. Framework preset:

   `Next.js`


## Required Environment Variables

Add these variables in Vercel Project Settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Use `frontend/.env.example` as the reference shape.


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


## Validation Before Production

1. Confirm login works from `/login`
2. Confirm an inactive user cannot enter
3. Confirm anonymous requests cannot read ERP business tables
4. Confirm `MASTER DATA / USERS` can create and update users
5. Confirm `npm run build` passes locally before promoting
