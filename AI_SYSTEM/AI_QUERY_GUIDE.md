# AI QUERY GUIDE

This document defines how AI agents must query the canonical Priority Logistics ERP database.

Canonical references:

AI_DATABASE_MAP.md
AI_DATABASE_RELATION_GRAPH.md
AI_TABLE_DICTIONARY.md


--------------------------------------------------
QUERY PRIORITY RULE
--------------------------------------------------

Use this priority order:

1. Views for analytics, dashboards, and joined list screens
2. Database functions for writes and workflow transitions
3. Tables only for simple detail reads when no view or function exists


--------------------------------------------------
APPROVED ANALYTICS VIEWS
--------------------------------------------------

Use these views instead of rebuilding joins in the frontend:

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
provider_overview_view
provider_contacts_view
provider_service_offering_view
unlocode_lookup_view
service_transport_type_lookup_view


--------------------------------------------------
APPROVED BUSINESS FUNCTIONS
--------------------------------------------------

Use these functions for writes and workflow actions:

create_client_with_contacts()
add_contact_to_client()
add_client_logistics_party()
create_opportunity()
update_opportunity_status()
convert_opportunity_to_quotation()
approve_quotation()
create_shipment()
update_shipment_status()
mark_shipment_delivered()
get_client_full()
delete_client_logistics_party()
soft_delete_client()
search_clients()
Prefer for canonical client search instead of rebuilding client lookup filters in page code.
create_provider()
add_contact_to_provider()
get_provider_full()
search_providers()
search_unlocodes()
create_service_transport_type()
update_service_transport_type()
delete_service_transport_type()


--------------------------------------------------
WRITE SAFETY RULE
--------------------------------------------------

For creates, updates, workflow state changes, and soft deletes:

prefer database functions.

Avoid direct frontend inserts, updates, or deletes when a function already exists.


Contact-specific rules:

- use add_contact_to_client() for creation
- treat contacts.phone as direct phone for call and WhatsApp links
- normalize WhatsApp links to international format before generating the deep link
- if a contact phone is captured as a local 10-digit Mexico number, the UI may normalize it with country code 52
- validate email format in the app before write
- do not claim email existence unless an external verification provider is integrated


Client logistics party rules:

- use add_client_logistics_party() for creation
- use delete_client_logistics_party() for removal
- treat consignee / shipper / AA records as related client entities, not inline free text on clients
- standardize location through UN/LOCODE when available


Opportunity-specific write rules:

- use create_opportunity() for creation
- use update_opportunity_status() for lifecycle transitions
- service_type comes from service_transport_type_lookup_view
- transport_type must be filtered by selected service_type
- origin and destination must use UN/LOCODE-backed values
- estimated_value must be backend-calculated from expected_profit_usd * service_quantity
- expiration_date must be backend-calculated from start_date
- expired opportunities must surface as vencida
- if salesperson_id is omitted, create_opportunity() must inherit clients.account_owner_id


Provider-specific rules:

- provider company location must standardize city and country from the selected city_unlocode
- provider offered services must come from service_transport_type_lookup_view
- provider terms must be stored per offered service type, not as one global provider text block
- use create_provider() for provider creation
- use add_contact_to_provider() for provider contact creation
- use get_provider_full() for provider detail screens
- provider contact phone should generate a WhatsApp deep link after normalization
- provider contact email may be format-validated in the ERP, but real inbox verification requires an external service


--------------------------------------------------
JOIN SAFETY RULE
--------------------------------------------------

Avoid manual multi-table joins in frontend module code for list pages.

Use views for:

client summaries
pipeline summaries
quotation summaries
shipment summaries
revenue summaries
master data lookup summaries


--------------------------------------------------
SOFT DELETE RULE
--------------------------------------------------

Tables with is_deleted must always be filtered with:

is_deleted = false

Clients are the current soft-deleted business entity.


--------------------------------------------------
FILTERING RULE
--------------------------------------------------

Always filter at the database level.

Good examples

select * from open_opportunities_view where client_id = :client_id

select * from shipments where status = 'pending'


--------------------------------------------------
PAGINATION RULE
--------------------------------------------------

Large list queries must paginate.

SQL example

limit 50
offset 0

Supabase example

range(0, 49)


--------------------------------------------------
INDEX AWARENESS RULE
--------------------------------------------------

Prefer indexed columns when filtering and ordering:

id
client_id
quotation_id
shipment_id
status
stage
created_at


--------------------------------------------------
DATE AND AGGREGATION RULE
--------------------------------------------------

Use database-side date logic and aggregation.

Examples

monthly_sales_view
shipment_activity_view
client_revenue_view

Do not rebuild these aggregates in React components.


--------------------------------------------------
PREFERRED QUERY PATTERNS
--------------------------------------------------

Client list

query client_overview_view


Client detail

prefer get_client_full()
fallback to clients plus related simple tables only if necessary
client-related consignee / shipper / AA data should come back through the same canonical payload


Opportunity list

query open_opportunities_view or opportunities
depending on whether a summary list or raw record detail is needed


Quotation dashboard

query quotation_summary_view


Shipment dashboard

query active_shipments_view or delivered_shipments_view


Revenue dashboard

query client_revenue_view or monthly_sales_view


UN/LOCODE lookup

query unlocode_lookup_view for selectors and browse screens
prefer search_unlocodes() for typeahead, filtered search, and backend-safe lookup limits
query unlocode_country_summary_view for canonical country filter options
do not query unlocodes directly from page components
do not invent module-specific UN/LOCODE search logic when the canonical query layer already exists
retain the current frontend contract even when backend indexing is optimized
use snapshot fallback only as temporary rollback safety, never as the primary implementation target
the canonical backend search is implemented through indexed search_text matching and ranked RPC ordering


Scale note

For CRM/Pricing list screens with meaningful growth:

- send search and status filters to the backend query layer
- avoid loading the full dataset into the page only to filter it in React
- keep parent-child list paths indexed by foreign key plus created_at where the UI sorts by recency


Sales service type catalog

query service_transport_type_lookup_view for list and filter screens
use create_service_transport_type(), update_service_transport_type(), and delete_service_transport_type() for writes


--------------------------------------------------
ERROR PREVENTION RULE
--------------------------------------------------

Before writing or changing a query:

1. Verify the exact column names in AI_TABLE_DICTIONARY.md.
2. Verify relationship paths in AI_DATABASE_RELATION_GRAPH.md.
3. Verify whether a view or function already solves the use case.


--------------------------------------------------
AI QUERY SAFETY
--------------------------------------------------

The AI must never:

1. Invent legacy columns such as clients.name or opportunities.value.
2. Assume shipments can be created without a quotation.
3. Hard-delete clients directly from the clients table.
4. Rebuild canonical analytics joins when a view already exists.
5. Query imported master data directly from page components instead of using the canonical query layer.
