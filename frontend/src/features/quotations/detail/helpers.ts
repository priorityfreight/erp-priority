import type {
  Contact,
  QuotationCargoLine,
  QuotationStatus,
  QuotationSummary,
  QuotationChargeLine,
  QuotationRejectionReason,
} from "@/lib/db"
import {
  calculateCbm,
  calculateVolumetricWeightKg,
  estimateFreightClass,
  normalizeWhatsAppLink,
  toNumberOrNull,
} from "@/lib/quotations/calculations"
import type { QuotationCargoLineFormValues } from "@/components/forms/QuotationCargoLineForm"
import type { QuotationFormValues } from "@/components/forms/QuotationForm"

export const quotationStatusOptions: Array<{ value: QuotationStatus; label: string }> = [
  { value: "borrador", label: "Borrador" },
  { value: "pendiente", label: "Pendiente" },
  { value: "cotizando", label: "Cotizando" },
  { value: "lista_para_enviar", label: "Lista para enviar" },
  { value: "enviada", label: "Enviada" },
  { value: "cancelada", label: "Cancelada" },
  { value: "rechazada", label: "Rechazada" },
  { value: "renegociar_tarifa", label: "Renegociar tarifa" },
  { value: "aceptada", label: "Aceptada" },
]

function createCargoDraftId() {
  if (typeof globalThis !== "undefined" && "crypto" in globalThis && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `cargo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function createEmptyCargoForm(
  existingCargoId: string | null = null
): QuotationCargoLineFormValues {
  return {
    draftId: createCargoDraftId(),
    existingCargoId,
    loadType: "",
    commodities: "",
    pieceCount: "",
    width: "",
    length: "",
    height: "",
    weight: "",
  }
}

export function buildCargoFormFromLine(line: QuotationCargoLine): QuotationCargoLineFormValues {
  return {
    draftId: createCargoDraftId(),
    existingCargoId: line.id,
    loadType: line.load_type,
    commodities: line.commodities || "",
    pieceCount: line.piece_count != null ? String(line.piece_count) : "",
    width: line.width != null ? String(line.width) : "",
    length: line.length != null ? String(line.length) : "",
    height: line.height != null ? String(line.height) : "",
    weight: line.weight != null ? String(line.weight) : "",
  }
}

export function isCargoDraftEmpty(row: QuotationCargoLineFormValues) {
  return ![
    row.loadType,
    row.commodities,
    row.pieceCount,
    row.width,
    row.length,
    row.height,
    row.weight,
  ].some((value) => value.trim())
}

export function buildCargoPayload(row: QuotationCargoLineFormValues) {
  const pieceCount = toNumberOrNull(row.pieceCount)
  const width = toNumberOrNull(row.width)
  const length = toNumberOrNull(row.length)
  const height = toNumberOrNull(row.height)
  const weight = toNumberOrNull(row.weight)
  const cbm = calculateCbm({
    pieceCount,
    widthCm: width,
    lengthCm: length,
    heightCm: height,
  })
  const volumetricWeightKg = calculateVolumetricWeightKg({
    pieceCount,
    widthCm: width,
    lengthCm: length,
    heightCm: height,
  })
  const estimatedClass = estimateFreightClass({
    pieceCount,
    widthCm: width,
    lengthCm: length,
    heightCm: height,
    weightKg: weight,
  })

  return {
    load_type: row.loadType.trim(),
    commodities: row.commodities.trim() || null,
    piece_count: pieceCount,
    width,
    length,
    height,
    weight,
    freight_class: estimatedClass || null,
    cbm,
    volumetric_weight_kg: volumetricWeightKg,
  }
}

export function nextCargoSortOrder(cargoLines: QuotationCargoLine[]) {
  return cargoLines.reduce((maxValue, line) => Math.max(maxValue, line.sort_order || 0), 0) + 1
}

export function formatCurrency(value: number | null | undefined, currency = "MXN") {
  if (value == null) {
    return "No disponible"
  }

  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function buildQuotationFormValues(quotation: QuotationSummary): QuotationFormValues {
  return {
    pickupAddress: quotation.pickup_address || "",
    deliveryAddress: quotation.delivery_address || "",
    requiredQuoteDate: quotation.required_quote_date || "",
  }
}

export type QuotationStatusFormValues = {
  status: QuotationStatus
  rejectionReasonId: string
  rejectionNotes: string
  cancellationNotes: string
  targetRate: string
}

export function buildStatusFormValues(
  quotation: QuotationSummary
): QuotationStatusFormValues {
  return {
    status: quotation.status,
    rejectionReasonId: quotation.rejection_reason_id || "",
    rejectionNotes: quotation.rejection_notes || "",
    cancellationNotes: quotation.cancellation_notes || "",
    targetRate: quotation.target_rate != null ? String(quotation.target_rate) : "",
  }
}

export function canShowCommercialPricing(status: QuotationStatus) {
  return ["lista_para_enviar", "enviada", "renegociar_tarifa", "aceptada", "rechazada", "cancelada"].includes(
    status
  )
}

export function canShowCommercialActions(status: QuotationStatus) {
  return ["enviada", "aceptada", "rechazada", "cancelada"].includes(status)
}

export function canPrepareCommercialProposal(status: QuotationStatus) {
  return ["lista_para_enviar", "renegociar_tarifa"].includes(status)
}

export function canEditSalesOption(status: QuotationStatus) {
  return ["lista_para_enviar", "renegociar_tarifa"].includes(status)
}

export function getPrimaryContact(contacts: Contact[]) {
  return (
    contacts.find((contact) => contact.status === "activo" && contact.is_primary) ||
    contacts.find((contact) => contact.status === "activo") ||
    null
  )
}

export function buildMailToLink(
  quotation: QuotationSummary,
  contact: Contact | null,
  documentUrl: string
) {
  if (!contact?.email) {
    return null
  }

  const subject = encodeURIComponent(
    `Cotizacion ${quotation.reference_number || ""} - ${quotation.client_name || "Priority ERP"}`
  )
  const body = encodeURIComponent(
    [
      `Hola ${contact.name || ""},`,
      "",
      `Comparto la cotizacion ${quotation.reference_number || ""}.`,
      `Servicio: ${quotation.service_type || ""} ${quotation.transport_type ? `/ ${quotation.transport_type}` : ""}`.trim(),
      `Ruta: ${quotation.origin || ""} -> ${quotation.destination || ""}`,
      "",
      `Documento: ${documentUrl}`,
      "",
      "Saludos,",
      "Priority Logistics",
    ].join("\n")
  )

  return `mailto:${contact.email}?subject=${subject}&body=${body}`
}

export function buildQuoteWhatsAppLink(
  quotation: QuotationSummary,
  contact: Contact | null,
  documentUrl: string
) {
  const base = normalizeWhatsAppLink(contact?.phone)
  if (!base) {
    return null
  }

  const text = encodeURIComponent(
    [
      `Hola ${contact?.name || ""},`,
      `Te compartimos la cotizacion ${quotation.reference_number || ""}.`,
      `Servicio: ${quotation.service_type || ""} ${quotation.transport_type ? `/ ${quotation.transport_type}` : ""}`.trim(),
      `Ruta: ${quotation.origin || ""} -> ${quotation.destination || ""}`,
      `Documento: ${documentUrl}`,
    ].join("\n")
  )

  return `${base}&text=${text}`
}

export type QuotationDetailState = {
  quotation: QuotationSummary
  chargeLines: QuotationChargeLine[]
  cargoLines: QuotationCargoLine[]
  clientContacts: Contact[]
  rejectionReasons: QuotationRejectionReason[]
}

export type SalesOptionSummary = {
  optionId: string
  optionLabel: string
  optionSortOrder: number
  includeInCustomerQuote: boolean
  purchaseValidUntil: string | null
  salesValidUntil: string | null
  salesValidityOverridden: boolean
  totalPurchase: number
  totalPurchaseMxn: number
  totalSale: number
  totalSaleMxn: number
  totalProfit: number
  totalProfitMxn: number
  providers: Set<string>
  lines: QuotationChargeLine[]
  hasCompleteSale: boolean
}

export type SalesDraftValue = {
  sale_amount: string
  sale_currency: string
}

export function summarizeSalesOptions(detailChargeLines: QuotationChargeLine[]): SalesOptionSummary[] {
  const grouped = new Map<string, SalesOptionSummary>()

  for (const line of detailChargeLines) {
    const optionId = line.quotation_option_id || line.id
    const current = grouped.get(optionId) ?? {
      optionId,
      optionLabel: line.option_label || `Opcion ${line.option_sort_order ?? 1}`,
      optionSortOrder: line.option_sort_order ?? 1,
      includeInCustomerQuote: line.include_in_customer_quote ?? true,
      purchaseValidUntil: line.option_purchase_valid_until ?? null,
      salesValidUntil: line.option_sales_valid_until ?? line.option_purchase_valid_until ?? null,
      salesValidityOverridden: Boolean(line.option_sales_validity_overridden ?? false),
      totalPurchase: 0,
      totalPurchaseMxn: 0,
      totalSale: 0,
      totalSaleMxn: 0,
      totalProfit: 0,
      totalProfitMxn: 0,
      providers: new Set<string>(),
      lines: [],
      hasCompleteSale: true,
    }

    current.totalPurchase += line.purchase_amount ?? 0
    current.totalPurchaseMxn += line.purchase_amount_mxn ?? 0
    current.totalSale += line.sale_amount ?? 0
    current.totalSaleMxn += line.sale_amount_mxn ?? 0
    current.totalProfit += line.profit_amount ?? 0
    current.totalProfitMxn += line.profit_amount_mxn ?? 0
    if (line.provider_name) {
      current.providers.add(line.provider_name)
    }
    current.lines.push(line)
    current.hasCompleteSale = current.hasCompleteSale && line.sale_amount != null
    grouped.set(optionId, current)
  }

  return Array.from(grouped.values()).sort((left, right) => left.optionSortOrder - right.optionSortOrder)
}

export function buildSalesDraft(summary: SalesOptionSummary): Record<string, SalesDraftValue> {
  return Object.fromEntries(
    summary.lines.map((line) => [
      line.id,
      {
        sale_amount: line.sale_amount != null ? String(line.sale_amount) : "",
        sale_currency: line.sale_currency || line.purchase_currency || "USD",
      },
    ])
  )
}

export function syncSalesValidityDrafts(
  current: Record<string, string>,
  summaries: SalesOptionSummary[]
): Record<string, string> {
  const next = { ...current }
  let changed = false

  for (const summary of summaries) {
    const expectedValue = summary.salesValidUntil ?? ""
    if (next[summary.optionId] !== expectedValue) {
      next[summary.optionId] = expectedValue
      changed = true
    }
  }

  for (const key of Object.keys(next)) {
    if (!summaries.some((summary) => summary.optionId === key)) {
      delete next[key]
      changed = true
    }
  }

  return changed ? next : current
}
