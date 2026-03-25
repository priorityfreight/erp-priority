import { supabase } from "@/lib/supabaseClient"
import type {
  NewQuotation,
  NewQuotationCargoLine,
  NewQuotationChargeLine,
  Quotation,
  QuotationCargoLine,
  QuotationChargeLine,
  QuotationSummary,
  QuotationStatus,
  Shipment,
  UpdateQuotation,
  UpdateQuotationCargoLine,
  UpdateQuotationChargeLine,
} from "./models"

type QuotationScope = "crm" | "pricing"

export type QuotationListResult = {
  items: QuotationSummary[]
  totalCount: number
}

function mapQuotation(row: Record<string, unknown>): Quotation {
  return {
    id: String(row.id),
    client_id: String(row.client_id),
    opportunity_id: String(row.opportunity_id),
    created_by: (row.created_by as string | null | undefined) ?? null,
    pricing_owner_id: (row.pricing_owner_id as string | null | undefined) ?? null,
    reference_number: (row.reference_number as string | null | undefined) ?? null,
    status: ((row.status as string | null | undefined) ?? "borrador") as QuotationStatus,
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
    commodities: (row.commodities as string | null | undefined) ?? null,
    quantity: (row.quantity as number | null | undefined) ?? null,
    weight: (row.weight as number | null | undefined) ?? null,
    volume: (row.volume as number | null | undefined) ?? null,
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

function mapQuotationSummary(row: Record<string, unknown>): QuotationSummary {
  return {
    ...mapQuotation(row),
    client_name: (row.client_name as string | null | undefined) ?? null,
    opportunity_title: (row.opportunity_title as string | null | undefined) ?? null,
    salesperson_id: (row.salesperson_id as string | null | undefined) ?? null,
    salesperson_name: (row.salesperson_name as string | null | undefined) ?? null,
    pricing_owner_name: (row.pricing_owner_name as string | null | undefined) ?? null,
    created_by_name: (row.created_by_name as string | null | undefined) ?? null,
  }
}

function mapQuotationChargeLine(row: Record<string, unknown>): QuotationChargeLine {
  return {
    id: String(row.id),
    quotation_id: String(row.quotation_id),
    option_label: String(row.option_label ?? "Opcion 1"),
    provider_id: (row.provider_id as string | null | undefined) ?? null,
    provider_name: (row.provider_name as string | null | undefined) ?? null,
    sales_accounting_concept_id:
      (row.sales_accounting_concept_id as string | null | undefined) ?? null,
    accounting_concept: (row.accounting_concept as string | null | undefined) ?? null,
    service_name: String(row.service_name ?? ""),
    cost: (row.cost as number | null | undefined) ?? null,
    purchase_amount: (row.purchase_amount as number | null | undefined) ?? null,
    sale_amount: (row.sale_amount as number | null | undefined) ?? null,
    profit_amount: (row.profit_amount as number | null | undefined) ?? null,
    can_view_cost: Boolean(row.can_view_cost),
    can_edit_purchase_amount: Boolean(row.can_edit_purchase_amount),
    can_view_sale_price: Boolean(row.can_view_sale_price),
    can_edit_sale_price: Boolean(row.can_edit_sale_price),
    can_view_expected_profit: Boolean(row.can_view_expected_profit),
    vat_rate: Number(row.vat_rate ?? 0),
    currency: String(row.currency ?? "USD"),
    notes: (row.notes as string | null | undefined) ?? null,
    created_at: String(row.created_at ?? new Date(0).toISOString()),
  }
}

function mapQuotationCargoLine(row: Record<string, unknown>): QuotationCargoLine {
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

function mapShipment(row: Record<string, unknown>): Shipment {
  return {
    id: String(row.id),
    quotation_id: String(row.quotation_id),
    client_id: String(row.client_id),
    shipment_reference: (row.shipment_reference as string | null | undefined) ?? null,
    status: String(row.status ?? ""),
    origin: (row.origin as string | null | undefined) ?? null,
    destination: (row.destination as string | null | undefined) ?? null,
    booking_number: (row.booking_number as string | null | undefined) ?? null,
    departure_date: (row.departure_date as string | null | undefined) ?? null,
    arrival_date: (row.arrival_date as string | null | undefined) ?? null,
    delivered_at: (row.delivered_at as string | null | undefined) ?? null,
    created_at: String(row.created_at ?? new Date(0).toISOString()),
    updated_at: (row.updated_at as string | null | undefined) ?? null,
  }
}

export async function getQuotations(params?: {
  scope?: QuotationScope
  query?: string
  status?: string
  page?: number
  pageSize?: number
}): Promise<QuotationListResult> {
  const page = Math.max(params?.page ?? 1, 1)
  const pageSize = Math.max(params?.pageSize ?? 25, 1)
  const { data, error } = await supabase.rpc("search_quotations", {
    p_scope: params?.scope ?? "crm",
    p_query: params?.query?.trim() || null,
    p_status:
      params?.status?.trim() && params.status !== "all" ? params.status.trim() : null,
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  } as never)

  if (error) {
    throw error
  }

  const rows = (data ?? []) as Record<string, unknown>[]

  return {
    items: rows.map((row) => mapQuotationSummary(row)),
    totalCount: rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0,
  }
}

export async function getQuotationById(id: string): Promise<QuotationSummary | null> {
  const { data, error } = await supabase
    .from("quotation_summary_view")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  return mapQuotationSummary(data as Record<string, unknown>)
}

export async function getQuotationChargeLines(quotationId: string): Promise<QuotationChargeLine[]> {
  const { data, error } = await supabase
    .from("quotation_cost_line_secure_view")
    .select("*")
    .eq("quotation_id", quotationId)
    .order("created_at", { ascending: true })

  if (error) {
    throw error
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => mapQuotationChargeLine(row))
}

export async function getQuotationCargoLines(quotationId: string): Promise<QuotationCargoLine[]> {
  const { data, error } = await supabase
    .from("quotation_cargo_lines")
    .select("*")
    .eq("quotation_id", quotationId)
    .order("sort_order", { ascending: true })

  if (error) {
    throw error
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => mapQuotationCargoLine(row))
}

export async function createQuotation(payload: NewQuotation): Promise<string> {
  const { data, error } = await supabase.rpc("create_quotation_from_opportunity", {
    p_opportunity_id: payload.opportunity_id,
    p_pickup_address: payload.pickup_address ?? null,
    p_delivery_address: payload.delivery_address ?? null,
    p_commodities: payload.commodities ?? null,
    p_required_quote_date: payload.required_quote_date ?? null,
    p_purchase_valid_until: payload.purchase_valid_until ?? null,
    p_sales_valid_until: payload.sales_valid_until ?? null,
    p_quantity: payload.quantity ?? null,
    p_weight: payload.weight ?? null,
    p_volume: payload.volume ?? null,
  } as never)

  if (error || !data) {
    throw error ?? new Error("Failed to create quotation")
  }

  return String(data)
}

export async function updateQuotation(id: string, payload: UpdateQuotation): Promise<void> {
  const { error } = await supabase
    .from("quotations")
    .update({
      pickup_address: payload.pickup_address ?? null,
      delivery_address: payload.delivery_address ?? null,
      commodities: payload.commodities ?? null,
      quantity: payload.quantity ?? null,
      weight: payload.weight ?? null,
      volume: payload.volume ?? null,
      required_quote_date: payload.required_quote_date ?? null,
      purchase_valid_until: payload.purchase_valid_until ?? null,
      sales_valid_until: payload.sales_valid_until ?? null,
      target_rate: payload.target_rate ?? null,
      rejection_reason_id: payload.rejection_reason_id ?? null,
      rejection_notes: payload.rejection_notes ?? null,
      cancellation_notes: payload.cancellation_notes ?? null,
    })
    .eq("id", id)

  if (error) {
    throw error
  }
}

export async function requestQuotationPricing(id: string): Promise<void> {
  const { error } = await supabase.rpc("request_quotation_pricing", {
    p_quotation_id: id,
  } as never)

  if (error) {
    throw error
  }
}

export async function takeQuotationForPricing(id: string): Promise<void> {
  const { error } = await supabase.rpc("take_quotation_for_pricing", {
    p_quotation_id: id,
  } as never)

  if (error) {
    throw error
  }
}

export async function updateQuotationStatus(
  id: string,
  status: QuotationStatus,
  options?: {
    rejectionReasonId?: string | null
    rejectionNotes?: string | null
    cancellationNotes?: string | null
    targetRate?: number | null
  }
): Promise<void> {
  const { error } = await supabase.rpc("update_quotation_status", {
    p_quotation_id: id,
    p_status: status,
    p_rejection_reason_id: options?.rejectionReasonId ?? null,
    p_rejection_notes: options?.rejectionNotes ?? null,
    p_cancellation_notes: options?.cancellationNotes ?? null,
    p_target_rate: options?.targetRate ?? null,
  } as never)

  if (error) {
    throw error
  }
}

export async function createQuotationChargeLine(
  payload: NewQuotationChargeLine
): Promise<string> {
  const { data, error } = await supabase.rpc("create_quotation_cost_line", {
    p_quotation_id: payload.quotation_id,
    p_option_label: payload.option_label ?? "Opcion 1",
    p_provider_id: payload.provider_id ?? null,
    p_sales_accounting_concept_id: payload.sales_accounting_concept_id ?? null,
    p_purchase_amount: payload.purchase_amount ?? null,
    p_sale_amount: payload.sale_amount ?? null,
    p_vat_rate: payload.vat_rate ?? null,
    p_notes: payload.notes ?? null,
  } as never)

  if (error || !data) {
    throw error ?? new Error("Failed to create quotation charge line")
  }

  return String(data)
}

export async function updateQuotationChargeLine(
  id: string,
  payload: UpdateQuotationChargeLine
): Promise<void> {
  const { error } = await supabase.rpc("update_quotation_cost_line", {
    p_id: id,
    p_option_label: payload.option_label ?? "Opcion 1",
    p_provider_id: payload.provider_id ?? null,
    p_sales_accounting_concept_id: payload.sales_accounting_concept_id ?? null,
    p_purchase_amount: payload.purchase_amount ?? null,
    p_sale_amount: payload.sale_amount ?? null,
    p_vat_rate: payload.vat_rate ?? null,
    p_notes: payload.notes ?? null,
  } as never)

  if (error) {
    throw error
  }
}

export async function updateQuotationOptionSalesAmounts(
  quotationId: string,
  optionLabel: string,
  salesAmounts: Record<string, string | null | undefined>
): Promise<void> {
  const payload = Object.fromEntries(
    Object.entries(salesAmounts).map(([lineId, value]) => [lineId, value ?? ""])
  )

  const { error } = await supabase.rpc("update_quotation_option_sales_amounts", {
    p_quotation_id: quotationId,
    p_option_label: optionLabel,
    p_sales_amounts: payload,
  } as never)

  if (error) {
    throw error
  }
}

export async function deleteQuotationChargeLine(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_quotation_cost_line", {
    p_id: id,
  } as never)

  if (error) {
    throw error
  }
}

export async function createQuotationCargoLine(
  payload: NewQuotationCargoLine
): Promise<string> {
  const { data, error } = await supabase.rpc("create_quotation_cargo_line", {
    p_quotation_id: payload.quotation_id,
    p_load_type: payload.load_type,
    p_commodities: payload.commodities ?? null,
    p_piece_count: payload.piece_count ?? null,
    p_width: payload.width ?? null,
    p_length: payload.length ?? null,
    p_height: payload.height ?? null,
    p_weight: payload.weight ?? null,
    p_freight_class: payload.freight_class ?? null,
    p_cbm: payload.cbm ?? null,
    p_volumetric_weight_kg: payload.volumetric_weight_kg ?? null,
    p_sort_order: payload.sort_order ?? 1,
  } as never)

  if (error || !data) {
    throw error ?? new Error("Failed to create quotation cargo line")
  }

  return String(data)
}

export async function updateQuotationCargoLine(
  id: string,
  payload: UpdateQuotationCargoLine
): Promise<void> {
  const { error } = await supabase.rpc("update_quotation_cargo_line", {
    p_id: id,
    p_load_type: payload.load_type ?? null,
    p_commodities: payload.commodities ?? null,
    p_piece_count: payload.piece_count ?? null,
    p_width: payload.width ?? null,
    p_length: payload.length ?? null,
    p_height: payload.height ?? null,
    p_weight: payload.weight ?? null,
    p_freight_class: payload.freight_class ?? null,
    p_cbm: payload.cbm ?? null,
    p_volumetric_weight_kg: payload.volumetric_weight_kg ?? null,
    p_sort_order: payload.sort_order ?? 1,
  } as never)

  if (error) {
    throw error
  }
}

export async function deleteQuotationCargoLine(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_quotation_cargo_line", {
    p_id: id,
  } as never)

  if (error) {
    throw error
  }
}

export async function createBookingFromQuotation(quotationId: string): Promise<Shipment> {
  const { data, error } = await supabase.rpc("create_booking_from_quotation", {
    p_quotation_id: quotationId,
  } as never)

  if (error || !data) {
    throw error ?? new Error("Failed to create booking")
  }

  const { data: shipment, error: shipmentError } = await supabase
    .from("shipments")
    .select("*")
    .eq("id", data)
    .single()

  if (shipmentError) {
    throw shipmentError
  }

  return mapShipment(shipment as Record<string, unknown>)
}
