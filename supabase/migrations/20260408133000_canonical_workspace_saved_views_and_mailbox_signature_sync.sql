create table if not exists public.workspace_saved_views (
  id uuid primary key default gen_random_uuid(),
  workspace_key text not null,
  owner_user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  search_query text,
  status_lane text,
  filters_json jsonb not null default '{}'::jsonb,
  sort_json jsonb not null default '{}'::jsonb,
  visible_columns_json jsonb not null default '[]'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_workspace_saved_views_owner_workspace
  on public.workspace_saved_views(owner_user_id, workspace_key);

create unique index if not exists idx_workspace_saved_views_single_default
  on public.workspace_saved_views(owner_user_id, workspace_key)
  where is_default = true;

create index if not exists idx_workspace_saved_views_name
  on public.workspace_saved_views(owner_user_id, workspace_key, name);

alter table public.workspace_saved_views enable row level security;

drop trigger if exists trg_workspace_saved_views_updated_at on public.workspace_saved_views;
drop trigger if exists set_workspace_saved_views_updated_at on public.workspace_saved_views;

create trigger set_workspace_saved_views_updated_at
before update on public.workspace_saved_views
for each row
execute function public.set_updated_at();

drop policy if exists "active_select_workspace_saved_views" on public.workspace_saved_views;
create policy "active_select_workspace_saved_views"
on public.workspace_saved_views
for select
using (
  public.erp_is_authenticated_active_user()
  and owner_user_id = public.erp_current_user_id()
);

drop policy if exists "active_insert_workspace_saved_views" on public.workspace_saved_views;
create policy "active_insert_workspace_saved_views"
on public.workspace_saved_views
for insert
with check (
  public.erp_is_authenticated_active_user()
  and owner_user_id = public.erp_current_user_id()
);

drop policy if exists "active_update_workspace_saved_views" on public.workspace_saved_views;
create policy "active_update_workspace_saved_views"
on public.workspace_saved_views
for update
using (
  public.erp_is_authenticated_active_user()
  and owner_user_id = public.erp_current_user_id()
)
with check (
  public.erp_is_authenticated_active_user()
  and owner_user_id = public.erp_current_user_id()
);

drop policy if exists "active_delete_workspace_saved_views" on public.workspace_saved_views;
create policy "active_delete_workspace_saved_views"
on public.workspace_saved_views
for delete
using (
  public.erp_is_authenticated_active_user()
  and owner_user_id = public.erp_current_user_id()
);

create or replace function public.set_workspace_saved_view_default(
  p_workspace_view_id uuid,
  p_workspace_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := public.erp_current_user_id();
  normalized_workspace_key text := nullif(btrim(coalesce(p_workspace_key, '')), '');
begin
  if current_user_id is null then
    raise exception 'Authenticated ERP user required';
  end if;

  update public.workspace_saved_views
  set is_default = false
  where owner_user_id = current_user_id
    and workspace_key = normalized_workspace_key;

  update public.workspace_saved_views
  set is_default = true
  where id = p_workspace_view_id
    and owner_user_id = current_user_id
    and workspace_key = normalized_workspace_key;

  if not found then
    raise exception 'Workspace saved view not found or not owned by current user';
  end if;
end;
$$;

alter table public.mailboxes
  add column if not exists signature_image_url text;

comment on column public.mailboxes.signature_image_url is
  'Public image URL appended as the outbound email signature for this mailbox.';
