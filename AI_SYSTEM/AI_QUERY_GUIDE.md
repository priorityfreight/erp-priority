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
crm_quotations_view
pricing_quotations_view
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
exchange_rate_lookup_view
permission_resource_catalog_view
permission_field_catalog_view
role_resource_permission_matrix_view
role_field_permission_matrix_view


--------------------------------------------------
APPROVED BUSINESS FUNCTIONS
--------------------------------------------------

Use these functions for writes and workflow actions:

resolve_login_identity()
link_current_auth_user()
get_current_erp_user()
get_current_navigation_items()
erp_can_access_route()
create_erp_user_profile()
update_erp_user_profile()
create_client_with_contacts()
add_contact_to_client()
add_client_logistics_party()
create_opportunity()
update_opportunity_status()
convert_opportunity_to_quotation()
create_quotation_from_opportunity()
search_quotations()
take_quotation_for_pricing()
update_quotation_status()
create_quotation_cost_line()
update_quotation_cost_line()
update_quotation_option_sales_amounts()
delete_quotation_cost_line()
create_quotation_cargo_line()
update_quotation_cargo_line()
delete_quotation_cargo_line()
create_exchange_rate()
update_exchange_rate()
delete_exchange_rate()
create_booking_from_quotation()
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
service_transport_type_lookup_view


--------------------------------------------------
WRITE SAFETY RULE
--------------------------------------------------

For creates, updates, workflow state changes, and soft deletes:

prefer database functions.

Avoid direct frontend inserts, updates, or deletes when a function already exists.


Auth-specific rules:

- passwords must be handled only by Supabase Auth
- public.users is the ERP profile directory, not a password table
- login may accept username or email, but password validation must still go through Supabase Auth
- protected routes must validate both session presence and active ERP profile status before allowing access
- protected routes must also validate route authorization through erp_can_access_route()
- inactive users must be redirected back to login
- direct anonymous access to ERP business tables must be blocked by RLS
- user provisioning with password setup must run through a protected server path that uses the service role key
- only Admin users may create or update ERP user profiles
- sidebar navigation must come from get_current_navigation_items() instead of hardcoded role checks
- route guards and navigation visibility must not infer access from role_name alone when the permission registry exists


Permission-specific rules:

- use get_current_navigation_items() for the live sidebar/navigation surface
- use erp_can_access_route() for server-side route guards and middleware/proxy validation
- use permission_resource_catalog_view and role_resource_permission_matrix_view for the permissions workspace
- use permission_field_catalog_view and role_field_permission_matrix_view for field-level permission editing
- write permission changes through role_resource_permissions and role_field_permissions only from the protected admin permissions workspace
- treat role_resource_permissions as the current live enforcement layer
- treat role_field_permissions as the current field-permission registry and UI contract


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
- operation_type must be either Import or Export
- incoterm_id must come from the canonical incoterms catalog
- origin and destination must use UN/LOCODE-backed values
- estimated_value must be backend-calculated from expected_profit_usd * service_quantity


Quotation-specific write rules:

- create quotations from opportunities through create_quotation_from_opportunity()
- convert_opportunity_to_quotation() remains only as a compatibility wrapper around create_quotation_from_opportunity()
- use request_quotation_pricing() to hand a quotation from CRM draft capture into pricing
- use take_quotation_for_pricing() when pricing ownership is taken from the pending queue
- use update_quotation_status() for lifecycle transitions
- use search_quotations() for CRM and Pricing quotation list screens
- use create_quotation_cost_line(), update_quotation_cost_line(), and delete_quotation_cost_line() for charge lines
- use create_quotation_cargo_line(), update_quotation_cargo_line(), and delete_quotation_cargo_line() for service-specific cargo detail lines
- use update_quotation_option_sales_amounts() when CRM saves sale amounts for an entire option in one action
- quotation-level commodities, quantity, weight, and volume must not be reintroduced on quotations
- all service types must rely on quotation_cargo_lines for cargo detail capture and document rendering
- quotation references must be backend-generated from the service-type counter contract:
  QPRIAIR, QPRIFCL, QPRILCL, QPRIFTL, QPRILTL, QPRICOU
- accepted quotations are no longer auto-converted into shipments
- accepted quotations may create shipments only through create_booking_from_quotation()
- CRM list screens should use search_quotations(scope = crm) instead of direct full-view reads
- Pricing list screens should use search_quotations(scope = pricing) instead of direct full-view reads
- detail screens should read quotation_summary_view for masked economic summary fields
- charge-line detail screens should read quotation_cost_line_secure_view instead of direct quotation_costs reads when rendering sensitive economics
- detail screens may read quotation_summary_view plus quotation_cost_line_secure_view and quotation_cargo_lines rows
- pricing purchase options should be grouped by option_label
- pricing screens should treat purchase capture and sale capture as separate responsibilities
- CRM screens may update sale_amount through update_quotation_cost_line() while preserving purchase-side fields
- CRM should not change purchase_amount values captured by pricing
- Pricing must not receive sale_amount or expected_profit visibility through the default quotation workflow
- registered field permissions now use deny-by-default behavior until an explicit role_field_permissions rule exists
- client-facing commercial documents must hide provider and purchase fields
- provider-facing internal pricing request documents must not expose commercial sale amounts
- pricing sourcing suggestions should filter providers through provider_service_offering_view and then read active contacts through provider_contacts_view
- pricing screens should surface target_rate and sales feedback when status = renegociar_tarifa
- quotation purchase and sale lines may use MXN, USD, or EUR
- accounting totals and profit must be evaluated in MXN using the latest available rate on or before the previous day
- expiration_date must be backend-calculated from start_date
- expired opportunities must surface as vencida
- if salesperson_id is omitted, create_opportunity() must inherit clients.account_owner_id
- create_client_with_contacts() must inherit p_account_owner_id from the current ERP user when omitted


Exchange-rate rules:

- use exchange_rate_lookup_view for list screens
- use create_exchange_rate(), update_exchange_rate(), and delete_exchange_rate() for writes
- BANXICO is the canonical operational source when available
- MANUAL is a controlled fallback for continuity, not the preferred source
- search_clients() is now owner-aware and must only return rows allowed by crm.clients.list
- get_client_full() is now owner-aware and must return null instead of leaking records outside crm.clients.record
- client_overview_view, client_contacts_view, and open_opportunities_view are now scope-aware reads, not broad browse views
- owner_only for contacts is derived through contacts.client_id -> clients.account_owner_id
- owner_only for opportunities is derived through opportunities.salesperson_id and the client branch context
- operations shipment branch access is derived through shipments.client_id -> clients.branch_id
- use backfill_crm_owner_branch_defaults() only for controlled repair of live data, never as a normal UI workflow


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
do not write to service_transport_types from the application
the catalog is locked to the canonical service type families: AIR, FCL, LCL, FTL, LTL, and COURIER
change this catalog only through controlled migrations


Sales accounting concepts catalog

query sales_accounting_concept_lookup_view for list and filter screens
use create_sales_accounting_concept(), update_sales_accounting_concept(), and delete_sales_accounting_concept() for writes
service_type must be one of: GENERAL, AIR, FCL, LCL, FTL, LTL, COURIER
operation_type must be one of: IMPORT, EXPORT


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
