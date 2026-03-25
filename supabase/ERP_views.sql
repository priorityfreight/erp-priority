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
where c.is_deleted = false
  and public.erp_can_access_client_resource(
    'crm.clients.list',
    'view',
    c.id
  );


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
where c.is_deleted = false
  and public.erp_can_access_opportunity_resource(
    'crm.opportunities.list',
    'view',
    o.salesperson_id,
    o.client_id
  );


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
with permission_flags as (
  select
    public.erp_can_view_quotation_cost() as can_view_cost,
    public.erp_can_edit_quotation_purchase_amount() as can_edit_purchase_amount,
    public.erp_can_view_quotation_sale_price() as can_view_sale_price,
    public.erp_can_edit_quotation_sale_price() as can_edit_sale_price,
    public.erp_can_view_quotation_expected_profit() as can_view_expected_profit
)
select
  q.id,
  q.reference_number,
  q.status,
  q.service_type,
  q.transport_type,
  q.operation_type,
  q.origin,
  q.origin_unlocode,
  q.destination,
  q.destination_unlocode,
  q.pickup_address,
  q.delivery_address,
  q.commodities,
  q.quantity,
  q.weight,
  q.volume,
  q.required_quote_date,
  q.purchase_valid_until,
  q.sales_valid_until,
  q.target_rate,
  q.pricing_owner_id,
  concat_ws(' ', pu.first_name, pu.last_name) as pricing_owner_name,
  q.created_by,
  concat_ws(' ', cu.first_name, cu.last_name) as created_by_name,
  q.incoterm_id,
  i.code as incoterm_code,
  q.rejection_reason_id,
  rr.reason as rejection_reason,
  q.rejection_notes,
  q.cancellation_notes,
  q.currency,
  case when pf.can_view_cost then q.estimated_cost else null end as estimated_cost,
  case when pf.can_view_sale_price then q.estimated_price else null end as estimated_price,
  case when pf.can_view_expected_profit then q.expected_profit else null end as expected_profit,
  (
    select count(*)
    from quotation_costs qc
    where qc.quotation_id = q.id
  ) as total_charge_lines,
  q.created_at,
  q.updated_at,
  c.id as client_id,
  c.company_name as client_name,
  o.id as opportunity_id,
  o.title as opportunity_title,
  o.salesperson_id,
  concat_ws(' ', su.first_name, su.last_name) as salesperson_name,
  pf.can_view_cost,
  pf.can_edit_purchase_amount,
  pf.can_view_sale_price,
  pf.can_edit_sale_price,
  pf.can_view_expected_profit
from quotations q
join clients c on c.id = q.client_id
join opportunities o on o.id = q.opportunity_id
left join incoterms i on i.id = q.incoterm_id
left join users pu on pu.id = q.pricing_owner_id
left join users cu on cu.id = q.created_by
left join users su on su.id = o.salesperson_id
left join quotation_rejection_reasons rr on rr.id = q.rejection_reason_id
cross join permission_flags pf
where c.is_deleted = false
  and (
    public.erp_can_access_crm_quotation_resource(
      'crm.quotations.record',
      'view',
      q.created_by,
      q.client_id
    )
    or public.erp_can_access_pricing_quotation(
      'view',
      q.status,
      q.pricing_owner_id
    )
    or public.erp_can_access_operations_shipment(
      'view',
      q.client_id
    )
  );

create or replace view quotation_cost_line_secure_view as
with permission_flags as (
  select
    public.erp_can_view_quotation_cost() as can_view_cost,
    public.erp_can_edit_quotation_purchase_amount() as can_edit_purchase_amount,
    public.erp_can_view_quotation_sale_price() as can_view_sale_price,
    public.erp_can_edit_quotation_sale_price() as can_edit_sale_price,
    public.erp_can_view_quotation_expected_profit() as can_view_expected_profit
)
select
  qc.id,
  qc.quotation_id,
  qc.option_label,
  qc.provider_id,
  p.name as provider_name,
  qc.sales_accounting_concept_id,
  sac.concept as accounting_concept,
  qc.service_name,
  case when pf.can_view_cost then qc.cost else null end as cost,
  case when pf.can_view_cost then qc.purchase_amount else null end as purchase_amount,
  case when pf.can_view_sale_price then qc.sale_amount else null end as sale_amount,
  case when pf.can_view_expected_profit then qc.profit_amount else null end as profit_amount,
  qc.vat_rate,
  qc.currency,
  qc.notes,
  qc.created_at,
  pf.can_view_cost,
  pf.can_edit_purchase_amount,
  pf.can_view_sale_price,
  pf.can_edit_sale_price,
  pf.can_view_expected_profit
from quotation_costs qc
join quotations q on q.id = qc.quotation_id
left join providers p on p.id = qc.provider_id
left join sales_accounting_concepts sac on sac.id = qc.sales_accounting_concept_id
cross join permission_flags pf
where
  public.erp_has_resource_access(
    'pricing.quotations.cost_section',
    'view',
    q.pricing_owner_id,
    null
  )
  or public.erp_can_access_crm_quotation_resource(
    'crm.quotations.pricing_options',
    'view',
    q.created_by,
    q.client_id
  );

create or replace view crm_quotations_view as
select *
from quotation_summary_view
where public.erp_can_access_crm_quotation_resource(
  'crm.quotations.list',
  'view',
  created_by,
  client_id
)
and status in (
  'borrador',
  'pendiente',
  'cotizando',
  'lista_para_enviar',
  'enviada',
  'cancelada',
  'rechazada',
  'renegociar_tarifa',
  'aceptada'
);

create or replace view pricing_quotations_view as
select *
from quotation_summary_view
where public.erp_can_access_pricing_quotation(
  'view',
  status,
  pricing_owner_id
)
and status in (
  'pendiente',
  'cotizando',
  'lista_para_enviar',
  'renegociar_tarifa'
);

create or replace view quotation_rejection_reason_lookup_view as
select
  id,
  reason,
  created_at,
  updated_at
from quotation_rejection_reasons
order by reason asc;


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
where c.is_deleted = false
  and public.erp_can_access_client_resource(
    'crm.contacts.list',
    'view',
    ct.client_id
  );


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


-- =========================================
-- PERMISSION RESOURCE CATALOG
-- =========================================

create or replace view permission_resource_catalog_view as
select
  pm.id as module_id,
  pm.code as module_code,
  pm.name as module_name,
  pm.icon_key as module_icon_key,
  pm.sort_order as module_sort_order,
  pm.active as module_active,
  ps.id as submodule_id,
  ps.code as submodule_code,
  ps.name as submodule_name,
  ps.route_path,
  ps.route_matchers,
  ps.sort_order as submodule_sort_order,
  ps.active as submodule_active,
  pr.id as resource_id,
  pr.resource_key,
  pr.name as resource_name,
  pr.resource_type,
  pr.resource_group,
  pr.table_name,
  pr.view_name,
  pr.rpc_name,
  pr.entity_owner_field,
  pr.entity_branch_field,
  pr.sort_order as resource_sort_order,
  pr.active as resource_active,
  pr.created_at,
  pr.updated_at
from permission_resources pr
join permission_modules pm on pm.id = pr.module_id
left join permission_submodules ps on ps.id = pr.submodule_id
order by
  pm.sort_order asc,
  coalesce(ps.sort_order, 0) asc,
  pr.sort_order asc,
  pr.name asc;


-- =========================================
-- PERMISSION FIELD CATALOG
-- =========================================

create or replace view permission_field_catalog_view as
select
  pr.resource_key,
  pr.name as resource_name,
  pf.id as field_id,
  pf.resource_id,
  pf.field_key,
  pf.label,
  pf.data_type,
  pf.field_group,
  pf.sort_order,
  pf.active,
  pf.created_at,
  pf.updated_at
from permission_fields pf
join permission_resources pr on pr.id = pf.resource_id
order by
  pr.sort_order asc,
  pf.field_group asc,
  pf.sort_order asc,
  pf.label asc;


-- =========================================
-- ROLE RESOURCE PERMISSION MATRIX
-- =========================================

create or replace view role_resource_permission_matrix_view as
select
  r.id as role_id,
  r.name as role_name,
  prc.module_id,
  prc.module_code,
  prc.module_name,
  prc.module_icon_key,
  prc.module_sort_order,
  prc.submodule_id,
  prc.submodule_code,
  prc.submodule_name,
  prc.route_path,
  prc.route_matchers,
  prc.submodule_sort_order,
  prc.resource_id,
  prc.resource_key,
  prc.resource_name,
  prc.resource_type,
  prc.resource_group,
  pa.id as action_id,
  pa.code as action_code,
  pa.name as action_name,
  coalesce(rrp.allowed, false) as allowed,
  pc.id as condition_id,
  coalesce(pc.code, 'none') as condition_code,
  coalesce(pc.name, 'None') as condition_name,
  rrp.id as role_permission_id
from roles r
cross join permission_resource_catalog_view prc
cross join permission_actions pa
left join role_resource_permissions rrp
  on rrp.role_id = r.id
 and rrp.resource_id = prc.resource_id
 and rrp.action_id = pa.id
left join permission_conditions pc
  on pc.id = rrp.condition_id
where pa.active = true
  and pa.scope_type in ('resource', 'both')
  and prc.resource_active = true
order by
  r.name asc,
  prc.module_sort_order asc,
  coalesce(prc.submodule_sort_order, 0) asc,
  prc.resource_sort_order asc,
  pa.name asc;


-- =========================================
-- ROLE FIELD PERMISSION MATRIX
-- =========================================

create or replace view role_field_permission_matrix_view as
select
  r.id as role_id,
  r.name as role_name,
  pfc.resource_key,
  pfc.resource_name,
  pfc.field_id,
  pfc.field_key,
  pfc.label as field_label,
  pfc.data_type,
  pfc.field_group,
  pfc.sort_order as field_sort_order,
  pa.id as action_id,
  pa.code as action_code,
  pa.name as action_name,
  coalesce(rfp.allowed, false) as allowed,
  pc.id as condition_id,
  coalesce(pc.code, 'none') as condition_code,
  coalesce(pc.name, 'None') as condition_name,
  rfp.id as role_field_permission_id
from roles r
cross join permission_field_catalog_view pfc
cross join permission_actions pa
left join role_field_permissions rfp
  on rfp.role_id = r.id
 and rfp.field_id = pfc.field_id
 and rfp.action_id = pa.id
left join permission_conditions pc
  on pc.id = rfp.condition_id
where pa.active = true
  and pa.scope_type in ('field', 'both')
  and pfc.active = true
order by
  r.name asc,
  pfc.resource_key asc,
  pfc.field_group asc,
  pfc.sort_order asc,
  pa.name asc;
