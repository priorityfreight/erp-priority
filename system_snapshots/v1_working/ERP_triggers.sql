-- =========================================
-- ERP AUTOMATION LAYER
-- =========================================
-- This file defines triggers and functions
-- that automate ERP workflows.
-- =========================================



-- =========================================
-- 1. AUTO TIMESTAMPS
-- =========================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;


-- apply to tables

create trigger set_clients_updated_at
before update on clients
for each row
execute function set_updated_at();

create trigger set_contacts_updated_at
before update on contacts
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



-- =========================================
-- 2. AUTO REFERENCE GENERATOR
-- =========================================

create or replace function generate_reference(prefix text)
returns text as $$
declare
  ref text;
begin
  ref := prefix || '-' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text),1,6);
  return ref;
end;
$$ language plpgsql;



-- =========================================
-- 3. AUTO QUOTATION NUMBER
-- =========================================

create or replace function set_quotation_reference()
returns trigger as $$
begin

  if new.reference_number is null then
    new.reference_number := generate_reference('QT');
  end if;

  return new;

end;
$$ language plpgsql;


create trigger quotation_reference_trigger
before insert on quotations
for each row
execute function set_quotation_reference();



-- =========================================
-- 4. AUTO SHIPMENT NUMBER
-- =========================================

create or replace function set_shipment_reference()
returns trigger as $$
begin

  if new.reference_number is null then
    new.reference_number := generate_reference('SHP');
  end if;

  return new;

end;
$$ language plpgsql;


create trigger shipment_reference_trigger
before insert on shipments
for each row
execute function set_shipment_reference();



-- =========================================
-- 5. QUOTATION APPROVAL WORKFLOW
-- =========================================
-- When quotation is approved
-- create shipment automatically

create or replace function create_shipment_from_quotation()
returns trigger as $$
begin

  if new.status = 'approved' and old.status <> 'approved' then

    insert into shipments (
      quotation_id,
      client_id,
      status,
      created_at
    )
    values (
      new.id,
      new.client_id,
      'pending',
      now()
    );

  end if;

  return new;

end;
$$ language plpgsql;


create trigger quotation_approved_trigger
after update on quotations
for each row
execute function create_shipment_from_quotation();



-- =========================================
-- 6. SOFT DELETE PROTECTION
-- =========================================

create or replace function prevent_hard_delete()
returns trigger as $$
begin

  raise exception 'Hard delete not allowed. Use is_deleted flag.';

  return old;

end;
$$ language plpgsql;


-- apply to main tables

create trigger prevent_clients_delete
before delete on clients
for each row
execute function prevent_hard_delete();

create trigger prevent_contacts_delete
before delete on contacts
for each row
execute function prevent_hard_delete();

create trigger prevent_opportunities_delete
before delete on opportunities
for each row
execute function prevent_hard_delete();

create trigger prevent_shipments_delete
before delete on shipments
for each row
execute function prevent_hard_delete();



-- =========================================
-- 7. AUDIT TRAIL
-- =========================================

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text,
  record_id uuid,
  action text,
  changed_at timestamp default now(),
  user_id uuid
);


create or replace function audit_trigger()
returns trigger as $$
begin

  insert into audit_logs (
    table_name,
    record_id,
    action,
    user_id
  )
  values (
    tg_table_name,
    new.id,
    tg_op,
    auth.uid()
  );

  return new;

end;
$$ language plpgsql;



create trigger audit_clients
after insert or update
on clients
for each row
execute function audit_trigger();

create trigger audit_shipments
after insert or update
on shipments
for each row
execute function audit_trigger();