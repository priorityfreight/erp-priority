# AI QUERY LIBRARY

This document describes the current frontend query modules and the database objects they use.

It is not a replacement for AI_QUERY_GUIDE.md.
It is the implementation inventory for the live frontend query layer.


--------------------------------------------------
PURPOSE
--------------------------------------------------

Use this file to answer:

- which query modules exist right now
- which views and functions are already wired into the frontend
- which tables are still used for simple detail reads
- which modules are not implemented yet


--------------------------------------------------
CURRENT QUERY MODULES
--------------------------------------------------

Compatibility support:

- frontend/src/lib/db/backendMode.ts still detects canonical vs fallback environments
- the linked Supabase cloud backend now resolves as canonical
- frontend/src/lib/db/models.ts defines normalized frontend-facing shapes across those modes
- all fallback branches are temporary rollback safety only and must not become the default implementation target

Auth/session support:

- frontend/src/lib/auth.ts resolves username-or-email login and reads the current ERP profile
- frontend/src/lib/supabaseClient.ts uses the browser SSR client so authenticated queries share the current session
- frontend/src/lib/supabase/server.ts is the server-side companion for protected access
- frontend/proxy.ts blocks route access when there is no valid session or no active ERP user profile
- frontend/app/api/admin/users/route.ts provisions auth credentials and ERP user profiles through an admin-only server path

frontend/src/lib/db/clients.ts

Exports:

- getClients()
- getClientSummaries()
- searchClients()
- getClientById()
- getClientFull()
- createClient()
- updateClient()
- deleteClient()

Uses:

- clients
- client_overview_view
- search_clients()
- get_client_full()
- create_client_with_contacts()
- soft_delete_client()
- local browser overlay storage remains only as a fallback path for non-canonical environments


frontend/src/lib/db/contacts.ts

Exports:

- getContacts()
- getContactsByClientId()
- getContactById()
- createContact()
- updateContact()
- deleteContact()

Uses:

- contacts
- client_contacts_view
- add_contact_to_client()

Contact canonical fields:

- client_id
- name
- position
- phone
- linkedin_url
- email
- status
- created_at
- updated_at


frontend/src/lib/db/opportunities.ts

Exports:

- getOpportunities()
- getOpportunitiesByClientId()
- getOpportunityById()
- createOpportunity()
- updateOpportunity()
- deleteOpportunity()

Uses:

- opportunities
- open_opportunities_view
- create_opportunity()
- update_opportunity_status()
- service_transport_type_lookup_view
- search_unlocodes()

Opportunity canonical fields:

- client_id
- salesperson_id
- salesperson_id defaults from clients.account_owner_id when omitted on create
- service_type
- transport_type
- origin
- origin_unlocode
- origin_unlocode_id
- destination
- destination_unlocode
- destination_unlocode_id
- expected_profit_usd
- service_quantity
- estimated_value
- start_date
- expiration_date
- status


frontend/src/lib/db/masterData.ts

Exports:

- searchUnlocodes()
- getServiceTransportTypes()
- createServiceTransportType()
- updateServiceTransportType()
- deleteServiceTransportType()

Uses:

- unlocode_lookup_view
- search_unlocodes()


frontend/src/lib/db/users.ts

Exports:

- getUsers()
- getUserRoles()

Uses:

- users
- roles
- get_current_erp_user()
- create_erp_user_profile()
- update_erp_user_profile()
- unlocode_country_summary_view
- /api/master-data/unlocodes snapshot fallback as temporary rollback safety when canonical master data is unavailable
- service_transport_type_lookup_view
- service_transport_types is read-only from the application
- sales_accounting_concept_lookup_view
- create_sales_accounting_concept()
- update_sales_accounting_concept()
- delete_sales_accounting_concept()

UN/LOCODE standard:

- browse/select screens must stay on unlocode_lookup_view
- typeahead and filtered lookup must stay on search_unlocodes()
- country filters should come from unlocode_country_summary_view instead of hardcoded frontend lists
- future indexing improvements must preserve this frontend contract


frontend/src/lib/db/providers.ts

Exports:

- getProviders()
- getProviderSummaries()
- getProviderFull()
- createProvider()
- updateProvider()
- deleteProvider()
- createProviderContact()
- updateProviderContact()
- deleteProviderContact()
- createProviderServiceOffering()
- updateProviderServiceOffering()
- deleteProviderServiceOffering()

Uses:

- providers
- provider_contacts
- provider_service_offerings
- provider_overview_view
- provider_contacts_view
- provider_service_offering_view
- create_provider()
- add_contact_to_provider()
- get_provider_full()
- service_transport_type_lookup_view
- unlocode_lookup_view

Provider canonical fields:

- name
- tax_id
- provider_type
- corporate_phone
- company_email
- website
- full_address
- postal_code
- city_unlocode
- city_unlocode_id
- city
- country
- credit_active
- credit_amount
- credit_days
- status

Provider contact canonical fields:

- provider_id
- name
- email
- phone
- linkedin_url
- position
- status
- created_at
- updated_at

Provider service offering canonical fields:

- provider_id
- service_transport_type_id
- service_type
- transport_type
- terms_and_conditions
- created_at
- updated_at


--------------------------------------------------
APPROVED LIVE PATTERNS
--------------------------------------------------

Current approved patterns in the live frontend:

1. Use views for list screens:

- client_overview_view
- client_contacts_view
- open_opportunities_view
- provider_overview_view
- provider_contacts_view
- provider_service_offering_view

Current scale-safe behavior:

- contacts and opportunities list screens should push search/status filters into the backend query layer
- clients list screens should stay on client_overview_view for summary reads and search_clients() for canonical direct client lookup
- do not treat full dataset fetch + client-side filter as the target pattern once volumes grow

2. Use functions for creates and workflow-backed actions:

- create_client_with_contacts()
- add_contact_to_client()
- add_client_logistics_party()
- create_opportunity()
- create_provider()
- add_contact_to_provider()
- get_client_full()
- delete_client_logistics_party()
- get_provider_full()
- search_clients()
- soft_delete_client()

3. Use tables for simple detail reads and straightforward updates only when no canonical function or view is required.


--------------------------------------------------
CURRENT GAPS
--------------------------------------------------

No live query modules exist yet for:

- quotations
- shipments
- client invoices
- provider invoices
- commissions

AI must not import or reference:

- frontend/src/lib/db/quotations.ts
- frontend/src/lib/db/shipments.ts
- frontend/src/lib/db/invoices.ts

unless those files are actually created.

Canonical master data objects already available for future integration:

- unlocode_lookup_view
- search_unlocodes()
- service_transport_type_lookup_view
- service_transport_types is read-only from the application
- sales_accounting_concept_lookup_view
- create_sales_accounting_concept()
- update_sales_accounting_concept()
- delete_sales_accounting_concept()

Pricing integration rules:

- providers must reuse search_unlocodes() and unlocode_lookup_view for location standardization
- providers must reuse service_transport_type_lookup_view for offered services and service-specific terms
- provider contacts should mirror the current contact validation pattern for email, LinkedIn, and WhatsApp links


--------------------------------------------------
TYPE CONTRACT NOTE
--------------------------------------------------

frontend/src/types/supabase.ts is currently regenerated from the linked Supabase cloud backend.


--------------------------------------------------
MAINTENANCE RULE
--------------------------------------------------

Whenever a new query module is added:

1. update this file
2. verify the module follows AI_QUERY_GUIDE.md
3. verify matching routes exist before exposing the module in navigation
