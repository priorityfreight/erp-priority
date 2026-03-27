import type { Contact, QuotationChargeLine } from "@/lib/db"

export const priorityPalette = {
  navy: "#0B1F3B",
  burgundy: "#800020",
  burgundyLight: "#B33A5B",
  gray: "#909EAE",
  lightText: "#E5E5E5",
  softGray: "#CFCFCF",
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

export function getPrimaryContact(contacts: Contact[]) {
  return (
    contacts.find((contact) => contact.status === "activo" && contact.is_primary) ||
    contacts.find((contact) => contact.status === "activo") ||
    null
  )
}

export type CustomerDocumentOptionSummary = {
  optionId: string
  optionLabel: string
  sortOrder: number
  lines: QuotationChargeLine[]
  salesValidUntil: string | null
  subtotalMxn: number
  totalMxn: number
}

export function getVisibleCustomerOptionSummaries(
  chargeLines: QuotationChargeLine[]
): CustomerDocumentOptionSummary[] {
  const grouped = new Map<string, CustomerDocumentOptionSummary>()

  for (const line of chargeLines.filter((entry) => entry.include_in_customer_quote !== false)) {
    const optionId = line.quotation_option_id || line.id
    const current = grouped.get(optionId) ?? {
      optionId,
      optionLabel: line.option_label || `Opcion ${line.option_sort_order ?? 1}`,
      sortOrder: line.option_sort_order ?? 1,
      lines: [],
      salesValidUntil:
        line.option_sales_valid_until ?? line.option_purchase_valid_until ?? null,
      subtotalMxn: 0,
      totalMxn: 0,
    }

    const saleMxn = line.sale_amount_mxn ?? line.sale_amount ?? 0
    const totalMxn = saleMxn * (1 + (line.vat_rate ?? 0) / 100)

    current.lines.push(line)
    current.subtotalMxn += saleMxn
    current.totalMxn += totalMxn
    grouped.set(optionId, current)
  }

  return Array.from(grouped.values()).sort((left, right) => left.sortOrder - right.sortOrder)
}

export type CustomerOptionRemark = {
  heading: string
  note: string
}

export function getCustomerOptionRemarks(
  lines: QuotationChargeLine[]
): CustomerOptionRemark[] {
  return lines
    .map((line) => ({
      heading: String(line.accounting_concept || line.service_name || "Concepto").trim(),
      note: String(line.notes || "").trim(),
    }))
    .filter((entry) => entry.note.length > 0)
}
