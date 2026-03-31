# AI DESIGN SYSTEM

This document defines the visual design system for the ERP interface.

The goal is to create a clean, modern, and intuitive interface that feels
corporate, premium, and aligned with Priority Freight Intelligence.

The interface must prioritize clarity, simplicity, and usability.



--------------------------------------------------
DESIGN PHILOSOPHY
--------------------------------------------------

Corporate
Confident
Readable
Consistent

Users should understand the interface without training.



--------------------------------------------------
LAYOUT SYSTEM
--------------------------------------------------

Use a grid layout.

Base grid:

8px spacing system.

Spacing scale:

4px
8px
16px
24px
32px
48px
64px



Containers should use consistent padding.

Example

page padding 24px
card padding 16px



--------------------------------------------------
TYPOGRAPHY
--------------------------------------------------

Primary Font

Avenir Next

Fallback

Segoe UI
Helvetica
Arial



Font hierarchy

Page Title
32px
bold

Section Title
24px
semi-bold

Card Title
18px
medium

Body Text
14px
regular

Secondary Text
12px
light



Text should always prioritize readability.

Typography implementation rule

- `Avenir Next` remains the primary font for the ERP shell and workspaces
- typography must be expressed through semantic roles, not one-off utility mixes
- approved semantic roles include:
  - page title
  - section title
  - card title
  - eyebrow
  - body
  - muted body
  - field label
  - data value
  - table header
  - caption
- dense administrative screens should reduce excessive tracking and avoid ultra-light text on bright cards
- every new workspace should inherit its text hierarchy from shared typography wrappers instead of inventing its own scale



--------------------------------------------------
COLOR SYSTEM
--------------------------------------------------

Use the corporate Priority palette.

Primary Background

Navy
#0B1F3B

Primary Accent

Burgundy
#800020

Accent Gradient

Burgundy Light
#B33A5B

Technology Accent

Gray
#909EAE

Text Light

Light Gray
#E5E5E5

Text Secondary

Soft Gray
#CFCFCF

Cards inside the ERP should typically use bright, premium surfaces over a dark shell:

App shell
dark navy gradient

Primary cards
soft white / light steel

Status accents
use business meaning colors without overwhelming the corporate palette

Brand asset rule

- repository source of truth: ASSETS/
- official synced runtime brand assets: frontend/public/assets/
- the approved shell lockup is `frontend/public/assets/logo_vSVG.svg`
- prototype shell assets may exist in frontend/public/brand/ but they are not the canonical shell lockups once approved SVG exports exist
- document and PDF runtime raster assets: frontend/public/assets/
- app metadata icon: frontend/public/assets/favicon-transparent.png
- use SVG lockups for sidebar, topbar, login, and app-shell brand rendering
- if official shell assets render unreliably in the local/runtime app, a temporary code-rendered shell lockup is allowed until the approved asset path is fixed
- use raster logo assets only for document/PDF surfaces that already depend on PNG export quality
- all runtime brand paths must come from a shared branding module; do not hardcode logo paths inside pages, components, or PDF routes
- do not recreate logos with text when official assets exist



--------------------------------------------------
SHADOW SYSTEM
--------------------------------------------------

Use soft shadows for depth.

Card Shadow

small shadow

Modal Shadow

medium shadow

Dropdown Shadow

light shadow



Shadows should be subtle.



--------------------------------------------------
BORDER RADIUS
--------------------------------------------------

Rounded corners create a modern look.

Default

16px

Cards

24px to 30px

Buttons

16px to 22px

Modals

24px to 32px



--------------------------------------------------
COMPONENT SYSTEM
--------------------------------------------------

The UI should be built using reusable components.



Core components

- `shadcn/ui` is the only approved component foundation
- the ERP-facing layer must continue to use branded `Priority` wrappers
- official `shadcn` compositions for empty states, comboboxes, and data tables are approved as the technical base below `PriorityEmptyState`, `PrioritySearchCombobox`, and `PriorityDataTable`
- semantic typography must be applied through `PriorityTypography` roles before adding new one-off `text-*` or `tracking-*` mixes
- form headers, section headers, helper text, data-value cards, and sticky submit areas must use shared typography roles so dialogs and sheets do not drift visually from the rest of the ERP
- date selection should use the shared composed date field pattern (`calendar + popover + button`) instead of browser-default date inputs on premium ERP surfaces
- hover previews, grouped actions, and resizable panels are approved for dense workspaces when they reduce clicks and scroll, not when they merely add novelty
- the official `shadcn` primitives for alert, avatar, checkbox, dropdown menu, empty, spinner, switch, and related interaction components are approved as the technical base under `Priority UI`
- low-contrast secondary actions are not acceptable on premium light surfaces; secondary actions should use approved button variants or row-action menus instead of dark-on-dark micro-buttons

Button
Card
Table
Input
Select
Modal
Sidebar
Navbar
Badge
Notification



Components must be consistent across all modules.

Approved component foundation

- `shadcn/ui` with `radix` is the only approved primitive foundation for the ERP frontend
- Priority branding, spacing, density, and business semantics must be applied on top of that foundation through shared wrappers and tokens
- do not introduce a second component foundation or competing visual kit
- do not ship raw default kit styling as the final ERP brand language

Tabs rule

- tabs are approved for dense workspaces inside a record or module
- tabs are not approved as the primary global navigation pattern
- sidebar + topbar remain the canonical shell navigation model
- tabs should reduce vertical sprawl in places such as detail screens, pricing/sales workspaces, and permissions workspaces
- current approved tabbed workspaces already implemented: client detail, provider detail, quotation detail, and roles & permissions



--------------------------------------------------
BUTTON DESIGN
--------------------------------------------------

Primary Button

Filled with burgundy gradient.

Example

+ New Client



Secondary Button

Glass / outline style over the current surface.



Danger Button

Red background.



Buttons should always have icons when possible.



--------------------------------------------------
CARD DESIGN
--------------------------------------------------

Cards should contain summarized information.

Example

Total Clients
Open Opportunities
Active Shipments
Monthly Revenue



Card layout

Title
Main number
Small description



--------------------------------------------------
TABLE DESIGN
--------------------------------------------------

Tables must be easy to read.

Use:

hover highlight
sortable columns
search bar
pagination



Avoid very dense tables.



--------------------------------------------------
FORM DESIGN
--------------------------------------------------

Forms must be simple.

Max width

600px

Fields grouped by section.

Operational spreadsheet rule

- quotation cargo capture and pricing purchase capture may use spreadsheet-style row layouts when speed is more important than decorative form chrome
- these spreadsheet-like capture areas must still preserve strong spacing, clear headers, and low visual clutter



Example

Client Information

Name
Email
Phone



--------------------------------------------------
ICON SYSTEM
--------------------------------------------------

Icons help navigation.

Recommended icon size

20px



Examples

Clients → 👥  
Shipments → 📦  
Sales → 💼  
Analytics → 📊  
Settings → ⚙️



Icons should be consistent.



--------------------------------------------------
DASHBOARD COMPONENTS
--------------------------------------------------

Dashboard must use cards and charts.

Example widgets

Revenue Chart
Shipment Status
Sales Pipeline
Client Growth



Widgets must be visually simple.



--------------------------------------------------
ANIMATION RULES
--------------------------------------------------

Animations must be subtle.

Examples

fade in
slide up
hover effects



Avoid heavy animations.



--------------------------------------------------
DARK MODE SUPPORT
--------------------------------------------------

Design should support dark mode.

Background

dark gray

Cards

slightly lighter gray

Text

white



--------------------------------------------------
RESPONSIVE DESIGN
--------------------------------------------------

Interface must adapt to:

desktop
tablet
mobile



Sidebar collapses on mobile.


--------------------------------------------------
DOCUMENT OUTPUT DESIGN
--------------------------------------------------

Customer quotation output:

- must feel like a formal commercial proposal
- preview and PDF must share the same hierarchy and branding direction
- status and internal tracking must stay hidden

Provider pricing request output:

- may use the same branded family, but must read as internal sourcing support
- email and WhatsApp outreach remain the primary provider-facing channel in the live workflow
- if a PDF is shown, it must remain secondary support output and never expose client name or commercial sale values



--------------------------------------------------
COMPONENT REUSE RULE
--------------------------------------------------

When creating new UI features, always reuse components.

Do not create new styles if a component already exists.



--------------------------------------------------
AI DESIGN GENERATION RULE
--------------------------------------------------

When AI generates UI, it must follow this design system.

All components must respect:

spacing
typography
colors
layout
components



--------------------------------------------------
END OF DESIGN SYSTEM
--------------------------------------------------
