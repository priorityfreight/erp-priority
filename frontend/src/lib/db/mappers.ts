import type { Contact, QuotationCargoLine, QuotationChargeLine, QuotationSummary } from "./models"

export function mapContact(row: Record<string, unknown>): Contact {
  return {
    id: String(row.id),
    client_id: String(row.client_id),
    name: String(row.name ?? ""),
    email: (row.email as string | null | undefined) ?? null,
    phone: (row.phone as string | null | undefined) ?? null,
    linkedin_url: (row.linkedin_url as string | null | undefined) ?? null,
    position: (row.position as string | null | undefined) ?? null,
    status: String(row.status ?? "activo"),
    is_primary: Boolean(row.is_primary ?? false),
    created_at: String(row.created_at ?? new Date(0).toISOString()),
    updated_at: (row.updated_at as string | null | undefined) ?? null,
  }
}

function mapQuotation(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    client_id: String(row.client_id),
    opportunity_id: String(row.opportunity_id),
    created_by: (row.created_by as string | null | undefined) ?? null,
    pricing_owner_id: (row.pricing_owner_id as string | null | undefined) ?? null,
    reference_number: (row.reference_number as string | null | undefined) ?? null,
    status: String((row.status as string | null | undefined) ?? "borrador"),
    service_type: (row.service_type as string | null | undefined) ?? null,
    transport_type: (row.transport_type as string | null | undefined) ?? null,
    operation_type: (row.operation_type as string | null | undefined) ?? null,
    incoterm_id: (row.incoterm_id as string | null | undefined) ?? null,
    incoterm_code: (row.incoterm_code as string | null | undefined) ?? null,
    origin: (row.origin as string | null | undefined) ?? null,
    origin_unlocode: (row.origin_unlocode as string | null | undefined) ?? null,
    origin_unlocode_id: (row.origin_unlocode_id as string | null | undefined) ?? null,
    destination: (row.destination as string | null | undefined) ?? null,
    destination_unlocode: (row.destination_unlocode as string | null | undefined) ?? null,
    destination_unlocode_id: (row.destination_unlocode_id as string | null | undefined) ?? null,
    pickup_address: (row.pickup_address as string | null | undefined) ?? null,
    delivery_address: (row.delivery_address as string | null | undefined) ?? null,
    required_quote_date: (row.required_quote_date as string | null | undefined) ?? null,
    purchase_valid_until: (row.purchase_valid_until as string | null | undefined) ?? null,
    sales_valid_until: (row.sales_valid_until as string | null | undefined) ?? null,
    rejection_reason_id: (row.rejection_reason_id as string | null | undefined) ?? null,
    rejection_reason: (row.rejection_reason as string | null | undefined) ?? null,
    rejection_notes: (row.rejection_notes as string | null | undefined) ?? null,
    cancellation_notes: (row.cancellation_notes as string | null | undefined) ?? null,
    target_rate: (row.target_rate as number | null | undefined) ?? null,
    currency: String(row.currency ?? "USD"),
    estimated_cost: (row.estimated_cost as number | null | undefined) ?? null,
    estimated_price: (row.estimated_price as number | null | undefined) ?? null,
    expected_profit: (row.expected_profit as number | null | undefined) ?? null,
    accepted_usd_rate_date:
      (row.accepted_usd_rate_date as string | null | undefined) ?? null,
    accepted_usd_to_mxn_rate:
      (row.accepted_usd_to_mxn_rate as number | null | undefined) ?? null,
    accepted_eur_rate_date:
      (row.accepted_eur_rate_date as string | null | undefined) ?? null,
    accepted_eur_to_mxn_rate:
      (row.accepted_eur_to_mxn_rate as number | null | undefined) ?? null,
    exchange_rates_locked_at:
      (row.exchange_rates_locked_at as string | null | undefined) ?? null,
    can_view_cost: Boolean(row.can_view_cost),
    can_edit_purchase_amount: Boolean(row.can_edit_purchase_amount),
    can_view_sale_price: Boolean(row.can_view_sale_price),
    can_edit_sale_price: Boolean(row.can_edit_sale_price),
    can_view_expected_profit: Boolean(row.can_view_expected_profit),
    total_charge_lines: (row.total_charge_lines as number | null | undefined) ?? undefined,
    created_at: String(row.created_at ?? new Date(0).toISOString()),
    updated_at: (row.updated_at as string | null | undefined) ?? null,
  }
}

export function mapQuotationSummary(row: Record<string, unknown>): QuotationSummary {
  return {
    ...mapQuotation(row),
    status: (row.status as QuotationSummary["status"] | null | undefined) ?? "borrador",
    client_name: (row.client_name as string | null | undefined) ?? null,
    opportunity_title: (row.opportunity_title as string | null | undefined) ?? null,
    salesperson_id: (row.salesperson_id as string | null | undefined) ?? null,
    salesperson_name: (row.salesperson_name as string | null | undefined) ?? null,
    pricing_owner_name: (row.pricing_owner_name as string | null | undefined) ?? null,
    created_by_name: (row.created_by_name as string | null | undefined) ?? null,
  }
}

export function mapQuotationChargeLine(row: Record<string, unknown>): QuotationChargeLine {
  return {
    id: String(row.id),
    quotation_id: String(row.quotation_id),
    quotation_option_id: (row.quotation_option_id as string | null | undefined) ?? null,
    option_label: String(row.option_label ?? row.provider_name ?? "Proveedor"),
    option_sort_order: (row.option_sort_order as number | null | undefined) ?? null,
    include_in_customer_quote:
      (row.include_in_customer_quote as boolean | null | undefined) ?? undefined,
    option_purchase_valid_until:
      (row.option_purchase_valid_until as string | null | undefined) ?? null,
    option_sales_valid_until:
      (row.option_sales_valid_until as string | null | undefined) ?? null,
    option_sales_validity_overridden:
      (row.option_sales_validity_overridden as boolean | null | undefined) ?? undefined,
    provider_id: (row.provider_id as string | null | undefined) ?? null,
    provider_name: (row.provider_name as string | null | undefined) ?? null,
    sales_accounting_concept_id:
      (row.sales_accounting_concept_id as string | null | undefined) ?? null,
    accounting_concept: (row.accounting_concept as string | null | undefined) ?? null,
    service_name: String(row.service_name ?? ""),
    cost: (row.cost as number | null | undefined) ?? null,
    purchase_amount: (row.purchase_amount as number | null | undefined) ?? null,
    purchase_currency: String(row.purchase_currency ?? "USD"),
    purchase_amount_mxn: (row.purchase_amount_mxn as number | null | undefined) ?? null,
    sale_amount: (row.sale_amount as number | null | undefined) ?? null,
    sale_currency: String(row.sale_currency ?? "USD"),
    sale_amount_mxn: (row.sale_amount_mxn as number | null | undefined) ?? null,
    profit_amount: (row.profit_amount as number | null | undefined) ?? null,
    profit_amount_mxn: (row.profit_amount_mxn as number | null | undefined) ?? null,
    can_view_cost: Boolean(row.can_view_cost),
    can_edit_purchase_amount: Boolean(row.can_edit_purchase_amount),
    can_view_sale_price: Boolean(row.can_view_sale_price),
    can_edit_sale_price: Boolean(row.can_edit_sale_price),
    can_view_expected_profit: Boolean(row.can_view_expected_profit),
    vat_rate: Number(row.vat_rate ?? 0),
    notes: (row.notes as string | null | undefined) ?? null,
    created_at: String(row.created_at ?? new Date(0).toISOString()),
  }
}

export function mapQuotationCargoLine(row: Record<string, unknown>): QuotationCargoLine {
  return {
    id: String(row.id),
    quotation_id: String(row.quotation_id),
    load_type: String(row.load_type ?? ""),
    commodities: (row.commodities as string | null | undefined) ?? null,
    piece_count: (row.piece_count as number | null | undefined) ?? null,
    width: (row.width as number | null | undefined) ?? null,
    length: (row.length as number | null | undefined) ?? null,
    height: (row.height as number | null | undefined) ?? null,
    weight: (row.weight as number | null | undefined) ?? null,
    freight_class: (row.freight_class as string | null | undefined) ?? null,
    cbm: (row.cbm as number | null | undefined) ?? null,
    volumetric_weight_kg: (row.volumetric_weight_kg as number | null | undefined) ?? null,
    sort_order: Number(row.sort_order ?? 1),
    created_at: String(row.created_at ?? new Date(0).toISOString()),
    updated_at: (row.updated_at as string | null | undefined) ?? null,
  }
}
