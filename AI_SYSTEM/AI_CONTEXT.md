IMPORTANT:
This file contains the authoritative architecture and domain model for the Priority Logistics ERP.

AI tools (Cursor, Copilots, LLMs) must always read this file before generating code.


# Priority Logistics ERP – AI Context

This document defines the architecture, domain model, and development rules for the Priority Logistics ERP system.

The goal is to ensure that AI tools (Cursor, copilots, etc.) always generate code aligned with the system design.

---

# 1. System Overview

Priority Logistics ERP is a Freight Forwarding CRM + ERP platform designed to manage the entire logistics sales and operations lifecycle.

The system manages:

Prospects → Clients → Opportunities → Quotations → Shipments → Finance

The ERP combines CRM, quoting, operations, and finance modules.

Primary goals:

• Centralize logistics operations  
• Manage freight quotations and shipments  
• Track profitability per shipment  
• Automate sales and operations workflow  
• Provide BI reporting for logistics businesses  

---

# 2. Core Business Flow

The system follows a logistics sales pipeline.

Prospect
↓
Client
↓
Opportunity
↓
Quotation
↓
Shipment
↓
Invoice
↓
Profit Analysis

This flow must remain consistent across all modules.

---

# 3. System Modules

The ERP consists of the following modules:

## CRM

Prospects  
Clients  
Contacts  
Sales Opportunities  

Functions:

• Client documentation  
• Credit limits  
• Sales assignment  
• Trade lanes  

---

## Quoting System

Client quotation builder.

Functions:

• Shipment data
• Origin / Destination
• Service type (FCL, LCL, AIR, LTL, FTL)
• Incoterms
• Cargo metrics (CBM / KG / NMFC)

The system can request quotes from multiple providers and compare costs.

Quotation status:

Draft → Requested → Working → Ready → Requote → Lost → Cancelled

---

## Forwarding / Shipment Module

When a quotation is approved, the system generates a shipment.

Shipment module handles:

• Booking
• Shipping documentation
• Compliance
• Tracking events
• Client communication
• Job costing

---

## Finance Module

Two main subsystems:

Accounts Receivable (AR)
• Client invoices
• Payment tracking
• Credit notes

Accounts Payable (AP)
• Vendor invoices
• Payment validation
• Cost reconciliation

---

## Profit & Commissions

The system calculates:

• Expected vs Real Profit
• Sales commissions
• Branch performance
• Role-based profit sharing

---

## BI and Monitoring

The ERP includes reporting dashboards.

KPIs:

• Sales performance
• Branch targets
• Global profit
• Error monitoring
• Audit logs

---

# 4. Technology Stack

Frontend:
Next.js (App Router)

Language:
TypeScript

Backend:
Supabase

Database:
PostgreSQL (Supabase)

AI development environment:
Cursor IDE

---

# 5. Project Architecture

The project follows a modular architecture.

src/

app/
clients
contacts
opportunities
quotations
shipments

lib/
supabaseClient.ts

db/
clients.ts
contacts.ts
opportunities.ts
quotations.ts
shipments.ts

types/
supabase.ts

---

# 6. Data Layer Rules

UI components must never query Supabase directly.

All database queries must exist inside:

src/lib/db/

Each module must have its own query file.

Example:

clients.ts
contacts.ts

Queries should expose functions like:

getClients()
createClient()

getContacts()
createContact()

getOpportunities()
createOpportunity()

---

# 7. Database Model

Core entities include:

clients  
contacts  
opportunities  
quotations  
shipments  

Relationships:

contacts.client_id → clients.id

opportunities.client_id → clients.id

quotations.opportunity_id → opportunities.id

shipments.quotation_id → quotations.id

---

# 8. Database Conventions

Tables use snake_case and plural names.

Examples:

clients  
contacts  
opportunities  
quotations  
shipments  

Foreign keys follow this pattern:

client_id  
contact_id  
opportunity_id  
quotation_id  

All tables should include:

created_at timestamp default now()

Soft delete strategy:

is_deleted boolean default false

---

# 9. AI Code Generation Rules

When generating code for this project:

• Follow the existing architecture
• Never create Supabase queries in UI components
• Use the data layer (lib/db)
• Maintain modular structure
• Prefer simple and readable code

---

# 10. ERP Design Philosophy

The system should remain:

Modular  
Scalable  
Domain-driven  

Each module should represent a real logistics process.

Avoid unnecessary complexity.

Focus on:

clean data model  
clear workflow  
easy maintainability

---

# 11. Long-Term Vision

Priority Logistics ERP should evolve into a full freight platform including:

• Shipment tracking
• Client portals
• Automated quotations
• Vendor integrations
• Financial automation
• AI-assisted logistics operations

## 12. Security Rules

All tables must use Row Level Security (RLS).

Rules:

- RLS must be enabled on every table
- Policies must allow authenticated users access
- Tables must prevent physical deletes
- Soft delete using is_deleted

Example:

alter table table_name enable row level security;

create policy "Authenticated users full access"
on table_name
for all
to authenticated
using (true)
with check (true);

## 13. Database Automation

ERP uses PostgreSQL triggers to automate workflows.

Triggers handle:

- updated_at timestamps
- reference number generation
- quotation approval workflow
- audit logging
- soft delete protection

All automation logic must be stored in:

ERP_triggers.sql

--------------------------------------------------
DATABASE FUNCTIONS
--------------------------------------------------

create_client_with_contacts()

Creates a client and multiple contacts in a single transaction.



create_opportunity()

Creates a sales opportunity linked to a client.



convert_opportunity_to_quotation()

Creates quotation and updates opportunity status.



approve_quotation()

Approves quotation and triggers shipment creation.



create_shipment()

Creates a shipment manually.



mark_shipment_delivered()

Updates shipment status.



get_client_full()

Returns client with:

contacts
opportunities



--------------------------------------------------
ANALYTICS VIEWS
--------------------------------------------------

client_overview_view

Client summary including:

opportunities
shipments
pipeline value



sales_pipeline_view

Sales pipeline grouped by status.



open_opportunities_view

List of active opportunities.



quotation_summary_view

All quotations with related opportunity and client.



active_shipments_view

Shipments not delivered.



delivered_shipments_view

Completed shipments.



client_revenue_view

Revenue pipeline by client.



monthly_sales_view

Monthly opportunity values.



shipment_activity_view

Shipment counts by status.



client_contacts_view

Contacts linked to clients.



--------------------------------------------------
SECURITY MODEL
--------------------------------------------------

Current Mode:

Development mode.

Row Level Security enabled but open policies allow full access.



Future Security Model:

Multi-tenant architecture using:

organization_id
auth.uid()
role-based access



--------------------------------------------------
ERP ARCHITECTURE
--------------------------------------------------

Database Layer

ERP_schema.sql
ERP_policies.sql
ERP_triggers.sql
ERP_functions.sql
ERP_views.sql



AI Context Layer

AI_CONTEXT.md



Application Layer

Next.js frontend
Supabase API



--------------------------------------------------
AI ASSISTANT RULES
--------------------------------------------------

When interacting with the database:

Use existing functions when possible.

Avoid creating duplicate logic already handled by triggers or functions.

Prefer querying views instead of raw tables for analytics.
