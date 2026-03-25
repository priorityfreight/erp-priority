# AI DATABASE RELATION GRAPH

This document defines the canonical relational model for the Priority Logistics ERP.

It must remain synchronized with:

supabase/ERP_schema.sql


--------------------------------------------------
ERP BUSINESS MODEL
--------------------------------------------------

Primary revenue flow

Prospects
→ Clients
→ Opportunities
→ Quotations
→ Shipments
→ Client Invoices
→ Commissions


Operational support flow

Providers
→ Quotation Costs
→ Provider Invoices


--------------------------------------------------
MAIN ENTITY RELATIONSHIP DIAGRAM
--------------------------------------------------

```mermaid
erDiagram
    BRANCHES ||--o{ USERS : assigns
    PERMISSION_MODULES ||--o{ PERMISSION_SUBMODULES : contains
    PERMISSION_MODULES ||--o{ PERMISSION_RESOURCES : groups
    PERMISSION_SUBMODULES ||--o{ PERMISSION_RESOURCES : exposes
    PERMISSION_RESOURCES ||--o{ PERMISSION_FIELDS : contains
    ROLES ||--o{ ROLE_RESOURCE_PERMISSIONS : grants
    ROLES ||--o{ ROLE_FIELD_PERMISSIONS : grants
    PERMISSION_RESOURCES ||--o{ ROLE_RESOURCE_PERMISSIONS : controls
    PERMISSION_FIELDS ||--o{ ROLE_FIELD_PERMISSIONS : controls
    PERMISSION_ACTIONS ||--o{ ROLE_RESOURCE_PERMISSIONS : qualifies
    PERMISSION_ACTIONS ||--o{ ROLE_FIELD_PERMISSIONS : qualifies
    PERMISSION_CONDITIONS ||--o{ ROLE_RESOURCE_PERMISSIONS : scopes
    PERMISSION_CONDITIONS ||--o{ ROLE_FIELD_PERMISSIONS : scopes
    EXTERNAL_DATA_SOURCES ||--o{ UNLOCODES : feeds
    BRANCHES ||--o{ PROSPECTS : receives
    BRANCHES ||--o{ CLIENTS : owns
    ROLES ||--o{ USERS : classifies

    PROSPECTS ||--o| CLIENTS : converts_to
    CLIENTS ||--o{ CONTACTS : has
    CLIENTS ||--o{ OPPORTUNITIES : creates
    USERS ||--o{ OPPORTUNITIES : owns

    OPPORTUNITIES ||--o{ QUOTATIONS : generates
    CLIENTS ||--o{ QUOTATIONS : receives
    USERS ||--o{ QUOTATIONS : creates
    INCOTERMS ||--o{ QUOTATIONS : applies_to

    PROVIDERS ||--o{ QUOTATION_COSTS : supplies
    QUOTATIONS ||--o{ QUOTATION_COSTS : contains

    QUOTATIONS ||--o{ SHIPMENTS : converts_to
    CLIENTS ||--o{ SHIPMENTS : ships_for
    SHIPMENTS ||--o{ SHIPMENT_EVENTS : tracks

    SHIPMENTS ||--o{ CLIENT_INVOICES : bills
    CLIENTS ||--o{ CLIENT_INVOICES : owes

    PROVIDERS ||--o{ PROVIDER_INVOICES : invoices
    SHIPMENTS ||--o{ PROVIDER_INVOICES : incurs

    SHIPMENTS ||--o{ COMMISSIONS : yields
    USERS ||--o{ COMMISSIONS : earns
```


--------------------------------------------------
FOREIGN KEY DEFINITIONS
--------------------------------------------------

users.role_id
references roles.id

users.branch_id
references branches.id

users.auth_user_id
references auth.users.id

permission_submodules.module_id
references permission_modules.id

permission_resources.module_id
references permission_modules.id

permission_resources.submodule_id
references permission_submodules.id

permission_fields.resource_id
references permission_resources.id

role_resource_permissions.role_id
references roles.id

role_resource_permissions.resource_id
references permission_resources.id

role_resource_permissions.action_id
references permission_actions.id

role_resource_permissions.condition_id
references permission_conditions.id

role_field_permissions.role_id
references roles.id

role_field_permissions.field_id
references permission_fields.id

role_field_permissions.action_id
references permission_actions.id

role_field_permissions.condition_id
references permission_conditions.id

unlocodes.source_id
references external_data_sources.id

clients.city_unlocode
logically references unlocodes.unlocode

clients.city_unlocode_id
references unlocodes.id

providers.city_unlocode
logically references unlocodes.unlocode

providers.city_unlocode_id
references unlocodes.id

opportunities.origin_unlocode
logically references unlocodes.unlocode

opportunities.origin_unlocode_id
references unlocodes.id

opportunities.destination_unlocode
logically references unlocodes.unlocode

opportunities.destination_unlocode_id
references unlocodes.id

prospects.branch_id
references branches.id

clients.prospect_id
references prospects.id

clients.branch_id
references branches.id

contacts.client_id
references clients.id

client_logistics_parties.client_id
references clients.id

client_logistics_parties.city_unlocode_id
references unlocodes.id

provider_contacts.provider_id
references providers.id

provider_service_offerings.provider_id
references providers.id

provider_service_offerings.service_transport_type_id
references service_transport_types.id

opportunities.client_id
references clients.id

opportunities.salesperson_id
references users.id

quotations.client_id
references clients.id

quotations.opportunity_id
references opportunities.id

quotations.created_by
references users.id

quotations.pricing_owner_id
references users.id

opportunities.incoterm_id
references incoterms.id

quotations.incoterm_id
references incoterms.id

quotations.rejection_reason_id
references quotation_rejection_reasons.id

quotation_costs.quotation_id
references quotations.id

quotation_costs.provider_id
references providers.id

quotation_costs.sales_accounting_concept_id
references sales_accounting_concepts.id

quotation_cargo_lines.quotation_id
references quotations.id

shipments.quotation_id
references quotations.id

shipments.client_id
references clients.id

shipment_events.shipment_id
references shipments.id

client_invoices.shipment_id
references shipments.id

client_invoices.client_id
references clients.id

provider_invoices.provider_id
references providers.id

provider_invoices.shipment_id
references shipments.id

commissions.shipment_id
references shipments.id

commissions.user_id
references users.id


--------------------------------------------------
DATABASE CREATION ORDER
--------------------------------------------------

1. branches
2. roles
3. external_data_sources
4. permission_modules
5. permission_actions
6. permission_conditions
7. users
8. permission_submodules
9. unlocodes
10. prospects
11. permission_resources
12. providers
13. provider_contacts
14. provider_service_offerings
15. incoterms
16. clients
17. contacts
18. permission_fields
19. role_resource_permissions
20. role_field_permissions
21. opportunities
22. quotations
23. quotation_rejection_reasons
24. quotation_reference_counters
25. quotation_costs
26. quotation_cargo_lines
27. shipments
28. shipment_events
29. client_invoices
30. provider_invoices
31. commissions
32. audit_logs
33. automation_logs


--------------------------------------------------
MODULE OWNERSHIP
--------------------------------------------------

MASTER DATA MODULE

external_data_sources
unlocodes
service_transport_types
sales_accounting_concepts
quotation_rejection_reasons
quotation_reference_counters


SECURITY / ACCESS MODULE

permission_modules
permission_submodules
permission_actions
permission_conditions
permission_resources
permission_fields
role_resource_permissions
role_field_permissions


CRM MODULE

branches
roles
users
prospects
clients
contacts


SALES MODULE

providers
provider_contacts
provider_service_offerings
opportunities
quotations
quotation_costs
quotation_cargo_lines
incoterms


OPERATIONS MODULE

shipments
shipment_events


FINANCE MODULE

client_invoices
provider_invoices
commissions


OBSERVABILITY MODULE

audit_logs
automation_logs


--------------------------------------------------
AUTOMATION DEPENDENCIES
--------------------------------------------------

Quotation Approved
→ create shipment

Shipment status updated
→ reflected in shipment activity views

Insert / update / delete on core commercial tables
→ write audit log entries


--------------------------------------------------
INTEGRITY RULES
--------------------------------------------------

1. The client lifecycle starts with prospects and only then becomes clients.
2. A quotation must always belong to both a client and an opportunity.
3. A shipment must always belong to a quotation and a client.
4. Client invoices must reference the billed client.
5. Provider invoices must reference the billed provider.
6. Commissions must always reference a shipment and a user.
7. Any new relationship must be added to this graph and the table dictionary in the same change.
8. External public datasets must define provenance through external_data_sources.
