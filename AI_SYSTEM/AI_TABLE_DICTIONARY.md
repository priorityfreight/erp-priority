# AI TABLE DICTIONARY

This document defines every database table and column used in the ERP system.

The goal is to provide a single source of truth for:

- table structure
- column definitions
- data types
- business meaning

All AI agents must reference this document before generating SQL queries or modifying database structures.



--------------------------------------------------
DATABASE OVERVIEW
--------------------------------------------------

The ERP database follows this lifecycle:

Prospects → Clients → Opportunities → Quotations → Shipments → Invoices → Payments



--------------------------------------------------
TABLE: prospects
--------------------------------------------------

Purpose

Stores potential customers before they become official clients.


Columns

id  
Type: uuid  
Primary key identifier for the prospect.


name  
Type: text  
Full name of the contact person.


email  
Type: text  
Primary contact email.


phone  
Type: text  
Contact phone number.


company  
Type: text  
Company name associated with the prospect.


source  
Type: text  
Lead source (website, referral, campaign, etc).


status  
Type: text  
Current prospect status.

Possible values

new  
contacted  
qualified  
unqualified  


created_at  
Type: timestamp  
Date the prospect was created.


updated_at  
Type: timestamp  
Date of the last update.



--------------------------------------------------
TABLE: clients
--------------------------------------------------

Purpose

Represents confirmed customers that were converted from prospects.


Columns

id  
Type: uuid  
Primary key.


prospect_id  
Type: uuid  
Foreign key referencing prospects.id.


name  
Type: text  
Client name.


email  
Type: text  
Primary contact email.


phone  
Type: text  
Primary contact phone.


company  
Type: text  
Client company name.


status  
Type: text  
Client status.

Possible values

active  
inactive  


created_at  
Type: timestamp  
Date client record was created.


updated_at  
Type: timestamp  
Last update timestamp.



--------------------------------------------------
TABLE: opportunities
--------------------------------------------------

Purpose

Represents potential deals with a client.


Columns

id  
Type: uuid  
Primary key.


client_id  
Type: uuid  
Foreign key referencing clients.id.


title  
Type: text  
Short description of the opportunity.


description  
Type: text  
Detailed opportunity description.


estimated_value  
Type: numeric  
Estimated deal value.


status  
Type: text  
Opportunity status.

Possible values

open  
won  
lost  


created_at  
Type: timestamp  
Opportunity creation date.


updated_at  
Type: timestamp  
Last update date.



--------------------------------------------------
TABLE: quotations
--------------------------------------------------

Purpose

Represents price proposals generated from opportunities.


Columns

id  
Type: uuid  
Primary key.


opportunity_id  
Type: uuid  
Foreign key referencing opportunities.id.


total_amount  
Type: numeric  
Total quoted value.


currency  
Type: text  
Currency used in quotation.


status  
Type: text  
Quotation status.

Possible values

draft  
sent  
approved  
rejected  


created_at  
Type: timestamp  
Date quotation was created.


updated_at  
Type: timestamp  
Last modification timestamp.



--------------------------------------------------
TABLE: shipments
--------------------------------------------------

Purpose

Represents operational logistics shipments generated from approved quotations.


Columns

id  
Type: uuid  
Primary key.


quotation_id  
Type: uuid  
Foreign key referencing quotations.id.


origin  
Type: text  
Shipment origin location.


destination  
Type: text  
Shipment destination.


shipment_status  
Type: text  
Current shipment state.

Possible values

pending  
in_transit  
delivered  
cancelled  


departure_date  
Type: timestamp  
Shipment departure date.


arrival_date  
Type: timestamp  
Shipment arrival date.


created_at  
Type: timestamp  
Record creation timestamp.



--------------------------------------------------
TABLE: invoices
--------------------------------------------------

Purpose

Represents billing records generated after shipment completion.


Columns

id  
Type: uuid  
Primary key.


shipment_id  
Type: uuid  
Foreign key referencing shipments.id.


total_amount  
Type: numeric  
Total invoice amount.


currency  
Type: text  
Currency used.


payment_status  
Type: text  
Invoice payment status.

Possible values

pending  
partial  
paid  
overdue  


issue_date  
Type: timestamp  
Invoice creation date.


due_date  
Type: timestamp  
Payment due date.


created_at  
Type: timestamp  
Record creation timestamp.



--------------------------------------------------
TABLE: payments
--------------------------------------------------

Purpose

Stores payments made toward invoices.


Columns

id  
Type: uuid  
Primary key.


invoice_id  
Type: uuid  
Foreign key referencing invoices.id.


amount  
Type: numeric  
Payment amount.


payment_method  
Type: text  
Payment method used.

Examples

bank_transfer  
credit_card  
cash  


payment_date  
Type: timestamp  
Date payment was received.


reference_number  
Type: text  
Transaction or bank reference.


created_at  
Type: timestamp  
Record creation timestamp.



--------------------------------------------------
RELATIONSHIP SUMMARY
--------------------------------------------------

prospects  
→ clients  


clients  
→ opportunities  


opportunities  
→ quotations  


quotations  
→ shipments  


shipments  
→ invoices  


invoices  
→ payments  



--------------------------------------------------
AI DEVELOPMENT RULES
--------------------------------------------------

When the AI generates database queries:

Only use columns defined in this document.

Do not invent column names.

Do not modify column types without updating:

ERP_schema.sql  
AI_DATABASE_MAP.md  
AI_DATABASE_RELATION_GRAPH.md  
AI_TABLE_DICTIONARY.md  



--------------------------------------------------
DATA CONSISTENCY RULES
--------------------------------------------------

Primary keys must always use UUID.

Foreign keys must enforce referential integrity.

Every table must contain a created_at timestamp.

Every mutable table should include updated_at when applicable.



--------------------------------------------------
END OF DOCUMENT
--------------------------------------------------