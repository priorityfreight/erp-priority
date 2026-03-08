-- =========================================
-- ERP ANALYTICS VIEWS
-- =========================================
-- Reporting layer for the ERP system
-- =========================================



-- =========================================
-- CLIENT OVERVIEW
-- =========================================

create or replace view client_overview_view as
select
  c.id,
  c.name,
  c.email,
  c.created_at,

  count(distinct o.id) as total_opportunities,
  count(distinct s.id) as total_shipments,

  coalesce(sum(o.value),0) as opportunity_value

from clients c

left join opportunities o
on o.client_id = c.id

left join shipments s
on s.client_id = c.id

where c.is_deleted = false

group by
  c.id,
  c.name,
  c.email,
  c.created_at;



-- =========================================
-- SALES PIPELINE
-- =========================================

create or replace view sales_pipeline_view as
select
  status,
  count(*) as opportunities,
  coalesce(sum(value),0) as pipeline_value
from opportunities
group by status;



-- =========================================
-- OPEN OPPORTUNITIES
-- =========================================

create or replace view open_opportunities_view as
select
  o.id,
  o.title,
  o.value,
  o.status,
  o.created_at,

  c.id as client_id,
  c.name as client_name

from opportunities o

join clients c
on c.id = o.client_id

where o.status = 'open';



-- =========================================
-- QUOTATION SUMMARY
-- =========================================

create or replace view quotation_summary_view as
select
  q.id,
  q.status,
  q.created_at,

  c.name as client_name,

  o.title as opportunity_title,
  o.value as opportunity_value

from quotations q

left join opportunities o
on o.id = q.opportunity_id

left join clients c
on c.id = q.client_id;



-- =========================================
-- ACTIVE SHIPMENTS
-- =========================================

create or replace view active_shipments_view as
select
  s.id,
  s.origin,
  s.destination,
  s.status,
  s.created_at,

  c.name as client_name

from shipments s

join clients c
on c.id = s.client_id

where s.status != 'delivered';



-- =========================================
-- DELIVERED SHIPMENTS
-- =========================================

create or replace view delivered_shipments_view as
select
  s.id,
  s.origin,
  s.destination,
  s.status,
  s.created_at,

  c.name as client_name

from shipments s

join clients c
on c.id = s.client_id

where s.status = 'delivered';



-- =========================================
-- CLIENT REVENUE
-- =========================================

create or replace view client_revenue_view as
select
  c.id as client_id,
  c.name as client_name,

  count(s.id) as shipments,
  count(o.id) as opportunities,

  coalesce(sum(o.value),0) as total_pipeline

from clients c

left join shipments s
on s.client_id = c.id

left join opportunities o
on o.client_id = c.id

where c.is_deleted = false

group by
  c.id,
  c.name;



-- =========================================
-- MONTHLY SALES
-- =========================================

create or replace view monthly_sales_view as
select
  date_trunc('month', created_at) as month,
  count(*) as opportunities,
  coalesce(sum(value),0) as total_value
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
  ct.name,
  ct.email,
  ct.phone,

  c.id as client_id,
  c.name as client_name

from contacts ct

join clients c
on c.id = ct.client_id;