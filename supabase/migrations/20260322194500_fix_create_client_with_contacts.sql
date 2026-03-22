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
    p_account_owner_id
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
