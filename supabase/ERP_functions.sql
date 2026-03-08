-- =========================================
-- ERP BUSINESS LOGIC FUNCTIONS
-- =========================================
-- This file contains RPC functions used by
-- the ERP application.
-- =========================================



-- =========================================
-- 1. CREATE CLIENT WITH CONTACTS
-- =========================================

create or replace function create_client_with_contacts(
  p_name text,
  p_email text,
  p_contacts jsonb
)
returns uuid
language plpgsql
security definer
as $$

declare
  new_client_id uuid;

begin

  insert into clients (
    name,
    email,
    created_at
  )
  values (
    p_name,
    p_email,
    now()
  )
  returning id into new_client_id;

  if p_contacts is not null then

    insert into contacts (
      client_id,
      name,
      email,
      phone
    )
    select
      new_client_id,
      contact->>'name',
      contact->>'email',
      contact->>'phone'
    from jsonb_array_elements(p_contacts) contact;

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
  p_email text,
  p_phone text
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
    created_at
  )
  values (
    p_client_id,
    p_name,
    p_email,
    p_phone,
    now()
  )
  returning id into new_contact_id;

  return new_contact_id;

end;
$$;



-- =========================================
-- 3. CREATE OPPORTUNITY
-- =========================================

create or replace function create_opportunity(
  p_client_id uuid,
  p_title text,
  p_value numeric
)
returns uuid
language plpgsql
security definer
as $$

declare
  new_opportunity_id uuid;

begin

  insert into opportunities (
    client_id,
    title,
    value,
    status,
    created_at
  )
  values (
    p_client_id,
    p_title,
    p_value,
    'open',
    now()
  )
  returning id into new_opportunity_id;

  return new_opportunity_id;

end;
$$;



-- =========================================
-- 4. UPDATE OPPORTUNITY STATUS
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

  update opportunities
  set status = p_status
  where id = p_opportunity_id;

end;
$$;



-- =========================================
-- 5. CONVERT OPPORTUNITY → QUOTATION
-- =========================================

create or replace function convert_opportunity_to_quotation(
  p_opportunity_id uuid
)
returns uuid
language plpgsql
security definer
as $$

declare
  new_quotation_id uuid;
  v_client_id uuid;

begin

  select client_id
  into v_client_id
  from opportunities
  where id = p_opportunity_id;

  insert into quotations (
    client_id,
    opportunity_id,
    status,
    created_at
  )
  values (
    v_client_id,
    p_opportunity_id,
    'draft',
    now()
  )
  returning id into new_quotation_id;

  update opportunities
  set status = 'quoted'
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
  p_client_id uuid,
  p_origin text,
  p_destination text
)
returns uuid
language plpgsql
security definer
as $$

declare
  new_shipment_id uuid;

begin

  insert into shipments (
    client_id,
    origin,
    destination,
    status,
    created_at
  )
  values (
    p_client_id,
    p_origin,
    p_destination,
    'pending',
    now()
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
  set status = 'delivered'
  where id = p_shipment_id;

end;
$$;



-- =========================================
-- 10. GET FULL CLIENT DATA
-- =========================================

create or replace function get_client_full(
  p_client_id uuid
)
returns json
language plpgsql
security definer
as $$

declare
  result json;

begin

  select json_build_object(
    'client', row_to_json(c),

    'contacts', (
      select json_agg(ct)
      from contacts ct
      where ct.client_id = c.id
    ),

    'opportunities', (
      select json_agg(o)
      from opportunities o
      where o.client_id = c.id
    ),

    'shipments', (
      select json_agg(s)
      from shipments s
      where s.client_id = c.id
    )

  )
  into result
  from clients c
  where c.id = p_client_id;

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
  set is_deleted = true
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
language plpgsql
security definer
as $$

begin

  return query
  select *
  from clients
  where
    is_deleted = false
    and (
      name ilike '%' || p_query || '%'
      or email ilike '%' || p_query || '%'
    );

end;
$$;