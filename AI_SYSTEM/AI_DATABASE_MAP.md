# ERP DATABASE MAP

This document describes the structure and relationships of the ERP database.

Database Engine:
PostgreSQL

Backend Platform:
Supabase



--------------------------------------------------
CORE TABLES
--------------------------------------------------

clients
Primary entity representing companies or customers.

Columns

id (uuid, primary key)
name (text)
email (text)
created_at (timestamp)
is_deleted (boolean)

Relationships

clients.id → contacts.client_id
clients.id → opportunities.client_id
clients.id → quotations.client_id
clients.id → shipments.client_id



--------------------------------------------------

contacts
People associated with a client.

Columns

id (uuid, primary key)
client_id (uuid)
name (text)
email (text)
phone (text)

Relationships

contacts.client_id → clients.id



--------------------------------------------------

opportunities
Sales opportunities associated with a client.

Columns

id (uuid, primary key)
client_id (uuid)
title (text)
value (numeric)
status (text)
created_at (timestamp)

Relationships

opportunities.client_id → clients.id
opportunities.id → quotations.opportunity_id



--------------------------------------------------

quotations
Commercial proposals generated from opportunities.

Columns

id (uuid, primary key)
client_id (uuid)
opportunity_id (uuid)
status (text)
created_at (timestamp)

Relationships

quotations.client_id → clients.id
quotations.opportunity_id → opportunities.id



--------------------------------------------------

shipments
Operational logistics records.

Columns

id (uuid, primary key)
client_id (uuid)
origin (text)
destination (text)
status (text)
created_at (timestamp)

Relationships

shipments.client_id → clients.id



--------------------------------------------------
BUSINESS FLOW RELATIONSHIPS
--------------------------------------------------

Client Lifecycle

client
 → contacts
 → opportunities
 → quotations
 → shipments



Sales Flow

client
 → opportunity
 → quotation
 → approved quotation
 → shipment



Operational Flow

shipment

pending
in_transit
delivered



--------------------------------------------------
AUTOMATION LAYER
--------------------------------------------------

Triggers

quotation_approval_trigger

Event

quotation status changes to "approved"

Action

create shipment automatically



--------------------------------------------------
DATABASE FUNCTIONS
--------------------------------------------------

create_client_with_contacts()

Creates client and contacts in one transaction.



create_opportunity()

Creates a new opportunity.



convert_opportunity_to_quotation()

Creates quotation from opportunity.



approve_quotation()

Approves quotation and triggers shipment creation.



create_shipment()

Creates shipment manually.



mark_shipment_delivered()

Updates shipment status.



get_client_full()

Returns aggregated client information.



--------------------------------------------------
DEPENDENCY MAP
--------------------------------------------------

Level 1

clients



Level 2

contacts
opportunities
shipments



Level 3

quotations



Dependency Chain

clients
 → opportunities
 → quotations
 → shipments



--------------------------------------------------
ANALYTICS LAYER
--------------------------------------------------

Views

client_overview_view
sales_pipeline_view
open_opportunities_view
quotation_summary_view
active_shipments_view
delivered_shipments_view
client_revenue_view
monthly_sales_view
shipment_activity_view
client_contacts_view



Views depend on

clients
contacts
opportunities
quotations
shipments



--------------------------------------------------
MODIFICATION SAFETY RULE
--------------------------------------------------

Before modifying any table:

check dependent tables
check views
check functions
check triggers

If dependencies exist, migration must preserve compatibility.



--------------------------------------------------
AI QUERY RULE
--------------------------------------------------

For analytics queries:

prefer views

For transactional operations:

prefer database functions

Avoid raw table modifications when a function exists.



--------------------------------------------------
END OF DATABASE MAP
--------------------------------------------------