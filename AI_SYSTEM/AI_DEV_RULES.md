# AI DEVELOPMENT RULES
ERP SAFETY PROTOCOL


--------------------------------------------------
RULE 1 — NEVER MODIFY A WORKING SYSTEM WITHOUT BACKUP
--------------------------------------------------

Before modifying any part of the system, a snapshot of the last working version must be preserved.

This applies to:

database schema
functions
triggers
views
API routes
business logic


--------------------------------------------------
RULE 2 — CREATE A WORKING VERSION SNAPSHOT
--------------------------------------------------

When the system reaches a stable state, mark it as:

LAST_WORKING_VERSION


Store copies of:

ERP_schema.sql
ERP_policies.sql
ERP_triggers.sql
ERP_functions.sql
ERP_views.sql

and application code.


Recommended folder:

/system_snapshots/


Example:

/system_snapshots/v1_working/
/system_snapshots/v2_working/


--------------------------------------------------
RULE 3 — BEFORE ANY STRUCTURAL CHANGE
--------------------------------------------------

Before modifying:

database tables
functions
triggers
views
core logic


The AI or developer must:

1 create a new snapshot
2 verify the current system works
3 only then apply modifications



--------------------------------------------------
RULE 4 — FAILURE RECOVERY
--------------------------------------------------

If the user reports:

system errors
broken queries
unexpected behavior
data inconsistencies


The AI must immediately:

1 stop modifications
2 revert to LAST_WORKING_VERSION
3 restore database schema and logic
4 confirm system stability before continuing



--------------------------------------------------
RULE 5 — SAFE ITERATION PROCESS
--------------------------------------------------

The development cycle must follow this order:

STEP 1
System working

STEP 2
Create snapshot

STEP 3
Apply change

STEP 4
Test system

STEP 5
If successful → mark as new working version

STEP 6
If failure → rollback



--------------------------------------------------
RULE 6 — NEVER DELETE CORE STRUCTURE WITHOUT REPLACEMENT
--------------------------------------------------

AI must never remove:

tables
functions
views
triggers

unless a replacement exists and migration is safe.



--------------------------------------------------
RULE 7 — DATABASE MIGRATION SAFETY
--------------------------------------------------

Before modifying database structure:

check dependencies

tables
views
functions
triggers

Ensure nothing breaks.


--------------------------------------------------
RULE 8 — AI RESPONSE RULE
--------------------------------------------------

When the user reports system problems:

AI must prioritize:

system stability
rollback safety
data integrity

over adding new features.



--------------------------------------------------
RULE 9 — BACKUP PRIORITY
--------------------------------------------------

System safety > speed of development.


--------------------------------------------------
RULE 10 — UI PATTERN CONSISTENCY
--------------------------------------------------

When building or modifying user-facing ERP modules, the AI must preserve the standard interaction pattern:

1 information displayed in structured sections
2 editing through popup modal
3 related entities shown in tables first
4 adding related entities through popup modal
5 top status control outside popup when lifecycle exists


The AI must avoid duplicated views where the same record is shown as an editable form and as a read-only summary on the same page.


--------------------------------------------------
RULE 11 — SECTION DEFINITION ESCALATION
--------------------------------------------------

If the AI cannot confidently determine how to section a page, it must not invent a random layout.

Instead it must:

1 inspect the available fields
2 present those fields to the user in plain text
3 request the target sections and field grouping
4 only then implement the UI


This rule applies especially to:

CRM detail pages
operational records
master data forms
modules with mixed commercial and logistics information


--------------------------------------------------
RULE 12 — BACKEND SYNC DISCIPLINE
--------------------------------------------------

When modifying backend-facing logic, the AI must also follow:

AI_BACKEND_SYNC_RULES.md

The AI must keep canonical SQL, generated types, frontend query modules, and AI docs synchronized in the same change whenever the backend contract moves.


--------------------------------------------------
RULE 13 — CORPORATE BRAND CONSISTENCY
--------------------------------------------------

When modifying user-facing ERP screens, the AI must preserve the active corporate brand system.

Current corporate palette:

- Navy #0B1F3B
- Burgundy #800020
- Burgundy light #B33A5B
- Gray #909EAE
- Light gray #E5E5E5
- Soft gray #CFCFCF

Current brand assets:

- shared Priority mark
- shared Priority lockup / wordmark

The AI must not introduce unrelated palettes, random gradients, or inconsistent logo treatments once the corporate brand has been established.


--------------------------------------------------
END OF RULES
--------------------------------------------------
