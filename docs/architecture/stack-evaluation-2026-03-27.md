# Stack Evaluation 2026-03-27

## Objective

Evaluate whether Priority Logistics ERP should:

1. keep the current stack and harden it
2. partially restructure the current stack
3. migrate to a different stack before entering operations and accounting phases

This review is written for the current project only.
It must not be mixed with any other business system.


## Current Stack

- Frontend: Next.js App Router + React + TypeScript
- Backend platform: Supabase
- Core database: Postgres
- Security model: Supabase Auth + Postgres RLS + SQL functions/policies
- Deployment: Vercel for app, Supabase for backend
- Current architectural style: DB-centric ERP with frontend query modules and SQL-first business logic


## Executive Decision

For the current stage of the project, the best decision is:

1. do not migrate the core stack right now
2. harden the current TRAIN system first
3. create a new clean PROD backend only after hardening passes
4. keep Next.js + Supabase + Postgres as the core stack
5. introduce a stricter service boundary for automations before operations/accounting grows further

Practical interpretation:

- the current stack is viable
- the current structure is not yet disciplined enough for later ERP phases
- the main issue is not that the stack is wrong
- the main issue is that workflow ownership must be tightened before more modules are added


## Hardening Before PROD

Yes: hardening and cleanup must happen before creating or promoting to PROD.

Reason:

- TRAIN still contains validation-oriented structure and ongoing refactors
- operations and accounting will amplify defects in concurrency, permissions, automation, and financial integrity
- promoting inconsistent workflow boundaries into PROD would multiply future cost

Required order:

1. stabilize canonical write paths on TRAIN
2. finish live/local validation and stress strategy on TRAIN
3. freeze canonical migrations and seeds
4. create new clean PROD
5. run smoke on PROD
6. point LIVE only after PROD passes baseline validation


## Architecture Diagnosis

The current architecture is directionally correct for an MVP ERP:

- Postgres is the right backbone
- SQL functions and policies are a strong fit for transactional workflows
- TypeScript in frontend is highly compatible with AI-assisted development
- Vercel + Supabase keeps operational cost low

But there is one structural weakness that must be corrected:

- too much workflow orchestration is still spread between page components, query modules, and SQL functions

Before operations/accounting, the system should converge on this rule:

- UI handles presentation and user intent
- query layer handles transport and typed contracts
- canonical database functions own transactional invariants
- asynchronous integrations and automations run in a dedicated automation boundary


## Viable Stack Options

### Option A. Keep Current Stack and Harden It

Stack:

- Next.js
- Supabase Auth
- Postgres
- RLS
- SQL functions/views/triggers
- Vercel

Pros:

- lowest transition cost
- preserves current 30-40% investment
- strongest compatibility with current repo and AI-assisted workflow
- low infrastructure complexity
- database-centric ERP rules already align with the domain

Cons:

- requires discipline to avoid pushing business logic into the frontend
- Supabase Edge Functions are not ideal for heavy or long-running background processing
- if automations grow without a service boundary, maintainability will degrade

Best use case:

- current project trajectory, if hardened properly

Verdict:

- recommended


### Option B. Laravel + Postgres

Stack:

- Laravel
- Postgres
- Laravel queues
- Laravel scheduler
- Laravel auth/session or API auth

Pros:

- strongest greenfield fit for backoffice-heavy ERP work
- queues and scheduling are first-class and mature
- Eloquent and transactional workflows are productive for business systems
- monolithic structure is often clearer for accounting and operations logic

Cons:

- large migration cost from the current codebase
- language and ecosystem switch from TypeScript to PHP
- existing Supabase auth/RLS model would need redesign
- would delay product stabilization while rebuilding already-implemented modules

Best use case:

- greenfield ERP built from zero, before current investment exists

Verdict:

- best greenfield alternative
- not recommended as a migration now


### Option C. Django + Postgres

Stack:

- Django
- Postgres
- Django auth/admin

Pros:

- mature and highly structured
- excellent admin and data-oriented workflows
- strong model-driven architecture

Cons:

- weaker fit with the current TypeScript-heavy codebase
- async support is still a mixed story compared with newer TS ecosystems
- would require a deep platform rewrite with limited benefit over the current DB-centric approach

Best use case:

- Python-led teams with strong admin/backoffice emphasis from day one

Verdict:

- viable, but not the right move for this repository


### Option D. Next.js Frontend + Dedicated NestJS Backend + Postgres

Stack:

- Next.js frontend
- NestJS backend
- Postgres
- queues/workers

Pros:

- preserves TypeScript end to end
- strong DI/module structure
- good fit for explicit service boundaries and queue workers
- suitable if integrations and automations become significantly more complex

Cons:

- more infrastructure and operational cost
- duplicates some capabilities already solved in Supabase/Postgres
- adds complexity sooner than the project currently needs

Best use case:

- when the automation/integration layer becomes large enough that Edge Functions and SQL-only orchestration are no longer sufficient

Verdict:

- best future expansion path if the current stack outgrows its automation boundary
- not the best immediate move today


## Comparative Score

Scored from 1 to 10 for current project reality, not abstract preference.

| Option | Simplicity | Cost | Maintainability | Scalability | AI Compatibility | Architectural Clarity | Business Operability | Total |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| A. Current stack hardened | 9 | 9 | 7 | 7 | 9 | 7 | 8 | 56 |
| B. Laravel greenfield | 8 | 6 | 9 | 8 | 6 | 9 | 9 | 55 |
| C. Django | 7 | 7 | 8 | 7 | 5 | 8 | 8 | 50 |
| D. Next.js + NestJS + Postgres | 6 | 6 | 8 | 8 | 9 | 8 | 8 | 53 |

Important note:

- if this project were starting from zero today, Option B would deserve very serious consideration
- because the project is already materially built and its database backbone is strongly Postgres/Supabase-oriented, Option A is the best project decision now


## Recommended Target Architecture

### Core

- Keep Postgres as the business backbone
- Keep Supabase for Auth, database hosting, and RLS
- Keep Next.js as the application frontend
- Keep Vercel for LIVE for now

### Structural Adjustment Needed Before Operations and Accounting

Add a formal automation boundary.

Rule:

- SQL functions own transactional domain rules
- UI never becomes the source of business invariants
- automations, webhooks, retries, scheduled jobs, and long-running integrations must not live ad hoc inside page components

Recommended implementation path:

Phase 1:

- keep current SQL-first workflow model
- use DB functions for business-critical writes
- use Edge Functions only for light integrations and controlled endpoints

Phase 2:

- if automations become multi-step, retry-heavy, or integration-dense, add a dedicated worker/service layer
- at that point, the preferred expansion path is a small NestJS automation service, not a full rewrite


## Final Recommendation

Do not replatform the ERP now.

Do this instead:

1. harden TRAIN fully before PROD
2. create clean PROD after hardening
3. keep current stack
4. tighten workflow boundaries
5. add an automation service only when complexity justifies it

This gives the best balance of:

- simplicity
- low cost
- maintainability
- reasonable scale
- strong AI compatibility
- clear architecture
- real business operability


## Official References

- Next.js App Router: https://nextjs.org/docs/app
- Supabase database functions: https://supabase.com/docs/guides/database/functions
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Laravel queues: https://laravel.com/docs/12.x/queues
- Laravel task scheduling: https://laravel.com/docs/12.x/scheduling
- Laravel Eloquent: https://laravel.com/docs/12.x/eloquent
- Django models and databases: https://docs.djangoproject.com/en/5.2/topics/db/index/
- Django async support: https://docs.djangoproject.com/en/5.2/topics/async/
- Django deployment checklist: https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/
- NestJS providers and DI: https://docs.nestjs.com/components
- NestJS queues: https://docs.nestjs.com/techniques/queues
