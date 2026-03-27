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
- Next.js runtime copies: frontend/public/assets/
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
