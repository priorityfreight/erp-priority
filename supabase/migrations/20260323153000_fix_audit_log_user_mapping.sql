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

create or replace function audit_trigger()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    insert into audit_logs (
      table_name,
      record_id,
      action,
      user_id,
      payload
    )
    values (
      tg_table_name,
      old.id,
      tg_op,
      public.erp_current_user_id(),
      to_jsonb(old)
    );

    return old;
  end if;

  insert into audit_logs (
    table_name,
    record_id,
    action,
    user_id,
    payload
  )
  values (
    tg_table_name,
    new.id,
    tg_op,
    public.erp_current_user_id(),
    to_jsonb(new)
  );

  return new;
end;
$$;
