-- =========================================
-- ERP BUSINESS LOGIC FUNCTIONS
-- =========================================


-- =========================================
-- 0. AUTH ACCESS CONTROL
-- =========================================

create or replace function erp_is_authenticated_active_user()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.auth_user_id = auth.uid()
      and u.active = true
  );
$$;

create or replace function erp_current_role_name()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select r.name
  from public.users u
  left join public.roles r on r.id = u.role_id
  where u.auth_user_id = auth.uid()
    and u.active = true
  limit 1;
$$;

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

create or replace function erp_is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(lower(public.erp_current_role_name()) = 'admin', false);
$$;

create or replace function resolve_login_identity(
  p_login text
)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select u.email
  from public.users u
  where u.active = true
    and (
      lower(u.email) = lower(btrim(p_login))
      or lower(coalesce(u.username, '')) = lower(btrim(p_login))
    )
  limit 1;
$$;

create or replace function link_current_auth_user()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_auth_email text;
  linked_user_id uuid;
begin
  if auth.uid() is null then
    return null;
  end if;

  select au.email
  into current_auth_email
  from auth.users au
  where au.id = auth.uid();

  if current_auth_email is null then
    return null;
  end if;

  update public.users
  set
    auth_user_id = auth.uid(),
    email = lower(current_auth_email),
    updated_at = now()
  where lower(email) = lower(current_auth_email)
    and active = true
    and (auth_user_id is null or auth_user_id = auth.uid());

  select u.id
  into linked_user_id
  from public.users u
  where u.auth_user_id = auth.uid()
    and u.active = true
  limit 1;

  return linked_user_id;
end;
$$;

create or replace function get_current_erp_user()
returns table (
  id uuid,
  auth_user_id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  username text,
  active boolean,
  role_id uuid,
  role_name text,
  branch_id uuid
)
language sql
security definer
stable
set search_path = public
as $$
  select
    u.id,
    u.auth_user_id,
    u.first_name,
    u.last_name,
    u.email,
    u.phone,
    u.username,
    u.active,
    u.role_id,
    r.name as role_name,
    u.branch_id
  from public.users u
  left join public.roles r on r.id = u.role_id
  where u.auth_user_id = auth.uid()
    and u.active = true
  limit 1;
$$;

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
  p_operation_type text default null,
  p_incoterm_id uuid default null,
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
    operation_type,
    incoterm_id,
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
    case
      when nullif(btrim(coalesce(p_operation_type, '')), '') is null then null
      when lower(btrim(p_operation_type)) = 'import' then 'Import'
      when lower(btrim(p_operation_type)) = 'export' then 'Export'
      else btrim(p_operation_type)
    end,
    p_incoterm_id,
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
-- 6. QUOTATION HELPERS
-- =========================================

create or replace function next_quotation_reference(
  p_service_type text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_service_type text;
  resolved_prefix text;
  next_value bigint;
begin
  normalized_service_type := upper(btrim(coalesce(p_service_type, '')));

  update quotation_reference_counters
  set
    last_value = last_value + 1,
    updated_at = now()
  where service_type = normalized_service_type
  returning prefix, last_value
  into resolved_prefix, next_value;

  if resolved_prefix is null then
    raise exception 'Unsupported quotation service type: %', p_service_type;
  end if;

  return resolved_prefix || '-' || lpad(next_value::text, 6, '0');
end;
$$;

create or replace function recalculate_quotation_totals(
  p_quotation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total_purchase numeric;
  total_sale numeric;
  total_profit numeric;
begin
  select
    coalesce(sum(coalesce(qc.purchase_amount, qc.cost, 0)), 0),
    coalesce(sum(coalesce(qc.sale_amount, 0)), 0),
    coalesce(sum(coalesce(qc.profit_amount, coalesce(qc.sale_amount, 0) - coalesce(qc.purchase_amount, qc.cost, 0))), 0)
  into total_purchase, total_sale, total_profit
  from quotation_costs qc
  where qc.quotation_id = p_quotation_id;

  update quotations
  set
    estimated_cost = total_purchase,
    estimated_price = case when total_sale = 0 then null else total_sale end,
    expected_profit = case when total_sale = 0 and total_purchase = 0 then null else total_profit end
  where id = p_quotation_id;
end;
$$;

create or replace function create_quotation_from_opportunity(
  p_opportunity_id uuid,
  p_pickup_address text default null,
  p_delivery_address text default null,
  p_commodities text default null,
  p_required_quote_date date default null,
  p_purchase_valid_until date default null,
  p_sales_valid_until date default null,
  p_quantity integer default null,
  p_weight numeric default null,
  p_volume numeric default null,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_quotation_id uuid;
  opportunity_row opportunities%rowtype;
  resolved_created_by uuid;
begin
  perform sync_expired_opportunities();

  select *
  into opportunity_row
  from opportunities
  where id = p_opportunity_id;

  if not found then
    raise exception 'Opportunity % not found', p_opportunity_id;
  end if;

  if nullif(btrim(coalesce(opportunity_row.service_type, '')), '') is null then
    raise exception 'Opportunity % must define a service type before quoting', p_opportunity_id;
  end if;

  resolved_created_by := coalesce(p_created_by, erp_current_user_id(), opportunity_row.salesperson_id);

  insert into quotations (
    client_id,
    opportunity_id,
    created_by,
    status,
    service_type,
    transport_type,
    operation_type,
    origin,
    origin_unlocode,
    origin_unlocode_id,
    destination,
    destination_unlocode,
    destination_unlocode_id,
    pickup_address,
    delivery_address,
    commodities,
    quantity,
    weight,
    volume,
    incoterm_id,
    required_quote_date,
    purchase_valid_until,
    sales_valid_until
  )
  values (
    opportunity_row.client_id,
    opportunity_row.id,
    resolved_created_by,
    'borrador',
    opportunity_row.service_type,
    opportunity_row.transport_type,
    opportunity_row.operation_type,
    opportunity_row.origin,
    opportunity_row.origin_unlocode,
    opportunity_row.origin_unlocode_id,
    opportunity_row.destination,
    opportunity_row.destination_unlocode,
    opportunity_row.destination_unlocode_id,
    nullif(btrim(coalesce(p_pickup_address, '')), ''),
    nullif(btrim(coalesce(p_delivery_address, '')), ''),
    nullif(btrim(coalesce(p_commodities, '')), ''),
    p_quantity,
    p_weight,
    p_volume,
    opportunity_row.incoterm_id,
    p_required_quote_date,
    p_purchase_valid_until,
    p_sales_valid_until
  )
  returning id into new_quotation_id;

  update opportunities
  set status = 'cotizando'
  where id = p_opportunity_id
    and status not in ('aceptado', 'rechazada', 'vencida');

  return new_quotation_id;
end;
$$;

create or replace function request_quotation_pricing(
  p_quotation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update quotations
  set status = 'pendiente'
  where id = p_quotation_id;
end;
$$;

create or replace function convert_opportunity_to_quotation(
  p_opportunity_id uuid,
  p_created_by uuid default null
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select create_quotation_from_opportunity(
    p_opportunity_id => p_opportunity_id,
    p_created_by => p_created_by
  );
$$;

create or replace function take_quotation_for_pricing(
  p_quotation_id uuid,
  p_pricing_owner_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_pricing_owner_id uuid;
begin
  resolved_pricing_owner_id := coalesce(p_pricing_owner_id, erp_current_user_id());

  if resolved_pricing_owner_id is null then
    raise exception 'Pricing owner is required';
  end if;

  update quotations
  set
    pricing_owner_id = resolved_pricing_owner_id,
    status = 'cotizando'
  where id = p_quotation_id;
end;
$$;

create or replace function update_quotation_status(
  p_quotation_id uuid,
  p_status text,
  p_rejection_reason_id uuid default null,
  p_rejection_notes text default null,
  p_cancellation_notes text default null,
  p_target_rate numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_status text;
begin
  normalized_status := lower(btrim(coalesce(p_status, '')));

  if normalized_status = '' then
    raise exception 'Quotation status is required';
  end if;

  if normalized_status = 'rechazada' and p_rejection_reason_id is null then
    raise exception 'A rejection reason is required when rejecting a quotation';
  end if;

  if normalized_status = 'renegociar_tarifa' and p_target_rate is null then
    raise exception 'A target rate is required when requesting renegotiation';
  end if;

  update quotations
  set
    status = normalized_status,
    rejection_reason_id = case when normalized_status = 'rechazada' then p_rejection_reason_id else null end,
    rejection_notes = case
      when normalized_status in ('rechazada', 'renegociar_tarifa') then nullif(btrim(coalesce(p_rejection_notes, '')), '')
      else null
    end,
    cancellation_notes = case when normalized_status = 'cancelada' then nullif(btrim(coalesce(p_cancellation_notes, '')), '') else null end,
    target_rate = case when normalized_status = 'renegociar_tarifa' then p_target_rate else null end
  where id = p_quotation_id;
end;
$$;

create or replace function approve_quotation(
  p_quotation_id uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  select update_quotation_status(
    p_quotation_id => p_quotation_id,
    p_status => 'aceptada'
  );
$$;

create or replace function create_quotation_cost_line(
  p_quotation_id uuid,
  p_option_label text default 'Opcion 1',
  p_provider_id uuid default null,
  p_sales_accounting_concept_id uuid default null,
  p_purchase_amount numeric default null,
  p_sale_amount numeric default null,
  p_vat_rate numeric default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_line_id uuid;
  concept_row sales_accounting_concepts%rowtype;
begin
  if p_sales_accounting_concept_id is not null then
    select *
    into concept_row
    from sales_accounting_concepts
    where id = p_sales_accounting_concept_id;

    if not found then
      raise exception 'Sales accounting concept % not found', p_sales_accounting_concept_id;
    end if;
  end if;

  insert into quotation_costs (
    quotation_id,
    option_label,
    provider_id,
    sales_accounting_concept_id,
    service_name,
    cost,
    purchase_amount,
    sale_amount,
    profit_amount,
    vat_rate,
    notes
  )
  values (
    p_quotation_id,
    coalesce(nullif(btrim(coalesce(p_option_label, '')), ''), 'Opcion 1'),
    p_provider_id,
    p_sales_accounting_concept_id,
    coalesce(concept_row.concept, 'Cargo'),
    coalesce(p_purchase_amount, 0),
    p_purchase_amount,
    p_sale_amount,
    case
      when p_sale_amount is null or p_purchase_amount is null then null
      else p_sale_amount - p_purchase_amount
    end,
    coalesce(p_vat_rate, concept_row.vat_rate, 0),
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning id into new_line_id;

  perform recalculate_quotation_totals(p_quotation_id);

  return new_line_id;
end;
$$;

create or replace function update_quotation_cost_line(
  p_id uuid,
  p_option_label text default 'Opcion 1',
  p_provider_id uuid default null,
  p_sales_accounting_concept_id uuid default null,
  p_purchase_amount numeric default null,
  p_sale_amount numeric default null,
  p_vat_rate numeric default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_id_value uuid;
  concept_row sales_accounting_concepts%rowtype;
begin
  select quotation_id
  into quotation_id_value
  from quotation_costs
  where id = p_id;

  if quotation_id_value is null then
    raise exception 'Quotation cost line % not found', p_id;
  end if;

  if p_sales_accounting_concept_id is not null then
    select *
    into concept_row
    from sales_accounting_concepts
    where id = p_sales_accounting_concept_id;

    if not found then
      raise exception 'Sales accounting concept % not found', p_sales_accounting_concept_id;
    end if;
  end if;

  update quotation_costs
  set
    option_label = coalesce(nullif(btrim(coalesce(p_option_label, '')), ''), option_label),
    provider_id = p_provider_id,
    sales_accounting_concept_id = p_sales_accounting_concept_id,
    service_name = coalesce(concept_row.concept, service_name),
    cost = coalesce(p_purchase_amount, cost),
    purchase_amount = p_purchase_amount,
    sale_amount = p_sale_amount,
    profit_amount = case
      when p_sale_amount is null or p_purchase_amount is null then null
      else p_sale_amount - p_purchase_amount
    end,
    vat_rate = coalesce(p_vat_rate, concept_row.vat_rate, vat_rate),
    notes = nullif(btrim(coalesce(p_notes, '')), '')
  where id = p_id;

  perform recalculate_quotation_totals(quotation_id_value);
end;
$$;

create or replace function delete_quotation_cost_line(
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_id_value uuid;
begin
  select quotation_id
  into quotation_id_value
  from quotation_costs
  where id = p_id;

  delete from quotation_costs
  where id = p_id;

  if quotation_id_value is not null then
    perform recalculate_quotation_totals(quotation_id_value);
  end if;
end;
$$;

create or replace function create_quotation_cargo_line(
  p_quotation_id uuid,
  p_load_type text,
  p_commodities text default null,
  p_piece_count integer default null,
  p_width numeric default null,
  p_length numeric default null,
  p_height numeric default null,
  p_weight numeric default null,
  p_freight_class text default null,
  p_cbm numeric default null,
  p_volumetric_weight_kg numeric default null,
  p_sort_order integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into quotation_cargo_lines (
    quotation_id,
    load_type,
    commodities,
    piece_count,
    width,
    length,
    height,
    weight,
    freight_class,
    cbm,
    volumetric_weight_kg,
    sort_order
  )
  values (
    p_quotation_id,
    nullif(btrim(coalesce(p_load_type, '')), ''),
    nullif(btrim(coalesce(p_commodities, '')), ''),
    p_piece_count,
    p_width,
    p_length,
    p_height,
    p_weight,
    nullif(btrim(coalesce(p_freight_class, '')), ''),
    p_cbm,
    p_volumetric_weight_kg,
    coalesce(p_sort_order, 1)
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function update_quotation_cargo_line(
  p_id uuid,
  p_load_type text,
  p_commodities text default null,
  p_piece_count integer default null,
  p_width numeric default null,
  p_length numeric default null,
  p_height numeric default null,
  p_weight numeric default null,
  p_freight_class text default null,
  p_cbm numeric default null,
  p_volumetric_weight_kg numeric default null,
  p_sort_order integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update quotation_cargo_lines
  set
    load_type = nullif(btrim(coalesce(p_load_type, '')), ''),
    commodities = nullif(btrim(coalesce(p_commodities, '')), ''),
    piece_count = p_piece_count,
    width = p_width,
    length = p_length,
    height = p_height,
    weight = p_weight,
    freight_class = nullif(btrim(coalesce(p_freight_class, '')), ''),
    cbm = p_cbm,
    volumetric_weight_kg = p_volumetric_weight_kg,
    sort_order = coalesce(p_sort_order, 1)
  where id = p_id;
end;
$$;

create or replace function delete_quotation_cargo_line(
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from quotation_cargo_lines
  where id = p_id;
end;
$$;

create or replace function create_booking_from_quotation(
  p_quotation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status text;
  shipment_id uuid;
begin
  select status
  into current_status
  from quotations
  where id = p_quotation_id;

  if current_status is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  if current_status <> 'aceptada' then
    raise exception 'Quotation % must be aceptada before booking', p_quotation_id;
  end if;

  shipment_id := create_shipment(p_quotation_id);
  return shipment_id;
end;
$$;

create or replace function create_quotation_rejection_reason(
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into quotation_rejection_reasons (
    reason
  )
  values (
    nullif(btrim(coalesce(p_reason, '')), '')
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function update_quotation_rejection_reason(
  p_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update quotation_rejection_reasons
  set reason = nullif(btrim(coalesce(p_reason, '')), '')
  where id = p_id;
end;
$$;

create or replace function delete_quotation_rejection_reason(
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from quotation_rejection_reasons
  where id = p_id;
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
begin
  raise exception 'service_transport_types catalog is locked; manage canonical values through migrations only';
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
begin
  raise exception 'service_transport_types catalog is locked; manage canonical values through migrations only';
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
  raise exception 'service_transport_types catalog is locked; manage canonical values through migrations only';
end;
$$;


-- =========================================
-- 17. CREATE SALES ACCOUNTING CONCEPT
-- =========================================

create or replace function create_sales_accounting_concept(
  p_concept text,
  p_service_type text,
  p_operation_type text,
  p_vat_rate numeric,
  p_sat_code text
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_record_id uuid;
begin
  insert into sales_accounting_concepts (
    concept,
    service_type,
    operation_type,
    vat_rate,
    sat_code
  )
  values (
    nullif(btrim(p_concept), ''),
    upper(nullif(btrim(p_service_type), '')),
    upper(nullif(btrim(p_operation_type), '')),
    coalesce(p_vat_rate, 0),
    upper(nullif(btrim(p_sat_code), ''))
  )
  returning id into new_record_id;

  return new_record_id;
end;
$$;


-- =========================================
-- 18. UPDATE SALES ACCOUNTING CONCEPT
-- =========================================

create or replace function update_sales_accounting_concept(
  p_id uuid,
  p_concept text,
  p_service_type text,
  p_operation_type text,
  p_vat_rate numeric,
  p_sat_code text
)
returns void
language plpgsql
security definer
as $$
begin
  update sales_accounting_concepts
  set
    concept = nullif(btrim(p_concept), ''),
    service_type = upper(nullif(btrim(p_service_type), '')),
    operation_type = upper(nullif(btrim(p_operation_type), '')),
    vat_rate = coalesce(p_vat_rate, 0),
    sat_code = upper(nullif(btrim(p_sat_code), ''))
  where id = p_id;
end;
$$;


-- =========================================
-- 19. DELETE SALES ACCOUNTING CONCEPT
-- =========================================

create or replace function delete_sales_accounting_concept(
  p_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  delete from sales_accounting_concepts
  where id = p_id;
end;
$$;


-- =========================================
-- 20. CREATE PROVIDER
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
