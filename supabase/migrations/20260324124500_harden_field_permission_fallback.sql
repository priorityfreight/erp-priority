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
