create or replace function delete_client_record(
  p_client_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  perform soft_delete_client(p_client_id);
  return p_client_id;
end;
$$;

create or replace function update_client_record(
  p_client_id uuid,
  p_changes jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_id uuid;
begin
  update clients
  set
    company_name = case
      when p_changes ? 'company_name' then nullif(btrim(coalesce(p_changes->>'company_name', '')), '')
      else company_name
    end,
    account_owner_id = case
      when p_changes ? 'account_owner_id' then (p_changes->>'account_owner_id')::uuid
      else account_owner_id
    end,
    country = case
      when p_changes ? 'country' then nullif(btrim(coalesce(p_changes->>'country', '')), '')
      else country
    end,
    industry = case
      when p_changes ? 'industry' then nullif(btrim(coalesce(p_changes->>'industry', '')), '')
      else industry
    end,
    website = case
      when p_changes ? 'website' then nullif(btrim(coalesce(p_changes->>'website', '')), '')
      else website
    end,
    corporate_phone = case
      when p_changes ? 'corporate_phone' then nullif(btrim(coalesce(p_changes->>'corporate_phone', '')), '')
      else corporate_phone
    end,
    status = case
      when p_changes ? 'status' then nullif(btrim(coalesce(p_changes->>'status', '')), '')
      else status
    end,
    full_address = case
      when p_changes ? 'full_address' then nullif(btrim(coalesce(p_changes->>'full_address', '')), '')
      else full_address
    end,
    postal_code = case
      when p_changes ? 'postal_code' then nullif(btrim(coalesce(p_changes->>'postal_code', '')), '')
      else postal_code
    end,
    city = case
      when p_changes ? 'city' then nullif(btrim(coalesce(p_changes->>'city', '')), '')
      else city
    end,
    city_unlocode = case
      when p_changes ? 'city_unlocode' then nullif(upper(btrim(coalesce(p_changes->>'city_unlocode', ''))), '')
      else city_unlocode
    end,
    tax_id = case
      when p_changes ? 'tax_id' then nullif(btrim(coalesce(p_changes->>'tax_id', '')), '')
      else tax_id
    end
  where id = p_client_id
  returning id into updated_id;

  if updated_id is null then
    raise exception 'Client % not found', p_client_id;
  end if;

  return updated_id;
end;
$$;

create or replace function update_contact_record(
  p_contact_id uuid,
  p_changes jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text;
  updated_id uuid;
begin
  if p_changes ? 'name' then
    normalized_name := nullif(btrim(coalesce(p_changes->>'name', '')), '');
    if normalized_name is null then
      raise exception 'Contact name is required';
    end if;
  end if;

  update contacts
  set
    name = case when p_changes ? 'name' then normalized_name else name end,
    email = case
      when p_changes ? 'email' then nullif(btrim(coalesce(p_changes->>'email', '')), '')
      else email
    end,
    phone = case
      when p_changes ? 'phone' then nullif(btrim(coalesce(p_changes->>'phone', '')), '')
      else phone
    end,
    linkedin_url = case
      when p_changes ? 'linkedin_url' then nullif(btrim(coalesce(p_changes->>'linkedin_url', '')), '')
      else linkedin_url
    end,
    position = case
      when p_changes ? 'position' then nullif(btrim(coalesce(p_changes->>'position', '')), '')
      else position
    end,
    status = case
      when p_changes ? 'status' then coalesce(nullif(btrim(coalesce(p_changes->>'status', '')), ''), 'activo')
      else status
    end,
    is_primary = case
      when p_changes ? 'is_primary' then coalesce((p_changes->>'is_primary')::boolean, false)
      else is_primary
    end
  where id = p_contact_id
  returning id into updated_id;

  if updated_id is null then
    raise exception 'Contact % not found', p_contact_id;
  end if;

  return updated_id;
end;
$$;

create or replace function delete_contact_record(
  p_contact_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from contacts
  where id = p_contact_id;
end;
$$;

create or replace function update_opportunity_record(
  p_opportunity_id uuid,
  p_changes jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_id uuid;
begin
  update opportunities
  set
    client_id = case
      when p_changes ? 'client_id' then (p_changes->>'client_id')::uuid
      else client_id
    end,
    salesperson_id = case
      when p_changes ? 'salesperson_id' then (p_changes->>'salesperson_id')::uuid
      else salesperson_id
    end,
    title = case
      when p_changes ? 'title' then coalesce(nullif(btrim(coalesce(p_changes->>'title', '')), ''), 'Opportunity')
      else title
    end,
    description = case
      when p_changes ? 'description' then nullif(btrim(coalesce(p_changes->>'description', '')), '')
      else description
    end,
    service_type = case
      when p_changes ? 'service_type' then nullif(btrim(coalesce(p_changes->>'service_type', '')), '')
      else service_type
    end,
    transport_type = case
      when p_changes ? 'transport_type' then nullif(btrim(coalesce(p_changes->>'transport_type', '')), '')
      else transport_type
    end,
    operation_type = case
      when p_changes ? 'operation_type' then nullif(btrim(coalesce(p_changes->>'operation_type', '')), '')
      else operation_type
    end,
    incoterm_id = case
      when p_changes ? 'incoterm_id' then (p_changes->>'incoterm_id')::uuid
      else incoterm_id
    end,
    origin = case
      when p_changes ? 'origin' then nullif(btrim(coalesce(p_changes->>'origin', '')), '')
      else origin
    end,
    origin_unlocode = case
      when p_changes ? 'origin_unlocode' then nullif(upper(btrim(coalesce(p_changes->>'origin_unlocode', ''))), '')
      else origin_unlocode
    end,
    destination = case
      when p_changes ? 'destination' then nullif(btrim(coalesce(p_changes->>'destination', '')), '')
      else destination
    end,
    destination_unlocode = case
      when p_changes ? 'destination_unlocode' then nullif(upper(btrim(coalesce(p_changes->>'destination_unlocode', ''))), '')
      else destination_unlocode
    end,
    expected_profit_usd = case
      when p_changes ? 'expected_profit_usd' then (p_changes->>'expected_profit_usd')::numeric
      else expected_profit_usd
    end,
    service_quantity = case
      when p_changes ? 'service_quantity' then (p_changes->>'service_quantity')::integer
      else service_quantity
    end,
    estimated_value = case
      when p_changes ? 'estimated_value' then (p_changes->>'estimated_value')::numeric
      else estimated_value
    end
  where id = p_opportunity_id
  returning id into updated_id;

  if updated_id is null then
    raise exception 'Opportunity % not found', p_opportunity_id;
  end if;

  return updated_id;
end;
$$;

create or replace function delete_opportunity_record(
  p_opportunity_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from opportunities
  where id = p_opportunity_id;
end;
$$;

create or replace function update_quotation_record(
  p_quotation_id uuid,
  p_changes jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_id uuid;
begin
  update quotations
  set
    pickup_address = case
      when p_changes ? 'pickup_address' then nullif(btrim(coalesce(p_changes->>'pickup_address', '')), '')
      else pickup_address
    end,
    delivery_address = case
      when p_changes ? 'delivery_address' then nullif(btrim(coalesce(p_changes->>'delivery_address', '')), '')
      else delivery_address
    end,
    required_quote_date = case
      when p_changes ? 'required_quote_date' then (p_changes->>'required_quote_date')::date
      else required_quote_date
    end,
    target_rate = case
      when p_changes ? 'target_rate' then (p_changes->>'target_rate')::numeric
      else target_rate
    end,
    rejection_reason_id = case
      when p_changes ? 'rejection_reason_id' then (p_changes->>'rejection_reason_id')::uuid
      else rejection_reason_id
    end,
    rejection_notes = case
      when p_changes ? 'rejection_notes' then nullif(btrim(coalesce(p_changes->>'rejection_notes', '')), '')
      else rejection_notes
    end,
    cancellation_notes = case
      when p_changes ? 'cancellation_notes' then nullif(btrim(coalesce(p_changes->>'cancellation_notes', '')), '')
      else cancellation_notes
    end
  where id = p_quotation_id
  returning id into updated_id;

  if updated_id is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  return updated_id;
end;
$$;

create or replace function update_provider_record(
  p_provider_id uuid,
  p_changes jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text;
  updated_id uuid;
begin
  if p_changes ? 'name' then
    normalized_name := nullif(btrim(coalesce(p_changes->>'name', '')), '');
    if normalized_name is null then
      raise exception 'Provider name is required';
    end if;
  end if;

  update providers
  set
    name = case when p_changes ? 'name' then normalized_name else name end,
    tax_id = case
      when p_changes ? 'tax_id' then nullif(btrim(coalesce(p_changes->>'tax_id', '')), '')
      else tax_id
    end,
    provider_type = case
      when p_changes ? 'provider_type' then nullif(btrim(coalesce(p_changes->>'provider_type', '')), '')
      else provider_type
    end,
    corporate_phone = case
      when p_changes ? 'corporate_phone' then nullif(btrim(coalesce(p_changes->>'corporate_phone', '')), '')
      else corporate_phone
    end,
    company_email = case
      when p_changes ? 'company_email' then nullif(btrim(coalesce(p_changes->>'company_email', '')), '')
      else company_email
    end,
    website = case
      when p_changes ? 'website' then nullif(btrim(coalesce(p_changes->>'website', '')), '')
      else website
    end,
    full_address = case
      when p_changes ? 'full_address' then nullif(btrim(coalesce(p_changes->>'full_address', '')), '')
      else full_address
    end,
    postal_code = case
      when p_changes ? 'postal_code' then nullif(btrim(coalesce(p_changes->>'postal_code', '')), '')
      else postal_code
    end,
    city = case
      when p_changes ? 'city' then nullif(btrim(coalesce(p_changes->>'city', '')), '')
      else city
    end,
    city_unlocode = case
      when p_changes ? 'city_unlocode' then nullif(upper(btrim(coalesce(p_changes->>'city_unlocode', ''))), '')
      else city_unlocode
    end,
    country = case
      when p_changes ? 'country' then nullif(btrim(coalesce(p_changes->>'country', '')), '')
      else country
    end,
    credit_active = case
      when p_changes ? 'credit_active' then coalesce((p_changes->>'credit_active')::boolean, false)
      else credit_active
    end,
    credit_amount = case
      when p_changes ? 'credit_amount' then (p_changes->>'credit_amount')::numeric
      else credit_amount
    end,
    credit_days = case
      when p_changes ? 'credit_days' then (p_changes->>'credit_days')::integer
      else credit_days
    end,
    status = case
      when p_changes ? 'status' then coalesce(nullif(btrim(coalesce(p_changes->>'status', '')), ''), 'en_proceso_de_alta')
      else status
    end
  where id = p_provider_id
  returning id into updated_id;

  if updated_id is null then
    raise exception 'Provider % not found', p_provider_id;
  end if;

  return updated_id;
end;
$$;

create or replace function delete_provider_record(
  p_provider_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from providers
  where id = p_provider_id;
end;
$$;

create or replace function update_provider_contact_record(
  p_contact_id uuid,
  p_changes jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text;
  updated_id uuid;
begin
  if p_changes ? 'name' then
    normalized_name := nullif(btrim(coalesce(p_changes->>'name', '')), '');
    if normalized_name is null then
      raise exception 'Provider contact name is required';
    end if;
  end if;

  update provider_contacts
  set
    name = case when p_changes ? 'name' then normalized_name else name end,
    email = case
      when p_changes ? 'email' then nullif(btrim(coalesce(p_changes->>'email', '')), '')
      else email
    end,
    phone = case
      when p_changes ? 'phone' then nullif(btrim(coalesce(p_changes->>'phone', '')), '')
      else phone
    end,
    linkedin_url = case
      when p_changes ? 'linkedin_url' then nullif(btrim(coalesce(p_changes->>'linkedin_url', '')), '')
      else linkedin_url
    end,
    position = case
      when p_changes ? 'position' then nullif(btrim(coalesce(p_changes->>'position', '')), '')
      else position
    end,
    status = case
      when p_changes ? 'status' then coalesce(nullif(btrim(coalesce(p_changes->>'status', '')), ''), 'activo')
      else status
    end
  where id = p_contact_id
  returning id into updated_id;

  if updated_id is null then
    raise exception 'Provider contact % not found', p_contact_id;
  end if;

  return updated_id;
end;
$$;

create or replace function delete_provider_contact_record(
  p_contact_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from provider_contacts
  where id = p_contact_id;
end;
$$;

create or replace function create_provider_service_offering_record(
  p_provider_id uuid,
  p_service_transport_type_id uuid,
  p_terms_and_conditions text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_offering_id uuid;
begin
  insert into provider_service_offerings (
    provider_id,
    service_transport_type_id,
    terms_and_conditions
  )
  values (
    p_provider_id,
    p_service_transport_type_id,
    nullif(btrim(coalesce(p_terms_and_conditions, '')), '')
  )
  returning id into new_offering_id;

  return new_offering_id;
end;
$$;

create or replace function update_provider_service_offering_record(
  p_offering_id uuid,
  p_changes jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_id uuid;
begin
  update provider_service_offerings
  set
    service_transport_type_id = case
      when p_changes ? 'service_transport_type_id' then (p_changes->>'service_transport_type_id')::uuid
      else service_transport_type_id
    end,
    terms_and_conditions = case
      when p_changes ? 'terms_and_conditions' then nullif(btrim(coalesce(p_changes->>'terms_and_conditions', '')), '')
      else terms_and_conditions
    end
  where id = p_offering_id
  returning id into updated_id;

  if updated_id is null then
    raise exception 'Provider service offering % not found', p_offering_id;
  end if;

  return updated_id;
end;
$$;

create or replace function delete_provider_service_offering_record(
  p_offering_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from provider_service_offerings
  where id = p_offering_id;
end;
$$;
