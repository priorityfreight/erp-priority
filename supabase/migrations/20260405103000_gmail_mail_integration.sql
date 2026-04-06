create or replace function erp_current_role_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select u.role_id
  from public.users u
  where u.auth_user_id = auth.uid()
    and u.active = true
  limit 1;
$$;

create or replace function erp_can_manage_mailboxes()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.erp_is_admin()
    or public.erp_has_resource_access('crm.email.mailboxes', 'edit');
$$;

create or replace function erp_can_access_mailbox(
  p_mailbox_id uuid,
  p_action_code text default 'view'
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  current_role_id uuid := public.erp_current_role_id();
begin
  if public.erp_is_admin() then
    return true;
  end if;

  if not public.erp_is_authenticated_active_user() then
    return false;
  end if;

  if not public.erp_has_submodule_access(
    'crm.email',
    coalesce(nullif(lower(btrim(p_action_code)), ''), 'view')
  ) then
    return false;
  end if;

  if current_role_id is null then
    return false;
  end if;

  return exists (
    select 1
    from public.mailbox_role_access mra
    where mra.mailbox_id = p_mailbox_id
      and mra.role_id = current_role_id
  );
end;
$$;

create table if not exists mailboxes (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  provider text not null default 'gmail',
  status text not null default 'draft',
  sync_mode text not null default 'manual',
  gmail_refresh_token_encrypted text,
  gmail_refresh_token_hint text,
  gmail_scope text,
  connected_email text,
  connected_by_user_id uuid references users(id),
  last_synced_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table mailboxes
  drop constraint if exists mailboxes_provider_check,
  drop constraint if exists mailboxes_status_check,
  drop constraint if exists mailboxes_sync_mode_check;

alter table mailboxes
  add constraint mailboxes_provider_check
    check (provider in ('gmail')),
  add constraint mailboxes_status_check
    check (status in ('draft', 'active', 'disabled', 'error')),
  add constraint mailboxes_sync_mode_check
    check (sync_mode in ('manual', 'polling'));

create index if not exists idx_mailboxes_status on mailboxes(status);
create index if not exists idx_mailboxes_provider on mailboxes(provider);

create table if not exists mailbox_role_access (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references mailboxes(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint mailbox_role_access_unique unique (mailbox_id, role_id)
);

create index if not exists idx_mailbox_role_access_mailbox_id on mailbox_role_access(mailbox_id);
create index if not exists idx_mailbox_role_access_role_id on mailbox_role_access(role_id);

create table if not exists mail_threads (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references mailboxes(id) on delete cascade,
  gmail_thread_id text not null,
  subject text,
  subject_normalized text not null default '',
  snippet text,
  participants_json jsonb not null default '[]'::jsonb,
  latest_message_at timestamptz,
  oldest_message_at timestamptz,
  unread_count integer not null default 0,
  message_count integer not null default 0,
  has_attachments boolean not null default false,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint mail_threads_mailbox_gmail_thread_unique unique (mailbox_id, gmail_thread_id)
);

create index if not exists idx_mail_threads_mailbox_latest
  on mail_threads(mailbox_id, latest_message_at desc nulls last);
create index if not exists idx_mail_threads_mailbox_subject_trgm
  on mail_threads using gin(subject_normalized gin_trgm_ops);

create table if not exists mail_messages (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references mailboxes(id) on delete cascade,
  thread_id uuid not null references mail_threads(id) on delete cascade,
  gmail_message_id text not null,
  gmail_thread_id text not null,
  internet_message_id text,
  direction text not null default 'inbound',
  from_name text,
  from_address text,
  to_json jsonb not null default '[]'::jsonb,
  cc_json jsonb not null default '[]'::jsonb,
  bcc_json jsonb not null default '[]'::jsonb,
  reply_to_json jsonb not null default '[]'::jsonb,
  subject text,
  snippet text,
  sent_at timestamptz,
  received_at timestamptz,
  label_ids text[] not null default '{}'::text[],
  has_attachments boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint mail_messages_mailbox_gmail_message_unique unique (mailbox_id, gmail_message_id)
);

alter table mail_messages
  drop constraint if exists mail_messages_direction_check;

alter table mail_messages
  add constraint mail_messages_direction_check
    check (direction in ('inbound', 'outbound'));

create index if not exists idx_mail_messages_thread_sent_at
  on mail_messages(thread_id, sent_at asc nulls last, created_at asc);
create index if not exists idx_mail_messages_mailbox_received_at
  on mail_messages(mailbox_id, received_at desc nulls last);
create index if not exists idx_mail_messages_from_address on mail_messages(from_address);

create table if not exists mail_entity_links (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references mailboxes(id) on delete cascade,
  thread_id uuid not null references mail_threads(id) on delete cascade,
  message_id uuid references mail_messages(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  link_source text not null,
  confidence numeric(5,2) not null default 1,
  is_primary boolean not null default false,
  created_by_user_id uuid references users(id),
  created_at timestamptz not null default now()
);

alter table mail_entity_links
  drop constraint if exists mail_entity_links_entity_type_check,
  drop constraint if exists mail_entity_links_source_check;

alter table mail_entity_links
  add constraint mail_entity_links_entity_type_check
    check (entity_type in ('client', 'contact', 'quotation', 'shipment')),
  add constraint mail_entity_links_source_check
    check (link_source in ('subject_reference', 'participant_email', 'manual'));

create index if not exists idx_mail_entity_links_thread_id on mail_entity_links(thread_id);
create index if not exists idx_mail_entity_links_entity on mail_entity_links(entity_type, entity_id);
create unique index if not exists idx_mail_entity_links_thread_level_unique
  on mail_entity_links(thread_id, entity_type, entity_id, link_source)
  where message_id is null;
create unique index if not exists idx_mail_entity_links_message_level_unique
  on mail_entity_links(message_id, entity_type, entity_id, link_source)
  where message_id is not null;

create table if not exists mail_sync_runs (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references mailboxes(id) on delete cascade,
  trigger_source text not null,
  status text not null,
  messages_scanned integer not null default 0,
  messages_upserted integer not null default 0,
  threads_upserted integer not null default 0,
  links_created integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table mail_sync_runs
  drop constraint if exists mail_sync_runs_trigger_source_check,
  drop constraint if exists mail_sync_runs_status_check;

alter table mail_sync_runs
  add constraint mail_sync_runs_trigger_source_check
    check (trigger_source in ('manual', 'cron')),
  add constraint mail_sync_runs_status_check
    check (status in ('running', 'success', 'error'));

create index if not exists idx_mail_sync_runs_mailbox_started_at
  on mail_sync_runs(mailbox_id, started_at desc);

drop trigger if exists set_mailboxes_updated_at on mailboxes;
create trigger set_mailboxes_updated_at
before update on mailboxes
for each row
execute function set_updated_at();

drop trigger if exists set_mail_threads_updated_at on mail_threads;
create trigger set_mail_threads_updated_at
before update on mail_threads
for each row
execute function set_updated_at();

drop trigger if exists set_mail_messages_updated_at on mail_messages;
create trigger set_mail_messages_updated_at
before update on mail_messages
for each row
execute function set_updated_at();

drop trigger if exists set_mail_sync_runs_updated_at on mail_sync_runs;
create trigger set_mail_sync_runs_updated_at
before update on mail_sync_runs
for each row
execute function set_updated_at();

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
  'crm.email',
  'Email',
  '/mail',
  array['/mail']::text[],
  50,
  true
from permission_modules pm
where pm.code = 'crm'
on conflict (code) do update
set
  module_id = excluded.module_id,
  name = excluded.name,
  route_path = excluded.route_path,
  route_matchers = excluded.route_matchers,
  sort_order = excluded.sort_order,
  active = excluded.active;

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
join permission_submodules ps
  on ps.code = 'crm.email'
 and ps.module_id = pm.id
join (
  values
    ('crm.email', 'Email', 'submodule', 'Navigation', 'mailboxes', null, null, null, null, 155, true),
    ('crm.email.list', 'Email Inbox', 'resource', 'Communication', 'mail_threads', null, null, null, null, 156, true),
    ('crm.email.thread', 'Email Thread', 'resource', 'Communication', 'mail_messages', null, null, null, null, 157, true),
    ('crm.email.mailboxes', 'Mailbox Management', 'resource', 'Communication', 'mailboxes', null, null, null, null, 158, true)
) as data(resource_key, name, resource_type, resource_group, table_name, view_name, rpc_name, entity_owner_field, entity_branch_field, sort_order, active)
  on pm.code = 'crm'
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

with desired_permissions as (
  select *
  from (
    values
      ('Ventas', 'crm.email', 'view', 'all', true),
      ('Ventas', 'crm.email.list', 'view', 'all', true),
      ('Ventas', 'crm.email.thread', 'view', 'all', true),
      ('Pricing', 'crm.email', 'view', 'all', true),
      ('Pricing', 'crm.email.list', 'view', 'all', true),
      ('Pricing', 'crm.email.thread', 'view', 'all', true),
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

alter table mailboxes enable row level security;
alter table mailbox_role_access enable row level security;
alter table mail_threads enable row level security;
alter table mail_messages enable row level security;
alter table mail_entity_links enable row level security;
alter table mail_sync_runs enable row level security;

alter table mailboxes force row level security;
alter table mailbox_role_access force row level security;
alter table mail_threads force row level security;
alter table mail_messages force row level security;
alter table mail_entity_links force row level security;
alter table mail_sync_runs force row level security;

drop policy if exists "active_select_mailboxes" on mailboxes;
drop policy if exists "admin_insert_mailboxes" on mailboxes;
drop policy if exists "admin_update_mailboxes" on mailboxes;
drop policy if exists "admin_delete_mailboxes" on mailboxes;
drop policy if exists "admin_select_mailbox_role_access" on mailbox_role_access;
drop policy if exists "admin_insert_mailbox_role_access" on mailbox_role_access;
drop policy if exists "admin_update_mailbox_role_access" on mailbox_role_access;
drop policy if exists "admin_delete_mailbox_role_access" on mailbox_role_access;
drop policy if exists "active_select_mail_threads" on mail_threads;
drop policy if exists "admin_insert_mail_threads" on mail_threads;
drop policy if exists "admin_update_mail_threads" on mail_threads;
drop policy if exists "admin_delete_mail_threads" on mail_threads;
drop policy if exists "active_select_mail_messages" on mail_messages;
drop policy if exists "admin_insert_mail_messages" on mail_messages;
drop policy if exists "admin_update_mail_messages" on mail_messages;
drop policy if exists "admin_delete_mail_messages" on mail_messages;
drop policy if exists "active_select_mail_entity_links" on mail_entity_links;
drop policy if exists "admin_insert_mail_entity_links" on mail_entity_links;
drop policy if exists "admin_update_mail_entity_links" on mail_entity_links;
drop policy if exists "admin_delete_mail_entity_links" on mail_entity_links;
drop policy if exists "active_select_mail_sync_runs" on mail_sync_runs;
drop policy if exists "admin_insert_mail_sync_runs" on mail_sync_runs;
drop policy if exists "admin_update_mail_sync_runs" on mail_sync_runs;
drop policy if exists "admin_delete_mail_sync_runs" on mail_sync_runs;

create policy "active_select_mailboxes"
on mailboxes
for select
using (
  public.erp_can_access_mailbox(id, 'view')
  or public.erp_can_manage_mailboxes()
);

create policy "admin_insert_mailboxes"
on mailboxes
for insert
with check (public.erp_can_manage_mailboxes());

create policy "admin_update_mailboxes"
on mailboxes
for update
using (public.erp_can_manage_mailboxes())
with check (public.erp_can_manage_mailboxes());

create policy "admin_delete_mailboxes"
on mailboxes
for delete
using (public.erp_can_manage_mailboxes());

create policy "admin_select_mailbox_role_access"
on mailbox_role_access
for select
using (public.erp_can_manage_mailboxes());

create policy "admin_insert_mailbox_role_access"
on mailbox_role_access
for insert
with check (public.erp_can_manage_mailboxes());

create policy "admin_update_mailbox_role_access"
on mailbox_role_access
for update
using (public.erp_can_manage_mailboxes())
with check (public.erp_can_manage_mailboxes());

create policy "admin_delete_mailbox_role_access"
on mailbox_role_access
for delete
using (public.erp_can_manage_mailboxes());

create policy "active_select_mail_threads"
on mail_threads
for select
using (public.erp_can_access_mailbox(mailbox_id, 'view'));

create policy "admin_insert_mail_threads"
on mail_threads
for insert
with check (public.erp_can_manage_mailboxes());

create policy "admin_update_mail_threads"
on mail_threads
for update
using (public.erp_can_manage_mailboxes())
with check (public.erp_can_manage_mailboxes());

create policy "admin_delete_mail_threads"
on mail_threads
for delete
using (public.erp_can_manage_mailboxes());

create policy "active_select_mail_messages"
on mail_messages
for select
using (public.erp_can_access_mailbox(mailbox_id, 'view'));

create policy "admin_insert_mail_messages"
on mail_messages
for insert
with check (public.erp_can_manage_mailboxes());

create policy "admin_update_mail_messages"
on mail_messages
for update
using (public.erp_can_manage_mailboxes())
with check (public.erp_can_manage_mailboxes());

create policy "admin_delete_mail_messages"
on mail_messages
for delete
using (public.erp_can_manage_mailboxes());

create policy "active_select_mail_entity_links"
on mail_entity_links
for select
using (public.erp_can_access_mailbox(mailbox_id, 'view'));

create policy "admin_insert_mail_entity_links"
on mail_entity_links
for insert
with check (public.erp_can_manage_mailboxes());

create policy "admin_update_mail_entity_links"
on mail_entity_links
for update
using (public.erp_can_manage_mailboxes())
with check (public.erp_can_manage_mailboxes());

create policy "admin_delete_mail_entity_links"
on mail_entity_links
for delete
using (public.erp_can_manage_mailboxes());

create policy "active_select_mail_sync_runs"
on mail_sync_runs
for select
using (
  public.erp_can_access_mailbox(mailbox_id, 'view')
  or public.erp_can_manage_mailboxes()
);

create policy "admin_insert_mail_sync_runs"
on mail_sync_runs
for insert
with check (public.erp_can_manage_mailboxes());

create policy "admin_update_mail_sync_runs"
on mail_sync_runs
for update
using (public.erp_can_manage_mailboxes())
with check (public.erp_can_manage_mailboxes());

create policy "admin_delete_mail_sync_runs"
on mail_sync_runs
for delete
using (public.erp_can_manage_mailboxes());

grant execute on function public.erp_current_role_id() to authenticated;
grant execute on function public.erp_can_manage_mailboxes() to authenticated;
grant execute on function public.erp_can_access_mailbox(uuid, text) to authenticated;
