create or replace function prevent_hard_delete()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.allow_test_hard_delete', true) = 'on' then
    return old;
  end if;

  raise exception 'Hard delete not allowed. Use the soft_delete_client() function.';
  return old;
end;
$$;

create or replace function purge_ephemeral_client_record(
  p_client_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  client_name text;
begin
  select company_name
  into client_name
  from clients
  where id = p_client_id
  for update;

  if client_name is null then
    raise exception 'Client % not found', p_client_id;
  end if;

  if not (
    client_name ilike 'TEST_%'
    or client_name ilike 'LOADTEST_%'
    or client_name ilike 'QA_%'
    or client_name ilike 'STRESS_%'
    or client_name ilike 'PURGED_TEST_CLIENT_%'
  ) then
    raise exception 'Client % is not marked as ephemeral test data', p_client_id;
  end if;

  perform set_config('app.allow_test_hard_delete', 'on', true);

  delete from clients
  where id = p_client_id;

  return p_client_id;
end;
$$;
