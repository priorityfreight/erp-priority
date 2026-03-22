-- =========================================================
-- REMOVE LEGACY DATABASE ARTIFACTS
-- =========================================================

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'company_id'
  ) then
    update users
    set branch_id = coalesce(branch_id, company_id)
    where company_id is not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clients'
      and column_name = 'company_id'
  ) then
    update clients
    set branch_id = coalesce(branch_id, company_id)
    where company_id is not null;
  end if;
end;
$$;

alter table if exists users drop constraint if exists users_company_id_fkey;
alter table if exists clients drop constraint if exists clients_company_id_fkey;
alter table if exists opportunities drop constraint if exists opportunities_company_id_fkey;

alter table if exists users drop column if exists name;
alter table if exists users drop column if exists role;
alter table if exists users drop column if exists company_id;

alter table if exists clients drop column if exists company_id;

alter table if exists opportunities drop column if exists company_id;
alter table if exists opportunities drop column if exists cargo_type;

alter table if exists quotations drop column if exists total_price;

drop table if exists shipment_costs;
drop table if exists invoices;
drop table if exists companies;
