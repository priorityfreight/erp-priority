insert into roles (
  name,
  description
)
values
  ('Ventas', 'Commercial CRM and client ownership users'),
  ('Pricing', 'Provider and pricing users'),
  ('Operaciones', 'Operational shipment users'),
  ('Admin', 'ERP administrators')
on conflict (name) do update
set description = excluded.description;

insert into permission_modules (
  code,
  name,
  icon_key,
  sort_order,
  active
)
values
  ('dashboard', 'Dashboard', 'home', 10, true),
  ('crm', 'CRM', 'briefcase', 20, true),
  ('pricing', 'Pricing', 'calculator', 30, true),
  ('operations', 'Operations', 'package', 40, true),
  ('master_data', 'Master Data', 'database', 50, true),
  ('finance', 'Finance', 'wallet', 60, false)
on conflict (code) do update
set
  name = excluded.name,
  icon_key = excluded.icon_key,
  sort_order = excluded.sort_order,
  active = excluded.active;

insert into permission_submodules (
  module_id,
  code,
  name,
  route_path,
  route_matchers,
  sort_order,
  active
)
select
  pm.id,
  data.code,
  data.name,
  data.route_path,
  data.route_matchers,
  data.sort_order,
  data.active
from permission_modules pm
join (
  values
    ('dashboard', 'dashboard.home', 'Dashboard', '/', array['/', '/dashboard']::text[], 10, true),
    ('crm', 'crm.clients', 'Clients', '/clients', array['/clients']::text[], 10, true),
    ('crm', 'crm.contacts', 'Contacts', '/contacts', array['/contacts']::text[], 20, true),
    ('crm', 'crm.opportunities', 'Opportunities', '/opportunities', array['/opportunities']::text[], 30, true),
    ('crm', 'crm.quotations', 'Quotations', '/quotations', array['/quotations']::text[], 40, true),
    ('crm', 'crm.email', 'Email', '/mail', array['/mail']::text[], 50, true),
    ('pricing', 'pricing.providers', 'Providers', '/pricing/providers', array['/pricing/providers']::text[], 10, true),
    ('pricing', 'pricing.quotations', 'Pricing Quotations', '/pricing/quotations', array['/pricing/quotations', '/quotations']::text[], 20, true),
    ('operations', 'operations.shipments', 'Shipments', '/shipments', array['/shipments']::text[], 10, false),
    ('operations', 'operations.bookings', 'Bookings', '/bookings', array['/bookings']::text[], 20, false),
    ('master_data', 'master_data.overview', 'Master Data', '/master-data', array['/master-data']::text[], 10, true),
    ('master_data', 'master_data.users', 'Users', '/master-data/users', array['/master-data/users']::text[], 20, true),
    ('master_data', 'master_data.roles', 'Roles & Permissions', '/master-data/users/roles', array['/master-data/users/roles']::text[], 30, true),
    ('master_data', 'master_data.mail', 'Mail', '/master-data/mail', array['/master-data/mail']::text[], 35, true),
    ('master_data', 'master_data.sales.service_types', 'Ventas / Tipos de servicio', '/master-data/sales/service-types', array['/master-data/sales/service-types']::text[], 40, true),
    ('master_data', 'master_data.sales.accounting_concepts', 'Ventas / Conceptos contables', '/master-data/sales/accounting-concepts', array['/master-data/sales/accounting-concepts']::text[], 50, true),
    ('master_data', 'master_data.sales.rejection_reasons', 'Ventas / Motivos rechazo', '/master-data/sales/quotation-rejection-reasons', array['/master-data/sales/quotation-rejection-reasons']::text[], 60, true),
    ('master_data', 'master_data.unlocode', 'UN/LOCODE', '/master-data/unlocode', array['/master-data/unlocode']::text[], 70, true),
    ('master_data', 'master_data.accounting.exchange_rates', 'Contabilidad / Tipo de cambio', '/master-data/accounting/exchange-rates', array['/master-data/accounting/exchange-rates']::text[], 80, true),
    ('finance', 'finance.client_invoices', 'Client Invoices', '/finance/client-invoices', array['/finance/client-invoices']::text[], 10, false),
    ('finance', 'finance.provider_invoices', 'Provider Invoices', '/finance/provider-invoices', array['/finance/provider-invoices']::text[], 20, false),
    ('finance', 'finance.commissions', 'Commissions', '/finance/commissions', array['/finance/commissions']::text[], 30, false)
) as data(module_code, code, name, route_path, route_matchers, sort_order, active)
  on data.module_code = pm.code
on conflict (code) do update
set
  module_id = excluded.module_id,
  name = excluded.name,
  route_path = excluded.route_path,
  route_matchers = excluded.route_matchers,
  sort_order = excluded.sort_order,
  active = excluded.active;

insert into permission_actions (
  code,
  name,
  scope_type,
  active
)
values
  ('view', 'View', 'both', true),
  ('create', 'Create', 'resource', true),
  ('edit', 'Edit', 'both', true),
  ('delete', 'Delete', 'resource', true),
  ('approve', 'Approve', 'resource', true),
  ('assign', 'Assign', 'resource', true),
  ('export', 'Export', 'resource', true),
  ('pricing_take', 'Pricing Take', 'resource', true),
  ('send_quote', 'Send Quote', 'resource', true),
  ('create_booking', 'Create Booking', 'resource', true),
  ('manage_permissions', 'Manage Permissions', 'resource', true)
on conflict (code) do update
set
  name = excluded.name,
  scope_type = excluded.scope_type,
  active = excluded.active;

insert into permission_conditions (
  code,
  name,
  description
)
values
  ('all', 'All', 'Full access to all matching records.'),
  ('owner_only', 'Owner Only', 'Only records owned by the current ERP user.'),
  ('assigned_branch_only', 'Assigned Branch Only', 'Only records linked to the current user branch.'),
  ('none', 'None', 'No access.')
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description;

insert into permission_resources (
  module_id,
  submodule_id,
  resource_key,
  name,
  resource_type,
  resource_group,
  table_name,
  view_name,
  rpc_name,
  entity_owner_field,
  entity_branch_field,
  sort_order,
  active
)
select
  pm.id,
  ps.id,
  data.resource_key,
  data.name,
  data.resource_type,
  data.resource_group,
  data.table_name,
  data.view_name,
  data.rpc_name,
  data.entity_owner_field,
  data.entity_branch_field,
  data.sort_order,
  data.active
from permission_modules pm
join (
  values
    ('dashboard', 'dashboard.home', 'dashboard', 'Dashboard Module', 'module', 'Navigation', null, null, null, null, null, 10, true),
    ('dashboard', 'dashboard.home', 'dashboard.home', 'Dashboard Home', 'submodule', 'Navigation', null, null, null, null, null, 20, true),
    ('crm', null, 'crm', 'CRM Module', 'module', 'Navigation', null, null, null, null, null, 10, true),
    ('crm', 'crm.clients', 'crm.clients', 'Clients', 'submodule', 'Navigation', 'clients', 'client_overview_view', null, 'account_owner_id', 'branch_id', 20, true),
    ('crm', 'crm.clients', 'crm.clients.list', 'Client List', 'resource', 'Data Access', 'clients', 'client_overview_view', 'search_clients', 'account_owner_id', 'branch_id', 30, true),
    ('crm', 'crm.clients', 'crm.clients.record', 'Client Record', 'resource', 'Data Access', 'clients', null, 'get_client_full', 'account_owner_id', 'branch_id', 40, true),
    ('crm', 'crm.contacts', 'crm.contacts', 'Contacts', 'submodule', 'Navigation', 'contacts', 'client_contacts_view', null, null, null, 50, true),
    ('crm', 'crm.contacts', 'crm.contacts.list', 'Contact List', 'resource', 'Data Access', 'contacts', 'client_contacts_view', null, null, null, 60, true),
    ('crm', 'crm.contacts', 'crm.contacts.record', 'Contact Record', 'resource', 'Data Access', 'contacts', null, null, null, null, 70, true),
    ('crm', 'crm.opportunities', 'crm.opportunities', 'Opportunities', 'submodule', 'Navigation', 'opportunities', 'open_opportunities_view', null, 'salesperson_id', null, 80, true),
    ('crm', 'crm.opportunities', 'crm.opportunities.list', 'Opportunity List', 'resource', 'Data Access', 'opportunities', 'open_opportunities_view', null, 'salesperson_id', null, 90, true),
    ('crm', 'crm.opportunities', 'crm.opportunities.record', 'Opportunity Record', 'resource', 'Data Access', 'opportunities', null, null, 'salesperson_id', null, 100, true),
    ('crm', 'crm.quotations', 'crm.quotations', 'Quotations', 'submodule', 'Navigation', 'quotations', 'crm_quotations_view', 'search_quotations', 'created_by', null, 110, true),
    ('crm', 'crm.quotations', 'crm.quotations.list', 'Quotation List', 'resource', 'Data Access', 'quotations', 'crm_quotations_view', 'search_quotations', 'created_by', null, 120, true),
    ('crm', 'crm.quotations', 'crm.quotations.record', 'Quotation Record', 'resource', 'Data Access', 'quotations', 'quotation_summary_view', null, 'created_by', null, 130, true),
    ('crm', 'crm.quotations', 'crm.quotations.pricing_options', 'Pricing Options', 'resource', 'Commercial', 'quotation_costs', null, null, null, null, 140, true),
    ('crm', 'crm.quotations', 'crm.quotations.customer_actions', 'Customer Actions', 'resource', 'Commercial', 'quotations', null, null, 'created_by', null, 150, true),
    ('crm', 'crm.email', 'crm.email', 'Email', 'submodule', 'Navigation', 'mailboxes', null, null, null, null, 155, true),
    ('crm', 'crm.email', 'crm.email.list', 'Email Inbox', 'resource', 'Communication', 'mail_threads', null, null, null, null, 156, true),
    ('crm', 'crm.email', 'crm.email.thread', 'Email Thread', 'resource', 'Communication', 'mail_messages', null, null, null, null, 157, true),
    ('crm', 'crm.email', 'crm.email.mailboxes', 'Mailbox Management', 'resource', 'Communication', 'mailboxes', null, null, null, null, 158, true),
    ('pricing', null, 'pricing', 'Pricing Module', 'module', 'Navigation', null, null, null, null, null, 160, true),
    ('pricing', 'pricing.providers', 'pricing.providers', 'Providers', 'submodule', 'Navigation', 'providers', 'provider_overview_view', null, null, null, 170, true),
    ('pricing', 'pricing.providers', 'pricing.providers.list', 'Provider List', 'resource', 'Data Access', 'providers', 'provider_overview_view', null, null, null, 180, true),
    ('pricing', 'pricing.providers', 'pricing.providers.record', 'Provider Record', 'resource', 'Data Access', 'providers', null, null, null, null, 190, true),
    ('pricing', 'pricing.quotations', 'pricing.quotations', 'Pricing Quotations', 'submodule', 'Navigation', 'quotations', 'pricing_quotations_view', 'search_quotations', 'pricing_owner_id', null, 200, true),
    ('pricing', 'pricing.quotations', 'pricing.quotations.queue', 'Pricing Queue', 'resource', 'Workflow', 'quotations', 'pricing_quotations_view', 'search_quotations', 'pricing_owner_id', null, 210, true),
    ('pricing', 'pricing.quotations', 'pricing.quotations.workspace', 'Pricing Workspace', 'resource', 'Workflow', 'quotations', null, null, 'pricing_owner_id', null, 220, true),
    ('pricing', 'pricing.quotations', 'pricing.quotations.provider_outreach', 'Provider Outreach', 'resource', 'Workflow', 'providers', null, null, null, null, 230, true),
    ('pricing', 'pricing.quotations', 'pricing.quotations.cost_section', 'Cost Section', 'resource', 'Workflow', 'quotation_costs', null, null, null, null, 240, true),
    ('operations', null, 'operations', 'Operations Module', 'module', 'Navigation', null, null, null, null, null, 250, true),
    ('operations', 'operations.shipments', 'operations.shipments', 'Shipments', 'submodule', 'Navigation', 'shipments', null, null, null, null, 260, false),
    ('operations', 'operations.shipments', 'operations.shipments.record', 'Shipment Record', 'resource', 'Workflow', 'shipments', null, null, null, null, 270, false),
    ('master_data', null, 'master_data', 'Master Data Module', 'module', 'Navigation', null, null, null, null, null, 280, true),
    ('master_data', 'master_data.overview', 'master_data.overview', 'Master Data Overview', 'submodule', 'Navigation', null, null, null, null, null, 290, true),
    ('master_data', 'master_data.users', 'master_data.users', 'Users', 'submodule', 'Navigation', 'users', null, null, null, null, 300, true),
    ('master_data', 'master_data.users', 'master_data.users.directory', 'Users Directory', 'resource', 'Administration', 'users', null, null, null, null, 310, true),
    ('master_data', 'master_data.users', 'master_data.users.credentials', 'User Credentials', 'resource', 'Administration', 'users', null, null, null, null, 320, true),
    ('master_data', 'master_data.roles', 'master_data.roles', 'Roles & Permissions', 'submodule', 'Navigation', 'roles', null, null, null, null, 330, true),
    ('master_data', 'master_data.roles', 'master_data.roles.permissions_workspace', 'Permissions Workspace', 'resource', 'Administration', 'roles', null, null, null, null, 340, true),
    ('master_data', 'master_data.mail', 'master_data.mail', 'Mail', 'submodule', 'Navigation', 'mailboxes', null, null, null, null, 345, true),
    ('master_data', 'master_data.mail', 'master_data.mail.mailboxes', 'Mailboxes Manager', 'resource', 'Administration', 'mailboxes', null, null, null, null, 346, true),
    ('master_data', 'master_data.unlocode', 'master_data.unlocode', 'UN/LOCODE', 'submodule', 'Navigation', 'unlocodes', 'unlocode_lookup_view', 'search_unlocodes', null, null, 350, true),
    ('master_data', 'master_data.sales.service_types', 'master_data.sales.service_types', 'Service Types Catalog', 'submodule', 'Navigation', 'service_transport_types', 'service_transport_type_lookup_view', null, null, null, 360, true),
    ('master_data', 'master_data.sales.accounting_concepts', 'master_data.sales.accounting_concepts', 'Accounting Concepts Catalog', 'submodule', 'Navigation', 'sales_accounting_concepts', 'sales_accounting_concept_lookup_view', null, null, null, 370, true),
    ('master_data', 'master_data.sales.rejection_reasons', 'master_data.sales.rejection_reasons', 'Quotation Rejection Reasons', 'submodule', 'Navigation', 'quotation_rejection_reasons', null, null, null, null, 380, true),
    ('master_data', 'master_data.accounting.exchange_rates', 'master_data.accounting.exchange_rates', 'Exchange Rates Catalog', 'submodule', 'Navigation', 'exchange_rates', 'exchange_rate_lookup_view', null, null, null, 390, true)
) as data(module_code, submodule_code, resource_key, name, resource_type, resource_group, table_name, view_name, rpc_name, entity_owner_field, entity_branch_field, sort_order, active)
  on data.module_code = pm.code
left join permission_submodules ps
  on ps.code = data.submodule_code
where data.submodule_code is null or ps.code = data.submodule_code
on conflict (resource_key) do update
set
  module_id = excluded.module_id,
  submodule_id = excluded.submodule_id,
  name = excluded.name,
  resource_type = excluded.resource_type,
  resource_group = excluded.resource_group,
  table_name = excluded.table_name,
  view_name = excluded.view_name,
  rpc_name = excluded.rpc_name,
  entity_owner_field = excluded.entity_owner_field,
  entity_branch_field = excluded.entity_branch_field,
  sort_order = excluded.sort_order,
  active = excluded.active;

insert into permission_fields (
  resource_id,
  field_key,
  label,
  data_type,
  field_group,
  sort_order,
  active
)
select
  pr.id,
  data.field_key,
  data.label,
  data.data_type,
  data.field_group,
  data.sort_order,
  data.active
from permission_resources pr
join (
  values
    ('crm.clients.record', 'company_name', 'Company Name', 'text', 'Company Information', 10, true),
    ('crm.clients.record', 'corporate_phone', 'Corporate Phone', 'text', 'Contact Information', 20, true),
    ('crm.clients.record', 'tax_id', 'RFC', 'text', 'Company Information', 30, true),
    ('crm.clients.record', 'website', 'Website', 'text', 'Contact Information', 40, true),
    ('crm.clients.record', 'full_address', 'Full Address', 'text', 'Location Information', 50, true),
    ('crm.clients.record', 'postal_code', 'Postal Code', 'text', 'Location Information', 60, true),
    ('crm.clients.record', 'city_unlocode', 'UN/LOCODE', 'lookup', 'Location Information', 70, true),
    ('crm.quotations.record', 'incoterm', 'Incoterm', 'select', 'Quotation Information', 10, true),
    ('crm.quotations.record', 'sale_price', 'Sale Price', 'numeric', 'Economic Summary', 20, true),
    ('crm.quotations.record', 'cost', 'Cost', 'numeric', 'Economic Summary', 30, true),
    ('crm.quotations.record', 'expected_profit', 'Expected Profit', 'numeric', 'Economic Summary', 40, true),
    ('pricing.quotations.cost_section', 'purchase_amount', 'Purchase Amount', 'numeric', 'Pricing Costs', 10, true),
    ('pricing.quotations.cost_section', 'sale_amount', 'Sale Amount', 'numeric', 'Pricing Costs', 20, true),
    ('pricing.quotations.cost_section', 'profit_amount', 'Profit Amount', 'numeric', 'Pricing Costs', 30, true),
    ('pricing.quotations.workspace', 'incoterm', 'Incoterm', 'select', 'Quotation Information', 40, true)
) as data(resource_key, field_key, label, data_type, field_group, sort_order, active)
  on data.resource_key = pr.resource_key
on conflict (resource_id, field_key) do update
set
  label = excluded.label,
  data_type = excluded.data_type,
  field_group = excluded.field_group,
  sort_order = excluded.sort_order,
  active = excluded.active;

with admin_roles as (
  select id as role_id
  from roles
  where lower(name) = 'admin'
),
resource_actions as (
  select pr.id as resource_id, pa.id as action_id
  from permission_resources pr
  cross join permission_actions pa
  where pr.active = true
    and pa.active = true
    and pa.scope_type in ('resource', 'both')
),
all_condition as (
  select id as condition_id
  from permission_conditions
  where code = 'all'
)
insert into role_resource_permissions (
  role_id,
  resource_id,
  action_id,
  condition_id,
  allowed
)
select
  ar.role_id,
  ra.resource_id,
  ra.action_id,
  ac.condition_id,
  true
from admin_roles ar
cross join resource_actions ra
cross join all_condition ac
on conflict (role_id, resource_id, action_id) do update
set
  condition_id = excluded.condition_id,
  allowed = excluded.allowed;

with admin_roles as (
  select id as role_id
  from roles
  where lower(name) = 'admin'
),
field_actions as (
  select pf.id as field_id, pa.id as action_id
  from permission_fields pf
  cross join permission_actions pa
  where pf.active = true
    and pa.active = true
    and pa.scope_type in ('field', 'both')
),
all_condition as (
  select id as condition_id
  from permission_conditions
  where code = 'all'
)
insert into role_field_permissions (
  role_id,
  field_id,
  action_id,
  condition_id,
  allowed
)
select
  ar.role_id,
  fa.field_id,
  fa.action_id,
  ac.condition_id,
  true
from admin_roles ar
cross join field_actions fa
cross join all_condition ac
on conflict (role_id, field_id, action_id) do update
set
  condition_id = excluded.condition_id,
  allowed = excluded.allowed;

with desired_permissions as (
  select *
  from (
    values
      ('Ventas', 'dashboard', 'view', 'all', true),
      ('Ventas', 'dashboard.home', 'view', 'all', true),
      ('Ventas', 'crm', 'view', 'all', true),
      ('Ventas', 'crm', 'create', 'all', true),
      ('Ventas', 'crm', 'edit', 'all', true),
      ('Ventas', 'crm', 'delete', 'all', true),
      ('Ventas', 'crm.clients', 'view', 'all', true),
      ('Ventas', 'crm.clients', 'create', 'all', true),
      ('Ventas', 'crm.clients', 'edit', 'all', true),
      ('Ventas', 'crm.clients', 'delete', 'all', true),
      ('Ventas', 'crm.clients.list', 'view', 'owner_only', true),
      ('Ventas', 'crm.clients.record', 'view', 'owner_only', true),
      ('Ventas', 'crm.clients.record', 'edit', 'owner_only', true),
      ('Ventas', 'crm.clients.record', 'delete', 'owner_only', true),
      ('Ventas', 'crm.contacts', 'view', 'all', true),
      ('Ventas', 'crm.contacts', 'create', 'all', true),
      ('Ventas', 'crm.contacts', 'edit', 'all', true),
      ('Ventas', 'crm.contacts', 'delete', 'all', true),
      ('Ventas', 'crm.contacts.list', 'view', 'owner_only', true),
      ('Ventas', 'crm.contacts.record', 'view', 'owner_only', true),
      ('Ventas', 'crm.contacts.record', 'edit', 'owner_only', true),
      ('Ventas', 'crm.contacts.record', 'delete', 'owner_only', true),
      ('Ventas', 'crm.opportunities', 'view', 'all', true),
      ('Ventas', 'crm.opportunities', 'create', 'all', true),
      ('Ventas', 'crm.opportunities', 'edit', 'all', true),
      ('Ventas', 'crm.opportunities', 'delete', 'all', true),
      ('Ventas', 'crm.opportunities.list', 'view', 'owner_only', true),
      ('Ventas', 'crm.opportunities.record', 'view', 'owner_only', true),
      ('Ventas', 'crm.opportunities.record', 'edit', 'owner_only', true),
      ('Ventas', 'crm.opportunities.record', 'delete', 'owner_only', true),
      ('Ventas', 'crm.quotations', 'view', 'all', true),
      ('Ventas', 'crm.quotations', 'create', 'all', true),
      ('Ventas', 'crm.quotations', 'edit', 'all', true),
      ('Ventas', 'crm.quotations', 'delete', 'all', true),
      ('Ventas', 'crm.quotations', 'send_quote', 'all', true),
      ('Ventas', 'crm.quotations', 'create_booking', 'all', true),
      ('Ventas', 'crm.quotations.list', 'view', 'owner_only', true),
      ('Ventas', 'crm.quotations.record', 'view', 'owner_only', true),
      ('Ventas', 'crm.quotations.record', 'edit', 'owner_only', true),
      ('Ventas', 'crm.quotations.pricing_options', 'view', 'owner_only', true),
      ('Ventas', 'crm.quotations.customer_actions', 'view', 'owner_only', true),
      ('Ventas', 'crm.quotations.customer_actions', 'edit', 'owner_only', true),
      ('Ventas', 'crm.email', 'view', 'all', true),
      ('Ventas', 'crm.email.list', 'view', 'all', true),
      ('Ventas', 'crm.email.thread', 'view', 'all', true),
      ('Pricing', 'dashboard', 'view', 'all', true),
      ('Pricing', 'dashboard.home', 'view', 'all', true),
      ('Pricing', 'pricing', 'view', 'all', true),
      ('Pricing', 'pricing', 'create', 'all', true),
      ('Pricing', 'pricing', 'edit', 'all', true),
      ('Pricing', 'pricing', 'delete', 'all', true),
      ('Pricing', 'pricing.providers', 'view', 'all', true),
      ('Pricing', 'pricing.providers', 'create', 'all', true),
      ('Pricing', 'pricing.providers', 'edit', 'all', true),
      ('Pricing', 'pricing.providers', 'delete', 'all', true),
      ('Pricing', 'pricing.providers.list', 'view', 'all', true),
      ('Pricing', 'pricing.providers.record', 'view', 'all', true),
      ('Pricing', 'pricing.providers.record', 'edit', 'all', true),
      ('Pricing', 'pricing.quotations', 'view', 'all', true),
      ('Pricing', 'pricing.quotations', 'edit', 'all', true),
      ('Pricing', 'pricing.quotations', 'pricing_take', 'all', true),
      ('Pricing', 'pricing.quotations.queue', 'view', 'all', true),
      ('Pricing', 'pricing.quotations.workspace', 'view', 'owner_only', true),
      ('Pricing', 'pricing.quotations.workspace', 'edit', 'owner_only', true),
      ('Pricing', 'pricing.quotations.provider_outreach', 'view', 'all', true),
      ('Pricing', 'pricing.quotations.provider_outreach', 'edit', 'all', true),
      ('Pricing', 'pricing.quotations.cost_section', 'view', 'owner_only', true),
      ('Pricing', 'pricing.quotations.cost_section', 'create', 'owner_only', true),
      ('Pricing', 'pricing.quotations.cost_section', 'edit', 'owner_only', true),
      ('Pricing', 'pricing.quotations.cost_section', 'delete', 'owner_only', true),
      ('Pricing', 'crm.email', 'view', 'all', true),
      ('Pricing', 'crm.email.list', 'view', 'all', true),
      ('Pricing', 'crm.email.thread', 'view', 'all', true),
      ('Operaciones', 'dashboard', 'view', 'all', true),
      ('Operaciones', 'dashboard.home', 'view', 'all', true),
      ('Operaciones', 'operations', 'view', 'all', true),
      ('Operaciones', 'operations', 'create', 'all', true),
      ('Operaciones', 'operations', 'edit', 'all', true),
      ('Operaciones', 'operations', 'delete', 'all', true),
      ('Operaciones', 'operations.shipments', 'view', 'all', true),
      ('Operaciones', 'operations.shipments', 'create', 'all', true),
      ('Operaciones', 'operations.shipments', 'edit', 'all', true),
      ('Operaciones', 'operations.shipments.record', 'view', 'assigned_branch_only', true),
      ('Operaciones', 'operations.shipments.record', 'create', 'assigned_branch_only', true),
      ('Operaciones', 'operations.shipments.record', 'edit', 'assigned_branch_only', true),
      ('Operaciones', 'operations.shipments.record', 'delete', 'assigned_branch_only', true),
      ('Operaciones', 'crm.email', 'view', 'all', true),
      ('Operaciones', 'crm.email.list', 'view', 'all', true),
      ('Operaciones', 'crm.email.thread', 'view', 'all', true),
      ('Admin', 'crm.email', 'view', 'all', true),
      ('Admin', 'crm.email.list', 'view', 'all', true),
      ('Admin', 'crm.email.thread', 'view', 'all', true),
      ('Admin', 'crm.email.mailboxes', 'view', 'all', true),
      ('Admin', 'crm.email.mailboxes', 'create', 'all', true),
      ('Admin', 'crm.email.mailboxes', 'edit', 'all', true),
      ('Admin', 'crm.email.mailboxes', 'delete', 'all', true)
  ) as t(role_name, resource_key, action_code, condition_code, allowed)
)
insert into role_resource_permissions (
  role_id,
  resource_id,
  action_id,
  condition_id,
  allowed
)
select
  r.id,
  pr.id,
  pa.id,
  pc.id,
  dp.allowed
from desired_permissions dp
join roles r
  on r.name = dp.role_name
join permission_resources pr
  on pr.resource_key = dp.resource_key
join permission_actions pa
  on pa.code = dp.action_code
 and pa.scope_type in ('resource', 'both')
join permission_conditions pc
  on pc.code = dp.condition_code
on conflict (role_id, resource_id, action_id) do update
set
  condition_id = excluded.condition_id,
  allowed = excluded.allowed;

with desired_field_permissions as (
  select *
  from (
    values
      ('Ventas', 'crm.clients.record', 'company_name', 'view', 'all', true),
      ('Ventas', 'crm.clients.record', 'company_name', 'edit', 'all', true),
      ('Ventas', 'crm.clients.record', 'corporate_phone', 'view', 'all', true),
      ('Ventas', 'crm.clients.record', 'corporate_phone', 'edit', 'all', true),
      ('Ventas', 'crm.clients.record', 'tax_id', 'view', 'all', true),
      ('Ventas', 'crm.clients.record', 'tax_id', 'edit', 'all', true),
      ('Ventas', 'crm.quotations.record', 'incoterm', 'view', 'all', true),
      ('Ventas', 'crm.quotations.record', 'sale_price', 'view', 'all', true),
      ('Ventas', 'crm.quotations.record', 'sale_price', 'edit', 'all', true),
      ('Ventas', 'crm.quotations.record', 'cost', 'view', 'all', true),
      ('Ventas', 'crm.quotations.record', 'expected_profit', 'view', 'all', true),
      ('Pricing', 'pricing.quotations.cost_section', 'purchase_amount', 'view', 'all', true),
      ('Pricing', 'pricing.quotations.cost_section', 'purchase_amount', 'edit', 'all', true),
      ('Pricing', 'pricing.quotations.workspace', 'incoterm', 'view', 'all', true),
      ('Operaciones', 'crm.quotations.record', 'incoterm', 'view', 'all', true)
  ) as t(role_name, resource_key, field_key, action_code, condition_code, allowed)
)
insert into role_field_permissions (
  role_id,
  field_id,
  action_id,
  condition_id,
  allowed
)
select
  r.id,
  pf.id,
  pa.id,
  pc.id,
  dfp.allowed
from desired_field_permissions dfp
join roles r
  on r.name = dfp.role_name
join permission_resources pr
  on pr.resource_key = dfp.resource_key
join permission_fields pf
  on pf.resource_id = pr.id
 and pf.field_key = dfp.field_key
join permission_actions pa
  on pa.code = dfp.action_code
 and pa.scope_type in ('field', 'both')
join permission_conditions pc
  on pc.code = dfp.condition_code
on conflict (role_id, field_id, action_id) do update
set
  condition_id = excluded.condition_id,
  allowed = excluded.allowed;

insert into external_data_sources (
  code,
  name,
  provider,
  source_url,
  license,
  refresh_strategy
)
values (
  'unece_unlocode',
  'UN/LOCODE',
  'UNECE',
  'https://service.unece.org/trade/locode/{country}.htm',
  'UNECE public reference pages',
  'manual snapshot regeneration via scripts/import-unlocode.mjs'
)
on conflict (code) do update
set
  name = excluded.name,
  provider = excluded.provider,
  source_url = excluded.source_url,
  license = excluded.license,
  refresh_strategy = excluded.refresh_strategy;

insert into service_transport_types (
  service_type,
  transport_type
)
values
  ('AIR', 'Paqueteria'),
  ('FCL', 'Contenedor de 40'),
  ('LCL', 'Consolidado'),
  ('FTL', 'Caja Seca de 53'),
  ('FTL', 'Arrastre de contenedor'),
  ('LTL', 'Consolidado'),
  ('COURIER', 'Courier')
on conflict (service_type, transport_type) do nothing;

insert into quotation_reference_counters (
  service_type,
  prefix,
  last_value
)
values
  ('AIR', 'QPRIAIR', 0),
  ('FCL', 'QPRIFCL', 0),
  ('LCL', 'QPRILCL', 0),
  ('FTL', 'QPRIFTL', 0),
  ('LTL', 'QPRILTL', 0),
  ('COURIER', 'QPRICOU', 0)
on conflict (service_type) do update
set prefix = excluded.prefix;

insert into quotation_rejection_reasons (
  reason
)
values
  ('Tarifa fuera de presupuesto'),
  ('Proveedor sin disponibilidad'),
  ('Cliente cancelo la solicitud'),
  ('Transit time no cumple'),
  ('Condiciones comerciales no aceptadas')
on conflict (reason) do nothing;

insert into incoterms (
  code,
  description
)
values
  ('EXW', 'Ex Works'),
  ('FCA', 'Free Carrier'),
  ('CPT', 'Carriage Paid To'),
  ('CIP', 'Carriage and Insurance Paid To'),
  ('DAP', 'Delivered at Place'),
  ('DPU', 'Delivered at Place Unloaded'),
  ('DDP', 'Delivered Duty Paid'),
  ('FAS', 'Free Alongside Ship'),
  ('FOB', 'Free On Board'),
  ('CFR', 'Cost and Freight'),
  ('CIF', 'Cost, Insurance and Freight')
on conflict (code) do update
set description = excluded.description;
