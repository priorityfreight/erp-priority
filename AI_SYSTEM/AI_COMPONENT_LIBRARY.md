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
- PriorityDateField
- PriorityHoverPreview
- PriorityFormSection
- PriorityFormField
- PriorityInput
- PriorityTextarea
- PrioritySelectField
- PriorityInfoField
- PrioritySubmitBar
- PriorityEmptyState
- PriorityDataTable
- PriorityUserAvatar
- PrioritySectionAlert
- PriorityTypography

Current administrative workspace pattern

- summary metric cards at the top
- toolbar with `PriorityInput` and `PrioritySelectField`
- `PriorityDataTable` for the main grid
- `PriorityRowActions` for dense row action menus instead of piling multiple buttons in each row
- `PrioritySectionAlert` for inline success, warning, and failure states
- `AlertDialog` for destructive confirmation
- modal content built from `PriorityFormSection` and `PrioritySubmitBar`
- use `DropdownMenu`-backed `PriorityRowActions` for secondary row actions instead of stacking small action buttons with low contrast
- keep this pattern as the default for new master data modules unless a workflow clearly needs a denser custom workspace
- current approved list workspaces using this pattern: users, exchange rates, service transport types, sales accounting concepts, quotation rejection reasons, clients, contacts, opportunities, quotations, and pricing quotations
- destructive actions must route through the shared `usePriorityConfirm` hook instead of `window.confirm`
- blocking `alert()` is deprecated in live frontend code; use `notifyWarning`, `notifyError`, `notifySuccess`, or `notifyInfo`
- use `Switch` for real boolean state toggles in admin/workspace surfaces when immediate on/off intent is clearer than a button label
- when the official `shadcn` `Empty` primitive is present, `PriorityEmptyState` must wrap that primitive instead of using isolated custom markup

Composition rule

- use primitives as infrastructure and Priority wrappers as the ERP-facing contract
- when an official `shadcn` primitive or pattern exists and fits the ERP need, use it as the technical base and keep `Priority` as the branded wrapper
- current canonical internal bases: `ui/empty.tsx` for empty states, `ui/combobox.tsx` for official combobox composition, and `ui/data-table.tsx` for the shared TanStack/shadcn table shell
- current approved examples: `PriorityEmptyState` wraps official `Empty`; `PrioritySearchCombobox` stays the ERP-facing contract while delegating to the shared `ui/combobox.tsx` pattern; `PriorityDataTable` remains the ERP-facing table contract on top of the shared `ui/data-table.tsx` + TanStack/shadcn pattern
- `PriorityDataTable` is approved to expose optional row selection and a column-visibility menu when a workspace benefits from denser operator controls
- dense record workspaces should prefer tabs, section cards, drawers, dialogs, and sticky submit rails over long unstructured vertical pages
- date picking should be composed through the shared `PriorityDateField` wrapper on top of `calendar + popover + button`, not raw `input type="date"` in live workspaces
- contextual record previews should prefer `PriorityHoverPreview` when they reduce navigation friction without adding modal weight
- use `ButtonGroup` to cluster related secondary actions in dense workspaces instead of scattering standalone buttons
- use `ResizablePanelGroup` only in genuinely dense workspaces where side-by-side context improves speed, not as decoration
- list workspaces should prefer toolbar + table + filters + empty state
- current approved tabbed workspaces: client detail, provider detail, quotation detail, and roles & permissions
- long CRM and pricing forms should use `PriorityFormSection`, `PriorityFormField`, `PriorityInfoField`, and `PrioritySubmitBar` instead of raw inputs and ad hoc footer buttons
- forms that open in dialogs, sheets, or premium cards should start with `PriorityFormHeader` and keep a stable two-column default grid unless a third column is clearly justified
- boolean states should prefer `Switch` when the intent is immediate on/off, and 2-5 mutually exclusive choices should prefer `ToggleGroup`
- validation and sync warnings inside forms should use `PrioritySectionAlert` instead of custom inline boxes
- spreadsheet-style capture forms may keep a tabular grid for speed, but they must still use shared headers, alerts, info cards, and submit bars instead of custom legacy shells
- typography must be semantically composed through `PriorityTypography` or approved semantic wrappers, not rebuilt ad hoc with random `text-*` and `tracking-*` combinations in every page



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

Sidebar
Topbar
Main Workspace

Corporate implementation:

- branded dark shell
- shared Priority lockup
- translucent topbar
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

Sidebar

Contains main modules.

Must support:

- shared brand lockup
- real company logo asset instead of recreated typography
- canonical SVG mark/wordmark from the shared branding module
- prefer official synced SVG lockups from `frontend/public/assets/` when they exist
- current approved shell lockup: `frontend/public/assets/logo_vSVG.svg`
- grouped module sections
- accordion module cards
- permission-aware route visibility
- persistent desktop collapsed state
- mobile drawer open / close state
- burgundy active item treatment
- dark navy base



Topbar

Contains

Search
User profile
Quick actions

Must support:

- compact brand lockup on constrained layouts
- corporate eyebrow + page title
- user identity cluster


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
