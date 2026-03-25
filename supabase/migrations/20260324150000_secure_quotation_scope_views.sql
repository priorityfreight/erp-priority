create or replace view public.quotation_summary_view as
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
    from public.quotation_costs qc
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
from public.quotations q
join public.clients c on c.id = q.client_id
join public.opportunities o on o.id = q.opportunity_id
left join public.incoterms i on i.id = q.incoterm_id
left join public.users pu on pu.id = q.pricing_owner_id
left join public.users cu on cu.id = q.created_by
left join public.users su on su.id = o.salesperson_id
left join public.quotation_rejection_reasons rr on rr.id = q.rejection_reason_id
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

create or replace view public.quotation_cost_line_secure_view as
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
from public.quotation_costs qc
join public.quotations q on q.id = qc.quotation_id
left join public.providers p on p.id = qc.provider_id
left join public.sales_accounting_concepts sac on sac.id = qc.sales_accounting_concept_id
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

create or replace view public.crm_quotations_view as
select *
from public.quotation_summary_view
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

create or replace view public.pricing_quotations_view as
select *
from public.quotation_summary_view
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
