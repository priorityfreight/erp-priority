-- =========================================
-- ERP SECURITY POLICIES
-- CANONICAL ACCESS CONTROL
-- =========================================
-- Authentication:
-- - Supabase Auth handles password verification and sessions.
-- - public.users stores ERP profile, role, username, and active status.
--
-- Authorization:
-- - all ERP data access requires an authenticated active ERP user
-- - admin-managed tables require erp_is_admin()
-- =========================================


-- =========================================
-- ORGANIZATION
-- =========================================

alter table branches enable row level security;
alter table roles enable row level security;
alter table users enable row level security;
alter table permission_modules enable row level security;
alter table permission_submodules enable row level security;
alter table permission_actions enable row level security;
alter table permission_conditions enable row level security;
alter table permission_resources enable row level security;
alter table permission_fields enable row level security;
alter table role_resource_permissions enable row level security;
alter table role_field_permissions enable row level security;
alter table branches force row level security;
alter table roles force row level security;
alter table users force row level security;
alter table permission_modules force row level security;
alter table permission_submodules force row level security;
alter table permission_actions force row level security;
alter table permission_conditions force row level security;
alter table permission_resources force row level security;
alter table permission_fields force row level security;
alter table role_resource_permissions force row level security;
alter table role_field_permissions force row level security;

create policy "active_select_branches"
on branches
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_branches"
on branches
for insert
with check (public.erp_is_admin());

create policy "admin_update_branches"
on branches
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_branches"
on branches
for delete
using (public.erp_is_admin());

create policy "active_select_roles"
on roles
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_roles"
on roles
for insert
with check (public.erp_is_admin());

create policy "admin_update_roles"
on roles
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_roles"
on roles
for delete
using (public.erp_is_admin());

create policy "active_select_users"
on users
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_users"
on users
for insert
with check (public.erp_is_admin());

create policy "admin_update_users"
on users
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_users"
on users
for delete
using (public.erp_is_admin());

create policy "active_select_permission_modules"
on permission_modules
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_permission_modules"
on permission_modules
for insert
with check (public.erp_is_admin());

create policy "admin_update_permission_modules"
on permission_modules
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_permission_modules"
on permission_modules
for delete
using (public.erp_is_admin());

create policy "active_select_permission_submodules"
on permission_submodules
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_permission_submodules"
on permission_submodules
for insert
with check (public.erp_is_admin());

create policy "admin_update_permission_submodules"
on permission_submodules
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_permission_submodules"
on permission_submodules
for delete
using (public.erp_is_admin());

create policy "active_select_permission_actions"
on permission_actions
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_permission_actions"
on permission_actions
for insert
with check (public.erp_is_admin());

create policy "admin_update_permission_actions"
on permission_actions
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_permission_actions"
on permission_actions
for delete
using (public.erp_is_admin());

create policy "active_select_permission_conditions"
on permission_conditions
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_permission_conditions"
on permission_conditions
for insert
with check (public.erp_is_admin());

create policy "admin_update_permission_conditions"
on permission_conditions
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_permission_conditions"
on permission_conditions
for delete
using (public.erp_is_admin());

create policy "active_select_permission_resources"
on permission_resources
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_permission_resources"
on permission_resources
for insert
with check (public.erp_is_admin());

create policy "admin_update_permission_resources"
on permission_resources
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_permission_resources"
on permission_resources
for delete
using (public.erp_is_admin());

create policy "active_select_permission_fields"
on permission_fields
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_permission_fields"
on permission_fields
for insert
with check (public.erp_is_admin());

create policy "admin_update_permission_fields"
on permission_fields
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_permission_fields"
on permission_fields
for delete
using (public.erp_is_admin());

create policy "role_select_role_resource_permissions"
on role_resource_permissions
for select
using (
  public.erp_is_admin()
  or role_id in (
    select u.role_id
    from public.users u
    where u.auth_user_id = auth.uid()
      and u.active = true
      and u.role_id is not null
  )
);

create policy "admin_insert_role_resource_permissions"
on role_resource_permissions
for insert
with check (public.erp_is_admin());

create policy "admin_update_role_resource_permissions"
on role_resource_permissions
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_role_resource_permissions"
on role_resource_permissions
for delete
using (public.erp_is_admin());

create policy "role_select_role_field_permissions"
on role_field_permissions
for select
using (
  public.erp_is_admin()
  or role_id in (
    select u.role_id
    from public.users u
    where u.auth_user_id = auth.uid()
      and u.active = true
      and u.role_id is not null
  )
);

create policy "admin_insert_role_field_permissions"
on role_field_permissions
for insert
with check (public.erp_is_admin());

create policy "admin_update_role_field_permissions"
on role_field_permissions
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_role_field_permissions"
on role_field_permissions
for delete
using (public.erp_is_admin());


-- =========================================
-- MASTER DATA
-- =========================================

alter table external_data_sources enable row level security;
alter table unlocodes enable row level security;
alter table service_transport_types enable row level security;
alter table sales_accounting_concepts enable row level security;
alter table incoterms enable row level security;
alter table external_data_sources force row level security;
alter table unlocodes force row level security;
alter table service_transport_types force row level security;
alter table sales_accounting_concepts force row level security;
alter table incoterms force row level security;

create policy "active_select_external_data_sources"
on external_data_sources
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_external_data_sources"
on external_data_sources
for insert
with check (public.erp_is_admin());

create policy "admin_update_external_data_sources"
on external_data_sources
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_external_data_sources"
on external_data_sources
for delete
using (public.erp_is_admin());

create policy "active_select_unlocodes"
on unlocodes
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_unlocodes"
on unlocodes
for insert
with check (public.erp_is_admin());

create policy "admin_update_unlocodes"
on unlocodes
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_unlocodes"
on unlocodes
for delete
using (public.erp_is_admin());

create policy "active_select_service_transport_types"
on service_transport_types
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_service_transport_types"
on service_transport_types
for insert
with check (public.erp_is_admin());

create policy "admin_update_service_transport_types"
on service_transport_types
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_service_transport_types"
on service_transport_types
for delete
using (public.erp_is_admin());

create policy "active_select_sales_accounting_concepts"
on sales_accounting_concepts
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_sales_accounting_concepts"
on sales_accounting_concepts
for insert
with check (public.erp_is_admin());

create policy "admin_update_sales_accounting_concepts"
on sales_accounting_concepts
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_sales_accounting_concepts"
on sales_accounting_concepts
for delete
using (public.erp_is_admin());

create policy "active_select_incoterms"
on incoterms
for select
using (public.erp_is_authenticated_active_user());

create policy "admin_insert_incoterms"
on incoterms
for insert
with check (public.erp_is_admin());

create policy "admin_update_incoterms"
on incoterms
for update
using (public.erp_is_admin())
with check (public.erp_is_admin());

create policy "admin_delete_incoterms"
on incoterms
for delete
using (public.erp_is_admin());


-- =========================================
-- CRM
-- =========================================

alter table prospects enable row level security;
alter table clients enable row level security;
alter table contacts enable row level security;
alter table client_logistics_parties enable row level security;
alter table prospects force row level security;
alter table clients force row level security;
alter table contacts force row level security;
alter table client_logistics_parties force row level security;

create policy "active_select_prospects"
on prospects
for select
using (public.erp_has_module_access('crm', 'view'));

create policy "active_insert_prospects"
on prospects
for insert
with check (public.erp_has_module_access('crm', 'create'));

create policy "active_update_prospects"
on prospects
for update
using (public.erp_has_module_access('crm', 'edit'))
with check (public.erp_has_module_access('crm', 'edit'));

create policy "active_delete_prospects"
on prospects
for delete
using (public.erp_has_module_access('crm', 'delete'));

create policy "active_select_clients"
on clients
for select
using (
  public.erp_can_access_client_resource(
    'crm.clients.list',
    'view',
    id
  )
);

create policy "active_insert_clients"
on clients
for insert
with check (public.erp_has_submodule_access('crm.clients', 'create'));

create policy "active_update_clients"
on clients
for update
using (
  public.erp_can_access_client_resource(
    'crm.clients.record',
    'edit',
    id
  )
)
with check (
  public.erp_can_access_client_resource(
    'crm.clients.record',
    'edit',
    id
  )
);

create policy "active_delete_clients"
on clients
for delete
using (
  public.erp_can_access_client_resource(
    'crm.clients.record',
    'delete',
    id
  )
);

create policy "active_select_contacts"
on contacts
for select
using (
  public.erp_can_access_client_resource(
    'crm.contacts.list',
    'view',
    client_id
  )
);

create policy "active_insert_contacts"
on contacts
for insert
with check (
  public.erp_can_access_client_resource(
    'crm.clients.record',
    'edit',
    client_id
  )
);

create policy "active_update_contacts"
on contacts
for update
using (
  public.erp_can_access_client_resource(
    'crm.contacts.record',
    'edit',
    client_id
  )
)
with check (
  public.erp_can_access_client_resource(
    'crm.contacts.record',
    'edit',
    client_id
  )
);

create policy "active_delete_contacts"
on contacts
for delete
using (
  public.erp_can_access_client_resource(
    'crm.contacts.record',
    'delete',
    client_id
  )
);

create policy "active_select_client_logistics_parties"
on client_logistics_parties
for select
using (
  public.erp_can_access_client_resource(
    'crm.clients.record',
    'view',
    client_id
  )
);

create policy "active_insert_client_logistics_parties"
on client_logistics_parties
for insert
with check (
  public.erp_can_access_client_resource(
    'crm.clients.record',
    'edit',
    client_id
  )
);

create policy "active_update_client_logistics_parties"
on client_logistics_parties
for update
using (
  public.erp_can_access_client_resource(
    'crm.clients.record',
    'edit',
    client_id
  )
)
with check (
  public.erp_can_access_client_resource(
    'crm.clients.record',
    'edit',
    client_id
  )
);

create policy "active_delete_client_logistics_parties"
on client_logistics_parties
for delete
using (
  public.erp_can_access_client_resource(
    'crm.clients.record',
    'delete',
    client_id
  )
);


-- =========================================
-- COMMERCIAL / PRICING
-- =========================================

alter table providers enable row level security;
alter table provider_contacts enable row level security;
alter table provider_service_offerings enable row level security;
alter table opportunities enable row level security;
alter table quotations enable row level security;
alter table quotation_costs enable row level security;
alter table quotation_cargo_lines enable row level security;
alter table quotation_rejection_reasons enable row level security;
alter table providers force row level security;
alter table provider_contacts force row level security;
alter table provider_service_offerings force row level security;
alter table opportunities force row level security;
alter table quotations force row level security;
alter table quotation_costs force row level security;
alter table quotation_cargo_lines force row level security;
alter table quotation_rejection_reasons force row level security;

create policy "active_select_providers"
on providers
for select
using (
  public.erp_has_submodule_access('pricing.providers', 'view')
  or public.erp_has_resource_access('crm.quotations.pricing_options', 'view')
);

create policy "active_insert_providers"
on providers
for insert
with check (public.erp_has_submodule_access('pricing.providers', 'create'));

create policy "active_update_providers"
on providers
for update
using (public.erp_has_submodule_access('pricing.providers', 'edit'))
with check (public.erp_has_submodule_access('pricing.providers', 'edit'));

create policy "active_delete_providers"
on providers
for delete
using (public.erp_has_submodule_access('pricing.providers', 'delete'));

create policy "active_select_provider_contacts"
on provider_contacts
for select
using (
  public.erp_has_submodule_access('pricing.providers', 'view')
  or public.erp_has_resource_access('crm.quotations.pricing_options', 'view')
);

create policy "active_insert_provider_contacts"
on provider_contacts
for insert
with check (public.erp_has_submodule_access('pricing.providers', 'create'));

create policy "active_update_provider_contacts"
on provider_contacts
for update
using (public.erp_has_submodule_access('pricing.providers', 'edit'))
with check (public.erp_has_submodule_access('pricing.providers', 'edit'));

create policy "active_delete_provider_contacts"
on provider_contacts
for delete
using (public.erp_has_submodule_access('pricing.providers', 'delete'));

create policy "active_select_provider_service_offerings"
on provider_service_offerings
for select
using (
  public.erp_has_submodule_access('pricing.providers', 'view')
  or public.erp_has_resource_access('crm.quotations.pricing_options', 'view')
);

create policy "active_insert_provider_service_offerings"
on provider_service_offerings
for insert
with check (public.erp_has_submodule_access('pricing.providers', 'create'));

create policy "active_update_provider_service_offerings"
on provider_service_offerings
for update
using (public.erp_has_submodule_access('pricing.providers', 'edit'))
with check (public.erp_has_submodule_access('pricing.providers', 'edit'));

create policy "active_delete_provider_service_offerings"
on provider_service_offerings
for delete
using (public.erp_has_submodule_access('pricing.providers', 'delete'));

create policy "active_select_opportunities"
on opportunities
for select
using (
  public.erp_can_access_opportunity_resource(
    'crm.opportunities.list',
    'view',
    salesperson_id,
    client_id
  )
);

create policy "active_insert_opportunities"
on opportunities
for insert
with check (
  public.erp_can_access_client_resource(
    'crm.clients.record',
    'edit',
    client_id
  )
);

create policy "active_update_opportunities"
on opportunities
for update
using (
  public.erp_can_access_opportunity_resource(
    'crm.opportunities.record',
    'edit',
    salesperson_id,
    client_id
  )
)
with check (
  public.erp_can_access_opportunity_resource(
    'crm.opportunities.record',
    'edit',
    salesperson_id,
    client_id
  )
);

create policy "active_delete_opportunities"
on opportunities
for delete
using (
  public.erp_can_access_opportunity_resource(
    'crm.opportunities.record',
    'delete',
    salesperson_id,
    client_id
  )
);

create policy "active_select_quotations"
on quotations
for select
using (
  public.erp_can_access_crm_quotation_resource(
    'crm.quotations.record',
    'view',
    created_by,
    client_id
  )
  or public.erp_can_access_pricing_quotation(
    'view',
    status,
    pricing_owner_id
  )
  or public.erp_can_access_operations_shipment(
    'view',
    client_id
  )
);

create policy "active_insert_quotations"
on quotations
for insert
with check (public.erp_has_submodule_access('crm.quotations', 'create'));

create policy "active_update_quotations"
on quotations
for update
using (
  public.erp_can_access_crm_quotation_resource(
    'crm.quotations.record',
    'edit',
    created_by,
    client_id
  )
  or public.erp_can_access_crm_quotation_resource(
    'crm.quotations.customer_actions',
    'edit',
    created_by,
    client_id
  )
  or public.erp_can_access_pricing_quotation(
    'edit',
    status,
    pricing_owner_id
  )
)
with check (
  public.erp_can_access_crm_quotation_resource(
    'crm.quotations.record',
    'edit',
    created_by,
    client_id
  )
  or public.erp_can_access_crm_quotation_resource(
    'crm.quotations.customer_actions',
    'edit',
    created_by,
    client_id
  )
  or public.erp_can_access_pricing_quotation(
    'edit',
    status,
    pricing_owner_id
  )
);

create policy "active_delete_quotations"
on quotations
for delete
using (
  public.erp_can_access_crm_quotation_resource(
    'crm.quotations.record',
    'delete',
    created_by,
    client_id
  )
);

create policy "active_select_quotation_costs"
on quotation_costs
for select
using (
  exists (
    select 1
    from quotations q
    where q.id = quotation_costs.quotation_id
      and (
        public.erp_has_resource_access(
          'pricing.quotations.cost_section',
          'view',
          q.pricing_owner_id,
          null
        )
        or public.erp_can_access_crm_quotation_resource(
          'crm.quotations.pricing_options',
          'view',
          q.created_by,
          q.client_id
        )
      )
  )
);

create policy "active_insert_quotation_costs"
on quotation_costs
for insert
with check (
  exists (
    select 1
    from quotations q
    where q.id = quotation_costs.quotation_id
      and public.erp_has_resource_access(
        'pricing.quotations.cost_section',
        'create',
        q.pricing_owner_id,
        null
      )
  )
);

create policy "active_update_quotation_costs"
on quotation_costs
for update
using (
  exists (
    select 1
    from quotations q
    where q.id = quotation_costs.quotation_id
      and public.erp_has_resource_access(
        'pricing.quotations.cost_section',
        'edit',
        q.pricing_owner_id,
        null
      )
  )
)
with check (
  exists (
    select 1
    from quotations q
    where q.id = quotation_costs.quotation_id
      and public.erp_has_resource_access(
        'pricing.quotations.cost_section',
        'edit',
        q.pricing_owner_id,
        null
      )
  )
);

create policy "active_delete_quotation_costs"
on quotation_costs
for delete
using (
  exists (
    select 1
    from quotations q
    where q.id = quotation_costs.quotation_id
      and public.erp_has_resource_access(
        'pricing.quotations.cost_section',
        'delete',
        q.pricing_owner_id,
        null
      )
  )
);

create policy "active_select_quotation_cargo_lines"
on quotation_cargo_lines
for select
using (
  exists (
    select 1
    from quotations q
    where q.id = quotation_cargo_lines.quotation_id
      and (
        public.erp_can_access_crm_quotation_resource(
          'crm.quotations.record',
          'view',
          q.created_by,
          q.client_id
        )
        or public.erp_can_access_pricing_quotation(
          'view',
          q.status,
          q.pricing_owner_id
        )
      )
  )
);

create policy "active_insert_quotation_cargo_lines"
on quotation_cargo_lines
for insert
with check (
  exists (
    select 1
    from quotations q
    where q.id = quotation_cargo_lines.quotation_id
      and public.erp_can_access_crm_quotation_resource(
        'crm.quotations.record',
        'edit',
        q.created_by,
        q.client_id
      )
  )
);

create policy "active_update_quotation_cargo_lines"
on quotation_cargo_lines
for update
using (
  exists (
    select 1
    from quotations q
    where q.id = quotation_cargo_lines.quotation_id
      and public.erp_can_access_crm_quotation_resource(
        'crm.quotations.record',
        'edit',
        q.created_by,
        q.client_id
      )
  )
)
with check (
  exists (
    select 1
    from quotations q
    where q.id = quotation_cargo_lines.quotation_id
      and public.erp_can_access_crm_quotation_resource(
        'crm.quotations.record',
        'edit',
        q.created_by,
        q.client_id
      )
  )
);

create policy "active_delete_quotation_cargo_lines"
on quotation_cargo_lines
for delete
using (
  exists (
    select 1
    from quotations q
    where q.id = quotation_cargo_lines.quotation_id
      and public.erp_can_access_crm_quotation_resource(
        'crm.quotations.record',
        'delete',
        q.created_by,
        q.client_id
      )
  )
);

create policy "active_select_quotation_rejection_reasons"
on quotation_rejection_reasons
for select
using (public.erp_is_authenticated_active_user());

create policy "active_insert_quotation_rejection_reasons"
on quotation_rejection_reasons
for insert
with check (public.erp_has_submodule_access('master_data.sales.rejection_reasons', 'create'));

create policy "active_update_quotation_rejection_reasons"
on quotation_rejection_reasons
for update
using (public.erp_has_submodule_access('master_data.sales.rejection_reasons', 'edit'))
with check (public.erp_has_submodule_access('master_data.sales.rejection_reasons', 'edit'));

create policy "active_delete_quotation_rejection_reasons"
on quotation_rejection_reasons
for delete
using (public.erp_has_submodule_access('master_data.sales.rejection_reasons', 'delete'));


-- =========================================
-- OPERATIONS / FINANCE
-- =========================================

alter table shipments enable row level security;
alter table shipment_events enable row level security;
alter table client_invoices enable row level security;
alter table provider_invoices enable row level security;
alter table commissions enable row level security;
alter table shipments force row level security;
alter table shipment_events force row level security;
alter table client_invoices force row level security;
alter table provider_invoices force row level security;
alter table commissions force row level security;

create policy "active_select_shipments"
on shipments
for select
using (
  public.erp_can_access_operations_shipment(
    'view',
    client_id
  )
  or public.erp_can_access_crm_quotation_resource(
    'crm.quotations.customer_actions',
    'view',
    (
      select q.created_by
      from quotations q
      where q.id = shipments.quotation_id
    ),
    client_id
  )
);

create policy "active_insert_shipments"
on shipments
for insert
with check (
  public.erp_can_access_operations_shipment(
    'create',
    client_id
  )
);

create policy "active_update_shipments"
on shipments
for update
using (
  public.erp_can_access_operations_shipment(
    'edit',
    client_id
  )
)
with check (
  public.erp_can_access_operations_shipment(
    'edit',
    client_id
  )
);

create policy "active_delete_shipments"
on shipments
for delete
using (
  public.erp_can_access_operations_shipment(
    'delete',
    client_id
  )
);

create policy "active_select_shipment_events"
on shipment_events
for select
using (
  exists (
    select 1
    from shipments s
    where s.id = shipment_events.shipment_id
      and public.erp_can_access_operations_shipment(
        'view',
        s.client_id
      )
  )
);

create policy "active_insert_shipment_events"
on shipment_events
for insert
with check (
  exists (
    select 1
    from shipments s
    where s.id = shipment_events.shipment_id
      and public.erp_can_access_operations_shipment(
        'create',
        s.client_id
      )
  )
);

create policy "active_update_shipment_events"
on shipment_events
for update
using (
  exists (
    select 1
    from shipments s
    where s.id = shipment_events.shipment_id
      and public.erp_can_access_operations_shipment(
        'edit',
        s.client_id
      )
  )
)
with check (
  exists (
    select 1
    from shipments s
    where s.id = shipment_events.shipment_id
      and public.erp_can_access_operations_shipment(
        'edit',
        s.client_id
      )
  )
);

create policy "active_delete_shipment_events"
on shipment_events
for delete
using (
  exists (
    select 1
    from shipments s
    where s.id = shipment_events.shipment_id
      and public.erp_can_access_operations_shipment(
        'delete',
        s.client_id
      )
  )
);

create policy "active_select_client_invoices"
on client_invoices
for select
using (
  public.erp_has_module_access('finance', 'view')
  or public.erp_is_admin()
);

create policy "active_insert_client_invoices"
on client_invoices
for insert
with check (
  public.erp_has_module_access('finance', 'create')
  or public.erp_is_admin()
);

create policy "active_update_client_invoices"
on client_invoices
for update
using (
  public.erp_has_module_access('finance', 'edit')
  or public.erp_is_admin()
)
with check (
  public.erp_has_module_access('finance', 'edit')
  or public.erp_is_admin()
);

create policy "active_delete_client_invoices"
on client_invoices
for delete
using (
  public.erp_has_module_access('finance', 'delete')
  or public.erp_is_admin()
);

create policy "active_select_provider_invoices"
on provider_invoices
for select
using (
  public.erp_has_module_access('finance', 'view')
  or public.erp_is_admin()
);

create policy "active_insert_provider_invoices"
on provider_invoices
for insert
with check (
  public.erp_has_module_access('finance', 'create')
  or public.erp_is_admin()
);

create policy "active_update_provider_invoices"
on provider_invoices
for update
using (
  public.erp_has_module_access('finance', 'edit')
  or public.erp_is_admin()
)
with check (
  public.erp_has_module_access('finance', 'edit')
  or public.erp_is_admin()
);

create policy "active_delete_provider_invoices"
on provider_invoices
for delete
using (
  public.erp_has_module_access('finance', 'delete')
  or public.erp_is_admin()
);

create policy "active_select_commissions"
on commissions
for select
using (
  public.erp_has_module_access('finance', 'view')
  or public.erp_is_admin()
);

create policy "active_insert_commissions"
on commissions
for insert
with check (
  public.erp_has_module_access('finance', 'create')
  or public.erp_is_admin()
);

create policy "active_update_commissions"
on commissions
for update
using (
  public.erp_has_module_access('finance', 'edit')
  or public.erp_is_admin()
)
with check (
  public.erp_has_module_access('finance', 'edit')
  or public.erp_is_admin()
);

create policy "active_delete_commissions"
on commissions
for delete
using (
  public.erp_has_module_access('finance', 'delete')
  or public.erp_is_admin()
);


-- =========================================
-- OBSERVABILITY
-- =========================================

alter table audit_logs enable row level security;
alter table automation_logs enable row level security;
alter table audit_logs force row level security;
alter table automation_logs force row level security;

create policy "admin_select_audit_logs"
on audit_logs
for select
using (public.erp_is_admin());

create policy "active_insert_audit_logs"
on audit_logs
for insert
with check (public.erp_is_authenticated_active_user());

create policy "admin_select_automation_logs"
on automation_logs
for select
using (public.erp_is_admin());

create policy "active_insert_automation_logs"
on automation_logs
for insert
with check (public.erp_is_authenticated_active_user());


-- =========================================
-- PRIVILEGE HARDENING
-- =========================================

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

revoke execute on all functions in schema public from anon;
grant execute on all functions in schema public to authenticated;
grant execute on function public.resolve_login_identity(text) to anon;
grant execute on function public.erp_current_branch_id() to authenticated;
grant execute on function public.erp_has_role(text) to authenticated;
grant execute on function public.erp_condition_allows(text, uuid, uuid) to authenticated;
grant execute on function public.erp_access_scope(text, text) to authenticated;
grant execute on function public.erp_has_resource_access(text, text, uuid, uuid) to authenticated;
grant execute on function public.erp_has_module_access(text, text) to authenticated;
grant execute on function public.erp_has_submodule_access(text, text) to authenticated;
grant execute on function public.erp_has_field_access(text, text, text, uuid, uuid) to authenticated;
grant execute on function public.erp_can_access_client_resource(text, text, uuid) to authenticated;
grant execute on function public.erp_can_access_opportunity_resource(text, text, uuid, uuid) to authenticated;
grant execute on function public.erp_can_access_crm_quotation_resource(text, text, uuid, uuid) to authenticated;
grant execute on function public.erp_can_access_pricing_quotation(text, text, uuid) to authenticated;
grant execute on function public.erp_can_access_operations_shipment(text, uuid) to authenticated;
grant execute on function public.erp_can_view_quotation_cost() to authenticated;
grant execute on function public.erp_can_edit_quotation_purchase_amount() to authenticated;
grant execute on function public.erp_can_view_quotation_sale_price() to authenticated;
grant execute on function public.erp_can_edit_quotation_sale_price() to authenticated;
grant execute on function public.erp_can_view_quotation_expected_profit() to authenticated;
grant execute on function public.erp_can_access_route(text, text) to authenticated;
grant execute on function public.get_current_navigation_items() to authenticated;
