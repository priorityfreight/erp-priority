# Frontend Form + Grid Migration Status

Date: 2026-03-31

This document tracks the current implementation state of the next-generation data-entry architecture.

## Current foundation

- `PriorityFormEngine` is the canonical schema-driven form renderer on top of `react-hook-form + zod`
- `PriorityCollectionWorkspace` is the standard shell for read-mostly browse/list screens
- `PriorityCollectionTable` is the standard browse/list table for embedded tabs and non-workspace list surfaces
- `PriorityGrid` on top of `ag-grid-community` is the approved dense editing layer
- the canonical shell is now topbar-first with:
  - `NavigationMenu`
  - `PriorityCommandBar`
  - `PriorityWorkspacePath`
  - no persistent desktop sidebar

## Live migrations completed

### Standard form-first

- `frontend/src/components/auth/LoginScreen.tsx`
- `frontend/src/components/forms/ClientForm.tsx`
- `frontend/src/components/forms/ContactForm.tsx`
- `frontend/src/components/forms/OpportunityForm.tsx`
- `frontend/src/components/forms/ProviderForm.tsx`
- `frontend/src/components/forms/ProviderContactForm.tsx`
- `frontend/src/components/forms/ProviderServiceOfferingForm.tsx`
- `frontend/src/components/forms/UserForm.tsx`
- `frontend/src/components/forms/ClientLogisticsPartyForm.tsx`
- `frontend/src/components/forms/QuotationForm.tsx`
- current form audit standard applied to these live flows:
  - required fields are visually marked only when they are truly required by schema or workflow contract
  - desktop defaults to a two-column form rhythm
  - mobile collapses to one column without changing field order
  - helper text exists only when it reduces a real capture error or explains business context
  - modal sizing now follows three approved variants:
    - `compact` for short catalog or utility forms
    - `standard` for most create/edit flows
    - `workspace` for long or hybrid forms such as client, opportunity, provider, quotation, and cargo/pricing capture

### CRM list workspaces aligned

- `frontend/app/clients/page.tsx`
  - single canonical create-form state
  - homogeneous toolbar with search, status filter, and sorting
- `frontend/app/contacts/page.tsx`
  - schema-driven create/edit modal flow
  - homogeneous toolbar with search, status filter, and client filter
- `frontend/app/opportunities/page.tsx`
  - schema-driven create modal flow
  - homogeneous toolbar with search, status filter, and client filter

### CRM and provider detail workspaces aligned

- `frontend/app/clients/[id]/page.tsx`
  - action cluster and status handling aligned to the topbar-first workspace shell
- `frontend/app/opportunities/[id]/page.tsx`
  - copy, readiness states, and quote-create flow aligned to the current workspace language
- `frontend/app/pricing/providers/page.tsx`
  - homogeneous toolbar with search, status filter, and provider-type filter
- `frontend/src/features/provider-detail/ProviderDetailView.tsx`
  - service offerings migrated from plain table usage to `PriorityGrid`
  - mobile fallback defined through card rendering

### Quotations and admin migration closed

- `frontend/app/quotations/page.tsx`
  - quotations list aligned to the current CRM shell language
- `frontend/app/quotations/[id]/page.tsx`
  - action cluster aligned to workspace patterns
  - quote-create readiness feedback standardized
- `frontend/app/quotations/[id]/document/page.tsx`
  - commercial document preview aligned to the current customer-facing language
  - print-friendly surface polished without reintroducing app chrome
- `frontend/app/quotations/[id]/pricing-request/page.tsx`
  - provider pricing request preview aligned to internal sourcing language
  - document framing clarified for non-commercial internal use
- `frontend/app/pricing/quotations/page.tsx`
  - pricing workbench entrypoint aligned to the system naming
- `frontend/src/components/forms/QuotationCargoLineForm.tsx`
  - cargo detail moved from manual tabular markup to `PriorityGrid`
  - mobile fallback defined through editable cards
- `frontend/src/components/master-data/RolesPermissionsManager.tsx`
  - route access migrated from manual HTML table to `PriorityGrid`
  - mobile fallback defined for permission matrix interaction
- `frontend/src/components/master-data/MasterDataOverview.tsx`
  - admin portal copy normalized to the current UX language
- `frontend/src/components/master-data/UnlocodeExplorer.tsx`
  - migrated from raw table markup to `PriorityCollectionTable`
  - search and country filtering aligned to the shared browse pattern

### Hybrid / grid-backed

- `frontend/src/components/forms/QuotationChargeLineForm.tsx`
- `frontend/src/components/forms/QuotationCargoLineForm.tsx`
- `frontend/src/features/quotations/detail/QuotationDetailView.tsx`
  - status and sales-option modals now use the shared Priority form shell instead of isolated raw form markup
- `frontend/src/features/pricing/quotations/PricingQuotationsView.tsx`
  - pricing capture and sourcing dialogs now use `workspace` sizing and the current hybrid shell

## Remaining follow-up after this audit lot

### Priority P1

- `frontend/src/features/provider-detail/ProviderDetailView.tsx`
  - evaluate service offerings for `PriorityGrid` if row density keeps growing
- `frontend/src/components/master-data/UsersManager.tsx`
  - decide whether the modal should keep the external submit shell or move completely to engine-owned submit
- short admin catalog forms
  - convert to fully schema-driven engine usage only if the extra abstraction reduces maintenance, not just for cosmetic parity

### Priority P3

- preview surfaces
  - closed for current wave

## Done definition per screen

A screen is considered migrated only when:

- it uses the approved interaction pattern
- form state is schema-driven where a form exists
- it uses `PriorityCollectionWorkspace`, `PriorityCollectionTable`, or `PriorityGrid` instead of raw tables when applicable
- its mobile behavior is explicitly defined
- it uses an approved modal size (`compact`, `standard`, `workspace`) that matches the density of the workflow
- labels, required markers, helper text, and error messages match the shared form language
- it compiles cleanly with:
  - `npm run lint`
  - `npm run build`
  - `npm run build-storybook`
