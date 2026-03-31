import { supabase } from "@/lib/supabaseClient"
import {
  mapQuotationCargoLine,
  mapQuotationChargeLine,
  mapQuotationSummary,
} from "./mappers"
import { buildRpcPatch } from "./rpcPatch"
import type {
  NewQuotation,
  NewQuotationCargoLine,
  NewQuotationChargeLine,
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

async function readShipmentById(id: string): Promise<Shipment> {
  const { data, error } = await supabase
    .from("shipments")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    throw error
  }

  return mapShipment(data as Record<string, unknown>)
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
    .order("option_sort_order", { ascending: true })
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
    p_required_quote_date: payload.required_quote_date ?? null,
  } as never)

  if (error || !data) {
    throw error ?? new Error("Failed to create quotation")
  }

  return String(data)
}

export async function updateQuotation(id: string, payload: UpdateQuotation): Promise<void> {
  const { error } = await supabase.rpc("update_quotation_record" as never, {
    p_quotation_id: id,
    p_changes: buildRpcPatch(payload),
  } as never)

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
    p_quotation_option_id: payload.quotation_option_id ?? null,
    p_option_label: payload.option_label ?? null,
    p_provider_id: payload.provider_id ?? null,
    p_sales_accounting_concept_id: payload.sales_accounting_concept_id ?? null,
    p_purchase_amount: payload.purchase_amount ?? null,
    p_purchase_currency: payload.purchase_currency ?? "USD",
    p_purchase_valid_until: payload.option_purchase_valid_until ?? null,
    p_sale_amount: payload.sale_amount ?? null,
    p_sale_currency: payload.sale_currency ?? payload.purchase_currency ?? "USD",
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
    p_quotation_option_id: payload.quotation_option_id ?? null,
    p_option_label: payload.option_label ?? null,
    p_provider_id: payload.provider_id ?? null,
    p_sales_accounting_concept_id: payload.sales_accounting_concept_id ?? null,
    p_purchase_amount: payload.purchase_amount ?? null,
    p_purchase_currency: payload.purchase_currency ?? null,
    p_purchase_valid_until: payload.option_purchase_valid_until ?? null,
    p_sale_amount: payload.sale_amount ?? null,
    p_sale_currency: payload.sale_currency ?? null,
    p_vat_rate: payload.vat_rate ?? null,
    p_notes: payload.notes ?? null,
  } as never)

  if (error) {
    throw error
  }
}

export async function saveQuotationPurchaseOption(
  payload: {
    quotationId: string
    quotationOptionId?: string | null
    optionLabel?: string | null
    purchaseValidUntil: string | null
    lines: Array<{
      id?: string | null
      provider_id?: string | null
      sales_accounting_concept_id?: string | null
      purchase_amount?: number | null
      purchase_currency?: string | null
      vat_rate?: number | null
      notes?: string | null
    }>
  }
): Promise<string> {
  const { data, error } = await supabase.rpc("save_quotation_purchase_option" as never, {
    p_quotation_id: payload.quotationId,
    p_quotation_option_id: payload.quotationOptionId ?? null,
    p_option_label: payload.optionLabel ?? null,
    p_purchase_valid_until: payload.purchaseValidUntil ?? null,
    p_lines: payload.lines,
  } as never)

  if (error || !data) {
    throw error ?? new Error("Failed to save quotation purchase option")
  }

  return String(data)
}

export async function updateQuotationOptionSalesAmounts(
  quotationId: string,
  quotationOptionId: string,
  salesAmounts: Record<
    string,
    {
      sale_amount?: string | null
      sale_currency?: string | null
    }
  >
): Promise<void> {
  const { error } = await supabase.rpc("update_quotation_option_sales_amounts", {
    p_quotation_id: quotationId,
    p_quotation_option_id: quotationOptionId,
    p_sales_amounts: salesAmounts,
  } as never)

  if (error) {
    throw error
  }
}

export async function setQuotationOptionCustomerVisibility(
  quotationOptionId: string,
  includeInCustomerQuote: boolean
): Promise<void> {
  const { error } = await supabase.rpc("set_quotation_option_customer_visibility", {
    p_quotation_option_id: quotationOptionId,
    p_include_in_customer_quote: includeInCustomerQuote,
  } as never)

  if (error) {
    throw error
  }
}

export async function updateQuotationOptionValidity(
  quotationOptionId: string,
  payload: {
    purchase_valid_until?: string | null
    sales_valid_until?: string | null
    override_sales_valid_until?: boolean
  }
): Promise<void> {
  const { error } = await supabase.rpc("update_quotation_option_validity", {
    p_quotation_option_id: quotationOptionId,
    p_purchase_valid_until: payload.purchase_valid_until ?? null,
    p_sales_valid_until: payload.sales_valid_until ?? null,
    p_override_sales_valid_until: payload.override_sales_valid_until ?? false,
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

  return readShipmentById(String(data))
}
