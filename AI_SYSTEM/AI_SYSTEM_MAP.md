# AI SYSTEM MAP

This document defines the structure of the AI system used to assist development
in the ERP project.

Its purpose is to provide a clear map of:

- AI documentation files
- their responsibilities
- how AI agents should read them
- how they interact with the ERP architecture

All AI agents must reference this document before generating code or modifying
the system.



--------------------------------------------------
AI SYSTEM PURPOSE
--------------------------------------------------

The AI system exists to ensure that:

- code generation follows project architecture
- database changes remain consistent
- UI and backend stay aligned
- automation rules are respected

The AI system acts as the **governance layer** for the ERP.



--------------------------------------------------
AI DOCUMENT HIERARCHY
--------------------------------------------------

AI agents must read the documents in the following order:

1 AI_CONTEXT.md  
2 AI_SYSTEM_MAP.md  
3 AI_DATABASE_MAP.md  
4 AI_DATABASE_RELATION_GRAPH.md  
5 AI_TABLE_DICTIONARY.md  
6 AI_QUERY_GUIDE.md  
7 AI_DEV_RULES.md  
8 AI_MODULE_BUILDER.md  
9 AI_UI_BUILDER.md  
10 AI_DESIGN_SYSTEM.md  
11 AI_COMPONENT_LIBRARY.md  
12 AI_AUTOMATION_RULES.md



--------------------------------------------------
AI CORE CONTEXT
--------------------------------------------------

File

AI_CONTEXT.md

Purpose

Defines the overall architecture and philosophy of the ERP system.

Contents include

system architecture  
development conventions  
business workflow  
technology stack



--------------------------------------------------
AI DATABASE DOCUMENTS
--------------------------------------------------

These documents define the database layer.

AI_DATABASE_MAP.md

Purpose

Explains the database architecture and schema organization.



AI_DATABASE_RELATION_GRAPH.md

Purpose

Defines how tables are related and the ERP business pipeline.



AI_TABLE_DICTIONARY.md

Purpose

Defines all database tables and their columns.

Acts as the single source of truth for database structure.



AI_QUERY_GUIDE.md

Purpose

Defines how queries must be written and optimized.

Ensures consistent data access patterns.



--------------------------------------------------
AI DEVELOPMENT RULES
--------------------------------------------------

AI_DEV_RULES.md

Purpose

Defines development rules the AI must follow.

Examples

file naming conventions  
architecture consistency  
code safety rules



--------------------------------------------------
AI MODULE GENERATION
--------------------------------------------------

AI_MODULE_BUILDER.md

Purpose

Defines how new ERP modules should be created.

Modules must follow standard ERP structure:

database layer  
automation layer  
API layer  
UI layer



--------------------------------------------------
AI USER INTERFACE DOCUMENTS
--------------------------------------------------

AI_UI_BUILDER.md

Purpose

Defines how the ERP frontend interface should be structured.



AI_DESIGN_SYSTEM.md

Purpose

Defines visual standards for the ERP interface.

Includes layout, typography, spacing, and UI principles.



AI_COMPONENT_LIBRARY.md

Purpose

Defines reusable UI components used throughout the ERP.



--------------------------------------------------
AI AUTOMATION SYSTEM
--------------------------------------------------

AI_AUTOMATION_RULES.md

Purpose

Defines how automation logic works in the ERP.

Automations may be triggered by:

database triggers  
status changes  
scheduled processes



--------------------------------------------------
ERP SYSTEM STRUCTURE
--------------------------------------------------

The ERP architecture contains the following layers.

User Interface Layer

apps/web/



Core Application Layer

core/modules/



Database Layer

supabase/schema/



AI Governance Layer

AI_SYSTEM/



--------------------------------------------------
AI WORKFLOW FOR CODE GENERATION
--------------------------------------------------

Whenever the AI generates new code, it must follow this process.

Step 1

Read AI_CONTEXT.md.



Step 2

Review database definitions:

AI_DATABASE_MAP.md  
AI_DATABASE_RELATION_GRAPH.md  
AI_TABLE_DICTIONARY.md



Step 3

Apply query rules from:

AI_QUERY_GUIDE.md



Step 4

Follow development conventions from:

AI_DEV_RULES.md



Step 5

If generating modules, follow:

AI_MODULE_BUILDER.md



Step 6

If generating UI components, follow:

AI_UI_BUILDER.md  
AI_DESIGN_SYSTEM.md  
AI_COMPONENT_LIBRARY.md



Step 7

If implementing automation, follow:

AI_AUTOMATION_RULES.md



--------------------------------------------------
AI SAFETY PRINCIPLES
--------------------------------------------------

The AI must never:

modify database structure without updating documentation  
create new columns not defined in AI_TABLE_DICTIONARY.md  
bypass database functions for write operations  
generate frontend queries that violate AI_QUERY_GUIDE.md



--------------------------------------------------
AI SYSTEM MAINTENANCE
--------------------------------------------------

Whenever new documents are added to the AI system:

update this map.

Whenever database schema changes:

update database documentation.

Whenever modules are introduced:

update module documentation.



--------------------------------------------------
END OF DOCUMENT
--------------------------------------------------