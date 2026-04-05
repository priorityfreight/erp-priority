"use client"

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  createOpportunity,
  deleteOpportunity,
  getClients,
  getIncoterms,
  getOpportunities,
  getServiceTransportTypes,
  getUsers,
  getWorkspaceViews,
  createWorkspaceView,
  updateWorkspaceView,
  deleteWorkspaceView,
  setDefaultWorkspaceView,
  updateOpportunityStatus,
  type Client,
  type Incoterm,
  type OpportunitySummary,
  type SavedWorkspaceView,
  type SavedWorkspaceViewPayload,
  type ServiceTransportType,
  type User,
  type WorkspaceKey,
} from "@/lib/db"
import { getErrorMessage, notifyError, notifyWarning } from "@/lib/feedback"
import { StatusBadge } from "@/components/data/StatusBadge"
import { Modal } from "@/components/data/Modal"
import { OpportunityForm, type OpportunityFormValues } from "@/components/forms/OpportunityForm"
import { PageContainer } from "@/components/layout/PageContainer"
import {
  PriorityActionMenu,
  PriorityActionRail,
  PriorityKanbanBoard,
  PriorityKanbanCard,
  PriorityCollectionWorkspace,
  PriorityFilterPopover,
  PrioritySavedViews,
  PrioritySearchField,
  PriorityStatusLanes,
  type PriorityCollectionColumn,
  type PriorityStatusLaneItem,
} from "@/components/priority"
import { PrioritySelectField } from "@/components/priority/PriorityForm"
import { usePriorityConfirm } from "@/components/priority/usePriorityConfirm"
import { Button } from "@/components/ui/button"

type OpportunityWorkspaceLane =
  | "investigando"
  | "confirmado"
  | "cotizando"
  | "aceptado"
  | "rechazada"
  | "vencida"

type OpportunityWorkspaceMode = "table" | "board"

type OpportunityFilterState = {
  clientId: string | null
  viewMode: OpportunityWorkspaceMode
}

const workspaceKey: WorkspaceKey = "opportunities"
const allFilterValue = "__all__"
const defaultLane: OpportunityWorkspaceLane = "investigando"
const defaultFilters: OpportunityFilterState = {
  clientId: null,
  viewMode: "table",
}
const defaultVisibleColumns = [
  "quickActions",
  "title",
  "client_name",
  "service",
  "lane",
  "salesperson_name",
  "status",
  "estimated_value",
  "expiration_date",
  "actions",
]

const statusOptions: OpportunityWorkspaceLane[] = [
  "investigando",
  "confirmado",
  "cotizando",
  "aceptado",
  "rechazada",
  "vencida",
]

const emptyForm: OpportunityFormValues = {
  clientId: "",
  salespersonId: "",
  serviceType: "",
  transportType: "",
  operationType: "",
  incotermId: "",
  origin: "",
  originUnlocode: "",
  destination: "",
  destinationUnlocode: "",
  expectedProfitUsd: "",
  serviceQuantity: "",
  description: "",
}

const laneMeta: Record<
  OpportunityWorkspaceLane,
  { label: string; helper: string; tone: PriorityStatusLaneItem["tone"] }
> = {
  investigando: {
    label: "Investigando",
    helper: "Exploración comercial inicial con cliente y lane.",
    tone: "info",
  },
  confirmado: {
    label: "Confirmadas",
    helper: "Oportunidades listas para movimiento comercial siguiente.",
    tone: "neutral",
  },
  cotizando: {
    label: "Cotizando",
    helper: "Ya pasaron al frente operativo de pricing.",
    tone: "warning",
  },
  aceptado: {
    label: "Ganadas",
    helper: "Oportunidades cerradas positivamente.",
    tone: "success",
  },
  rechazada: {
    label: "Perdidas",
    helper: "Oportunidades cerradas sin avance comercial.",
    tone: "danger",
  },
  vencida: {
    label: "Vencidas",
    helper: "Requieren revisión o reactivación comercial.",
    tone: "spotlight",
  },
}

function parseFilters(raw: Record<string, unknown> | null | undefined): OpportunityFilterState {
  return {
    clientId: typeof raw?.clientId === "string" && raw.clientId.trim() ? raw.clientId : null,
    viewMode: raw?.viewMode === "board" ? "board" : "table",
  }
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<OpportunitySummary[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [serviceTransportTypes, setServiceTransportTypes] = useState<ServiceTransportType[]>([])
  const [incoterms, setIncoterms] = useState<Incoterm[]>([])
  const [formValues, setFormValues] = useState<OpportunityFormValues>(emptyForm)
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [activeLane, setActiveLane] = useState<OpportunityWorkspaceLane>(defaultLane)
  const [filterState, setFilterState] = useState<OpportunityFilterState>(defaultFilters)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [savedViews, setSavedViews] = useState<SavedWorkspaceView[]>([])
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null)
  const [isDefaultViewApplied, setIsDefaultViewApplied] = useState(false)
  const { confirm, confirmDialog } = usePriorityConfirm()

  const filteredOpportunities = useMemo(
    () =>
      opportunities.filter((opportunity) => {
        if (filterState.clientId && opportunity.client_id !== filterState.clientId) {
          return false
        }
        return true
      }),
    [filterState.clientId, opportunities]
  )

  const tableOpportunities = useMemo(
    () => filteredOpportunities.filter((opportunity) => opportunity.status === activeLane),
    [activeLane, filteredOpportunities]
  )

  const laneCounts = useMemo(
    () =>
      statusOptions.reduce(
        (accumulator, lane) => ({
          ...accumulator,
          [lane]: filteredOpportunities.filter((opportunity) => opportunity.status === lane).length,
        }),
        {
          investigando: 0,
          confirmado: 0,
          cotizando: 0,
          aceptado: 0,
          rechazada: 0,
          vencida: 0,
        }
      ),
    [filteredOpportunities]
  )

  const lanes = useMemo<PriorityStatusLaneItem[]>(
    () =>
      statusOptions.map((lane) => ({
        key: lane,
        label: laneMeta[lane].label,
        helper: laneMeta[lane].helper,
        count: laneCounts[lane],
        tone: laneMeta[lane].tone,
      })),
    [laneCounts]
  )

  const activeFilterCount = useMemo(
    () => [filterState.clientId].filter(Boolean).length,
    [filterState.clientId]
  )

  const quickViews = useMemo(
    () => [
      {
        key: "investigando",
        label: "Investigando",
        active:
          !selectedViewId &&
          activeLane === "investigando" &&
          !filterState.clientId &&
          !search.trim() &&
          filterState.viewMode === "table",
        onSelect: () => {
          setSelectedViewId(null)
          setIsDefaultViewApplied(false)
          setSearch("")
          setActiveLane("investigando")
          setFilterState(defaultFilters)
        },
      },
      {
        key: "cotizando",
        label: "Cotizando",
        active:
          !selectedViewId &&
          activeLane === "cotizando" &&
          !filterState.clientId &&
          !search.trim() &&
          filterState.viewMode === "table",
        onSelect: () => {
          setSelectedViewId(null)
          setIsDefaultViewApplied(false)
          setSearch("")
          setActiveLane("cotizando")
          setFilterState(defaultFilters)
        },
      },
      {
        key: "ganadas",
        label: "Ganadas",
        active:
          !selectedViewId &&
          activeLane === "aceptado" &&
          !filterState.clientId &&
          !search.trim() &&
          filterState.viewMode === "table",
        onSelect: () => {
          setSelectedViewId(null)
          setIsDefaultViewApplied(false)
          setSearch("")
          setActiveLane("aceptado")
          setFilterState(defaultFilters)
        },
      },
    ],
    [activeLane, filterState.clientId, filterState.viewMode, search, selectedViewId]
  )

  async function loadReferenceData() {
    try {
      const [clientsData, usersData, serviceTransportData, incotermData] = await Promise.all([
        getClients(),
        getUsers(),
        getServiceTransportTypes(),
        getIncoterms(),
      ])
      setClients(clientsData)
      setUsers(usersData)
      setServiceTransportTypes(serviceTransportData)
      setIncoterms(incotermData)
    } catch (error) {
      console.error(error)
      notifyError("No se pudo cargar la referencia comercial", getErrorMessage(error, "Intenta nuevamente."))
    }
  }

  useEffect(() => {
    void loadReferenceData()
  }, [])

  const loadOpportunityList = useCallback(async (queryValue = "") => {
    try {
      setLoading(true)
      const opportunitiesData = await getOpportunities({
        query: queryValue,
        status: "all",
      })
      setOpportunities(opportunitiesData)
    } catch (error) {
      console.error(error)
      notifyError("No se pudieron cargar las oportunidades", getErrorMessage(error, "Intenta nuevamente."))
    } finally {
      setLoading(false)
    }
  }, [])

  function applyWorkspaceView(view: SavedWorkspaceView) {
    setSearch(view.search_query ?? "")
    setActiveLane((view.status_lane as OpportunityWorkspaceLane | null) ?? defaultLane)
    setFilterState(parseFilters(view.filters_json))
    setSelectedViewId(view.id)
    setIsDefaultViewApplied(view.is_default)
  }

  const bootstrapWorkspace = useCallback(async () => {
    try {
      const views = await getWorkspaceViews(workspaceKey)
      setSavedViews(views)
      const defaultView = views.find((view) => view.is_default)
      if (defaultView) {
        applyWorkspaceView(defaultView)
      }
    } catch (error) {
      console.error(error)
      setSavedViews([])
    }
  }, [])

  const refreshSavedViews = useCallback(async (nextSelectedId?: string | null) => {
    const views = await getWorkspaceViews(workspaceKey)
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
  }, [selectedViewId])

  useEffect(() => {
    void bootstrapWorkspace()
  }, [bootstrapWorkspace])

  useEffect(() => {
    void loadOpportunityList(deferredSearch)
  }, [deferredSearch, loadOpportunityList])

  useEffect(() => {
    const fromClientId = new URLSearchParams(window.location.search).get("clientId")

    if (fromClientId) {
      setFormValues((current) => ({
        ...current,
        clientId: current.clientId || fromClientId,
      }))
      setShowCreateModal(true)
    }
  }, [])

  async function handleCreateOpportunity() {
    if (!formValues.clientId) {
      notifyWarning("Selecciona un cliente")
      return
    }

    if (!formValues.serviceType) {
      notifyWarning("Selecciona un tipo de servicio")
      return
    }

    if (!formValues.transportType) {
      notifyWarning("Selecciona un tipo de transporte")
      return
    }

    if (!formValues.operationType) {
      notifyWarning("Selecciona el tipo de operación")
      return
    }

    if (!formValues.incotermId) {
      notifyWarning("Selecciona el incoterm")
      return
    }

    if (!formValues.originUnlocode || !formValues.destinationUnlocode) {
      notifyWarning("Selecciona origen y destino desde UN/LOCODE")
      return
    }

    try {
      setCreating(true)
      await createOpportunity({
        clientId: formValues.clientId,
        salespersonId: formValues.salespersonId || null,
        serviceType: formValues.serviceType,
        transportType: formValues.transportType,
        operationType: formValues.operationType,
        incotermId: formValues.incotermId,
        originUnlocode: formValues.originUnlocode,
        destinationUnlocode: formValues.destinationUnlocode,
        expectedProfitUsd: formValues.expectedProfitUsd ? Number(formValues.expectedProfitUsd) : null,
        serviceQuantity: formValues.serviceQuantity ? Number(formValues.serviceQuantity) : null,
        description: formValues.description.trim() || null,
      })

      setFormValues(emptyForm)
      setShowCreateModal(false)
      await loadOpportunityList(search)
    } catch (error) {
      console.error(error)
      notifyError("No se pudo crear la oportunidad", getErrorMessage(error, "Intenta nuevamente."))
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteOpportunity = useCallback(async (id: string, title: string) => {
    const confirmed = await confirm({
      title: "Eliminar oportunidad",
      description: `Se eliminara ${title} y se perdera el seguimiento comercial relacionado.`,
      actionLabel: "Eliminar oportunidad",
      variant: "destructive",
    })

    if (!confirmed) {
      return
    }

    try {
      setDeletingId(id)
      await deleteOpportunity(id)
      await loadOpportunityList(search)
    } catch (error) {
      console.error(error)
      notifyError("No se pudo eliminar la oportunidad", getErrorMessage(error, "Intenta nuevamente."))
    } finally {
      setDeletingId(null)
    }
  }, [confirm, loadOpportunityList, search])

  const handleMoveOpportunity = useCallback(async (id: string, targetLane: OpportunityWorkspaceLane) => {
    const currentOpportunity = opportunities.find((item) => item.id === id)
    const previousLane = currentOpportunity?.status as OpportunityWorkspaceLane | null

    if (!previousLane || previousLane === targetLane) {
      return
    }

    setMovingId(id)
    setOpportunities((current) =>
      current.map((item) => (item.id === id ? { ...item, status: targetLane } : item))
    )

    try {
      await updateOpportunityStatus(id, targetLane)
      await loadOpportunityList(search)
      setSelectedViewId(null)
      setIsDefaultViewApplied(false)
      setActiveLane(targetLane)
    } catch (error) {
      console.error(error)
      setOpportunities((current) =>
        current.map((item) => (item.id === id ? { ...item, status: previousLane } : item))
      )
      notifyError(
        "No se pudo mover la oportunidad",
        getErrorMessage(error, "Intenta nuevamente desde la tabla o el board.")
      )
    } finally {
      setMovingId(null)
    }
  }, [loadOpportunityList, opportunities, search])

  function buildCurrentViewPayload(name: string, isDefault: boolean): SavedWorkspaceViewPayload {
    return {
      workspace_key: workspaceKey,
      name,
      search_query: search.trim() || null,
      status_lane: activeLane,
      filters_json: {
        clientId: filterState.clientId,
        viewMode: filterState.viewMode,
      },
      sort_json: {
        orderBy: "created_at_desc",
      },
      visible_columns_json: defaultVisibleColumns,
      is_default: isDefault,
    }
  }

  const opportunityColumns = useMemo<PriorityCollectionColumn<OpportunitySummary>[]>(
    () => [
      {
        id: "quickActions",
        header: "Flujo",
        className: "min-w-[240px]",
        headClassName: "min-w-[240px]",
        cell: (item) => (
          <PriorityActionRail
            compact
            actions={[
              { label: "Ver detalle", href: `/opportunities/${item.id}`, variant: "default" },
              { label: "Cotizar", href: `/opportunities/${item.id}`, variant: "outline" },
            ]}
          />
        ),
      },
      {
        id: "title",
        header: "Oportunidad",
        className: "min-w-[220px]",
        cell: (item) => item.title || "Oportunidad",
      },
      {
        id: "client_name",
        header: "Cliente",
        className: "min-w-[180px]",
        cell: (item) => item.client_name || "Sin cliente",
      },
      {
        id: "service",
        header: "Servicio",
        className: "min-w-[200px]",
        cell: (item) =>
          [item.service_type, item.transport_type].filter(Boolean).join(" / ") || "No definido",
      },
      {
        id: "lane",
        header: "Trayecto",
        className: "min-w-[220px]",
        cell: (item) =>
          item.origin && item.destination ? `${item.origin} -> ${item.destination}` : "No definido",
      },
      {
        id: "salesperson_name",
        header: "Usuario",
        className: "min-w-[180px]",
        cell: (item) => item.salesperson_name || "No asignado",
      },
      {
        id: "status",
        header: "Estatus",
        className: "min-w-[180px]",
        cell: (item) => <StatusBadge status={item.status} />,
      },
      {
        id: "estimated_value",
        header: "Valor estimado",
        className: "min-w-[150px]",
        cell: (item) =>
          item.estimated_value != null ? `$${item.estimated_value.toLocaleString()}` : "Sin valor",
      },
      {
        id: "expiration_date",
        header: "Vencimiento",
        className: "min-w-[160px]",
        cell: (item) => item.expiration_date || "No definida",
      },
      {
        id: "actions",
        header: "Mas",
        className: "w-[72px]",
        headClassName: "w-[72px]",
        cell: (item) => (
          <div className="flex justify-end">
            <PriorityActionMenu
              label={`Mas acciones para ${item.title || "oportunidad"}`}
              actions={[
                { label: "Ver detalle", href: `/opportunities/${item.id}` },
                {
                  label: deletingId === item.id ? "Eliminando..." : "Eliminar",
                  onPress: () => void handleDeleteOpportunity(item.id, item.title || "esta oportunidad"),
                  disabled: deletingId === item.id,
                },
              ]}
            />
          </div>
        ),
      },
    ],
    [deletingId, handleDeleteOpportunity]
  )

  const boardItemsByLane = useMemo(
    () =>
      statusOptions.reduce<Record<string, OpportunitySummary[]>>(
        (accumulator, lane) => ({
          ...accumulator,
          [lane]: filteredOpportunities.filter((opportunity) => opportunity.status === lane),
        }),
        {}
      ),
    [filteredOpportunities]
  )

  const filteredPipeline = filteredOpportunities.reduce(
    (sum, opportunity) => sum + (opportunity.estimated_value ?? 0),
    0
  )
  const visibleCount =
    filterState.viewMode === "board" ? filteredOpportunities.length : tableOpportunities.length
  const isWorkspaceEmpty = !loading && opportunities.length === 0 && !search.trim() && activeFilterCount === 0

  const workspaceToolbar = (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_auto_auto_auto_auto] xl:items-center">
      <PrioritySearchField
        value={search}
        onChange={(value) => {
          setSelectedViewId(null)
          setIsDefaultViewApplied(false)
          setSearch(value)
        }}
        placeholder="Buscar oportunidad por cliente, lane, servicio o usuario"
        ariaLabel="Buscar oportunidades"
      />
      <PriorityFilterPopover
        title="Filtros del pipeline"
        description="Refina la vista por cliente sin salir del lane operativo."
        activeCount={activeFilterCount}
        onApply={() => undefined}
        onClear={() => {
          setSelectedViewId(null)
          setIsDefaultViewApplied(false)
          setFilterState((current) => ({
            ...current,
            clientId: null,
          }))
        }}
      >
        <PrioritySelectField
          value={filterState.clientId ?? allFilterValue}
          onValueChange={(value) => {
            setSelectedViewId(null)
            setIsDefaultViewApplied(false)
            setFilterState((current) => ({
              ...current,
              clientId: value === allFilterValue ? null : value,
            }))
          }}
          placeholder="Cliente"
          options={[
            { value: allFilterValue, label: "Todos los clientes" },
            ...clients.map((client) => ({
              value: client.id,
              label: client.company_name,
            })),
          ]}
        />
      </PriorityFilterPopover>
      <div className="inline-flex items-center rounded-full border border-[rgba(144,158,174,0.16)] bg-white p-1 shadow-[0_14px_30px_-26px_rgba(3,10,24,0.38)]">
        <Button
          type="button"
          size="sm"
          variant={filterState.viewMode === "table" ? "default" : "ghost"}
          onClick={() => {
            setSelectedViewId(null)
            setIsDefaultViewApplied(false)
            setFilterState((current) => ({
              ...current,
              viewMode: "table",
            }))
          }}
        >
          Tabla
        </Button>
        <Button
          type="button"
          size="sm"
          variant={filterState.viewMode === "board" ? "default" : "ghost"}
          onClick={() => {
            setSelectedViewId(null)
            setIsDefaultViewApplied(false)
            setFilterState((current) => ({
              ...current,
              viewMode: "board",
            }))
          }}
        >
          Board
        </Button>
      </div>
      <PrioritySavedViews
        views={savedViews}
        selectedViewId={selectedViewId}
        quickViews={quickViews}
        onSelectView={(viewId) => {
          const selectedView = savedViews.find((view) => view.id === viewId)
          if (!selectedView) {
            return
          }
          applyWorkspaceView(selectedView)
        }}
        onSaveCurrentView={async ({ name, isDefault }) => {
          const created = await createWorkspaceView(buildCurrentViewPayload(name, isDefault))
          await refreshSavedViews(created.id)
          setSelectedViewId(created.id)
        }}
        onRenameView={async (viewId, name) => {
          await updateWorkspaceView(viewId, { name })
          await refreshSavedViews(viewId)
        }}
        onUpdateCurrentView={async (viewId) => {
          const currentView = savedViews.find((view) => view.id === viewId)
          if (!currentView) {
            return
          }
          await updateWorkspaceView(viewId, buildCurrentViewPayload(currentView.name, currentView.is_default))
          await refreshSavedViews(viewId)
        }}
        onDeleteView={async (viewId) => {
          await deleteWorkspaceView(viewId)
          await refreshSavedViews(selectedViewId === viewId ? null : undefined)
        }}
        onSetDefaultView={async (viewId) => {
          await setDefaultWorkspaceView(viewId, workspaceKey)
          const views = await refreshSavedViews(viewId)
          const selectedView = views.find((view) => view.id === viewId)
          setIsDefaultViewApplied(Boolean(selectedView?.is_default))
        }}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setSelectedViewId(null)
          setIsDefaultViewApplied(false)
          setSearch("")
          setActiveLane(defaultLane)
          setFilterState(defaultFilters)
        }}
      >
        Limpiar
      </Button>
    </div>
  )

  const workspaceLanesNode = (
    <PriorityStatusLanes
      lanes={lanes}
      activeKey={activeLane}
      onChange={(key) => {
        setSelectedViewId(null)
        setIsDefaultViewApplied(false)
        setActiveLane(key as OpportunityWorkspaceLane)
      }}
      className="xl:grid-cols-3"
    />
  )

  return (
    <PageContainer
      density="compact"
      title="Oportunidades"
      description="Workspace comercial de oportunidades ya preparado para lanes y futura vista board."
      actions={
        !isWorkspaceEmpty ? (
          <Button type="button" size="lg" onClick={() => setShowCreateModal(true)}>
            Añadir oportunidad
          </Button>
        ) : null
      }
    >
      <section className="workspace-panel space-y-4 rounded-[24px] p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#607187]">
              Opportunities workspace
              {isDefaultViewApplied && selectedViewId ? (
                <span className="rounded-full bg-[rgba(179,58,91,0.08)] px-2 py-0.5 text-[10px] tracking-[0.14em] text-[var(--brand-burgundy)]">
                  Vista default aplicada
                </span>
              ) : null}
            </div>
            <h2 className="text-[1.24rem] font-semibold tracking-[-0.02em] text-[var(--brand-navy)]">
              Pipeline operativo por estatus
            </h2>
            <p className="max-w-4xl text-[0.95rem] leading-7 text-[#607187]">
              Esta vista ya organiza el pipeline por lane para que el salto a kanban salga sobre una
              base consistente y sin rehacer browse.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[420px]">
            <div className="rounded-[18px] border border-[rgba(144,158,174,0.16)] bg-[rgba(248,250,252,0.82)] px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#607187]">
                Lane activa
              </div>
              <div className="mt-1 text-[0.98rem] font-semibold text-[var(--brand-navy)]">
                {laneMeta[activeLane].label}
              </div>
            </div>
            <div className="rounded-[18px] border border-[rgba(144,158,174,0.16)] bg-[rgba(248,250,252,0.82)] px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#607187]">
                Visibles
              </div>
              <div className="mt-1 text-[0.98rem] font-semibold text-[var(--brand-navy)]">
                {visibleCount}
              </div>
            </div>
            <div className="rounded-[18px] border border-[rgba(144,158,174,0.16)] bg-[rgba(248,250,252,0.82)] px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#607187]">
                Pipeline estimado
              </div>
              <div className="mt-1 text-[0.98rem] font-semibold text-[var(--brand-navy)]">
                ${filteredPipeline.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {filterState.viewMode === "table" ? (
          <PriorityCollectionWorkspace
            toolbar={workspaceToolbar}
            lanes={workspaceLanesNode}
            columns={opportunityColumns}
            items={tableOpportunities}
            getRowId={(item) => item.id}
            loading={loading}
            emptyTitle={
              isWorkspaceEmpty ? "Sin oportunidades" : "No hay oportunidades con la vista actual"
            }
            emptyDescription={
              isWorkspaceEmpty
                ? "Crea la primera oportunidad para activar el handoff a pricing y empezar a construir pipeline comercial desde esta misma pantalla."
                : "Prueba otra combinación de lane, búsqueda o cliente para volver a poblar la tabla."
            }
          />
        ) : (
          <div className="space-y-4">
            {workspaceToolbar}
            {workspaceLanesNode}
            <PriorityKanbanBoard
              lanes={lanes}
              highlightedLaneKey={activeLane}
              itemsByLane={boardItemsByLane}
              getItemId={(item) => item.id}
              loading={loading}
              emptyTitle={
                isWorkspaceEmpty ? "Sin oportunidades" : "No hay oportunidades con la vista actual"
              }
              emptyDescription={
                isWorkspaceEmpty
                  ? "Crea la primera oportunidad para empezar a mover el pipeline comercial en formato board."
                  : "Prueba otra búsqueda o limpia filtros para volver a poblar el board."
              }
              onMoveItem={(itemId, _sourceLaneKey, targetLaneKey) =>
                handleMoveOpportunity(itemId, targetLaneKey as OpportunityWorkspaceLane)
              }
              renderCard={(item, helpers) => {
                const currentLaneIndex = statusOptions.indexOf(item.status as OpportunityWorkspaceLane)
                const prevLaneLabel =
                  currentLaneIndex > 0 ? laneMeta[statusOptions[currentLaneIndex - 1]].label : undefined
                const nextLaneLabel =
                  currentLaneIndex >= 0 && currentLaneIndex < statusOptions.length - 1
                    ? laneMeta[statusOptions[currentLaneIndex + 1]].label
                    : undefined

                return (
                  <PriorityKanbanCard
                    title={null}
                    subtitle={item.client_name || "Sin cliente"}
                    description={
                      [item.service_type, item.transport_type].filter(Boolean).join(" / ") ||
                      "Servicio pendiente"
                    }
                    badges={
                      <>
                        <StatusBadge status={item.status} />
                        {item.origin && item.destination ? (
                          <span className="rounded-full bg-[rgba(11,31,59,0.08)] px-2.5 py-1 text-xs font-semibold text-[var(--brand-navy)]">
                            {`${item.origin} -> ${item.destination}`}
                          </span>
                        ) : null}
                      </>
                    }
                    meta={
                      <div className="space-y-1">
                        <div>{item.salesperson_name || "Sin responsable"}</div>
                        <div className="text-xs text-[#607187]">
                          {item.estimated_value != null
                            ? `Pipeline estimado $${item.estimated_value.toLocaleString()}`
                            : "Sin valor estimado"}
                        </div>
                      </div>
                    }
                    actions={
                      <>
                        <Button type="button" size="sm" variant="outline" asChild>
                          <Link href={`/opportunities/${item.id}`}>Abrir</Link>
                        </Button>
                        {item.client_id ? (
                          <Button type="button" size="sm" variant="outline" asChild>
                            <Link href={`/clients/${item.client_id}`}>Cliente</Link>
                          </Button>
                        ) : (
                          <Button type="button" size="sm" variant="outline" asChild>
                            <Link href={`/opportunities/${item.id}`}>Cotizar</Link>
                          </Button>
                        )}
                      </>
                    }
                    footer={
                      item.expiration_date ? `Vence ${item.expiration_date}` : "Sin fecha de vencimiento"
                    }
                    isDragging={helpers.isDragging}
                    isMoving={movingId === item.id}
                    onMovePrev={helpers.moveToPrevLane}
                    onMoveNext={helpers.moveToNextLane}
                    movePrevLabel={prevLaneLabel ? `Mover a ${prevLaneLabel}` : undefined}
                    moveNextLabel={nextLaneLabel ? `Mover a ${nextLaneLabel}` : undefined}
                  />
                )
              }}
            />
          </div>
        )}
      </section>

      {showCreateModal ? (
        <Modal
          title="Añadir oportunidad"
          description="Crea una oportunidad comercial usando cliente, servicio, transporte y trayecto estandarizado."
          size="workspace"
          onClose={() => {
            setShowCreateModal(false)
            setFormValues(emptyForm)
          }}
        >
          <OpportunityForm
            title="Nueva oportunidad"
            description="La información principal se captura en secciones limpias y el valor estimado se calcula automáticamente."
            values={formValues}
            clients={clients}
            users={users}
            serviceTransportTypes={serviceTransportTypes}
            incoterms={incoterms}
            onChange={(field, value) => {
              setFormValues((current) => {
                if (field === "clientId") {
                  const client = clients.find((item) => item.id === value)
                  return {
                    ...current,
                    clientId: value,
                    salespersonId: current.salespersonId || client?.account_owner_id || "",
                  }
                }

                return {
                  ...current,
                  [field]: value,
                }
              })
            }}
            onSubmit={handleCreateOpportunity}
            submitLabel="Guardar oportunidad"
            loading={creating}
          />
        </Modal>
      ) : null}

      {confirmDialog}
    </PageContainer>
  )
}
