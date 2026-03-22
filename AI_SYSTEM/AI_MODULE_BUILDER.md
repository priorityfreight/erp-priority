# AI MODULE BUILDER

This document defines the rules for creating new ERP modules.

All modules must follow the architecture defined in:

AI_CONTEXT.md
AI_DATABASE_MAP.md
AI_DEV_RULES.md



--------------------------------------------------
ERP ARCHITECTURE PRINCIPLES
--------------------------------------------------

The ERP follows a modular architecture.

Each module must include:

database tables
database functions
optional triggers
analytics views
frontend module when the module is user-facing

Master data and reference modules may be database-first if they are not yet exposed in the UI.

Modules must integrate with existing ERP entities.



--------------------------------------------------
MODULE STRUCTURE
--------------------------------------------------

When creating a new module, the AI must generate:

1 DATABASE TABLE

Add table to:

ERP_schema.sql


2 BUSINESS FUNCTIONS

Add functions to:

ERP_functions.sql


3 AUTOMATION (OPTIONAL)

Add triggers to:

ERP_triggers.sql


4 ANALYTICS

Add views to:

ERP_views.sql


Reference datasets that are lookup-only may use a lookup view instead of an aggregated analytics view.


5 DOCUMENTATION

Update:

AI_CONTEXT.md
AI_MASTER_DATA.md when applicable
AI_DATABASE_MAP.md



--------------------------------------------------
NAMING CONVENTION
--------------------------------------------------

Tables

plural lowercase

examples

invoices
inventory_items
expenses



Functions

snake_case

examples

create_invoice()
approve_invoice()
mark_invoice_paid()



Views

suffix _view

examples

invoice_summary_view
inventory_status_view



Triggers

suffix _trigger

examples

invoice_payment_trigger
stock_update_trigger



--------------------------------------------------
MODULE DESIGN RULES
--------------------------------------------------

Every module must include:

primary key id

created_at timestamp

status column if lifecycle exists



Example structure

id uuid primary key
created_at timestamp
status text


User-facing modules with detail pages must also include a UI information architecture.

Minimum UI structure

page header
top status control when lifecycle exists
read-only information sections
related records tables
popup edit flows


The AI must decide section titles from business meaning, not from database table order.

Example

do not group by arbitrary column sequence
do group by Company Information, Location Information, Contact Information


Location reference rule

If a module captures cities, origins, destinations, ports, airports, or trade lanes, it must reuse the canonical UN/LOCODE lookup pattern:

- browse/select via unlocode_lookup_view
- typeahead via search_unlocodes()
- store the selected canonical UN/LOCODE reference, not free text as the primary source of truth


Fallback rule

Modules must target the canonical backend path first.

Temporary fallback code is allowed only for rollback safety and must be clearly labeled.
New module behavior must not depend on fallback-only branches.



--------------------------------------------------
RELATIONSHIP RULES
--------------------------------------------------

Modules must connect to core ERP entities when relevant.

Examples

invoices
→ client_id

inventory
→ shipment_id

expenses
→ shipment_id or client_id



Always define foreign keys.



--------------------------------------------------
AUTOMATION RULES
--------------------------------------------------

If module contains a lifecycle:

pending
approved
completed

Triggers may automate transitions.

Example

invoice approved
→ create accounting entry



--------------------------------------------------
ANALYTICS RULES
--------------------------------------------------

Every module should expose at least one analytics view.

Example

inventory_summary_view
expense_summary_view
invoice_status_view



Views must use aggregated data when possible.



--------------------------------------------------
FUNCTION FIRST RULE
--------------------------------------------------

Database mutations should happen through functions.

Avoid direct table modifications.

Example

good

select create_invoice()

bad

insert into invoices

Master data exception:

bulk import routines may load normalized tables directly during controlled ingestion, but app-facing reads should still use the canonical lookup function or view.



--------------------------------------------------
MIGRATION SAFETY
--------------------------------------------------

Before creating a module:

check database dependencies
verify naming consistency
verify relationships



--------------------------------------------------
MODULE CREATION PROCESS
--------------------------------------------------

Step 1

Define module purpose.



Step 2

Design database table.


Step 2.5

Design the page information sections before building forms.

For every user-facing module, define:

main sections
fields inside each section
top-level status control if lifecycle exists
related tables
popup actions


If the section design is not obvious, the AI must present the discovered fields to the user and ask for section confirmation before continuing UI implementation.



Step 3

Create business functions.



Step 4

Add automation triggers if needed.



Step 5

Create analytics views.



Step 6

Update AI documentation.



Step 7

Test module with seed data.


--------------------------------------------------
IMPLEMENTATION GATE
--------------------------------------------------

Before a module is treated as implemented in the frontend, all of the following must exist:

1. canonical database objects
2. frontend route files under frontend/app/
3. query module under frontend/src/lib/db/
4. navigation entry only after the route is working
5. AI inventory docs updated

Do not add sidebar links or imports for modules that are still database-only.


--------------------------------------------------
CURRENT BASELINE
--------------------------------------------------

Current live frontend modules:

- clients
- contacts
- opportunities
- pricing/providers

Current canonical but database-only modules:

- quotations
- shipments
- client invoices
- provider invoices
- commissions

When creating one of these planned modules, update:

- AI_CONTEXT.md
- AI_CURRENT_PROJECT_MAP.md
- AI_QUERY_LIBRARY.md

and only then expose the module in navigation.



--------------------------------------------------
EXAMPLE MODULE
--------------------------------------------------

Module

Invoices



Table

invoices

id
client_id
amount
status
created_at



Functions

create_invoice()
approve_invoice()
mark_invoice_paid()



Trigger

invoice_payment_trigger



View

invoice_summary_view



--------------------------------------------------
AI GENERATION RULE
--------------------------------------------------

When the user asks to create a module, AI must generate:

table definition
functions
optional triggers
views
documentation updates



--------------------------------------------------
MODULE SAFETY RULE
--------------------------------------------------

Modules must not break existing ERP modules.

All changes must follow the backup rules defined in:

AI_DEV_RULES.md



--------------------------------------------------
END OF MODULE BUILDER
--------------------------------------------------
