-- =========================================================
-- CONTACTS / PROFILE ENHANCEMENT
-- =========================================================

alter table contacts
  add column if not exists linkedin_url text,
  add column if not exists status text not null default 'activo';

create index if not exists idx_contacts_status
on contacts(status);

update contacts
set status = coalesce(nullif(status, ''), 'activo');

drop function if exists add_contact_to_client(uuid, text, text, text, text, boolean);

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

drop view if exists client_contacts_view;

create view client_contacts_view as
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
from contacts ct
join clients c on c.id = ct.client_id
where c.is_deleted = false;

grant select on client_contacts_view to anon, authenticated;
grant execute on function add_contact_to_client(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean
) to anon, authenticated;
