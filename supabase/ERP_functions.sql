-- =========================================
-- ERP BUSINESS LOGIC FUNCTIONS
-- =========================================


-- =========================================
-- 0. AUTH ACCESS CONTROL
-- =========================================

create or replace function erp_is_authenticated_active_user()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.auth_user_id = auth.uid()
      and u.active = true
  );
$$;

create or replace function erp_current_role_name()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select r.name
  from public.users u
  left join public.roles r on r.id = u.role_id
  where u.auth_user_id = auth.uid()
    and u.active = true
  limit 1;
$$;

create or replace function erp_current_user_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select u.id
  from public.users u
  where u.auth_user_id = auth.uid()
    and u.active = true
  limit 1;
$$;

create or replace function erp_is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(lower(public.erp_current_role_name()) = 'admin', false);
$$;

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
  field_registered boolean := false;
begin
  if public.erp_is_admin() then
    return true;
  end if;

  if not public.erp_is_authenticated_active_user() then
    return false;
  end if;

  resolved_scope := public.erp_access_scope(p_resource_key, p_action_code);

  return public.erp_condition_allows(
    resolved_scope,
    p_owner_user_id,
    p_branch_id
  );
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
  field_registered boolean := false;
begin
  if public.erp_is_admin() then
    return true;
  end if;

  if not public.erp_is_authenticated_active_user() then
    return false;
  end if;

  select exists (
    select 1
    from public.permission_fields pf
    join public.permission_resources pr
      on pr.id = pf.resource_id
    where pr.resource_key = p_resource_key
      and pf.field_key = p_field_key
      and pf.active = true
  )
  into field_registered;

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

  if resolved_scope is null then
    if field_registered then
      return false;
    end if;

    return public.erp_has_resource_access(
      p_resource_key,
      p_action_code,
      p_owner_user_id,
      p_branch_id
    );
  end if;

  if resolved_scope = 'none' then
    return false;
  end if;

  return public.erp_condition_allows(
    resolved_scope,
    p_owner_user_id,
    p_branch_id
  );
end;
$$;

create or replace function erp_can_access_client_resource(
  p_resource_key text,
  p_action_code text default 'view',
  p_client_id uuid default null
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  client_owner_id uuid;
  client_branch_id uuid;
begin
  if p_client_id is null then
    return false;
  end if;

  select
    c.account_owner_id,
    c.branch_id
  into client_owner_id, client_branch_id
  from public.clients c
  where c.id = p_client_id
    and c.is_deleted = false;

  if not found then
    return false;
  end if;

  return public.erp_has_resource_access(
    p_resource_key,
    p_action_code,
    client_owner_id,
    client_branch_id
  );
end;
$$;

create or replace function erp_can_access_opportunity_resource(
  p_resource_key text,
  p_action_code text default 'view',
  p_salesperson_id uuid default null,
  p_client_id uuid default null
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  client_branch_id uuid;
begin
  if p_client_id is not null then
    select c.branch_id
    into client_branch_id
    from public.clients c
    where c.id = p_client_id
      and c.is_deleted = false;
  end if;

  return public.erp_has_resource_access(
    p_resource_key,
    p_action_code,
    p_salesperson_id,
    client_branch_id
  );
end;
$$;

create or replace function erp_can_access_crm_quotation_resource(
  p_resource_key text,
  p_action_code text default 'view',
  p_created_by uuid default null,
  p_client_id uuid default null
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  client_branch_id uuid;
begin
  if p_client_id is not null then
    select c.branch_id
    into client_branch_id
    from public.clients c
    where c.id = p_client_id
      and c.is_deleted = false;
  end if;

  return public.erp_has_resource_access(
    p_resource_key,
    p_action_code,
    p_created_by,
    client_branch_id
  );
end;
$$;

create or replace function resolve_default_branch_for_backfill()
returns uuid
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  resolved_branch_id uuid;
  branch_count integer;
begin
  select count(*)
  into branch_count
  from public.branches;

  if branch_count = 1 then
    select b.id
    into resolved_branch_id
    from public.branches b
    limit 1;

    return resolved_branch_id;
  end if;

  return null;
end;
$$;

create or replace function resolve_default_crm_owner_for_backfill()
returns uuid
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  resolved_owner_id uuid;
  owner_count integer;
begin
  select count(*)
  into owner_count
  from public.users u
  join public.roles r
    on r.id = u.role_id
  where u.active = true
    and lower(r.name) in ('ventas', 'admin');

  if owner_count = 1 then
    select u.id
    into resolved_owner_id
    from public.users u
    join public.roles r
      on r.id = u.role_id
    where u.active = true
      and lower(r.name) in ('ventas', 'admin')
    limit 1;

    return resolved_owner_id;
  end if;

  return null;
end;
$$;

create or replace function backfill_crm_owner_branch_defaults(
  p_default_owner_id uuid default null,
  p_default_branch_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_owner_id uuid := coalesce(
    p_default_owner_id,
    public.resolve_default_crm_owner_for_backfill()
  );
  resolved_branch_id uuid := coalesce(
    p_default_branch_id,
    public.resolve_default_branch_for_backfill()
  );
  updated_users integer := 0;
  updated_clients_owner integer := 0;
  updated_clients_branch integer := 0;
  updated_opportunities integer := 0;
begin
  if resolved_branch_id is not null then
    update public.users u
    set branch_id = resolved_branch_id
    where u.active = true
      and u.branch_id is null;

    get diagnostics updated_users = row_count;
  end if;

  with owner_candidates as (
    select
      c.id as client_id,
      coalesce(
        c.account_owner_id,
        (
          select o.salesperson_id
          from public.opportunities o
          where o.client_id = c.id
            and o.salesperson_id is not null
          order by o.created_at desc
          limit 1
        ),
        (
          select q.created_by
          from public.quotations q
          where q.client_id = c.id
            and q.created_by is not null
          order by q.created_at desc
          limit 1
        ),
        resolved_owner_id
      ) as resolved_owner_id
    from public.clients c
    where c.is_deleted = false
  )
  update public.clients c
  set account_owner_id = oc.resolved_owner_id
  from owner_candidates oc
  where c.id = oc.client_id
    and c.account_owner_id is null
    and oc.resolved_owner_id is not null;

  get diagnostics updated_clients_owner = row_count;

  update public.clients c
  set branch_id = coalesce(u.branch_id, resolved_branch_id)
  from public.users u
  where c.is_deleted = false
    and c.account_owner_id = u.id
    and c.branch_id is null
    and coalesce(u.branch_id, resolved_branch_id) is not null;

  get diagnostics updated_clients_branch = row_count;

  update public.opportunities o
  set salesperson_id = c.account_owner_id
  from public.clients c
  where o.client_id = c.id
    and o.salesperson_id is null
    and c.account_owner_id is not null;

  get diagnostics updated_opportunities = row_count;

  return jsonb_build_object(
    'resolved_default_owner_id', resolved_owner_id,
    'resolved_default_branch_id', resolved_branch_id,
    'updated_users_branch_id', updated_users,
    'updated_clients_owner', updated_clients_owner,
    'updated_clients_branch', updated_clients_branch,
    'updated_opportunities_salesperson', updated_opportunities
  );
end;
$$;

create or replace function erp_can_access_pricing_quotation(
  p_action_code text default 'view',
  p_status text default null,
  p_pricing_owner_id uuid default null
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  normalized_action text := lower(coalesce(btrim(p_action_code), 'view'));
  normalized_status text := lower(coalesce(btrim(p_status), ''));
begin
  if normalized_action = 'pricing_take' then
    return normalized_status in ('pendiente', 'renegociar_tarifa')
      and public.erp_has_resource_access('pricing.quotations', 'pricing_take');
  end if;

  if normalized_action = 'view' and normalized_status in ('pendiente', 'renegociar_tarifa') then
    return public.erp_has_resource_access('pricing.quotations.queue', 'view');
  end if;

  if normalized_action = 'view' then
    return public.erp_has_resource_access(
      'pricing.quotations.workspace',
      'view',
      p_pricing_owner_id,
      null
    );
  end if;

  return public.erp_has_resource_access(
    'pricing.quotations.workspace',
    normalized_action,
    p_pricing_owner_id,
    null
  );
end;
$$;

create or replace function erp_can_access_operations_shipment(
  p_action_code text default 'view',
  p_client_id uuid default null
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  client_branch_id uuid;
begin
  if p_client_id is null then
    return false;
  end if;

  select c.branch_id
  into client_branch_id
  from public.clients c
  where c.id = p_client_id
    and c.is_deleted = false;

  if not found then
    return false;
  end if;

  return public.erp_has_resource_access(
    'operations.shipments.record',
    p_action_code,
    null,
    client_branch_id
  );
end;
$$;

create or replace function erp_can_view_quotation_cost()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.erp_has_field_access('crm.quotations.record', 'cost', 'view')
    or public.erp_has_field_access('pricing.quotations.cost_section', 'purchase_amount', 'view');
$$;

create or replace function erp_can_edit_quotation_purchase_amount()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.erp_has_field_access('pricing.quotations.cost_section', 'purchase_amount', 'edit');
$$;

create or replace function erp_can_view_quotation_sale_price()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.erp_has_field_access('crm.quotations.record', 'sale_price', 'view')
    or public.erp_has_field_access('pricing.quotations.cost_section', 'sale_amount', 'view');
$$;

create or replace function erp_can_edit_quotation_sale_price()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.erp_has_field_access('crm.quotations.record', 'sale_price', 'edit')
    or public.erp_has_field_access('pricing.quotations.cost_section', 'sale_amount', 'edit');
$$;

create or replace function erp_can_view_quotation_expected_profit()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.erp_has_field_access('crm.quotations.record', 'expected_profit', 'view')
    or public.erp_has_field_access('pricing.quotations.cost_section', 'profit_amount', 'view');
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
  order by
    pm.sort_order asc,
    ps.sort_order asc,
    ps.name asc;
$$;

create or replace function resolve_login_identity(
  p_login text
)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select u.email
  from public.users u
  where u.active = true
    and (
      lower(u.email) = lower(btrim(p_login))
      or lower(coalesce(u.username, '')) = lower(btrim(p_login))
    )
  limit 1;
$$;

create or replace function link_current_auth_user()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_auth_email text;
  linked_user_id uuid;
begin
  if auth.uid() is null then
    return null;
  end if;

  select au.email
  into current_auth_email
  from auth.users au
  where au.id = auth.uid();

  if current_auth_email is null then
    return null;
  end if;

  update public.users
  set
    auth_user_id = auth.uid(),
    email = lower(current_auth_email),
    updated_at = now()
  where lower(email) = lower(current_auth_email)
    and active = true
    and (auth_user_id is null or auth_user_id = auth.uid());

  select u.id
  into linked_user_id
  from public.users u
  where u.auth_user_id = auth.uid()
    and u.active = true
  limit 1;

  return linked_user_id;
end;
$$;

create or replace function get_current_erp_user()
returns table (
  id uuid,
  auth_user_id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  username text,
  active boolean,
  role_id uuid,
  role_name text,
  branch_id uuid
)
language sql
security definer
stable
set search_path = public
as $$
  select
    u.id,
    u.auth_user_id,
    u.first_name,
    u.last_name,
    u.email,
    u.phone,
    u.username,
    u.active,
    u.role_id,
    r.name as role_name,
    u.branch_id
  from public.users u
  left join public.roles r on r.id = u.role_id
  where u.auth_user_id = auth.uid()
    and u.active = true
  limit 1;
$$;

create or replace function create_erp_user_profile(
  p_first_name text,
  p_email text,
  p_last_name text default null,
  p_phone text default null,
  p_username text default null,
  p_role_name text default null,
  p_active boolean default true,
  p_auth_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_role_id uuid;
  new_user_id uuid;
begin
  if not public.erp_is_admin() then
    raise exception 'forbidden';
  end if;

  if nullif(btrim(coalesce(p_email, '')), '') is null then
    raise exception 'email_required';
  end if;

  if nullif(btrim(coalesce(p_role_name, '')), '') is not null then
    select r.id
    into resolved_role_id
    from public.roles r
    where lower(r.name) = lower(btrim(p_role_name))
    limit 1;

    if resolved_role_id is null then
      raise exception 'invalid_role';
    end if;
  end if;

  insert into public.users (
    auth_user_id,
    first_name,
    last_name,
    email,
    phone,
    username,
    role_id,
    active
  )
  values (
    p_auth_user_id,
    nullif(btrim(coalesce(p_first_name, '')), ''),
    nullif(btrim(coalesce(p_last_name, '')), ''),
    lower(btrim(p_email)),
    nullif(btrim(coalesce(p_phone, '')), ''),
    nullif(lower(btrim(coalesce(p_username, ''))), ''),
    resolved_role_id,
    coalesce(p_active, true)
  )
  returning id into new_user_id;

  return new_user_id;
end;
$$;

create or replace function update_erp_user_profile(
  p_user_id uuid,
  p_first_name text,
  p_email text,
  p_last_name text default null,
  p_phone text default null,
  p_username text default null,
  p_role_name text default null,
  p_active boolean default true,
  p_auth_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_role_id uuid;
begin
  if not public.erp_is_admin() then
    raise exception 'forbidden';
  end if;

  if nullif(btrim(coalesce(p_email, '')), '') is null then
    raise exception 'email_required';
  end if;

  if nullif(btrim(coalesce(p_role_name, '')), '') is not null then
    select r.id
    into resolved_role_id
    from public.roles r
    where lower(r.name) = lower(btrim(p_role_name))
    limit 1;

    if resolved_role_id is null then
      raise exception 'invalid_role';
    end if;
  end if;

  update public.users
  set
    auth_user_id = coalesce(p_auth_user_id, auth_user_id),
    first_name = nullif(btrim(coalesce(p_first_name, '')), ''),
    last_name = nullif(btrim(coalesce(p_last_name, '')), ''),
    email = lower(btrim(p_email)),
    phone = nullif(btrim(coalesce(p_phone, '')), ''),
    username = nullif(lower(btrim(coalesce(p_username, ''))), ''),
    role_id = resolved_role_id,
    active = coalesce(p_active, active),
    updated_at = now()
  where id = p_user_id;

  return p_user_id;
end;
$$;


-- =========================================
-- 1. CREATE CLIENT WITH CONTACTS
-- =========================================

create or replace function create_client_with_contacts(
  p_company_name text,
  p_website text default null,
  p_corporate_phone text default null,
  p_country text default null,
  p_industry text default null,
  p_status text default 'prospecto',
  p_full_address text default null,
  p_postal_code text default null,
  p_city text default null,
  p_city_unlocode text default null,
  p_account_owner_id uuid default null,
  p_contacts jsonb default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_client_id uuid;
  resolved_account_owner_id uuid := coalesce(p_account_owner_id, public.erp_current_user_id());
begin
  insert into clients (
    company_name,
    website,
    corporate_phone,
    country,
    industry,
    status,
    full_address,
    postal_code,
    city,
    city_unlocode,
    account_owner_id
  )
  values (
    p_company_name,
    p_website,
    p_corporate_phone,
    p_country,
    p_industry,
    coalesce(nullif(btrim(p_status), ''), 'prospecto'),
    p_full_address,
    p_postal_code,
    p_city,
    p_city_unlocode,
    resolved_account_owner_id
  )
  returning id into new_client_id;

  if p_contacts is not null then
    insert into contacts (
      client_id,
      name,
      email,
      phone,
      linkedin_url,
      position,
      status,
      is_primary
    )
    select
      new_client_id,
      contact->>'name',
      contact->>'email',
      contact->>'phone',
      contact->>'linkedin_url',
      contact->>'position',
      coalesce(nullif(contact->>'status', ''), 'activo'),
      coalesce((contact->>'is_primary')::boolean, false)
    from jsonb_array_elements(p_contacts) as contact;
  end if;

  return new_client_id;
end;
$$;


-- =========================================
-- 2. ADD CONTACT TO CLIENT
-- =========================================

create or replace function add_contact_to_client(
  p_client_id uuid,
  p_name text,
  p_email text default null,
  p_phone text default null,
  p_linkedin_url text default null,
  p_position text default null,
  p_status text default 'activo',
  p_is_primary boolean default false
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_contact_id uuid;
begin
  insert into contacts (
    client_id,
    name,
    email,
    phone,
    linkedin_url,
    position,
    status,
    is_primary
  )
  values (
    p_client_id,
    p_name,
    p_email,
    p_phone,
    p_linkedin_url,
    p_position,
    coalesce(nullif(btrim(p_status), ''), 'activo'),
    p_is_primary
  )
  returning id into new_contact_id;

  return new_contact_id;
end;
$$;


-- =========================================
-- 2.25 ADD CLIENT LOGISTICS PARTY
-- =========================================

create or replace function add_client_logistics_party(
  p_client_id uuid,
  p_party_type text,
  p_name text,
  p_full_address text default null,
  p_postal_code text default null,
  p_city_unlocode text default null,
  p_contact_name text default null,
  p_contact_email text default null,
  p_contact_phone text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  normalized_party_type text;
  new_party_id uuid;
begin
  normalized_party_type := lower(coalesce(nullif(btrim(p_party_type), ''), 'shipper'));

  if normalized_party_type not in ('shipper', 'consignee', 'aa') then
    raise exception 'Invalid party_type. Expected shipper, consignee, or aa';
  end if;

  if nullif(btrim(coalesce(p_name, '')), '') is null then
    raise exception 'name is required';
  end if;

  insert into client_logistics_parties (
    client_id,
    party_type,
    name,
    full_address,
    postal_code,
    city_unlocode,
    contact_name,
    contact_email,
    contact_phone
  )
  values (
    p_client_id,
    normalized_party_type,
    btrim(p_name),
    nullif(btrim(coalesce(p_full_address, '')), ''),
    nullif(btrim(coalesce(p_postal_code, '')), ''),
    nullif(upper(btrim(coalesce(p_city_unlocode, ''))), ''),
    nullif(btrim(coalesce(p_contact_name, '')), ''),
    nullif(btrim(coalesce(p_contact_email, '')), ''),
    nullif(btrim(coalesce(p_contact_phone, '')), '')
  )
  returning id into new_party_id;

  return new_party_id;
end;
$$;


-- =========================================
-- 2.5 DELETE CLIENT LOGISTICS PARTY
-- =========================================

create or replace function delete_client_logistics_party(
  p_party_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  delete from client_logistics_parties
  where id = p_party_id;
end;
$$;


-- =========================================
-- 2.75 RESOLVE UN/LOCODE REFERENCE
-- =========================================

create or replace function resolve_unlocode_reference(
  p_unlocode text default null,
  p_unlocode_id uuid default null
)
returns table (
  resolved_id uuid,
  resolved_unlocode text,
  resolved_city text,
  resolved_country text
)
language sql
stable
as $$
  select
    u.id as resolved_id,
    u.unlocode as resolved_unlocode,
    case
      when coalesce(u.subdivision_code, '') <> '' then u.name || ', ' || u.subdivision_code
      else u.name
    end as resolved_city,
    u.country_name as resolved_country
  from unlocodes u
  where (
    p_unlocode_id is not null and u.id = p_unlocode_id
  ) or (
    p_unlocode_id is null
    and nullif(upper(btrim(coalesce(p_unlocode, ''))), '') is not null
    and u.unlocode = upper(btrim(p_unlocode))
  )
  limit 1;
$$;


-- =========================================
-- 3. OPPORTUNITY HELPERS
-- =========================================

create or replace function calculate_opportunity_expiration_date(
  p_start_date date
)
returns date
language sql
immutable
as $$
  select
    case
      when p_start_date is null then null
      else (
        date_trunc('month', (p_start_date::timestamp + interval '6 months'))
        + interval '1 month'
        - interval '1 day'
      )::date
    end
$$;

create or replace function build_opportunity_title(
  p_client_id uuid,
  p_service_type text default null,
  p_transport_type text default null,
  p_origin text default null,
  p_destination text default null
)
returns text
language plpgsql
stable
as $$
declare
  client_name text;
  lane_label text;
begin
  select company_name
  into client_name
  from clients
  where id = p_client_id;

  lane_label := case
    when nullif(btrim(coalesce(p_origin, '')), '') is not null
      and nullif(btrim(coalesce(p_destination, '')), '') is not null
      then btrim(p_origin) || ' -> ' || btrim(p_destination)
    when nullif(btrim(coalesce(p_origin, '')), '') is not null
      then btrim(p_origin)
    when nullif(btrim(coalesce(p_destination, '')), '') is not null
      then btrim(p_destination)
    else null
  end;

  return concat_ws(
    ' · ',
    nullif(btrim(coalesce(client_name, '')), ''),
    nullif(
      concat_ws(
        ' / ',
        nullif(btrim(coalesce(p_service_type, '')), ''),
        nullif(btrim(coalesce(p_transport_type, '')), '')
      ),
      ''
    ),
    lane_label
  );
end;
$$;

create or replace function sync_expired_opportunities()
returns integer
language plpgsql
security definer
as $$
declare
  affected_rows integer;
begin
  update opportunities
  set status = 'vencida'
  where expiration_date is not null
    and expiration_date < current_date
    and status not in ('aceptado', 'rechazada', 'vencida');

  get diagnostics affected_rows = row_count;
  return affected_rows;
end;
$$;


-- =========================================
-- 4. CREATE OPPORTUNITY
-- =========================================

create or replace function create_opportunity(
  p_client_id uuid,
  p_title text default null,
  p_estimated_value numeric default null,
  p_origin text default null,
  p_destination text default null,
  p_stage text default 'qualification',
  p_service_type text default null,
  p_transport_type text default null,
  p_operation_type text default null,
  p_incoterm_id uuid default null,
  p_origin_unlocode text default null,
  p_destination_unlocode text default null,
  p_expected_profit_usd numeric default null,
  p_service_quantity integer default null,
  p_salesperson_id uuid default null,
  p_description text default null,
  p_status text default 'investigando'
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_opportunity_id uuid;
  resolved_salesperson_id uuid;
begin
  select coalesce(
    p_salesperson_id,
    (
      select c.account_owner_id
      from clients c
      where c.id = p_client_id
    )
  )
  into resolved_salesperson_id;

  insert into opportunities (
    client_id,
    salesperson_id,
    title,
    description,
    service_type,
    transport_type,
    operation_type,
    incoterm_id,
    estimated_value,
    origin,
    origin_unlocode,
    destination,
    destination_unlocode,
    stage,
    status,
    expected_profit_usd,
    service_quantity
  )
  values (
    p_client_id,
    resolved_salesperson_id,
    coalesce(nullif(btrim(p_title), ''), 'Opportunity'),
    nullif(btrim(p_description), ''),
    nullif(btrim(p_service_type), ''),
    nullif(btrim(p_transport_type), ''),
    case
      when nullif(btrim(coalesce(p_operation_type, '')), '') is null then null
      when lower(btrim(p_operation_type)) = 'import' then 'Import'
      when lower(btrim(p_operation_type)) = 'export' then 'Export'
      else btrim(p_operation_type)
    end,
    p_incoterm_id,
    p_estimated_value,
    nullif(btrim(p_origin), ''),
    nullif(btrim(p_origin_unlocode), ''),
    nullif(btrim(p_destination), ''),
    nullif(btrim(p_destination_unlocode), ''),
    coalesce(nullif(btrim(p_stage), ''), 'qualification'),
    coalesce(nullif(btrim(p_status), ''), 'investigando'),
    p_expected_profit_usd,
    p_service_quantity
  )
  returning id into new_opportunity_id;

  return new_opportunity_id;
end;
$$;


-- =========================================
-- 5. UPDATE OPPORTUNITY STATUS
-- =========================================

create or replace function update_opportunity_status(
  p_opportunity_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
as $$
begin
  perform sync_expired_opportunities();

  update opportunities
  set status = p_status
  where id = p_opportunity_id;
end;
$$;


-- =========================================
-- 6. QUOTATION HELPERS
-- =========================================

create or replace function next_quotation_reference(
  p_service_type text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_service_type text;
  resolved_prefix text;
  next_value bigint;
begin
  normalized_service_type := upper(btrim(coalesce(p_service_type, '')));

  update quotation_reference_counters
  set
    last_value = last_value + 1,
    updated_at = now()
  where service_type = normalized_service_type
  returning prefix, last_value
  into resolved_prefix, next_value;

  if resolved_prefix is null then
    raise exception 'Unsupported quotation service type: %', p_service_type;
  end if;

  return resolved_prefix || '-' || lpad(next_value::text, 6, '0');
end;
$$;

create or replace function recalculate_quotation_totals(
  p_quotation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total_purchase numeric;
  total_sale numeric;
  total_profit numeric;
begin
  select
    coalesce(sum(coalesce(qc.purchase_amount_mxn, qc.purchase_amount, qc.cost, 0)), 0),
    coalesce(sum(coalesce(qc.sale_amount_mxn, qc.sale_amount, 0)), 0),
    coalesce(sum(coalesce(qc.profit_amount_mxn, qc.profit_amount, coalesce(qc.sale_amount_mxn, qc.sale_amount, 0) - coalesce(qc.purchase_amount_mxn, qc.purchase_amount, qc.cost, 0))), 0)
  into total_purchase, total_sale, total_profit
  from quotation_costs qc
  where qc.quotation_id = p_quotation_id;

  update quotations
  set
    estimated_cost = total_purchase,
    estimated_price = case when total_sale = 0 then null else total_sale end,
    expected_profit = case when total_sale = 0 and total_purchase = 0 then null else total_profit end
  where id = p_quotation_id;
end;
$$;

create or replace function normalize_currency_code(
  p_currency text
)
returns text
language plpgsql
immutable
as $$
declare
  normalized text := upper(nullif(btrim(coalesce(p_currency, '')), ''));
begin
  if normalized is null then
    return 'MXN';
  end if;

  if normalized not in ('MXN', 'USD', 'EUR') then
    raise exception 'Unsupported currency: %', p_currency;
  end if;

  return normalized;
end;
$$;

create or replace function get_exchange_rate_to_mxn(
  p_currency text,
  p_reference_date date default current_date
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_currency text := public.normalize_currency_code(p_currency);
  resolved_rate numeric;
begin
  if normalized_currency = 'MXN' then
    return 1;
  end if;

  select er.rate_value
  into resolved_rate
  from exchange_rates er
  where er.base_currency = normalized_currency
    and er.quote_currency = 'MXN'
    and er.rate_date <= coalesce(p_reference_date, current_date) - interval '1 day'
  order by er.rate_date desc,
    case when er.source = 'BANXICO' then 0 else 1 end asc
  limit 1;

  if resolved_rate is null then
    raise exception 'No exchange rate available for % -> MXN before %', normalized_currency, coalesce(p_reference_date, current_date);
  end if;

  return resolved_rate;
end;
$$;

create or replace function get_exchange_rate_snapshot_to_mxn(
  p_currency text,
  p_reference_date date default current_date
)
returns table (
  rate_date date,
  rate_value numeric,
  source text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_currency text := public.normalize_currency_code(p_currency);
begin
  if normalized_currency = 'MXN' then
    return query
    select
      coalesce(p_reference_date, current_date),
      1::numeric,
      'SYSTEM'::text;
    return;
  end if;

  return query
  select
    er.rate_date,
    er.rate_value,
    er.source
  from exchange_rates er
  where er.base_currency = normalized_currency
    and er.quote_currency = 'MXN'
    and er.rate_date <= coalesce(p_reference_date, current_date) - interval '1 day'
  order by er.rate_date desc,
    case when er.source = 'BANXICO' then 0 else 1 end asc
  limit 1;

  if not found then
    raise exception 'No exchange rate snapshot available for % -> MXN before %', normalized_currency, coalesce(p_reference_date, current_date);
  end if;
end;
$$;

create or replace function resolve_quotation_exchange_rate_to_mxn(
  p_quotation_id uuid,
  p_currency text,
  p_reference_date date default current_date
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_currency text := public.normalize_currency_code(p_currency);
  quotation_row record;
  snapshot_row record;
begin
  if normalized_currency = 'MXN' then
    return 1;
  end if;

  select
    q.status,
    q.accepted_usd_to_mxn_rate,
    q.accepted_eur_to_mxn_rate
  into quotation_row
  from quotations q
  where q.id = p_quotation_id;

  if quotation_row is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  if quotation_row.status = 'aceptada' then
    if normalized_currency = 'USD' and quotation_row.accepted_usd_to_mxn_rate is not null then
      return quotation_row.accepted_usd_to_mxn_rate;
    end if;

    if normalized_currency = 'EUR' and quotation_row.accepted_eur_to_mxn_rate is not null then
      return quotation_row.accepted_eur_to_mxn_rate;
    end if;
  end if;

  select *
  into snapshot_row
  from get_exchange_rate_snapshot_to_mxn(normalized_currency, p_reference_date);

  return snapshot_row.rate_value;
end;
$$;

create or replace function lock_quotation_exchange_rates(
  p_quotation_id uuid,
  p_reference_date date default current_date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  usd_snapshot record;
  eur_snapshot record;
begin
  select *
  into usd_snapshot
  from get_exchange_rate_snapshot_to_mxn('USD', p_reference_date);

  select *
  into eur_snapshot
  from get_exchange_rate_snapshot_to_mxn('EUR', p_reference_date);

  update quotations
  set
    accepted_usd_rate_date = usd_snapshot.rate_date,
    accepted_usd_to_mxn_rate = usd_snapshot.rate_value,
    accepted_eur_rate_date = eur_snapshot.rate_date,
    accepted_eur_to_mxn_rate = eur_snapshot.rate_value,
    exchange_rates_locked_at = now()
  where id = p_quotation_id;
end;
$$;

create or replace function ensure_quotation_option(
  p_quotation_id uuid,
  p_quotation_option_id uuid default null,
  p_option_label text default null
)
returns table (
  id uuid,
  option_label text,
  sort_order integer,
  include_in_customer_quote boolean,
  purchase_valid_until date,
  sales_valid_until date,
  sales_validity_overridden boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_option record;
  next_sort_order integer;
  normalized_label text;
begin
  if p_quotation_option_id is not null then
    return query
    select
      qo.id,
      qo.option_label,
      qo.sort_order,
      qo.include_in_customer_quote,
      qo.purchase_valid_until,
      qo.sales_valid_until,
      qo.sales_validity_overridden
    from quotation_options qo
    where qo.id = p_quotation_option_id
      and qo.quotation_id = p_quotation_id;

    if found then
      return;
    end if;

    raise exception 'Quotation option % not found for quotation %', p_quotation_option_id, p_quotation_id;
  end if;

  normalized_label := nullif(btrim(coalesce(p_option_label, '')), '');

  if normalized_label is not null then
    select
      qo.id,
      qo.option_label,
      qo.sort_order,
      qo.include_in_customer_quote,
      qo.purchase_valid_until,
      qo.sales_valid_until,
      qo.sales_validity_overridden
    into existing_option
    from quotation_options qo
    where qo.quotation_id = p_quotation_id
      and qo.option_label = normalized_label;

    if existing_option is not null then
      return query
      select
        existing_option.id,
        existing_option.option_label,
        existing_option.sort_order,
        existing_option.include_in_customer_quote,
        existing_option.purchase_valid_until,
        existing_option.sales_valid_until,
        existing_option.sales_validity_overridden;
      return;
    end if;
  end if;

  select coalesce(max(qo.sort_order), 0) + 1
  into next_sort_order
  from quotation_options qo
  where qo.quotation_id = p_quotation_id;

  insert into quotation_options (
    quotation_id,
    option_label,
    sort_order,
    include_in_customer_quote,
    purchase_valid_until,
    sales_valid_until,
    sales_validity_overridden
  )
  values (
    p_quotation_id,
    coalesce(normalized_label, 'Opcion ' || next_sort_order),
    next_sort_order,
    true,
    null,
    null,
    false
  )
  returning
    quotation_options.id,
    quotation_options.option_label,
    quotation_options.sort_order,
    quotation_options.include_in_customer_quote,
    quotation_options.purchase_valid_until,
    quotation_options.sales_valid_until,
    quotation_options.sales_validity_overridden
  into existing_option;

  return query
  select
    existing_option.id,
    existing_option.option_label,
    existing_option.sort_order,
    existing_option.include_in_customer_quote,
    existing_option.purchase_valid_until,
    existing_option.sales_valid_until,
    existing_option.sales_validity_overridden;
end;
$$;

create or replace function update_quotation_option_validity(
  p_quotation_option_id uuid,
  p_purchase_valid_until date default null,
  p_sales_valid_until date default null,
  p_override_sales_valid_until boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_row record;
  can_edit_pricing boolean := false;
begin
  select
    q.id as quotation_id,
    q.pricing_owner_id,
    q.created_by,
    q.client_id,
    qo.purchase_valid_until,
    qo.sales_valid_until,
    qo.sales_validity_overridden
  into quotation_row
  from quotation_options qo
  join quotations q on q.id = qo.quotation_id
  where qo.id = p_quotation_option_id;

  if quotation_row is null then
    raise exception 'Quotation option % not found', p_quotation_option_id;
  end if;

  can_edit_pricing := public.erp_has_resource_access(
    'pricing.quotations.cost_section',
    'edit',
    quotation_row.pricing_owner_id,
    null
  );

  if p_purchase_valid_until is not null and not (can_edit_pricing or public.erp_is_admin()) then
    raise exception 'You do not have permission to edit purchase validity for this quotation option'
      using errcode = '42501';
  end if;

  if p_override_sales_valid_until and not public.erp_is_admin() then
    raise exception 'Only Admin may override quotation sales validity'
      using errcode = '42501';
  end if;

  if p_override_sales_valid_until and p_sales_valid_until is null then
    raise exception 'Sales validity is required when overriding quotation sales validity';
  end if;

  update quotation_options
  set
    purchase_valid_until = coalesce(p_purchase_valid_until, purchase_valid_until),
    sales_valid_until = case
      when p_override_sales_valid_until then p_sales_valid_until
      when p_purchase_valid_until is not null then p_purchase_valid_until
      else sales_valid_until
    end,
    sales_validity_overridden = case
      when p_override_sales_valid_until then true
      when p_purchase_valid_until is not null then false
      else sales_validity_overridden
    end,
    updated_at = now()
  where id = p_quotation_option_id;
end;
$$;

create or replace function refresh_quotation_cost_line_mxn(
  p_quotation_id uuid,
  p_reference_date date default current_date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update quotation_costs qc
  set
    purchase_exchange_rate_to_mxn = public.resolve_quotation_exchange_rate_to_mxn(
      qc.quotation_id,
      qc.purchase_currency,
      p_reference_date
    ),
    purchase_amount_mxn = case
      when qc.purchase_amount is null then null
      else qc.purchase_amount * public.resolve_quotation_exchange_rate_to_mxn(
        qc.quotation_id,
        qc.purchase_currency,
        p_reference_date
      )
    end,
    sale_exchange_rate_to_mxn = public.resolve_quotation_exchange_rate_to_mxn(
      qc.quotation_id,
      qc.sale_currency,
      p_reference_date
    ),
    sale_amount_mxn = case
      when qc.sale_amount is null then null
      else qc.sale_amount * public.resolve_quotation_exchange_rate_to_mxn(
        qc.quotation_id,
        qc.sale_currency,
        p_reference_date
      )
    end,
    profit_amount_mxn = case
      when qc.sale_amount is null or qc.purchase_amount is null then null
      else
        (qc.sale_amount * public.resolve_quotation_exchange_rate_to_mxn(
          qc.quotation_id,
          qc.sale_currency,
          p_reference_date
        ))
        - (qc.purchase_amount * public.resolve_quotation_exchange_rate_to_mxn(
          qc.quotation_id,
          qc.purchase_currency,
          p_reference_date
        ))
    end
  where qc.quotation_id = p_quotation_id;
end;
$$;

create or replace function refresh_open_quotation_exchange_rates(
  p_reference_date date default current_date
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_row record;
  affected_count integer := 0;
begin
  for quotation_row in
    select q.id
    from quotations q
    where q.status <> 'aceptada'
  loop
    perform public.refresh_quotation_cost_line_mxn(quotation_row.id, p_reference_date);
    perform public.recalculate_quotation_totals(quotation_row.id);
    affected_count := affected_count + 1;
  end loop;

  return affected_count;
end;
$$;

create or replace function set_quotation_option_customer_visibility(
  p_quotation_option_id uuid,
  p_include_in_customer_quote boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_row record;
begin
  select
    q.id,
    q.created_by,
    q.client_id
  into quotation_row
  from quotation_options qo
  join quotations q on q.id = qo.quotation_id
  where qo.id = p_quotation_option_id;

  if quotation_row is null then
    raise exception 'Quotation option % not found', p_quotation_option_id;
  end if;

  if not public.erp_can_access_crm_quotation_resource(
    'crm.quotations.customer_actions',
    'edit',
    quotation_row.created_by,
    quotation_row.client_id
  ) then
    raise exception 'You do not have permission to select customer-visible options'
      using errcode = '42501';
  end if;

  update quotation_options
  set include_in_customer_quote = coalesce(p_include_in_customer_quote, true)
  where id = p_quotation_option_id;
end;
$$;

create or replace function create_quotation_from_opportunity(
  p_opportunity_id uuid,
  p_pickup_address text default null,
  p_delivery_address text default null,
  p_required_quote_date date default null,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_quotation_id uuid;
  opportunity_row opportunities%rowtype;
  resolved_created_by uuid;
begin
  perform sync_expired_opportunities();

  select *
  into opportunity_row
  from opportunities
  where id = p_opportunity_id;

  if not found then
    raise exception 'Opportunity % not found', p_opportunity_id;
  end if;

  if nullif(btrim(coalesce(opportunity_row.service_type, '')), '') is null then
    raise exception 'Opportunity % must define a service type before quoting', p_opportunity_id;
  end if;

  resolved_created_by := coalesce(p_created_by, erp_current_user_id(), opportunity_row.salesperson_id);

  insert into quotations (
    client_id,
    opportunity_id,
    created_by,
    status,
    service_type,
    transport_type,
    operation_type,
    origin,
    origin_unlocode,
    origin_unlocode_id,
    destination,
    destination_unlocode,
    destination_unlocode_id,
    pickup_address,
    delivery_address,
    incoterm_id,
    required_quote_date,
    purchase_valid_until,
    sales_valid_until
  )
  values (
    opportunity_row.client_id,
    opportunity_row.id,
    resolved_created_by,
    'borrador',
    opportunity_row.service_type,
    opportunity_row.transport_type,
    opportunity_row.operation_type,
    opportunity_row.origin,
    opportunity_row.origin_unlocode,
    opportunity_row.origin_unlocode_id,
    opportunity_row.destination,
    opportunity_row.destination_unlocode,
    opportunity_row.destination_unlocode_id,
    nullif(btrim(coalesce(p_pickup_address, '')), ''),
    nullif(btrim(coalesce(p_delivery_address, '')), ''),
    opportunity_row.incoterm_id,
    p_required_quote_date,
    null,
    null
  )
  returning id into new_quotation_id;

  update opportunities
  set status = 'cotizando'
  where id = p_opportunity_id
    and status not in ('aceptado', 'rechazada', 'vencida');

  return new_quotation_id;
end;
$$;

create or replace function request_quotation_pricing(
  p_quotation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_created_by uuid;
  quotation_client_id uuid;
begin
  select
    q.created_by,
    q.client_id
  into quotation_created_by, quotation_client_id
  from quotations q
  where q.id = p_quotation_id;

  if quotation_client_id is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  if not public.erp_can_access_crm_quotation_resource(
    'crm.quotations.record',
    'edit',
    quotation_created_by,
    quotation_client_id
  ) then
    raise exception 'You do not have permission to send this quotation to pricing'
      using errcode = '42501';
  end if;

  update quotations
  set status = 'pendiente'
  where id = p_quotation_id;
end;
$$;

create or replace function convert_opportunity_to_quotation(
  p_opportunity_id uuid,
  p_created_by uuid default null
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select create_quotation_from_opportunity(
    p_opportunity_id => p_opportunity_id,
    p_created_by => p_created_by
  );
$$;

create or replace function take_quotation_for_pricing(
  p_quotation_id uuid,
  p_pricing_owner_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_pricing_owner_id uuid;
  current_status text;
begin
  resolved_pricing_owner_id := coalesce(p_pricing_owner_id, erp_current_user_id());

  if resolved_pricing_owner_id is null then
    raise exception 'Pricing owner is required';
  end if;

  select q.status
  into current_status
  from quotations q
  where q.id = p_quotation_id;

  if current_status is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  if not public.erp_can_access_pricing_quotation(
    'pricing_take',
    current_status,
    null
  ) then
    raise exception 'You do not have permission to take this quotation'
      using errcode = '42501';
  end if;

  update quotations
  set
    pricing_owner_id = resolved_pricing_owner_id,
    status = 'cotizando'
  where id = p_quotation_id;
end;
$$;

create or replace function update_quotation_status(
  p_quotation_id uuid,
  p_status text,
  p_rejection_reason_id uuid default null,
  p_rejection_notes text default null,
  p_cancellation_notes text default null,
  p_target_rate numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_status text;
  quotation_created_by uuid;
  quotation_pricing_owner_id uuid;
  quotation_client_id uuid;
begin
  normalized_status := lower(btrim(coalesce(p_status, '')));

  if normalized_status = '' then
    raise exception 'Quotation status is required';
  end if;

  if normalized_status = 'rechazada' and p_rejection_reason_id is null then
    raise exception 'A rejection reason is required when rejecting a quotation';
  end if;

  if normalized_status = 'renegociar_tarifa' and p_target_rate is null then
    raise exception 'A target rate is required when requesting renegotiation';
  end if;

  select
    q.created_by,
    q.pricing_owner_id,
    q.client_id
  into quotation_created_by, quotation_pricing_owner_id, quotation_client_id
  from quotations q
  where q.id = p_quotation_id;

  if quotation_client_id is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  if normalized_status = 'lista_para_enviar' then
    if not public.erp_can_access_pricing_quotation(
      'edit',
      normalized_status,
      quotation_pricing_owner_id
    ) then
      raise exception 'You do not have permission to complete the pricing proposal'
        using errcode = '42501';
    end if;
  elsif normalized_status = 'enviada' then
    if not public.erp_has_resource_access('crm.quotations', 'send_quote')
      or not public.erp_can_access_crm_quotation_resource(
        'crm.quotations.customer_actions',
        'edit',
        quotation_created_by,
        quotation_client_id
      ) then
      raise exception 'You do not have permission to send this quotation'
        using errcode = '42501';
    end if;
  elsif normalized_status in ('cancelada', 'rechazada', 'renegociar_tarifa', 'aceptada') then
    if not public.erp_can_access_crm_quotation_resource(
      'crm.quotations.customer_actions',
      'edit',
      quotation_created_by,
      quotation_client_id
    ) then
      raise exception 'You do not have permission to change this quotation status'
        using errcode = '42501';
    end if;
  elsif normalized_status = 'pendiente' then
    if not public.erp_can_access_crm_quotation_resource(
      'crm.quotations.record',
      'edit',
      quotation_created_by,
      quotation_client_id
    ) then
      raise exception 'You do not have permission to request pricing for this quotation'
        using errcode = '42501';
    end if;
  end if;

  update quotations
  set
    status = normalized_status,
    rejection_reason_id = case when normalized_status = 'rechazada' then p_rejection_reason_id else null end,
    rejection_notes = case
      when normalized_status in ('rechazada', 'renegociar_tarifa') then nullif(btrim(coalesce(p_rejection_notes, '')), '')
      else null
    end,
    cancellation_notes = case when normalized_status = 'cancelada' then nullif(btrim(coalesce(p_cancellation_notes, '')), '') else null end,
    target_rate = case when normalized_status = 'renegociar_tarifa' then p_target_rate else null end
  where id = p_quotation_id;

  if normalized_status = 'aceptada' then
    perform public.lock_quotation_exchange_rates(p_quotation_id, current_date);
  end if;

  perform public.refresh_quotation_cost_line_mxn(p_quotation_id, current_date);
  perform public.recalculate_quotation_totals(p_quotation_id);
end;
$$;

create or replace function search_quotations(
  p_scope text default 'crm',
  p_query text default null,
  p_status text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid,
  client_id uuid,
  opportunity_id uuid,
  created_by uuid,
  pricing_owner_id uuid,
  reference_number text,
  status text,
  service_type text,
  transport_type text,
  operation_type text,
  incoterm_id uuid,
  incoterm_code text,
  origin text,
  origin_unlocode text,
  origin_unlocode_id uuid,
  destination text,
  destination_unlocode text,
  destination_unlocode_id uuid,
  pickup_address text,
  delivery_address text,
  required_quote_date date,
  purchase_valid_until date,
  sales_valid_until date,
  rejection_reason_id uuid,
  rejection_reason text,
  rejection_notes text,
  cancellation_notes text,
  target_rate numeric,
  currency text,
  estimated_cost numeric,
  estimated_price numeric,
  expected_profit numeric,
  can_view_cost boolean,
  can_edit_purchase_amount boolean,
  can_view_sale_price boolean,
  can_edit_sale_price boolean,
  can_view_expected_profit boolean,
  total_charge_lines bigint,
  created_at timestamptz,
  updated_at timestamptz,
  client_name text,
  opportunity_title text,
  salesperson_id uuid,
  salesperson_name text,
  pricing_owner_name text,
  created_by_name text,
  total_count bigint
)
language sql
security definer
set search_path = public
as $$
  with params as (
    select
      lower(coalesce(nullif(btrim(p_scope), ''), 'crm')) as normalized_scope,
      lower(nullif(btrim(p_query), '')) as normalized_query,
      lower(nullif(btrim(p_status), '')) as normalized_status,
      greatest(coalesce(p_limit, 25), 1) as normalized_limit,
      greatest(coalesce(p_offset, 0), 0) as normalized_offset,
      public.erp_can_view_quotation_cost() as can_view_cost,
      public.erp_can_edit_quotation_purchase_amount() as can_edit_purchase_amount,
      public.erp_can_view_quotation_sale_price() as can_view_sale_price,
      public.erp_can_edit_quotation_sale_price() as can_edit_sale_price,
      public.erp_can_view_quotation_expected_profit() as can_view_expected_profit
  ),
  filtered as (
    select
      q.id,
      q.client_id,
      q.opportunity_id,
      q.created_by,
      q.pricing_owner_id,
      q.reference_number,
      q.status,
      q.service_type,
      q.transport_type,
      q.operation_type,
      q.incoterm_id,
      i.code as incoterm_code,
      q.origin,
      q.origin_unlocode,
      q.origin_unlocode_id,
      q.destination,
      q.destination_unlocode,
      q.destination_unlocode_id,
      q.pickup_address,
      q.delivery_address,
      q.required_quote_date,
      null::date as purchase_valid_until,
      null::date as sales_valid_until,
      q.rejection_reason_id,
      rr.reason as rejection_reason,
      q.rejection_notes,
      q.cancellation_notes,
      q.target_rate,
      q.currency,
      case when p.can_view_cost then q.estimated_cost else null end as estimated_cost,
      case when p.can_view_sale_price then q.estimated_price else null end as estimated_price,
      case when p.can_view_expected_profit then q.expected_profit else null end as expected_profit,
      p.can_view_cost,
      p.can_edit_purchase_amount,
      p.can_view_sale_price,
      p.can_edit_sale_price,
      p.can_view_expected_profit,
      (
        select count(*)
        from quotation_costs qc
        where qc.quotation_id = q.id
      ) as total_charge_lines,
      q.created_at,
      q.updated_at,
      c.company_name as client_name,
      o.title as opportunity_title,
      o.salesperson_id,
      concat_ws(' ', su.first_name, su.last_name) as salesperson_name,
      concat_ws(' ', pu.first_name, pu.last_name) as pricing_owner_name,
      concat_ws(' ', cu.first_name, cu.last_name) as created_by_name,
      case
        when p.normalized_query is null then 0
        when lower(coalesce(q.reference_number, '')) = p.normalized_query then 1000
        when lower(coalesce(q.reference_number, '')) like p.normalized_query || '%' then 950
        when lower(c.company_name) = p.normalized_query then 900
        when lower(c.company_name) like p.normalized_query || '%' then 875
        when lower(coalesce(o.title, '')) like p.normalized_query || '%' then 850
        when upper(coalesce(q.origin_unlocode, '')) = upper(p.normalized_query) then 825
        when upper(coalesce(q.destination_unlocode, '')) = upper(p.normalized_query) then 825
        else greatest(
          similarity(q.search_text, p.normalized_query),
          similarity(c.search_text, p.normalized_query),
          similarity(lower(coalesce(o.title, '')), p.normalized_query)
        ) * 100
      end as match_rank
    from quotations q
    join clients c on c.id = q.client_id
    join opportunities o on o.id = q.opportunity_id
    left join incoterms i on i.id = q.incoterm_id
    left join quotation_rejection_reasons rr on rr.id = q.rejection_reason_id
    left join users pu on pu.id = q.pricing_owner_id
    left join users cu on cu.id = q.created_by
    left join users su on su.id = o.salesperson_id
    cross join params p
    where c.is_deleted = false
      and (
        (
          p.normalized_scope = 'crm'
          and public.erp_can_access_crm_quotation_resource(
            'crm.quotations.list',
            'view',
            q.created_by,
            q.client_id
          )
        )
        or (
          p.normalized_scope = 'pricing'
          and q.status in ('pendiente', 'cotizando', 'lista_para_enviar', 'renegociar_tarifa')
          and public.erp_can_access_pricing_quotation(
            'view',
            q.status,
            q.pricing_owner_id
          )
        )
      )
      and (
        p.normalized_status is null
        or q.status = p.normalized_status
      )
      and (
        p.normalized_query is null
        or q.search_text % p.normalized_query
        or q.search_text ilike '%' || p.normalized_query || '%'
        or c.search_text % p.normalized_query
        or c.search_text ilike '%' || p.normalized_query || '%'
        or lower(coalesce(o.title, '')) ilike '%' || p.normalized_query || '%'
        or lower(concat_ws(' ', pu.first_name, pu.last_name)) ilike '%' || p.normalized_query || '%'
      )
  )
  select
    filtered.id,
    filtered.client_id,
    filtered.opportunity_id,
    filtered.created_by,
    filtered.pricing_owner_id,
    filtered.reference_number,
    filtered.status,
    filtered.service_type,
    filtered.transport_type,
    filtered.operation_type,
    filtered.incoterm_id,
    filtered.incoterm_code,
    filtered.origin,
    filtered.origin_unlocode,
    filtered.origin_unlocode_id,
    filtered.destination,
    filtered.destination_unlocode,
    filtered.destination_unlocode_id,
    filtered.pickup_address,
    filtered.delivery_address,
    filtered.required_quote_date,
    filtered.purchase_valid_until,
    filtered.sales_valid_until,
    filtered.rejection_reason_id,
    filtered.rejection_reason,
    filtered.rejection_notes,
    filtered.cancellation_notes,
    filtered.target_rate,
    filtered.currency,
    filtered.estimated_cost,
    filtered.estimated_price,
    filtered.expected_profit,
    filtered.can_view_cost,
    filtered.can_edit_purchase_amount,
    filtered.can_view_sale_price,
    filtered.can_edit_sale_price,
    filtered.can_view_expected_profit,
    filtered.total_charge_lines,
    filtered.created_at,
    filtered.updated_at,
    filtered.client_name,
    filtered.opportunity_title,
    filtered.salesperson_id,
    filtered.salesperson_name,
    filtered.pricing_owner_name,
    filtered.created_by_name,
    count(*) over() as total_count
  from filtered
  cross join params p
  order by
    filtered.match_rank desc,
    filtered.created_at desc,
    filtered.id desc
  limit (select normalized_limit from params)
  offset (select normalized_offset from params);
$$;

create or replace function approve_quotation(
  p_quotation_id uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  select update_quotation_status(
    p_quotation_id => p_quotation_id,
    p_status => 'aceptada'
  );
$$;

create or replace function create_quotation_cost_line(
  p_quotation_id uuid,
  p_quotation_option_id uuid default null,
  p_option_label text default null,
  p_provider_id uuid default null,
  p_sales_accounting_concept_id uuid default null,
  p_purchase_amount numeric default null,
  p_purchase_currency text default 'USD',
  p_purchase_valid_until date default null,
  p_sale_amount numeric default null,
  p_sale_currency text default 'USD',
  p_vat_rate numeric default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_line_id uuid;
  concept_row sales_accounting_concepts%rowtype;
  quotation_pricing_owner_id uuid;
  quotation_status text;
  normalized_purchase_currency text;
  normalized_sale_currency text;
  resolved_option record;
begin
  select
    q.pricing_owner_id,
    q.status
  into quotation_pricing_owner_id, quotation_status
  from quotations q
  where q.id = p_quotation_id;

  if quotation_status is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  if not public.erp_has_resource_access(
    'pricing.quotations.cost_section',
    'create',
    quotation_pricing_owner_id,
    null
  ) then
    raise exception 'You do not have permission to create quotation costs'
      using errcode = '42501';
  end if;

  if p_purchase_amount is not null and not public.erp_can_edit_quotation_purchase_amount() then
    raise exception 'You do not have permission to edit quotation cost'
      using errcode = '42501';
  end if;

  if p_sale_amount is not null and not public.erp_can_edit_quotation_sale_price() then
    raise exception 'You do not have permission to edit quotation sale price'
      using errcode = '42501';
  end if;

  if p_sales_accounting_concept_id is not null then
    select *
    into concept_row
    from sales_accounting_concepts
    where id = p_sales_accounting_concept_id;

    if not found then
      raise exception 'Sales accounting concept % not found', p_sales_accounting_concept_id;
    end if;
  end if;

  normalized_purchase_currency := public.normalize_currency_code(p_purchase_currency);
  normalized_sale_currency := public.normalize_currency_code(coalesce(p_sale_currency, p_purchase_currency));

  select *
  into resolved_option
  from public.ensure_quotation_option(
    p_quotation_id => p_quotation_id,
    p_quotation_option_id => p_quotation_option_id,
    p_option_label => p_option_label
  );

  insert into quotation_costs (
    quotation_id,
    quotation_option_id,
    option_label,
    provider_id,
    sales_accounting_concept_id,
    service_name,
    cost,
    purchase_amount,
    purchase_currency,
    purchase_exchange_rate_to_mxn,
    purchase_amount_mxn,
    sale_amount,
    sale_currency,
    sale_exchange_rate_to_mxn,
    sale_amount_mxn,
    profit_amount,
    profit_amount_mxn,
    vat_rate,
    notes
  )
  values (
    p_quotation_id,
    resolved_option.id,
    resolved_option.option_label,
    p_provider_id,
    p_sales_accounting_concept_id,
    coalesce(concept_row.concept, 'Cargo'),
    coalesce(p_purchase_amount, 0),
    p_purchase_amount,
    normalized_purchase_currency,
    null,
    null,
    p_sale_amount,
    normalized_sale_currency,
    null,
    null,
    case
      when p_sale_amount is null or p_purchase_amount is null then null
      else p_sale_amount - p_purchase_amount
    end,
    null,
    coalesce(p_vat_rate, concept_row.vat_rate, 0),
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning id into new_line_id;

  perform public.refresh_quotation_cost_line_mxn(p_quotation_id, current_date);
  if p_purchase_valid_until is not null then
    perform public.update_quotation_option_validity(
      p_quotation_option_id => resolved_option.id,
      p_purchase_valid_until => p_purchase_valid_until,
      p_sales_valid_until => null,
      p_override_sales_valid_until => false
    );
  end if;
  perform recalculate_quotation_totals(p_quotation_id);

  return new_line_id;
end;
$$;

create or replace function update_quotation_cost_line(
  p_id uuid,
  p_quotation_option_id uuid default null,
  p_option_label text default null,
  p_provider_id uuid default null,
  p_sales_accounting_concept_id uuid default null,
  p_purchase_amount numeric default null,
  p_purchase_currency text default null,
  p_purchase_valid_until date default null,
  p_sale_amount numeric default null,
  p_sale_currency text default null,
  p_vat_rate numeric default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_id_value uuid;
  previous_option_id uuid;
  quotation_created_by uuid;
  quotation_pricing_owner_id uuid;
  quotation_client_id uuid;
  concept_row sales_accounting_concepts%rowtype;
  current_purchase_amount numeric;
  current_purchase_currency text;
  current_sale_amount numeric;
  current_sale_currency text;
  can_edit_pricing boolean := false;
  can_edit_sales boolean := false;
  normalized_purchase_currency text;
  normalized_sale_currency text;
  resolved_option record;
begin
  select quotation_id
  into quotation_id_value
  from quotation_costs
  where id = p_id;

  if quotation_id_value is null then
    raise exception 'Quotation cost line % not found', p_id;
  end if;

  select
    quotation_option_id,
    purchase_amount,
    purchase_currency,
    sale_amount,
    sale_currency
  into previous_option_id, current_purchase_amount, current_purchase_currency, current_sale_amount, current_sale_currency
  from quotation_costs
  where id = p_id;

  select
    q.created_by,
    q.pricing_owner_id,
    q.client_id
  into quotation_created_by, quotation_pricing_owner_id, quotation_client_id
  from quotations q
  where q.id = quotation_id_value;

  can_edit_pricing := public.erp_has_resource_access(
    'pricing.quotations.cost_section',
    'edit',
    quotation_pricing_owner_id,
    null
  );

  can_edit_sales := public.erp_can_access_crm_quotation_resource(
    'crm.quotations.customer_actions',
    'edit',
    quotation_created_by,
    quotation_client_id
  );

  if not can_edit_pricing and not can_edit_sales then
    raise exception 'You do not have permission to update quotation costs'
      using errcode = '42501';
  end if;

  if not can_edit_pricing and (
    p_purchase_amount is not null
    or p_provider_id is not null
    or p_sales_accounting_concept_id is not null
    or p_vat_rate is not null
    or p_notes is not null
  ) then
    raise exception 'You do not have permission to edit purchase-side quotation costs'
      using errcode = '42501';
  end if;

  if p_purchase_amount is not null and not public.erp_can_edit_quotation_purchase_amount() then
    raise exception 'You do not have permission to edit quotation cost'
      using errcode = '42501';
  end if;

  if p_sale_amount is not null and not can_edit_sales then
    raise exception 'You do not have permission to edit quotation sale price'
      using errcode = '42501';
  end if;

  if p_sale_amount is not null and not public.erp_can_edit_quotation_sale_price() then
    raise exception 'You do not have permission to edit quotation sale price'
      using errcode = '42501';
  end if;

  if p_sales_accounting_concept_id is not null then
    select *
    into concept_row
    from sales_accounting_concepts
    where id = p_sales_accounting_concept_id;

    if not found then
      raise exception 'Sales accounting concept % not found', p_sales_accounting_concept_id;
    end if;
  end if;

  normalized_purchase_currency := coalesce(
    case when p_purchase_currency is null then null else public.normalize_currency_code(p_purchase_currency) end,
    current_purchase_currency,
    'MXN'
  );
  normalized_sale_currency := coalesce(
    case when p_sale_currency is null then null else public.normalize_currency_code(p_sale_currency) end,
    current_sale_currency,
    normalized_purchase_currency,
    'MXN'
  );

  if p_quotation_option_id is not null or nullif(btrim(coalesce(p_option_label, '')), '') is not null then
    select *
    into resolved_option
    from public.ensure_quotation_option(
      p_quotation_id => quotation_id_value,
      p_quotation_option_id => p_quotation_option_id,
      p_option_label => p_option_label
    );
  end if;

  update quotation_costs
  set
    quotation_option_id = coalesce(resolved_option.id, quotation_option_id),
    option_label = coalesce(resolved_option.option_label, option_label),
    provider_id = p_provider_id,
    sales_accounting_concept_id = p_sales_accounting_concept_id,
    service_name = coalesce(concept_row.concept, service_name),
    cost = coalesce(p_purchase_amount, cost),
    purchase_amount = coalesce(p_purchase_amount, purchase_amount),
    purchase_currency = normalized_purchase_currency,
    purchase_exchange_rate_to_mxn = null,
    purchase_amount_mxn = null,
    sale_amount = coalesce(p_sale_amount, sale_amount),
    sale_currency = normalized_sale_currency,
    sale_exchange_rate_to_mxn = null,
    sale_amount_mxn = null,
    profit_amount = case
      when coalesce(p_sale_amount, current_sale_amount) is null
        or coalesce(p_purchase_amount, current_purchase_amount) is null then null
      else coalesce(p_sale_amount, current_sale_amount) - coalesce(p_purchase_amount, current_purchase_amount)
    end,
    profit_amount_mxn = null,
    vat_rate = coalesce(p_vat_rate, concept_row.vat_rate, vat_rate),
    notes = nullif(btrim(coalesce(p_notes, '')), '')
  where id = p_id;

  if previous_option_id is not null
    and previous_option_id <> coalesce(resolved_option.id, previous_option_id)
    and not exists (
      select 1
      from quotation_costs qc
      where qc.quotation_option_id = previous_option_id
    ) then
    delete from quotation_options
    where id = previous_option_id;
  end if;

  if p_purchase_valid_until is not null then
    perform public.update_quotation_option_validity(
      p_quotation_option_id => coalesce(resolved_option.id, previous_option_id),
      p_purchase_valid_until => p_purchase_valid_until,
      p_sales_valid_until => null,
      p_override_sales_valid_until => false
    );
  end if;

  perform public.refresh_quotation_cost_line_mxn(quotation_id_value, current_date);
  perform recalculate_quotation_totals(quotation_id_value);
end;
$$;

create or replace function update_quotation_option_sales_amounts(
  p_quotation_id uuid,
  p_quotation_option_id uuid,
  p_sales_amounts jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from quotations q
    where q.id = p_quotation_id
      and public.erp_can_access_crm_quotation_resource(
        'crm.quotations.customer_actions',
        'edit',
        q.created_by,
        q.client_id
      )
  ) then
    raise exception 'You do not have permission to edit sale amounts for this quotation'
      using errcode = '42501';
  end if;

  if not public.erp_can_edit_quotation_sale_price() then
    raise exception 'You do not have permission to edit quotation sale price'
      using errcode = '42501';
  end if;

  if p_sales_amounts is null or jsonb_typeof(p_sales_amounts) <> 'object' then
    raise exception 'Sales amounts payload must be a JSON object keyed by quotation cost line id';
  end if;

  update quotation_costs qc
  set
    sale_amount = updates.sale_amount,
    sale_currency = updates.sale_currency,
    sale_exchange_rate_to_mxn = null,
    sale_amount_mxn = null,
    profit_amount = case
      when updates.sale_amount is null or qc.purchase_amount is null then null
      else updates.sale_amount - qc.purchase_amount
    end,
    profit_amount_mxn = null
  from (
    select
      key::uuid as line_id,
      case
        when jsonb_typeof(value) = 'object' then nullif(btrim(value ->> 'sale_amount'), '')::numeric
        else nullif(btrim(trim(both '"' from value::text)), '')::numeric
      end as sale_amount,
      coalesce(
        case
          when jsonb_typeof(value) = 'object' then public.normalize_currency_code(value ->> 'sale_currency')
          else null
        end,
        qc_existing.sale_currency,
        qc_existing.purchase_currency,
        'MXN'
      ) as sale_currency
    from jsonb_each(p_sales_amounts)
    join quotation_costs qc_existing
      on qc_existing.id = key::uuid
  ) as updates
  where qc.id = updates.line_id
    and qc.quotation_id = p_quotation_id
    and qc.quotation_option_id = p_quotation_option_id;

  perform public.refresh_quotation_cost_line_mxn(p_quotation_id, current_date);
  perform recalculate_quotation_totals(p_quotation_id);
end;
$$;

create or replace function delete_quotation_cost_line(
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_id_value uuid;
  quotation_pricing_owner_id uuid;
  quotation_option_id_value uuid;
begin
  select
    quotation_id,
    quotation_option_id
  into quotation_id_value
    , quotation_option_id_value
  from quotation_costs
  where id = p_id;

  select q.pricing_owner_id
  into quotation_pricing_owner_id
  from quotations q
  where q.id = quotation_id_value;

  if quotation_id_value is null then
    raise exception 'Quotation cost line % not found', p_id;
  end if;

  if not public.erp_has_resource_access(
    'pricing.quotations.cost_section',
    'delete',
    quotation_pricing_owner_id,
    null
  ) then
    raise exception 'You do not have permission to delete quotation costs'
      using errcode = '42501';
  end if;

  delete from quotation_costs
  where id = p_id;

  if quotation_option_id_value is not null and not exists (
    select 1
    from quotation_costs qc
    where qc.quotation_option_id = quotation_option_id_value
  ) then
    delete from quotation_options
    where id = quotation_option_id_value;
  end if;

  if quotation_id_value is not null then
    perform public.refresh_quotation_cost_line_mxn(quotation_id_value, current_date);
    perform recalculate_quotation_totals(quotation_id_value);
  end if;
end;
$$;

create or replace function create_quotation_cargo_line(
  p_quotation_id uuid,
  p_load_type text,
  p_commodities text default null,
  p_piece_count integer default null,
  p_width numeric default null,
  p_length numeric default null,
  p_height numeric default null,
  p_weight numeric default null,
  p_freight_class text default null,
  p_cbm numeric default null,
  p_volumetric_weight_kg numeric default null,
  p_sort_order integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  quotation_created_by uuid;
  quotation_client_id uuid;
begin
  select
    q.created_by,
    q.client_id
  into quotation_created_by, quotation_client_id
  from quotations q
  where q.id = p_quotation_id;

  if quotation_client_id is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  if not public.erp_can_access_crm_quotation_resource(
    'crm.quotations.record',
    'edit',
    quotation_created_by,
    quotation_client_id
  ) then
    raise exception 'You do not have permission to edit quotation cargo lines'
      using errcode = '42501';
  end if;

  insert into quotation_cargo_lines (
    quotation_id,
    load_type,
    commodities,
    piece_count,
    width,
    length,
    height,
    weight,
    freight_class,
    cbm,
    volumetric_weight_kg,
    sort_order
  )
  values (
    p_quotation_id,
    nullif(btrim(coalesce(p_load_type, '')), ''),
    nullif(btrim(coalesce(p_commodities, '')), ''),
    p_piece_count,
    p_width,
    p_length,
    p_height,
    p_weight,
    nullif(btrim(coalesce(p_freight_class, '')), ''),
    p_cbm,
    p_volumetric_weight_kg,
    coalesce(p_sort_order, 1)
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function update_quotation_cargo_line(
  p_id uuid,
  p_load_type text,
  p_commodities text default null,
  p_piece_count integer default null,
  p_width numeric default null,
  p_length numeric default null,
  p_height numeric default null,
  p_weight numeric default null,
  p_freight_class text default null,
  p_cbm numeric default null,
  p_volumetric_weight_kg numeric default null,
  p_sort_order integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_created_by uuid;
  quotation_client_id uuid;
begin
  select
    q.created_by,
    q.client_id
  into quotation_created_by, quotation_client_id
  from quotations q
  join quotation_cargo_lines qcl on qcl.quotation_id = q.id
  where qcl.id = p_id;

  if quotation_client_id is null then
    raise exception 'Quotation cargo line % not found', p_id;
  end if;

  if not public.erp_can_access_crm_quotation_resource(
    'crm.quotations.record',
    'edit',
    quotation_created_by,
    quotation_client_id
  ) then
    raise exception 'You do not have permission to edit quotation cargo lines'
      using errcode = '42501';
  end if;

  update quotation_cargo_lines
  set
    load_type = nullif(btrim(coalesce(p_load_type, '')), ''),
    commodities = nullif(btrim(coalesce(p_commodities, '')), ''),
    piece_count = p_piece_count,
    width = p_width,
    length = p_length,
    height = p_height,
    weight = p_weight,
    freight_class = nullif(btrim(coalesce(p_freight_class, '')), ''),
    cbm = p_cbm,
    volumetric_weight_kg = p_volumetric_weight_kg,
    sort_order = coalesce(p_sort_order, 1)
  where id = p_id;
end;
$$;

create or replace function delete_quotation_cargo_line(
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_created_by uuid;
  quotation_client_id uuid;
begin
  select
    q.created_by,
    q.client_id
  into quotation_created_by, quotation_client_id
  from quotations q
  join quotation_cargo_lines qcl on qcl.quotation_id = q.id
  where qcl.id = p_id;

  if quotation_client_id is null then
    raise exception 'Quotation cargo line % not found', p_id;
  end if;

  if not public.erp_can_access_crm_quotation_resource(
    'crm.quotations.record',
    'edit',
    quotation_created_by,
    quotation_client_id
  ) then
    raise exception 'You do not have permission to delete quotation cargo lines'
      using errcode = '42501';
  end if;

  delete from quotation_cargo_lines
  where id = p_id;
end;
$$;

create or replace function create_booking_from_quotation(
  p_quotation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status text;
  quotation_created_by uuid;
  quotation_client_id uuid;
  shipment_id uuid;
begin
  select
    q.status,
    q.created_by,
    q.client_id
  into current_status, quotation_created_by, quotation_client_id
  from quotations
  where id = p_quotation_id;

  if current_status is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  if not public.erp_has_resource_access('crm.quotations', 'create_booking')
    or not public.erp_can_access_crm_quotation_resource(
      'crm.quotations.customer_actions',
      'edit',
      quotation_created_by,
      quotation_client_id
    ) then
    raise exception 'You do not have permission to create a booking from this quotation'
      using errcode = '42501';
  end if;

  if current_status <> 'aceptada' then
    raise exception 'Quotation % must be aceptada before booking', p_quotation_id;
  end if;

  shipment_id := create_shipment(p_quotation_id);
  return shipment_id;
end;
$$;

create or replace function create_quotation_rejection_reason(
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into quotation_rejection_reasons (
    reason
  )
  values (
    nullif(btrim(coalesce(p_reason, '')), '')
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function update_quotation_rejection_reason(
  p_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update quotation_rejection_reasons
  set reason = nullif(btrim(coalesce(p_reason, '')), '')
  where id = p_id;
end;
$$;

create or replace function delete_quotation_rejection_reason(
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from quotation_rejection_reasons
  where id = p_id;
end;
$$;


-- =========================================
-- 7. CREATE SHIPMENT
-- =========================================

create or replace function create_shipment(
  p_quotation_id uuid
)
returns uuid
language plpgsql
security definer
as $$
declare
  existing_shipment_id uuid;
  quotation_row quotations%rowtype;
  new_shipment_id uuid;
begin
  select id
  into existing_shipment_id
  from shipments
  where quotation_id = p_quotation_id
  limit 1;

  if existing_shipment_id is not null then
    return existing_shipment_id;
  end if;

  select *
  into quotation_row
  from quotations
  where id = p_quotation_id;

  if not found then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  insert into shipments (
    quotation_id,
    client_id,
    status,
    origin,
    destination
  )
  values (
    quotation_row.id,
    quotation_row.client_id,
    'pending',
    quotation_row.origin,
    quotation_row.destination
  )
  returning id into new_shipment_id;

  return new_shipment_id;
end;
$$;


-- =========================================
-- 8. UPDATE SHIPMENT STATUS
-- =========================================

create or replace function update_shipment_status(
  p_shipment_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
as $$
begin
  update shipments
  set status = p_status
  where id = p_shipment_id;
end;
$$;


-- =========================================
-- 9. MARK SHIPMENT DELIVERED
-- =========================================

create or replace function mark_shipment_delivered(
  p_shipment_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  update shipments
  set
    status = 'delivered',
    delivered_at = now()
  where id = p_shipment_id;
end;
$$;


-- =========================================
-- 10. GET FULL CLIENT DATA
-- =========================================

create or replace function get_client_full(
  p_client_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  result jsonb;
begin
  if not public.erp_can_access_client_resource(
    'crm.clients.record',
    'view',
    p_client_id
  ) then
    return null;
  end if;

  select jsonb_build_object(
    'client', to_jsonb(c),
    'contacts', coalesce(
      (
        select jsonb_agg(to_jsonb(ct) order by ct.created_at desc)
        from contacts ct
        where ct.client_id = c.id
      ),
      '[]'::jsonb
    ),
    'logistics_parties', coalesce(
      (
        select jsonb_agg(to_jsonb(clp) order by clp.created_at desc)
        from client_logistics_parties clp
        where clp.client_id = c.id
      ),
      '[]'::jsonb
    ),
    'opportunities', coalesce(
      (
        select jsonb_agg(to_jsonb(o) order by o.created_at desc)
        from opportunities o
        where o.client_id = c.id
      ),
      '[]'::jsonb
    ),
    'quotations', coalesce(
      (
        select jsonb_agg(to_jsonb(q) order by q.created_at desc)
        from quotations q
        where q.client_id = c.id
      ),
      '[]'::jsonb
    ),
    'shipments', coalesce(
      (
        select jsonb_agg(to_jsonb(s) order by s.created_at desc)
        from shipments s
        where s.client_id = c.id
      ),
      '[]'::jsonb
    )
  )
  into result
  from clients c
  where c.id = p_client_id
    and c.is_deleted = false;

  return result;
end;
$$;


-- =========================================
-- 11. SOFT DELETE CLIENT
-- =========================================

create or replace function soft_delete_client(
  p_client_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  update clients
  set
    is_deleted = true,
    status = 'inactive'
  where id = p_client_id;
end;
$$;


-- =========================================
-- 12. SEARCH CLIENTS
-- =========================================

create or replace function search_clients(
  p_query text
)
returns setof clients
language sql
security definer
as $$
  with params as (
    select
      nullif(lower(btrim(p_query)), '') as normalized_query
  )
  select c.*
  from clients c
  cross join params p
  where c.is_deleted = false
    and public.erp_can_access_client_resource(
      'crm.clients.list',
      'view',
      c.id
    )
    and (
      p.normalized_query is null
      or c.search_text ilike '%' || p.normalized_query || '%'
      or lower(c.company_name) like p.normalized_query || '%'
      or lower(coalesce(c.website, '')) like p.normalized_query || '%'
      or lower(coalesce(c.tax_id, '')) = p.normalized_query
      or lower(coalesce(c.city_unlocode, '')) = p.normalized_query
    )
  order by
    case
      when p.normalized_query is null then 0
      when lower(c.company_name) = p.normalized_query then 1000
      when lower(coalesce(c.tax_id, '')) = p.normalized_query then 950
      when lower(coalesce(c.city_unlocode, '')) = p.normalized_query then 925
      when lower(c.company_name) like p.normalized_query || '%' then 900
      when lower(coalesce(c.website, '')) like p.normalized_query || '%' then 800
      when lower(coalesce(c.city, '')) like p.normalized_query || '%' then 750
      when lower(coalesce(c.country, '')) like p.normalized_query || '%' then 700
      else greatest(
        similarity(c.search_text, p.normalized_query),
        similarity(lower(c.company_name), p.normalized_query)
      ) * 100
    end desc,
    c.company_name asc;
$$;


-- =========================================
-- 13. SEARCH UN/LOCODES
-- =========================================

create or replace function search_unlocodes(
  p_query text default null,
  p_country_code text default null,
  p_function_classifier text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  source_id uuid,
  country_code text,
  location_code text,
  unlocode text,
  country_name text,
  name text,
  name_without_diacritics text,
  subdivision_code text,
  function_classifier text,
  status text,
  change_indicator text,
  date_code text,
  iata_code text,
  coordinates text,
  remarks text,
  source_page_url text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
as $$
  with params as (
    select
      nullif(lower(btrim(p_query)), '') as normalized_query,
      nullif(upper(btrim(p_query)), '') as normalized_code,
      nullif(upper(btrim(p_country_code)), '') as normalized_country_code,
      nullif(btrim(p_function_classifier), '') as normalized_function_classifier
  )
  select
    u.id,
    u.source_id,
    u.country_code,
    u.location_code,
    u.unlocode,
    u.country_name,
    u.name,
    u.name_without_diacritics,
    u.subdivision_code,
    u.function_classifier,
    u.status,
    u.change_indicator,
    u.date_code,
    u.iata_code,
    u.coordinates,
    u.remarks,
    u.source_page_url,
    u.created_at,
    u.updated_at
  from unlocodes u
  cross join params p
  where (
    p.normalized_query is null
    or u.search_text ilike '%' || p.normalized_query || '%'
    or u.unlocode = p.normalized_code
  )
    and (
      p.normalized_country_code is null
      or u.country_code = p.normalized_country_code
    )
    and (
      p.normalized_function_classifier is null
      or coalesce(u.function_classifier, '') like '%' || p.normalized_function_classifier || '%'
    )
  order by
    case
      when p.normalized_query is null then 0
      when u.unlocode = p.normalized_code then 1000
      when u.unlocode like p.normalized_code || '%' then 900
      when lower(u.name) like p.normalized_query || '%' then 800
      when lower(coalesce(u.name_without_diacritics, '')) like p.normalized_query || '%' then 775
      when lower(coalesce(u.country_name, '')) like p.normalized_query || '%' then 650
      when lower(coalesce(u.iata_code, '')) = p.normalized_query then 625
      else greatest(
        similarity(u.search_text, p.normalized_query),
        similarity(lower(coalesce(u.name_without_diacritics, '')), p.normalized_query),
        similarity(lower(coalesce(u.name, '')), p.normalized_query)
      ) * 100
    end desc,
    u.country_code asc,
    u.name asc,
    u.location_code asc
  limit least(greatest(coalesce(p_limit, 50), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
$$;


-- =========================================
-- 14. CREATE SERVICE TRANSPORT TYPE
-- =========================================

create or replace function create_service_transport_type(
  p_service_type text,
  p_transport_type text
)
returns uuid
language plpgsql
security definer
as $$
begin
  raise exception 'service_transport_types catalog is locked; manage canonical values through migrations only';
end;
$$;


-- =========================================
-- 15. UPDATE SERVICE TRANSPORT TYPE
-- =========================================

create or replace function update_service_transport_type(
  p_id uuid,
  p_service_type text,
  p_transport_type text
)
returns void
language plpgsql
security definer
as $$
begin
  raise exception 'service_transport_types catalog is locked; manage canonical values through migrations only';
end;
$$;


-- =========================================
-- 16. DELETE SERVICE TRANSPORT TYPE
-- =========================================

create or replace function delete_service_transport_type(
  p_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  raise exception 'service_transport_types catalog is locked; manage canonical values through migrations only';
end;
$$;


-- =========================================
-- 17. CREATE SALES ACCOUNTING CONCEPT
-- =========================================

create or replace function create_sales_accounting_concept(
  p_concept text,
  p_service_type text,
  p_operation_type text,
  p_vat_rate numeric,
  p_sat_code text
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_record_id uuid;
begin
  insert into sales_accounting_concepts (
    concept,
    service_type,
    operation_type,
    vat_rate,
    sat_code
  )
  values (
    nullif(btrim(p_concept), ''),
    upper(nullif(btrim(p_service_type), '')),
    upper(nullif(btrim(p_operation_type), '')),
    coalesce(p_vat_rate, 0),
    upper(nullif(btrim(p_sat_code), ''))
  )
  returning id into new_record_id;

  return new_record_id;
end;
$$;


-- =========================================
-- 18. UPDATE SALES ACCOUNTING CONCEPT
-- =========================================

create or replace function update_sales_accounting_concept(
  p_id uuid,
  p_concept text,
  p_service_type text,
  p_operation_type text,
  p_vat_rate numeric,
  p_sat_code text
)
returns void
language plpgsql
security definer
as $$
begin
  update sales_accounting_concepts
  set
    concept = nullif(btrim(p_concept), ''),
    service_type = upper(nullif(btrim(p_service_type), '')),
    operation_type = upper(nullif(btrim(p_operation_type), '')),
    vat_rate = coalesce(p_vat_rate, 0),
    sat_code = upper(nullif(btrim(p_sat_code), ''))
  where id = p_id;
end;
$$;


-- =========================================
-- 19. DELETE SALES ACCOUNTING CONCEPT
-- =========================================

create or replace function delete_sales_accounting_concept(
  p_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  delete from sales_accounting_concepts
  where id = p_id;
end;
$$;


-- =========================================
-- 19.5 CREATE EXCHANGE RATE
-- =========================================

create or replace function create_exchange_rate(
  p_rate_date date,
  p_base_currency text,
  p_rate_value numeric,
  p_quote_currency text default 'MXN',
  p_source text default 'BANXICO',
  p_source_series_code text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_record_id uuid;
begin
  insert into exchange_rates (
    rate_date,
    base_currency,
    quote_currency,
    rate_value,
    source,
    source_series_code
  )
  values (
    p_rate_date,
    public.normalize_currency_code(p_base_currency),
    public.normalize_currency_code(coalesce(p_quote_currency, 'MXN')),
    p_rate_value,
    upper(nullif(btrim(coalesce(p_source, 'BANXICO')), '')),
    nullif(upper(btrim(coalesce(p_source_series_code, ''))), '')
  )
  returning id into new_record_id;

  return new_record_id;
end;
$$;


-- =========================================
-- 19.6 UPDATE EXCHANGE RATE
-- =========================================

create or replace function update_exchange_rate(
  p_id uuid,
  p_rate_date date,
  p_base_currency text,
  p_quote_currency text,
  p_rate_value numeric,
  p_source text,
  p_source_series_code text default null
)
returns void
language plpgsql
security definer
as $$
begin
  update exchange_rates
  set
    rate_date = p_rate_date,
    base_currency = public.normalize_currency_code(p_base_currency),
    quote_currency = public.normalize_currency_code(coalesce(p_quote_currency, 'MXN')),
    rate_value = p_rate_value,
    source = upper(nullif(btrim(coalesce(p_source, 'BANXICO')), '')),
    source_series_code = nullif(upper(btrim(coalesce(p_source_series_code, ''))), '')
  where id = p_id;
end;
$$;


-- =========================================
-- 19.7 DELETE EXCHANGE RATE
-- =========================================

create or replace function delete_exchange_rate(
  p_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  delete from exchange_rates
  where id = p_id;
end;
$$;


-- =========================================
-- 20. CREATE PROVIDER
-- =========================================

create or replace function create_provider(
  p_name text,
  p_tax_id text default null,
  p_provider_type text default null,
  p_corporate_phone text default null,
  p_company_email text default null,
  p_website text default null,
  p_full_address text default null,
  p_postal_code text default null,
  p_city_unlocode text default null,
  p_status text default 'en_proceso_de_alta',
  p_credit_active boolean default false,
  p_credit_amount numeric default null,
  p_credit_days integer default null,
  p_service_offerings jsonb default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_provider_id uuid;
begin
  insert into providers (
    name,
    tax_id,
    provider_type,
    corporate_phone,
    company_email,
    website,
    full_address,
    postal_code,
    city_unlocode,
    status,
    credit_active,
    credit_amount,
    credit_days
  )
  values (
    p_name,
    nullif(btrim(p_tax_id), ''),
    nullif(btrim(p_provider_type), ''),
    nullif(btrim(p_corporate_phone), ''),
    nullif(btrim(p_company_email), ''),
    nullif(btrim(p_website), ''),
    nullif(btrim(p_full_address), ''),
    nullif(btrim(p_postal_code), ''),
    nullif(upper(btrim(p_city_unlocode)), ''),
    coalesce(nullif(btrim(p_status), ''), 'en_proceso_de_alta'),
    coalesce(p_credit_active, false),
    p_credit_amount,
    p_credit_days
  )
  returning id into new_provider_id;

  if p_service_offerings is not null then
    insert into provider_service_offerings (
      provider_id,
      service_transport_type_id,
      terms_and_conditions
    )
    select
      new_provider_id,
      (offering->>'service_transport_type_id')::uuid,
      nullif(btrim(offering->>'terms_and_conditions'), '')
    from jsonb_array_elements(p_service_offerings) as offering
    where nullif(offering->>'service_transport_type_id', '') is not null;
  end if;

  return new_provider_id;
end;
$$;


-- =========================================
-- 18. ADD CONTACT TO PROVIDER
-- =========================================

create or replace function add_contact_to_provider(
  p_provider_id uuid,
  p_name text,
  p_email text default null,
  p_phone text default null,
  p_linkedin_url text default null,
  p_position text default null,
  p_status text default 'activo'
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_contact_id uuid;
begin
  insert into provider_contacts (
    provider_id,
    name,
    email,
    phone,
    linkedin_url,
    position,
    status
  )
  values (
    p_provider_id,
    p_name,
    nullif(btrim(p_email), ''),
    nullif(btrim(p_phone), ''),
    nullif(btrim(p_linkedin_url), ''),
    nullif(btrim(p_position), ''),
    coalesce(nullif(btrim(p_status), ''), 'activo')
  )
  returning id into new_contact_id;

  return new_contact_id;
end;
$$;


-- =========================================
-- 19. GET PROVIDER FULL
-- =========================================

create or replace function get_provider_full(
  p_provider_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  provider_record jsonb;
  contacts_data jsonb;
  service_offerings_data jsonb;
begin
  select to_jsonb(p)
  into provider_record
  from providers p
  where p.id = p_provider_id;

  if provider_record is null then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', pc.id,
        'provider_id', pc.provider_id,
        'name', pc.name,
        'email', pc.email,
        'phone', pc.phone,
        'linkedin_url', pc.linkedin_url,
        'position', pc.position,
        'status', pc.status,
        'created_at', pc.created_at,
        'updated_at', pc.updated_at,
        'provider_name', p.name
      )
      order by pc.name asc
    ),
    '[]'::jsonb
  )
  into contacts_data
  from provider_contacts pc
  join providers p on p.id = pc.provider_id
  where pc.provider_id = p_provider_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', pso.id,
        'provider_id', pso.provider_id,
        'provider_name', p.name,
        'service_transport_type_id', pso.service_transport_type_id,
        'service_type', stt.service_type,
        'transport_type', stt.transport_type,
        'terms_and_conditions', pso.terms_and_conditions,
        'created_at', pso.created_at,
        'updated_at', pso.updated_at
      )
      order by stt.service_type asc, stt.transport_type asc
    ),
    '[]'::jsonb
  )
  into service_offerings_data
  from provider_service_offerings pso
  join providers p on p.id = pso.provider_id
  join service_transport_types stt on stt.id = pso.service_transport_type_id
  where pso.provider_id = p_provider_id;

  return jsonb_build_object(
    'provider', provider_record,
    'contacts', contacts_data,
    'service_offerings', service_offerings_data
  );
end;
$$;


-- =========================================
-- 20. SEARCH PROVIDERS
-- =========================================

create or replace function search_providers(
  p_query text
)
returns setof providers
language plpgsql
security definer
as $$
begin
  return query
  select *
  from providers
  where
    name ilike '%' || p_query || '%'
    or coalesce(provider_type, '') ilike '%' || p_query || '%'
    or coalesce(company_email, '') ilike '%' || p_query || '%'
    or coalesce(city, '') ilike '%' || p_query || '%'
    or coalesce(country, '') ilike '%' || p_query || '%'
  order by name asc;
end;
$$;
