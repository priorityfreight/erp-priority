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
