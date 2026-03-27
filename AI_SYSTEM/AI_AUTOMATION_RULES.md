# AI AUTOMATION RULES

This document defines the automation engine rules for the ERP system.

The goal is to reduce manual work by automating repetitive tasks
and business workflows.



--------------------------------------------------
AUTOMATION PRINCIPLE
--------------------------------------------------

Automations follow a simple pattern:

EVENT
→ CONDITION
→ ACTION



Example

Quotation charge lines changed
→ recalculate totals
→ keep header cost / sale / profit aligned



--------------------------------------------------
AUTOMATION SOURCES
--------------------------------------------------

Automations can be triggered by:

database events
status changes
scheduled tasks
manual triggers
API events



--------------------------------------------------
DATABASE EVENT AUTOMATIONS
--------------------------------------------------

Triggered by changes in database records.

Examples

new client created
opportunity updated
quotation cost line changed
shipment delivered



Implementation

PostgreSQL triggers.



--------------------------------------------------
STATUS AUTOMATIONS
--------------------------------------------------

Triggered when status fields change.

Example

status investigando → cotizando



Example automation

quotation cost line changed
→ recalculate quotation totals

quotation accepted
→ expose create booking action
→ wait for manual booking creation
→ do not auto-create shipment by trigger
→ refresh commercial summary



--------------------------------------------------
TIME AUTOMATIONS
--------------------------------------------------

Triggered on schedules.

Examples

daily
weekly
monthly



Examples

daily sales report
weekly shipment summary
monthly revenue report



Implementation

scheduled jobs or cron tasks.

Current live example:

- BANXICO exchange-rate sync runs daily at 6:00 a.m. and loads the latest applicable previous-day USD and EUR rates against MXN



--------------------------------------------------
NOTIFICATION AUTOMATIONS
--------------------------------------------------

Triggered when important events occur.

Examples

new opportunity assigned
shipment delayed
invoice overdue



Possible channels

in-app notification
email
webhook



--------------------------------------------------
TASK AUTOMATIONS
--------------------------------------------------

Create tasks automatically.

Example

new shipment created
→ create operations task



Example

opportunity inactive for 7 days
→ create follow-up reminder



--------------------------------------------------
WORKFLOW AUTOMATIONS
--------------------------------------------------

Automations can chain actions.

Example

quotation accepted

→ expose create booking action
→ notify operations when booking is created
→ update dashboard



--------------------------------------------------
ERP CORE AUTOMATIONS
--------------------------------------------------

The ERP must include these default automations.



CLIENT AUTOMATIONS

new client created
→ create welcome activity



SALES AUTOMATIONS

opportunity created
→ assign sales owner
→ calculate start date
→ calculate expiration date

expired opportunity by date rule
→ surface status as vencida

expired opportunity reactivated
→ reset start date
→ recalculate expiration date



QUOTATION AUTOMATIONS

quotation cost line changed
→ recalculate quotation totals

quotation purchase option saved
→ persist all option concepts in one transaction
→ refresh FX-normalized quotation totals once

accepted quotation
→ lock accounting FX on the quotation


--------------------------------------------------
NEXT AUTOMATION CANDIDATES
--------------------------------------------------

Recommended before the next major module:

- release smoke-test checklist automation for login, CRM, quotations, pricing, and booking
- asset-sync automation from ASSETS/ into frontend/public/assets/ when branding changes
- AI_SYSTEM sync checklist automation after quotation-process changes



OPERATIONS AUTOMATIONS

shipment delivered
→ update revenue metrics



--------------------------------------------------
DATA SAFETY RULE
--------------------------------------------------

Automations must not corrupt data.

All actions must use database functions.



Example

select recalculate_quotation_totals()



Never use raw table inserts.



--------------------------------------------------
LOGGING RULE
--------------------------------------------------

All automations must be logged.

Create table

automation_logs



Fields

id
event
action
timestamp
status



--------------------------------------------------
FAILURE HANDLING
--------------------------------------------------

If an automation fails:

log the error
do not break the transaction
allow retry



--------------------------------------------------
AI AUTOMATION GENERATION RULE
--------------------------------------------------

When creating a new module, AI must check if automation rules are needed.

If yes, AI must generate:

trigger
function
logging entry



--------------------------------------------------
AUTOMATION NAMING
--------------------------------------------------

Triggers

module_event_trigger



Functions

handle_module_event()



Example

handle_quotation_totals_sync()



--------------------------------------------------
AUTOMATION SAFETY
--------------------------------------------------

Avoid infinite loops.

Triggers must not recursively trigger themselves.



--------------------------------------------------
FUTURE AUTOMATION UI
--------------------------------------------------

In the future, automations may be configured via UI.

Structure

Event
Condition
Action



Example UI

WHEN

Quotation Approved



IF

Amount > 1000



THEN

Create Shipment



--------------------------------------------------
END OF AUTOMATION RULES
--------------------------------------------------
