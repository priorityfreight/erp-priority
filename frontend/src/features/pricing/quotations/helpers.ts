import type {
  ProviderPricingCandidate,
  QuotationCargoLine,
  QuotationChargeLine,
  QuotationSummary,
} from "@/lib/db"
import { normalizeWhatsAppLink } from "@/lib/quotations/calculations"
import type { QuotationChargeLineFormValues } from "@/components/forms/QuotationChargeLineForm"

export const pricingStatusOptions = [
  "pendiente",
  "cotizando",
  "lista_para_enviar",
  "renegociar_tarifa",
]

function createChargeDraftId() {
  if (typeof globalThis !== "undefined" && "crypto" in globalThis && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `charge-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function createEmptyChargeForm(
  defaults?: Partial<
    Pick<QuotationChargeLineFormValues, "purchaseCurrency" | "purchaseValidUntil" | "vatRate">
  >
): QuotationChargeLineFormValues {
  return {
    draftId: createChargeDraftId(),
    existingChargeId: null,
    providerId: "",
    salesAccountingConceptId: "",
    purchaseAmount: "",
    purchaseCurrency: defaults?.purchaseCurrency || "MXN",
    purchaseValidUntil: defaults?.purchaseValidUntil || "",
    saleAmount: "",
    saleCurrency: "MXN",
    vatRate: defaults?.vatRate || "",
    notes: "",
  }
}

export function buildChargeFormFromLine(line: QuotationChargeLine): QuotationChargeLineFormValues {
  return {
    draftId: createChargeDraftId(),
    existingChargeId: line.id,
    providerId: line.provider_id || "",
    salesAccountingConceptId: line.sales_accounting_concept_id || "",
    purchaseAmount: line.purchase_amount != null ? String(line.purchase_amount) : "",
    purchaseCurrency: line.purchase_currency || "MXN",
    purchaseValidUntil: line.option_purchase_valid_until || "",
    saleAmount: line.sale_amount != null ? String(line.sale_amount) : "",
    saleCurrency: line.sale_currency || "MXN",
    vatRate: String(line.vat_rate ?? 0),
    notes: line.notes || "",
  }
}

export function isChargeDraftEmpty(row: QuotationChargeLineFormValues) {
  return ![
    row.providerId,
    row.salesAccountingConceptId,
    row.purchaseAmount,
    row.purchaseValidUntil,
    row.vatRate,
    row.notes,
  ].some((value) => value.trim())
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

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "No disponible"
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString()
}

export function formatStatusLabel(status: string) {
  switch (status) {
    case "pendiente":
      return "Pendiente de cotizar"
    case "cotizando":
      return "Cotizando"
    case "lista_para_enviar":
      return "Lista para enviar"
    case "renegociar_tarifa":
      return "Renegociar tarifa"
    default:
      return status
  }
}

export function getStatusDescription(status: string) {
  switch (status) {
    case "pendiente":
      return "Lista para ser tomada por pricing."
    case "cotizando":
      return "Pricing ya esta recopilando costos con proveedores."
    case "lista_para_enviar":
      return "La propuesta de compra ya puede regresar a ventas."
    case "renegociar_tarifa":
      return "Ventas solicito una nueva recopilacion con target rate."
    default:
      return null
  }
}

export function getPrimaryProviderContact(candidate: ProviderPricingCandidate) {
  return candidate.contacts.find((contact) => contact.status === "activo") ?? null
}

type ProviderMessageLanguage = "es" | "en"

function buildCargoDetailsSection(
  cargoLines: QuotationCargoLine[],
  language: ProviderMessageLanguage
) {
  if (cargoLines.length === 0) {
    return language === "es"
      ? "Sin detalles de carga capturados todavia."
      : "No cargo details captured yet."
  }

  const cargoRows = cargoLines.map((line, index) => {
    const loadType = line.load_type || (language === "es" ? "GRL" : "General")
    const dimensions =
      [line.length, line.width, line.height].every((value) => value != null)
        ? `${line.length} x ${line.width} x ${line.height} cm`
        : language === "es"
          ? "Sin medidas"
          : "No dimensions"
    const weight =
      line.weight != null
        ? `${line.weight} kg`
        : language === "es"
          ? "Sin peso"
          : "No weight"

    return `${index + 1} ${loadType} ${dimensions} ${weight}`
  })

  const commodityValues = Array.from(
    new Set(
      cargoLines.map((line) => {
        const value = String(line.commodities || "").trim()
        return value.length > 0 ? value : "GRL"
      })
    )
  )

  return [...cargoRows, `Commodities: ${commodityValues.join(", ")}`].join("\n")
}

function buildProviderMessageBody(
  candidate: ProviderPricingCandidate,
  quotation: QuotationSummary,
  cargoLines: QuotationCargoLine[],
  language: ProviderMessageLanguage
) {
  const primaryContact = getPrimaryProviderContact(candidate)
  const contactName = primaryContact?.name || candidate.provider.name

  if (language === "es") {
    return [
      `Hola ${contactName}, espero que te encuentres bien,`,
      "",
      "Agradeceremos su apoyo con su mejor tarifa y condiciones para la siguiente cotizacion:",
      "",
      `Incoterm: ${quotation.incoterm_code || "No disponible"}`,
      "",
      `Origen: ${quotation.pickup_address || "No disponible"}`,
      `POL: ${quotation.origin || "No disponible"}`,
      `POD: ${quotation.destination || "No disponible"}`,
      `Destino: ${quotation.delivery_address || "No disponible"}`,
      "",
      "DETALLES DE CARGA:",
      buildCargoDetailsSection(cargoLines, language),
      "",
      `Fecha de que la carga esta lista: ${quotation.required_quote_date || "No disponible"}`,
      "",
      "Favor de compartir tarifa, vigencia, tiempos libres, itinerario y cualquier observacion o condicion especial aplicable.",
      "",
      "Quedamos atentos a su pronta respuesta.",
    ].join("\n")
  }

  return [
    `Hello ${contactName}, I hope you are doing well,`,
    "",
    "Could you please support us with your best rate and terms for the following quotation:",
    "",
    `Incoterm: ${quotation.incoterm_code || "Not available"}`,
    "",
    `Origin: ${quotation.pickup_address || "Not available"}`,
    `POL: ${quotation.origin || "Not available"}`,
    `POD: ${quotation.destination || "Not available"}`,
    `Destination: ${quotation.delivery_address || "Not available"}`,
    "",
    "CARGO DETAILS:",
    buildCargoDetailsSection(cargoLines, language),
    "",
    `Cargo ready date: ${quotation.required_quote_date || "Not available"}`,
    "",
    "Please share your rate, validity, free time, itinerary, and any special remarks or conditions that may apply.",
    "",
    "We look forward to your prompt response.",
  ].join("\n")
}

export function buildProviderEmailLink(
  candidate: ProviderPricingCandidate,
  quotation: QuotationSummary,
  cargoLines: QuotationCargoLine[],
  language: ProviderMessageLanguage
) {
  const primaryContact = getPrimaryProviderContact(candidate)
  const targetEmail = primaryContact?.email || candidate.provider.company_email

  if (!targetEmail) {
    return null
  }

  const subjectText =
    language === "es"
      ? `Solicitud de tarifa ${quotation.reference_number || ""} | ${quotation.service_type || ""}`.trim()
      : `Rate request ${quotation.reference_number || ""} | ${quotation.service_type || ""}`.trim()

  return `mailto:${targetEmail}?subject=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(
    buildProviderMessageBody(candidate, quotation, cargoLines, language)
  )}`
}

export function buildProviderWhatsAppLink(
  candidate: ProviderPricingCandidate,
  quotation: QuotationSummary,
  cargoLines: QuotationCargoLine[],
  language: ProviderMessageLanguage
) {
  const primaryContact = getPrimaryProviderContact(candidate)
  const base =
    normalizeWhatsAppLink(primaryContact?.phone) ||
    normalizeWhatsAppLink(candidate.provider.corporate_phone)

  if (!base) {
    return null
  }

  return `${base}&text=${encodeURIComponent(
    buildProviderMessageBody(candidate, quotation, cargoLines, language)
  )}`
}

export type PricingChargeOptionSummary = {
  optionId: string
  optionLabel: string
  optionSortOrder: number
  includeInCustomerQuote: boolean
  purchaseValidUntil: string | null
  salesValidUntil: string | null
  totalPurchase: number
  totalPurchaseMxn: number
  totalWithVatMxn: number
  providers: Set<string>
  lineCount: number
  lines: QuotationChargeLine[]
}

export function summarizePricingChargeOptions(
  chargeLines: QuotationChargeLine[]
): PricingChargeOptionSummary[] {
  const grouped = new Map<string, PricingChargeOptionSummary>()

  for (const line of chargeLines) {
    const optionId = line.quotation_option_id || line.id
    const current = grouped.get(optionId) ?? {
      optionId,
      optionLabel: line.option_label || `Opcion ${line.option_sort_order ?? 1}`,
      optionSortOrder: line.option_sort_order ?? 1,
      includeInCustomerQuote: line.include_in_customer_quote ?? true,
      purchaseValidUntil: line.option_purchase_valid_until ?? null,
      salesValidUntil: line.option_sales_valid_until ?? line.option_purchase_valid_until ?? null,
      totalPurchase: 0,
      totalPurchaseMxn: 0,
      totalWithVatMxn: 0,
      providers: new Set<string>(),
      lineCount: 0,
      lines: [],
    }

    current.totalPurchase += line.purchase_amount ?? 0
    current.totalPurchaseMxn += line.purchase_amount_mxn ?? 0
    current.totalWithVatMxn += (line.purchase_amount_mxn ?? 0) * (1 + (line.vat_rate ?? 0) / 100)
    if (line.provider_name) {
      current.providers.add(line.provider_name)
    }
    current.lineCount += 1
    current.lines.push(line)
    grouped.set(optionId, current)
  }

  return Array.from(grouped.values()).sort((left, right) => left.optionSortOrder - right.optionSortOrder)
}

export function buildNextOptionLabel(summaries: PricingChargeOptionSummary[]) {
  return `Opcion ${summaries.reduce((maxValue, summary) => Math.max(maxValue, summary.optionSortOrder), 0) + 1}`
}

export function validateChargeRows(rows: QuotationChargeLineFormValues[]) {
  const rowsToSave = rows.filter((row) => !isChargeDraftEmpty(row))

  if (rowsToSave.length === 0) {
    throw new Error("Agrega al menos un concepto de compra")
  }

  const validities = Array.from(
    new Set(rowsToSave.map((row) => row.purchaseValidUntil.trim()).filter(Boolean))
  )

  if (validities.length !== 1) {
    throw new Error("Todos los conceptos de una misma opcion deben compartir la misma validez")
  }

  for (const row of rowsToSave) {
    if (!row.providerId) {
      throw new Error("Cada concepto debe tener proveedor")
    }
    if (!row.salesAccountingConceptId) {
      throw new Error("Cada concepto debe tener concepto contable")
    }
    if (!row.purchaseValidUntil) {
      throw new Error("Cada concepto debe incluir validez de tarifa compra")
    }
  }

  return {
    rowsToSave,
    purchaseValidUntil: validities[0] || null,
  }
}
