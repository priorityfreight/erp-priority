# AI COMPONENT LIBRARY

This document defines the reusable UI component library for the ERP frontend.

The goal is to ensure all UI is built from standardized components.

This guarantees:

consistency
speed of development
maintainability



--------------------------------------------------
CORE COMPONENT PRINCIPLE
--------------------------------------------------

All UI must be built using reusable components.

Never build custom UI when a component already exists.

Components must follow the design system defined in:

AI_DESIGN_SYSTEM.md

Approved foundation

- `frontend/src/components/ui/` contains the approved `shadcn/ui` primitives
- `frontend/src/components/priority/` contains the official ERP wrappers and compositions
- when an approved Priority wrapper exists, new UI must use it instead of rebuilding or bypassing the pattern
- do not introduce a second primitive library into the frontend foundation
- `frontend/src/stories/priority/` is the official Storybook visual workbench for isolated review of Priority UI before touching live ERP screens

Current Priority UI baseline

- PriorityDialog
- PrioritySheet
- PrioritySearchCombobox
- PriorityRowActions
- PriorityToolbar
- PriorityCommandBar
- PriorityWorkspacePath
- PriorityDateField
- PriorityHoverPreview
- PriorityWorkspaceHeader
- PriorityMetricStrip
- PriorityMetricCard
- PrioritySummaryRail
- PriorityFormSection
- PriorityFormField
- PriorityInput
- PriorityTextarea
- PrioritySelectField
- PriorityInfoField
- PrioritySubmitBar
- PriorityEmptyState
- PriorityCollectionWorkspace
- PrioritySearchField
- PriorityFilterPopover
- PrioritySavedViews
- PriorityStatusLanes
- PriorityActionRail
- PriorityActionMenu
- PriorityModalShell
- PriorityTooltip
- PriorityKanbanBoard
- PriorityKanbanCard
- PriorityCollectionTable
- PriorityDataTable
- PriorityUserAvatar
- PrioritySectionAlert
- PriorityTypography

Current administrative workspace pattern

- summary metric cards at the top
- toolbar with `PrioritySearchField`, `PriorityFilterPopover`, `PrioritySavedViews`, and `PriorityInput`/`PrioritySelectField` only where needed
- `PriorityStatusLanes` above the active browse surface
- `PriorityCollectionWorkspace` for the main browse shell
- `PriorityCollectionTable` for read-mostly detail tabs, embedded browse lists, and master-data list surfaces that do not need the full workspace shell
- `PriorityActionRail` for primary row actions that should stay visible in the first column
- `PriorityActionMenu` or `PriorityRowActions` for secondary row actions instead of piling multiple buttons in each row
- `PrioritySectionAlert` for inline success, warning, and failure states
- `AlertDialog` for destructive confirmation
- modal content built from `PriorityFormSection` and `PrioritySubmitBar`
- use `DropdownMenu`-backed `PriorityRowActions` for secondary row actions instead of stacking small action buttons with low contrast
- keep this pattern as the default for new master data modules unless a workflow clearly needs a denser custom workspace
- current approved browse workspaces using this pattern: pricing quotations, quotations, opportunities, clients, and providers
- current approved operational mail surfaces:
  - `Master Data > Mail` for mailbox setup, role access, OAuth, sync mode, and signature image
  - `/mail` for the shared inbox and reply flow
  - embedded `Email` tabs on entities when the workflow benefits from linked thread context
- destructive actions must route through the shared `usePriorityConfirm` hook instead of `window.confirm`
- blocking `alert()` is deprecated in live frontend code; use `notifyWarning`, `notifyError`, `notifySuccess`, or `notifyInfo`
- use `Switch` for real boolean state toggles in admin/workspace surfaces when immediate on/off intent is clearer than a button label
- when the official `shadcn` `Empty` primitive is present, `PriorityEmptyState` must wrap that primitive instead of using isolated custom markup

Composition rule

- use primitives as infrastructure and Priority wrappers as the ERP-facing contract
- when an official `shadcn` primitive or `react-aria-components` pattern fits the ERP need, use it as the technical base and keep `Priority` as the branded wrapper
- current canonical internal bases:
  - `ui/empty.tsx` for empty states
  - `ui/combobox.tsx` for official combobox composition
  - `react-aria-components` for browse/discovery workspaces, lanes, saved views, action rails, modals, and kanban
  - `ag-grid-community` for dense editing wrappers
- current approved examples:
  - `PriorityEmptyState` wraps official `Empty`
  - `PrioritySearchCombobox` stays the ERP-facing contract while delegating to the shared combobox pattern
  - `PriorityCollectionWorkspace` is the ERP-facing browse contract on top of React Aria compositions
  - `PrioritySavedViews`, `PriorityStatusLanes`, `PriorityActionRail`, and `PriorityKanbanBoard` are the approved workspace interaction layer
- mailbox-signature rendering is approved as an ERP service capability:
  - mailbox records persist the source URL
  - the app may proxy remote images through `/api/mail/signature-image` before rendering them in UI or outbound mail
- `PriorityCollectionTable` is the canonical browse/list table for non-workspace list surfaces
- `PriorityDataTable` is now a legacy compatibility wrapper around `PriorityCollectionTable` and should not be chosen for new live workspace migrations
- dense record workspaces should prefer tabs, section cards, drawers, dialogs, and sticky submit rails over long unstructured vertical pages
- date picking should be composed through the shared `PriorityDateField` wrapper on top of `calendar + popover + button`, not raw `input type="date"` in live workspaces
- contextual record previews should prefer `PriorityHoverPreview` when they reduce navigation friction without adding modal weight
- use `ButtonGroup` to cluster related secondary actions in dense workspaces instead of scattering standalone buttons
- use `ResizablePanelGroup` only in genuinely dense workspaces where side-by-side context improves speed, not as decoration
- list workspaces should prefer `PriorityCollectionWorkspace` with toolbar + lanes + active table + empty state
- current approved tabbed workspaces: client detail, provider detail, quotation detail, and roles & permissions
- desktop-first navigation should prefer the shared `PriorityCommandBar` over adding isolated quick-search affordances per screen
- long CRM and pricing forms should use `PriorityFormSection`, `PriorityFormField`, `PriorityInfoField`, and `PrioritySubmitBar` instead of raw inputs and ad hoc footer buttons
- forms that open in dialogs, sheets, or premium cards should start with `PriorityFormHeader` and keep a stable two-column default grid unless a third column is clearly justified
- required fields must show a visible required indicator only when the schema or workflow truly requires them; do not mark optional fields just because they are common
- helper text should exist only when it prevents a real error, clarifies a business rule, or explains derived behavior
- approved modal size taxonomy:
  - `compact` for short utility or catalog forms
  - `standard` for most create/edit dialogs
  - `workspace` for long record forms and hybrid form-plus-grid workflows
- approved form density taxonomy:
  - `compact` for short dialogs and catalog forms
  - `workspace` for long create/edit flows and hybrid record capture
- desktop forms should bias toward wider dialogs with tighter section spacing so operators see more fields before the submit rail appears
- use `PriorityDialog` and `PriorityForm` as the only shared place to tune dialog width, padding, field height, and submit-bar prominence
- on large desktop screens, shared form layouts should prefer a 3-column working density by default unless a given form explicitly needs fewer columns for clarity
- `PrioritySubmitBar` should stay sticky only in long workspace forms; compact forms should default to an inline footer with lower visual weight
- boolean states should prefer `Switch` when the intent is immediate on/off, and 2-5 mutually exclusive choices should prefer `ToggleGroup`
- validation and sync warnings inside forms should use `PrioritySectionAlert` instead of custom inline boxes
- spreadsheet-style capture forms may keep a tabular grid for speed, but they must still use shared headers, alerts, info cards, and submit bars instead of custom legacy shells
- schema-driven forms should use `PriorityFormEngine` on top of `react-hook-form + zod`
- feature modules should define schemas and field definitions, not custom form state machines
- `PriorityGrid` on top of `ag-grid-community` is the approved dense editing wrapper for inline row capture, commercial lines, matrices, and structured operational tables
- `PriorityGridToolbar` is the shared header for grid-local actions and orientation
- `PriorityKanbanBoard` is the approved board shell for pipeline-style workflows such as opportunities
- `PriorityHybridFormLayout` is approved when a classic form and a dense grid need to coexist in one workspace
- the current live forms already migrated to this standard are: login, client, contact, opportunity, provider, provider contact, provider service offering, user, client logistics party, and quotation header
- special modal flows such as quotation status changes, quotation sales-option capture, and role-permission cloning must still use `PriorityFormSection` + `PrioritySubmitBar` even when they are not full `PriorityFormEngine` screens
- typography must be semantically composed through `PriorityTypography` or approved semantic wrappers, not rebuilt ad hoc with random `text-*` and `tracking-*` combinations in every page
- page-level workspace framing should prefer:
  - `PriorityWorkspaceHeader`
  - `PriorityWorkspacePath`
  - `PriorityMetricStrip`
  - `PrioritySummaryRail`
  over oversized marketing-like hero blocks inside live ERP screens
- empty list workspaces should switch to a compact workspace mode with toolbar-first layout and `PriorityEmptyState` visible near the fold instead of stacking hero copy, metrics, and an empty table shell
- do not repeat the same workspace label in navigation, topbar, and page hero; keep global navigation in the shell and use `PriorityWorkspacePath` inside the workspace header for local backtracking
- live ERP overview and detail screens should feel like workspaces first, not landing pages or card mosaics



--------------------------------------------------
COMPONENT CATEGORIES
--------------------------------------------------

Layout Components
Data Components
Form Components
Feedback Components
Navigation Components
Dashboard Components



--------------------------------------------------
LAYOUT COMPONENTS
--------------------------------------------------

AppLayout

Main application wrapper.

Structure

Topbar
Main Workspace
Workspace Path in header

Corporate implementation:

- branded dark shell
- shared Priority lockup
- translucent topbar
- topbar `NavigationMenu` for premium module switching on desktop
- `PriorityCommandBar` for global movement and quick actions
- interactive `PriorityWorkspacePath` inside workspace headers for local backtracking
- bright premium content card
- the shell, login screen, and constrained header states must render branding through a single shared Brand component backed by canonical brand asset constants



PageContainer

Standard page wrapper.

Includes

page title
primary action button
content area



Card

Used for displaying summarized information.

Structure

Title
Content
Optional footer



Grid

Responsive grid layout.



--------------------------------------------------
NAVIGATION COMPONENTS
--------------------------------------------------

Topbar

Contains

Search
User profile
Quick actions

Must support:

- compact brand lockup on constrained layouts
- module navigation
- global search / command entry
- user identity cluster
- current approved shell lockup: `frontend/public/assets/logo_vSVG.svg`


Brand

Shared logo/lockup component for shell, auth, and constrained layouts.

Must support:

- compact mark-only state
- expanded wordmark state
- light and dark lockups from canonical runtime assets
- optional tagline support for login/auth surfaces
- no hardcoded asset paths outside the shared branding module
- official synced lockups override prototype brand assets once approved by the user
- if asset rendering is unstable, the shared Brand component may temporarily render a code-based fallback lockup to keep the shell functional



Breadcrumb

Displays navigation hierarchy.


ModuleTreeNav

Permission-aware tree used in the Roles and Permissions workspace.

Must support:

- module groups
- submodule rows
- active/inactive states
- quick visual summary of configured access



--------------------------------------------------
DATA COMPONENTS
--------------------------------------------------

DataTable

Standard table component.

Features

search
sorting
pagination
row actions
select rows



Example columns

Name
Email
Status
Created At



DetailPanel

Side panel showing detailed record information.


PermissionsMatrix

Hybrid grid component for coarse-grained role permissions.

Features

- item label column
- view/create/edit/delete toggles
- summarized action state
- scope selector
- low-clutter enterprise presentation


FieldPermissionDrawer

Right-side drawer used by the permissions workspace.

Features

- grouped field-level permissions
- advanced action toggles
- clear section labels
- dirty-state awareness before save



StatusBadge

Displays status visually.

Examples

active
pending
completed
archived


InfoSectionCard

Standard read-only section for entity detail pages.

Features

section title
structured key-value fields
responsive layout


Use for

Company Information
Location Information
Contact Information



--------------------------------------------------
FORM COMPONENTS
--------------------------------------------------

FormBuilder

Dynamic form generator.

Features

grouped fields
validation
responsive layout



InputField

Standard text input.



SelectField

Dropdown selection.



DatePicker

Date selection component.



TextArea

Long text input.



FileUpload

Upload documents or images.



--------------------------------------------------
ACTION COMPONENTS
--------------------------------------------------

PrimaryButton

Main action.

Example

+ New Client



SecondaryButton

Secondary actions.

Example

Cancel



DangerButton

Used for destructive actions.

Example

Delete



IconButton

Small button with icon.



--------------------------------------------------
MODAL COMPONENTS
--------------------------------------------------

Modal

Used for focused tasks.

Primary use cases

edit record
create related record
confirm destructive action


Core ERP detail pages should prefer Modal for edit/create flows instead of inline forms.

Examples

Create record
Confirm deletion
Edit details



ConfirmDialog

Used for critical actions.

Example

Delete client confirmation.


QuotationCargoLineForm

Current live implementation:

- spreadsheet-style multi-row cargo capture modal
- explicit action to add another load row
- accumulated calculations visible inside the same modal


QuotationChargeLineForm

Current live implementation:

- spreadsheet-style multi-row purchase capture modal
- grouped by quotation option
- explicit action to add another purchase concept
- inline editing of a whole option instead of detached editors



--------------------------------------------------
FEEDBACK COMPONENTS
--------------------------------------------------

ToastNotification

Temporary message.

Examples

Saved successfully
Error occurred



Alert

Persistent warning or info message.



LoadingSpinner

Displayed during processing.


--------------------------------------------------
DOCUMENT COMPONENTS
--------------------------------------------------

CustomerQuotationPdf

Current live implementation:

- real generated customer-facing PDF
- provider and purchase data hidden
- one commercial option rendered separately
- REMARKS block per option


ProviderPricingRequestPdf

Current live implementation:

- real generated internal provider PDF
- no client name
- no commercial sale values
- operational route and cargo details only


Document preview surfaces

Current live implementation:

- customer quotation has a web preview plus a real PDF route
- provider pricing request has a web preview plus a real PDF route
- the live provider workflow still prioritizes bilingual outreach actions from the pricing modal



--------------------------------------------------
DASHBOARD COMPONENTS
--------------------------------------------------

StatCard

Displays key metrics.

Examples

Total Clients
Open Opportunities
Active Shipments



ChartWidget

Displays charts.

Examples

Revenue chart
Opportunity pipeline
Shipment status



ActivityFeed

Recent activity log.



--------------------------------------------------
SEARCH COMPONENT
--------------------------------------------------

GlobalSearch

Allows searching across:

clients
opportunities
shipments



Must be located in top bar.



--------------------------------------------------
TABLE ACTIONS
--------------------------------------------------

Each table row may contain actions.

Examples

View
Edit
Delete



Actions should use icon buttons.



--------------------------------------------------
COMPONENT NAMING
--------------------------------------------------

Components must follow PascalCase naming.

Examples

DataTable
ClientForm
ShipmentCard
DashboardStats



--------------------------------------------------
AI COMPONENT GENERATION RULE
--------------------------------------------------

When generating a new module UI, AI must assemble pages using these components.

Example

Clients Module

PageContainer
DataTable
ClientForm
Modal
StatusBadge



--------------------------------------------------
COMPONENT REUSE RULE
--------------------------------------------------

Never create duplicate components.

Always reuse existing ones.



--------------------------------------------------
FRONTEND STRUCTURE
--------------------------------------------------

Recommended folder structure



components/

layout/
AppLayout
Sidebar
Topbar

data/
DataTable
DetailPanel
StatusBadge

forms/
FormBuilder
InputField
SelectField

dashboard/
StatCard
ChartWidget

feedback/
ToastNotification
Alert

actions/
Buttons



--------------------------------------------------
END OF COMPONENT LIBRARY
--------------------------------------------------
