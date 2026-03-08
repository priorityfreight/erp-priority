# AI DESIGN SYSTEM

This document defines the visual design system for the ERP interface.

The goal is to create a clean, modern, and intuitive interface that feels
similar to modern operating systems like macOS.

The interface must prioritize clarity, simplicity, and usability.



--------------------------------------------------
DESIGN PHILOSOPHY
--------------------------------------------------

Minimal
Clean
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

Inter

Fallback

system-ui
sans-serif



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

Use a minimal color palette.



Primary

#2563EB



Background

#F9FAFB



Card Background

#FFFFFF



Text Primary

#111827



Text Secondary

#6B7280



Border

#E5E7EB



Success

#16A34A



Warning

#F59E0B



Error

#DC2626



Avoid excessive colors.



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

8px

Cards

12px

Buttons

8px

Modals

16px



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

Filled with primary color.

Example

+ New Client



Secondary Button

Outline style.



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