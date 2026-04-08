"use client"

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  createClient,
  deleteClient,
  getBackendMode,
  getClientSummaries,
  getUsers,
  getWorkspaceViews,
  createWorkspaceView,
  updateWorkspaceView,
  deleteWorkspaceView,
  setDefaultWorkspaceView,
  updateClient,
  type BackendMode,
  type ClientSummary,
  type SavedWorkspaceView,
  type SavedWorkspaceViewPayload,
  type User,
  type WorkspaceKey,
} from "@/lib/db"
import { getErrorMessage, notifyError, notifyWarning } from "@/lib/feedback"
import { PageContainer } from "@/components/layout/PageContainer"
import { Modal } from "@/components/data/Modal"
import { StatusBadge } from "@/components/data/StatusBadge"
import { ClientForm } from "@/components/forms/ClientForm"
import {
  PriorityActionMenu,
  PriorityActionRail,
  PriorityCollectionWorkspace,
  PriorityFilterPopover,
  PriorityKanbanBoard,
  PriorityKanbanCard,
  PrioritySavedViews,
  PrioritySearchField,
  PriorityStatusLanes,
  type PriorityCollectionColumn,
  type PriorityStatusLaneItem,
} from "@/components/priority"
import { PrioritySelectField } from "@/components/priority/PriorityForm"
import { usePriorityConfirm } from "@/components/priority/usePriorityConfirm"
import { Button } from "@/components/ui/button"
import { clientStatusOptions } from "@/features/client-detail/helpers"
import type { ClientFormSchemaValues } from "@/features/client-detail/schemas/client-form"

type ClientWorkspaceLane =
  | "prospecto"
  | "buscando_informacion"
  | "cotizando"
  | "aceptacion_verbal"
  | "cliente"

type ClientFilterState = {
  sortBy: "name" | "city" | "country" | "opportunities" | "pipeline"
  viewMode: "table" | "board"
}

const workspaceKey: WorkspaceKey = "clients"
const defaultLane: ClientWorkspaceLane = "prospecto"
const defaultFilters: ClientFilterState = {
  sortBy: "name",
  viewMode: "table",
}
const defaultVisibleColumns = [
  "quickActions",
  "client_name",
  "status",
  "location",
  "account_owner_name",
  "total_opportunities",
  "pipeline_value",
  "actions",
]

const emptyForm: ClientFormSchemaValues = {
  companyName: "",
  taxId: "",
  status: "prospecto",
  accountOwnerId: "",
  industry: "",
  country: "",
  website: "",
  corporatePhone: "",
  fullAddress: "",
  postalCode: "",
  city: "",
  cityUnlocode: "",
}

const laneMeta: Record<
  ClientWorkspaceLane,
  { label: string; helper: string; tone: PriorityStatusLaneItem["tone"] }
> = {
  prospecto: {
    label: "Prospectos",
    helper: "Cuentas recien abiertas o en calificación inicial.",
    tone: "info",
  },
  buscando_informacion: {
    label: "Investigando",
    helper: "Clientes en levantamiento operativo y documental.",
    tone: "neutral",
  },
  cotizando: {
    label: "Cotizando",
    helper: "Cuentas ya ligadas a una oportunidad o propuesta activa.",
    tone: "warning",
  },
  aceptacion_verbal: {
    label: "Aceptacion verbal",
    helper: "Clientes cerca del cierre comercial formal.",
    tone: "spotlight",
  },
  cliente: {
    label: "Clientes activos",
    helper: "Cuentas consolidadas y operando en el ERP.",
    tone: "success",
  },
}

function parseFilters(raw: Record<string, unknown> | null | undefined): ClientFilterState {
  const allowed = new Set(["name", "city", "country", "opportunities", "pipeline"])
  const rawSort = typeof raw?.sortBy === "string" ? raw.sortBy : "name"
  return {
    sortBy: allowed.has(rawSort) ? (rawSort as ClientFilterState["sortBy"]) : "name",
    viewMode: raw?.viewMode === "board" ? "board" : "table",
  }
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [backendMode, setBackendMode] = useState<BackendMode>("canonical")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formValues, setFormValues] = useState<ClientFormSchemaValues>(emptyForm)
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [activeLane, setActiveLane] = useState<ClientWorkspaceLane>(defaultLane)
  const [filterState, setFilterState] = useState<ClientFilterState>(defaultFilters)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savedViews, setSavedViews] = useState<SavedWorkspaceView[]>([])
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null)
  const [isDefaultViewApplied, setIsDefaultViewApplied] = useState(false)
  const { confirm, confirmDialog } = usePriorityConfirm()

  const laneCounts = useMemo(
    () =>
      (clientStatusOptions.map((option) => option.value) as ClientWorkspaceLane[]).reduce(
        (accumulator, lane) => ({
          ...accumulator,
          [lane]: clients.filter((client) => client.status === lane).length,
        }),
        {
          prospecto: 0,
          buscando_informacion: 0,
          cotizando: 0,
          aceptacion_verbal: 0,
          cliente: 0,
        }
      ),
    [clients]
  )

  const lanes = useMemo<PriorityStatusLaneItem[]>(
    () =>
      (clientStatusOptions.map((option) => option.value) as ClientWorkspaceLane[]).map((lane) => ({
        key: lane,
        label: laneMeta[lane].label,
        helper: laneMeta[lane].helper,
        count: laneCounts[lane],
        tone: laneMeta[lane].tone,
      })),
    [laneCounts]
  )

  const sortedClients = useMemo(() => {
    return [...clients].sort((left, right) => {
      if (filterState.sortBy === "country") {
        return (left.country || "").localeCompare(right.country || "")
      }

      if (filterState.sortBy === "city") {
        return (left.city || "").localeCompare(right.city || "")
      }

      if (filterState.sortBy === "opportunities") {
        return (right.total_opportunities ?? 0) - (left.total_opportunities ?? 0)
      }

      if (filterState.sortBy === "pipeline") {
        return (right.pipeline_value ?? 0) - (left.pipeline_value ?? 0)
      }

      return (left.client_name || "").localeCompare(right.client_name || "")
    })
  }, [clients, filterState.sortBy])

  const tableClients = useMemo(
    () => sortedClients.filter((client) => client.status === activeLane),
    [activeLane, sortedClients]
  )

  const activeFilterCount = useMemo(
    () => [filterState.sortBy !== "name"].filter(Boolean).length,
    [filterState.sortBy]
  )

  const quickViews = useMemo(
    () => [
      {
        key: "prospectos",
        label: "Prospectos",
        active:
          !selectedViewId &&
          activeLane === "prospecto" &&
          filterState.sortBy === "name" &&
          !search.trim() &&
          filterState.viewMode === "table",
        onSelect: () => {
          setSelectedViewId(null)
          setIsDefaultViewApplied(false)
          setSearch("")
          setActiveLane("prospecto")
          setFilterState(defaultFilters)
        },
      },
      {
        key: "cotizando",
        label: "Cotizando",
        active:
          !selectedViewId &&
          activeLane === "cotizando" &&
          filterState.sortBy === "name" &&
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
        key: "clientes-activos",
        label: "Clientes activos",
        active:
          !selectedViewId &&
          activeLane === "cliente" &&
          filterState.sortBy === "name" &&
          !search.trim() &&
          filterState.viewMode === "table",
        onSelect: () => {
          setSelectedViewId(null)
          setIsDefaultViewApplied(false)
          setSearch("")
          setActiveLane("cliente")
          setFilterState(defaultFilters)
        },
      },
    ],
    [activeLane, filterState.sortBy, filterState.viewMode, search, selectedViewId]
  )

  const loadClients = useCallback(async (queryValue: string) => {
    try {
      setLoading(true)
      const data = await getClientSummaries(queryValue)
      setClients(data)
    } catch (error) {
      console.error(error)
      notifyError("No se pudieron cargar los clientes", getErrorMessage(error, "Intenta nuevamente."))
    } finally {
      setLoading(false)
    }
  }, [])

  function resetCreateForm() {
    setFormValues(emptyForm)
  }

  async function handleCreateClient() {
    if (!formValues.companyName.trim()) {
      notifyWarning("El nombre de la empresa es obligatorio")
      return
    }

    if (!formValues.website.trim()) {
      notifyWarning("La página web es obligatoria")
      return
    }

    if (!formValues.corporatePhone.trim()) {
      notifyWarning("El teléfono corporativo es obligatorio")
      return
    }

    try {
      setCreating(true)
      await createClient({
        company_name: formValues.companyName.trim(),
        account_owner_id: formValues.accountOwnerId || null,
        tax_id: formValues.taxId.trim() || null,
        status: formValues.status,
        industry: formValues.industry.trim() || null,
        country: formValues.country.trim() || null,
        website: formValues.website.trim(),
        corporate_phone: formValues.corporatePhone.trim(),
        full_address: formValues.fullAddress.trim() || null,
        postal_code: formValues.postalCode.trim() || null,
        city: formValues.city.trim() || null,
        city_unlocode: formValues.cityUnlocode.trim() || null,
      })

      resetCreateForm()
      setShowCreateModal(false)
      await loadClients(search)
    } catch (error) {
      console.error(error)
      notifyError("No se pudo crear el cliente", getErrorMessage(error, "Intenta nuevamente."))
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteClient = useCallback(async (id: string, name: string) => {
    const confirmed = await confirm({
      title: "Eliminar cliente",
      description: `Se eliminara ${name} y tambien los contactos y oportunidades vinculados por el workflow canonico.`,
      actionLabel: "Eliminar cliente",
      variant: "destructive",
    })

    if (!confirmed) {
      return
    }

    try {
      setDeletingId(id)
      await deleteClient(id)
      await loadClients(search)
    } catch (error) {
      console.error(error)
      notifyError("No se pudo eliminar el cliente", getErrorMessage(error, "Intenta nuevamente."))
    } finally {
      setDeletingId(null)
    }
  }, [confirm, loadClients, search])

  const handleMoveClient = useCallback(async (id: string, targetLane: ClientWorkspaceLane) => {
    const currentClient = clients.find((item) => item.id === id)
    const previousLane = currentClient?.status as ClientWorkspaceLane | null

    if (!previousLane || previousLane === targetLane) {
      return
    }

    setMovingId(id)
    setClients((current) =>
      current.map((item) => (item.id === id ? { ...item, status: targetLane } : item))
    )

    try {
      await updateClient(id, { status: targetLane })
      await loadClients(search)
      setSelectedViewId(null)
      setIsDefaultViewApplied(false)
      setActiveLane(targetLane)
    } catch (error) {
      console.error(error)
      setClients((current) =>
        current.map((item) => (item.id === id ? { ...item, status: previousLane } : item))
      )
      notifyError("No se pudo mover el cliente", getErrorMessage(error, "Intenta nuevamente."))
    } finally {
      setMovingId(null)
    }
  }, [clients, loadClients, search])

  function applyWorkspaceView(view: SavedWorkspaceView) {
    setSearch(view.search_query ?? "")
    setActiveLane((view.status_lane as ClientWorkspaceLane | null) ?? defaultLane)
    setFilterState(parseFilters(view.filters_json))
    setSelectedViewId(view.id)
    setIsDefaultViewApplied(view.is_default)
  }

  const bootstrapWorkspace = useCallback(async () => {
    try {
      const [mode, userData, views] = await Promise.all([
        getBackendMode(),
        getUsers(),
        getWorkspaceViews(workspaceKey),
      ])

      setBackendMode(mode)
      setUsers(userData)
      setSavedViews(views)

      const defaultView = views.find((view) => view.is_default)
      if (defaultView) {
        applyWorkspaceView(defaultView)
      }
    } catch (error) {
      console.error(error)
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
    void loadClients(deferredSearch)
  }, [deferredSearch, loadClients])

  function buildCurrentViewPayload(name: string, isDefault: boolean): SavedWorkspaceViewPayload {
    return {
      workspace_key: workspaceKey,
      name,
      search_query: search.trim() || null,
      status_lane: activeLane,
      filters_json: {
        sortBy: filterState.sortBy,
        viewMode: filterState.viewMode,
      },
      sort_json: {
        orderBy: filterState.sortBy,
      },
      visible_columns_json: defaultVisibleColumns,
      is_default: isDefault,
    }
  }

  const clientColumns = useMemo<PriorityCollectionColumn<ClientSummary>[]>(
    () => [
      {
        id: "quickActions",
        header: "Flujo",
        className: "min-w-[220px]",
        headClassName: "min-w-[220px]",
        cell: (item) => (
          <PriorityActionRail
            compact
            actions={[
              { label: "Ver detalle", href: `/clients/${item.id}`, variant: "default" },
              { label: "Oportunidad", href: `/opportunities?clientId=${item.id}`, variant: "outline" },
            ]}
          />
        ),
      },
      {
        id: "client_name",
        header: "Cliente",
        className: "min-w-[220px]",
        cell: (item) => (
          <div className="space-y-1">
            <div className="font-medium text-[var(--brand-navy)]">{item.client_name || "Cliente"}</div>
            <div className="text-xs text-[#5B6A7D]">{item.account_owner_name || "Sin owner"}</div>
          </div>
        ),
      },
      {
        id: "status",
        header: "Estatus",
        className: "min-w-[160px]",
        cell: (item) => <StatusBadge status={item.status} />,
      },
      {
        id: "location",
        header: "Ubicacion",
        className: "min-w-[180px]",
        cell: (item) => [item.city, item.country].filter(Boolean).join(" · ") || "No definida",
      },
      {
        id: "account_owner_name",
        header: "Owner",
        className: "min-w-[180px]",
        cell: (item) => item.account_owner_name || "Sin owner",
      },
      {
        id: "total_opportunities",
        header: "Oportunidades",
        className: "min-w-[140px]",
        cell: (item) => item.total_opportunities ?? 0,
      },
      {
        id: "pipeline_value",
        header: "Pipeline",
        className: "min-w-[160px]",
        cell: (item) => `$${(item.pipeline_value ?? 0).toLocaleString()}`,
      },
      {
        id: "actions",
        header: "Mas",
        className: "w-[72px]",
        headClassName: "w-[72px]",
        cell: (item) => (
          <div className="flex justify-end">
            <PriorityActionMenu
              label={`Mas acciones para ${item.client_name || "cliente"}`}
              actions={[
                { label: "Ver detalle", href: `/clients/${item.id}` },
                { label: "Nueva oportunidad", href: `/opportunities?clientId=${item.id}` },
                {
                  label: deletingId === item.id ? "Eliminando..." : "Eliminar",
                  onPress: () => void handleDeleteClient(item.id, item.client_name || "este cliente"),
                  disabled: deletingId === item.id,
                },
              ]}
            />
          </div>
        ),
      },
    ],
    [deletingId, handleDeleteClient]
  )

  const boardItemsByLane = useMemo(
    () =>
      (clientStatusOptions.map((option) => option.value) as ClientWorkspaceLane[]).reduce<Record<string, ClientSummary[]>>(
        (accumulator, lane) => ({
          ...accumulator,
          [lane]: sortedClients.filter((client) => client.status === lane),
        }),
        {}
      ),
    [sortedClients]
  )

  const totalPipelineValue = sortedClients.reduce(
    (sum, client) => sum + (client.pipeline_value ?? 0),
    0
  )
  const representedCountries = new Set(sortedClients.map((client) => client.country).filter(Boolean)).size
  const visibleCount = filterState.viewMode === "board" ? sortedClients.length : tableClients.length
  const isWorkspaceEmpty = !loading && clients.length === 0 && !search.trim() && activeFilterCount === 0

  return (
    <PageContainer
      density="compact"
      title="Clientes"
      description="Workspace comercial para cuentas, responsables, ubicación y valor activo del pipeline."
      meta={
        <div className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-medium text-[var(--brand-soft-gray)]">
          Backend mode: <span className="font-semibold text-white">{backendMode}</span>
        </div>
      }
      actions={
        !isWorkspaceEmpty ? (
          <Button type="button" size="lg" onClick={() => setShowCreateModal(true)}>
            Añadir cliente
          </Button>
        ) : null
      }
    >
      <section className="workspace-panel space-y-4 rounded-[24px] p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#607187]">
              Clients workspace
              {isDefaultViewApplied && selectedViewId ? (
                <span className="rounded-full bg-[rgba(179,58,91,0.08)] px-2 py-0.5 text-[10px] tracking-[0.14em] text-[var(--brand-burgundy)]">
                  Vista default aplicada
                </span>
              ) : null}
            </div>
            <h2 className="text-[1.24rem] font-semibold tracking-[-0.02em] text-[var(--brand-navy)]">
              CRM de cuentas por madurez comercial
            </h2>
            <p className="max-w-4xl text-[0.95rem] leading-7 text-[#607187]">
              El cliente ya no vive como lista plana: ahora puedes leer su avance por lane y saltar
              directo a detalle u oportunidad nueva desde la misma fila.
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
                Pipeline / cobertura
              </div>
              <div className="mt-1 text-[0.98rem] font-semibold text-[var(--brand-navy)]">
                ${totalPipelineValue.toLocaleString()} / {representedCountries} paises
              </div>
            </div>
          </div>
        </div>

        {filterState.viewMode === "table" ? (
          <PriorityCollectionWorkspace
            toolbar={
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_auto_auto_auto_auto] xl:items-center">
                <PrioritySearchField
                  value={search}
                  onChange={(value) => {
                    setSelectedViewId(null)
                    setIsDefaultViewApplied(false)
                    setSearch(value)
                  }}
                  placeholder="Buscar por empresa, owner o ubicación"
                  ariaLabel="Buscar clientes"
                />
                <PriorityFilterPopover
                  title="Filtros del CRM"
                  description="Ajusta el orden de la lista antes de guardar una vista operativa."
                  activeCount={activeFilterCount}
                  onApply={() => undefined}
                  onClear={() => {
                    setSelectedViewId(null)
                    setIsDefaultViewApplied(false)
                    setFilterState(defaultFilters)
                  }}
                >
                  <PrioritySelectField
                    value={filterState.sortBy}
                    onValueChange={(value) => {
                      setSelectedViewId(null)
                      setIsDefaultViewApplied(false)
                      setFilterState((current) => ({
                        ...current,
                        sortBy: value as ClientFilterState["sortBy"],
                      }))
                    }}
                    placeholder="Ordena la lista"
                    options={[
                      { value: "name", label: "Ordenar: Nombre" },
                      { value: "city", label: "Ordenar: Ciudad" },
                      { value: "country", label: "Ordenar: País" },
                      { value: "opportunities", label: "Ordenar: Oportunidades" },
                      { value: "pipeline", label: "Ordenar: Pipeline" },
                    ]}
                  />
                </PriorityFilterPopover>
                <div className="inline-flex items-center rounded-full border border-[rgba(144,158,174,0.16)] bg-white p-1 shadow-[0_14px_30px_-26px_rgba(3,10,24,0.38)]">
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
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
                    variant="ghost"
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
                    await updateWorkspaceView(
                      viewId,
                      buildCurrentViewPayload(currentView.name, currentView.is_default)
                    )
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
            }
            lanes={
              <PriorityStatusLanes
                lanes={lanes}
                activeKey={activeLane}
                onChange={(key) => {
                  setSelectedViewId(null)
                  setIsDefaultViewApplied(false)
                  setActiveLane(key as ClientWorkspaceLane)
                }}
                className="xl:grid-cols-5"
              />
            }
            columns={clientColumns}
            items={tableClients}
            getRowId={(item) => item.id}
            loading={loading}
            emptyTitle={
              isWorkspaceEmpty ? "Sin clientes registrados" : "No hay clientes con la vista actual"
            }
            emptyDescription={
              isWorkspaceEmpty
                ? "Empieza con la primera cuenta para activar CRM, contactos y oportunidades sin navegar de más."
                : "Prueba otra lane, búsqueda o criterio de orden para volver a poblar la mesa comercial."
            }
            emptyAction={
              <Button type="button" onClick={() => setShowCreateModal(true)}>
                Añadir cliente
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_auto_auto_auto_auto] xl:items-center">
              <PrioritySearchField
                value={search}
                onChange={(value) => {
                  setSelectedViewId(null)
                  setIsDefaultViewApplied(false)
                  setSearch(value)
                }}
                placeholder="Buscar por empresa, owner o ubicación"
                ariaLabel="Buscar clientes"
              />
              <PriorityFilterPopover
                title="Filtros del CRM"
                description="Ajusta el orden del pipeline antes de guardar una vista operativa."
                activeCount={activeFilterCount}
                onApply={() => undefined}
                onClear={() => {
                  setSelectedViewId(null)
                  setIsDefaultViewApplied(false)
                  setFilterState(defaultFilters)
                }}
              >
                <PrioritySelectField
                  value={filterState.sortBy}
                  onValueChange={(value) => {
                    setSelectedViewId(null)
                    setIsDefaultViewApplied(false)
                    setFilterState((current) => ({
                      ...current,
                      sortBy: value as ClientFilterState["sortBy"],
                    }))
                  }}
                  placeholder="Ordena la lista"
                  options={[
                    { value: "name", label: "Ordenar: Nombre" },
                    { value: "city", label: "Ordenar: Ciudad" },
                    { value: "country", label: "Ordenar: País" },
                    { value: "opportunities", label: "Ordenar: Oportunidades" },
                    { value: "pipeline", label: "Ordenar: Pipeline" },
                  ]}
                />
              </PriorityFilterPopover>
              <div className="inline-flex items-center rounded-full border border-[rgba(144,158,174,0.16)] bg-white p-1 shadow-[0_14px_30px_-26px_rgba(3,10,24,0.38)]">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
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
                  variant="default"
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
                  await updateWorkspaceView(
                    viewId,
                    buildCurrentViewPayload(currentView.name, currentView.is_default)
                  )
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

            <PriorityStatusLanes
              lanes={lanes}
              activeKey={activeLane}
              onChange={(key) => {
                setSelectedViewId(null)
                setIsDefaultViewApplied(false)
                setActiveLane(key as ClientWorkspaceLane)
              }}
              className="xl:grid-cols-5"
            />

            <PriorityKanbanBoard
              lanes={lanes}
              highlightedLaneKey={activeLane}
              itemsByLane={boardItemsByLane}
              getItemId={(item) => item.id}
              loading={loading}
              emptyTitle={
                isWorkspaceEmpty ? "Sin clientes registrados" : "No hay clientes con la vista actual"
              }
              emptyDescription={
                isWorkspaceEmpty
                  ? "Empieza con la primera cuenta para activar el pipeline de clientes en modo board."
                  : "Prueba otra búsqueda o criterio de orden para volver a poblar el pipeline de clientes."
              }
              emptyAction={
                <Button type="button" onClick={() => setShowCreateModal(true)}>
                  Añadir cliente
                </Button>
              }
              onMoveItem={(itemId, _sourceLaneKey, targetLaneKey) =>
                handleMoveClient(itemId, targetLaneKey as ClientWorkspaceLane)
              }
              renderCard={(item, helpers) => {
                const laneOrder = clientStatusOptions.map((option) => option.value) as ClientWorkspaceLane[]
                const currentLaneIndex = laneOrder.indexOf(item.status as ClientWorkspaceLane)
                const prevLaneLabel =
                  currentLaneIndex > 0 ? laneMeta[laneOrder[currentLaneIndex - 1]].label : undefined
                const nextLaneLabel =
                  currentLaneIndex >= 0 && currentLaneIndex < laneOrder.length - 1
                    ? laneMeta[laneOrder[currentLaneIndex + 1]].label
                    : undefined

                return (
                  <PriorityKanbanCard
                    title={item.client_name || "Cliente"}
                    subtitle={item.account_owner_name || "Sin owner"}
                    description={[item.city, item.country].filter(Boolean).join(" · ") || "Ubicación pendiente"}
                    badges={
                      <>
                        <StatusBadge status={item.status} />
                        <span className="rounded-full bg-[rgba(11,31,59,0.08)] px-2.5 py-1 text-xs font-semibold text-[var(--brand-navy)]">
                          {item.total_opportunities ?? 0} oportunidades
                        </span>
                      </>
                    }
                    meta={
                      <div className="space-y-1">
                        <div>{item.account_owner_name || "Sin owner"}</div>
                        <div className="text-xs text-[#607187]">
                          Pipeline ${Number(item.pipeline_value ?? 0).toLocaleString()}
                        </div>
                      </div>
                    }
                    actions={
                      <>
                        <Button type="button" size="sm" variant="outline" asChild>
                          <Link href={`/clients/${item.id}`}>Abrir</Link>
                        </Button>
                        <Button type="button" size="sm" variant="outline" asChild>
                          <Link href={`/opportunities?clientId=${item.id}`}>Oportunidad</Link>
                        </Button>
                      </>
                    }
                    footer={
                      item.total_opportunities
                        ? `${item.total_opportunities} oportunidad${item.total_opportunities === 1 ? "" : "es"} activas`
                        : "Sin oportunidades activas"
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
          title="Añadir cliente"
          description="Nombre, página web y teléfono corporativo son obligatorios."
          size="workspace"
          onClose={() => {
            setShowCreateModal(false)
            resetCreateForm()
          }}
        >
          <ClientForm
            title="Nuevo cliente"
            description="Completa el perfil basico y agrega los datos operativos cuando los tengas."
            values={{
              ...formValues,
            }}
            users={users}
            onChange={(field, value) => {
              setFormValues((current) => ({
                ...current,
                [field]: value,
              }))
            }}
            onSubmit={handleCreateClient}
            submitLabel="Guardar cliente"
            loading={creating}
            submitNote="El perfil completo del cliente se guarda en el backend canonico."
          />
        </Modal>
      ) : null}

      {confirmDialog}
    </PageContainer>
  )
}
