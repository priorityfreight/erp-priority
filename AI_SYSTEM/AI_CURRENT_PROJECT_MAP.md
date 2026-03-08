# CURRENT PROJECT MAP
SYSTEM INVENTORY


--------------------------------------------------
PROJECT ROOT STRUCTURE
--------------------------------------------------

List the current root directories and files.

Example

.cursor/
AI_SYSTEM/
supabase/
system_snapshots/
docs/



--------------------------------------------------
AI SYSTEM FILES
--------------------------------------------------

List all AI architecture files.

Example

AI_CONTEXT.md
AI_DATABASE_MAP.md
AI_DEV_RULES.md
AI_MODULE_BUILDER.md
AI_QUERY_GUIDE.md
AI_UI_BUILDER.md
AI_DESIGN_SYSTEM.md
AI_COMPONENT_LIBRARY.md
AI_AUTOMATION_RULES.md



For each file explain:

purpose
responsibility
dependencies



Example

AI_CONTEXT.md

Purpose:
Defines overall system architecture.

Used by:
All AI agents before generating code.



--------------------------------------------------
DATABASE LAYER
--------------------------------------------------

Location

supabase/schema/



List all database files.

ERP_schema.sql
ERP_functions.sql
ERP_triggers.sql
ERP_views.sql
ERP_policies.sql



For each file describe:

purpose
tables
dependencies



Example

ERP_schema.sql

Purpose:
Defines database tables for ERP system.

Contains tables for:

prospects
clients
opportunities
quotations
shipments
finance



--------------------------------------------------
APPLICATION LAYER
--------------------------------------------------

Identify current application code structure.

Example

frontend
components
modules



List modules that exist in the project.

crm
sales
operations
finance



If modules are missing, report it.



--------------------------------------------------
ERP WORKFLOW MAP
--------------------------------------------------

Define the business flow implemented in the system.

Prospects
→ Clients
→ Opportunities
→ Quotations
→ Shipments
→ Finance



List which database tables support each stage.



Example

Clients

Table:
clients

Related tables:
opportunities
activities



--------------------------------------------------
AUTOMATION LAYER
--------------------------------------------------

Identify automation logic.

Sources:

database triggers
functions
scheduled tasks



Example

Quotation Approved
→ Trigger
→ create shipment



--------------------------------------------------
DEPENDENCY MAP
--------------------------------------------------

Describe relationships between files.

Example

AI_CONTEXT.md
→ referenced by all AI rules



ERP_functions.sql
→ depends on ERP_schema.sql



ERP_triggers.sql
→ depends on ERP_functions.sql



ERP_views.sql
→ depends on ERP_schema.sql



--------------------------------------------------
SYSTEM RISKS
--------------------------------------------------

The AI must identify potential structural problems.

Examples

missing folders
mixed responsibilities
duplicate files
unclear naming



--------------------------------------------------
RESTRUCTURE RECOMMENDATIONS
--------------------------------------------------

Suggest improvements but DO NOT apply them yet.



Example

move AI files to AI_SYSTEM/
create apps/web folder
separate core modules



--------------------------------------------------
END OF MAP
--------------------------------------------------