-- =========================================
-- ERP AUTOMATION LAYER
-- =========================================


-- =========================================
-- 1. AUTO TIMESTAMPS
-- =========================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_branches_updated_at
before update on branches
for each row
execute function set_updated_at();

create trigger set_roles_updated_at
before update on roles
for each row
execute function set_updated_at();

create trigger set_users_updated_at
before update on users
for each row
execute function set_updated_at();

create trigger set_external_data_sources_updated_at
before update on external_data_sources
for each row
execute function set_updated_at();

create trigger set_unlocodes_updated_at
before update on unlocodes
for each row
execute function set_updated_at();

create trigger set_service_transport_types_updated_at
before update on service_transport_types
for each row
execute function set_updated_at();

create trigger set_sales_accounting_concepts_updated_at
before update on sales_accounting_concepts
for each row
execute function set_updated_at();

create trigger set_prospects_updated_at
before update on prospects
for each row
execute function set_updated_at();

create trigger set_clients_updated_at
before update on clients
for each row
execute function set_updated_at();

create trigger set_contacts_updated_at
before update on contacts
for each row
execute function set_updated_at();

create trigger set_client_logistics_parties_updated_at
before update on client_logistics_parties
for each row
execute function set_updated_at();

create trigger set_providers_updated_at
before update on providers
for each row
execute function set_updated_at();

create trigger set_provider_contacts_updated_at
before update on provider_contacts
for each row
execute function set_updated_at();

create trigger set_provider_service_offerings_updated_at
before update on provider_service_offerings
for each row
execute function set_updated_at();

create trigger set_incoterms_updated_at
before update on incoterms
for each row
execute function set_updated_at();

create trigger set_opportunities_updated_at
before update on opportunities
for each row
execute function set_updated_at();

create trigger set_quotations_updated_at
before update on quotations
for each row
execute function set_updated_at();

create trigger set_shipments_updated_at
before update on shipments
for each row
execute function set_updated_at();

create trigger set_client_invoices_updated_at
before update on client_invoices
for each row
execute function set_updated_at();

create trigger set_provider_invoices_updated_at
before update on provider_invoices
for each row
execute function set_updated_at();


-- =========================================
-- 1.0 AUTH USER SYNC
-- =========================================

create or replace function sync_public_user_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.email is null then
    return new;
  end if;

  update public.users
  set
    auth_user_id = new.id,
    email = lower(new.email),
    updated_at = now()
  where lower(email) = lower(new.email)
    and (auth_user_id is null or auth_user_id = new.id);

  if not found then
    insert into public.users (
      auth_user_id,
      email,
      active
    )
    values (
      new.id,
      lower(new.email),
      false
    )
    on conflict (auth_user_id)
    do update set
      email = excluded.email,
      updated_at = now();
  end if;

  return new;
end;
$$;

create trigger sync_public_user_from_auth_trigger
after insert or update of email on auth.users
for each row
execute function sync_public_user_from_auth();


-- =========================================
-- 1.1 UN/LOCODE SEARCH TEXT
-- =========================================

create or replace function set_unlocode_search_text()
returns trigger
language plpgsql
as $$
begin
  new.search_text := lower(
    regexp_replace(
      concat_ws(
        ' ',
        new.unlocode,
        new.country_code,
        new.location_code,
        new.country_name,
        new.name,
        coalesce(new.name_without_diacritics, ''),
        coalesce(new.subdivision_code, ''),
        coalesce(new.iata_code, '')
      ),
      '\s+',
      ' ',
      'g'
    )
  );

  return new;
end;
$$;

create trigger set_unlocodes_search_text
before insert or update on unlocodes
for each row
execute function set_unlocode_search_text();


-- =========================================
-- 1.2 CLIENT SEARCH TEXT
-- =========================================

create or replace function set_client_search_text()
returns trigger
language plpgsql
as $$
begin
  new.search_text := lower(
    regexp_replace(
      concat_ws(
        ' ',
        new.company_name,
        coalesce(new.tax_id, ''),
        coalesce(new.website, ''),
        coalesce(new.corporate_phone, ''),
        coalesce(new.country, ''),
        coalesce(new.city, ''),
        coalesce(new.city_unlocode, '')
      ),
      '\s+',
      ' ',
      'g'
    )
  );

  return new;
end;
$$;

-- =========================================
-- 1.3 CLIENT LOCATION FIELDS
-- =========================================

create or replace function apply_client_location_fields()
returns trigger
language plpgsql
as $$
declare
  resolved record;
begin
  if nullif(btrim(coalesce(new.city_unlocode, '')), '') is null and new.city_unlocode_id is null then
    new.city_unlocode := null;
    new.city_unlocode_id := null;
    new.city := null;
    new.country := null;
    return new;
  end if;

  if nullif(btrim(coalesce(new.city_unlocode, '')), '') is not null then
    new.city_unlocode := upper(btrim(new.city_unlocode));
  else
    new.city_unlocode := null;
  end if;

  select *
  into resolved
  from resolve_unlocode_reference(new.city_unlocode, new.city_unlocode_id);

  if resolved is null then
    new.city_unlocode_id := null;
    return new;
  end if;

  new.city_unlocode_id := resolved.resolved_id;
  new.city_unlocode := resolved.resolved_unlocode;
  new.city := resolved.resolved_city;
  new.country := resolved.resolved_country;

  return new;
end;
$$;

drop trigger if exists set_client_location_fields on clients;

create trigger set_client_location_fields
before insert or update on clients
for each row
execute function apply_client_location_fields();

create trigger set_clients_search_text
before insert or update on clients
for each row
execute function set_client_search_text();


-- =========================================
-- 1.4 CLIENT LOGISTICS PARTY LOCATION FIELDS
-- =========================================

create or replace function apply_client_logistics_party_location_fields()
returns trigger
language plpgsql
as $$
declare
  resolved record;
begin
  if nullif(btrim(coalesce(new.city_unlocode, '')), '') is null and new.city_unlocode_id is null then
    new.city_unlocode := null;
    new.city_unlocode_id := null;
    new.city := null;
    new.country := null;
    return new;
  end if;

  if nullif(btrim(coalesce(new.city_unlocode, '')), '') is not null then
    new.city_unlocode := upper(btrim(new.city_unlocode));
  else
    new.city_unlocode := null;
  end if;

  select *
  into resolved
  from resolve_unlocode_reference(new.city_unlocode, new.city_unlocode_id);

  if resolved is null then
    new.city_unlocode_id := null;
    return new;
  end if;

  new.city_unlocode_id := resolved.resolved_id;
  new.city_unlocode := resolved.resolved_unlocode;
  new.city := resolved.resolved_city;
  new.country := resolved.resolved_country;

  return new;
end;
$$;

drop trigger if exists set_client_logistics_party_location_fields on client_logistics_parties;

create trigger set_client_logistics_party_location_fields
before insert or update on client_logistics_parties
for each row
execute function apply_client_logistics_party_location_fields();


-- =========================================
-- 1.6 OPPORTUNITY COMPUTED FIELDS
-- =========================================

create or replace function apply_opportunity_computed_fields()
returns trigger
language plpgsql
as $$
declare
  origin_reference record;
  destination_reference record;
  expired_before_update boolean;
begin
  expired_before_update := false;

  if tg_op = 'UPDATE' then
    expired_before_update := old.expiration_date is not null
      and old.expiration_date < current_date
      and old.status not in ('aceptado', 'rechazada', 'vencida');
  end if;

  if new.start_date is null then
    new.start_date := coalesce(new.created_at::date, current_date);
  end if;

  if expired_before_update
    and coalesce(new.status, '') <> 'vencida'
    and new.status is distinct from old.status then
    new.start_date := current_date;
  end if;

  new.expiration_date := calculate_opportunity_expiration_date(new.start_date);

  if nullif(btrim(coalesce(new.origin_unlocode, '')), '') is not null then
    new.origin_unlocode := upper(btrim(new.origin_unlocode));
  else
    new.origin_unlocode := null;
  end if;

  if nullif(btrim(coalesce(new.destination_unlocode, '')), '') is not null then
    new.destination_unlocode := upper(btrim(new.destination_unlocode));
  else
    new.destination_unlocode := null;
  end if;

  if new.origin_unlocode is null and new.origin_unlocode_id is null then
    new.origin := null;
  else
    select *
    into origin_reference
    from resolve_unlocode_reference(new.origin_unlocode, new.origin_unlocode_id);

    if origin_reference is not null then
      new.origin_unlocode_id := origin_reference.resolved_id;
      new.origin_unlocode := origin_reference.resolved_unlocode;
      new.origin := origin_reference.resolved_city;
    end if;
  end if;

  if new.destination_unlocode is null and new.destination_unlocode_id is null then
    new.destination := null;
  else
    select *
    into destination_reference
    from resolve_unlocode_reference(new.destination_unlocode, new.destination_unlocode_id);

    if destination_reference is not null then
      new.destination_unlocode_id := destination_reference.resolved_id;
      new.destination_unlocode := destination_reference.resolved_unlocode;
      new.destination := destination_reference.resolved_city;
    end if;
  end if;

  new.trade_lane := case
    when nullif(btrim(coalesce(new.origin, '')), '') is not null
      and nullif(btrim(coalesce(new.destination, '')), '') is not null
      then btrim(new.origin) || ' -> ' || btrim(new.destination)
    else null
  end;

  new.estimated_value := case
    when new.expected_profit_usd is not null and new.service_quantity is not null
      then new.expected_profit_usd * new.service_quantity
    else new.estimated_value
  end;

  new.title := coalesce(
    nullif(
      build_opportunity_title(
        new.client_id,
        new.service_type,
        new.transport_type,
        new.origin,
        new.destination
      ),
      ''
    ),
    coalesce(nullif(btrim(new.title), ''), 'Opportunity')
  );

  return new;
end;
$$;

create trigger set_opportunity_computed_fields
before insert or update on opportunities
for each row
execute function apply_opportunity_computed_fields();


-- =========================================
-- 1.7 PROVIDER COMPUTED FIELDS
-- =========================================

create or replace function apply_provider_location_fields()
returns trigger
language plpgsql
as $$
declare
  resolved record;
begin
  if nullif(btrim(coalesce(new.city_unlocode, '')), '') is null and new.city_unlocode_id is null then
    new.city_unlocode := null;
    new.city_unlocode_id := null;
    new.city := null;
    new.country := null;
    return new;
  end if;

  if nullif(btrim(coalesce(new.city_unlocode, '')), '') is not null then
    new.city_unlocode := upper(btrim(new.city_unlocode));
  else
    new.city_unlocode := null;
  end if;

  select *
  into resolved
  from resolve_unlocode_reference(new.city_unlocode, new.city_unlocode_id);

  if resolved is null then
    new.city_unlocode_id := null;
    return new;
  end if;

  new.city_unlocode_id := resolved.resolved_id;
  new.city_unlocode := resolved.resolved_unlocode;
  new.city := resolved.resolved_city;
  new.country := resolved.resolved_country;

  return new;
end;
$$;

drop trigger if exists set_provider_location_fields on providers;

create trigger set_provider_location_fields
before insert or update on providers
for each row
execute function apply_provider_location_fields();

create trigger set_commissions_updated_at
before update on commissions
for each row
execute function set_updated_at();


-- =========================================
-- 2. REFERENCE GENERATORS
-- =========================================

create or replace function generate_reference(prefix text)
returns text
language plpgsql
as $$
begin
  return prefix || '-' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 6);
end;
$$;

create or replace function set_quotation_reference()
returns trigger
language plpgsql
as $$
begin
  if new.reference_number is null then
    new.reference_number := generate_reference('QT');
  end if;

  return new;
end;
$$;

create trigger quotation_reference_trigger
before insert on quotations
for each row
execute function set_quotation_reference();

create or replace function set_shipment_reference()
returns trigger
language plpgsql
as $$
begin
  if new.shipment_reference is null then
    new.shipment_reference := generate_reference('SHP');
  end if;

  return new;
end;
$$;

create trigger shipment_reference_trigger
before insert on shipments
for each row
execute function set_shipment_reference();


-- =========================================
-- 3. QUOTATION APPROVAL AUTOMATION
-- =========================================

create or replace function create_shipment_from_quotation()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'approved' and coalesce(old.status, '') <> 'approved' then
    begin
      perform create_shipment(new.id);

      insert into automation_logs (event, action, status)
      values ('quotation_approved', 'create_shipment', 'success');
    exception
      when others then
        insert into automation_logs (event, action, status, error_message)
        values ('quotation_approved', 'create_shipment', 'failed', sqlerrm);
    end;
  end if;

  return new;
end;
$$;

create trigger quotation_approved_trigger
after update on quotations
for each row
execute function create_shipment_from_quotation();


-- =========================================
-- 4. SOFT DELETE PROTECTION
-- =========================================

create or replace function prevent_hard_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Hard delete not allowed. Use the soft_delete_client() function.';
  return old;
end;
$$;

create trigger prevent_clients_delete
before delete on clients
for each row
execute function prevent_hard_delete();


-- =========================================
-- 5. AUDIT TRAIL
-- =========================================

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

create trigger audit_clients
after insert or update or delete on clients
for each row
execute function audit_trigger();

create trigger audit_client_logistics_parties
after insert or update or delete on client_logistics_parties
for each row
execute function audit_trigger();

create trigger audit_providers
after insert or update or delete on providers
for each row
execute function audit_trigger();

create trigger audit_provider_contacts
after insert or update or delete on provider_contacts
for each row
execute function audit_trigger();

create trigger audit_provider_service_offerings
after insert or update or delete on provider_service_offerings
for each row
execute function audit_trigger();

create trigger audit_sales_accounting_concepts
after insert or update or delete on sales_accounting_concepts
for each row
execute function audit_trigger();

create trigger audit_opportunities
after insert or update or delete on opportunities
for each row
execute function audit_trigger();

create trigger audit_quotations
after insert or update or delete on quotations
for each row
execute function audit_trigger();

create trigger audit_shipments
after insert or update or delete on shipments
for each row
execute function audit_trigger();

create trigger audit_client_invoices
after insert or update or delete on client_invoices
for each row
execute function audit_trigger();

create trigger audit_provider_invoices
after insert or update or delete on provider_invoices
for each row
execute function audit_trigger();
