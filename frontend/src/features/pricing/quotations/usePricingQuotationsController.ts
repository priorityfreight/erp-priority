import { useDeferredValue, useEffect, useMemo, useState } from "react"
import {
  deleteQuotationChargeLine,
  getProviderPricingCandidates,
  getProviders,
  getQuotationById,
  getQuotationCargoLines,
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
import type { QuotationChargeLineFormValues } from "@/components/forms/QuotationChargeLineForm"
import { usePriorityConfirm } from "@/components/priority/usePriorityConfirm"
import { getErrorMessage, notifyError, notifyWarning } from "@/lib/feedback"
import {
  buildChargeFormFromLine,
  buildNextOptionLabel,
  createEmptyChargeForm,
  summarizePricingChargeOptions,
  validateChargeRows,
} from "@/features/pricing/quotations/helpers"

export function usePricingQuotationsController() {
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
  const { confirm, confirmDialog } = usePriorityConfirm()

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
      notifyError("No se pudo tomar la cotizacion")
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
      notifyError("No se pudieron cargar los proveedores sugeridos")
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
      notifyError("No se pudieron cargar los cargos de la cotizacion")
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

  const chargeOptionSummaries = useMemo(
    () => summarizePricingChargeOptions(chargeLines),
    [chargeLines]
  )

  async function handleSaveChargeLine() {
    if (!selectedQuotation) {
      return
    }

    try {
      setSavingCharge(true)
      const { rowsToSave, purchaseValidUntil } = validateChargeRows(chargeFormRows)

      const nextOptionLabel =
        editingChargeOptionId == null
          ? buildNextOptionLabel(chargeOptionSummaries)
          : null

      await saveQuotationPurchaseOption({
        quotationId: selectedQuotation.id,
        quotationOptionId: editingChargeOptionId ?? null,
        optionLabel: editingChargeOptionId == null ? nextOptionLabel : null,
        purchaseValidUntil,
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
      notifyError(getErrorMessage(error, "No se pudo guardar el cargo"))
    } finally {
      setSavingCharge(false)
    }
  }

  async function handleDeleteChargeLine(id: string) {
    if (!selectedQuotation) {
      return
    }

    const confirmed = await confirm({
      title: "Eliminar cargo",
      description: "La linea de compra se eliminara de la opcion actual.",
      actionLabel: "Eliminar cargo",
      variant: "destructive",
    })
    if (!confirmed) {
      return
    }

    try {
      setDeletingChargeId(id)
      await deleteQuotationChargeLine(id)
      await reloadChargeContext(selectedQuotation)
    } catch (error) {
      console.error(error)
      notifyError("No se pudo eliminar el cargo")
    } finally {
      setDeletingChargeId(null)
    }
  }

  async function handleMoveToReadyForSend() {
    if (!selectedQuotation) {
      return
    }

    if (chargeLines.length === 0) {
      notifyWarning("Primero agrega al menos un cargo de compra")
      return
    }

    try {
      setMovingToReadyId(selectedQuotation.id)
      await updateQuotationStatus(selectedQuotation.id, "lista_para_enviar")
      await reloadChargeContext(selectedQuotation)
    } catch (error) {
      console.error(error)
      notifyError("No se pudo mover la cotizacion a lista para enviar")
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

  function openExistingChargeOptionEditor(summary: (typeof chargeOptionSummaries)[number]) {
    setEditingChargeOptionId(summary.optionId)
    setChargeFormRows(summary.lines.map((line) => buildChargeFormFromLine(line)))
    setShowChargeEditor(true)
  }

  return {
    items,
    totalCount,
    loading,
    takingId,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    pageSize,
    selectedQuotation,
    setSelectedQuotation,
    showProvidersModal,
    setShowProvidersModal,
    showChargesModal,
    setShowChargesModal,
    providerCandidates,
    setProviderCandidates,
    providerCargoLines,
    allProviders,
    setAllProviders,
    chargeLines,
    setChargeLines,
    concepts,
    setConcepts,
    loadingProviders,
    loadingCharges,
    savingCharge,
    deletingChargeId,
    movingToReadyId,
    showChargeEditor,
    setShowChargeEditor,
    editingChargeOptionId,
    chargeFormRows,
    setChargeFormRows,
    deferredQuery,
    loadItems,
    resetChargeForm,
    openNewChargeOptionEditor,
    handleTakeQuotation,
    handleOpenProviders,
    handleOpenCharges,
    reloadChargeContext,
    handleSaveChargeLine,
    handleDeleteChargeLine,
    handleMoveToReadyForSend,
    recommendedProviders,
    providersForChargeForm,
    filteredConceptsForQuotation,
    pricingChargeDisabledReason,
    canCaptureCharges,
    totalPages,
    showingFrom,
    showingTo,
    chargeOptionSummaries,
    confirmDialog,
    openExistingChargeOptionEditor,
  }
}
