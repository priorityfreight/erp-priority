create unique index if not exists idx_roles_name_unique on roles(name);

alter table users
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists phone text,
  add column if not exists username text;

create unique index if not exists idx_users_auth_user_id_unique on users(auth_user_id);
create unique index if not exists idx_users_username_unique on users(lower(username));
create index if not exists idx_users_active on users(active);

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

create or replace function erp_is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(lower(public.erp_current_role_name()) = 'admin', false);
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

create or replace function sync_public_user_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.email is null then
    return new;
  end if;

  update public.users
  set
    auth_user_id = new.id,
    email = lower(new.email),
    updated_at = now()
  where lower(email) = lower(new.email)
    and (auth_user_id is null or auth_user_id = new.id);

  if not found then
    insert into public.users (
      auth_user_id,
      email,
      active
    )
    values (
      new.id,
      lower(new.email),
      false
    )
    on conflict (auth_user_id)
    do update set
      email = excluded.email,
      updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists sync_public_user_from_auth_trigger on auth.users;

create trigger sync_public_user_from_auth_trigger
after insert or update of email on auth.users
for each row
execute function sync_public_user_from_auth();

drop policy if exists "dev_select_clients" on clients;
drop policy if exists "dev_insert_clients" on clients;
drop policy if exists "dev_update_clients" on clients;
drop policy if exists "dev_delete_clients" on clients;
drop policy if exists "dev_select_contacts" on contacts;
drop policy if exists "dev_insert_contacts" on contacts;
drop policy if exists "dev_update_contacts" on contacts;
drop policy if exists "dev_delete_contacts" on contacts;
drop policy if exists "dev_select_client_logistics_parties" on client_logistics_parties;
drop policy if exists "dev_insert_client_logistics_parties" on client_logistics_parties;
drop policy if exists "dev_update_client_logistics_parties" on client_logistics_parties;
drop policy if exists "dev_delete_client_logistics_parties" on client_logistics_parties;
drop policy if exists "dev_select_providers" on providers;
drop policy if exists "dev_insert_providers" on providers;
drop policy if exists "dev_update_providers" on providers;
drop policy if exists "dev_delete_providers" on providers;
drop policy if exists "dev_select_provider_contacts" on provider_contacts;
drop policy if exists "dev_insert_provider_contacts" on provider_contacts;
drop policy if exists "dev_update_provider_contacts" on provider_contacts;
drop policy if exists "dev_delete_provider_contacts" on provider_contacts;
drop policy if exists "dev_select_provider_service_offerings" on provider_service_offerings;
drop policy if exists "dev_insert_provider_service_offerings" on provider_service_offerings;
drop policy if exists "dev_update_provider_service_offerings" on provider_service_offerings;
drop policy if exists "dev_delete_provider_service_offerings" on provider_service_offerings;
drop policy if exists "dev_select_opportunities" on opportunities;
drop policy if exists "dev_insert_opportunities" on opportunities;
drop policy if exists "dev_update_opportunities" on opportunities;
drop policy if exists "dev_delete_opportunities" on opportunities;
drop policy if exists "dev_select_external_data_sources" on external_data_sources;
drop policy if exists "dev_insert_external_data_sources" on external_data_sources;
drop policy if exists "dev_update_external_data_sources" on external_data_sources;
drop policy if exists "dev_delete_external_data_sources" on external_data_sources;
drop policy if exists "dev_select_unlocodes" on unlocodes;
drop policy if exists "dev_insert_unlocodes" on unlocodes;
drop policy if exists "dev_update_unlocodes" on unlocodes;
drop policy if exists "dev_delete_unlocodes" on unlocodes;
drop policy if exists "dev_select_service_transport_types" on service_transport_types;
drop policy if exists "dev_insert_service_transport_types" on service_transport_types;
drop policy if exists "dev_update_service_transport_types" on service_transport_types;
drop policy if exists "dev_delete_service_transport_types" on service_transport_types;
drop policy if exists "dev_select_quotations" on quotations;
drop policy if exists "dev_insert_quotations" on quotations;
drop policy if exists "dev_update_quotations" on quotations;
drop policy if exists "dev_delete_quotations" on quotations;
drop policy if exists "dev_select_shipments" on shipments;
drop policy if exists "dev_insert_shipments" on shipments;
drop policy if exists "dev_update_shipments" on shipments;
drop policy if exists "dev_delete_shipments" on shipments;
drop policy if exists "dev_select_audit_logs" on audit_logs;
drop policy if exists "dev_insert_audit_logs" on audit_logs;
drop policy if exists "dev_update_audit_logs" on audit_logs;
drop policy if exists "dev_delete_audit_logs" on audit_logs;
drop policy if exists "dev_select_automation_logs" on automation_logs;
drop policy if exists "dev_insert_automation_logs" on automation_logs;
drop policy if exists "dev_update_automation_logs" on automation_logs;
drop policy if exists "dev_delete_automation_logs" on automation_logs;

drop policy if exists "active_select_branches" on branches;
drop policy if exists "admin_insert_branches" on branches;
drop policy if exists "admin_update_branches" on branches;
drop policy if exists "admin_delete_branches" on branches;
drop policy if exists "active_select_roles" on roles;
drop policy if exists "admin_insert_roles" on roles;
drop policy if exists "admin_update_roles" on roles;
drop policy if exists "admin_delete_roles" on roles;
drop policy if exists "active_select_users" on users;
drop policy if exists "admin_insert_users" on users;
drop policy if exists "admin_update_users" on users;
drop policy if exists "admin_delete_users" on users;
drop policy if exists "active_select_external_data_sources" on external_data_sources;
drop policy if exists "admin_insert_external_data_sources" on external_data_sources;
drop policy if exists "admin_update_external_data_sources" on external_data_sources;
drop policy if exists "admin_delete_external_data_sources" on external_data_sources;
drop policy if exists "active_select_unlocodes" on unlocodes;
drop policy if exists "admin_insert_unlocodes" on unlocodes;
drop policy if exists "admin_update_unlocodes" on unlocodes;
drop policy if exists "admin_delete_unlocodes" on unlocodes;
drop policy if exists "active_select_service_transport_types" on service_transport_types;
drop policy if exists "admin_insert_service_transport_types" on service_transport_types;
drop policy if exists "admin_update_service_transport_types" on service_transport_types;
drop policy if exists "admin_delete_service_transport_types" on service_transport_types;
drop policy if exists "active_select_incoterms" on incoterms;
drop policy if exists "admin_insert_incoterms" on incoterms;
drop policy if exists "admin_update_incoterms" on incoterms;
drop policy if exists "admin_delete_incoterms" on incoterms;
drop policy if exists "active_select_prospects" on prospects;
drop policy if exists "active_insert_prospects" on prospects;
drop policy if exists "active_update_prospects" on prospects;
drop policy if exists "active_delete_prospects" on prospects;
drop policy if exists "active_select_clients" on clients;
drop policy if exists "active_insert_clients" on clients;
drop policy if exists "active_update_clients" on clients;
drop policy if exists "active_delete_clients" on clients;
drop policy if exists "active_select_contacts" on contacts;
drop policy if exists "active_insert_contacts" on contacts;
drop policy if exists "active_update_contacts" on contacts;
drop policy if exists "active_delete_contacts" on contacts;
drop policy if exists "active_select_client_logistics_parties" on client_logistics_parties;
drop policy if exists "active_insert_client_logistics_parties" on client_logistics_parties;
drop policy if exists "active_update_client_logistics_parties" on client_logistics_parties;
drop policy if exists "active_delete_client_logistics_parties" on client_logistics_parties;
drop policy if exists "active_select_providers" on providers;
drop policy if exists "active_insert_providers" on providers;
drop policy if exists "active_update_providers" on providers;
drop policy if exists "active_delete_providers" on providers;
drop policy if exists "active_select_provider_contacts" on provider_contacts;
drop policy if exists "active_insert_provider_contacts" on provider_contacts;
drop policy if exists "active_update_provider_contacts" on provider_contacts;
drop policy if exists "active_delete_provider_contacts" on provider_contacts;
drop policy if exists "active_select_provider_service_offerings" on provider_service_offerings;
drop policy if exists "active_insert_provider_service_offerings" on provider_service_offerings;
drop policy if exists "active_update_provider_service_offerings" on provider_service_offerings;
drop policy if exists "active_delete_provider_service_offerings" on provider_service_offerings;
drop policy if exists "active_select_opportunities" on opportunities;
drop policy if exists "active_insert_opportunities" on opportunities;
drop policy if exists "active_update_opportunities" on opportunities;
drop policy if exists "active_delete_opportunities" on opportunities;
drop policy if exists "active_select_quotations" on quotations;
drop policy if exists "active_insert_quotations" on quotations;
drop policy if exists "active_update_quotations" on quotations;
drop policy if exists "active_delete_quotations" on quotations;
drop policy if exists "active_select_quotation_costs" on quotation_costs;
drop policy if exists "active_insert_quotation_costs" on quotation_costs;
drop policy if exists "active_update_quotation_costs" on quotation_costs;
drop policy if exists "active_delete_quotation_costs" on quotation_costs;
drop policy if exists "active_select_shipments" on shipments;
drop policy if exists "active_insert_shipments" on shipments;
drop policy if exists "active_update_shipments" on shipments;
drop policy if exists "active_delete_shipments" on shipments;
drop policy if exists "active_select_shipment_events" on shipment_events;
drop policy if exists "active_insert_shipment_events" on shipment_events;
drop policy if exists "active_update_shipment_events" on shipment_events;
drop policy if exists "active_delete_shipment_events" on shipment_events;
drop policy if exists "active_select_client_invoices" on client_invoices;
drop policy if exists "active_insert_client_invoices" on client_invoices;
drop policy if exists "active_update_client_invoices" on client_invoices;
drop policy if exists "active_delete_client_invoices" on client_invoices;
drop policy if exists "active_select_provider_invoices" on provider_invoices;
drop policy if exists "active_insert_provider_invoices" on provider_invoices;
drop policy if exists "active_update_provider_invoices" on provider_invoices;
drop policy if exists "active_delete_provider_invoices" on provider_invoices;
drop policy if exists "active_select_commissions" on commissions;
drop policy if exists "active_insert_commissions" on commissions;
drop policy if exists "active_update_commissions" on commissions;
drop policy if exists "active_delete_commissions" on commissions;
drop policy if exists "admin_select_audit_logs" on audit_logs;
drop policy if exists "active_insert_audit_logs" on audit_logs;
drop policy if exists "admin_select_automation_logs" on automation_logs;
drop policy if exists "active_insert_automation_logs" on automation_logs;

alter table branches enable row level security;
alter table roles enable row level security;
alter table users enable row level security;
alter table external_data_sources enable row level security;
alter table unlocodes enable row level security;
alter table service_transport_types enable row level security;
alter table incoterms enable row level security;
alter table prospects enable row level security;
alter table clients enable row level security;
alter table contacts enable row level security;
alter table client_logistics_parties enable row level security;
alter table providers enable row level security;
alter table provider_contacts enable row level security;
alter table provider_service_offerings enable row level security;
alter table opportunities enable row level security;
alter table quotations enable row level security;
alter table quotation_costs enable row level security;
alter table shipments enable row level security;
alter table shipment_events enable row level security;
alter table client_invoices enable row level security;
alter table provider_invoices enable row level security;
alter table commissions enable row level security;
alter table audit_logs enable row level security;
alter table automation_logs enable row level security;
alter table branches force row level security;
alter table roles force row level security;
alter table users force row level security;
alter table external_data_sources force row level security;
alter table unlocodes force row level security;
alter table service_transport_types force row level security;
alter table incoterms force row level security;
alter table prospects force row level security;
alter table clients force row level security;
alter table contacts force row level security;
alter table client_logistics_parties force row level security;
alter table providers force row level security;
alter table provider_contacts force row level security;
alter table provider_service_offerings force row level security;
alter table opportunities force row level security;
alter table quotations force row level security;
alter table quotation_costs force row level security;
alter table shipments force row level security;
alter table shipment_events force row level security;
alter table client_invoices force row level security;
alter table provider_invoices force row level security;
alter table commissions force row level security;
alter table audit_logs force row level security;
alter table automation_logs force row level security;

create policy "active_select_branches" on branches for select using (public.erp_is_authenticated_active_user());
create policy "admin_insert_branches" on branches for insert with check (public.erp_is_admin());
create policy "admin_update_branches" on branches for update using (public.erp_is_admin()) with check (public.erp_is_admin());
create policy "admin_delete_branches" on branches for delete using (public.erp_is_admin());

create policy "active_select_roles" on roles for select using (public.erp_is_authenticated_active_user());
create policy "admin_insert_roles" on roles for insert with check (public.erp_is_admin());
create policy "admin_update_roles" on roles for update using (public.erp_is_admin()) with check (public.erp_is_admin());
create policy "admin_delete_roles" on roles for delete using (public.erp_is_admin());

create policy "active_select_users" on users for select using (public.erp_is_authenticated_active_user());
create policy "admin_insert_users" on users for insert with check (public.erp_is_admin());
create policy "admin_update_users" on users for update using (public.erp_is_admin()) with check (public.erp_is_admin());
create policy "admin_delete_users" on users for delete using (public.erp_is_admin());

create policy "active_select_external_data_sources" on external_data_sources for select using (public.erp_is_authenticated_active_user());
create policy "admin_insert_external_data_sources" on external_data_sources for insert with check (public.erp_is_admin());
create policy "admin_update_external_data_sources" on external_data_sources for update using (public.erp_is_admin()) with check (public.erp_is_admin());
create policy "admin_delete_external_data_sources" on external_data_sources for delete using (public.erp_is_admin());

create policy "active_select_unlocodes" on unlocodes for select using (public.erp_is_authenticated_active_user());
create policy "admin_insert_unlocodes" on unlocodes for insert with check (public.erp_is_admin());
create policy "admin_update_unlocodes" on unlocodes for update using (public.erp_is_admin()) with check (public.erp_is_admin());
create policy "admin_delete_unlocodes" on unlocodes for delete using (public.erp_is_admin());

create policy "active_select_service_transport_types" on service_transport_types for select using (public.erp_is_authenticated_active_user());
create policy "admin_insert_service_transport_types" on service_transport_types for insert with check (public.erp_is_admin());
create policy "admin_update_service_transport_types" on service_transport_types for update using (public.erp_is_admin()) with check (public.erp_is_admin());
create policy "admin_delete_service_transport_types" on service_transport_types for delete using (public.erp_is_admin());

create policy "active_select_incoterms" on incoterms for select using (public.erp_is_authenticated_active_user());
create policy "admin_insert_incoterms" on incoterms for insert with check (public.erp_is_admin());
create policy "admin_update_incoterms" on incoterms for update using (public.erp_is_admin()) with check (public.erp_is_admin());
create policy "admin_delete_incoterms" on incoterms for delete using (public.erp_is_admin());

create policy "active_select_prospects" on prospects for select using (public.erp_is_authenticated_active_user());
create policy "active_insert_prospects" on prospects for insert with check (public.erp_is_authenticated_active_user());
create policy "active_update_prospects" on prospects for update using (public.erp_is_authenticated_active_user()) with check (public.erp_is_authenticated_active_user());
create policy "active_delete_prospects" on prospects for delete using (public.erp_is_authenticated_active_user());

create policy "active_select_clients" on clients for select using (public.erp_is_authenticated_active_user());
create policy "active_insert_clients" on clients for insert with check (public.erp_is_authenticated_active_user());
create policy "active_update_clients" on clients for update using (public.erp_is_authenticated_active_user()) with check (public.erp_is_authenticated_active_user());
create policy "active_delete_clients" on clients for delete using (public.erp_is_authenticated_active_user());

create policy "active_select_contacts" on contacts for select using (public.erp_is_authenticated_active_user());
create policy "active_insert_contacts" on contacts for insert with check (public.erp_is_authenticated_active_user());
create policy "active_update_contacts" on contacts for update using (public.erp_is_authenticated_active_user()) with check (public.erp_is_authenticated_active_user());
create policy "active_delete_contacts" on contacts for delete using (public.erp_is_authenticated_active_user());

create policy "active_select_client_logistics_parties" on client_logistics_parties for select using (public.erp_is_authenticated_active_user());
create policy "active_insert_client_logistics_parties" on client_logistics_parties for insert with check (public.erp_is_authenticated_active_user());
create policy "active_update_client_logistics_parties" on client_logistics_parties for update using (public.erp_is_authenticated_active_user()) with check (public.erp_is_authenticated_active_user());
create policy "active_delete_client_logistics_parties" on client_logistics_parties for delete using (public.erp_is_authenticated_active_user());

create policy "active_select_providers" on providers for select using (public.erp_is_authenticated_active_user());
create policy "active_insert_providers" on providers for insert with check (public.erp_is_authenticated_active_user());
create policy "active_update_providers" on providers for update using (public.erp_is_authenticated_active_user()) with check (public.erp_is_authenticated_active_user());
create policy "active_delete_providers" on providers for delete using (public.erp_is_authenticated_active_user());

create policy "active_select_provider_contacts" on provider_contacts for select using (public.erp_is_authenticated_active_user());
create policy "active_insert_provider_contacts" on provider_contacts for insert with check (public.erp_is_authenticated_active_user());
create policy "active_update_provider_contacts" on provider_contacts for update using (public.erp_is_authenticated_active_user()) with check (public.erp_is_authenticated_active_user());
create policy "active_delete_provider_contacts" on provider_contacts for delete using (public.erp_is_authenticated_active_user());

create policy "active_select_provider_service_offerings" on provider_service_offerings for select using (public.erp_is_authenticated_active_user());
create policy "active_insert_provider_service_offerings" on provider_service_offerings for insert with check (public.erp_is_authenticated_active_user());
create policy "active_update_provider_service_offerings" on provider_service_offerings for update using (public.erp_is_authenticated_active_user()) with check (public.erp_is_authenticated_active_user());
create policy "active_delete_provider_service_offerings" on provider_service_offerings for delete using (public.erp_is_authenticated_active_user());

create policy "active_select_opportunities" on opportunities for select using (public.erp_is_authenticated_active_user());
create policy "active_insert_opportunities" on opportunities for insert with check (public.erp_is_authenticated_active_user());
create policy "active_update_opportunities" on opportunities for update using (public.erp_is_authenticated_active_user()) with check (public.erp_is_authenticated_active_user());
create policy "active_delete_opportunities" on opportunities for delete using (public.erp_is_authenticated_active_user());

create policy "active_select_quotations" on quotations for select using (public.erp_is_authenticated_active_user());
create policy "active_insert_quotations" on quotations for insert with check (public.erp_is_authenticated_active_user());
create policy "active_update_quotations" on quotations for update using (public.erp_is_authenticated_active_user()) with check (public.erp_is_authenticated_active_user());
create policy "active_delete_quotations" on quotations for delete using (public.erp_is_authenticated_active_user());

create policy "active_select_quotation_costs" on quotation_costs for select using (public.erp_is_authenticated_active_user());
create policy "active_insert_quotation_costs" on quotation_costs for insert with check (public.erp_is_authenticated_active_user());
create policy "active_update_quotation_costs" on quotation_costs for update using (public.erp_is_authenticated_active_user()) with check (public.erp_is_authenticated_active_user());
create policy "active_delete_quotation_costs" on quotation_costs for delete using (public.erp_is_authenticated_active_user());

create policy "active_select_shipments" on shipments for select using (public.erp_is_authenticated_active_user());
create policy "active_insert_shipments" on shipments for insert with check (public.erp_is_authenticated_active_user());
create policy "active_update_shipments" on shipments for update using (public.erp_is_authenticated_active_user()) with check (public.erp_is_authenticated_active_user());
create policy "active_delete_shipments" on shipments for delete using (public.erp_is_authenticated_active_user());

create policy "active_select_shipment_events" on shipment_events for select using (public.erp_is_authenticated_active_user());
create policy "active_insert_shipment_events" on shipment_events for insert with check (public.erp_is_authenticated_active_user());
create policy "active_update_shipment_events" on shipment_events for update using (public.erp_is_authenticated_active_user()) with check (public.erp_is_authenticated_active_user());
create policy "active_delete_shipment_events" on shipment_events for delete using (public.erp_is_authenticated_active_user());

create policy "active_select_client_invoices" on client_invoices for select using (public.erp_is_authenticated_active_user());
create policy "active_insert_client_invoices" on client_invoices for insert with check (public.erp_is_authenticated_active_user());
create policy "active_update_client_invoices" on client_invoices for update using (public.erp_is_authenticated_active_user()) with check (public.erp_is_authenticated_active_user());
create policy "active_delete_client_invoices" on client_invoices for delete using (public.erp_is_authenticated_active_user());

create policy "active_select_provider_invoices" on provider_invoices for select using (public.erp_is_authenticated_active_user());
create policy "active_insert_provider_invoices" on provider_invoices for insert with check (public.erp_is_authenticated_active_user());
create policy "active_update_provider_invoices" on provider_invoices for update using (public.erp_is_authenticated_active_user()) with check (public.erp_is_authenticated_active_user());
create policy "active_delete_provider_invoices" on provider_invoices for delete using (public.erp_is_authenticated_active_user());

create policy "active_select_commissions" on commissions for select using (public.erp_is_authenticated_active_user());
create policy "active_insert_commissions" on commissions for insert with check (public.erp_is_authenticated_active_user());
create policy "active_update_commissions" on commissions for update using (public.erp_is_authenticated_active_user()) with check (public.erp_is_authenticated_active_user());
create policy "active_delete_commissions" on commissions for delete using (public.erp_is_authenticated_active_user());

create policy "admin_select_audit_logs" on audit_logs for select using (public.erp_is_admin());
create policy "active_insert_audit_logs" on audit_logs for insert with check (public.erp_is_authenticated_active_user());

create policy "admin_select_automation_logs" on automation_logs for select using (public.erp_is_admin());
create policy "active_insert_automation_logs" on automation_logs for insert with check (public.erp_is_authenticated_active_user());
