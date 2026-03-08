# SYSTEM SAFETY RULES
MANDATORY BACKUP PROTOCOL


--------------------------------------------------
CRITICAL RULE
--------------------------------------------------

Before modifying ANY part of the system, a backup of the last working
version must be created.

This rule is mandatory.



--------------------------------------------------
FILES THAT REQUIRE BACKUP
--------------------------------------------------

Before modifying these files, create a snapshot copy.

ERP_schema.sql
ERP_functions.sql
ERP_triggers.sql
ERP_views.sql
ERP_policies.sql

Any core system file.



--------------------------------------------------
BACKUP LOCATION
--------------------------------------------------

Backups must be stored in:

/system_snapshots/



Example

/system_snapshots/v1/
/system_snapshots/v2/
/system_snapshots/v3/



Each snapshot must contain:

ERP_schema.sql
ERP_functions.sql
ERP_triggers.sql
ERP_views.sql
ERP_policies.sql



--------------------------------------------------
BACKUP PROCESS
--------------------------------------------------

Before making a modification:

1 Verify the system is working
2 Create snapshot folder
3 Copy current SQL files
4 Only then apply modification



Example snapshot structure

/system_snapshots/v3/

ERP_schema.sql
ERP_functions.sql
ERP_triggers.sql
ERP_views.sql
ERP_policies.sql



--------------------------------------------------
ROLLBACK RULE
--------------------------------------------------

If the user reports:

system errors
database failures
broken queries

The AI must immediately:

1 Stop modifications
2 Restore the latest snapshot
3 Confirm the system works again



--------------------------------------------------
MODIFICATION PROTOCOL
--------------------------------------------------

Every structural change must follow this order:

Step 1
Create snapshot

Step 2
Modify code

Step 3
Test system

Step 4
Confirm functionality



If step 3 fails → rollback.



--------------------------------------------------
AI COMPLIANCE RULE
--------------------------------------------------

The AI assistant must NEVER modify system files
without first creating a snapshot.



--------------------------------------------------
PRIORITY RULE
--------------------------------------------------

System stability is more important than speed.



--------------------------------------------------
END OF RULES
--------------------------------------------------