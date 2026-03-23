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

Dashboard
Clients
Opportunities
Shipments
Analytics
Settings

Must support:

- shared brand lockup
- grouped module sections
- burgundy active item treatment
- dark navy base



Topbar

Contains

Search
Notifications
User profile
Quick actions

Must support:

- compact brand lockup on constrained layouts
- corporate eyebrow + page title
- user identity cluster



Breadcrumb

Displays navigation hierarchy.



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
