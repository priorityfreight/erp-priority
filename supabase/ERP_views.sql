-- =========================================
-- ERP ANALYTICS VIEWS
-- =========================================


-- =========================================
-- CLIENT OVERVIEW
-- =========================================

create or replace view client_overview_view as
with opportunity_stats as (
  select
    o.client_id,
    count(*) as total_opportunities,
    coalesce(
      sum(
        case
          when (
            case
              when o.expiration_date is not null
                and o.expiration_date < current_date
                and o.status not in ('aceptado', 'rechazada', 'vencida')
                then 'vencida'
              else o.status
            end
          ) not in ('aceptado', 'rechazada', 'vencida')
            then o.estimated_value
          else 0
        end
      ),
      0
    ) as pipeline_value
  from opportunities o
  group by o.client_id
),
quotation_stats as (
  select
    q.client_id,
    count(*) as total_quotations
  from quotations q
  group by q.client_id
),
shipment_stats as (
  select
    s.client_id,
    count(*) as total_shipments
  from shipments s
  group by s.client_id
)
select
  c.id,
  c.company_name as client_name,
  c.website,
  c.corporate_phone,
  c.country,
  c.city,
  c.status,
  c.account_owner_id,
  concat_ws(' ', u.first_name, u.last_name) as account_owner_name,
  c.created_at,
  coalesce(os.total_opportunities, 0) as total_opportunities,
  coalesce(qs.total_quotations, 0) as total_quotations,
  coalesce(ss.total_shipments, 0) as total_shipments,
  coalesce(os.pipeline_value, 0) as pipeline_value
from clients c
left join users u on u.id = c.account_owner_id
left join opportunity_stats os on os.client_id = c.id
left join quotation_stats qs on qs.client_id = c.id
left join shipment_stats ss on ss.client_id = c.id
where c.is_deleted = false;


-- =========================================
-- SALES PIPELINE
-- =========================================

create or replace view sales_pipeline_view as
select
  stage,
  case
    when expiration_date is not null
      and expiration_date < current_date
      and status not in ('aceptado', 'rechazada', 'vencida')
      then 'vencida'
    else status
  end as status,
  count(*) as opportunities,
  coalesce(sum(estimated_value), 0) as pipeline_value
from opportunities
group by
  stage,
  case
    when expiration_date is not null
      and expiration_date < current_date
      and status not in ('aceptado', 'rechazada', 'vencida')
      then 'vencida'
    else status
  end;


-- =========================================
-- OPEN OPPORTUNITIES
-- =========================================

create or replace view open_opportunities_view as
select
  o.id,
  o.title,
  o.stage,
  case
    when o.expiration_date is not null
      and o.expiration_date < current_date
      and o.status not in ('aceptado', 'rechazada', 'vencida')
      then 'vencida'
    else o.status
  end as status,
  o.service_type,
  o.transport_type,
  o.operation_type,
  o.incoterm_id,
  i.code as incoterm_code,
  o.salesperson_id,
  concat_ws(' ', u.first_name, u.last_name) as salesperson_name,
  o.origin,
  o.origin_unlocode,
  o.destination,
  o.destination_unlocode,
  o.expected_profit_usd,
  o.service_quantity,
  o.estimated_value,
  o.start_date,
  o.expiration_date,
  o.created_at,
  c.id as client_id,
  c.company_name as client_name,
  o.origin_unlocode_id,
  o.destination_unlocode_id
from opportunities o
join clients c on c.id = o.client_id
left join users u on u.id = o.salesperson_id
left join incoterms i on i.id = o.incoterm_id
where c.is_deleted = false;


-- =========================================
-- UN/LOCODE COUNTRY SUMMARY
-- =========================================

create or replace view unlocode_country_summary_view as
select
  country_code,
  max(country_name) as country_name,
  count(*) as row_count
from unlocodes
group by country_code
order by country_code asc;


-- =========================================
-- QUOTATION SUMMARY
-- =========================================

create or replace view quotation_summary_view as
select
  q.id,
  q.reference_number,
  q.status,
  q.service_type,
  q.origin,
  q.destination,
  q.currency,
  q.estimated_cost,
  q.estimated_price,
  q.expected_profit,
  q.created_at,
  c.id as client_id,
  c.company_name as client_name,
  o.id as opportunity_id,
  o.title as opportunity_title
from quotations q
join clients c on c.id = q.client_id
join opportunities o on o.id = q.opportunity_id
where c.is_deleted = false;


-- =========================================
-- ACTIVE SHIPMENTS
-- =========================================

create or replace view active_shipments_view as
select
  s.id,
  s.shipment_reference,
  s.status,
  s.origin,
  s.destination,
  s.booking_number,
  s.departure_date,
  s.arrival_date,
  s.created_at,
  c.id as client_id,
  c.company_name as client_name,
  q.reference_number as quotation_reference
from shipments s
join clients c on c.id = s.client_id
join quotations q on q.id = s.quotation_id
where s.status not in ('delivered', 'cancelled')
  and c.is_deleted = false;


-- =========================================
-- DELIVERED SHIPMENTS
-- =========================================

create or replace view delivered_shipments_view as
select
  s.id,
  s.shipment_reference,
  s.status,
  s.origin,
  s.destination,
  s.departure_date,
  s.arrival_date,
  s.delivered_at,
  s.created_at,
  c.id as client_id,
  c.company_name as client_name,
  q.reference_number as quotation_reference
from shipments s
join clients c on c.id = s.client_id
join quotations q on q.id = s.quotation_id
where s.status = 'delivered'
  and c.is_deleted = false;


-- =========================================
-- CLIENT REVENUE
-- =========================================

create or replace view client_revenue_view as
with shipment_stats as (
  select
    s.client_id,
    count(*) as total_shipments
  from shipments s
  group by s.client_id
),
invoice_stats as (
  select
    ci.client_id,
    count(*) as total_invoices,
    coalesce(sum(ci.total_amount), 0) as billed_amount
  from client_invoices ci
  group by ci.client_id
),
quotation_profit as (
  select
    q.client_id,
    coalesce(sum(q.expected_profit), 0) as expected_profit
  from quotations q
  group by q.client_id
)
select
  c.id as client_id,
  c.company_name as client_name,
  coalesce(ss.total_shipments, 0) as total_shipments,
  coalesce(is2.total_invoices, 0) as total_invoices,
  coalesce(is2.billed_amount, 0) as billed_amount,
  coalesce(qp.expected_profit, 0) as expected_profit
from clients c
left join shipment_stats ss on ss.client_id = c.id
left join invoice_stats is2 on is2.client_id = c.id
left join quotation_profit qp on qp.client_id = c.id
where c.is_deleted = false;


-- =========================================
-- MONTHLY SALES
-- =========================================

create or replace view monthly_sales_view as
select
  date_trunc('month', created_at) as month,
  count(*) as opportunities,
  coalesce(sum(estimated_value), 0) as total_value
from opportunities
group by month
order by month desc;


-- =========================================
-- SHIPMENT ACTIVITY
-- =========================================

create or replace view shipment_activity_view as
select
  status,
  count(*) as shipments
from shipments
group by status;


-- =========================================
-- CLIENT CONTACT LIST
-- =========================================

create or replace view client_contacts_view as
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


-- =========================================
-- PROVIDER OVERVIEW
-- =========================================

create or replace view provider_overview_view as
select
  p.id,
  p.name as provider_name,
  p.provider_type,
  p.city,
  p.country,
  p.status,
  p.credit_active,
  p.credit_amount,
  p.credit_days,
  count(distinct pc.id) as total_contacts,
  count(distinct pso.id) as total_service_offerings
from providers p
left join provider_contacts pc on pc.provider_id = p.id
left join provider_service_offerings pso on pso.provider_id = p.id
group by
  p.id,
  p.name,
  p.provider_type,
  p.city,
  p.country,
  p.status,
  p.credit_active,
  p.credit_amount,
  p.credit_days;


-- =========================================
-- PROVIDER CONTACT LIST
-- =========================================

create or replace view provider_contacts_view as
select
  pc.id,
  pc.provider_id,
  pc.name,
  pc.email,
  pc.phone,
  pc.linkedin_url,
  pc.position,
  pc.status,
  pc.created_at,
  pc.updated_at,
  p.name as provider_name
from provider_contacts pc
join providers p on p.id = pc.provider_id;


-- =========================================
-- PROVIDER SERVICE OFFERINGS
-- =========================================

create or replace view provider_service_offering_view as
select
  pso.id,
  pso.provider_id,
  p.name as provider_name,
  pso.service_transport_type_id,
  stt.service_type,
  stt.transport_type,
  pso.terms_and_conditions,
  pso.created_at,
  pso.updated_at
from provider_service_offerings pso
join providers p on p.id = pso.provider_id
join service_transport_types stt on stt.id = pso.service_transport_type_id;


-- =========================================
-- UN/LOCODE LOOKUP
-- =========================================

create or replace view unlocode_lookup_view as
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
  u.updated_at,
  case
    when coalesce(u.subdivision_code, '') <> '' then u.unlocode || ' - ' || u.name || ' (' || u.subdivision_code || ')'
    else u.unlocode || ' - ' || u.name
  end as display_name,
  u.search_text
from unlocodes u;


-- =========================================
-- SERVICE TRANSPORT TYPE LOOKUP
-- =========================================

create or replace view service_transport_type_lookup_view as
select
  stt.id,
  stt.service_type,
  stt.transport_type,
  stt.created_at,
  stt.updated_at
from service_transport_types stt
order by stt.service_type asc, stt.transport_type asc;


-- =========================================
-- SALES ACCOUNTING CONCEPT LOOKUP
-- =========================================

create or replace view sales_accounting_concept_lookup_view as
select
  sac.id,
  sac.concept,
  sac.service_type,
  sac.operation_type,
  sac.vat_rate,
  sac.sat_code,
  sac.created_at,
  sac.updated_at
from sales_accounting_concepts sac
order by sac.service_type asc, sac.operation_type asc, sac.concept asc;
