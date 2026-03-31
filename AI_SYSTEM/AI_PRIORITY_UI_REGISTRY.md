# AI PRIORITY UI REGISTRY

This document is the canonical registry for the ERP-facing component layer.

Its purpose is to define:

- which `Priority UI` components are officially approved
- which technical base each wrapper uses
- where each wrapper should be used
- which patterns are now mandatory for future modules


--------------------------------------------------
ROLE OF THIS DOCUMENT
--------------------------------------------------

`shadcn/ui` is the only primitive foundation.

`Priority UI` is the public UI contract of the ERP.

That means:

- new live modules should prefer `Priority` wrappers over direct primitive usage
- wrappers may evolve internally as `shadcn` improves
- the ERP-facing contract must remain stable and recognizable

Use this document when:

- building a new frontend module
- extending an existing workspace
- deciding whether to create a new wrapper
- deciding whether a page should import a primitive directly


--------------------------------------------------
OFFICIAL EXPORT SURFACE
--------------------------------------------------

Public Priority export barrel:

- `frontend/src/components/priority/index.ts`

Internal typed registry:

- `frontend/src/components/priority/registry.ts`

Official isolated visual review workbench:

- `frontend/src/stories/priority/`
- use Storybook to review wrappers and compositions before changing live ERP screens

Rule:

- if a component is part of the approved Priority registry, prefer importing it from the Priority barrel or its canonical module instead of rebuilding the pattern locally


--------------------------------------------------
APPROVED REGISTRY BASELINE
--------------------------------------------------

Approved current wrappers and hooks:

- `PriorityDialog`
- `PrioritySheet`
- `PrioritySearchCombobox`
- `PriorityDataTable`
- `PriorityEmptyState`
- `PriorityFormHeader`
- `PriorityFormSection`
- `PriorityFormField`
- `PriorityInfoField`
- `PrioritySubmitBar`
- `PriorityDateField`
- `PrioritySectionAlert`
- `PriorityRowActions`
- `PriorityToolbar`
- `PriorityUserAvatar`
- `PriorityTypography`
- `PriorityHoverPreview`
- `usePriorityConfirm`


--------------------------------------------------
CATEGORY RULES
--------------------------------------------------

Overlays

- use `PriorityDialog` for modal editing and short review flows
- use `PrioritySheet` when editing secondary data without abandoning the parent context

Forms

- begin premium forms with `PriorityFormHeader`
- use `PriorityFormSection` and `PriorityFormField` for non-tabular input layouts
- use `PriorityInfoField` for backend-owned or derived values
- end long or important forms with `PrioritySubmitBar`
- use `PriorityDateField` instead of raw date inputs on premium ERP surfaces

Data display

- use `PriorityDataTable` as the default grid/list shell
- use `PriorityEmptyState` for empty, search-empty, blocked, and recoverable error states
- use `PriorityTypography` for semantic text roles
- use `PriorityUserAvatar` when a user or owner identity is shown

Feedback and interaction

- use `PrioritySectionAlert` for inline success/warning/error/info blocks
- use `PriorityRowActions` for dense secondary actions in tables
- use `PriorityHoverPreview` when quick context reduces navigation cost
- use `usePriorityConfirm` instead of `window.confirm`


--------------------------------------------------
DIRECT PRIMITIVE USAGE RULE
--------------------------------------------------

Direct `ui/` primitive usage is allowed only when one of these is true:

1. no approved Priority wrapper exists yet
2. the primitive is deeply internal to an existing wrapper implementation
3. the workflow is highly specialized and a new reusable Priority wrapper should be evaluated

Direct primitive usage is not a shortcut to bypass the ERP layer.


--------------------------------------------------
WHEN TO CREATE A NEW PRIORITY WRAPPER
--------------------------------------------------

Create or extend a wrapper when:

- the same composition appears in 2 or more live modules
- the pattern carries branding decisions, spacing decisions, or validation rules
- the pattern is business-facing and should stay stable even if the primitive base changes
- the pattern reduces future ad hoc styling in operations or accounting

Do not create a wrapper just to rename a primitive without added ERP value.


--------------------------------------------------
KNOWN STRONG PATTERNS
--------------------------------------------------

Administrative list workspace

- `PriorityToolbar`
- `PriorityDataTable`
- `PriorityRowActions`
- `PriorityEmptyState`
- `PrioritySectionAlert`

Premium modal form

- `PriorityDialog`
- `PriorityFormHeader`
- `PriorityFormSection`
- `PriorityFormField`
- `PriorityInfoField`
- `PrioritySubmitBar`

Dense record workspace

- `PriorityTypography`
- `PriorityHoverPreview`
- `PriorityDateField`
- `PrioritySectionAlert`
- `PriorityRowActions`

Spreadsheet-style capture form

- tabular grid remains acceptable for speed
- surround it with:
  - `PriorityFormHeader`
  - `PrioritySectionAlert`
  - `PriorityInfoField`
  - `PrioritySubmitBar`


--------------------------------------------------
NON-NEGOTIABLE RULES
--------------------------------------------------

- do not introduce a second UI foundation
- do not reintroduce `window.confirm`
- do not build new empty states with custom ad hoc markup when `PriorityEmptyState` fits
- do not build new list grids from raw HTML tables when `PriorityDataTable` fits
- do not rebuild typography ad hoc when `PriorityTypography` roles already fit
- do not bypass the wrapper layer simply because direct primitive imports look faster


--------------------------------------------------
TARGET OUTCOME
--------------------------------------------------

The goal of the Priority registry is not only visual consistency.

It exists so that:

- future modules build faster
- AI-assisted development has a stable UI contract
- operations and accounting inherit professional patterns from day one
- the frontend stops fragmenting into multiple local UI dialects
