# Live/Local Module Matrix

Generated at: `2026-03-27T18:30:21.048Z`

## Login y control de acceso

- Module id: `login-access`
- Routes: `/login`
- Entry files: `frontend/app/login/page.tsx`, `frontend/src/components/auth/LoginScreen.tsx`, `frontend/proxy.ts`
- Query files: `frontend/src/lib/auth.ts`, `frontend/src/lib/permissions/server.ts`, `frontend/src/lib/db/permissions.ts`
- API files: None
- RPCs: `erp_can_access_route`, `get_current_erp_user`, `get_current_navigation_items`, `link_current_auth_user`, `resolve_login_identity`
- Relations/views: `permission_actions`, `permission_conditions`, `permission_field_catalog_view`, `permission_resource_catalog_view`, `role_field_permission_matrix_view`, `role_field_permissions`, `role_resource_permission_matrix_view`, `role_resource_permissions`
- Direct mutations: None
- Permission notes: Gate global via proxy + erp_can_access_route(). Perfil actual via get_current_erp_user().

## Dashboard

- Module id: `dashboard`
- Routes: `/dashboard`
- Entry files: `frontend/app/dashboard/page.tsx`, `frontend/src/components/crm/CrmOverview.tsx`
- Query files: None
- API files: None
- RPCs: None
- Relations/views: None
- Direct mutations: None
- Permission notes: Acceso de ruta resuelto por proxy.

## Master Data / Users

- Module id: `master-data-users`
- Routes: `/master-data/users`
- Entry files: `frontend/app/master-data/users/page.tsx`, `frontend/src/components/master-data/UsersManager.tsx`
- Query files: `frontend/src/lib/db/users.ts`, `frontend/src/lib/permissions/server.ts`
- API files: `frontend/app/api/admin/users/route.ts`
- RPCs: `erp_can_access_route`, `get_current_erp_user`
- Relations/views: `roles`, `users`
- Direct mutations: None
- Permission notes: Server gate via ensureRouteAccessOrRedirect('/master-data/users'). Mutaciones sensibles pasan por /api/admin/users.

## Roles y permisos

- Module id: `roles-permissions`
- Routes: `/master-data/users/roles`
- Entry files: `frontend/app/master-data/users/roles/page.tsx`, `frontend/src/components/master-data/RolesPermissionsManager.tsx`
- Query files: `frontend/src/lib/db/permissions.ts`, `frontend/src/lib/permissions/server.ts`
- API files: None
- RPCs: `erp_can_access_route`, `get_current_erp_user`, `get_current_navigation_items`
- Relations/views: `permission_actions`, `permission_conditions`, `permission_field_catalog_view`, `permission_resource_catalog_view`, `role_field_permission_matrix_view`, `role_field_permissions`, `role_resource_permission_matrix_view`, `role_resource_permissions`
- Direct mutations: None
- Permission notes: Server gate via ensureRouteAccessOrRedirect('/master-data/users/roles'). Masking y acceso dependen de role_resource_permissions / role_field_permissions.

## Clients

- Module id: `clients`
- Routes: `/clients`
- Entry files: `frontend/app/clients/page.tsx`
- Query files: `frontend/src/lib/db/clients.ts`, `frontend/src/lib/db/users.ts`, `frontend/src/lib/db/backendMode.ts`
- API files: None
- RPCs: `add_client_logistics_party`, `create_client_with_contacts`, `delete_client_logistics_party`, `delete_client_record`, `get_client_full`, `search_clients`, `update_client_record`
- Relations/views: `client_logistics_parties`, `client_overview_view`, `clients`, `contacts`, `opportunities`, `roles`, `unlocode_lookup_view`, `users`
- Direct mutations: `delete:clients`, `delete:contacts`, `delete:opportunities`, `insert:clients`, `update:clients`
- Permission notes: Acceso por proxy + RLS de clients. Owner visibility depende de reglas owner_only activadas en backend.

## Client detail

- Module id: `client-detail`
- Routes: `/clients/[id]`
- Entry files: `frontend/app/clients/[id]/page.tsx`
- Query files: `frontend/src/lib/db/clients.ts`, `frontend/src/lib/db/contacts.ts`, `frontend/src/lib/db/opportunities.ts`, `frontend/src/lib/db/masterData.ts`, `frontend/src/lib/db/users.ts`, `frontend/src/lib/db/backendMode.ts`
- API files: None
- RPCs: `add_client_logistics_party`, `add_contact_to_client`, `create_client_with_contacts`, `create_exchange_rate`, `create_opportunity`, `create_quotation_rejection_reason`, `create_sales_accounting_concept`, `create_service_transport_type`, `delete_client_logistics_party`, `delete_client_record`, `delete_contact_record`, `delete_exchange_rate`, `delete_opportunity_record`, `delete_quotation_rejection_reason`, `delete_sales_accounting_concept`, `delete_service_transport_type`, `get_client_full`, `search_clients`, `search_unlocodes`, `sync_expired_opportunities`, `update_client_record`, `update_contact_record`, `update_exchange_rate`, `update_opportunity_record`, `update_opportunity_status`, `update_quotation_rejection_reason`, `update_sales_accounting_concept`, `update_service_transport_type`
- Relations/views: `client_contacts_view`, `client_logistics_parties`, `client_overview_view`, `clients`, `contacts`, `exchange_rates`, `incoterms`, `open_opportunities_view`, `opportunities`, `quotation_rejection_reason_lookup_view`, `roles`, `sales_accounting_concept_lookup_view`, `service_transport_type_lookup_view`, `unlocode_country_summary_view`, `unlocode_lookup_view`, `users`
- Direct mutations: `delete:clients`, `delete:contacts`, `delete:opportunities`, `insert:clients`, `insert:contacts`, `insert:opportunities`, `update:clients`
- Permission notes: Acceso por proxy + RLS derivado del client. Incluye logistics parties como subflujo live del detalle.

## Contacts

- Module id: `contacts`
- Routes: `/contacts`
- Entry files: `frontend/app/contacts/page.tsx`
- Query files: `frontend/src/lib/db/contacts.ts`, `frontend/src/lib/db/clients.ts`, `frontend/src/lib/db/backendMode.ts`
- API files: None
- RPCs: `add_client_logistics_party`, `add_contact_to_client`, `create_client_with_contacts`, `delete_client_logistics_party`, `delete_client_record`, `delete_contact_record`, `get_client_full`, `search_clients`, `update_client_record`, `update_contact_record`
- Relations/views: `client_contacts_view`, `client_logistics_parties`, `client_overview_view`, `clients`, `contacts`, `opportunities`, `unlocode_lookup_view`
- Direct mutations: `delete:clients`, `delete:contacts`, `delete:opportunities`, `insert:clients`, `insert:contacts`, `update:clients`
- Permission notes: Acceso por proxy + RLS de contacts derivado del client.

## Opportunities

- Module id: `opportunities`
- Routes: `/opportunities`
- Entry files: `frontend/app/opportunities/page.tsx`
- Query files: `frontend/src/lib/db/opportunities.ts`, `frontend/src/lib/db/clients.ts`, `frontend/src/lib/db/masterData.ts`, `frontend/src/lib/db/users.ts`, `frontend/src/lib/db/backendMode.ts`
- API files: None
- RPCs: `add_client_logistics_party`, `create_client_with_contacts`, `create_exchange_rate`, `create_opportunity`, `create_quotation_rejection_reason`, `create_sales_accounting_concept`, `create_service_transport_type`, `delete_client_logistics_party`, `delete_client_record`, `delete_exchange_rate`, `delete_opportunity_record`, `delete_quotation_rejection_reason`, `delete_sales_accounting_concept`, `delete_service_transport_type`, `get_client_full`, `search_clients`, `search_unlocodes`, `sync_expired_opportunities`, `update_client_record`, `update_exchange_rate`, `update_opportunity_record`, `update_opportunity_status`, `update_quotation_rejection_reason`, `update_sales_accounting_concept`, `update_service_transport_type`
- Relations/views: `client_logistics_parties`, `client_overview_view`, `clients`, `contacts`, `exchange_rates`, `incoterms`, `open_opportunities_view`, `opportunities`, `quotation_rejection_reason_lookup_view`, `roles`, `sales_accounting_concept_lookup_view`, `service_transport_type_lookup_view`, `unlocode_country_summary_view`, `unlocode_lookup_view`, `users`
- Direct mutations: `delete:clients`, `delete:contacts`, `delete:opportunities`, `insert:clients`, `insert:opportunities`, `update:clients`
- Permission notes: Acceso por proxy + owner visibility sobre salesperson_id.

## Opportunity detail

- Module id: `opportunity-detail`
- Routes: `/opportunities/[id]`
- Entry files: `frontend/app/opportunities/[id]/page.tsx`
- Query files: `frontend/src/lib/db/opportunities.ts`, `frontend/src/lib/db/quotations.ts`, `frontend/src/lib/db/masterData.ts`, `frontend/src/lib/db/users.ts`, `frontend/src/lib/db/backendMode.ts`
- API files: None
- RPCs: `create_booking_from_quotation`, `create_exchange_rate`, `create_opportunity`, `create_quotation_cargo_line`, `create_quotation_cost_line`, `create_quotation_from_opportunity`, `create_quotation_rejection_reason`, `create_sales_accounting_concept`, `create_service_transport_type`, `delete_exchange_rate`, `delete_opportunity_record`, `delete_quotation_cargo_line`, `delete_quotation_cost_line`, `delete_quotation_rejection_reason`, `delete_sales_accounting_concept`, `delete_service_transport_type`, `request_quotation_pricing`, `save_quotation_purchase_option`, `search_quotations`, `search_unlocodes`, `set_quotation_option_customer_visibility`, `sync_expired_opportunities`, `take_quotation_for_pricing`, `update_exchange_rate`, `update_opportunity_record`, `update_opportunity_status`, `update_quotation_cargo_line`, `update_quotation_cost_line`, `update_quotation_option_sales_amounts`, `update_quotation_option_validity`, `update_quotation_record`, `update_quotation_rejection_reason`, `update_quotation_status`, `update_sales_accounting_concept`, `update_service_transport_type`
- Relations/views: `client_overview_view`, `clients`, `exchange_rates`, `incoterms`, `open_opportunities_view`, `opportunities`, `quotation_cargo_lines`, `quotation_cost_line_secure_view`, `quotation_rejection_reason_lookup_view`, `quotation_summary_view`, `roles`, `sales_accounting_concept_lookup_view`, `service_transport_type_lookup_view`, `shipments`, `unlocode_country_summary_view`, `unlocode_lookup_view`, `users`
- Direct mutations: `insert:opportunities`
- Permission notes: Acceso por proxy + owner visibility. Create quotation usa create_quotation_from_opportunity().

## Quotations

- Module id: `quotations`
- Routes: `/quotations`
- Entry files: `frontend/app/quotations/page.tsx`
- Query files: `frontend/src/lib/db/quotations.ts`
- API files: None
- RPCs: `create_booking_from_quotation`, `create_quotation_cargo_line`, `create_quotation_cost_line`, `create_quotation_from_opportunity`, `delete_quotation_cargo_line`, `delete_quotation_cost_line`, `request_quotation_pricing`, `save_quotation_purchase_option`, `search_quotations`, `set_quotation_option_customer_visibility`, `take_quotation_for_pricing`, `update_quotation_cargo_line`, `update_quotation_cost_line`, `update_quotation_option_sales_amounts`, `update_quotation_option_validity`, `update_quotation_record`, `update_quotation_status`
- Relations/views: `quotation_cargo_lines`, `quotation_cost_line_secure_view`, `quotation_summary_view`, `shipments`
- Direct mutations: None
- Permission notes: Listado usa search_quotations() y quotation_summary_view. Masking economico depende de quotation_summary_view.

## Quotation detail

- Module id: `quotation-detail`
- Routes: `/quotations/[id]`
- Entry files: `frontend/app/quotations/[id]/page.tsx`, `frontend/src/components/forms/QuotationForm.tsx`, `frontend/src/components/forms/QuotationCargoLineForm.tsx`, `frontend/src/components/forms/QuotationChargeLineForm.tsx`
- Query files: `frontend/src/lib/db/quotations.ts`, `frontend/src/lib/db/masterData.ts`, `frontend/src/lib/auth.ts`
- API files: None
- RPCs: `create_booking_from_quotation`, `create_exchange_rate`, `create_quotation_cargo_line`, `create_quotation_cost_line`, `create_quotation_from_opportunity`, `create_quotation_rejection_reason`, `create_sales_accounting_concept`, `create_service_transport_type`, `delete_exchange_rate`, `delete_quotation_cargo_line`, `delete_quotation_cost_line`, `delete_quotation_rejection_reason`, `delete_sales_accounting_concept`, `delete_service_transport_type`, `get_current_erp_user`, `link_current_auth_user`, `request_quotation_pricing`, `resolve_login_identity`, `save_quotation_purchase_option`, `search_quotations`, `search_unlocodes`, `set_quotation_option_customer_visibility`, `take_quotation_for_pricing`, `update_exchange_rate`, `update_quotation_cargo_line`, `update_quotation_cost_line`, `update_quotation_option_sales_amounts`, `update_quotation_option_validity`, `update_quotation_record`, `update_quotation_rejection_reason`, `update_quotation_status`, `update_sales_accounting_concept`, `update_service_transport_type`
- Relations/views: `exchange_rates`, `incoterms`, `quotation_cargo_lines`, `quotation_cost_line_secure_view`, `quotation_rejection_reason_lookup_view`, `quotation_summary_view`, `sales_accounting_concept_lookup_view`, `service_transport_type_lookup_view`, `shipments`, `unlocode_country_summary_view`, `unlocode_lookup_view`
- Direct mutations: None
- Permission notes: Acceso por proxy + masking en quotation_summary_view / quotation_cost_line_secure_view. Incluye create booking como subflujo live dependiente.

## Customer document preview y PDF

- Module id: `customer-document`
- Routes: `/quotations/[id]/document`, `/quotations/[id]/document/pdf`
- Entry files: `frontend/app/quotations/[id]/document/page.tsx`, `frontend/app/quotations/[id]/document/pdf/route.ts`, `frontend/src/components/quotations/CustomerQuotationPdf.tsx`
- Query files: `frontend/src/lib/db/quotations.ts`
- API files: None
- RPCs: `create_booking_from_quotation`, `create_quotation_cargo_line`, `create_quotation_cost_line`, `create_quotation_from_opportunity`, `delete_quotation_cargo_line`, `delete_quotation_cost_line`, `request_quotation_pricing`, `save_quotation_purchase_option`, `search_quotations`, `set_quotation_option_customer_visibility`, `take_quotation_for_pricing`, `update_quotation_cargo_line`, `update_quotation_cost_line`, `update_quotation_option_sales_amounts`, `update_quotation_option_validity`, `update_quotation_record`, `update_quotation_status`
- Relations/views: `quotation_cargo_lines`, `quotation_cost_line_secure_view`, `quotation_summary_view`, `shipments`
- Direct mutations: None
- Permission notes: Debe permanecer sincronizado con quotation_summary_view y opciones customer-facing.

## Pricing request preview y PDF

- Module id: `pricing-request`
- Routes: `/quotations/[id]/pricing-request`, `/quotations/[id]/pricing-request/pdf`
- Entry files: `frontend/app/quotations/[id]/pricing-request/page.tsx`, `frontend/app/quotations/[id]/pricing-request/pdf/route.ts`, `frontend/src/components/quotations/ProviderPricingRequestPdf.tsx`
- Query files: `frontend/src/lib/db/quotations.ts`
- API files: None
- RPCs: `create_booking_from_quotation`, `create_quotation_cargo_line`, `create_quotation_cost_line`, `create_quotation_from_opportunity`, `delete_quotation_cargo_line`, `delete_quotation_cost_line`, `request_quotation_pricing`, `save_quotation_purchase_option`, `search_quotations`, `set_quotation_option_customer_visibility`, `take_quotation_for_pricing`, `update_quotation_cargo_line`, `update_quotation_cost_line`, `update_quotation_option_sales_amounts`, `update_quotation_option_validity`, `update_quotation_record`, `update_quotation_status`
- Relations/views: `quotation_cargo_lines`, `quotation_cost_line_secure_view`, `quotation_summary_view`, `shipments`
- Direct mutations: None
- Permission notes: Debe ocultar cliente y montos comerciales.

## Pricing / Providers

- Module id: `pricing-providers`
- Routes: `/pricing/providers`
- Entry files: `frontend/app/pricing/providers/page.tsx`
- Query files: `frontend/src/lib/db/providers.ts`, `frontend/src/lib/db/masterData.ts`
- API files: None
- RPCs: `add_contact_to_provider`, `create_exchange_rate`, `create_provider`, `create_provider_service_offering_record`, `create_quotation_rejection_reason`, `create_sales_accounting_concept`, `create_service_transport_type`, `delete_exchange_rate`, `delete_provider_contact_record`, `delete_provider_record`, `delete_provider_service_offering_record`, `delete_quotation_rejection_reason`, `delete_sales_accounting_concept`, `delete_service_transport_type`, `get_provider_full`, `search_unlocodes`, `update_exchange_rate`, `update_provider_contact_record`, `update_provider_record`, `update_provider_service_offering_record`, `update_quotation_rejection_reason`, `update_sales_accounting_concept`, `update_service_transport_type`
- Relations/views: `exchange_rates`, `incoterms`, `provider_contacts`, `provider_contacts_view`, `provider_overview_view`, `provider_service_offering_view`, `providers`, `quotation_rejection_reason_lookup_view`, `sales_accounting_concept_lookup_view`, `service_transport_type_lookup_view`, `unlocode_country_summary_view`, `unlocode_lookup_view`
- Direct mutations: None
- Permission notes: Acceso por proxy + RLS de providers.

## Pricing / Provider detail

- Module id: `pricing-provider-detail`
- Routes: `/pricing/providers/[id]`
- Entry files: `frontend/app/pricing/providers/[id]/page.tsx`
- Query files: `frontend/src/lib/db/providers.ts`, `frontend/src/lib/db/masterData.ts`
- API files: None
- RPCs: `add_contact_to_provider`, `create_exchange_rate`, `create_provider`, `create_provider_service_offering_record`, `create_quotation_rejection_reason`, `create_sales_accounting_concept`, `create_service_transport_type`, `delete_exchange_rate`, `delete_provider_contact_record`, `delete_provider_record`, `delete_provider_service_offering_record`, `delete_quotation_rejection_reason`, `delete_sales_accounting_concept`, `delete_service_transport_type`, `get_provider_full`, `search_unlocodes`, `update_exchange_rate`, `update_provider_contact_record`, `update_provider_record`, `update_provider_service_offering_record`, `update_quotation_rejection_reason`, `update_sales_accounting_concept`, `update_service_transport_type`
- Relations/views: `exchange_rates`, `incoterms`, `provider_contacts`, `provider_contacts_view`, `provider_overview_view`, `provider_service_offering_view`, `providers`, `quotation_rejection_reason_lookup_view`, `sales_accounting_concept_lookup_view`, `service_transport_type_lookup_view`, `unlocode_country_summary_view`, `unlocode_lookup_view`
- Direct mutations: None
- Permission notes: Acceso por proxy + RLS de providers/provider_contacts/provider_service_offerings.

## Pricing / Quotations

- Module id: `pricing-quotations`
- Routes: `/pricing/quotations`
- Entry files: `frontend/app/pricing/quotations/page.tsx`
- Query files: `frontend/src/lib/db/quotations.ts`, `frontend/src/lib/db/providers.ts`, `frontend/src/lib/db/masterData.ts`
- API files: None
- RPCs: `add_contact_to_provider`, `create_booking_from_quotation`, `create_exchange_rate`, `create_provider`, `create_provider_service_offering_record`, `create_quotation_cargo_line`, `create_quotation_cost_line`, `create_quotation_from_opportunity`, `create_quotation_rejection_reason`, `create_sales_accounting_concept`, `create_service_transport_type`, `delete_exchange_rate`, `delete_provider_contact_record`, `delete_provider_record`, `delete_provider_service_offering_record`, `delete_quotation_cargo_line`, `delete_quotation_cost_line`, `delete_quotation_rejection_reason`, `delete_sales_accounting_concept`, `delete_service_transport_type`, `get_provider_full`, `request_quotation_pricing`, `save_quotation_purchase_option`, `search_quotations`, `search_unlocodes`, `set_quotation_option_customer_visibility`, `take_quotation_for_pricing`, `update_exchange_rate`, `update_provider_contact_record`, `update_provider_record`, `update_provider_service_offering_record`, `update_quotation_cargo_line`, `update_quotation_cost_line`, `update_quotation_option_sales_amounts`, `update_quotation_option_validity`, `update_quotation_record`, `update_quotation_rejection_reason`, `update_quotation_status`, `update_sales_accounting_concept`, `update_service_transport_type`
- Relations/views: `exchange_rates`, `incoterms`, `provider_contacts`, `provider_contacts_view`, `provider_overview_view`, `provider_service_offering_view`, `providers`, `quotation_cargo_lines`, `quotation_cost_line_secure_view`, `quotation_rejection_reason_lookup_view`, `quotation_summary_view`, `sales_accounting_concept_lookup_view`, `service_transport_type_lookup_view`, `shipments`, `unlocode_country_summary_view`, `unlocode_lookup_view`
- Direct mutations: None
- Permission notes: Usa take_quotation_for_pricing() y save_quotation_purchase_option(). Masking economico parcial por vistas seguras.

## Master Data shell

- Module id: `master-data-shell`
- Routes: `/master-data`
- Entry files: `frontend/app/master-data/page.tsx`, `frontend/src/components/master-data/MasterDataOverview.tsx`
- Query files: None
- API files: None
- RPCs: None
- Relations/views: None
- Direct mutations: None
- Permission notes: Acceso por proxy.

## Service transport types

- Module id: `service-types`
- Routes: `/master-data/sales/service-types`
- Entry files: `frontend/app/master-data/sales/service-types/page.tsx`, `frontend/src/components/master-data/ServiceTransportTypeManager.tsx`
- Query files: `frontend/src/lib/db/masterData.ts`
- API files: None
- RPCs: `create_exchange_rate`, `create_quotation_rejection_reason`, `create_sales_accounting_concept`, `create_service_transport_type`, `delete_exchange_rate`, `delete_quotation_rejection_reason`, `delete_sales_accounting_concept`, `delete_service_transport_type`, `search_unlocodes`, `update_exchange_rate`, `update_quotation_rejection_reason`, `update_sales_accounting_concept`, `update_service_transport_type`
- Relations/views: `exchange_rates`, `incoterms`, `quotation_rejection_reason_lookup_view`, `sales_accounting_concept_lookup_view`, `service_transport_type_lookup_view`, `unlocode_country_summary_view`, `unlocode_lookup_view`
- Direct mutations: None
- Permission notes: CRUD via create/update/delete_service_transport_type().

## Sales accounting concepts

- Module id: `accounting-concepts`
- Routes: `/master-data/sales/accounting-concepts`
- Entry files: `frontend/app/master-data/sales/accounting-concepts/page.tsx`, `frontend/src/components/master-data/SalesAccountingConceptManager.tsx`
- Query files: `frontend/src/lib/db/masterData.ts`
- API files: None
- RPCs: `create_exchange_rate`, `create_quotation_rejection_reason`, `create_sales_accounting_concept`, `create_service_transport_type`, `delete_exchange_rate`, `delete_quotation_rejection_reason`, `delete_sales_accounting_concept`, `delete_service_transport_type`, `search_unlocodes`, `update_exchange_rate`, `update_quotation_rejection_reason`, `update_sales_accounting_concept`, `update_service_transport_type`
- Relations/views: `exchange_rates`, `incoterms`, `quotation_rejection_reason_lookup_view`, `sales_accounting_concept_lookup_view`, `service_transport_type_lookup_view`, `unlocode_country_summary_view`, `unlocode_lookup_view`
- Direct mutations: None
- Permission notes: CRUD via create/update/delete_sales_accounting_concept().

## Quotation rejection reasons

- Module id: `quotation-rejection-reasons`
- Routes: `/master-data/sales/quotation-rejection-reasons`
- Entry files: `frontend/app/master-data/sales/quotation-rejection-reasons/page.tsx`, `frontend/src/components/master-data/QuotationRejectionReasonManager.tsx`
- Query files: `frontend/src/lib/db/masterData.ts`
- API files: None
- RPCs: `create_exchange_rate`, `create_quotation_rejection_reason`, `create_sales_accounting_concept`, `create_service_transport_type`, `delete_exchange_rate`, `delete_quotation_rejection_reason`, `delete_sales_accounting_concept`, `delete_service_transport_type`, `search_unlocodes`, `update_exchange_rate`, `update_quotation_rejection_reason`, `update_sales_accounting_concept`, `update_service_transport_type`
- Relations/views: `exchange_rates`, `incoterms`, `quotation_rejection_reason_lookup_view`, `sales_accounting_concept_lookup_view`, `service_transport_type_lookup_view`, `unlocode_country_summary_view`, `unlocode_lookup_view`
- Direct mutations: None
- Permission notes: CRUD via create/update/delete_quotation_rejection_reason().

## Exchange rates

- Module id: `exchange-rates`
- Routes: `/master-data/accounting/exchange-rates`, `/api/admin/exchange-rates/sync`, `/api/cron/exchange-rates`
- Entry files: `frontend/app/master-data/accounting/exchange-rates/page.tsx`, `frontend/src/components/master-data/ExchangeRateManager.tsx`
- Query files: `frontend/src/lib/db/masterData.ts`
- API files: `frontend/app/api/admin/exchange-rates/sync/route.ts`, `frontend/app/api/cron/exchange-rates/route.ts`
- RPCs: `create_exchange_rate`, `create_quotation_rejection_reason`, `create_sales_accounting_concept`, `create_service_transport_type`, `delete_exchange_rate`, `delete_quotation_rejection_reason`, `delete_sales_accounting_concept`, `delete_service_transport_type`, `search_unlocodes`, `update_exchange_rate`, `update_quotation_rejection_reason`, `update_sales_accounting_concept`, `update_service_transport_type`
- Relations/views: `exchange_rates`, `incoterms`, `quotation_rejection_reason_lookup_view`, `sales_accounting_concept_lookup_view`, `service_transport_type_lookup_view`, `unlocode_country_summary_view`, `unlocode_lookup_view`
- Direct mutations: None
- Permission notes: Server gate en ruta live + sync admin path protegido.

## UN/LOCODE lookup

- Module id: `unlocode`
- Routes: `/master-data/unlocode`, `/api/master-data/unlocodes`
- Entry files: `frontend/app/master-data/unlocode/page.tsx`, `frontend/src/components/master-data/UnlocodeExplorer.tsx`
- Query files: `frontend/src/lib/db/masterData.ts`, `frontend/src/lib/masterData/unlocodeSnapshot.ts`, `frontend/src/lib/db/backendMode.ts`
- API files: `frontend/app/api/master-data/unlocodes/route.ts`
- RPCs: `create_exchange_rate`, `create_quotation_rejection_reason`, `create_sales_accounting_concept`, `create_service_transport_type`, `delete_exchange_rate`, `delete_quotation_rejection_reason`, `delete_sales_accounting_concept`, `delete_service_transport_type`, `search_unlocodes`, `update_exchange_rate`, `update_quotation_rejection_reason`, `update_sales_accounting_concept`, `update_service_transport_type`
- Relations/views: `client_overview_view`, `exchange_rates`, `incoterms`, `quotation_rejection_reason_lookup_view`, `sales_accounting_concept_lookup_view`, `service_transport_type_lookup_view`, `unlocode_country_summary_view`, `unlocode_lookup_view`
- Direct mutations: None
- Permission notes: Canonical contract via unlocode_lookup_view + search_unlocodes(). Snapshot fallback sigue presente como rollback safety.
