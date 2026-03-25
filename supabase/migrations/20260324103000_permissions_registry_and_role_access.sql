create table if not exists permission_modules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  icon_key text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_permission_modules_sort_order on permission_modules(sort_order);

create table if not exists permission_submodules (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references permission_modules(id) on delete cascade,
  code text not null unique,
  name text not null,
  route_path text,
  route_matchers text[] not null default '{}',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_permission_submodules_module_id on permission_submodules(module_id);
create index if not exists idx_permission_submodules_route_path on permission_submodules(route_path);
create index if not exists idx_permission_submodules_sort_order on permission_submodules(sort_order);

create table if not exists permission_actions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  scope_type text not null default 'resource',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint permission_actions_scope_type_check
    check (scope_type in ('resource', 'field', 'both'))
);

create table if not exists permission_conditions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists permission_resources (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references permission_modules(id) on delete cascade,
  submodule_id uuid references permission_submodules(id) on delete cascade,
  resource_key text not null unique,
  name text not null,
  resource_type text not null,
  resource_group text,
  table_name text,
  view_name text,
  rpc_name text,
  entity_owner_field text,
  entity_branch_field text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_permission_resources_module_id on permission_resources(module_id);
create index if not exists idx_permission_resources_submodule_id on permission_resources(submodule_id);
create index if not exists idx_permission_resources_resource_type on permission_resources(resource_type);
create index if not exists idx_permission_resources_sort_order on permission_resources(sort_order);

create table if not exists permission_fields (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references permission_resources(id) on delete cascade,
  field_key text not null,
  label text not null,
  data_type text,
  field_group text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint permission_fields_resource_field_unique unique (resource_id, field_key)
);

create index if not exists idx_permission_fields_resource_id on permission_fields(resource_id);
create index if not exists idx_permission_fields_group on permission_fields(field_group);

create table if not exists role_resource_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles(id) on delete cascade,
  resource_id uuid not null references permission_resources(id) on delete cascade,
  action_id uuid not null references permission_actions(id) on delete cascade,
  condition_id uuid not null references permission_conditions(id),
  allowed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint role_resource_permissions_unique unique (role_id, resource_id, action_id)
);

create index if not exists idx_role_resource_permissions_role_id on role_resource_permissions(role_id);
create index if not exists idx_role_resource_permissions_resource_id on role_resource_permissions(resource_id);

create table if not exists role_field_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles(id) on delete cascade,
  field_id uuid not null references permission_fields(id) on delete cascade,
  action_id uuid not null references permission_actions(id) on delete cascade,
  condition_id uuid not null references permission_conditions(id),
  allowed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint role_field_permissions_unique unique (role_id, field_id, action_id)
);

create index if not exists idx_role_field_permissions_role_id on role_field_permissions(role_id);
create index if not exists idx_role_field_permissions_field_id on role_field_permissions(field_id);

create or replace function erp_current_branch_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select u.branch_id
  from public.users u
  where u.auth_user_id = auth.uid()
    and u.active = true
  limit 1;
$$;

create or replace function erp_has_role(
  p_role_name text
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(lower(public.erp_current_role_name()) = lower(btrim(coalesce(p_role_name, ''))), false);
$$;

create or replace function erp_condition_allows(
  p_condition_code text,
  p_owner_user_id uuid default null,
  p_branch_id uuid default null
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  normalized_condition text := lower(coalesce(btrim(p_condition_code), 'none'));
  current_user_id uuid := public.erp_current_user_id();
  current_branch_id uuid := public.erp_current_branch_id();
begin
  if normalized_condition = 'all' then
    return true;
  end if;

  if normalized_condition = 'owner_only' then
    return p_owner_user_id is not null
      and current_user_id is not null
      and p_owner_user_id = current_user_id;
  end if;

  if normalized_condition = 'assigned_branch_only' then
    return p_branch_id is not null
      and current_branch_id is not null
      and p_branch_id = current_branch_id;
  end if;

  return false;
end;
$$;

create or replace function erp_access_scope(
  p_resource_key text,
  p_action_code text
)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (
      select pc.code
      from public.role_resource_permissions rrp
      join public.roles r
        on r.id = rrp.role_id
      join public.permission_resources pr
        on pr.id = rrp.resource_id
      join public.permission_actions pa
        on pa.id = rrp.action_id
      join public.permission_conditions pc
        on pc.id = rrp.condition_id
      where lower(r.name) = lower(public.erp_current_role_name())
        and pr.resource_key = p_resource_key
        and lower(pa.code) = lower(p_action_code)
        and rrp.allowed = true
      limit 1
    ),
    'none'
  );
$$;

create or replace function erp_has_resource_access(
  p_resource_key text,
  p_action_code text default 'view',
  p_owner_user_id uuid default null,
  p_branch_id uuid default null
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  resolved_scope text;
begin
  if public.erp_is_admin() then
    return true;
  end if;

  if not public.erp_is_authenticated_active_user() then
    return false;
  end if;

  resolved_scope := public.erp_access_scope(p_resource_key, p_action_code);

  return public.erp_condition_allows(resolved_scope, p_owner_user_id, p_branch_id);
end;
$$;

create or replace function erp_has_module_access(
  p_module_code text,
  p_action_code text default 'view'
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.erp_has_resource_access(
    lower(coalesce(p_module_code, '')),
    lower(coalesce(p_action_code, 'view'))
  );
$$;

create or replace function erp_has_submodule_access(
  p_submodule_code text,
  p_action_code text default 'view'
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.erp_has_resource_access(
    lower(coalesce(p_submodule_code, '')),
    lower(coalesce(p_action_code, 'view'))
  );
$$;

create or replace function erp_has_field_access(
  p_resource_key text,
  p_field_key text,
  p_action_code text default 'view',
  p_owner_user_id uuid default null,
  p_branch_id uuid default null
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  resolved_scope text;
begin
  if public.erp_is_admin() then
    return true;
  end if;

  if not public.erp_is_authenticated_active_user() then
    return false;
  end if;

  select coalesce(pc.code, 'none')
  into resolved_scope
  from public.role_field_permissions rfp
  join public.roles r
    on r.id = rfp.role_id
  join public.permission_fields pf
    on pf.id = rfp.field_id
  join public.permission_resources pr
    on pr.id = pf.resource_id
  join public.permission_actions pa
    on pa.id = rfp.action_id
  join public.permission_conditions pc
    on pc.id = rfp.condition_id
  where lower(r.name) = lower(public.erp_current_role_name())
    and pr.resource_key = p_resource_key
    and pf.field_key = p_field_key
    and lower(pa.code) = lower(p_action_code)
    and rfp.allowed = true
  limit 1;

  if resolved_scope is null or resolved_scope = 'none' then
    return public.erp_has_resource_access(
      p_resource_key,
      p_action_code,
      p_owner_user_id,
      p_branch_id
    );
  end if;

  return public.erp_condition_allows(resolved_scope, p_owner_user_id, p_branch_id);
end;
$$;

create or replace function erp_can_access_route(
  p_route_path text,
  p_action_code text default 'view'
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  with normalized as (
    select case
      when nullif(btrim(coalesce(p_route_path, '')), '') is null then '/'
      when p_route_path = '/' then '/'
      else regexp_replace(btrim(p_route_path), '/+$', '')
    end as route_path
  ),
  candidate_matchers as (
    select
      ps.code,
      coalesce(nullif(btrim(matcher), ''), ps.route_path) as matcher
    from public.permission_submodules ps
    cross join lateral unnest(
      case
        when array_length(ps.route_matchers, 1) is null or array_length(ps.route_matchers, 1) = 0
          then array[coalesce(ps.route_path, '')]::text[]
        else ps.route_matchers
      end
    ) as matcher
    where ps.active = true
  ),
  matched_route as (
    select cm.code
    from normalized n
    join candidate_matchers cm
      on (
        n.route_path = cm.matcher
        or (
          cm.matcher <> '/'
          and n.route_path like cm.matcher || '/%'
        )
      )
    order by char_length(cm.matcher) desc
    limit 1
  )
  select exists (
    select 1
    from matched_route mr
    where public.erp_has_submodule_access(mr.code, p_action_code)
  );
$$;

create or replace function get_current_navigation_items()
returns table (
  module_code text,
  module_name text,
  module_icon_key text,
  module_sort_order integer,
  submodule_code text,
  submodule_name text,
  route_path text,
  route_matchers text[],
  submodule_sort_order integer
)
language sql
security definer
stable
set search_path = public
as $$
  select
    pm.code as module_code,
    pm.name as module_name,
    pm.icon_key as module_icon_key,
    pm.sort_order as module_sort_order,
    ps.code as submodule_code,
    ps.name as submodule_name,
    ps.route_path,
    ps.route_matchers,
    ps.sort_order as submodule_sort_order
  from public.permission_submodules ps
  join public.permission_modules pm
    on pm.id = ps.module_id
  where ps.active = true
    and pm.active = true
    and public.erp_has_submodule_access(ps.code, 'view')
  order by pm.sort_order asc, ps.sort_order asc, ps.name asc;
$$;

create or replace view permission_resource_catalog_view as
select
  pm.id as module_id,
  pm.code as module_code,
  pm.name as module_name,
  pm.icon_key as module_icon_key,
  pm.sort_order as module_sort_order,
  pm.active as module_active,
  ps.id as submodule_id,
  ps.code as submodule_code,
  ps.name as submodule_name,
  ps.route_path,
  ps.route_matchers,
  ps.sort_order as submodule_sort_order,
  ps.active as submodule_active,
  pr.id as resource_id,
  pr.resource_key,
  pr.name as resource_name,
  pr.resource_type,
  pr.resource_group,
  pr.table_name,
  pr.view_name,
  pr.rpc_name,
  pr.entity_owner_field,
  pr.entity_branch_field,
  pr.sort_order as resource_sort_order,
  pr.active as resource_active,
  pr.created_at,
  pr.updated_at
from permission_resources pr
join permission_modules pm on pm.id = pr.module_id
left join permission_submodules ps on ps.id = pr.submodule_id
order by pm.sort_order asc, coalesce(ps.sort_order, 0) asc, pr.sort_order asc, pr.name asc;

create or replace view permission_field_catalog_view as
select
  pr.resource_key,
  pr.name as resource_name,
  pf.id as field_id,
  pf.resource_id,
  pf.field_key,
  pf.label,
  pf.data_type,
  pf.field_group,
  pf.sort_order as field_sort_order,
  pf.active,
  pf.created_at,
  pf.updated_at
from permission_fields pf
join permission_resources pr on pr.id = pf.resource_id
order by pr.sort_order asc, pf.field_group asc, pf.sort_order asc, pf.label asc;

create or replace view role_resource_permission_matrix_view as
select
  r.id as role_id,
  r.name as role_name,
  prc.module_id,
  prc.module_code,
  prc.module_name,
  prc.module_icon_key,
  prc.module_sort_order,
  prc.submodule_id,
  prc.submodule_code,
  prc.submodule_name,
  prc.route_path,
  prc.route_matchers,
  prc.submodule_sort_order,
  prc.resource_id,
  prc.resource_key,
  prc.resource_name,
  prc.resource_type,
  prc.resource_group,
  pa.id as action_id,
  pa.code as action_code,
  pa.name as action_name,
  coalesce(rrp.allowed, false) as allowed,
  pc.id as condition_id,
  coalesce(pc.code, 'none') as condition_code,
  coalesce(pc.name, 'None') as condition_name,
  rrp.id as role_permission_id
from roles r
cross join permission_resource_catalog_view prc
cross join permission_actions pa
left join role_resource_permissions rrp
  on rrp.role_id = r.id
 and rrp.resource_id = prc.resource_id
 and rrp.action_id = pa.id
left join permission_conditions pc
  on pc.id = rrp.condition_id
where pa.active = true
  and pa.scope_type in ('resource', 'both')
  and prc.resource_active = true
order by r.name asc, prc.module_sort_order asc, coalesce(prc.submodule_sort_order, 0) asc, prc.resource_sort_order asc, pa.name asc;

create or replace view role_field_permission_matrix_view as
select
  r.id as role_id,
  r.name as role_name,
  pfc.resource_key,
  pfc.resource_name,
  pfc.field_id,
  pfc.field_key,
  pfc.label as field_label,
  pfc.data_type,
  pfc.field_group,
  pfc.field_sort_order,
  pa.id as action_id,
  pa.code as action_code,
  pa.name as action_name,
  coalesce(rfp.allowed, false) as allowed,
  pc.id as condition_id,
  coalesce(pc.code, 'none') as condition_code,
  coalesce(pc.name, 'None') as condition_name,
  rfp.id as role_field_permission_id
from roles r
cross join permission_field_catalog_view pfc
cross join permission_actions pa
left join role_field_permissions rfp
  on rfp.role_id = r.id
 and rfp.field_id = pfc.field_id
 and rfp.action_id = pa.id
left join permission_conditions pc
  on pc.id = rfp.condition_id
where pa.active = true
  and pa.scope_type in ('field', 'both')
  and pfc.active = true
order by r.name asc, pfc.resource_key asc, pfc.field_group asc, pfc.field_sort_order asc, pa.name asc;

drop trigger if exists set_permission_modules_updated_at on permission_modules;
create trigger set_permission_modules_updated_at
before update on permission_modules
for each row
execute function set_updated_at();

drop trigger if exists set_permission_submodules_updated_at on permission_submodules;
create trigger set_permission_submodules_updated_at
before update on permission_submodules
for each row
execute function set_updated_at();

drop trigger if exists set_permission_actions_updated_at on permission_actions;
create trigger set_permission_actions_updated_at
before update on permission_actions
for each row
execute function set_updated_at();

drop trigger if exists set_permission_conditions_updated_at on permission_conditions;
create trigger set_permission_conditions_updated_at
before update on permission_conditions
for each row
execute function set_updated_at();

drop trigger if exists set_permission_resources_updated_at on permission_resources;
create trigger set_permission_resources_updated_at
before update on permission_resources
for each row
execute function set_updated_at();

drop trigger if exists set_permission_fields_updated_at on permission_fields;
create trigger set_permission_fields_updated_at
before update on permission_fields
for each row
execute function set_updated_at();

drop trigger if exists set_role_resource_permissions_updated_at on role_resource_permissions;
create trigger set_role_resource_permissions_updated_at
before update on role_resource_permissions
for each row
execute function set_updated_at();

drop trigger if exists set_role_field_permissions_updated_at on role_field_permissions;
create trigger set_role_field_permissions_updated_at
before update on role_field_permissions
for each row
execute function set_updated_at();

insert into permission_modules (code, name, icon_key, sort_order, active)
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

insert into permission_submodules (module_id, code, name, route_path, route_matchers, sort_order, active)
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
    ('pricing', 'pricing.providers', 'Providers', '/pricing/providers', array['/pricing/providers']::text[], 10, true),
    ('pricing', 'pricing.quotations', 'Pricing Quotations', '/pricing/quotations', array['/pricing/quotations', '/quotations']::text[], 20, true),
    ('operations', 'operations.shipments', 'Shipments', '/shipments', array['/shipments']::text[], 10, false),
    ('operations', 'operations.bookings', 'Bookings', '/bookings', array['/bookings']::text[], 20, false),
    ('master_data', 'master_data.overview', 'Master Data', '/master-data', array['/master-data']::text[], 10, true),
    ('master_data', 'master_data.users', 'Users', '/master-data/users', array['/master-data/users']::text[], 20, true),
    ('master_data', 'master_data.roles', 'Roles & Permissions', '/master-data/users/roles', array['/master-data/users/roles']::text[], 30, true),
    ('master_data', 'master_data.sales.service_types', 'Ventas / Tipos de servicio', '/master-data/sales/service-types', array['/master-data/sales/service-types']::text[], 40, true),
    ('master_data', 'master_data.sales.accounting_concepts', 'Ventas / Conceptos contables', '/master-data/sales/accounting-concepts', array['/master-data/sales/accounting-concepts']::text[], 50, true),
    ('master_data', 'master_data.sales.rejection_reasons', 'Ventas / Motivos rechazo', '/master-data/sales/quotation-rejection-reasons', array['/master-data/sales/quotation-rejection-reasons']::text[], 60, true),
    ('master_data', 'master_data.unlocode', 'UN/LOCODE', '/master-data/unlocode', array['/master-data/unlocode']::text[], 70, true),
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

insert into permission_actions (code, name, scope_type, active)
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

insert into permission_conditions (code, name, description)
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
  module_id, submodule_id, resource_key, name, resource_type, resource_group,
  table_name, view_name, rpc_name, entity_owner_field, entity_branch_field, sort_order, active
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
    ('master_data', 'master_data.unlocode', 'master_data.unlocode', 'UN/LOCODE', 'submodule', 'Navigation', 'unlocodes', 'unlocode_lookup_view', 'search_unlocodes', null, null, 350, true),
    ('master_data', 'master_data.sales.service_types', 'master_data.sales.service_types', 'Service Types Catalog', 'submodule', 'Navigation', 'service_transport_types', 'service_transport_type_lookup_view', null, null, null, 360, true),
    ('master_data', 'master_data.sales.accounting_concepts', 'master_data.sales.accounting_concepts', 'Accounting Concepts Catalog', 'submodule', 'Navigation', 'sales_accounting_concepts', 'sales_accounting_concept_lookup_view', null, null, null, 370, true),
    ('master_data', 'master_data.sales.rejection_reasons', 'master_data.sales.rejection_reasons', 'Quotation Rejection Reasons', 'submodule', 'Navigation', 'quotation_rejection_reasons', null, null, null, null, 380, true)
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

insert into permission_fields (resource_id, field_key, label, data_type, field_group, sort_order, active)
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
  select id as role_id from roles where lower(name) = 'admin'
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
  select id as condition_id from permission_conditions where code = 'all'
)
insert into role_resource_permissions (role_id, resource_id, action_id, condition_id, allowed)
select ar.role_id, ra.resource_id, ra.action_id, ac.condition_id, true
from admin_roles ar
cross join resource_actions ra
cross join all_condition ac
on conflict (role_id, resource_id, action_id) do update
set condition_id = excluded.condition_id, allowed = excluded.allowed;

with admin_roles as (
  select id as role_id from roles where lower(name) = 'admin'
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
  select id as condition_id from permission_conditions where code = 'all'
)
insert into role_field_permissions (role_id, field_id, action_id, condition_id, allowed)
select ar.role_id, fa.field_id, fa.action_id, ac.condition_id, true
from admin_roles ar
cross join field_actions fa
cross join all_condition ac
on conflict (role_id, field_id, action_id) do update
set condition_id = excluded.condition_id, allowed = excluded.allowed;

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
      ('Ventas', 'crm.clients.list', 'view', 'all', true),
      ('Ventas', 'crm.clients.record', 'view', 'all', true),
      ('Ventas', 'crm.clients.record', 'edit', 'all', true),
      ('Ventas', 'crm.contacts', 'view', 'all', true),
      ('Ventas', 'crm.contacts', 'create', 'all', true),
      ('Ventas', 'crm.contacts', 'edit', 'all', true),
      ('Ventas', 'crm.contacts', 'delete', 'all', true),
      ('Ventas', 'crm.contacts.list', 'view', 'all', true),
      ('Ventas', 'crm.contacts.record', 'view', 'all', true),
      ('Ventas', 'crm.contacts.record', 'edit', 'all', true),
      ('Ventas', 'crm.opportunities', 'view', 'all', true),
      ('Ventas', 'crm.opportunities', 'create', 'all', true),
      ('Ventas', 'crm.opportunities', 'edit', 'all', true),
      ('Ventas', 'crm.opportunities', 'delete', 'all', true),
      ('Ventas', 'crm.opportunities.list', 'view', 'all', true),
      ('Ventas', 'crm.opportunities.record', 'view', 'all', true),
      ('Ventas', 'crm.opportunities.record', 'edit', 'all', true),
      ('Ventas', 'crm.quotations', 'view', 'all', true),
      ('Ventas', 'crm.quotations', 'create', 'all', true),
      ('Ventas', 'crm.quotations', 'edit', 'all', true),
      ('Ventas', 'crm.quotations', 'delete', 'all', true),
      ('Ventas', 'crm.quotations', 'send_quote', 'all', true),
      ('Ventas', 'crm.quotations', 'create_booking', 'all', true),
      ('Ventas', 'crm.quotations.list', 'view', 'all', true),
      ('Ventas', 'crm.quotations.record', 'view', 'all', true),
      ('Ventas', 'crm.quotations.record', 'edit', 'all', true),
      ('Ventas', 'crm.quotations.pricing_options', 'view', 'all', true),
      ('Ventas', 'crm.quotations.customer_actions', 'view', 'all', true),
      ('Ventas', 'crm.quotations.customer_actions', 'edit', 'all', true),
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
      ('Pricing', 'pricing.quotations.workspace', 'view', 'all', true),
      ('Pricing', 'pricing.quotations.workspace', 'edit', 'all', true),
      ('Pricing', 'pricing.quotations.provider_outreach', 'view', 'all', true),
      ('Pricing', 'pricing.quotations.provider_outreach', 'edit', 'all', true),
      ('Pricing', 'pricing.quotations.cost_section', 'view', 'all', true),
      ('Pricing', 'pricing.quotations.cost_section', 'create', 'all', true),
      ('Pricing', 'pricing.quotations.cost_section', 'edit', 'all', true),
      ('Pricing', 'pricing.quotations.cost_section', 'delete', 'all', true),
      ('Operaciones', 'dashboard', 'view', 'all', true),
      ('Operaciones', 'dashboard.home', 'view', 'all', true),
      ('Operaciones', 'operations', 'view', 'all', true),
      ('Operaciones', 'operations', 'create', 'all', true),
      ('Operaciones', 'operations', 'edit', 'all', true),
      ('Operaciones', 'operations', 'delete', 'all', true),
      ('Operaciones', 'operations.shipments', 'view', 'all', true),
      ('Operaciones', 'operations.shipments', 'create', 'all', true),
      ('Operaciones', 'operations.shipments', 'edit', 'all', true),
      ('Operaciones', 'operations.shipments.record', 'view', 'all', true),
      ('Operaciones', 'operations.shipments.record', 'edit', 'all', true)
  ) as t(role_name, resource_key, action_code, condition_code, allowed)
)
insert into role_resource_permissions (role_id, resource_id, action_id, condition_id, allowed)
select
  r.id,
  pr.id,
  pa.id,
  pc.id,
  dp.allowed
from desired_permissions dp
join roles r on r.name = dp.role_name
join permission_resources pr on pr.resource_key = dp.resource_key
join permission_actions pa on pa.code = dp.action_code and pa.scope_type in ('resource', 'both')
join permission_conditions pc on pc.code = dp.condition_code
on conflict (role_id, resource_id, action_id) do update
set condition_id = excluded.condition_id, allowed = excluded.allowed;

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
      ('Pricing', 'pricing.quotations.cost_section', 'sale_amount', 'view', 'all', true),
      ('Pricing', 'pricing.quotations.workspace', 'incoterm', 'view', 'all', true),
      ('Operaciones', 'crm.quotations.record', 'incoterm', 'view', 'all', true)
  ) as t(role_name, resource_key, field_key, action_code, condition_code, allowed)
)
insert into role_field_permissions (role_id, field_id, action_id, condition_id, allowed)
select
  r.id,
  pf.id,
  pa.id,
  pc.id,
  dfp.allowed
from desired_field_permissions dfp
join roles r on r.name = dfp.role_name
join permission_resources pr on pr.resource_key = dfp.resource_key
join permission_fields pf on pf.resource_id = pr.id and pf.field_key = dfp.field_key
join permission_actions pa on pa.code = dfp.action_code and pa.scope_type in ('field', 'both')
join permission_conditions pc on pc.code = dfp.condition_code
on conflict (role_id, field_id, action_id) do update
set condition_id = excluded.condition_id, allowed = excluded.allowed;

alter table permission_modules enable row level security;
alter table permission_submodules enable row level security;
alter table permission_actions enable row level security;
alter table permission_conditions enable row level security;
alter table permission_resources enable row level security;
alter table permission_fields enable row level security;
alter table role_resource_permissions enable row level security;
alter table role_field_permissions enable row level security;
alter table permission_modules force row level security;
alter table permission_submodules force row level security;
alter table permission_actions force row level security;
alter table permission_conditions force row level security;
alter table permission_resources force row level security;
alter table permission_fields force row level security;
alter table role_resource_permissions force row level security;
alter table role_field_permissions force row level security;

drop policy if exists "active_select_permission_modules" on permission_modules;
create policy "active_select_permission_modules" on permission_modules for select using (public.erp_is_authenticated_active_user());
drop policy if exists "admin_insert_permission_modules" on permission_modules;
create policy "admin_insert_permission_modules" on permission_modules for insert with check (public.erp_is_admin());
drop policy if exists "admin_update_permission_modules" on permission_modules;
create policy "admin_update_permission_modules" on permission_modules for update using (public.erp_is_admin()) with check (public.erp_is_admin());
drop policy if exists "admin_delete_permission_modules" on permission_modules;
create policy "admin_delete_permission_modules" on permission_modules for delete using (public.erp_is_admin());

drop policy if exists "active_select_permission_submodules" on permission_submodules;
create policy "active_select_permission_submodules" on permission_submodules for select using (public.erp_is_authenticated_active_user());
drop policy if exists "admin_insert_permission_submodules" on permission_submodules;
create policy "admin_insert_permission_submodules" on permission_submodules for insert with check (public.erp_is_admin());
drop policy if exists "admin_update_permission_submodules" on permission_submodules;
create policy "admin_update_permission_submodules" on permission_submodules for update using (public.erp_is_admin()) with check (public.erp_is_admin());
drop policy if exists "admin_delete_permission_submodules" on permission_submodules;
create policy "admin_delete_permission_submodules" on permission_submodules for delete using (public.erp_is_admin());

drop policy if exists "active_select_permission_actions" on permission_actions;
create policy "active_select_permission_actions" on permission_actions for select using (public.erp_is_authenticated_active_user());
drop policy if exists "admin_insert_permission_actions" on permission_actions;
create policy "admin_insert_permission_actions" on permission_actions for insert with check (public.erp_is_admin());
drop policy if exists "admin_update_permission_actions" on permission_actions;
create policy "admin_update_permission_actions" on permission_actions for update using (public.erp_is_admin()) with check (public.erp_is_admin());
drop policy if exists "admin_delete_permission_actions" on permission_actions;
create policy "admin_delete_permission_actions" on permission_actions for delete using (public.erp_is_admin());

drop policy if exists "active_select_permission_conditions" on permission_conditions;
create policy "active_select_permission_conditions" on permission_conditions for select using (public.erp_is_authenticated_active_user());
drop policy if exists "admin_insert_permission_conditions" on permission_conditions;
create policy "admin_insert_permission_conditions" on permission_conditions for insert with check (public.erp_is_admin());
drop policy if exists "admin_update_permission_conditions" on permission_conditions;
create policy "admin_update_permission_conditions" on permission_conditions for update using (public.erp_is_admin()) with check (public.erp_is_admin());
drop policy if exists "admin_delete_permission_conditions" on permission_conditions;
create policy "admin_delete_permission_conditions" on permission_conditions for delete using (public.erp_is_admin());

drop policy if exists "active_select_permission_resources" on permission_resources;
create policy "active_select_permission_resources" on permission_resources for select using (public.erp_is_authenticated_active_user());
drop policy if exists "admin_insert_permission_resources" on permission_resources;
create policy "admin_insert_permission_resources" on permission_resources for insert with check (public.erp_is_admin());
drop policy if exists "admin_update_permission_resources" on permission_resources;
create policy "admin_update_permission_resources" on permission_resources for update using (public.erp_is_admin()) with check (public.erp_is_admin());
drop policy if exists "admin_delete_permission_resources" on permission_resources;
create policy "admin_delete_permission_resources" on permission_resources for delete using (public.erp_is_admin());

drop policy if exists "active_select_permission_fields" on permission_fields;
create policy "active_select_permission_fields" on permission_fields for select using (public.erp_is_authenticated_active_user());
drop policy if exists "admin_insert_permission_fields" on permission_fields;
create policy "admin_insert_permission_fields" on permission_fields for insert with check (public.erp_is_admin());
drop policy if exists "admin_update_permission_fields" on permission_fields;
create policy "admin_update_permission_fields" on permission_fields for update using (public.erp_is_admin()) with check (public.erp_is_admin());
drop policy if exists "admin_delete_permission_fields" on permission_fields;
create policy "admin_delete_permission_fields" on permission_fields for delete using (public.erp_is_admin());

drop policy if exists "role_select_role_resource_permissions" on role_resource_permissions;
create policy "role_select_role_resource_permissions" on role_resource_permissions for select using (
  public.erp_is_admin()
  or role_id in (
    select u.role_id
    from public.users u
    where u.auth_user_id = auth.uid()
      and u.active = true
      and u.role_id is not null
  )
);
drop policy if exists "admin_insert_role_resource_permissions" on role_resource_permissions;
create policy "admin_insert_role_resource_permissions" on role_resource_permissions for insert with check (public.erp_is_admin());
drop policy if exists "admin_update_role_resource_permissions" on role_resource_permissions;
create policy "admin_update_role_resource_permissions" on role_resource_permissions for update using (public.erp_is_admin()) with check (public.erp_is_admin());
drop policy if exists "admin_delete_role_resource_permissions" on role_resource_permissions;
create policy "admin_delete_role_resource_permissions" on role_resource_permissions for delete using (public.erp_is_admin());

drop policy if exists "role_select_role_field_permissions" on role_field_permissions;
create policy "role_select_role_field_permissions" on role_field_permissions for select using (
  public.erp_is_admin()
  or role_id in (
    select u.role_id
    from public.users u
    where u.auth_user_id = auth.uid()
      and u.active = true
      and u.role_id is not null
  )
);
drop policy if exists "admin_insert_role_field_permissions" on role_field_permissions;
create policy "admin_insert_role_field_permissions" on role_field_permissions for insert with check (public.erp_is_admin());
drop policy if exists "admin_update_role_field_permissions" on role_field_permissions;
create policy "admin_update_role_field_permissions" on role_field_permissions for update using (public.erp_is_admin()) with check (public.erp_is_admin());
drop policy if exists "admin_delete_role_field_permissions" on role_field_permissions;
create policy "admin_delete_role_field_permissions" on role_field_permissions for delete using (public.erp_is_admin());

drop policy if exists "active_select_prospects" on prospects;
create policy "active_select_prospects" on prospects for select using (public.erp_has_module_access('crm', 'view'));
drop policy if exists "active_insert_prospects" on prospects;
create policy "active_insert_prospects" on prospects for insert with check (public.erp_has_module_access('crm', 'create'));
drop policy if exists "active_update_prospects" on prospects;
create policy "active_update_prospects" on prospects for update using (public.erp_has_module_access('crm', 'edit')) with check (public.erp_has_module_access('crm', 'edit'));
drop policy if exists "active_delete_prospects" on prospects;
create policy "active_delete_prospects" on prospects for delete using (public.erp_has_module_access('crm', 'delete'));

drop policy if exists "active_select_clients" on clients;
create policy "active_select_clients" on clients for select using (public.erp_has_module_access('crm', 'view') or public.erp_has_submodule_access('pricing.quotations', 'view'));
drop policy if exists "active_insert_clients" on clients;
create policy "active_insert_clients" on clients for insert with check (public.erp_has_module_access('crm', 'create'));
drop policy if exists "active_update_clients" on clients;
create policy "active_update_clients" on clients for update using (public.erp_has_module_access('crm', 'edit')) with check (public.erp_has_module_access('crm', 'edit'));
drop policy if exists "active_delete_clients" on clients;
create policy "active_delete_clients" on clients for delete using (public.erp_has_module_access('crm', 'delete'));

drop policy if exists "active_select_contacts" on contacts;
create policy "active_select_contacts" on contacts for select using (public.erp_has_module_access('crm', 'view') or public.erp_has_submodule_access('pricing.quotations', 'view'));
drop policy if exists "active_insert_contacts" on contacts;
create policy "active_insert_contacts" on contacts for insert with check (public.erp_has_module_access('crm', 'create'));
drop policy if exists "active_update_contacts" on contacts;
create policy "active_update_contacts" on contacts for update using (public.erp_has_module_access('crm', 'edit')) with check (public.erp_has_module_access('crm', 'edit'));
drop policy if exists "active_delete_contacts" on contacts;
create policy "active_delete_contacts" on contacts for delete using (public.erp_has_module_access('crm', 'delete'));

drop policy if exists "active_select_client_logistics_parties" on client_logistics_parties;
create policy "active_select_client_logistics_parties" on client_logistics_parties for select using (public.erp_has_module_access('crm', 'view') or public.erp_has_submodule_access('pricing.quotations', 'view'));
drop policy if exists "active_insert_client_logistics_parties" on client_logistics_parties;
create policy "active_insert_client_logistics_parties" on client_logistics_parties for insert with check (public.erp_has_module_access('crm', 'create'));
drop policy if exists "active_update_client_logistics_parties" on client_logistics_parties;
create policy "active_update_client_logistics_parties" on client_logistics_parties for update using (public.erp_has_module_access('crm', 'edit')) with check (public.erp_has_module_access('crm', 'edit'));
drop policy if exists "active_delete_client_logistics_parties" on client_logistics_parties;
create policy "active_delete_client_logistics_parties" on client_logistics_parties for delete using (public.erp_has_module_access('crm', 'delete'));

drop policy if exists "active_select_providers" on providers;
create policy "active_select_providers" on providers for select using (public.erp_has_submodule_access('pricing.providers', 'view') or public.erp_has_resource_access('crm.quotations.pricing_options', 'view'));
drop policy if exists "active_insert_providers" on providers;
create policy "active_insert_providers" on providers for insert with check (public.erp_has_submodule_access('pricing.providers', 'create'));
drop policy if exists "active_update_providers" on providers;
create policy "active_update_providers" on providers for update using (public.erp_has_submodule_access('pricing.providers', 'edit')) with check (public.erp_has_submodule_access('pricing.providers', 'edit'));
drop policy if exists "active_delete_providers" on providers;
create policy "active_delete_providers" on providers for delete using (public.erp_has_submodule_access('pricing.providers', 'delete'));

drop policy if exists "active_select_provider_contacts" on provider_contacts;
create policy "active_select_provider_contacts" on provider_contacts for select using (public.erp_has_submodule_access('pricing.providers', 'view') or public.erp_has_resource_access('crm.quotations.pricing_options', 'view'));
drop policy if exists "active_insert_provider_contacts" on provider_contacts;
create policy "active_insert_provider_contacts" on provider_contacts for insert with check (public.erp_has_submodule_access('pricing.providers', 'create'));
drop policy if exists "active_update_provider_contacts" on provider_contacts;
create policy "active_update_provider_contacts" on provider_contacts for update using (public.erp_has_submodule_access('pricing.providers', 'edit')) with check (public.erp_has_submodule_access('pricing.providers', 'edit'));
drop policy if exists "active_delete_provider_contacts" on provider_contacts;
create policy "active_delete_provider_contacts" on provider_contacts for delete using (public.erp_has_submodule_access('pricing.providers', 'delete'));

drop policy if exists "active_select_provider_service_offerings" on provider_service_offerings;
create policy "active_select_provider_service_offerings" on provider_service_offerings for select using (public.erp_has_submodule_access('pricing.providers', 'view') or public.erp_has_resource_access('crm.quotations.pricing_options', 'view'));
drop policy if exists "active_insert_provider_service_offerings" on provider_service_offerings;
create policy "active_insert_provider_service_offerings" on provider_service_offerings for insert with check (public.erp_has_submodule_access('pricing.providers', 'create'));
drop policy if exists "active_update_provider_service_offerings" on provider_service_offerings;
create policy "active_update_provider_service_offerings" on provider_service_offerings for update using (public.erp_has_submodule_access('pricing.providers', 'edit')) with check (public.erp_has_submodule_access('pricing.providers', 'edit'));
drop policy if exists "active_delete_provider_service_offerings" on provider_service_offerings;
create policy "active_delete_provider_service_offerings" on provider_service_offerings for delete using (public.erp_has_submodule_access('pricing.providers', 'delete'));

drop policy if exists "active_select_opportunities" on opportunities;
create policy "active_select_opportunities" on opportunities for select using (public.erp_has_module_access('crm', 'view') or public.erp_has_submodule_access('pricing.quotations', 'view'));
drop policy if exists "active_insert_opportunities" on opportunities;
create policy "active_insert_opportunities" on opportunities for insert with check (public.erp_has_submodule_access('crm.opportunities', 'create'));
drop policy if exists "active_update_opportunities" on opportunities;
create policy "active_update_opportunities" on opportunities for update using (public.erp_has_submodule_access('crm.opportunities', 'edit')) with check (public.erp_has_submodule_access('crm.opportunities', 'edit'));
drop policy if exists "active_delete_opportunities" on opportunities;
create policy "active_delete_opportunities" on opportunities for delete using (public.erp_has_submodule_access('crm.opportunities', 'delete'));

drop policy if exists "active_select_quotations" on quotations;
create policy "active_select_quotations" on quotations for select using (public.erp_has_submodule_access('crm.quotations', 'view') or public.erp_has_submodule_access('pricing.quotations', 'view') or public.erp_has_submodule_access('operations.shipments', 'view'));
drop policy if exists "active_insert_quotations" on quotations;
create policy "active_insert_quotations" on quotations for insert with check (public.erp_has_submodule_access('crm.quotations', 'create'));
drop policy if exists "active_update_quotations" on quotations;
create policy "active_update_quotations" on quotations for update using (public.erp_has_submodule_access('crm.quotations', 'edit') or public.erp_has_submodule_access('pricing.quotations', 'edit')) with check (public.erp_has_submodule_access('crm.quotations', 'edit') or public.erp_has_submodule_access('pricing.quotations', 'edit'));
drop policy if exists "active_delete_quotations" on quotations;
create policy "active_delete_quotations" on quotations for delete using (public.erp_has_submodule_access('crm.quotations', 'delete'));

drop policy if exists "active_select_quotation_costs" on quotation_costs;
create policy "active_select_quotation_costs" on quotation_costs for select using (public.erp_has_resource_access('pricing.quotations.cost_section', 'view') or public.erp_has_resource_access('crm.quotations.pricing_options', 'view'));
drop policy if exists "active_insert_quotation_costs" on quotation_costs;
create policy "active_insert_quotation_costs" on quotation_costs for insert with check (public.erp_has_resource_access('pricing.quotations.cost_section', 'create'));
drop policy if exists "active_update_quotation_costs" on quotation_costs;
create policy "active_update_quotation_costs" on quotation_costs for update using (public.erp_has_resource_access('pricing.quotations.cost_section', 'edit')) with check (public.erp_has_resource_access('pricing.quotations.cost_section', 'edit'));
drop policy if exists "active_delete_quotation_costs" on quotation_costs;
create policy "active_delete_quotation_costs" on quotation_costs for delete using (public.erp_has_resource_access('pricing.quotations.cost_section', 'delete'));

drop policy if exists "active_select_quotation_cargo_lines" on quotation_cargo_lines;
create policy "active_select_quotation_cargo_lines" on quotation_cargo_lines for select using (public.erp_has_submodule_access('crm.quotations', 'view') or public.erp_has_submodule_access('pricing.quotations', 'view'));
drop policy if exists "active_insert_quotation_cargo_lines" on quotation_cargo_lines;
create policy "active_insert_quotation_cargo_lines" on quotation_cargo_lines for insert with check (public.erp_has_submodule_access('crm.quotations', 'create'));
drop policy if exists "active_update_quotation_cargo_lines" on quotation_cargo_lines;
create policy "active_update_quotation_cargo_lines" on quotation_cargo_lines for update using (public.erp_has_submodule_access('crm.quotations', 'edit')) with check (public.erp_has_submodule_access('crm.quotations', 'edit'));
drop policy if exists "active_delete_quotation_cargo_lines" on quotation_cargo_lines;
create policy "active_delete_quotation_cargo_lines" on quotation_cargo_lines for delete using (public.erp_has_submodule_access('crm.quotations', 'delete'));

drop policy if exists "active_insert_quotation_rejection_reasons" on quotation_rejection_reasons;
create policy "active_insert_quotation_rejection_reasons" on quotation_rejection_reasons for insert with check (public.erp_has_submodule_access('master_data.sales.rejection_reasons', 'create'));
drop policy if exists "active_update_quotation_rejection_reasons" on quotation_rejection_reasons;
create policy "active_update_quotation_rejection_reasons" on quotation_rejection_reasons for update using (public.erp_has_submodule_access('master_data.sales.rejection_reasons', 'edit')) with check (public.erp_has_submodule_access('master_data.sales.rejection_reasons', 'edit'));
drop policy if exists "active_delete_quotation_rejection_reasons" on quotation_rejection_reasons;
create policy "active_delete_quotation_rejection_reasons" on quotation_rejection_reasons for delete using (public.erp_has_submodule_access('master_data.sales.rejection_reasons', 'delete'));

drop policy if exists "active_select_shipments" on shipments;
create policy "active_select_shipments" on shipments for select using (public.erp_has_submodule_access('operations.shipments', 'view') or public.erp_has_submodule_access('crm.quotations', 'view'));
drop policy if exists "active_insert_shipments" on shipments;
create policy "active_insert_shipments" on shipments for insert with check (public.erp_has_submodule_access('operations.shipments', 'create'));
drop policy if exists "active_update_shipments" on shipments;
create policy "active_update_shipments" on shipments for update using (public.erp_has_submodule_access('operations.shipments', 'edit')) with check (public.erp_has_submodule_access('operations.shipments', 'edit'));
drop policy if exists "active_delete_shipments" on shipments;
create policy "active_delete_shipments" on shipments for delete using (public.erp_has_submodule_access('operations.shipments', 'delete'));

drop policy if exists "active_select_shipment_events" on shipment_events;
create policy "active_select_shipment_events" on shipment_events for select using (public.erp_has_submodule_access('operations.shipments', 'view'));
drop policy if exists "active_insert_shipment_events" on shipment_events;
create policy "active_insert_shipment_events" on shipment_events for insert with check (public.erp_has_submodule_access('operations.shipments', 'create'));
drop policy if exists "active_update_shipment_events" on shipment_events;
create policy "active_update_shipment_events" on shipment_events for update using (public.erp_has_submodule_access('operations.shipments', 'edit')) with check (public.erp_has_submodule_access('operations.shipments', 'edit'));
drop policy if exists "active_delete_shipment_events" on shipment_events;
create policy "active_delete_shipment_events" on shipment_events for delete using (public.erp_has_submodule_access('operations.shipments', 'delete'));

drop policy if exists "active_select_client_invoices" on client_invoices;
create policy "active_select_client_invoices" on client_invoices for select using (public.erp_has_module_access('finance', 'view') or public.erp_is_admin());
drop policy if exists "active_insert_client_invoices" on client_invoices;
create policy "active_insert_client_invoices" on client_invoices for insert with check (public.erp_has_module_access('finance', 'create') or public.erp_is_admin());
drop policy if exists "active_update_client_invoices" on client_invoices;
create policy "active_update_client_invoices" on client_invoices for update using (public.erp_has_module_access('finance', 'edit') or public.erp_is_admin()) with check (public.erp_has_module_access('finance', 'edit') or public.erp_is_admin());
drop policy if exists "active_delete_client_invoices" on client_invoices;
create policy "active_delete_client_invoices" on client_invoices for delete using (public.erp_has_module_access('finance', 'delete') or public.erp_is_admin());

drop policy if exists "active_select_provider_invoices" on provider_invoices;
create policy "active_select_provider_invoices" on provider_invoices for select using (public.erp_has_module_access('finance', 'view') or public.erp_is_admin());
drop policy if exists "active_insert_provider_invoices" on provider_invoices;
create policy "active_insert_provider_invoices" on provider_invoices for insert with check (public.erp_has_module_access('finance', 'create') or public.erp_is_admin());
drop policy if exists "active_update_provider_invoices" on provider_invoices;
create policy "active_update_provider_invoices" on provider_invoices for update using (public.erp_has_module_access('finance', 'edit') or public.erp_is_admin()) with check (public.erp_has_module_access('finance', 'edit') or public.erp_is_admin());
drop policy if exists "active_delete_provider_invoices" on provider_invoices;
create policy "active_delete_provider_invoices" on provider_invoices for delete using (public.erp_has_module_access('finance', 'delete') or public.erp_is_admin());

drop policy if exists "active_select_commissions" on commissions;
create policy "active_select_commissions" on commissions for select using (public.erp_has_module_access('finance', 'view') or public.erp_is_admin());
drop policy if exists "active_insert_commissions" on commissions;
create policy "active_insert_commissions" on commissions for insert with check (public.erp_has_module_access('finance', 'create') or public.erp_is_admin());
drop policy if exists "active_update_commissions" on commissions;
create policy "active_update_commissions" on commissions for update using (public.erp_has_module_access('finance', 'edit') or public.erp_is_admin()) with check (public.erp_has_module_access('finance', 'edit') or public.erp_is_admin());
drop policy if exists "active_delete_commissions" on commissions;
create policy "active_delete_commissions" on commissions for delete using (public.erp_has_module_access('finance', 'delete') or public.erp_is_admin());

grant execute on all functions in schema public to authenticated;
grant execute on function public.erp_current_branch_id() to authenticated;
grant execute on function public.erp_has_role(text) to authenticated;
grant execute on function public.erp_condition_allows(text, uuid, uuid) to authenticated;
grant execute on function public.erp_access_scope(text, text) to authenticated;
grant execute on function public.erp_has_resource_access(text, text, uuid, uuid) to authenticated;
grant execute on function public.erp_has_module_access(text, text) to authenticated;
grant execute on function public.erp_has_submodule_access(text, text) to authenticated;
grant execute on function public.erp_has_field_access(text, text, text, uuid, uuid) to authenticated;
grant execute on function public.erp_can_access_route(text, text) to authenticated;
grant execute on function public.get_current_navigation_items() to authenticated;
