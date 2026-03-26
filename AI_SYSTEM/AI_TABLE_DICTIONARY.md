# AI TABLE DICTIONARY

This document defines the canonical database tables and columns for the Priority Logistics ERP.

Canonical source of truth:

supabase/ERP_schema.sql

All SQL, frontend types, and AI-generated queries must match this document.


--------------------------------------------------
TABLE: branches
--------------------------------------------------

Purpose

Stores operational branches used for ownership and reporting.

Columns

id
Type: uuid
Primary key.

name
Type: text
Branch display name.

code
Type: text
Short branch code.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: roles
--------------------------------------------------

Purpose

Stores ERP user roles.

Columns

id
Type: uuid
Primary key.

name
Type: text
Role name.

description
Type: text
Role description.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: users
--------------------------------------------------

Purpose

Stores ERP user profiles such as salespeople, pricing users, operators, and admins.
Passwords are not stored here; Supabase Auth is the credential source of truth.

Columns

id
Type: uuid
Primary key.

auth_user_id
Type: uuid
Links the ERP profile to auth.users.id for secure login and session enforcement.

first_name
Type: text
User first name.

last_name
Type: text
User last name.

email
Type: text
Unique user email.

phone
Type: text
Corporate or direct phone for the ERP user profile.

username
Type: text
Unique ERP login username used as the preferred identifier on the login screen.

role_id
Type: uuid
Foreign key referencing roles.id.

branch_id
Type: uuid
Foreign key referencing branches.id.

base_salary
Type: numeric
Base salary for commission calculations.

active
Type: boolean
Whether the user is active. Inactive users must not pass the protected login gate.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: permission_modules
--------------------------------------------------

Purpose

Stores the top-level ERP permission modules used for navigation and authorization grouping.

Columns

id
Type: uuid
Primary key.

code
Type: text
Stable unique module code such as crm, pricing, operations, master_data, or finance.

name
Type: text
User-facing module label.

icon_key
Type: text
Optional UI icon reference.

sort_order
Type: integer
Controls display order in permission-aware navigation.

active
Type: boolean
Whether the module is currently part of the live permission surface.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: permission_submodules
--------------------------------------------------

Purpose

Stores the live or planned ERP submodules that map to routes and permission-aware navigation items.

Columns

id
Type: uuid
Primary key.

module_id
Type: uuid
Foreign key referencing permission_modules.id.

code
Type: text
Stable unique submodule code such as crm.clients or pricing.quotations.

name
Type: text
User-facing submodule label.

route_path
Type: text
Primary route used for navigation.

route_matchers
Type: text[]
Allowed route prefixes used by erp_can_access_route() for shared detail routes.

sort_order
Type: integer
Controls ordering inside the module tree and sidebar.

active
Type: boolean
Whether the submodule should be visible in current live navigation.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: permission_actions
--------------------------------------------------

Purpose

Stores canonical permission actions such as view, create, edit, delete, pricing_take, send_quote, or create_booking.

Columns

id
Type: uuid
Primary key.

code
Type: text
Stable action identifier.

name
Type: text
User-facing action name.

scope_type
Type: text
Allowed values: resource, field, or both.

active
Type: boolean
Whether the action is currently available in the permission registry.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: permission_conditions
--------------------------------------------------

Purpose

Stores the canonical access scope conditions used by role permissions.

Columns

id
Type: uuid
Primary key.

code
Type: text
Stable condition code such as all, owner_only, assigned_branch_only, or none.

name
Type: text
User-facing condition label.

description
Type: text
Readable explanation of the condition.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: permission_resources
--------------------------------------------------

Purpose

Stores logical ERP resources that can be protected independently from whole modules.

Columns

id
Type: uuid
Primary key.

module_id
Type: uuid
Foreign key referencing permission_modules.id.

submodule_id
Type: uuid
Nullable foreign key referencing permission_submodules.id.

resource_key
Type: text
Stable unique resource identifier such as crm.clients.record or pricing.quotations.cost_section.

name
Type: text
User-facing resource label.

resource_type
Type: text
Classification such as module, submodule, page, section, list, record, or action_group.

resource_group
Type: text
Optional UI grouping label used by the permissions workspace.

table_name
Type: text
Optional canonical table associated with the resource.

view_name
Type: text
Optional canonical view associated with the resource.

rpc_name
Type: text
Optional canonical RPC associated with the resource.

entity_owner_field
Type: text
Optional ownership field for future owner_only enforcement.

entity_branch_field
Type: text
Optional branch field for future assigned_branch_only enforcement.

sort_order
Type: integer
Display order inside a submodule.

active
Type: boolean
Whether the resource participates in live authorization.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: permission_fields
--------------------------------------------------

Purpose

Stores field-level permission targets for sensitive or section-specific UI fields.

Columns

id
Type: uuid
Primary key.

resource_id
Type: uuid
Foreign key referencing permission_resources.id.

field_key
Type: text
Stable field identifier inside the resource.

label
Type: text
User-facing field label.

data_type
Type: text
Field datatype hint for permission UX and enforcement planning.

field_group
Type: text
Visual section grouping such as Company Information or Pricing.

sort_order
Type: integer
Display order inside the field drawer.

active
Type: boolean
Whether the field is live in the permission registry.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: role_resource_permissions
--------------------------------------------------

Purpose

Stores the live coarse-grained permission rules by role, resource, action, and scope condition.

Columns

id
Type: uuid
Primary key.

role_id
Type: uuid
Foreign key referencing roles.id.

resource_id
Type: uuid
Foreign key referencing permission_resources.id.

action_id
Type: uuid
Foreign key referencing permission_actions.id.

condition_id
Type: uuid
Foreign key referencing permission_conditions.id.

allowed
Type: boolean
Whether the role may perform the action.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: role_field_permissions
--------------------------------------------------

Purpose

Stores field-level permission rules by role, field, action, and scope condition.

Columns

id
Type: uuid
Primary key.

role_id
Type: uuid
Foreign key referencing roles.id.

field_id
Type: uuid
Foreign key referencing permission_fields.id.

action_id
Type: uuid
Foreign key referencing permission_actions.id.

condition_id
Type: uuid
Foreign key referencing permission_conditions.id.

allowed
Type: boolean
Whether the role may perform the field action.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: external_data_sources
--------------------------------------------------

Purpose

Stores provenance metadata for external public datasets imported into the ERP.

Columns

id
Type: uuid
Primary key.

code
Type: text
Stable short code for the dataset source.

name
Type: text
Display name for the dataset source.

provider
Type: text
Publishing organization.

source_url
Type: text
Official source URL for the dataset.

license
Type: text
License or usage note when known.

refresh_strategy
Type: text
How the dataset should be refreshed.

last_imported_at
Type: timestamptz
Last successful import timestamp.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: service_transport_types
--------------------------------------------------

Purpose

Stores the locked canonical sales master data that maps an allowed service type to a transport type.

Columns

id
Type: uuid
Primary key.

service_type
Type: text
Allowed canonical service family. Valid values: AIR, FCL, LCL, FTL, LTL, COURIER.

transport_type
Type: text
Operational transport option available inside the selected service type.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: sales_accounting_concepts
--------------------------------------------------

Purpose

Stores SAT-aligned sales accounting concepts for reuse across commercial modules.

Columns

id
Type: uuid
Primary key.

concept
Type: text
Commercial/accounting concept label.

service_type
Type: text
Allowed values: GENERAL, AIR, FCL, LCL, FTL, LTL, COURIER.

operation_type
Type: text
Allowed values: IMPORT, EXPORT.

vat_rate
Type: numeric(5,2)
Configured VAT rate percentage for the concept.

sat_code
Type: text
SAT key for the concept.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: unlocodes
--------------------------------------------------

Purpose

Stores normalized UNECE UN/LOCODE location rows for future ERP lookups.

Columns

id
Type: uuid
Primary key.

source_id
Type: uuid
Foreign key referencing external_data_sources.id.

country_code
Type: text
Two-letter UN/LOCODE country code.

location_code
Type: text
Three-character location code within the country.

unlocode
Type: text
Combined code such as MXACA or USLAX.

country_name
Type: text
Country display name from the UNECE source page.

name
Type: text
Official location name.

name_without_diacritics
Type: text
Normalized location name from the source.

subdivision_code
Type: text
Source subdivision value such as state or province code.

function_classifier
Type: text
UNECE function classifier string.

status
Type: text
UNECE status code.

change_indicator
Type: text
UNECE change indicator.

date_code
Type: text
UNECE date column value.

iata_code
Type: text
IATA code when present.

coordinates
Type: text
Source coordinate string.

remarks
Type: text
Source remarks field.

search_text
Type: text
Normalized backend search column used for indexed UN/LOCODE lookup and autocomplete.

source_page_url
Type: text
Exact UNECE country page used for the row.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: prospects
--------------------------------------------------

Purpose

Stores unconverted leads before they become clients.

Columns

id
Type: uuid
Primary key.

company_name
Type: text
Prospect company name.

contact_name
Type: text
Primary prospect contact.

email
Type: text
Primary contact email.

phone
Type: text
Primary contact phone.

source
Type: text
Lead source.

status
Type: text
Prospect lifecycle status.

branch_id
Type: uuid
Foreign key referencing branches.id.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: clients
--------------------------------------------------

Purpose

Stores confirmed customers served by the ERP.

Columns

id
Type: uuid
Primary key.

prospect_id
Type: uuid
Foreign key referencing prospects.id.

company_name
Type: text
Client company name.

industry
Type: text
Client industry.

country
Type: text
Client country.

website
Type: text
Primary client website.

corporate_phone
Type: text
Primary client corporate phone.

full_address
Type: text
Client address.

postal_code
Type: text
Client postal code.

account_owner_id
Type: uuid
Foreign key referencing users.id.
Canonical seller owner of the client account.

city
Type: text
Client city label used by the CRM.

city_unlocode
Type: text
Selected UN/LOCODE code for the client city.

city_unlocode_id
Type: uuid
Foreign key referencing unlocodes.id for the selected client city.

tax_id
Type: text
Tax identifier.

search_text
Type: text
Normalized indexed search field for canonical client lookup.

status
Type: text
Client lifecycle status.

branch_id
Type: uuid
Foreign key referencing branches.id.

credit_limit
Type: numeric
Approved credit limit.

credit_days
Type: integer
Approved payment terms in days.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.

is_deleted
Type: boolean
Soft delete flag.


--------------------------------------------------
TABLE: contacts
--------------------------------------------------

Purpose

Stores people linked to a client account.

Columns

id
Type: uuid
Primary key.

client_id
Type: uuid
Foreign key referencing clients.id.

name
Type: text
Contact full name.

email
Type: text
Contact email.

phone
Type: text
Direct contact phone.

linkedin_url
Type: text
LinkedIn profile URL.

position
Type: text
Job title or role.

status
Type: text
Contact employment status.

Allowed values:
activo, ya_no_trabaja

is_primary
Type: boolean
Whether this is the primary contact.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: client_logistics_parties
--------------------------------------------------

Purpose

Stores consignee, shipper, and AA records linked to a client.

Columns

id
Type: uuid
Primary key.

client_id
Type: uuid
Foreign key referencing clients.id.

party_type
Type: text
Operational party type. Allowed values:
shipper
consignee
aa

name
Type: text
Record name.

full_address
Type: text
Address of the consignee / shipper / AA record.

postal_code
Type: text
Postal code.

city_unlocode
Type: text
Selected UN/LOCODE code for the record location.

city_unlocode_id
Type: uuid
Foreign key referencing unlocodes.id for the selected location.

city
Type: text
Derived city label from the selected UN/LOCODE.

country
Type: text
Derived country label from the selected UN/LOCODE.

contact_name
Type: text
Primary contact name for the record.

contact_email
Type: text
Primary contact email for the record.

contact_phone
Type: text
Primary contact phone for the record.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: providers
--------------------------------------------------

Purpose

Stores canonical provider company profiles for the Pricing module.

Columns

id
Type: uuid
Primary key.

name
Type: text
Provider name.

tax_id
Type: text
Provider RFC or tax identifier.

provider_type
Type: text
Commercial supplier type such as paqueteria, broker, naviera, or aerolinea.

corporate_phone
Type: text
Corporate phone number.

company_email
Type: text
Corporate email inbox.

website
Type: text
Provider website.

full_address
Type: text
Provider address.

postal_code
Type: text
Provider postal code.

city_unlocode
Type: text
Selected UN/LOCODE used to standardize city and country.

city_unlocode_id
Type: uuid
Foreign key referencing unlocodes.id for the selected provider city.

city
Type: text
Derived city label from UN/LOCODE.

country
Type: text
Derived country label from UN/LOCODE.

credit_active
Type: boolean
Whether the provider has active credit terms.

credit_amount
Type: numeric
Approved credit amount from the provider.

credit_days
Type: integer
Credit days after invoice date.

status
Type: text
Provider lifecycle status: en_proceso_de_alta, activo, inactivo.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: provider_contacts
--------------------------------------------------

Purpose

Stores direct supplier contacts linked to a provider.

Columns

id
Type: uuid
Primary key.

provider_id
Type: uuid
Foreign key referencing providers.id.

name
Type: text
Contact name.

email
Type: text
Contact email.

phone
Type: text
Direct phone number for call and WhatsApp links.

linkedin_url
Type: text
LinkedIn profile URL.

position
Type: text
Role or job title.

status
Type: text
Contact lifecycle status: activo, ya_no_trabaja.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: provider_service_offerings
--------------------------------------------------

Purpose

Stores the service and transport combinations offered by a provider, including service-specific terms.

Columns

id
Type: uuid
Primary key.

provider_id
Type: uuid
Foreign key referencing providers.id.

service_transport_type_id
Type: uuid
Foreign key referencing service_transport_types.id.

terms_and_conditions
Type: text
Terms and conditions for that specific offered service.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: incoterms
--------------------------------------------------

Purpose

Stores Incoterm master data used by opportunities and quotations.

Columns

id
Type: uuid
Primary key.

code
Type: text
Unique Incoterm code.

description
Type: text
Incoterm description.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: opportunities
--------------------------------------------------

Purpose

Stores sales opportunities for a client.

Columns

id
Type: uuid
Primary key.

client_id
Type: uuid
Foreign key referencing clients.id.

salesperson_id
Type: uuid
Foreign key referencing users.id.
Defaults from clients.account_owner_id when not explicitly provided during creation.

title
Type: text
Opportunity title.

description
Type: text
Opportunity details.

trade_lane
Type: text
Commercial trade lane.

service_type
Type: text
Service type requested.

transport_type
Type: text
Transport type filtered from the selected service type.

operation_type
Type: text
Commercial operation direction. Allowed values: Import, Export.

incoterm_id
Type: uuid
Foreign key referencing incoterms.id.

origin
Type: text
Shipment origin used during qualification.

destination
Type: text
Shipment destination used during qualification.

origin_unlocode
Type: text
Canonical UN/LOCODE for origin.

origin_unlocode_id
Type: uuid
Foreign key referencing unlocodes.id for origin.

destination_unlocode
Type: text
Canonical UN/LOCODE for destination.

destination_unlocode_id
Type: uuid
Foreign key referencing unlocodes.id for destination.

stage
Type: text
Pipeline stage.

status
Type: text
Opportunity status.

Allowed values:
investigando, confirmado, cotizando, aceptado, rechazada, vencida

expected_profit_usd
Type: numeric
Expected profit in USD for one service.

service_quantity
Type: integer
Approximate monthly number of services.

estimated_value
Type: numeric
Calculated as expected_profit_usd * service_quantity.

probability
Type: integer
Close probability percentage.

estimated_close_date
Type: date
Expected close date.

start_date
Type: date
Lifecycle start date used to calculate expiration.

expiration_date
Type: date
Last day of the month, six months after start_date.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: quotations
--------------------------------------------------

Purpose

Stores commercial quotations generated from opportunities.

Columns

id
Type: uuid
Primary key.

client_id
Type: uuid
Foreign key referencing clients.id.

opportunity_id
Type: uuid
Foreign key referencing opportunities.id.

created_by
Type: uuid
Foreign key referencing users.id.

pricing_owner_id
Type: uuid
Foreign key referencing users.id.

reference_number
Type: text
Unique quotation identifier generated from the service-type sequence contract.

status
Type: text
Quotation lifecycle status.
Allowed values:
borrador, pendiente, cotizando, lista_para_enviar, enviada, cancelada, rechazada, renegociar_tarifa, aceptada

service_type
Type: text
Quoted service type.

transport_type
Type: text
Quoted transport type.

operation_type
Type: text
Import or Export.

origin
Type: text
Quoted origin.

origin_unlocode
Type: text
Canonical UN/LOCODE for origin.

destination
Type: text
Quoted destination.

destination_unlocode
Type: text
Canonical UN/LOCODE for destination.

pickup_address
Type: text
Pickup full address captured on the quotation.

delivery_address
Type: text
Delivery full address captured on the quotation.

incoterm_id
Type: uuid
Foreign key referencing incoterms.id.

required_quote_date
Type: date
Requested date to return the quotation.

purchase_valid_until
Type: date
Provider-side purchase validity.

sales_valid_until
Type: date
Customer-facing sales validity.

rejection_reason_id
Type: uuid
Foreign key referencing quotation_rejection_reasons.id.

rejection_notes
Type: text
Free-text notes when a quotation is rejected.

cancellation_notes
Type: text
Free-text notes when a quotation is cancelled.

target_rate
Type: numeric
Client target rate used in renegotiation.

currency
Type: text
Legacy quotation-level commercial currency marker.
Line-level purchase and sale currencies now drive accounting normalization.

estimated_cost
Type: numeric
Expected provider cost.

estimated_price
Type: numeric
Quoted sale price.

expected_profit
Type: numeric
Expected profit.

search_text
Type: text
Denormalized search text used by paginated quotation list lookup.

valid_until
Type: date
Quotation validity date.

accepted_usd_rate_date
Type: date
Rate date locked when the quotation is accepted for USD to MXN accounting.

accepted_usd_to_mxn_rate
Type: numeric
USD to MXN rate locked when the quotation is accepted.

accepted_eur_rate_date
Type: date
Rate date locked when the quotation is accepted for EUR to MXN accounting.

accepted_eur_to_mxn_rate
Type: numeric
EUR to MXN rate locked when the quotation is accepted.

exchange_rates_locked_at
Type: timestamptz
Timestamp marking when accepted quotation FX values were frozen.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: quotation_costs
--------------------------------------------------

Purpose

Stores provider cost lines attached to a quotation.

Columns

id
Type: uuid
Primary key.

quotation_id
Type: uuid
Foreign key referencing quotations.id.

quotation_option_id
Type: uuid
Foreign key referencing quotation_options.id.
Groups a charge line under a customer-facing quotation option.

option_label
Type: text
Legacy grouping label kept for compatibility with older rows and migration backfill.
New UI flows must group charges through quotation_options instead of manual option labels.

provider_id
Type: uuid
Foreign key referencing providers.id.

sales_accounting_concept_id
Type: uuid
Foreign key referencing sales_accounting_concepts.id.

service_name
Type: text
Provider or accounting-concept label stored on the line.

cost
Type: numeric
Provider cost amount.
Must be treated as sensitive purchase-side data and exposed through quotation_cost_line_secure_view or masked quotation summary reads.

purchase_amount
Type: numeric
Commercial purchase amount for the line.
Visible to Pricing and Ventas only when the corresponding field permission is granted.

purchase_currency
Type: text
Original purchase currency captured on the provider-side line.
Allowed values: MXN, USD, EUR.

purchase_exchange_rate_to_mxn
Type: numeric
Exchange rate used to normalize purchase_amount into MXN.

purchase_amount_mxn
Type: numeric
Purchase amount normalized into MXN for accounting totals and profit.

sale_amount
Type: numeric
Commercial sale amount for the line.
Must remain hidden from Pricing unless explicitly granted through role_field_permissions.

sale_currency
Type: text
Original sale currency captured on the commercial line.
Allowed values: MXN, USD, EUR.

sale_exchange_rate_to_mxn
Type: numeric
Exchange rate used to normalize sale_amount into MXN.

sale_amount_mxn
Type: numeric
Sale amount normalized into MXN for accounting totals and profit.

profit_amount
Type: numeric
Line profit calculated as sale - purchase.
Must remain hidden from Pricing unless explicitly granted through role_field_permissions.

profit_amount_mxn
Type: numeric
Canonical accounting profit normalized into MXN.

vat_rate
Type: numeric
IVA percentage applied from the accounting concept.

notes
Type: text
Additional cost notes.

Security Notes

- quotation_costs is the write table
- quotation_cost_line_secure_view is the canonical masked read for role-aware UI access
- registered sensitive quotation fields use deny-by-default field permission behavior until an explicit role_field_permissions rule exists

created_at
Type: timestamptz
Creation timestamp.


--------------------------------------------------
TABLE: quotation_options
--------------------------------------------------

Purpose

Stores the commercial option groups that CRM may choose to expose or hide in the customer-facing quotation.

Columns

id
Type: uuid
Primary key.

quotation_id
Type: uuid
Foreign key referencing quotations.id.

option_label
Type: text
System-generated label such as Opcion 1 or Opcion 2.

sort_order
Type: integer
Controls display order inside the quotation.

include_in_customer_quote
Type: boolean
Whether the option is included in the customer-facing proposal and PDF.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: exchange_rates
--------------------------------------------------

Purpose

Stores daily BANXICO or manual exchange-rate rows used to normalize ERP accounting into MXN.

Columns

id
Type: uuid
Primary key.

rate_date
Type: date
Effective date of the published or manually registered rate.

base_currency
Type: text
Origin currency.
Allowed values: USD, EUR.

quote_currency
Type: text
Target accounting currency.
Current allowed value: MXN.

rate_value
Type: numeric
Conversion rate from base_currency to MXN.

source
Type: text
Source of the rate row.
Allowed values: BANXICO, MANUAL.

source_series_code
Type: text
Optional source series identifier for traceability.

Operational Notes

- BANXICO rows are the canonical source when available
- the system may ingest rows automatically every day at 6:00 a.m.
- quotation MXN totals use the latest available rate on or before the previous day unless the quotation has already been accepted and locked

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: quotation_rejection_reasons
--------------------------------------------------

Purpose

Stores reusable master-data rejection reasons for quotations.

Columns

id
Type: uuid
Primary key.

reason
Type: text
Unique rejection reason label.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: quotation_reference_counters
--------------------------------------------------

Purpose

Stores per-service quotation counters used to generate references like QPRIFTL-000001.

Columns

service_type
Type: text
Primary key and service family.

prefix
Type: text
Reference prefix for the service family.

last_value
Type: bigint
Last issued sequence number.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: quotation_cargo_lines
--------------------------------------------------

Purpose

Stores service-specific cargo/consolidation line details for quotations.

Columns

id
Type: uuid
Primary key.

quotation_id
Type: uuid
Foreign key referencing quotations.id.

load_type
Type: text
Cargo unit type such as pallet, box, crate, or case.

piece_count
Type: integer
Number of pieces for the line.

width
Type: numeric
Width value for cargo calculations.

length
Type: numeric
Length value for cargo calculations.

height
Type: numeric
Height value for cargo calculations.

weight
Type: numeric
Weight value for cargo calculations.

freight_class
Type: text
NMFC or related freight class when applicable.

cbm
Type: numeric
Computed or stored CBM value.

volumetric_weight_kg
Type: numeric
Computed or stored volumetric weight.

sort_order
Type: integer
Display order inside the quotation.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: shipments
--------------------------------------------------

Purpose

Stores operational jobs linked to quotations after the commercial handoff into operations.

Columns

id
Type: uuid
Primary key.

quotation_id
Type: uuid
Foreign key referencing quotations.id.

client_id
Type: uuid
Foreign key referencing clients.id.

shipment_reference
Type: text
Unique shipment identifier.

status
Type: text
Shipment lifecycle status.

origin
Type: text
Operational origin.

destination
Type: text
Operational destination.

booking_number
Type: text
Carrier booking number.

departure_date
Type: date
Departure date.

arrival_date
Type: date
Arrival date.

delivered_at
Type: timestamptz
Delivery timestamp.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: shipment_events
--------------------------------------------------

Purpose

Stores tracking milestones for shipments.

Columns

id
Type: uuid
Primary key.

shipment_id
Type: uuid
Foreign key referencing shipments.id.

event_type
Type: text
Event classification.

event_date
Type: timestamptz
When the event occurred.

location
Type: text
Event location.

notes
Type: text
Event notes.

created_at
Type: timestamptz
Creation timestamp.


--------------------------------------------------
TABLE: client_invoices
--------------------------------------------------

Purpose

Stores accounts receivable invoices billed to clients.

Columns

id
Type: uuid
Primary key.

shipment_id
Type: uuid
Foreign key referencing shipments.id.

client_id
Type: uuid
Foreign key referencing clients.id.

invoice_number
Type: text
Unique invoice number.

total_amount
Type: numeric
Billed amount.

currency
Type: text
Invoice currency.

status
Type: text
Invoice status.

issue_date
Type: date
Issue date.

due_date
Type: date
Due date.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: provider_invoices
--------------------------------------------------

Purpose

Stores accounts payable invoices billed by providers.

Columns

id
Type: uuid
Primary key.

provider_id
Type: uuid
Foreign key referencing providers.id.

shipment_id
Type: uuid
Foreign key referencing shipments.id.

invoice_number
Type: text
Unique invoice number.

total_amount
Type: numeric
Billed amount.

currency
Type: text
Invoice currency.

status
Type: text
Invoice status.

issue_date
Type: date
Issue date.

due_date
Type: date
Due date.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: commissions
--------------------------------------------------

Purpose

Stores expected and realized commission records per shipment.

Columns

id
Type: uuid
Primary key.

shipment_id
Type: uuid
Foreign key referencing shipments.id.

user_id
Type: uuid
Foreign key referencing users.id.

expected_profit
Type: numeric
Expected shipment profit.

actual_profit
Type: numeric
Actual shipment profit.

commission_percentage
Type: numeric
Commission rate.

commission_amount
Type: numeric
Commission amount.

status
Type: text
Commission status.

created_at
Type: timestamptz
Creation timestamp.

updated_at
Type: timestamptz
Last update timestamp.


--------------------------------------------------
TABLE: audit_logs
--------------------------------------------------

Purpose

Stores row-level audit events for critical business tables.

Columns

id
Type: uuid
Primary key.

table_name
Type: text
Changed table name.

record_id
Type: uuid
Changed record id.

action
Type: text
Database action.

user_id
Type: uuid
User that caused the action when available.

payload
Type: jsonb
Row snapshot.

created_at
Type: timestamptz
Creation timestamp.


--------------------------------------------------
TABLE: automation_logs
--------------------------------------------------

Purpose

Stores automation execution results.

Columns

id
Type: uuid
Primary key.

event
Type: text
Automation event name.

action
Type: text
Automation action performed.

status
Type: text
Automation result status.

error_message
Type: text
Failure details when applicable.

created_at
Type: timestamptz
Creation timestamp.


--------------------------------------------------
CONSISTENCY RULES
--------------------------------------------------

1. Do not invent columns outside this document.
2. Keep the migration file synchronized with the canonical schema.
3. Keep Supabase-generated frontend types synchronized with this model.
4. If a relationship changes, update AI_DATABASE_MAP.md and AI_DATABASE_RELATION_GRAPH.md in the same change.
5. Soft delete applies only to tables that include is_deleted.
