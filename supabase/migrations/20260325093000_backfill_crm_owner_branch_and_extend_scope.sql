create or replace function public.erp_can_access_opportunity_resource(
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

create or replace function public.resolve_default_branch_for_backfill()
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

create or replace function public.resolve_default_crm_owner_for_backfill()
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

create or replace function public.backfill_crm_owner_branch_defaults(
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

create or replace function public.create_client_with_contacts(
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
  insert into public.clients (
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
    insert into public.contacts (
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

create or replace function public.get_client_full(
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
        from public.contacts ct
        where ct.client_id = c.id
      ),
      '[]'::jsonb
    ),
    'logistics_parties', coalesce(
      (
        select jsonb_agg(to_jsonb(clp) order by clp.created_at desc)
        from public.client_logistics_parties clp
        where clp.client_id = c.id
      ),
      '[]'::jsonb
    ),
    'opportunities', coalesce(
      (
        select jsonb_agg(to_jsonb(o) order by o.created_at desc)
        from public.opportunities o
        where o.client_id = c.id
      ),
      '[]'::jsonb
    ),
    'quotations', coalesce(
      (
        select jsonb_agg(to_jsonb(q) order by q.created_at desc)
        from public.quotations q
        where q.client_id = c.id
      ),
      '[]'::jsonb
    ),
    'shipments', coalesce(
      (
        select jsonb_agg(to_jsonb(s) order by s.created_at desc)
        from public.shipments s
        where s.client_id = c.id
      ),
      '[]'::jsonb
    )
  )
  into result
  from public.clients c
  where c.id = p_client_id
    and c.is_deleted = false;

  return result;
end;
$$;

create or replace function public.search_clients(
  p_query text
)
returns setof public.clients
language sql
security definer
as $$
  with params as (
    select
      nullif(lower(btrim(p_query)), '') as normalized_query
  )
  select c.*
  from public.clients c
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

create or replace function public.apply_client_owner_branch_defaults()
returns trigger
language plpgsql
as $$
declare
  resolved_branch_id uuid;
begin
  if new.account_owner_id is null then
    new.account_owner_id := public.erp_current_user_id();
  end if;

  if new.account_owner_id is not null and new.branch_id is null then
    select u.branch_id
    into resolved_branch_id
    from public.users u
    where u.id = new.account_owner_id;

    new.branch_id := resolved_branch_id;
  end if;

  return new;
end;
$$;

drop trigger if exists set_client_owner_branch_defaults on public.clients;

create trigger set_client_owner_branch_defaults
before insert or update on public.clients
for each row
execute function public.apply_client_owner_branch_defaults();

create or replace function public.apply_opportunity_owner_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.salesperson_id is null and new.client_id is not null then
    select c.account_owner_id
    into new.salesperson_id
    from public.clients c
    where c.id = new.client_id
      and c.is_deleted = false;
  end if;

  return new;
end;
$$;

drop trigger if exists set_opportunity_owner_defaults on public.opportunities;

create trigger set_opportunity_owner_defaults
before insert or update on public.opportunities
for each row
execute function public.apply_opportunity_owner_defaults();

create or replace view public.client_overview_view as
with opportunity_stats as (
  select
    o.client_id,
    count(*) as total_opportunities,
    coalesce(
      sum(
        case
          when (
            case
              when o.expiration_date is not null
                and o.expiration_date < current_date
                and o.status not in ('aceptado', 'rechazada', 'vencida')
                then 'vencida'
              else o.status
            end
          ) not in ('aceptado', 'rechazada', 'vencida')
            then o.estimated_value
          else 0
        end
      ),
      0
    ) as pipeline_value
  from public.opportunities o
  group by o.client_id
),
quotation_stats as (
  select
    q.client_id,
    count(*) as total_quotations
  from public.quotations q
  group by q.client_id
),
shipment_stats as (
  select
    s.client_id,
    count(*) as total_shipments
  from public.shipments s
  group by s.client_id
)
select
  c.id,
  c.company_name as client_name,
  c.website,
  c.corporate_phone,
  c.country,
  c.city,
  c.status,
  c.account_owner_id,
  concat_ws(' ', u.first_name, u.last_name) as account_owner_name,
  c.created_at,
  coalesce(os.total_opportunities, 0) as total_opportunities,
  coalesce(qs.total_quotations, 0) as total_quotations,
  coalesce(ss.total_shipments, 0) as total_shipments,
  coalesce(os.pipeline_value, 0) as pipeline_value
from public.clients c
left join public.users u on u.id = c.account_owner_id
left join opportunity_stats os on os.client_id = c.id
left join quotation_stats qs on qs.client_id = c.id
left join shipment_stats ss on ss.client_id = c.id
where c.is_deleted = false
  and public.erp_can_access_client_resource(
    'crm.clients.list',
    'view',
    c.id
  );

create or replace view public.open_opportunities_view as
select
  o.id,
  o.title,
  o.stage,
  case
    when o.expiration_date is not null
      and o.expiration_date < current_date
      and o.status not in ('aceptado', 'rechazada', 'vencida')
      then 'vencida'
    else o.status
  end as status,
  o.service_type,
  o.transport_type,
  o.operation_type,
  o.incoterm_id,
  i.code as incoterm_code,
  o.salesperson_id,
  concat_ws(' ', u.first_name, u.last_name) as salesperson_name,
  o.origin,
  o.origin_unlocode,
  o.destination,
  o.destination_unlocode,
  o.expected_profit_usd,
  o.service_quantity,
  o.estimated_value,
  o.start_date,
  o.expiration_date,
  o.created_at,
  c.id as client_id,
  c.company_name as client_name,
  o.origin_unlocode_id,
  o.destination_unlocode_id
from public.opportunities o
join public.clients c on c.id = o.client_id
left join public.users u on u.id = o.salesperson_id
left join public.incoterms i on i.id = o.incoterm_id
where c.is_deleted = false
  and public.erp_can_access_opportunity_resource(
    'crm.opportunities.list',
    'view',
    o.salesperson_id,
    o.client_id
  );

create or replace view public.client_contacts_view as
select
  ct.id,
  ct.client_id,
  ct.name,
  ct.email,
  ct.phone,
  ct.linkedin_url,
  ct.position,
  ct.status,
  ct.is_primary,
  ct.created_at,
  ct.updated_at,
  c.company_name as client_name
from public.contacts ct
join public.clients c on c.id = ct.client_id
where c.is_deleted = false
  and public.erp_can_access_client_resource(
    'crm.contacts.list',
    'view',
    ct.client_id
  );

drop policy if exists "active_select_clients" on public.clients;
drop policy if exists "active_insert_clients" on public.clients;
drop policy if exists "active_update_clients" on public.clients;
drop policy if exists "active_delete_clients" on public.clients;
drop policy if exists "active_select_contacts" on public.contacts;
drop policy if exists "active_insert_contacts" on public.contacts;
drop policy if exists "active_update_contacts" on public.contacts;
drop policy if exists "active_delete_contacts" on public.contacts;
drop policy if exists "active_select_client_logistics_parties" on public.client_logistics_parties;
drop policy if exists "active_insert_client_logistics_parties" on public.client_logistics_parties;
drop policy if exists "active_update_client_logistics_parties" on public.client_logistics_parties;
drop policy if exists "active_delete_client_logistics_parties" on public.client_logistics_parties;
drop policy if exists "active_select_opportunities" on public.opportunities;
drop policy if exists "active_insert_opportunities" on public.opportunities;
drop policy if exists "active_update_opportunities" on public.opportunities;
drop policy if exists "active_delete_opportunities" on public.opportunities;

create policy "active_select_clients"
on public.clients
for select
using (
  public.erp_can_access_client_resource(
    'crm.clients.list',
    'view',
    id
  )
);

create policy "active_insert_clients"
on public.clients
for insert
with check (public.erp_has_submodule_access('crm.clients', 'create'));

create policy "active_update_clients"
on public.clients
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
on public.clients
for delete
using (
  public.erp_can_access_client_resource(
    'crm.clients.record',
    'delete',
    id
  )
);

create policy "active_select_contacts"
on public.contacts
for select
using (
  public.erp_can_access_client_resource(
    'crm.contacts.list',
    'view',
    client_id
  )
);

create policy "active_insert_contacts"
on public.contacts
for insert
with check (
  public.erp_can_access_client_resource(
    'crm.clients.record',
    'edit',
    client_id
  )
);

create policy "active_update_contacts"
on public.contacts
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
on public.contacts
for delete
using (
  public.erp_can_access_client_resource(
    'crm.contacts.record',
    'delete',
    client_id
  )
);

create policy "active_select_client_logistics_parties"
on public.client_logistics_parties
for select
using (
  public.erp_can_access_client_resource(
    'crm.clients.record',
    'view',
    client_id
  )
);

create policy "active_insert_client_logistics_parties"
on public.client_logistics_parties
for insert
with check (
  public.erp_can_access_client_resource(
    'crm.clients.record',
    'edit',
    client_id
  )
);

create policy "active_update_client_logistics_parties"
on public.client_logistics_parties
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
on public.client_logistics_parties
for delete
using (
  public.erp_can_access_client_resource(
    'crm.clients.record',
    'delete',
    client_id
  )
);

create policy "active_select_opportunities"
on public.opportunities
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
on public.opportunities
for insert
with check (
  public.erp_can_access_client_resource(
    'crm.clients.record',
    'edit',
    client_id
  )
);

create policy "active_update_opportunities"
on public.opportunities
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
on public.opportunities
for delete
using (
  public.erp_can_access_opportunity_resource(
    'crm.opportunities.record',
    'delete',
    salesperson_id,
    client_id
  )
);

grant execute on function public.erp_can_access_opportunity_resource(text, text, uuid, uuid) to authenticated;

with desired_permissions as (
  select *
  from (
    values
      ('Ventas', 'crm.clients.list', 'view', 'owner_only', true),
      ('Ventas', 'crm.clients.record', 'view', 'owner_only', true),
      ('Ventas', 'crm.clients.record', 'edit', 'owner_only', true),
      ('Ventas', 'crm.clients.record', 'delete', 'owner_only', true),
      ('Ventas', 'crm.contacts.list', 'view', 'owner_only', true),
      ('Ventas', 'crm.contacts.record', 'view', 'owner_only', true),
      ('Ventas', 'crm.contacts.record', 'edit', 'owner_only', true),
      ('Ventas', 'crm.contacts.record', 'delete', 'owner_only', true),
      ('Ventas', 'crm.opportunities.list', 'view', 'owner_only', true),
      ('Ventas', 'crm.opportunities.record', 'view', 'owner_only', true),
      ('Ventas', 'crm.opportunities.record', 'edit', 'owner_only', true),
      ('Ventas', 'crm.opportunities.record', 'delete', 'owner_only', true)
  ) as t(role_name, resource_key, action_code, condition_code, allowed)
)
insert into public.role_resource_permissions (
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
join public.roles r
  on lower(r.name) = lower(dp.role_name)
join public.permission_resources pr
  on pr.resource_key = dp.resource_key
join public.permission_actions pa
  on lower(pa.code) = lower(dp.action_code)
join public.permission_conditions pc
  on lower(pc.code) = lower(dp.condition_code)
on conflict (role_id, resource_id, action_id)
do update set
  condition_id = excluded.condition_id,
  allowed = excluded.allowed,
  updated_at = now();

select public.backfill_crm_owner_branch_defaults();
