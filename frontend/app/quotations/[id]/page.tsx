"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useParams } from "next/navigation"
import {
  createBookingFromQuotation,
  createQuotationCargoLine,
  deleteQuotationCargoLine,
  getContactsByClientId,
  updateQuotationOptionValidity,
  getQuotationCargoLines,
  getQuotationById,
  getQuotationChargeLines,
  getQuotationRejectionReasons,
  requestQuotationPricing,
  setQuotationOptionCustomerVisibility,
  updateQuotation,
  updateQuotationOptionSalesAmounts,
  updateQuotationCargoLine,
  updateQuotationStatus,
  type Contact,
  type QuotationCargoLine,
  type QuotationChargeLine,
  type QuotationRejectionReason,
  type QuotationSummary,
  type QuotationStatus,
  type Shipment,
} from "@/lib/db"
import { getCurrentErpUser } from "@/lib/auth"
import { StatusBadge } from "@/components/data/StatusBadge"
import { Modal } from "@/components/data/Modal"
import {
  QuotationCargoLineForm,
  type QuotationCargoLineFormValues,
} from "@/components/forms/QuotationCargoLineForm"
import { QuotationForm, type QuotationFormValues } from "@/components/forms/QuotationForm"
import { PageContainer } from "@/components/layout/PageContainer"
import {
  calculateCbm,
  calculateVolumetricWeightKg,
  estimateFreightClass,
  normalizeWhatsAppLink,
  toNumberOrNull,
} from "@/lib/quotations/calculations"

const statusOptions: Array<{ value: QuotationStatus; label: string }> = [
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

type QuotationDetailState = {
  quotation: QuotationSummary
  chargeLines: QuotationChargeLine[]
  cargoLines: QuotationCargoLine[]
  clientContacts: Contact[]
  rejectionReasons: QuotationRejectionReason[]
}

type StatusFormValues = {
  status: QuotationStatus
  rejectionReasonId: string
  rejectionNotes: string
  cancellationNotes: string
  targetRate: string
}

type SalesOptionSummary = {
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

type SalesDraftValue = {
  sale_amount: string
  sale_currency: string
}

function createCargoDraftId() {
  if (typeof globalThis !== "undefined" && "crypto" in globalThis && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `cargo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function createEmptyCargoForm(existingCargoId: string | null = null): QuotationCargoLineFormValues {
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

function buildCargoFormFromLine(line: QuotationCargoLine): QuotationCargoLineFormValues {
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

function isCargoDraftEmpty(row: QuotationCargoLineFormValues) {
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

function buildCargoPayload(row: QuotationCargoLineFormValues) {
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

function nextCargoSortOrder(cargoLines: QuotationCargoLine[]) {
  return cargoLines.reduce((maxValue, line) => Math.max(maxValue, line.sort_order || 0), 0) + 1
}

function InfoCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#64748B]">
        {title}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
    </section>
  )
}

function InfoField({
  label,
  value,
  wide = false,
}: {
  label: string
  value: string | null | undefined
  wide?: boolean
}) {
  return (
    <div className={wide ? "sm:col-span-2 xl:col-span-4" : ""}>
      <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">{label}</div>
      <div className="mt-1 text-sm font-medium text-[#111827]">{value || "No disponible"}</div>
    </div>
  )
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

function buildQuotationFormValues(quotation: QuotationSummary): QuotationFormValues {
  return {
    pickupAddress: quotation.pickup_address || "",
    deliveryAddress: quotation.delivery_address || "",
    requiredQuoteDate: quotation.required_quote_date || "",
  }
}

function buildStatusFormValues(quotation: QuotationSummary): StatusFormValues {
  return {
    status: quotation.status,
    rejectionReasonId: quotation.rejection_reason_id || "",
    rejectionNotes: quotation.rejection_notes || "",
    cancellationNotes: quotation.cancellation_notes || "",
    targetRate: quotation.target_rate != null ? String(quotation.target_rate) : "",
  }
}

function canShowCommercialPricing(status: QuotationStatus) {
  return ["lista_para_enviar", "enviada", "renegociar_tarifa", "aceptada", "rechazada", "cancelada"].includes(
    status
  )
}

function canShowCommercialActions(status: QuotationStatus) {
  return ["enviada", "aceptada", "rechazada", "cancelada"].includes(status)
}

function canPrepareCommercialProposal(status: QuotationStatus) {
  return ["lista_para_enviar", "renegociar_tarifa"].includes(status)
}

function canEditSalesOption(status: QuotationStatus) {
  return ["lista_para_enviar", "renegociar_tarifa"].includes(status)
}

function getPrimaryContact(contacts: Contact[]) {
  return (
    contacts.find((contact) => contact.status === "activo" && contact.is_primary) ||
    contacts.find((contact) => contact.status === "activo") ||
    null
  )
}

function buildMailToLink(quotation: QuotationSummary, contact: Contact | null, documentUrl: string) {
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

function buildQuoteWhatsAppLink(
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

export default function QuotationDetailPage() {
  const params = useParams()
  const quotationId = typeof params?.id === "string" ? params.id : undefined

  const [details, setDetails] = useState<QuotationDetailState | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCargoModal, setShowCargoModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [savingQuote, setSavingQuote] = useState(false)
  const [savingCargo, setSavingCargo] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [requestingPricing, setRequestingPricing] = useState(false)
  const [creatingBooking, setCreatingBooking] = useState(false)
  const [sendingQuotation, setSendingQuotation] = useState(false)
  const [markingAccepted, setMarkingAccepted] = useState(false)
  const [deletingCargoId, setDeletingCargoId] = useState<string | null>(null)
  const [editingCargoId, setEditingCargoId] = useState<string | null>(null)
  const [showSalesModal, setShowSalesModal] = useState(false)
  const [savingSales, setSavingSales] = useState(false)
  const [savingOptionValidityId, setSavingOptionValidityId] = useState<string | null>(null)
  const [selectedSalesOption, setSelectedSalesOption] = useState<string | null>(null)
  const [updatingVisibleOptionId, setUpdatingVisibleOptionId] = useState<string | null>(null)
  const [salesDraft, setSalesDraft] = useState<Record<string, SalesDraftValue>>({})
  const [salesValidityDrafts, setSalesValidityDrafts] = useState<Record<string, string>>({})
  const [currentUserRoleName, setCurrentUserRoleName] = useState<string | null>(null)
  const [createdShipment, setCreatedShipment] = useState<Shipment | null>(null)
  const [quoteFormValues, setQuoteFormValues] = useState<QuotationFormValues>({
    pickupAddress: "",
    deliveryAddress: "",
    requiredQuoteDate: "",
  })
  const [cargoFormRows, setCargoFormRows] = useState<QuotationCargoLineFormValues[]>([
    createEmptyCargoForm(),
  ])
  const [statusFormValues, setStatusFormValues] = useState<StatusFormValues>({
    status: "pendiente",
    rejectionReasonId: "",
    rejectionNotes: "",
    cancellationNotes: "",
    targetRate: "",
  })
  const detailChargeLines = details?.chargeLines
  const chargeOptionSummaries = useMemo<SalesOptionSummary[]>(() => {
    const grouped = new Map<
      string,
      {
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
    >()

    for (const line of detailChargeLines ?? []) {
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
  }, [detailChargeLines])
  const selectedSalesOptionSummary = useMemo(
    () => chargeOptionSummaries.find((summary) => summary.optionId === selectedSalesOption) ?? null,
    [chargeOptionSummaries, selectedSalesOption]
  )

  async function refreshQuotation(id: string) {
    const quotation = await getQuotationById(id)

    if (!quotation) {
      setDetails(null)
      return null
    }

    setDetails((current) => {
      if (!current) {
        return null
      }

      return {
        ...current,
        quotation,
      }
    })
    setQuoteFormValues(buildQuotationFormValues(quotation))
    setStatusFormValues(buildStatusFormValues(quotation))

    return quotation
  }

  async function refreshChargeLines(id: string) {
    const chargeLines = await getQuotationChargeLines(id)
    setDetails((current) => {
      if (!current) {
        return null
      }

      return {
        ...current,
        chargeLines,
      }
    })
    return chargeLines
  }

  async function refreshCargoLines(id: string) {
    const cargoLines = await getQuotationCargoLines(id)
    setDetails((current) => {
      if (!current) {
        return null
      }

      return {
        ...current,
        cargoLines,
      }
    })
    return cargoLines
  }

  async function loadDetails(id: string) {
    try {
      setLoading(true)
      const quotation = await getQuotationById(id)

      if (!quotation) {
        setDetails(null)
        return
      }

      const [chargeLines, cargoLines, rejectionReasons, clientContacts] = await Promise.all([
        getQuotationChargeLines(id),
        getQuotationCargoLines(id),
        getQuotationRejectionReasons(),
        getContactsByClientId(quotation.client_id),
      ])

      setDetails({
        quotation,
        chargeLines,
        cargoLines,
        clientContacts,
        rejectionReasons,
      })
      setQuoteFormValues(buildQuotationFormValues(quotation))
      setStatusFormValues(buildStatusFormValues(quotation))
    } catch (error) {
      console.error(error)
      setDetails(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!quotationId) {
      return
    }

    void loadDetails(quotationId)
  }, [quotationId])

  useEffect(() => {
    let cancelled = false

    async function loadCurrentUser() {
      try {
        const currentUser = await getCurrentErpUser()
        if (!cancelled) {
          setCurrentUserRoleName(currentUser?.role_name ?? null)
        }
      } catch (error) {
        console.error(error)
      }
    }

    void loadCurrentUser()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setSalesValidityDrafts((current) => {
      const next = { ...current }
      let changed = false

      for (const summary of chargeOptionSummaries) {
        const expectedValue = summary.salesValidUntil ?? ""
        if (next[summary.optionId] !== expectedValue) {
          next[summary.optionId] = expectedValue
          changed = true
        }
      }

      for (const key of Object.keys(next)) {
        if (!chargeOptionSummaries.some((summary) => summary.optionId === key)) {
          delete next[key]
          changed = true
        }
      }

      return changed ? next : current
    })
  }, [chargeOptionSummaries])

  function resetCargoForm() {
    setEditingCargoId(null)
    setCargoFormRows([createEmptyCargoForm()])
  }

  function openSalesOption(summary: SalesOptionSummary) {
    setSelectedSalesOption(summary.optionId)
    setSalesDraft(
      Object.fromEntries(
        summary.lines.map((line) => [
          line.id,
          {
            sale_amount: line.sale_amount != null ? String(line.sale_amount) : "",
            sale_currency: line.sale_currency || line.purchase_currency || "USD",
          },
        ])
      )
    )
    setShowSalesModal(true)
  }

  async function handleRequestPricing() {
    if (!details) {
      return
    }

    try {
      setRequestingPricing(true)
      await requestQuotationPricing(details.quotation.id)
      await refreshQuotation(details.quotation.id)
    } catch (error) {
      console.error(error)
      alert("No se pudo solicitar la cotizacion a pricing")
    } finally {
      setRequestingPricing(false)
    }
  }

  async function handleSaveQuotation() {
    if (!details) {
      return
    }

    try {
      setSavingQuote(true)
      await updateQuotation(details.quotation.id, {
        pickup_address: quoteFormValues.pickupAddress.trim() || null,
        delivery_address: quoteFormValues.deliveryAddress.trim() || null,
        required_quote_date: quoteFormValues.requiredQuoteDate || null,
      })
      setShowEditModal(false)
      await refreshQuotation(details.quotation.id)
    } catch (error) {
      console.error(error)
      alert("No se pudo guardar la cotizacion")
    } finally {
      setSavingQuote(false)
    }
  }

  async function handleSaveCargoLine() {
    if (!details) {
      return
    }

    const rowsToSave = cargoFormRows.filter((row) => !isCargoDraftEmpty(row))

    if (rowsToSave.length === 0) {
      alert("Agrega al menos un tipo de carga")
      return
    }

    try {
      setSavingCargo(true)
      let sortOrderCursor = nextCargoSortOrder(cargoLines)

      for (const row of rowsToSave) {
        if (!row.loadType.trim()) {
          throw new Error("Cada renglon debe incluir un tipo de carga")
        }

        const payload = buildCargoPayload(row)

        if (row.existingCargoId) {
          const existingCargoLine = cargoLines.find((line) => line.id === row.existingCargoId)
          await updateQuotationCargoLine(row.existingCargoId, {
            ...payload,
            sort_order: existingCargoLine?.sort_order ?? 1,
          })
          continue
        }

        await createQuotationCargoLine({
          quotation_id: details.quotation.id,
          ...payload,
          sort_order: sortOrderCursor,
        })
        sortOrderCursor += 1
      }

      setShowCargoModal(false)
      resetCargoForm()
      await refreshCargoLines(details.quotation.id)
    } catch (error) {
      console.error(error)
      alert("No se pudo guardar el detalle de carga")
    } finally {
      setSavingCargo(false)
    }
  }

  async function handleDeleteCargoLine(id: string) {
    const confirmed = window.confirm("Eliminar este detalle de carga?")
    if (!confirmed || !details) {
      return
    }

    try {
      setDeletingCargoId(id)
      await deleteQuotationCargoLine(id)
      await refreshCargoLines(details.quotation.id)
    } catch (error) {
      console.error(error)
      alert("No se pudo eliminar el detalle de carga")
    } finally {
      setDeletingCargoId(null)
    }
  }

  async function handleSaveStatus() {
    if (!details) {
      return
    }

    try {
      setSavingStatus(true)
      await updateQuotationStatus(details.quotation.id, statusFormValues.status, {
        rejectionReasonId: statusFormValues.rejectionReasonId || null,
        rejectionNotes: statusFormValues.rejectionNotes.trim() || null,
        cancellationNotes: statusFormValues.cancellationNotes.trim() || null,
        targetRate: statusFormValues.targetRate ? Number(statusFormValues.targetRate) : null,
      })
      setShowStatusModal(false)
      await refreshQuotation(details.quotation.id)
    } catch (error) {
      console.error(error)
      alert("No se pudo actualizar el estatus")
    } finally {
      setSavingStatus(false)
    }
  }

  async function handleSaveSalesOption() {
    if (!details || !selectedSalesOptionSummary) {
      return
    }

    if (!details.quotation.can_edit_sale_price) {
      alert("Tu rol no tiene permiso para editar la venta de esta cotizacion")
      return
    }

    try {
      setSavingSales(true)
      await updateQuotationOptionSalesAmounts(
        details.quotation.id,
        selectedSalesOptionSummary.optionId,
        salesDraft
      )

      setShowSalesModal(false)
      setSelectedSalesOption(null)
      setSalesDraft({})
      await Promise.all([
        refreshQuotation(details.quotation.id),
        refreshChargeLines(details.quotation.id),
      ])
    } catch (error) {
      console.error(error)
      alert("No se pudo guardar la venta de la opcion")
    } finally {
      setSavingSales(false)
    }
  }

  async function handleSendQuotation() {
    if (!details) {
      return
    }

    if (!details.quotation.can_edit_sale_price) {
      alert("Tu rol no tiene permiso para preparar la salida comercial de esta cotizacion")
      return
    }

    const hasSendableOption = chargeOptionSummaries.some(
      (summary) => summary.includeInCustomerQuote && summary.hasCompleteSale
    )
    if (!hasSendableOption) {
      alert("Primero selecciona al menos una opcion visible al cliente con venta completa")
      return
    }

    try {
      setSendingQuotation(true)
      await updateQuotationStatus(details.quotation.id, "enviada")
      if (typeof window !== "undefined") {
        window.open(documentHref, "_blank", "noopener,noreferrer")
      }
      await refreshQuotation(details.quotation.id)
    } catch (error) {
      console.error(error)
      alert("No se pudo enviar la cotizacion")
    } finally {
      setSendingQuotation(false)
    }
  }

  async function handleMarkAccepted() {
    if (!details) {
      return
    }

    try {
      setMarkingAccepted(true)
      await updateQuotationStatus(details.quotation.id, "aceptada")
      await refreshQuotation(details.quotation.id)
    } catch (error) {
      console.error(error)
      alert("No se pudo marcar la cotizacion como aceptada")
    } finally {
      setMarkingAccepted(false)
    }
  }

  async function handleToggleCustomerOption(summary: SalesOptionSummary) {
    if (!details) {
      return
    }

    try {
      setUpdatingVisibleOptionId(summary.optionId)
      await setQuotationOptionCustomerVisibility(summary.optionId, !summary.includeInCustomerQuote)
      await Promise.all([
        refreshQuotation(details.quotation.id),
        refreshChargeLines(details.quotation.id),
      ])
    } catch (error) {
      console.error(error)
      alert("No se pudo actualizar la visibilidad comercial de la opcion")
    } finally {
      setUpdatingVisibleOptionId(null)
    }
  }

  async function handleSaveSalesValidity(summary: SalesOptionSummary) {
    if (!details || currentUserRoleName !== "Admin") {
      return
    }

    if (!salesValidityDrafts[summary.optionId]) {
      alert("Captura la nueva vigencia de venta antes de guardar el override")
      return
    }

    try {
      setSavingOptionValidityId(summary.optionId)
      await updateQuotationOptionValidity(summary.optionId, {
        sales_valid_until: salesValidityDrafts[summary.optionId] || null,
        override_sales_valid_until: true,
      })
      await refreshChargeLines(details.quotation.id)
    } catch (error) {
      console.error(error)
      alert("No se pudo actualizar la vigencia de venta de esta opcion")
    } finally {
      setSavingOptionValidityId(null)
    }
  }

  async function handleCreateBooking() {
    if (!details) {
      return
    }

    try {
      setCreatingBooking(true)
      const shipment = await createBookingFromQuotation(details.quotation.id)
      setCreatedShipment(shipment)
      alert(
        shipment.shipment_reference
          ? `Booking creado: ${shipment.shipment_reference}`
          : "Booking creado correctamente"
      )
    } catch (error) {
      console.error(error)
      alert("No se pudo crear el booking")
    } finally {
      setCreatingBooking(false)
    }
  }

  if (!quotationId) {
    return (
      <PageContainer title="Quotation" description="Invalid quotation id.">
        <p className="text-sm text-[#6B7280]">Quotation id is missing from the URL.</p>
      </PageContainer>
    )
  }

  if (loading && !details) {
    return (
      <PageContainer title="Quotation" description="Loading quotation data...">
        <p className="text-sm text-[#6B7280]">Loading quotation information.</p>
      </PageContainer>
    )
  }

  if (!details) {
    return (
      <PageContainer title="Quotation" description="Quotation not found.">
        <p className="text-sm text-[#6B7280]">We could not find a quotation with this id.</p>
      </PageContainer>
    )
  }

  const { quotation, cargoLines, clientContacts, rejectionReasons } = details
  const canViewCost = quotation.can_view_cost ?? false
  const canViewSalePrice = quotation.can_view_sale_price ?? false
  const canEditSalePrice = quotation.can_edit_sale_price ?? false
  const canViewExpectedProfit = quotation.can_view_expected_profit ?? false
  const canSeePricingOutcome = canShowCommercialPricing(quotation.status)
  const canSeeCommercialActions = canShowCommercialActions(quotation.status)
  const canPrepareCommercial = canPrepareCommercialProposal(quotation.status)
  const canEditCommercialSale = canEditSalesOption(quotation.status) && canEditSalePrice
  const hasSendableOption = chargeOptionSummaries.some(
    (summary) => summary.includeInCustomerQuote && summary.hasCompleteSale
  )

  const primaryContact = getPrimaryContact(clientContacts)
  const documentHref = `/quotations/${quotation.id}/document/pdf`
  const documentUrl =
    typeof window === "undefined" ? documentHref : `${window.location.origin}${documentHref}`
  const mailToLink = buildMailToLink(quotation, primaryContact, documentUrl)
  const whatsAppLink = buildQuoteWhatsAppLink(quotation, primaryContact, documentUrl)

  return (
    <PageContainer
      title={quotation.reference_number || "Quotation"}
      description={`Cotizacion comercial para ${quotation.client_name || "cliente"}.`}
      actions={
        <>
          <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2">
            {quotation.status === "borrador" ? (
              <>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#1D4ED8]">
                  Captura interna
                </div>
                <div className="mt-2 text-sm font-medium text-[#1E3A8A]">
                  Completa ruta e informacion de carga antes de solicitarla a pricing.
                </div>
              </>
            ) : (
              <>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#1D4ED8]">
                  Estatus de la cotizacion
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <StatusBadge status={quotation.status} />
                  <span className="text-sm font-medium text-[#1E3A8A]">
                    {quotation.pricing_owner_name || "Sin owner de pricing"}
                  </span>
                </div>
              </>
            )}
          </div>
          <Link
            href="/quotations"
            className="rounded-md border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-medium text-[#111827] hover:bg-[#F9FAFB]"
          >
            Back
          </Link>
          {quotation.status === "borrador" ? (
            <button
              type="button"
              onClick={() => void handleRequestPricing()}
              disabled={requestingPricing}
              className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {requestingPricing ? "Solicitando..." : "Solicitar a pricing"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setQuoteFormValues(buildQuotationFormValues(quotation))
              setShowEditModal(true)
            }}
            className="rounded-md border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-medium text-[#111827] hover:bg-[#F9FAFB]"
          >
            Editar informacion
          </button>
          {quotation.status !== "borrador" ? (
            <button
              type="button"
              onClick={() => {
                setStatusFormValues(buildStatusFormValues(quotation))
                setShowStatusModal(true)
              }}
              className="rounded-md border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-medium text-[#111827] hover:bg-[#F9FAFB]"
            >
              Actualizar estatus
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              resetCargoForm()
              setShowCargoModal(true)
            }}
            className="rounded-md border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-medium text-[#111827] hover:bg-[#F9FAFB]"
          >
            Anadir detalle de carga
          </button>
          <Link
            href={documentHref}
            target="_blank"
            className="rounded-md border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-medium text-[#111827] hover:bg-[#F9FAFB]"
          >
            Documento / PDF
          </Link>
          {quotation.status === "aceptada" ? (
            <button
              type="button"
              onClick={() => void handleCreateBooking()}
              disabled={creatingBooking}
              className="rounded-md bg-[#0F766E] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creatingBooking ? "Creando booking..." : "Crear booking"}
            </button>
          ) : null}
        </>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Cliente
            </div>
            <div className="mt-2 text-base font-semibold text-[#111827]">
              {quotation.client_name || "No asignado"}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Servicio
            </div>
            <div className="mt-2 text-base font-semibold text-[#111827]">
              {quotation.service_type || "No definido"}
            </div>
          </div>
          {canViewCost && quotation.status === "aceptada" ? (
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Costo estimado
              </div>
              <div className="mt-2 text-base font-semibold text-[#111827]">
                {formatCurrency(quotation.estimated_cost)}
              </div>
            </div>
          ) : null}
          {canViewExpectedProfit && quotation.status === "aceptada" ? (
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Profit estimado
              </div>
              <div className="mt-2 text-base font-semibold text-[#111827]">
                {formatCurrency(quotation.expected_profit)}
              </div>
            </div>
          ) : null}
        </section>

        <InfoCard title="Informacion de la cotizacion">
          <InfoField label="Referencia" value={quotation.reference_number} />
          <InfoField label="Cliente" value={quotation.client_name} />
          <InfoField label="Oportunidad" value={quotation.opportunity_title} />
          <InfoField label="Pricing owner" value={quotation.pricing_owner_name} />
          <InfoField label="Tipo de servicio" value={quotation.service_type} />
          <InfoField label="Tipo de transporte" value={quotation.transport_type} />
          <InfoField label="Tipo de operacion" value={quotation.operation_type} />
          <InfoField label="Incoterm" value={quotation.incoterm_code} />
          <InfoField label="Origen" value={quotation.origin} />
          <InfoField label="Destino" value={quotation.destination} />
          <InfoField label="UN/LOCODE origen" value={quotation.origin_unlocode} />
          <InfoField label="UN/LOCODE destino" value={quotation.destination_unlocode} />
        </InfoCard>

        <InfoCard title="Ruta">
          <InfoField label="Direccion de recoleccion" value={quotation.pickup_address} wide />
          <InfoField label="Direccion de entrega" value={quotation.delivery_address} wide />
        </InfoCard>

        <section className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">Informacion de carga</h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                Captura piezas y dimensiones por renglon para copiar o registrar la informacion de carga.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetCargoForm()
                setShowCargoModal(true)
              }}
              className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8]"
            >
              Anadir detalle
            </button>
          </div>

          {cargoLines.length === 0 ? (
            <p className="text-sm text-[#6B7280]">
              Todavia no hay detalles de carga registrados para esta cotizacion.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
              <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  <tr>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Cantidad</th>
                    <th className="px-4 py-3">Dimensiones</th>
                    <th className="px-4 py-3">Peso</th>
                    <th className="px-4 py-3">Commodities</th>
                    <th className="px-4 py-3">CBM</th>
                    <th className="px-4 py-3">KG / VOL</th>
                    <th className="px-4 py-3">Clase</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] bg-white">
                  {cargoLines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-3 text-[#475569]">{line.load_type}</td>
                      <td className="px-4 py-3 text-[#475569]">{line.piece_count ?? "—"}</td>
                      <td className="px-4 py-3 text-[#475569]">
                        {[line.width, line.length, line.height].every((value) => value != null)
                          ? `${line.width} x ${line.length} x ${line.height} cm`
                          : "No disponible"}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {line.weight != null ? `${line.weight} kg` : "No disponible"}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {line.commodities || "No disponible"}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {line.cbm != null ? line.cbm.toFixed(3) : "No disponible"}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {line.volumetric_weight_kg != null
                          ? line.volumetric_weight_kg.toFixed(2)
                          : "No disponible"}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {line.freight_class || "No disponible"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCargoId(line.id)
                              setCargoFormRows([buildCargoFormFromLine(line)])
                              setShowCargoModal(true)
                            }}
                            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 font-medium text-[#111827] hover:bg-[#F8FAFC]"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteCargoLine(line.id)}
                            disabled={deletingCargoId === line.id}
                            className="rounded-md border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-1.5 font-medium text-[#B91C1C] hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingCargoId === line.id ? "Eliminando..." : "Eliminar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <InfoCard title="Detalles de cotizacion">
          <InfoField label="Fecha creada" value={quotation.created_at} />
          <InfoField label="Requieren cotizacion" value={quotation.required_quote_date} />
          <InfoField label="Target rate" value={quotation.target_rate != null ? formatCurrency(quotation.target_rate) : null} />
          <InfoField label="Motivo rechazo" value={quotation.rejection_reason} />
          <InfoField label="Notas rechazo" value={quotation.rejection_notes} wide />
          <InfoField label="Notas cancelacion" value={quotation.cancellation_notes} wide />
        </InfoCard>

        <section className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Costos</h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              Opciones de costo preparadas para esta cotizacion.
            </p>
          </div>

          {canSeePricingOutcome ? (
            <div>
              <section className="space-y-4 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-5">
                <div>
                  <h3 className="text-base font-semibold text-[#111827]">Opciones de costo</h3>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    Pricing captura una o varias opciones de compra y CRM decide cuales se presentan al cliente.
                  </p>
                </div>

                {chargeOptionSummaries.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {chargeOptionSummaries.map((summary) => (
                      <div
                        key={summary.optionId}
                        className="rounded-xl border border-[#E5E7EB] bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                              {summary.optionLabel}
                            </div>
                            <div className="mt-1 text-xs text-[#64748B]">
                              {summary.lines.length} cargo(s)
                            </div>
                          </div>
                          {canEditCommercialSale ? (
                            <label className="flex items-center gap-2 text-xs font-medium text-[#475569]">
                              <input
                                type="checkbox"
                                checked={summary.includeInCustomerQuote}
                                disabled={updatingVisibleOptionId === summary.optionId}
                                onChange={() => void handleToggleCustomerOption(summary)}
                              />
                              Mostrar al cliente
                            </label>
                          ) : (
                            <div className="text-xs text-[#64748B]">
                              {summary.includeInCustomerQuote ? "Visible al cliente" : "Oculta al cliente"}
                            </div>
                          )}
                        </div>
                        {canViewCost ? (
                          <div className="mt-2 text-lg font-semibold text-[#111827]">
                            {formatCurrency(summary.totalPurchaseMxn)}
                          </div>
                        ) : null}
                        <div className="mt-1 text-sm text-[#6B7280]">
                          Vigencia compra: {summary.purchaseValidUntil || "No disponible"}
                        </div>
                        <div className="mt-1 text-sm text-[#6B7280]">
                          Vigencia venta: {summary.salesValidUntil || "No disponible"}
                        </div>
                        {summary.salesValidityOverridden ? (
                          <div className="mt-1 text-xs font-medium text-[#7C2D12]">
                            Vigencia de venta ajustada manualmente por Admin
                          </div>
                        ) : null}
                        <div className="mt-1 text-sm text-[#6B7280]">
                          Proveedores:{" "}
                          {summary.providers.size > 0
                            ? Array.from(summary.providers).join(", ")
                            : "Sin proveedor"}
                        </div>
                        {canViewSalePrice ? (
                          <div className="mt-1 text-sm text-[#6B7280]">
                            Subtotal venta MXN: {formatCurrency(summary.totalSaleMxn)}
                          </div>
                        ) : null}
                        {canViewExpectedProfit ? (
                          <div className="mt-1 text-sm text-[#6B7280]">
                            Profit MXN: {formatCurrency(summary.totalProfitMxn)}
                          </div>
                        ) : null}
                        {canViewSalePrice ? (
                          <div className="mt-1 text-sm text-[#6B7280]">
                            Total con IVA MXN:{" "}
                            {formatCurrency(
                              summary.lines.reduce(
                                (sum, line) =>
                                  sum +
                                  ((line.sale_amount_mxn ?? line.sale_amount ?? 0) *
                                    (1 + (line.vat_rate ?? 0) / 100)),
                                0
                              )
                            )}
                          </div>
                        ) : null}
                        {currentUserRoleName === "Admin" ? (
                          <div className="mt-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                              Override de vigencia de venta
                            </div>
                            <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                              <input
                                type="date"
                                className="w-full rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                                value={salesValidityDrafts[summary.optionId] ?? ""}
                                onChange={(event) =>
                                  setSalesValidityDrafts((current) => ({
                                    ...current,
                                    [summary.optionId]: event.target.value,
                                  }))
                                }
                              />
                              <button
                                type="button"
                                onClick={() => void handleSaveSalesValidity(summary)}
                                disabled={savingOptionValidityId === summary.optionId}
                                className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm font-medium text-[#111827] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {savingOptionValidityId === summary.optionId ? "Guardando..." : "Guardar vigencia"}
                              </button>
                            </div>
                            <div className="mt-2 text-xs text-[#64748B]">
                              Si no se ajusta manualmente, la vigencia de venta replica la vigencia de compra.
                            </div>
                          </div>
                        ) : null}
                        {canEditCommercialSale ? (
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => openSalesOption(summary)}
                              className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm font-medium text-[#111827] hover:bg-[#F8FAFC]"
                            >
                              {summary.hasCompleteSale ? "Editar venta" : "Anadir venta"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#6B7280]">
                    Pricing todavia no ha cargado opciones de costo para esta cotizacion.
                  </p>
                )}
              </section>
            </div>
          ) : (
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-4 text-sm text-[#475569]">
              Los costos apareceran aqui cuando Pricing tome la cotizacion y capture sus opciones.
            </div>
          )}
        </section>

        <section>
          <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#111827]">Seguimiento comercial</h2>
                <p className="mt-1 text-sm text-[#6B7280]">
                  {canSeeCommercialActions
                    ? "Genera el documento comercial y compártelo con el contacto principal del cliente."
                    : canPrepareCommercial
                      ? "Pricing ya devolvio opciones. Agrega la venta por opcion y luego envia la cotizacion al cliente."
                      : "Esta cotizacion sigue en captura interna o en pricing. Las acciones comerciales se habilitan cuando pricing devuelve la propuesta."}
                </p>
              </div>
              <StatusBadge status={quotation.status} />
            </div>

            {canSeeCommercialActions ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                    Contacto principal
                  </div>
                  <div className="mt-2 text-sm font-medium text-[#111827]">
                    {primaryContact?.name || "No disponible"}
                  </div>
                  <div className="mt-1 text-sm text-[#475569]">{primaryContact?.email || "Sin correo"}</div>
                  <div className="mt-1 text-sm text-[#475569]">{primaryContact?.phone || "Sin telefono"}</div>
                </div>

                <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                    Documento comercial
                  </div>
                  <div className="mt-2 text-sm text-[#475569]">
                    El documento excluye proveedor y monto compra para vista cliente.
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={documentHref}
                      target="_blank"
                      className="rounded-md bg-[#2563EB] px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8]"
                    >
                      Abrir documento
                    </Link>
                    {mailToLink ? (
                      <a
                        href={mailToLink}
                        className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm font-medium text-[#111827] hover:bg-[#F8FAFC]"
                      >
                        Enviar por correo
                      </a>
                    ) : null}
                    {whatsAppLink ? (
                      <a
                        href={whatsAppLink}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-[#86EFAC] bg-[#F0FDF4] px-3 py-2 text-sm font-medium text-[#166534] hover:bg-[#DCFCE7]"
                      >
                        Enviar por WhatsApp
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : canPrepareCommercial ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                    Contacto principal
                  </div>
                  <div className="mt-2 text-sm font-medium text-[#111827]">
                    {primaryContact?.name || "No disponible"}
                  </div>
                  <div className="mt-1 text-sm text-[#475569]">{primaryContact?.email || "Sin correo"}</div>
                  <div className="mt-1 text-sm text-[#475569]">{primaryContact?.phone || "Sin telefono"}</div>
                </div>

                <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                    Salida comercial
                  </div>
                  <div className="mt-2 text-sm text-[#475569]">
                    La cotizacion puede enviarse cuando al menos una opcion tenga venta completa.
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSendQuotation()}
                      disabled={sendingQuotation || !hasSendableOption || !canEditSalePrice}
                      className="rounded-md bg-[#2563EB] px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sendingQuotation ? "Enviando..." : "Enviar cotizacion"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFormValues({
                          ...buildStatusFormValues(quotation),
                          status: "renegociar_tarifa",
                          rejectionReasonId: "",
                          cancellationNotes: "",
                        })
                        setShowStatusModal(true)
                      }}
                      className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm font-medium text-[#111827] hover:bg-[#F8FAFC]"
                    >
                      Preparar renegociacion
                    </button>
                  </div>
                  {!canEditSalePrice ? (
                    <div className="mt-3 text-sm text-[#92400E]">
                      Tu rol no tiene permiso para capturar venta o enviar esta cotizacion al cliente.
                    </div>
                  ) : !hasSendableOption ? (
                    <div className="mt-3 text-sm text-[#92400E]">
                      Aun no hay una opcion con venta capturada para enviar al cliente.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-4 text-sm text-[#475569]">
                Cuando la cotizacion quede <span className="font-medium text-[#111827]">lista para enviar</span>,
                aqui podras revisar las opciones preparadas por pricing y continuar con la salida comercial.
              </div>
            )}

            {createdShipment ? (
              <div className="mt-4 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3 text-sm text-[#065F46]">
                Booking generado correctamente: {createdShipment.shipment_reference || createdShipment.id}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {quotation.status === "enviada" ? (
                <button
                  type="button"
                  onClick={() => void handleMarkAccepted()}
                  disabled={markingAccepted}
                  className="rounded-md bg-[#0F766E] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {markingAccepted ? "Actualizando..." : "Marcar aceptada"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void handleCreateBooking()}
                disabled={creatingBooking || quotation.status !== "aceptada"}
                className="rounded-md bg-[#0F766E] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingBooking ? "Creando booking..." : "Convertir a booking"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFormValues({
                    ...buildStatusFormValues(quotation),
                    status: "renegociar_tarifa",
                    rejectionReasonId: "",
                    cancellationNotes: "",
                  })
                  setShowStatusModal(true)
                }}
                className="rounded-md border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-medium text-[#111827] hover:bg-[#F8FAFC]"
              >
                Renegociar
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFormValues({
                    ...buildStatusFormValues(quotation),
                    status: "rechazada",
                    cancellationNotes: "",
                  })
                  setShowStatusModal(true)
                }}
                className="rounded-md border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-2 text-sm font-medium text-[#B91C1C] hover:bg-[#FEE2E2]"
              >
                Rechazada
              </button>
            </div>
          </section>

        </section>
      </div>

      {showSalesModal && selectedSalesOptionSummary && canEditSalePrice ? (
        <Modal
          title={`Venta comercial · ${selectedSalesOptionSummary.optionLabel}`}
          description="Ventas define la propuesta comercial por opcion sin modificar la compra capturada por pricing."
          onClose={() => {
            setShowSalesModal(false)
            setSelectedSalesOption(null)
            setSalesDraft({})
          }}
        >
          <section className="space-y-4 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Proveedor / opcion
                </div>
                <div className="mt-1 text-sm font-medium text-[#111827]">
                  {selectedSalesOptionSummary.optionLabel}
                </div>
                <div className="mt-1 text-xs text-[#64748B]">
                  {selectedSalesOptionSummary.includeInCustomerQuote
                    ? "Visible al cliente"
                    : "Oculta al cliente"}
                </div>
              </div>
              {canViewCost ? (
                <div className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                    Compra total MXN
                  </div>
                  <div className="mt-1 text-sm font-medium text-[#111827]">
                    {formatCurrency(selectedSalesOptionSummary.totalPurchaseMxn)}
                  </div>
                </div>
              ) : null}
              <div className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Proveedores
                </div>
                <div className="mt-1 text-sm font-medium text-[#111827]">
                  {selectedSalesOptionSummary.providers.size > 0
                    ? Array.from(selectedSalesOptionSummary.providers).join(", ")
                    : "Sin proveedor"}
                </div>
              </div>
              <div className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Vigencia compra
                </div>
                <div className="mt-1 text-sm font-medium text-[#111827]">
                  {selectedSalesOptionSummary.purchaseValidUntil || "No disponible"}
                </div>
              </div>
              <div className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Vigencia venta
                </div>
                <div className="mt-1 text-sm font-medium text-[#111827]">
                  {selectedSalesOptionSummary.salesValidUntil || "No disponible"}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
              <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                <thead className="bg-white text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  <tr>
                    <th className="px-4 py-3">Proveedor</th>
                    <th className="px-4 py-3">Concepto</th>
                    {canViewCost ? <th className="px-4 py-3">Compra</th> : null}
                    <th className="px-4 py-3">Venta</th>
                    {canViewExpectedProfit ? <th className="px-4 py-3">Profit estimado</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] bg-white">
                  {selectedSalesOptionSummary.lines.map((line) => {
                    const saleValue = salesDraft[line.id]?.sale_amount
                      ? Number(salesDraft[line.id]?.sale_amount)
                      : null
                    const saleCurrency =
                      salesDraft[line.id]?.sale_currency || line.sale_currency || "USD"
                    const profitValue =
                      saleValue != null && line.purchase_amount != null
                        ? saleValue - line.purchase_amount
                        : null

                    return (
                      <tr key={line.id}>
                        <td className="px-4 py-3 text-[#475569]">
                          {line.provider_name || "No asignado"}
                        </td>
                        <td className="px-4 py-3 text-[#475569]">
                          {line.accounting_concept || line.service_name}
                        </td>
                        {canViewCost ? (
                          <td className="px-4 py-3 text-[#475569]">
                            {formatCurrency(line.purchase_amount, line.purchase_currency)}
                            <div className="text-xs text-[#94A3B8]">
                              {formatCurrency(line.purchase_amount_mxn)}
                            </div>
                          </td>
                        ) : null}
                        <td className="px-4 py-3">
                          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_108px]">
                            <input
                              className="w-full rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                              placeholder="Venta"
                              inputMode="decimal"
                              value={salesDraft[line.id]?.sale_amount ?? ""}
                              onChange={(event) =>
                                setSalesDraft((current) => ({
                                  ...current,
                                  [line.id]: {
                                    sale_amount: event.target.value,
                                    sale_currency:
                                      current[line.id]?.sale_currency ||
                                      line.sale_currency ||
                                      "USD",
                                  },
                                }))
                              }
                            />
                            <select
                              className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                              value={saleCurrency}
                              onChange={(event) =>
                                setSalesDraft((current) => ({
                                  ...current,
                                  [line.id]: {
                                    sale_amount: current[line.id]?.sale_amount ?? "",
                                    sale_currency: event.target.value,
                                  },
                                }))
                              }
                            >
                              <option value="MXN">MXN</option>
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                            </select>
                          </div>
                        </td>
                        {canViewExpectedProfit ? (
                          <td className="px-4 py-3 text-[#475569]">
                            {profitValue != null
                              ? `${formatCurrency(profitValue, saleCurrency)} · MXN pendiente`
                              : "No disponible"}
                          </td>
                        ) : null}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void handleSaveSalesOption()}
                disabled={savingSales}
                className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingSales ? "Guardando..." : "Guardar venta"}
              </button>
            </div>
          </section>
        </Modal>
      ) : null}

      {showEditModal ? (
        <Modal
          title="Editar cotizacion"
          description="Actualiza los detalles de carga y las fechas comerciales sin duplicar la ficha principal."
          onClose={() => {
            setShowEditModal(false)
            setQuoteFormValues(buildQuotationFormValues(quotation))
          }}
        >
          <QuotationForm
            title="Perfil de cotizacion"
            description="Wave 1 mantiene una sola ficha limpia con popup de edicion."
            values={quoteFormValues}
            clientName={quotation.client_name}
            origin={quotation.origin}
            destination={quotation.destination}
            serviceType={quotation.service_type}
            transportType={quotation.transport_type}
            operationType={quotation.operation_type}
            incotermCode={quotation.incoterm_code || null}
            createdAt={quotation.created_at}
            onChange={(field, value) => {
              setQuoteFormValues((current) => ({
                ...current,
                [field]: value,
              }))
            }}
            onSubmit={handleSaveQuotation}
            submitLabel="Guardar cotizacion"
            loading={savingQuote}
          />
        </Modal>
      ) : null}

      {showStatusModal ? (
        <Modal
          title="Actualizar estatus"
          description="Mueve la cotizacion entre CRM y Pricing usando las reglas comerciales definidas."
          onClose={() => {
            setShowStatusModal(false)
            setStatusFormValues(buildStatusFormValues(quotation))
          }}
        >
          <section className="space-y-4 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
            <select
              className="w-full rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              value={statusFormValues.status}
              onChange={(event) =>
                setStatusFormValues((current) => ({
                  ...current,
                  status: event.target.value as QuotationStatus,
                }))
              }
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {statusFormValues.status === "rechazada" ? (
              <>
                <select
                  className="w-full rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  value={statusFormValues.rejectionReasonId}
                  onChange={(event) =>
                    setStatusFormValues((current) => ({
                      ...current,
                      rejectionReasonId: event.target.value,
                    }))
                  }
                >
                  <option value="">Motivo de rechazo</option>
                  {rejectionReasons.map((reason) => (
                    <option key={reason.id} value={reason.id}>
                      {reason.reason}
                    </option>
                  ))}
                </select>
                <textarea
                  className="min-h-[100px] w-full rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  placeholder="Notas de rechazo"
                  value={statusFormValues.rejectionNotes}
                  onChange={(event) =>
                    setStatusFormValues((current) => ({
                      ...current,
                      rejectionNotes: event.target.value,
                    }))
                  }
                />
              </>
            ) : null}

            {statusFormValues.status === "cancelada" ? (
              <textarea
                className="min-h-[100px] w-full rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                placeholder="Notas de cancelacion"
                value={statusFormValues.cancellationNotes}
                onChange={(event) =>
                  setStatusFormValues((current) => ({
                    ...current,
                    cancellationNotes: event.target.value,
                  }))
                }
              />
            ) : null}

            {statusFormValues.status === "renegociar_tarifa" ? (
              <>
                <input
                  className="w-full rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  placeholder="Tarifa target"
                  inputMode="decimal"
                  value={statusFormValues.targetRate}
                  onChange={(event) =>
                    setStatusFormValues((current) => ({
                      ...current,
                      targetRate: event.target.value,
                    }))
                  }
                />
                <textarea
                  className="min-h-[100px] w-full rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  placeholder="Comentario para pricing"
                  value={statusFormValues.rejectionNotes}
                  onChange={(event) =>
                    setStatusFormValues((current) => ({
                      ...current,
                      rejectionNotes: event.target.value,
                    }))
                  }
                />
              </>
            ) : null}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void handleSaveStatus()}
                disabled={savingStatus}
                className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingStatus ? "Guardando..." : "Guardar estatus"}
              </button>
            </div>
          </section>
        </Modal>
      ) : null}

      {showCargoModal ? (
        <Modal
          title={editingCargoId ? "Editar detalle de carga" : "Anadir detalle de carga"}
          description="Captura pallets, cajas y dimensiones segun el tipo de servicio para la cotizacion."
          onClose={() => {
            setShowCargoModal(false)
            resetCargoForm()
          }}
        >
          <QuotationCargoLineForm
            title={editingCargoId ? "Editar consolidacion de carga" : "Nueva consolidacion de carga"}
            description="Usa dimensiones en cm y peso en kg para estandarizar los calculos."
            serviceType={quotation.service_type}
            rows={cargoFormRows}
            existingLines={cargoLines}
            onChangeRow={(draftId, field, value) => {
              setCargoFormRows((current) =>
                current.map((row) =>
                  row.draftId === draftId ? { ...row, [field]: value } : row
                )
              )
            }}
            onAddRow={() => {
              setCargoFormRows((current) => [...current, createEmptyCargoForm()])
            }}
            onRemoveRow={(draftId) => {
              setCargoFormRows((current) =>
                current.filter((row) => row.draftId !== draftId)
              )
            }}
            onSubmit={handleSaveCargoLine}
            submitLabel={editingCargoId ? "Guardar cambios" : "Guardar detalle"}
            loading={savingCargo}
          />
        </Modal>
      ) : null}
    </PageContainer>
  )
}
