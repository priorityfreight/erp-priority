# AI DATABASE RELATION GRAPH

This document defines the relational structure of the ERP database.

Its purpose is to help developers and AI agents understand:

- how tables are connected
- the ERP business workflow
- table dependencies
- foreign key relationships
- module ownership of data

This file must be updated whenever new tables are introduced into the ERP system.



--------------------------------------------------
ERP BUSINESS MODEL
--------------------------------------------------

The ERP follows a logistics and sales pipeline lifecycle:

Prospects
→ Clients
→ Opportunities
→ Quotations
→ Shipments
→ Invoices
→ Payments

This represents the full revenue lifecycle of the organization.



--------------------------------------------------
MAIN DATABASE ENTITY RELATIONSHIP DIAGRAM
--------------------------------------------------

```mermaid
erDiagram

PROSPECTS {
    uuid id
    text name
    text email
    text phone
    text company
    text source
    timestamp created_at
}

CLIENTS {
    uuid id
    uuid prospect_id
    text name
    text email
    text phone
    text company
    text status
    timestamp created_at
}

OPPORTUNITIES {
    uuid id
    uuid client_id
    text title
    numeric estimated_value
    text status
    timestamp created_at
}

QUOTATIONS {
    uuid id
    uuid opportunity_id
    numeric total_amount
    text currency
    text status
    timestamp created_at
}

SHIPMENTS {
    uuid id
    uuid quotation_id
    text origin
    text destination
    text shipment_status
    timestamp created_at
}

INVOICES {
    uuid id
    uuid shipment_id
    numeric total_amount
    text currency
    text payment_status
    timestamp created_at
}

PAYMENTS {
    uuid id
    uuid invoice_id
    numeric amount
    text payment_method
    timestamp payment_date
}



PROSPECTS ||--o{ CLIENTS : converted_to
CLIENTS ||--o{ OPPORTUNITIES : owns
OPPORTUNITIES ||--o{ QUOTATIONS : generates
QUOTATIONS ||--o{ SHIPMENTS : creates
SHIPMENTS ||--o{ INVOICES : billed_by
INVOICES ||--o{ PAYMENTS : paid_with

⸻

ERP PIPELINE FLOW

The ERP follows this operational pipeline:

Prospects
↓
Clients
↓
Opportunities
↓
Quotations
↓
Shipments
↓
Invoices
↓
Payments

Each stage represents a transition in the business lifecycle.

⸻

TABLE RELATIONSHIP DEFINITIONS

Prospects → Clients

A prospect represents a potential customer.
Once qualified, the prospect is converted into a client.

One prospect may convert into one client.

Clients → Opportunities

Clients may create multiple sales opportunities.

Each opportunity represents a potential business deal.

Opportunities → Quotations

Opportunities generate quotations for pricing and negotiation.

An opportunity may produce multiple quotations.

Quotations → Shipments

When a quotation is approved, it becomes an operational shipment.

Each shipment is tied to an approved quotation.

Shipments → Invoices

Shipments generate invoices once services are delivered.

Invoices → Payments

Invoices may receive one or more payments until fully settled.

⸻

FOREIGN KEY RELATIONSHIPS

clients.prospect_id
references prospects.id

opportunities.client_id
references clients.id

quotations.opportunity_id
references opportunities.id

shipments.quotation_id
references quotations.id

invoices.shipment_id
references shipments.id

payments.invoice_id
references invoices.id

⸻

DATABASE CREATION ORDER

To avoid dependency errors, database tables must be created in the following order:

1 prospects
2 clients
3 opportunities
4 quotations
5 shipments
6 invoices
7 payments

This order ensures foreign keys reference existing tables.

⸻

ERP MODULE OWNERSHIP

CRM MODULE

prospects
clients

SALES MODULE

opportunities
quotations

OPERATIONS MODULE

shipments

FINANCE MODULE

invoices
payments

⸻

AUTOMATION DEPENDENCIES

Several ERP automations rely on these relationships.

Example automations:

Quotation Approved
→ create shipment

Shipment Delivered
→ generate invoice

Invoice Paid
→ update financial metrics

These automations are implemented using database triggers and functions.

⸻

DATA INTEGRITY RULES

All tables must enforce relational integrity.

Rules:

Clients must reference a valid prospect.

Opportunities must reference a valid client.

Quotations must reference a valid opportunity.

Shipments must reference a valid quotation.

Invoices must reference a valid shipment.

Payments must reference a valid invoice.

⸻

DATABASE NORMALIZATION GUIDELINES

The ERP follows these normalization principles:

Primary keys must use UUID.

All foreign keys must be explicitly defined.

Avoid redundant data duplication across tables.

Business logic must be implemented in database functions when possible.

⸻

AI DATABASE DEVELOPMENT RULES

When adding new tables or relationships, the AI must:

1 maintain relational integrity
2 define proper foreign keys
3 update ERP_schema.sql
4 update AI_DATABASE_MAP.md
5 update AI_DATABASE_RELATION_GRAPH.md

⸻

VERSIONING

Whenever the database model changes:

update this document
update schema files
create a system snapshot
