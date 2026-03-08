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
frontend module

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


5 DOCUMENTATION

Update:

AI_CONTEXT.md
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