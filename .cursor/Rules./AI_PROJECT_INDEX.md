# AI PROJECT INDEX

This file defines the main AI context for the ERP project.

All AI agents must read this file first before generating code.



--------------------------------------------------
PRIMARY CONTEXT FILE
--------------------------------------------------

Always read first:

AI_CONTEXT.md

This file defines:

system architecture
database model
business workflows
development conventions



--------------------------------------------------
ERP WORKFLOW
--------------------------------------------------

The system represents a logistics ERP with this lifecycle:

Prospects
→ Clients
→ Opportunities
→ Quotations
→ Shipments
→ Finance



--------------------------------------------------
SECONDARY AI CONTEXT FILES
--------------------------------------------------

After reading AI_CONTEXT.md, the AI must load the following files.

These define the full system architecture.



DATABASE STRUCTURE

AI_DATABASE_MAP.md



DEVELOPMENT RULES

AI_DEV_RULES.md



MODULE GENERATION

AI_MODULE_BUILDER.md



DATABASE QUERY RULES

AI_QUERY_GUIDE.md



UI STRUCTURE

AI_UI_BUILDER.md



DESIGN SYSTEM

AI_DESIGN_SYSTEM.md



COMPONENT LIBRARY

AI_COMPONENT_LIBRARY.md



AUTOMATION ENGINE

AI_AUTOMATION_RULES.md



--------------------------------------------------
SYSTEM SAFETY RULE
--------------------------------------------------

Before modifying the database or system architecture:

create a system snapshot.



Snapshots stored in:

/system_snapshots/



Never modify:

ERP_schema.sql
ERP_functions.sql
ERP_triggers.sql
ERP_views.sql
ERP_policies.sql

without first creating a snapshot.



--------------------------------------------------
DEVELOPMENT PRIORITIES
--------------------------------------------------

Priority order:

1 System stability
2 Database integrity
3 UI consistency
4 Performance
5 Feature expansion



--------------------------------------------------
AI GENERATION RULE
--------------------------------------------------

When generating new functionality:

1 read AI_CONTEXT.md
2 read AI_DATABASE_MAP.md
3 verify architecture consistency
4 generate code following project conventions



--------------------------------------------------
END OF INDEX
--------------------------------------------------