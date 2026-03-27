"use client"

import Link from "next/link"
import { useDeferredValue, useEffect, useMemo, useState } from "react"
import { Modal } from "@/components/data/Modal"
import { StatusBadge } from "@/components/data/StatusBadge"
import {
  QuotationChargeLineForm,
  type QuotationChargeLineFormValues,
} from "@/components/forms/QuotationChargeLineForm"
import { PageContainer } from "@/components/layout/PageContainer"
import { normalizeWhatsAppLink } from "@/lib/quotations/calculations"
import {
  deleteQuotationChargeLine,
  getProviderPricingCandidates,
  getQuotationCargoLines,
  getQuotationById,
  getProviders,
  getQuotationChargeLines,
  getQuotations,
  getSalesAccountingConcepts,
  saveQuotationPurchaseOption,
  takeQuotationForPricing,
  updateQuotationStatus,
  type Provider,
  type ProviderPricingCandidate,
  type QuotationCargoLine,
  type QuotationChargeLine,
  type QuotationSummary,
  type SalesAccountingConcept,
} from "@/lib/db"

const statusOptions = ["pendiente", "cotizando", "lista_para_enviar", "renegociar_tarifa"]

function createChargeDraftId() {
  if (typeof globalThis !== "undefined" && "crypto" in globalThis && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `charge-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function createEmptyChargeForm(
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

function buildChargeFormFromLine(line: QuotationChargeLine): QuotationChargeLineFormValues {
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

function isChargeDraftEmpty(row: QuotationChargeLineFormValues) {
  return ![
    row.providerId,
    row.salesAccountingConceptId,
    row.purchaseAmount,
    row.purchaseValidUntil,
    row.vatRate,
    row.notes,
  ].some((value) => value.trim())
}

function formatCurrency(value: number | null | undefined, currency = "MXN") {
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

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "No disponible"
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString()
}

function formatStatusLabel(status: string) {
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

function getStatusDescription(status: string) {
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

function getPrimaryProviderContact(candidate: ProviderPricingCandidate) {
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

  const commodityLabel = language === "es" ? "Commodities" : "Commodities"

  return [...cargoRows, `${commodityLabel}: ${commodityValues.join(", ")}`].join("\n")
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

function buildProviderEmailLink(
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
  const subject = encodeURIComponent(subjectText)
  const body = encodeURIComponent(
    buildProviderMessageBody(candidate, quotation, cargoLines, language)
  )

  return `mailto:${targetEmail}?subject=${subject}&body=${body}`
}

function buildProviderWhatsAppLink(
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

  const text = encodeURIComponent(
    buildProviderMessageBody(candidate, quotation, cargoLines, language)
  )

  return `${base}&text=${text}`
}

export default function PricingQuotationsPage() {
  const [items, setItems] = useState<QuotationSummary[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [takingId, setTakingId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const pageSize = 25

  const [selectedQuotation, setSelectedQuotation] = useState<QuotationSummary | null>(null)
  const [showProvidersModal, setShowProvidersModal] = useState(false)
  const [showChargesModal, setShowChargesModal] = useState(false)
  const [providerCandidates, setProviderCandidates] = useState<ProviderPricingCandidate[]>([])
  const [providerCargoLines, setProviderCargoLines] = useState<QuotationCargoLine[]>([])
  const [allProviders, setAllProviders] = useState<Provider[]>([])
  const [chargeLines, setChargeLines] = useState<QuotationChargeLine[]>([])
  const [concepts, setConcepts] = useState<SalesAccountingConcept[]>([])
  const [loadingProviders, setLoadingProviders] = useState(false)
  const [loadingCharges, setLoadingCharges] = useState(false)
  const [savingCharge, setSavingCharge] = useState(false)
  const [deletingChargeId, setDeletingChargeId] = useState<string | null>(null)
  const [movingToReadyId, setMovingToReadyId] = useState<string | null>(null)
  const [showChargeEditor, setShowChargeEditor] = useState(false)
  const [editingChargeOptionId, setEditingChargeOptionId] = useState<string | null>(null)
  const [chargeFormRows, setChargeFormRows] = useState<QuotationChargeLineFormValues[]>([
    createEmptyChargeForm(),
  ])

  async function loadItems(search = "", status = "all", nextPage = 1) {
    try {
      setLoading(true)
      const data = await getQuotations({
        scope: "pricing",
        query: search,
        status,
        page: nextPage,
        pageSize,
      })
      setItems(data.items)
      setTotalCount(data.totalCount)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
  }, [deferredQuery, statusFilter])

  useEffect(() => {
    void loadItems(deferredQuery, statusFilter, page)
  }, [deferredQuery, page, statusFilter])

  function resetChargeForm() {
    setShowChargeEditor(false)
    setEditingChargeOptionId(null)
    setChargeFormRows([createEmptyChargeForm()])
  }

  function openNewChargeOptionEditor() {
    setEditingChargeOptionId(null)
    setChargeFormRows([createEmptyChargeForm()])
    setShowChargeEditor(true)
  }

  async function handleTakeQuotation(id: string) {
    try {
      setTakingId(id)
      await takeQuotationForPricing(id)
      await loadItems(deferredQuery, statusFilter, page)
    } catch (error) {
      console.error(error)
      alert("No se pudo tomar la cotizacion")
    } finally {
      setTakingId(null)
    }
  }

  async function handleOpenProviders(quotation: QuotationSummary) {
    try {
      setSelectedQuotation(quotation)
      setShowProvidersModal(true)
      setLoadingProviders(true)
      const [candidates, cargoLines] = await Promise.all([
        getProviderPricingCandidates({
          serviceType: quotation.service_type,
          transportType: quotation.transport_type,
        }),
        getQuotationCargoLines(quotation.id),
      ])
      setProviderCandidates(candidates)
      setProviderCargoLines(cargoLines)
    } catch (error) {
      console.error(error)
      alert("No se pudieron cargar los proveedores sugeridos")
    } finally {
      setLoadingProviders(false)
    }
  }

  async function handleOpenCharges(quotation: QuotationSummary) {
    try {
      setSelectedQuotation(quotation)
      setShowChargesModal(true)
      setLoadingCharges(true)
      resetChargeForm()

      const [lines, accountingConcepts, candidates] = await Promise.all([
        getQuotationChargeLines(quotation.id),
        getSalesAccountingConcepts(),
        getProviderPricingCandidates({
          serviceType: quotation.service_type,
          transportType: quotation.transport_type,
        }),
      ])

      setChargeLines(lines)
      setConcepts(accountingConcepts)
      setProviderCandidates(candidates)

      if (candidates.length === 0) {
        const providers = await getProviders()
        setAllProviders(providers.filter((provider) => provider.status === "activo"))
      } else {
        setAllProviders([])
      }
    } catch (error) {
      console.error(error)
      alert("No se pudieron cargar los cargos de la cotizacion")
    } finally {
      setLoadingCharges(false)
    }
  }

  async function reloadChargeContext(quotation: QuotationSummary) {
    const [lines, refreshedQuotation] = await Promise.all([
      getQuotationChargeLines(quotation.id),
      getQuotationById(quotation.id),
    ])

    setChargeLines(lines)

    if (refreshedQuotation) {
      let removedFromCurrentList = false

      setItems((current) => {
        if (statusFilter !== "all" && refreshedQuotation.status !== statusFilter) {
          const nextItems = current.filter((item) => item.id !== refreshedQuotation.id)
          removedFromCurrentList = nextItems.length !== current.length
          return nextItems
        }

        return current.map((item) => (item.id === refreshedQuotation.id ? refreshedQuotation : item))
      })

      if (removedFromCurrentList) {
        setTotalCount((count) => Math.max(count - 1, 0))
      }

      setSelectedQuotation(refreshedQuotation)
      return
    }

    setSelectedQuotation(selectedQuotation ?? quotation)
  }

  async function handleSaveChargeLine() {
    if (!selectedQuotation) {
      return
    }

    const rowsToSave = chargeFormRows.filter((row) => !isChargeDraftEmpty(row))

    if (rowsToSave.length === 0) {
      alert("Agrega al menos un concepto de compra")
      return
    }

    try {
      setSavingCharge(true)
      const validities = Array.from(
        new Set(rowsToSave.map((row) => row.purchaseValidUntil.trim()).filter(Boolean))
      )
      if (validities.length !== 1) {
        alert("Todos los conceptos de una misma opcion deben compartir la misma validez")
        return
      }

      const nextOptionLabel =
        editingChargeOptionId == null
          ? `Opcion ${chargeOptionSummaries.reduce(
              (maxValue, summary) => Math.max(maxValue, summary.optionSortOrder),
              0
            ) + 1}`
          : null

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

      await saveQuotationPurchaseOption({
        quotationId: selectedQuotation.id,
        quotationOptionId: editingChargeOptionId ?? null,
        optionLabel: editingChargeOptionId == null ? nextOptionLabel : null,
        purchaseValidUntil: validities[0] || null,
        lines: rowsToSave.map((row) => ({
          id: row.existingChargeId ?? null,
          provider_id: row.providerId || null,
          sales_accounting_concept_id: row.salesAccountingConceptId || null,
          purchase_amount: row.purchaseAmount ? Number(row.purchaseAmount) : null,
          purchase_currency: row.purchaseCurrency || "MXN",
          vat_rate: row.vatRate ? Number(row.vatRate) : null,
          notes: row.notes.trim() || null,
        })),
      })

      resetChargeForm()
      await reloadChargeContext(selectedQuotation)
    } catch (error) {
      console.error(error)
      alert("No se pudo guardar el cargo")
    } finally {
      setSavingCharge(false)
    }
  }

  async function handleDeleteChargeLine(id: string) {
    if (!selectedQuotation) {
      return
    }

    const confirmed = window.confirm("Eliminar este cargo?")
    if (!confirmed) {
      return
    }

    try {
      setDeletingChargeId(id)
      await deleteQuotationChargeLine(id)
      await reloadChargeContext(selectedQuotation)
    } catch (error) {
      console.error(error)
      alert("No se pudo eliminar el cargo")
    } finally {
      setDeletingChargeId(null)
    }
  }

  async function handleMoveToReadyForSend() {
    if (!selectedQuotation) {
      return
    }

    if (chargeLines.length === 0) {
      alert("Primero agrega al menos un cargo de compra")
      return
    }

    try {
      setMovingToReadyId(selectedQuotation.id)
      await updateQuotationStatus(selectedQuotation.id, "lista_para_enviar")
      await reloadChargeContext(selectedQuotation)
    } catch (error) {
      console.error(error)
      alert("No se pudo mover la cotizacion a lista para enviar")
    } finally {
      setMovingToReadyId(null)
    }
  }

  const recommendedProviders = useMemo(() => {
    const seen = new Set<string>()
    return providerCandidates
      .map((candidate) => candidate.provider)
      .filter((provider) => {
        if (seen.has(provider.id)) {
          return false
        }
        seen.add(provider.id)
        return true
      })
  }, [providerCandidates])

  const providersForChargeForm = recommendedProviders.length > 0 ? recommendedProviders : allProviders
  const filteredConceptsForQuotation = useMemo(
    () =>
      concepts.filter((concept) => {
        const matchesService =
          concept.service_type === "GENERAL" ||
          concept.service_type === (selectedQuotation?.service_type || "")
        const matchesOperation =
          !selectedQuotation?.operation_type ||
          concept.operation_type === selectedQuotation.operation_type.toUpperCase()
        return matchesService && matchesOperation
      }),
    [concepts, selectedQuotation?.operation_type, selectedQuotation?.service_type]
  )
  const pricingChargeDisabledReason = useMemo(() => {
    if (loadingCharges) {
      return null
    }

    if (!selectedQuotation?.can_edit_purchase_amount) {
      return "Tu rol no tiene permiso para editar costos de compra en esta cotizacion."
    }

    if (providersForChargeForm.length === 0 && filteredConceptsForQuotation.length === 0) {
      return "No hay proveedores activos ni conceptos contables compatibles para esta cotizacion. Configura ambos catalogos antes de capturar compra."
    }

    if (providersForChargeForm.length === 0) {
      return "No hay proveedores activos compatibles con este servicio y transporte. Configura proveedores antes de capturar compra."
    }

    if (filteredConceptsForQuotation.length === 0) {
      return "No hay conceptos contables compatibles con este servicio y operacion. Configura el catalogo antes de capturar compra."
    }

    return null
  }, [
    filteredConceptsForQuotation.length,
    loadingCharges,
    providersForChargeForm.length,
    selectedQuotation?.can_edit_purchase_amount,
  ])
  const canCaptureCharges = !pricingChargeDisabledReason

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const showingFrom = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const showingTo = totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount)
  const chargeOptionSummaries = useMemo(() => {
    const grouped = new Map<
      string,
      {
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
    >()

    for (const line of chargeLines) {
      const optionId = line.quotation_option_id || line.id
      const optionLabel = line.option_label || `Opcion ${line.option_sort_order ?? 1}`
      const current = grouped.get(optionId) ?? {
        optionId,
        optionLabel,
        optionSortOrder: line.option_sort_order ?? 1,
        includeInCustomerQuote: line.include_in_customer_quote ?? true,
        purchaseValidUntil: line.option_purchase_valid_until ?? null,
        salesValidUntil:
          line.option_sales_valid_until ?? line.option_purchase_valid_until ?? null,
        totalPurchase: 0,
        totalPurchaseMxn: 0,
        totalWithVatMxn: 0,
        providers: new Set<string>(),
        lineCount: 0,
        lines: [],
      }

      current.totalPurchase += line.purchase_amount ?? 0
      current.totalPurchaseMxn += line.purchase_amount_mxn ?? 0
      current.totalWithVatMxn +=
        (line.purchase_amount_mxn ?? 0) * (1 + (line.vat_rate ?? 0) / 100)
      if (line.provider_name) {
        current.providers.add(line.provider_name)
      }
      current.lineCount += 1
      current.lines.push(line)
      grouped.set(optionId, current)
    }

    return Array.from(grouped.values()).sort((left, right) => left.optionSortOrder - right.optionSortOrder)
  }, [chargeLines])

  function openExistingChargeOptionEditor(summary: (typeof chargeOptionSummaries)[number]) {
    setEditingChargeOptionId(summary.optionId)
    setChargeFormRows(summary.lines.map((line) => buildChargeFormFromLine(line)))
    setShowChargeEditor(true)
  }

  return (
    <PageContainer
      title="Pricing Quotations"
      description="Tablero de pricing para tomar cotizaciones, contactar proveedores y consolidar compra antes de enviarlas al equipo comercial."
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Cotizaciones activas
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">{totalCount}</div>
          </div>
          <div className="rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#1D4ED8]">
              Pendientes
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {items.filter((item) => item.status === "pendiente").length}
            </div>
          </div>
          <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#B45309]">
              Cotizando
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {items.filter((item) => item.status === "cotizando").length}
            </div>
          </div>
          <div className="rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6D28D9]">
              Listas para enviar
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {items.filter((item) => item.status === "lista_para_enviar").length}
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">Trabajo de pricing</h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                Toma la cotizacion, consulta proveedores compatibles y consolida opciones de compra antes de regresarlas al equipo comercial.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                placeholder="Buscar cotizacion"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <select
                className="rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">Todos los estatus</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {formatStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-[#6B7280]">Cargando cotizaciones...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-[#6B7280]">
              No hay cotizaciones para pricing con los filtros actuales.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
              <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  <tr>
                    <th className="px-4 py-3">Referencia</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Servicio</th>
                    <th className="px-4 py-3">Lane</th>
                    <th className="px-4 py-3">Pricing owner</th>
                    <th className="px-4 py-3">Estatus</th>
                    <th className="px-4 py-3">Costo</th>
                    <th className="px-4 py-3">Target / comentarios</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] bg-white">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-[#111827]">
                        {item.reference_number || "Pendiente"}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">{item.client_name || "No client"}</td>
                      <td className="px-4 py-3 text-[#475569]">
                        {[item.service_type, item.transport_type].filter(Boolean).join(" / ") ||
                          "No definido"}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {item.origin && item.destination
                          ? `${item.origin} -> ${item.destination}`
                          : "No definido"}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {item.pricing_owner_name || "Sin asignar"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          <StatusBadge status={item.status} />
                          {getStatusDescription(item.status) ? (
                            <div className="max-w-[220px] text-xs text-[#6B7280]">
                              {getStatusDescription(item.status)}
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {item.can_view_cost ? formatCurrency(item.estimated_cost) : "Sin permiso"}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {item.status === "renegociar_tarifa" ? (
                          <div className="space-y-1">
                            <div>Target: {formatCurrency(item.target_rate)}</div>
                            <div className="max-w-[220px] text-xs text-[#6B7280]">
                              {item.rejection_notes || "Sin comentario de ventas"}
                            </div>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {item.status === "pendiente" ? (
                            <button
                              type="button"
                              onClick={() => void handleTakeQuotation(item.id)}
                              disabled={takingId === item.id}
                              className="rounded-md bg-[#2563EB] px-3 py-1.5 font-medium text-white hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {takingId === item.id ? "Tomando..." : "Tomar"}
                            </button>
                          ) : null}

                          {["cotizando", "lista_para_enviar", "renegociar_tarifa"].includes(item.status) ? (
                            <button
                              type="button"
                              onClick={() => void handleOpenProviders(item)}
                              className="rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 font-medium text-[#111827] hover:bg-[#F8FAFC]"
                            >
                              Proveedores
                            </button>
                          ) : null}

                          {["cotizando", "lista_para_enviar", "renegociar_tarifa"].includes(item.status) ? (
                            <button
                              type="button"
                              onClick={() => void handleOpenCharges(item)}
                              className="rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 font-medium text-[#111827] hover:bg-[#F8FAFC]"
                            >
                              Cargos
                            </button>
                          ) : null}

                          <Link
                            href={`/quotations/${item.id}`}
                            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 font-medium text-[#111827] hover:bg-[#F8FAFC]"
                          >
                            Ver
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalCount > 0 ? (
            <div className="flex flex-col gap-3 border-t border-[#E5E7EB] pt-4 text-sm text-[#6B7280] sm:flex-row sm:items-center sm:justify-between">
              <div>
                Mostrando {showingFrom} a {showingTo} de {totalCount} cotizaciones
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  disabled={page === 1 || loading}
                  className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 font-medium text-[#111827] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Anterior
                </button>
                <div className="min-w-[96px] text-center">
                  Pagina {page} de {totalPages}
                </div>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
                  disabled={page >= totalPages || loading}
                  className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 font-medium text-[#111827] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Siguiente
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {showProvidersModal && selectedQuotation ? (
        <Modal
          title={`Sourcing de proveedores · ${selectedQuotation.reference_number || "Cotizacion"}`}
          description="Consulta proveedores compatibles, abre la solicitud interna para proveedor y lanza correo o WhatsApp con la informacion ya redactada."
          onClose={() => {
            setShowProvidersModal(false)
            setSelectedQuotation(null)
            setProviderCandidates([])
          }}
        >
          <div className="space-y-4">
            {selectedQuotation.status === "renegociar_tarifa" ? (
              <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
                <div className="font-semibold">Renegociacion solicitada por ventas</div>
                <div className="mt-1">
                  Tarifa target: {formatCurrency(selectedQuotation.target_rate)}
                </div>
                <div className="mt-1">
                  Comentario: {selectedQuotation.rejection_notes || "Sin comentario"}
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4 text-sm text-[#475569]">
              <div className="font-semibold text-[#111827]">Solicitud interna de pricing</div>
              <div className="mt-1">
                {[selectedQuotation.service_type, selectedQuotation.transport_type]
                  .filter(Boolean)
                  .join(" / ") || "Servicio no definido"}
              </div>
              <div className="mt-1">
                {selectedQuotation.origin || "Origen"} → {selectedQuotation.destination || "Destino"}
              </div>
              <div className="mt-1">
                Fecha requerida para cotizar: {formatDate(selectedQuotation.required_quote_date)}
              </div>
            </div>

            {loadingProviders ? (
              <p className="text-sm text-[#6B7280]">Cargando proveedores sugeridos...</p>
            ) : providerCandidates.length === 0 ? (
              <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
                No hay proveedores activos configurados para este servicio y transporte. Pricing
                no podra capturar compra hasta que exista al menos un proveedor compatible.
              </div>
            ) : (
              <div className="space-y-3">
                {providerCandidates.map((candidate) => {
                  const primaryContact = getPrimaryProviderContact(candidate)
                  const mailToLinkEs = buildProviderEmailLink(
                    candidate,
                    selectedQuotation,
                    providerCargoLines,
                    "es"
                  )
                  const mailToLinkEn = buildProviderEmailLink(
                    candidate,
                    selectedQuotation,
                    providerCargoLines,
                    "en"
                  )
                  const whatsAppLinkEs = buildProviderWhatsAppLink(
                    candidate,
                    selectedQuotation,
                    providerCargoLines,
                    "es"
                  )
                  const whatsAppLinkEn = buildProviderWhatsAppLink(
                    candidate,
                    selectedQuotation,
                    providerCargoLines,
                    "en"
                  )

                  return (
                    <section
                      key={candidate.service_offering.id}
                      className="rounded-xl border border-[#E5E7EB] bg-white p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-[#111827]">
                            {candidate.provider.name}
                          </h3>
                          <div className="mt-1 text-sm text-[#475569]">
                            {candidate.service_offering.service_type} /{" "}
                            {candidate.service_offering.transport_type}
                          </div>
                          <div className="mt-1 text-sm text-[#475569]">
                            Contacto: {primaryContact?.name || "Sin contacto activo"}
                          </div>
                          <div className="mt-1 text-sm text-[#475569]">
                            Correo:{" "}
                            {primaryContact?.email ||
                              candidate.provider.company_email ||
                              "No disponible"}
                          </div>
                          <div className="mt-1 text-sm text-[#475569]">
                            WhatsApp / telefono:{" "}
                            {primaryContact?.phone ||
                              candidate.provider.corporate_phone ||
                              "No disponible"}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {mailToLinkEs ? (
                            <a
                              href={mailToLinkEs}
                              className="rounded-md bg-[#2563EB] px-3 py-2 text-sm font-medium text-white hover:bg-[#1D4ED8]"
                            >
                              Correo ES
                            </a>
                          ) : null}
                          {mailToLinkEn ? (
                            <a
                              href={mailToLinkEn}
                              className="rounded-md border border-[#93C5FD] bg-[#EFF6FF] px-3 py-2 text-sm font-medium text-[#1D4ED8] hover:bg-[#DBEAFE]"
                            >
                              Email EN
                            </a>
                          ) : null}
                          {whatsAppLinkEs ? (
                            <a
                              href={whatsAppLinkEs}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md border border-[#86EFAC] bg-[#F0FDF4] px-3 py-2 text-sm font-medium text-[#166534] hover:bg-[#DCFCE7]"
                            >
                              WhatsApp ES
                            </a>
                          ) : null}
                          {whatsAppLinkEn ? (
                            <a
                              href={whatsAppLinkEn}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md border border-[#BBF7D0] bg-[#F7FEE7] px-3 py-2 text-sm font-medium text-[#166534] hover:bg-[#ECFCCB]"
                            >
                              WhatsApp EN
                            </a>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-3 text-sm text-[#475569]">
                        <div className="font-medium text-[#111827]">Terminos y condiciones</div>
                        <div className="mt-1">
                          {candidate.service_offering.terms_and_conditions || "No disponible"}
                        </div>
                      </div>
                    </section>
                  )
                })}
              </div>
            )}
          </div>
        </Modal>
      ) : null}

      {showChargesModal && selectedQuotation ? (
        <Modal
          title={`Cargos de pricing · ${selectedQuotation.reference_number || "Cotizacion"}`}
          description="Pricing captura una o varias opciones de compra por proveedor. Guarda avances y al final envia la propuesta a ventas."
          headerActions={
            ["cotizando", "renegociar_tarifa"].includes(selectedQuotation.status) ? (
              <button
                type="button"
                onClick={() => void handleMoveToReadyForSend()}
                disabled={
                  movingToReadyId === selectedQuotation.id ||
                  !canCaptureCharges ||
                  chargeLines.length === 0
                }
                className="rounded-md bg-[#0F766E] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {movingToReadyId === selectedQuotation.id
                  ? "Actualizando..."
                  : "Enviar propuesta"}
              </button>
            ) : null
          }
          onClose={() => {
            setShowChargesModal(false)
            setSelectedQuotation(null)
            setChargeLines([])
            setProviderCandidates([])
            setAllProviders([])
            setConcepts([])
            resetChargeForm()
          }}
        >
          <div className="space-y-5">
            {selectedQuotation.status === "renegociar_tarifa" ? (
              <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
                <div className="font-semibold">Ventas solicita renegociacion</div>
                <div className="mt-1">
                  Tarifa target: {formatCurrency(selectedQuotation.target_rate)}
                </div>
                <div className="mt-1">
                  Comentario: {selectedQuotation.rejection_notes || "Sin comentario"}
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Servicio
                </div>
                <div className="mt-1 text-sm font-medium text-[#111827]">
                  {[selectedQuotation.service_type, selectedQuotation.transport_type]
                    .filter(Boolean)
                    .join(" / ") || "No definido"}
                </div>
              </div>
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Fecha requerida
                </div>
                <div className="mt-1 text-sm font-medium text-[#111827]">
                  {formatDate(selectedQuotation.required_quote_date)}
                </div>
              </div>
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Opciones capturadas
                </div>
                <div className="mt-1 text-sm font-medium text-[#111827]">
                  {chargeOptionSummaries.length}
                </div>
              </div>
            </div>

            {["cotizando", "renegociar_tarifa"].includes(selectedQuotation.status) ? (
              <div className="rounded-xl border border-[#CCFBF1] bg-[#F0FDFA] px-4 py-3 text-sm text-[#134E4A]">
                Cuando las opciones esten completas, usa <span className="font-semibold">Enviar propuesta</span> en la cabecera del modal para regresarla a ventas.
              </div>
            ) : null}

            {loadingCharges ? (
              <p className="text-sm text-[#6B7280]">Cargando cargos...</p>
            ) : (
              <>
                <section className="space-y-4 rounded-xl border border-[#E5E7EB] bg-white p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-[#111827]">Compra consolidada</h3>
                      <p className="mt-1 text-sm text-[#6B7280]">
                        Las compras deben organizarse por opcion. Cada opcion puede contener varios conceptos de proveedor.
                      </p>
                    </div>
                    {canCaptureCharges ? (
                      <button
                        type="button"
                        onClick={() => openNewChargeOptionEditor()}
                        className="rounded-md border border-[#CBD5E1] bg-white px-4 py-2 text-sm font-medium text-[#1E3A8A] shadow-sm hover:bg-[#F8FAFC]"
                      >
                        Anadir opcion
                      </button>
                    ) : null}
                  </div>

                  {chargeOptionSummaries.length > 0 ? (
                    <div className="space-y-4">
                      {chargeOptionSummaries.map((summary) => (
                        <div
                          key={summary.optionId}
                          className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4"
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                                {summary.optionLabel}
                              </div>
                              <div className="mt-2 text-lg font-semibold text-[#111827]">
                                {selectedQuotation.can_view_cost
                                  ? formatCurrency(summary.totalPurchaseMxn)
                                  : "Sin permiso"}
                              </div>
                              <div className="mt-1 text-sm text-[#6B7280]">
                                Total c/IVA MXN: {formatCurrency(summary.totalWithVatMxn)}
                              </div>
                              <div className="mt-1 text-sm text-[#6B7280]">
                                {summary.lineCount} cargo(s)
                              </div>
                              <div className="mt-1 text-sm text-[#6B7280]">
                                Vigencia compra: {formatDate(summary.purchaseValidUntil)}
                              </div>
                              <div className="mt-1 text-sm text-[#6B7280]">
                                Vigencia venta: {formatDate(summary.salesValidUntil)}
                              </div>
                              <div className="mt-1 text-sm text-[#6B7280]">
                                {summary.providers.size > 0
                                  ? Array.from(summary.providers).join(", ")
                                  : "Sin proveedor"}
                              </div>
                              <div className="mt-1 text-xs text-[#94A3B8]">
                                {summary.includeInCustomerQuote
                                  ? "Visible para propuesta comercial"
                                  : "Oculta para propuesta comercial"}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => openExistingChargeOptionEditor(summary)}
                                disabled={!selectedQuotation.can_edit_purchase_amount}
                                className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm font-medium text-[#111827] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Editar opcion
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white">
                            <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                              <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                                <tr>
                                  <th className="px-4 py-3">Proveedor</th>
                                  <th className="px-4 py-3">Concepto</th>
                                  <th className="px-4 py-3">Compra</th>
                                  <th className="px-4 py-3">Compra MXN</th>
                                  <th className="px-4 py-3">Vigencia compra</th>
                                  <th className="px-4 py-3">IVA</th>
                                  <th className="px-4 py-3">Notas</th>
                                  <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E5E7EB] bg-white">
                                {summary.lines.map((line) => (
                                  <tr key={line.id}>
                                    <td className="px-4 py-3 text-[#475569]">
                                      {line.provider_name || "No asignado"}
                                    </td>
                                    <td className="px-4 py-3 text-[#475569]">
                                      {line.accounting_concept || line.service_name}
                                    </td>
                                    <td className="px-4 py-3 text-[#475569]">
                                      {selectedQuotation.can_view_cost
                                        ? formatCurrency(line.purchase_amount, line.purchase_currency)
                                        : "Sin permiso"}
                                    </td>
                                    <td className="px-4 py-3 text-[#475569]">
                                      {selectedQuotation.can_view_cost
                                        ? formatCurrency(line.purchase_amount_mxn)
                                        : "Sin permiso"}
                                    </td>
                                    <td className="px-4 py-3 text-[#475569]">
                                      {formatDate(line.option_purchase_valid_until)}
                                    </td>
                                    <td className="px-4 py-3 text-[#475569]">{line.vat_rate}%</td>
                                    <td className="px-4 py-3 text-[#475569]">
                                      {line.notes || "No disponible"}
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => void handleDeleteChargeLine(line.id)}
                                          disabled={
                                            deletingChargeId === line.id ||
                                            !selectedQuotation.can_edit_purchase_amount
                                          }
                                          className="rounded-md border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-1.5 font-medium text-[#B91C1C] hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          {deletingChargeId === line.id ? "Eliminando..." : "Eliminar"}
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {showChargeEditor && editingChargeOptionId === summary.optionId ? (
                            <div className="mt-4">
                              <QuotationChargeLineForm
                                title={`Editar ${summary.optionLabel}`}
                                description="Modifica todos los conceptos de la opcion en conjunto. Los cambios se guardan sobre la misma opcion."
                                rows={chargeFormRows}
                                providers={providersForChargeForm}
                                concepts={concepts}
                                serviceType={selectedQuotation.service_type}
                                operationType={selectedQuotation.operation_type}
                                disabled={!canCaptureCharges}
                                disabledReason={pricingChargeDisabledReason}
                                onChangeRow={(draftId, field, value) => {
                                  setChargeFormRows((current) =>
                                    current.map((row) =>
                                      row.draftId === draftId ? { ...row, [field]: value } : row
                                    )
                                  )
                                }}
                                onAddRow={() => {
                                  setChargeFormRows((current) => [
                                    ...current,
                                    createEmptyChargeForm({
                                      purchaseCurrency: current[0]?.purchaseCurrency || "MXN",
                                      purchaseValidUntil: current[0]?.purchaseValidUntil || "",
                                      vatRate: "",
                                    }),
                                  ])
                                }}
                                onRemoveRow={(draftId) => {
                                  setChargeFormRows((current) =>
                                    current.filter((row) => row.draftId !== draftId)
                                  )
                                }}
                                onCancel={() => resetChargeForm()}
                                onSubmit={handleSaveChargeLine}
                                submitLabel="Guardar opcion"
                                loading={savingCharge}
                              />
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {chargeLines.length === 0 ? (
                    <p className="text-sm text-[#6B7280]">
                      Todavia no hay compras capturadas para esta cotizacion.
                    </p>
                  ) : null}
                </section>

                {showChargeEditor && !editingChargeOptionId ? (
                  <QuotationChargeLineForm
                    title="Agregar compra de proveedor"
                    description="Captura uno o varios conceptos de compra para construir una nueva opcion."
                    rows={chargeFormRows}
                    providers={providersForChargeForm}
                    concepts={concepts}
                    serviceType={selectedQuotation.service_type}
                    operationType={selectedQuotation.operation_type}
                    disabled={!canCaptureCharges}
                    disabledReason={pricingChargeDisabledReason}
                    onChangeRow={(draftId, field, value) => {
                      setChargeFormRows((current) =>
                        current.map((row) =>
                          row.draftId === draftId ? { ...row, [field]: value } : row
                        )
                      )
                    }}
                    onAddRow={() => {
                      setChargeFormRows((current) => [
                        ...current,
                        createEmptyChargeForm({
                          purchaseCurrency: current[0]?.purchaseCurrency || "MXN",
                          purchaseValidUntil: current[0]?.purchaseValidUntil || "",
                          vatRate: "",
                        }),
                      ])
                    }}
                    onRemoveRow={(draftId) => {
                      setChargeFormRows((current) =>
                        current.filter((row) => row.draftId !== draftId)
                      )
                    }}
                    onCancel={() => resetChargeForm()}
                    onSubmit={handleSaveChargeLine}
                    submitLabel="Guardar"
                    loading={savingCharge}
                  />
                ) : null}
              </>
            )}
          </div>
        </Modal>
      ) : null}
    </PageContainer>
  )
}
