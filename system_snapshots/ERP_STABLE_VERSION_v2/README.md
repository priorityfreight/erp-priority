# ERP_STABLE_VERSION_v2

Snapshot date: 2026-03-22

This snapshot marks the ERP after the first secure login and access-control rollout.

Validated commands:

- supabase db push --dry-run
- supabase db push
- npm run types
- npm run lint
- npm run build

Validated scope:

- login gate before homepage
- Supabase Auth browser/server session handling
- protected route proxy
- active ERP user validation through public.users
- canonical roles seed for Ventas, Pricing, Operaciones, Admin
- RLS policies aligned to authenticated active users

Important implementation rule:

- passwords are not stored in public.users
- Supabase Auth is the credential source of truth
- public.users stores ERP profile, username, role, phone, and active status
