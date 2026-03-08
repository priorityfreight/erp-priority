# AI UI BUILDER

This document defines the UI rules for building the ERP frontend.

Goal

Create an interface that is extremely intuitive.
A new user should understand how to use the system in minutes.

The interface should feel similar to modern operating systems like macOS.

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



MAIN WORKSPACE

Content area where modules are displayed.



--------------------------------------------------
SIDEBAR DESIGN
--------------------------------------------------

Sidebar must use icons and short labels.

Example modules

🏠 Dashboard  
👥 Clients  
💼 Opportunities  
📦 Shipments  
📊 Analytics  
⚙️ Settings

Users should understand modules just by icons.



--------------------------------------------------
MODULE STRUCTURE
--------------------------------------------------

Every module must follow the same structure.



HEADER

Title
Primary action button

Example

Clients
+ New Client



CONTENT AREA

Main data table or cards.



RIGHT PANEL (optional)

Details or quick edit view.



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

Example

Client Information

Name
Email
Phone



Actions

Save
Cancel



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