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
  createQuotationChargeLine,
  deleteQuotationChargeLine,
  getProviderPricingCandidates,
  getProviders,
  getQuotationChargeLines,
  getQuotations,
  getSalesAccountingConcepts,
  takeQuotationForPricing,
  updateQuotationChargeLine,
  updateQuotationStatus,
  type Provider,
  type ProviderPricingCandidate,
  type QuotationChargeLine,
  type QuotationSummary,
  type SalesAccountingConcept,
} from "@/lib/db"

const statusOptions = ["pendiente", "cotizando", "lista_para_enviar", "renegociar_tarifa"]

const emptyChargeForm: QuotationChargeLineFormValues = {
  optionLabel: "Opcion 1",
  providerId: "",
  salesAccountingConceptId: "",
  purchaseAmount: "",
  saleAmount: "",
  vatRate: "",
  notes: "",
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) {
    return "No disponible"
  }

  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
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

function buildProviderEmailLink(candidate: ProviderPricingCandidate, quotation: QuotationSummary) {
  const primaryContact = getPrimaryProviderContact(candidate)
  const targetEmail = primaryContact?.email || candidate.provider.company_email

  if (!targetEmail) {
    return null
  }

  const subject = encodeURIComponent(
    `Solicitud de tarifa ${quotation.reference_number || ""} - ${quotation.service_type || ""}`
  )
  const body = encodeURIComponent(
    [
      `Hola ${primaryContact?.name || candidate.provider.name},`,
      "",
      `Solicitamos tarifa para la cotizacion ${quotation.reference_number || ""}.`,
      `Cliente: ${quotation.client_name || ""}`,
      `Servicio: ${quotation.service_type || ""} ${quotation.transport_type ? `/ ${quotation.transport_type}` : ""}`.trim(),
      `Operacion: ${quotation.operation_type || ""}`,
      `Incoterm: ${quotation.incoterm_code || ""}`,
      `Ruta: ${quotation.origin || ""} -> ${quotation.destination || ""}`,
      `Pickup: ${quotation.pickup_address || ""}`,
      `Entrega: ${quotation.delivery_address || ""}`,
      `Commodities: ${quotation.commodities || ""}`,
      `Cantidad: ${quotation.quantity ?? ""}`,
      `Peso: ${quotation.weight ?? ""}`,
      `Fecha requerida: ${quotation.required_quote_date || ""}`,
      `Vigencia deseada de compra: ${quotation.purchase_valid_until || ""}`,
      "",
      "Quedamos atentos a su tarifa.",
      "Priority Logistics",
    ].join("\n")
  )

  return `mailto:${targetEmail}?subject=${subject}&body=${body}`
}

function buildProviderWhatsAppLink(
  candidate: ProviderPricingCandidate,
  quotation: QuotationSummary
) {
  const primaryContact = getPrimaryProviderContact(candidate)
  const base =
    normalizeWhatsAppLink(primaryContact?.phone) ||
    normalizeWhatsAppLink(candidate.provider.corporate_phone)

  if (!base) {
    return null
  }

  const text = encodeURIComponent(
    [
      `Hola ${primaryContact?.name || candidate.provider.name},`,
      `Solicitamos tarifa para la cotizacion ${quotation.reference_number || ""}.`,
      `Cliente: ${quotation.client_name || ""}`,
      `Servicio: ${quotation.service_type || ""} ${quotation.transport_type ? `/ ${quotation.transport_type}` : ""}`.trim(),
      `Operacion: ${quotation.operation_type || ""}`,
      `Incoterm: ${quotation.incoterm_code || ""}`,
      `Ruta: ${quotation.origin || ""} -> ${quotation.destination || ""}`,
      `Pickup: ${quotation.pickup_address || ""}`,
      `Entrega: ${quotation.delivery_address || ""}`,
      `Commodities: ${quotation.commodities || ""}`,
      `Peso: ${quotation.weight ?? ""}`,
      `Vigencia deseada de compra: ${quotation.purchase_valid_until || ""}`,
    ].join("\n")
  )

  return `${base}&text=${text}`
}

export default function PricingQuotationsPage() {
  const [items, setItems] = useState<QuotationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [takingId, setTakingId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const [statusFilter, setStatusFilter] = useState("all")

  const [selectedQuotation, setSelectedQuotation] = useState<QuotationSummary | null>(null)
  const [showProvidersModal, setShowProvidersModal] = useState(false)
  const [showChargesModal, setShowChargesModal] = useState(false)
  const [providerCandidates, setProviderCandidates] = useState<ProviderPricingCandidate[]>([])
  const [allProviders, setAllProviders] = useState<Provider[]>([])
  const [chargeLines, setChargeLines] = useState<QuotationChargeLine[]>([])
  const [concepts, setConcepts] = useState<SalesAccountingConcept[]>([])
  const [loadingProviders, setLoadingProviders] = useState(false)
  const [loadingCharges, setLoadingCharges] = useState(false)
  const [savingCharge, setSavingCharge] = useState(false)
  const [deletingChargeId, setDeletingChargeId] = useState<string | null>(null)
  const [editingChargeId, setEditingChargeId] = useState<string | null>(null)
  const [movingToReadyId, setMovingToReadyId] = useState<string | null>(null)
  const [chargeFormValues, setChargeFormValues] =
    useState<QuotationChargeLineFormValues>(emptyChargeForm)

  async function loadItems(search = "", status = "all") {
    try {
      setLoading(true)
      const data = await getQuotations({
        scope: "pricing",
        query: search,
        status,
      })
      setItems(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadItems(deferredQuery, statusFilter)
  }, [deferredQuery, statusFilter])

  function resetChargeForm() {
    setEditingChargeId(null)
    setChargeFormValues(emptyChargeForm)
  }

  async function handleTakeQuotation(id: string) {
    try {
      setTakingId(id)
      await takeQuotationForPricing(id)
      await loadItems(deferredQuery, statusFilter)
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
      const candidates = await getProviderPricingCandidates({
        serviceType: quotation.service_type,
        transportType: quotation.transport_type,
      })
      setProviderCandidates(candidates)
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

      const [lines, accountingConcepts, candidates, providers] = await Promise.all([
        getQuotationChargeLines(quotation.id),
        getSalesAccountingConcepts(),
        getProviderPricingCandidates({
          serviceType: quotation.service_type,
          transportType: quotation.transport_type,
        }),
        getProviders(),
      ])

      setChargeLines(lines)
      setConcepts(accountingConcepts)
      setProviderCandidates(candidates)
      setAllProviders(providers.filter((provider) => provider.status === "activo"))
    } catch (error) {
      console.error(error)
      alert("No se pudieron cargar los cargos de la cotizacion")
    } finally {
      setLoadingCharges(false)
    }
  }

  async function reloadChargeContext(quotation: QuotationSummary) {
    const [lines, refreshedItems] = await Promise.all([
      getQuotationChargeLines(quotation.id),
      getQuotations({
        scope: "pricing",
        query: deferredQuery,
        status: statusFilter,
      }),
    ])

    setChargeLines(lines)
    setItems(refreshedItems)

    const refreshedSelected =
      refreshedItems.find((item) => item.id === quotation.id) ?? selectedQuotation ?? quotation
    setSelectedQuotation(refreshedSelected)
  }

  async function handleSaveChargeLine() {
    if (!selectedQuotation) {
      return
    }

    if (!chargeFormValues.providerId) {
      alert("Selecciona un proveedor")
      return
    }

    if (!chargeFormValues.salesAccountingConceptId) {
      alert("Selecciona un concepto contable")
      return
    }

    try {
      setSavingCharge(true)

      if (editingChargeId) {
        await updateQuotationChargeLine(editingChargeId, {
          provider_id: chargeFormValues.providerId || null,
          sales_accounting_concept_id: chargeFormValues.salesAccountingConceptId,
          purchase_amount: chargeFormValues.purchaseAmount
            ? Number(chargeFormValues.purchaseAmount)
            : null,
          option_label: chargeFormValues.optionLabel.trim() || "Opcion 1",
          sale_amount: chargeFormValues.saleAmount ? Number(chargeFormValues.saleAmount) : null,
          vat_rate: chargeFormValues.vatRate ? Number(chargeFormValues.vatRate) : undefined,
          notes: chargeFormValues.notes.trim() || null,
        })
      } else {
        await createQuotationChargeLine({
          quotation_id: selectedQuotation.id,
          option_label: chargeFormValues.optionLabel.trim() || "Opcion 1",
          provider_id: chargeFormValues.providerId || null,
          sales_accounting_concept_id: chargeFormValues.salesAccountingConceptId,
          purchase_amount: chargeFormValues.purchaseAmount
            ? Number(chargeFormValues.purchaseAmount)
            : null,
          sale_amount: chargeFormValues.saleAmount ? Number(chargeFormValues.saleAmount) : null,
          vat_rate: chargeFormValues.vatRate ? Number(chargeFormValues.vatRate) : undefined,
          notes: chargeFormValues.notes.trim() || null,
        })
      }

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

  const totalPurchase = chargeLines.reduce((sum, line) => sum + (line.purchase_amount ?? 0), 0)
  const chargeOptionSummaries = useMemo(() => {
    const grouped = new Map<
      string,
      {
        optionLabel: string
        totalPurchase: number
        providers: Set<string>
        lineCount: number
      }
    >()

    for (const line of chargeLines) {
      const optionLabel = line.option_label || "Opcion 1"
      const current = grouped.get(optionLabel) ?? {
        optionLabel,
        totalPurchase: 0,
        providers: new Set<string>(),
        lineCount: 0,
      }

      current.totalPurchase += line.purchase_amount ?? 0
      if (line.provider_name) {
        current.providers.add(line.provider_name)
      }
      current.lineCount += 1
      grouped.set(optionLabel, current)
    }

    return Array.from(grouped.values()).sort((left, right) =>
      left.optionLabel.localeCompare(right.optionLabel)
    )
  }, [chargeLines])

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
            <div className="mt-2 text-2xl font-semibold text-[#111827]">{items.length}</div>
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
                        {formatCurrency(item.estimated_cost)}
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
              <div className="font-semibold text-[#111827]">
                {selectedQuotation.client_name || "Cliente"}
              </div>
              <div className="mt-1">
                {[selectedQuotation.service_type, selectedQuotation.transport_type]
                  .filter(Boolean)
                  .join(" / ") || "Servicio no definido"}
              </div>
              <div className="mt-1">
                {selectedQuotation.origin || "Origen"} → {selectedQuotation.destination || "Destino"}
              </div>
              <div className="mt-1">
                Vigencia de compra solicitada: {formatDate(selectedQuotation.purchase_valid_until)}
              </div>
              <div className="mt-4">
                <Link
                  href={`/quotations/${selectedQuotation.id}/pricing-request`}
                  target="_blank"
                  className="inline-flex rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm font-medium text-[#111827] hover:bg-[#F8FAFC]"
                >
                  Abrir PDF solicitud a proveedor
                </Link>
              </div>
            </div>

            {loadingProviders ? (
              <p className="text-sm text-[#6B7280]">Cargando proveedores sugeridos...</p>
            ) : providerCandidates.length === 0 ? (
              <p className="text-sm text-[#6B7280]">
                No hay proveedores activos configurados para este servicio y transporte.
              </p>
            ) : (
              <div className="space-y-3">
                {providerCandidates.map((candidate) => {
                  const primaryContact = getPrimaryProviderContact(candidate)
                  const mailToLink = buildProviderEmailLink(candidate, selectedQuotation)
                  const whatsAppLink = buildProviderWhatsAppLink(candidate, selectedQuotation)

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
                          {mailToLink ? (
                            <a
                              href={mailToLink}
                              className="rounded-md bg-[#2563EB] px-3 py-2 text-sm font-medium text-white hover:bg-[#1D4ED8]"
                            >
                              Correo listo
                            </a>
                          ) : null}
                          {whatsAppLink ? (
                            <a
                              href={whatsAppLink}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md border border-[#86EFAC] bg-[#F0FDF4] px-3 py-2 text-sm font-medium text-[#166534] hover:bg-[#DCFCE7]"
                            >
                              WhatsApp listo
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
                  Vigencia compra
                </div>
                <div className="mt-1 text-sm font-medium text-[#111827]">
                  {formatDate(selectedQuotation.purchase_valid_until)}
                </div>
              </div>
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Compra acumulada
                </div>
                <div className="mt-1 text-sm font-medium text-[#111827]">
                  {formatCurrency(totalPurchase)}
                </div>
              </div>
            </div>

            {loadingCharges ? (
              <p className="text-sm text-[#6B7280]">Cargando cargos...</p>
            ) : (
              <>
                <section className="space-y-4 rounded-xl border border-[#E5E7EB] bg-white p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-[#111827]">Compra consolidada</h3>
                      <p className="mt-1 text-sm text-[#6B7280]">
                        Pricing registra proveedor, concepto contable y monto compra para cada opcion.
                      </p>
                    </div>
                    {chargeLines.length > 0 &&
                    ["cotizando", "renegociar_tarifa"].includes(selectedQuotation.status) ? (
                      <button
                        type="button"
                        onClick={() => void handleMoveToReadyForSend()}
                        disabled={movingToReadyId === selectedQuotation.id}
                        className="rounded-md bg-[#0F766E] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {movingToReadyId === selectedQuotation.id
                          ? "Actualizando..."
                          : "Enviar propuesta"}
                      </button>
                    ) : null}
                  </div>

                  {chargeOptionSummaries.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {chargeOptionSummaries.map((summary) => (
                        <div
                          key={summary.optionLabel}
                          className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4"
                        >
                          <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                            {summary.optionLabel}
                          </div>
                          <div className="mt-2 text-lg font-semibold text-[#111827]">
                            {formatCurrency(summary.totalPurchase)}
                          </div>
                          <div className="mt-1 text-sm text-[#6B7280]">
                            {summary.lineCount} cargo(s)
                          </div>
                          <div className="mt-1 text-sm text-[#6B7280]">
                            {summary.providers.size > 0
                              ? Array.from(summary.providers).join(", ")
                              : "Sin proveedor"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {chargeLines.length === 0 ? (
                    <p className="text-sm text-[#6B7280]">
                      Todavia no hay compras capturadas para esta cotizacion.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
                      <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                        <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                          <tr>
                            <th className="px-4 py-3">Proveedor</th>
                            <th className="px-4 py-3">Opcion</th>
                            <th className="px-4 py-3">Concepto</th>
                            <th className="px-4 py-3">Compra</th>
                            <th className="px-4 py-3">IVA</th>
                            <th className="px-4 py-3 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB] bg-white">
                          {chargeLines.map((line) => (
                            <tr key={line.id}>
                              <td className="px-4 py-3 text-[#475569]">
                                {line.provider_name || "No asignado"}
                              </td>
                              <td className="px-4 py-3 text-[#475569]">{line.option_label}</td>
                              <td className="px-4 py-3 text-[#475569]">
                                {line.accounting_concept || line.service_name}
                              </td>
                              <td className="px-4 py-3 text-[#475569]">
                                {formatCurrency(line.purchase_amount)}
                              </td>
                              <td className="px-4 py-3 text-[#475569]">{line.vat_rate}%</td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingChargeId(line.id)
                                      setChargeFormValues({
                                        optionLabel: line.option_label || "Opcion 1",
                                        providerId: line.provider_id || "",
                                        salesAccountingConceptId:
                                          line.sales_accounting_concept_id || "",
                                        purchaseAmount:
                                          line.purchase_amount != null
                                            ? String(line.purchase_amount)
                                            : "",
                                        saleAmount:
                                          line.sale_amount != null ? String(line.sale_amount) : "",
                                        vatRate: String(line.vat_rate ?? 0),
                                        notes: line.notes || "",
                                      })
                                    }}
                                    className="rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 font-medium text-[#111827] hover:bg-[#F8FAFC]"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteChargeLine(line.id)}
                                    disabled={deletingChargeId === line.id}
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
                  )}
                </section>

                <QuotationChargeLineForm
                  title={editingChargeId ? "Editar opcion de compra" : "Agregar opcion de compra"}
                  description="Captura solo proveedor, concepto contable y compra. La venta se definira despues desde CRM."
                  values={chargeFormValues}
                  providers={providersForChargeForm}
                  concepts={concepts}
                  serviceType={selectedQuotation.service_type}
                  operationType={selectedQuotation.operation_type}
                  onChange={(field, value) => {
                    setChargeFormValues((current) => ({
                      ...current,
                      [field]: value,
                    }))
                  }}
                  onSubmit={handleSaveChargeLine}
                  submitLabel={editingChargeId ? "Guardar" : "Guardar"}
                  loading={savingCharge}
                />
              </>
            )}
          </div>
        </Modal>
      ) : null}
    </PageContainer>
  )
}
