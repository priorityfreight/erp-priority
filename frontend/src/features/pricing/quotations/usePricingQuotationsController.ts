import { useDeferredValue, useEffect, useEffectEvent, useMemo, useState } from "react"
import { getCurrentErpUser, type CurrentErpUser } from "@/lib/auth"
import {
  createWorkspaceView,
  deleteQuotationChargeLine,
  deleteWorkspaceView,
  getProviderPricingCandidates,
  getProviders,
  getQuotationById,
  getQuotationCargoLines,
  getQuotationChargeLines,
  getQuotations,
  getSalesAccountingConcepts,
  getUsers,
  getWorkspaceViews,
  saveQuotationPurchaseOption,
  setDefaultWorkspaceView,
  takeQuotationForPricing,
  updateQuotationStatus,
  updateWorkspaceView,
  type PricingQuotationLane,
  type Provider,
  type ProviderPricingCandidate,
  type QuotationCargoLine,
  type QuotationChargeLine,
  type QuotationSummary,
  type SalesAccountingConcept,
  type SavedWorkspaceView,
  type SavedWorkspaceViewPayload,
  type User,
  type WorkspaceFilterState,
  type WorkspaceKey,
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

const pricingWorkspaceKey: WorkspaceKey = "pricing_quotations"
const pricingLaneOrder: PricingQuotationLane[] = [
  "pendiente",
  "cotizando",
  "lista_para_enviar",
  "renegociar_tarifa",
]
const defaultPricingLane: PricingQuotationLane = "pendiente"
const defaultVisibleColumns = [
  "quickActions",
  "reference_number",
  "client_name",
  "service",
  "lane",
  "pricing_owner_name",
  "status",
  "cost",
  "target",
  "actions",
]
const defaultFilterState: WorkspaceFilterState = {
  pricingOwnerId: null,
  serviceType: null,
  transportType: null,
  mineOnly: false,
}

function parseWorkspaceFilterState(raw: Record<string, unknown> | null | undefined): WorkspaceFilterState {
  return {
    pricingOwnerId:
      typeof raw?.pricingOwnerId === "string" && raw.pricingOwnerId.trim()
        ? raw.pricingOwnerId
        : null,
    serviceType:
      typeof raw?.serviceType === "string" && raw.serviceType.trim() ? raw.serviceType : null,
    transportType:
      typeof raw?.transportType === "string" && raw.transportType.trim()
        ? raw.transportType
        : null,
    mineOnly: Boolean(raw?.mineOnly ?? false),
  }
}

function createLaneCountState(): Record<PricingQuotationLane, number> {
  return {
    pendiente: 0,
    cotizando: 0,
    lista_para_enviar: 0,
    renegociar_tarifa: 0,
  }
}

export function usePricingQuotationsController() {
  const [items, setItems] = useState<QuotationSummary[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [laneCounts, setLaneCounts] = useState<Record<PricingQuotationLane, number>>(createLaneCountState())
  const [takingId, setTakingId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const [activeLane, setActiveLane] = useState<PricingQuotationLane>(defaultPricingLane)
  const [filterState, setFilterState] = useState<WorkspaceFilterState>(defaultFilterState)
  const [page, setPage] = useState(1)
  const pageSize = 25

  const [currentUser, setCurrentUser] = useState<CurrentErpUser | null>(null)
  const [pricingUsers, setPricingUsers] = useState<User[]>([])
  const [savedViews, setSavedViews] = useState<SavedWorkspaceView[]>([])
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null)
  const [isDefaultViewApplied, setIsDefaultViewApplied] = useState(false)

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

  async function refreshSavedViews(nextSelectedId?: string | null) {
    const views = await getWorkspaceViews(pricingWorkspaceKey)
    setSavedViews(views)

    if (nextSelectedId === null) {
      setSelectedViewId(null)
      return views
    }

    if (nextSelectedId) {
      setSelectedViewId(views.some((view) => view.id === nextSelectedId) ? nextSelectedId : null)
      return views
    }

    if (selectedViewId && views.some((view) => view.id === selectedViewId)) {
      return views
    }

    setSelectedViewId(views.find((view) => view.is_default)?.id ?? null)
    return views
  }

  function applyPricingView(view: SavedWorkspaceView) {
    setQuery(view.search_query ?? "")
    setActiveLane((view.status_lane as PricingQuotationLane | null) ?? defaultPricingLane)
    setFilterState(parseWorkspaceFilterState(view.filters_json))
    setSelectedViewId(view.id)
    setIsDefaultViewApplied(view.is_default)
    setPage(1)
  }

  const bootstrapWorkspace = useEffectEvent(async () => {
    try {
      const [user, users, views] = await Promise.all([
        getCurrentErpUser().catch(() => null),
        getUsers({ activeOnly: true }).catch(() => []),
        getWorkspaceViews(pricingWorkspaceKey).catch(() => []),
      ])

      setCurrentUser(user)
      setPricingUsers(users)
      setSavedViews(views)

      const defaultView = views.find((view) => view.is_default)
      if (defaultView) {
        applyPricingView(defaultView)
      }
    } catch (error) {
      console.error(error)
      notifyError("No se pudo cargar la configuración inicial del workspace de pricing")
    }
  })

  useEffect(() => {
    void bootstrapWorkspace()
  }, [])

  async function loadItems(
    search = "",
    lane: PricingQuotationLane = defaultPricingLane,
    filters: WorkspaceFilterState = defaultFilterState,
    nextPage = 1
  ) {
    try {
      setLoading(true)
      const data = await getQuotations({
        scope: "pricing",
        query: search,
        status: lane,
        page: nextPage,
        pageSize,
        pricingOwnerId: filters.pricingOwnerId,
        serviceType: filters.serviceType,
        transportType: filters.transportType,
        onlyMine: filters.mineOnly,
      })
      setItems(data.items)
      setTotalCount(data.totalCount)
    } catch (error) {
      console.error(error)
      setItems([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  async function loadLaneCounts(search = "", filters: WorkspaceFilterState = defaultFilterState) {
    try {
      const counts = await Promise.all(
        pricingLaneOrder.map(async (lane) => {
          const data = await getQuotations({
            scope: "pricing",
            query: search,
            status: lane,
            page: 1,
            pageSize: 1,
            pricingOwnerId: filters.pricingOwnerId,
            serviceType: filters.serviceType,
            transportType: filters.transportType,
            onlyMine: filters.mineOnly,
          })
          return [lane, data.totalCount] as const
        })
      )

      setLaneCounts(
        counts.reduce((accumulator, [lane, count]) => {
          accumulator[lane] = count
          return accumulator
        }, createLaneCountState())
      )
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    setPage(1)
  }, [
    deferredQuery,
    activeLane,
    filterState.mineOnly,
    filterState.pricingOwnerId,
    filterState.serviceType,
    filterState.transportType,
  ])

  useEffect(() => {
    void loadItems(
      deferredQuery,
      activeLane,
      {
        pricingOwnerId: filterState.pricingOwnerId,
        serviceType: filterState.serviceType,
        transportType: filterState.transportType,
        mineOnly: filterState.mineOnly,
      },
      page
    )
  }, [
    activeLane,
    deferredQuery,
    filterState.mineOnly,
    filterState.pricingOwnerId,
    filterState.serviceType,
    filterState.transportType,
    page,
  ])

  useEffect(() => {
    void loadLaneCounts(deferredQuery, {
      pricingOwnerId: filterState.pricingOwnerId,
      serviceType: filterState.serviceType,
      transportType: filterState.transportType,
      mineOnly: filterState.mineOnly,
    })
  }, [
    deferredQuery,
    filterState.mineOnly,
    filterState.pricingOwnerId,
    filterState.serviceType,
    filterState.transportType,
  ])

  function handleQueryChange(value: string) {
    setSelectedViewId(null)
    setIsDefaultViewApplied(false)
    setQuery(value)
  }

  function handleLaneChange(value: PricingQuotationLane) {
    setSelectedViewId(null)
    setIsDefaultViewApplied(false)
    setActiveLane(value)
  }

  function handleFilterStateChange(patch: Partial<WorkspaceFilterState>) {
    setSelectedViewId(null)
    setIsDefaultViewApplied(false)
    setFilterState((current) => ({
      ...current,
      ...patch,
    }))
  }

  function handleResetWorkspace() {
    setSelectedViewId(null)
    setIsDefaultViewApplied(false)
    setQuery("")
    setActiveLane(defaultPricingLane)
    setFilterState(defaultFilterState)
    setPage(1)
  }

  function buildCurrentViewPayload(
    name: string,
    isDefault: boolean
  ): SavedWorkspaceViewPayload {
    return {
      workspace_key: pricingWorkspaceKey,
      name,
      search_query: query.trim() || null,
      status_lane: activeLane,
      filters_json: {
        pricingOwnerId: filterState.pricingOwnerId,
        serviceType: filterState.serviceType,
        transportType: filterState.transportType,
        mineOnly: filterState.mineOnly,
      },
      sort_json: {
        orderBy: "match_rank_desc",
        secondaryOrderBy: "created_at_desc",
      },
      visible_columns_json: defaultVisibleColumns,
      is_default: isDefault,
    }
  }

  async function handleSaveWorkspaceView(payload: { name: string; isDefault: boolean }) {
    const created = await createWorkspaceView(
      buildCurrentViewPayload(payload.name, payload.isDefault)
    )
    await refreshSavedViews(created.id)
    setSelectedViewId(created.id)
  }

  async function handleRenameWorkspaceView(viewId: string, name: string) {
    const updated = await updateWorkspaceView(viewId, { name })
    await refreshSavedViews(updated.id)
  }

  async function handleUpdateCurrentWorkspaceView(viewId: string) {
    const currentView = savedViews.find((view) => view.id === viewId)
    if (!currentView) {
      return
    }

    await updateWorkspaceView(viewId, buildCurrentViewPayload(currentView.name, currentView.is_default))
    await refreshSavedViews(viewId)
  }

  async function handleDeleteWorkspaceView(viewId: string) {
    await deleteWorkspaceView(viewId)
    await refreshSavedViews(selectedViewId === viewId ? null : undefined)
  }

  async function handleSetDefaultWorkspaceView(viewId: string) {
    await setDefaultWorkspaceView(viewId, pricingWorkspaceKey)
    const views = await refreshSavedViews(viewId)
    const nextSelectedView = views.find((view) => view.id === viewId)
    if (nextSelectedView) {
      setIsDefaultViewApplied(nextSelectedView.is_default)
    }
  }

  function handleApplyWorkspaceView(viewId: string) {
    const selectedView = savedViews.find((view) => view.id === viewId)
    if (!selectedView) {
      return
    }

    applyPricingView(selectedView)
  }

  function handleApplyQuickView(
    lane: PricingQuotationLane,
    options?: Partial<WorkspaceFilterState> & { query?: string }
  ) {
    setSelectedViewId(null)
    setIsDefaultViewApplied(false)
    setQuery(options?.query ?? "")
    setActiveLane(lane)
    setFilterState({
      ...defaultFilterState,
      ...options,
      mineOnly: options?.mineOnly ?? false,
    })
    setPage(1)
  }

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

  async function refreshWorkspaceData() {
    await Promise.all([
      loadItems(deferredQuery, activeLane, filterState, page),
      loadLaneCounts(deferredQuery, filterState),
    ])
  }

  async function handleTakeQuotation(id: string) {
    try {
      setTakingId(id)
      await takeQuotationForPricing(id)
      await refreshWorkspaceData()
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
        if (refreshedQuotation.status !== activeLane) {
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
      await loadLaneCounts(deferredQuery, filterState)
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

  const activeFilterCount = useMemo(() => {
    return [
      filterState.mineOnly,
      Boolean(filterState.pricingOwnerId),
      Boolean(filterState.serviceType),
      Boolean(filterState.transportType),
    ].filter(Boolean).length
  }, [
    filterState.mineOnly,
    filterState.pricingOwnerId,
    filterState.serviceType,
    filterState.transportType,
  ])

  const pricingOwnerOptions = useMemo(() => {
    const seen = new Set<string>()
    return pricingUsers
      .filter((user) => {
        if (!user.id || seen.has(user.id)) {
          return false
        }
        seen.add(user.id)
        return true
      })
      .map((user) => ({
        value: user.id,
        label: `${user.first_name} ${user.last_name}`.trim() || user.email,
      }))
      .sort((left, right) => left.label.localeCompare(right.label))
  }, [pricingUsers])

  const serviceTypeOptions = useMemo(() => {
    return Array.from(
      new Set(items.map((item) => item.service_type).filter((value): value is string => Boolean(value)))
    )
      .sort((left, right) => left.localeCompare(right))
      .map((value) => ({ value, label: value }))
  }, [items])

  const transportTypeOptions = useMemo(() => {
    return Array.from(
      new Set(items.map((item) => item.transport_type).filter((value): value is string => Boolean(value)))
    )
      .sort((left, right) => left.localeCompare(right))
      .map((value) => ({ value, label: value }))
  }, [items])

  function openExistingChargeOptionEditor(summary: (typeof chargeOptionSummaries)[number]) {
    setEditingChargeOptionId(summary.optionId)
    setChargeFormRows(summary.lines.map((line) => buildChargeFormFromLine(line)))
    setShowChargeEditor(true)
  }

  return {
    items,
    totalCount,
    loading,
    laneCounts,
    takingId,
    query,
    setQuery: handleQueryChange,
    activeLane,
    setActiveLane: handleLaneChange,
    filterState,
    setFilterState: handleFilterStateChange,
    resetWorkspaceState: handleResetWorkspace,
    activeFilterCount,
    page,
    setPage,
    pageSize,
    currentUser,
    pricingUsers,
    pricingOwnerOptions,
    serviceTypeOptions,
    transportTypeOptions,
    savedViews,
    selectedViewId,
    isDefaultViewApplied,
    setSelectedViewId,
    handleApplyWorkspaceView,
    handleApplyQuickView,
    handleSaveWorkspaceView,
    handleRenameWorkspaceView,
    handleUpdateCurrentWorkspaceView,
    handleDeleteWorkspaceView,
    handleSetDefaultWorkspaceView,
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
