-- =========================================
-- ERP BUSINESS LOGIC FUNCTIONS
-- =========================================


-- =========================================
-- 1. CREATE CLIENT WITH CONTACTS
-- =========================================

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


-- =========================================
-- 2. ADD CONTACT TO CLIENT
-- =========================================

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


-- =========================================
-- 2.25 ADD CLIENT LOGISTICS PARTY
-- =========================================

create or replace function add_client_logistics_party(
  p_client_id uuid,
  p_party_type text,
  p_name text,
  p_full_address text default null,
  p_postal_code text default null,
  p_city_unlocode text default null,
  p_contact_name text default null,
  p_contact_email text default null,
  p_contact_phone text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  normalized_party_type text;
  new_party_id uuid;
begin
  normalized_party_type := lower(coalesce(nullif(btrim(p_party_type), ''), 'shipper'));

  if normalized_party_type not in ('shipper', 'consignee', 'aa') then
    raise exception 'Invalid party_type. Expected shipper, consignee, or aa';
  end if;

  if nullif(btrim(coalesce(p_name, '')), '') is null then
    raise exception 'name is required';
  end if;

  insert into client_logistics_parties (
    client_id,
    party_type,
    name,
    full_address,
    postal_code,
    city_unlocode,
    contact_name,
    contact_email,
    contact_phone
  )
  values (
    p_client_id,
    normalized_party_type,
    btrim(p_name),
    nullif(btrim(coalesce(p_full_address, '')), ''),
    nullif(btrim(coalesce(p_postal_code, '')), ''),
    nullif(upper(btrim(coalesce(p_city_unlocode, ''))), ''),
    nullif(btrim(coalesce(p_contact_name, '')), ''),
    nullif(btrim(coalesce(p_contact_email, '')), ''),
    nullif(btrim(coalesce(p_contact_phone, '')), '')
  )
  returning id into new_party_id;

  return new_party_id;
end;
$$;


-- =========================================
-- 2.5 DELETE CLIENT LOGISTICS PARTY
-- =========================================

create or replace function delete_client_logistics_party(
  p_party_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  delete from client_logistics_parties
  where id = p_party_id;
end;
$$;


-- =========================================
-- 2.75 RESOLVE UN/LOCODE REFERENCE
-- =========================================

create or replace function resolve_unlocode_reference(
  p_unlocode text default null,
  p_unlocode_id uuid default null
)
returns table (
  resolved_id uuid,
  resolved_unlocode text,
  resolved_city text,
  resolved_country text
)
language sql
stable
as $$
  select
    u.id as resolved_id,
    u.unlocode as resolved_unlocode,
    case
      when coalesce(u.subdivision_code, '') <> '' then u.name || ', ' || u.subdivision_code
      else u.name
    end as resolved_city,
    u.country_name as resolved_country
  from unlocodes u
  where (
    p_unlocode_id is not null and u.id = p_unlocode_id
  ) or (
    p_unlocode_id is null
    and nullif(upper(btrim(coalesce(p_unlocode, ''))), '') is not null
    and u.unlocode = upper(btrim(p_unlocode))
  )
  limit 1;
$$;


-- =========================================
-- 3. OPPORTUNITY HELPERS
-- =========================================

create or replace function calculate_opportunity_expiration_date(
  p_start_date date
)
returns date
language sql
immutable
as $$
  select
    case
      when p_start_date is null then null
      else (
        date_trunc('month', (p_start_date::timestamp + interval '6 months'))
        + interval '1 month'
        - interval '1 day'
      )::date
    end
$$;

create or replace function build_opportunity_title(
  p_client_id uuid,
  p_service_type text default null,
  p_transport_type text default null,
  p_origin text default null,
  p_destination text default null
)
returns text
language plpgsql
stable
as $$
declare
  client_name text;
  lane_label text;
begin
  select company_name
  into client_name
  from clients
  where id = p_client_id;

  lane_label := case
    when nullif(btrim(coalesce(p_origin, '')), '') is not null
      and nullif(btrim(coalesce(p_destination, '')), '') is not null
      then btrim(p_origin) || ' -> ' || btrim(p_destination)
    when nullif(btrim(coalesce(p_origin, '')), '') is not null
      then btrim(p_origin)
    when nullif(btrim(coalesce(p_destination, '')), '') is not null
      then btrim(p_destination)
    else null
  end;

  return concat_ws(
    ' · ',
    nullif(btrim(coalesce(client_name, '')), ''),
    nullif(
      concat_ws(
        ' / ',
        nullif(btrim(coalesce(p_service_type, '')), ''),
        nullif(btrim(coalesce(p_transport_type, '')), '')
      ),
      ''
    ),
    lane_label
  );
end;
$$;

create or replace function sync_expired_opportunities()
returns integer
language plpgsql
security definer
as $$
declare
  affected_rows integer;
begin
  update opportunities
  set status = 'vencida'
  where expiration_date is not null
    and expiration_date < current_date
    and status not in ('aceptado', 'rechazada', 'vencida');

  get diagnostics affected_rows = row_count;
  return affected_rows;
end;
$$;


-- =========================================
-- 4. CREATE OPPORTUNITY
-- =========================================

create or replace function create_opportunity(
  p_client_id uuid,
  p_title text default null,
  p_estimated_value numeric default null,
  p_origin text default null,
  p_destination text default null,
  p_stage text default 'qualification',
  p_service_type text default null,
  p_transport_type text default null,
  p_origin_unlocode text default null,
  p_destination_unlocode text default null,
  p_expected_profit_usd numeric default null,
  p_service_quantity integer default null,
  p_salesperson_id uuid default null,
  p_description text default null,
  p_status text default 'investigando'
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_opportunity_id uuid;
  resolved_salesperson_id uuid;
begin
  select coalesce(
    p_salesperson_id,
    (
      select c.account_owner_id
      from clients c
      where c.id = p_client_id
    )
  )
  into resolved_salesperson_id;

  insert into opportunities (
    client_id,
    salesperson_id,
    title,
    description,
    service_type,
    transport_type,
    estimated_value,
    origin,
    origin_unlocode,
    destination,
    destination_unlocode,
    stage,
    status,
    expected_profit_usd,
    service_quantity
  )
  values (
    p_client_id,
    resolved_salesperson_id,
    coalesce(nullif(btrim(p_title), ''), 'Opportunity'),
    nullif(btrim(p_description), ''),
    nullif(btrim(p_service_type), ''),
    nullif(btrim(p_transport_type), ''),
    p_estimated_value,
    nullif(btrim(p_origin), ''),
    nullif(btrim(p_origin_unlocode), ''),
    nullif(btrim(p_destination), ''),
    nullif(btrim(p_destination_unlocode), ''),
    coalesce(nullif(btrim(p_stage), ''), 'qualification'),
    coalesce(nullif(btrim(p_status), ''), 'investigando'),
    p_expected_profit_usd,
    p_service_quantity
  )
  returning id into new_opportunity_id;

  return new_opportunity_id;
end;
$$;


-- =========================================
-- 5. UPDATE OPPORTUNITY STATUS
-- =========================================

create or replace function update_opportunity_status(
  p_opportunity_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
as $$
begin
  perform sync_expired_opportunities();

  update opportunities
  set status = p_status
  where id = p_opportunity_id;
end;
$$;


-- =========================================
-- 6. CONVERT OPPORTUNITY TO QUOTATION
-- =========================================

create or replace function convert_opportunity_to_quotation(
  p_opportunity_id uuid,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_quotation_id uuid;
  opportunity_row opportunities%rowtype;
begin
  select *
  into opportunity_row
  from opportunities
  where id = p_opportunity_id;

  if not found then
    raise exception 'Opportunity % not found', p_opportunity_id;
  end if;

  insert into quotations (
    client_id,
    opportunity_id,
    created_by,
    status,
    service_type,
    origin,
    destination
  )
  values (
    opportunity_row.client_id,
    opportunity_row.id,
    p_created_by,
    'draft',
    opportunity_row.service_type,
    opportunity_row.origin,
    opportunity_row.destination
  )
  returning id into new_quotation_id;

  update opportunities
  set status = 'cotizando'
  where id = p_opportunity_id;

  return new_quotation_id;
end;
$$;


-- =========================================
-- 6. APPROVE QUOTATION
-- =========================================

create or replace function approve_quotation(
  p_quotation_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  update quotations
  set status = 'approved'
  where id = p_quotation_id;
end;
$$;


-- =========================================
-- 7. CREATE SHIPMENT
-- =========================================

create or replace function create_shipment(
  p_quotation_id uuid
)
returns uuid
language plpgsql
security definer
as $$
declare
  existing_shipment_id uuid;
  quotation_row quotations%rowtype;
  new_shipment_id uuid;
begin
  select id
  into existing_shipment_id
  from shipments
  where quotation_id = p_quotation_id
  limit 1;

  if existing_shipment_id is not null then
    return existing_shipment_id;
  end if;

  select *
  into quotation_row
  from quotations
  where id = p_quotation_id;

  if not found then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  insert into shipments (
    quotation_id,
    client_id,
    status,
    origin,
    destination
  )
  values (
    quotation_row.id,
    quotation_row.client_id,
    'pending',
    quotation_row.origin,
    quotation_row.destination
  )
  returning id into new_shipment_id;

  return new_shipment_id;
end;
$$;


-- =========================================
-- 8. UPDATE SHIPMENT STATUS
-- =========================================

create or replace function update_shipment_status(
  p_shipment_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
as $$
begin
  update shipments
  set status = p_status
  where id = p_shipment_id;
end;
$$;


-- =========================================
-- 9. MARK SHIPMENT DELIVERED
-- =========================================

create or replace function mark_shipment_delivered(
  p_shipment_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  update shipments
  set
    status = 'delivered',
    delivered_at = now()
  where id = p_shipment_id;
end;
$$;


-- =========================================
-- 10. GET FULL CLIENT DATA
-- =========================================

create or replace function get_client_full(
  p_client_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'client', to_jsonb(c),
    'contacts', coalesce(
      (
        select jsonb_agg(to_jsonb(ct) order by ct.created_at desc)
        from contacts ct
        where ct.client_id = c.id
      ),
      '[]'::jsonb
    ),
    'logistics_parties', coalesce(
      (
        select jsonb_agg(to_jsonb(clp) order by clp.created_at desc)
        from client_logistics_parties clp
        where clp.client_id = c.id
      ),
      '[]'::jsonb
    ),
    'opportunities', coalesce(
      (
        select jsonb_agg(to_jsonb(o) order by o.created_at desc)
        from opportunities o
        where o.client_id = c.id
      ),
      '[]'::jsonb
    ),
    'quotations', coalesce(
      (
        select jsonb_agg(to_jsonb(q) order by q.created_at desc)
        from quotations q
        where q.client_id = c.id
      ),
      '[]'::jsonb
    ),
    'shipments', coalesce(
      (
        select jsonb_agg(to_jsonb(s) order by s.created_at desc)
        from shipments s
        where s.client_id = c.id
      ),
      '[]'::jsonb
    )
  )
  into result
  from clients c
  where c.id = p_client_id
    and c.is_deleted = false;

  return result;
end;
$$;


-- =========================================
-- 11. SOFT DELETE CLIENT
-- =========================================

create or replace function soft_delete_client(
  p_client_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  update clients
  set
    is_deleted = true,
    status = 'inactive'
  where id = p_client_id;
end;
$$;


-- =========================================
-- 12. SEARCH CLIENTS
-- =========================================

create or replace function search_clients(
  p_query text
)
returns setof clients
language sql
security definer
as $$
  with params as (
    select
      nullif(lower(btrim(p_query)), '') as normalized_query
  )
  select c.*
  from clients c
  cross join params p
  where c.is_deleted = false
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


-- =========================================
-- 13. SEARCH UN/LOCODES
-- =========================================

create or replace function search_unlocodes(
  p_query text default null,
  p_country_code text default null,
  p_function_classifier text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  source_id uuid,
  country_code text,
  location_code text,
  unlocode text,
  country_name text,
  name text,
  name_without_diacritics text,
  subdivision_code text,
  function_classifier text,
  status text,
  change_indicator text,
  date_code text,
  iata_code text,
  coordinates text,
  remarks text,
  source_page_url text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
as $$
  with params as (
    select
      nullif(lower(btrim(p_query)), '') as normalized_query,
      nullif(upper(btrim(p_query)), '') as normalized_code,
      nullif(upper(btrim(p_country_code)), '') as normalized_country_code,
      nullif(btrim(p_function_classifier), '') as normalized_function_classifier
  )
  select
    u.id,
    u.source_id,
    u.country_code,
    u.location_code,
    u.unlocode,
    u.country_name,
    u.name,
    u.name_without_diacritics,
    u.subdivision_code,
    u.function_classifier,
    u.status,
    u.change_indicator,
    u.date_code,
    u.iata_code,
    u.coordinates,
    u.remarks,
    u.source_page_url,
    u.created_at,
    u.updated_at
  from unlocodes u
  cross join params p
  where (
    p.normalized_query is null
    or u.search_text ilike '%' || p.normalized_query || '%'
    or u.unlocode = p.normalized_code
  )
    and (
      p.normalized_country_code is null
      or u.country_code = p.normalized_country_code
    )
    and (
      p.normalized_function_classifier is null
      or coalesce(u.function_classifier, '') like '%' || p.normalized_function_classifier || '%'
    )
  order by
    case
      when p.normalized_query is null then 0
      when u.unlocode = p.normalized_code then 1000
      when u.unlocode like p.normalized_code || '%' then 900
      when lower(u.name) like p.normalized_query || '%' then 800
      when lower(coalesce(u.name_without_diacritics, '')) like p.normalized_query || '%' then 775
      when lower(coalesce(u.country_name, '')) like p.normalized_query || '%' then 650
      when lower(coalesce(u.iata_code, '')) = p.normalized_query then 625
      else greatest(
        similarity(u.search_text, p.normalized_query),
        similarity(lower(coalesce(u.name_without_diacritics, '')), p.normalized_query),
        similarity(lower(coalesce(u.name, '')), p.normalized_query)
      ) * 100
    end desc,
    u.country_code asc,
    u.name asc,
    u.location_code asc
  limit least(greatest(coalesce(p_limit, 50), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
$$;


-- =========================================
-- 14. CREATE SERVICE TRANSPORT TYPE
-- =========================================

create or replace function create_service_transport_type(
  p_service_type text,
  p_transport_type text
)
returns uuid
language plpgsql
security definer
as $$
declare
  normalized_service_type text;
  normalized_transport_type text;
  new_record_id uuid;
begin
  normalized_service_type := nullif(btrim(p_service_type), '');
  normalized_transport_type := nullif(btrim(p_transport_type), '');

  if normalized_service_type is null then
    raise exception 'service_type is required';
  end if;

  if normalized_transport_type is null then
    raise exception 'transport_type is required';
  end if;

  insert into service_transport_types (
    service_type,
    transport_type
  )
  values (
    normalized_service_type,
    normalized_transport_type
  )
  returning id into new_record_id;

  return new_record_id;
end;
$$;


-- =========================================
-- 15. UPDATE SERVICE TRANSPORT TYPE
-- =========================================

create or replace function update_service_transport_type(
  p_id uuid,
  p_service_type text,
  p_transport_type text
)
returns void
language plpgsql
security definer
as $$
declare
  normalized_service_type text;
  normalized_transport_type text;
begin
  normalized_service_type := nullif(btrim(p_service_type), '');
  normalized_transport_type := nullif(btrim(p_transport_type), '');

  if normalized_service_type is null then
    raise exception 'service_type is required';
  end if;

  if normalized_transport_type is null then
    raise exception 'transport_type is required';
  end if;

  update service_transport_types
  set
    service_type = normalized_service_type,
    transport_type = normalized_transport_type
  where id = p_id;
end;
$$;


-- =========================================
-- 16. DELETE SERVICE TRANSPORT TYPE
-- =========================================

create or replace function delete_service_transport_type(
  p_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  delete from service_transport_types
  where id = p_id;
end;
$$;


-- =========================================
-- 17. CREATE PROVIDER
-- =========================================

create or replace function create_provider(
  p_name text,
  p_tax_id text default null,
  p_provider_type text default null,
  p_corporate_phone text default null,
  p_company_email text default null,
  p_website text default null,
  p_full_address text default null,
  p_postal_code text default null,
  p_city_unlocode text default null,
  p_status text default 'en_proceso_de_alta',
  p_credit_active boolean default false,
  p_credit_amount numeric default null,
  p_credit_days integer default null,
  p_service_offerings jsonb default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_provider_id uuid;
begin
  insert into providers (
    name,
    tax_id,
    provider_type,
    corporate_phone,
    company_email,
    website,
    full_address,
    postal_code,
    city_unlocode,
    status,
    credit_active,
    credit_amount,
    credit_days
  )
  values (
    p_name,
    nullif(btrim(p_tax_id), ''),
    nullif(btrim(p_provider_type), ''),
    nullif(btrim(p_corporate_phone), ''),
    nullif(btrim(p_company_email), ''),
    nullif(btrim(p_website), ''),
    nullif(btrim(p_full_address), ''),
    nullif(btrim(p_postal_code), ''),
    nullif(upper(btrim(p_city_unlocode)), ''),
    coalesce(nullif(btrim(p_status), ''), 'en_proceso_de_alta'),
    coalesce(p_credit_active, false),
    p_credit_amount,
    p_credit_days
  )
  returning id into new_provider_id;

  if p_service_offerings is not null then
    insert into provider_service_offerings (
      provider_id,
      service_transport_type_id,
      terms_and_conditions
    )
    select
      new_provider_id,
      (offering->>'service_transport_type_id')::uuid,
      nullif(btrim(offering->>'terms_and_conditions'), '')
    from jsonb_array_elements(p_service_offerings) as offering
    where nullif(offering->>'service_transport_type_id', '') is not null;
  end if;

  return new_provider_id;
end;
$$;


-- =========================================
-- 18. ADD CONTACT TO PROVIDER
-- =========================================

create or replace function add_contact_to_provider(
  p_provider_id uuid,
  p_name text,
  p_email text default null,
  p_phone text default null,
  p_linkedin_url text default null,
  p_position text default null,
  p_status text default 'activo'
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_contact_id uuid;
begin
  insert into provider_contacts (
    provider_id,
    name,
    email,
    phone,
    linkedin_url,
    position,
    status
  )
  values (
    p_provider_id,
    p_name,
    nullif(btrim(p_email), ''),
    nullif(btrim(p_phone), ''),
    nullif(btrim(p_linkedin_url), ''),
    nullif(btrim(p_position), ''),
    coalesce(nullif(btrim(p_status), ''), 'activo')
  )
  returning id into new_contact_id;

  return new_contact_id;
end;
$$;


-- =========================================
-- 19. GET PROVIDER FULL
-- =========================================

create or replace function get_provider_full(
  p_provider_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  provider_record jsonb;
  contacts_data jsonb;
  service_offerings_data jsonb;
begin
  select to_jsonb(p)
  into provider_record
  from providers p
  where p.id = p_provider_id;

  if provider_record is null then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', pc.id,
        'provider_id', pc.provider_id,
        'name', pc.name,
        'email', pc.email,
        'phone', pc.phone,
        'linkedin_url', pc.linkedin_url,
        'position', pc.position,
        'status', pc.status,
        'created_at', pc.created_at,
        'updated_at', pc.updated_at,
        'provider_name', p.name
      )
      order by pc.name asc
    ),
    '[]'::jsonb
  )
  into contacts_data
  from provider_contacts pc
  join providers p on p.id = pc.provider_id
  where pc.provider_id = p_provider_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', pso.id,
        'provider_id', pso.provider_id,
        'provider_name', p.name,
        'service_transport_type_id', pso.service_transport_type_id,
        'service_type', stt.service_type,
        'transport_type', stt.transport_type,
        'terms_and_conditions', pso.terms_and_conditions,
        'created_at', pso.created_at,
        'updated_at', pso.updated_at
      )
      order by stt.service_type asc, stt.transport_type asc
    ),
    '[]'::jsonb
  )
  into service_offerings_data
  from provider_service_offerings pso
  join providers p on p.id = pso.provider_id
  join service_transport_types stt on stt.id = pso.service_transport_type_id
  where pso.provider_id = p_provider_id;

  return jsonb_build_object(
    'provider', provider_record,
    'contacts', contacts_data,
    'service_offerings', service_offerings_data
  );
end;
$$;


-- =========================================
-- 20. SEARCH PROVIDERS
-- =========================================

create or replace function search_providers(
  p_query text
)
returns setof providers
language plpgsql
security definer
as $$
begin
  return query
  select *
  from providers
  where
    name ilike '%' || p_query || '%'
    or coalesce(provider_type, '') ilike '%' || p_query || '%'
    or coalesce(company_email, '') ilike '%' || p_query || '%'
    or coalesce(city, '') ilike '%' || p_query || '%'
    or coalesce(country, '') ilike '%' || p_query || '%'
  order by name asc;
end;
$$;
