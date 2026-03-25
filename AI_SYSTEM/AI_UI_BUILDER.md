# AI UI BUILDER

This document defines the UI rules for building the ERP frontend.

Goal

Create an interface that is extremely intuitive.
A new user should understand how to use the system in minutes.

The interface should feel like a corporate command center for freight intelligence.

Users should navigate visually, not through complex menus.



--------------------------------------------------
CORE DESIGN PRINCIPLES
--------------------------------------------------

1 Simplicity

Interfaces must be minimal.
Avoid visual clutter.

2 Visual Navigation

Icons and layout should guide the user.

3 Consistency

All modules follow the same layout.

4 Low Cognitive Load

Users should never feel overwhelmed.

5 Discoverability

Users should understand what to do by looking at the interface.



--------------------------------------------------
MAIN LAYOUT STRUCTURE
--------------------------------------------------

The ERP must follow a three-zone layout.



LEFT SIDEBAR

Main navigation.

Contains modules:

Dashboard
CRM
Sales
Operations
Analytics
Settings



TOP BAR

Search
Notifications
User profile
Quick actions

Visual direction:

- dark translucent surface
- strong page title hierarchy
- compact brand lockup on constrained layouts
- user identity clearly visible



MAIN WORKSPACE

Content area where modules are displayed.



--------------------------------------------------
SIDEBAR DESIGN
--------------------------------------------------

Sidebar must use short labels, strong grouping, and visible brand presence.

Sidebar visual direction:

- dark navy shell
- burgundy active state
- soft gray section labels
- embedded brand lockup near the top
- use the real company wordmark or mark asset, not generated text lockups
- retractable grouped module cards instead of a flat crowded menu
- remember the desktop collapsed state between sessions
- behave as a slide-in drawer on mobile with a strong close affordance

Example modules

🏠 Dashboard  
👥 Clients  
💼 Opportunities  
📦 Shipments  
📊 Analytics  
⚙️ Settings

Users should understand modules just by icons.
Users should also understand the module hierarchy at a glance through accordion groupings, not long flat lists.



--------------------------------------------------
MODULE STRUCTURE
--------------------------------------------------

Every module must follow the same structure.

Corporate shell rule:

1 branded outer shell
2 elevated page header block
3 bright premium content surface inside
4 burgundy reserved for primary actions
5 gray tones used for technology / intelligence cues



HEADER

Title
Primary action button
Corporate eyebrow label when appropriate

Example

Clients
+ New Client



CONTENT AREA

Main data table or cards.



RIGHT PANEL (optional)

Details or quick edit view.


--------------------------------------------------
PERMISSIONS WORKSPACE RULE
--------------------------------------------------

The permissions manager under Master Data / Users / Roles must follow a hybrid enterprise workspace pattern:

1 role-first selector at the top
2 left module and submodule tree
3 center permission matrix for coarse-grained actions
4 right detail drawer for advanced actions and field permissions

The permissions UI must feel visual, not technical.

Do not expose raw SQL concepts in the main workspace.
Users should think in:

module
screen
section
field

not in:

table
policy
join

Matrix rule:

- keep the center matrix focused on view, create, edit, delete, actions, and scope
- summarize extra actions visually instead of exploding too many columns
- use the right drawer for advanced action toggles and field-level permissions

Tree rule:

- modules must be grouped visually on the left
- submodules must inherit the same icon and color language as the live sidebar
- inactive or not-configured items should be visually muted, not hidden from admins



--------------------------------------------------
DETAIL PAGE STANDARD
--------------------------------------------------

All entity detail pages must prioritize clean reading before editing.

Default pattern

1 Readable information sections
2 Status control at the top when lifecycle exists
3 Edit actions through popup modal
4 Related records shown as tables first
5 New related records created through popup modal


Information must not be duplicated.

Avoid this pattern

editable form at the top
read-only summary below


Preferred pattern

read-only structured sections
single edit button
popup form for editing


Example sections

Company Information
Location Information
Contact Information


If a module has status as a core follow-up field, the status selector must stay visible in the page header area, outside the popup.

Brand rule:

When a route uses branding, it must reuse the shared Priority brand component or official assets.
Do not invent different logos or palettes per module.


Status is treated as the main operational control, not as a secondary form field.



--------------------------------------------------
DATA DISPLAY RULE
--------------------------------------------------

Use visual hierarchy.

Primary information large and clear.

Secondary information smaller.

Example

Client Name
Email
Phone
Last Activity


When a record has many fields, group them into visual sections with clear titles.

Each section should represent one business meaning only.

Examples

Company Information
Location Information
Commercial Information
Contact Information



--------------------------------------------------
TABLE DESIGN
--------------------------------------------------

Tables should be simple and readable.

Use:

striped rows
hover highlight
sortable columns
search input



Example

Client Name
Email
Status
Created Date



--------------------------------------------------
FORM DESIGN
--------------------------------------------------

Forms must be simple.

Maximum width 600px.

Use grouped fields.

Use section blocks inside forms when the record contains multiple business areas.

Form sections must follow the same information structure shown in the read-only detail page.

Forms should support faster completion by separating:

identity data
location data
contact data
financial data

Example

Client Information

Name
Email
Phone



Actions

Save
Cancel


Forms for editing existing records should default to popup modals unless the user explicitly asks for a full-page workflow.

Quick-add forms embedded directly in the page should be avoided for core ERP entities when the page already contains related tables or detailed summaries.


If the AI does not have enough clarity to decide the correct sections, it must stop and present the available fields to the user in plain text, asking the user to define the final sections before building the page.



--------------------------------------------------
ACTION DESIGN
--------------------------------------------------

Primary action must be visually clear.

Example

+ New Client



Secondary actions should be subtle.

Edit
Delete
Archive



--------------------------------------------------
ICON SYSTEM
--------------------------------------------------

Icons should represent actions visually.

Examples

➕ create  
✏️ edit  
🗑 delete  
📦 shipment  
📊 analytics  
👥 clients



--------------------------------------------------
DASHBOARD DESIGN
--------------------------------------------------

The dashboard should give a quick overview.

Use cards.

Example cards

Total Clients
Open Opportunities
Active Shipments
Monthly Revenue



Cards must be large and visual.



--------------------------------------------------
VISUAL FEEDBACK
--------------------------------------------------

Every action must give feedback.

Examples

Saved successfully
Error occurred
Processing...



--------------------------------------------------
SEARCH SYSTEM
--------------------------------------------------

Search must be global.

Users should search:

clients
opportunities
shipments



Search bar located in top bar.



--------------------------------------------------
COLOR RULES
--------------------------------------------------

Use minimal color palette.

Primary color
neutral background
soft shadows

Avoid excessive colors.



--------------------------------------------------
INTERACTION RULES
--------------------------------------------------

Avoid complex navigation.

Users should reach most actions within 2–3 clicks.



--------------------------------------------------
RESPONSIVE DESIGN
--------------------------------------------------

System must work on:

desktop
tablet
mobile

Sidebar collapses on small screens.


--------------------------------------------------
CURRENT LIVE NAVIGATION
--------------------------------------------------

The current implemented navigation is intentionally smaller than the target ERP scope.

Live sidebar modules today:

- Dashboard
- Clients
- Contacts
- Opportunities

Database-backed but not yet live as frontend modules:

- Quotations
- Shipments
- Invoices

Do not present planned modules as live navigation until their routes and query modules exist.


--------------------------------------------------
IMPLEMENTATION GATE
--------------------------------------------------

Before adding a module to the sidebar:

1. route exists under frontend/app/
2. data layer exists under frontend/src/lib/db/
3. the page builds successfully
4. AI inventory docs are updated

This rule prevents AI and humans from exposing dead routes in the interface.



--------------------------------------------------
UX SAFETY RULE
--------------------------------------------------

Never overwhelm the user with too many options.

Hide advanced settings when possible.



--------------------------------------------------
AI UI GENERATION RULE
--------------------------------------------------

When generating a new module UI, AI must create:

sidebar entry
module page
data table
create form
edit form
dashboard card



--------------------------------------------------
EXAMPLE MODULE UI
--------------------------------------------------

Module

Clients



Sidebar

👥 Clients



Main Page

Clients
+ New Client



Table

Name
Email
Phone
Created At



Form

Name
Email
Phone



--------------------------------------------------
END OF UI BUILDER
--------------------------------------------------
