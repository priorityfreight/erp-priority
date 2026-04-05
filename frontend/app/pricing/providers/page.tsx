"use client"

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  createProvider,
  deleteProvider,
  getProviderSummaries,
  getWorkspaceViews,
  createWorkspaceView,
  updateWorkspaceView,
  deleteWorkspaceView,
  setDefaultWorkspaceView,
  type ProviderSummary,
  type SavedWorkspaceView,
  type SavedWorkspaceViewPayload,
  type WorkspaceKey,
} from "@/lib/db"
import { getErrorMessage, notifyError, notifyWarning } from "@/lib/feedback"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/data/Modal"
import { StatusBadge } from "@/components/data/StatusBadge"
import { usePriorityConfirm } from "@/components/priority/usePriorityConfirm"
import {
  PriorityActionMenu,
  PriorityActionRail,
  PriorityCollectionWorkspace,
  PriorityFilterPopover,
  PrioritySavedViews,
  PrioritySearchField,
  PrioritySectionAlert,
  PriorityStatusLanes,
  type PriorityCollectionColumn,
  type PriorityStatusLaneItem,
} from "@/components/priority"
import { PrioritySelectField } from "@/components/priority/PriorityForm"
import { PriorityTypography } from "@/components/priority/PriorityTypography"
import {
  ProviderForm,
  type ProviderFormValues,
} from "@/components/forms/ProviderForm"
import { PageContainer } from "@/components/layout/PageContainer"

type ProviderWorkspaceLane = "en_proceso_de_alta" | "activo" | "inactivo"

type ProviderFilterState = {
  providerType: string | null
}

const workspaceKey: WorkspaceKey = "providers"
const allFilterValue = "__all__"
const defaultLane: ProviderWorkspaceLane = "activo"
const defaultFilters: ProviderFilterState = {
  providerType: null,
}
const defaultVisibleColumns = [
  "quickActions",
  "provider_name",
  "provider_type",
  "location",
  "status",
  "total_service_offerings",
  "total_contacts",
  "credit",
  "actions",
]

const emptyForm: ProviderFormValues = {
  name: "",
  taxId: "",
  status: "en_proceso_de_alta",
  providerType: "",
  corporatePhone: "",
  companyEmail: "",
  website: "",
  fullAddress: "",
  postalCode: "",
  city: "",
  cityUnlocode: "",
  country: "",
  creditActive: "no",
  creditAmount: "",
  creditDays: "",
}

const laneMeta: Record<
  ProviderWorkspaceLane,
  { label: string; helper: string; tone: PriorityStatusLaneItem["tone"] }
> = {
  en_proceso_de_alta: {
    label: "En alta",
    helper: "Proveedores todavía en configuración y revisión interna.",
    tone: "warning",
  },
  activo: {
    label: "Activos",
    helper: "Listos para cotizar, negociar y capturar compra.",
    tone: "success",
  },
  inactivo: {
    label: "Inactivos",
    helper: "Fuera de operación o retenidos temporalmente.",
    tone: "danger",
  },
}

function parseFilters(raw: Record<string, unknown> | null | undefined): ProviderFilterState {
  return {
    providerType:
      typeof raw?.providerType === "string" && raw.providerType.trim() ? raw.providerType : null,
  }
}

export default function ProvidersPage() {
  const router = useRouter()
  const [providers, setProviders] = useState<ProviderSummary[]>([])
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [activeLane, setActiveLane] = useState<ProviderWorkspaceLane>(defaultLane)
  const [filterState, setFilterState] = useState<ProviderFilterState>(defaultFilters)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formValues, setFormValues] = useState<ProviderFormValues>(emptyForm)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savedViews, setSavedViews] = useState<SavedWorkspaceView[]>([])
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null)
  const [isDefaultViewApplied, setIsDefaultViewApplied] = useState(false)
  const { confirm, confirmDialog } = usePriorityConfirm()

  const loadProviders = useCallback(async (query = "") => {
    try {
      setLoading(true)
      const data = await getProviderSummaries(query)
      setProviders(data)
    } catch (error) {
      console.error(error)
      notifyError("No se pudieron cargar los proveedores", getErrorMessage(error, "Intenta nuevamente."))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProviders(deferredSearch)
  }, [deferredSearch, loadProviders])

  function handleChange(field: keyof ProviderFormValues, value: string) {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function resetForm() {
    setFormValues(emptyForm)
  }

  async function handleCreateProvider() {
    if (!formValues.name.trim()) {
      notifyWarning("Nombre del proveedor requerido")
      return
    }

    try {
      setCreating(true)
      await createProvider({
        name: formValues.name.trim(),
        tax_id: formValues.taxId.trim() || null,
        status: formValues.status,
        provider_type: formValues.providerType.trim() || null,
        corporate_phone: formValues.corporatePhone.trim() || null,
        company_email: formValues.companyEmail.trim() || null,
        website: formValues.website.trim() || null,
        full_address: formValues.fullAddress.trim() || null,
        postal_code: formValues.postalCode.trim() || null,
        city_unlocode: formValues.cityUnlocode.trim() || null,
        credit_active: formValues.creditActive === "si",
        credit_amount: formValues.creditAmount ? Number(formValues.creditAmount) : null,
        credit_days: formValues.creditDays ? Number(formValues.creditDays) : null,
      })

      resetForm()
      setShowCreateModal(false)
      await loadProviders(search)
    } catch (error) {
      console.error(error)
      notifyError("No se pudo crear el proveedor", getErrorMessage(error, "Intenta nuevamente."))
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteProvider = useCallback(async (id: string) => {
    const confirmed = await confirm({
      title: "Eliminar proveedor",
      description: "Se eliminara el proveedor junto con sus contactos y servicios ofrecidos.",
      actionLabel: "Eliminar proveedor",
      variant: "destructive",
    })

    if (!confirmed) {
      return
    }

    try {
      setDeletingId(id)
      await deleteProvider(id)
      await loadProviders(search)
    } catch (error) {
      console.error(error)
      notifyError("No se pudo eliminar el proveedor", getErrorMessage(error, "Intenta nuevamente."))
    } finally {
      setDeletingId(null)
    }
  }, [confirm, loadProviders, search])

  const laneCounts = useMemo(
    () =>
      (Object.keys(laneMeta) as ProviderWorkspaceLane[]).reduce(
        (accumulator, lane) => ({
          ...accumulator,
          [lane]: providers.filter((provider) => provider.status === lane).length,
        }),
        {
          en_proceso_de_alta: 0,
          activo: 0,
          inactivo: 0,
        }
      ),
    [providers]
  )

  const lanes = useMemo<PriorityStatusLaneItem[]>(
    () =>
      (Object.keys(laneMeta) as ProviderWorkspaceLane[]).map((lane) => ({
        key: lane,
        label: laneMeta[lane].label,
        helper: laneMeta[lane].helper,
        count: laneCounts[lane],
        tone: laneMeta[lane].tone,
      })),
    [laneCounts]
  )

  const providerTypeOptions = useMemo(
    () =>
      Array.from(new Set(providers.map((provider) => provider.provider_type).filter(Boolean) as string[]))
        .sort((left, right) => left.localeCompare(right))
        .map((providerType) => ({ value: providerType, label: providerType })),
    [providers]
  )

  const filteredProviders = useMemo(
    () =>
      providers.filter((provider) => {
        if (provider.status !== activeLane) {
          return false
        }

        if (filterState.providerType && (provider.provider_type || "") !== filterState.providerType) {
          return false
        }

        return true
      }),
    [activeLane, filterState.providerType, providers]
  )

  const activeFilterCount = useMemo(
    () => [filterState.providerType].filter(Boolean).length,
    [filterState.providerType]
  )

  const quickViews = useMemo(
    () => [
      {
        key: "activos",
        label: "Activos",
        active: !selectedViewId && activeLane === "activo" && !filterState.providerType && !search.trim(),
        onSelect: () => {
          setSelectedViewId(null)
          setIsDefaultViewApplied(false)
          setSearch("")
          setActiveLane("activo")
          setFilterState(defaultFilters)
        },
      },
      {
        key: "en-alta",
        label: "En alta",
        active:
          !selectedViewId &&
          activeLane === "en_proceso_de_alta" &&
          !filterState.providerType &&
          !search.trim(),
        onSelect: () => {
          setSelectedViewId(null)
          setIsDefaultViewApplied(false)
          setSearch("")
          setActiveLane("en_proceso_de_alta")
          setFilterState(defaultFilters)
        },
      },
      {
        key: "inactivos",
        label: "Inactivos",
        active: !selectedViewId && activeLane === "inactivo" && !filterState.providerType && !search.trim(),
        onSelect: () => {
          setSelectedViewId(null)
          setIsDefaultViewApplied(false)
          setSearch("")
          setActiveLane("inactivo")
          setFilterState(defaultFilters)
        },
      },
    ],
    [activeLane, filterState.providerType, search, selectedViewId]
  )

  function applyWorkspaceView(view: SavedWorkspaceView) {
    setSearch(view.search_query ?? "")
    setActiveLane((view.status_lane as ProviderWorkspaceLane | null) ?? defaultLane)
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

  function buildCurrentViewPayload(name: string, isDefault: boolean): SavedWorkspaceViewPayload {
    return {
      workspace_key: workspaceKey,
      name,
      search_query: search.trim() || null,
      status_lane: activeLane,
      filters_json: {
        providerType: filterState.providerType,
      },
      sort_json: {
        orderBy: "provider_name_asc",
      },
      visible_columns_json: defaultVisibleColumns,
      is_default: isDefault,
    }
  }

  const providerColumns = useMemo<PriorityCollectionColumn<ProviderSummary>[]>(
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
              {
                label: "Ver detalle",
                onPress: () => router.push(`/pricing/providers/${item.id}`),
                variant: "default",
              },
              {
                label: "Servicios",
                onPress: () => router.push(`/pricing/providers/${item.id}?tab=offerings`),
                variant: "outline",
              },
            ]}
          />
        ),
      },
      {
        id: "provider_name",
        header: "Proveedor",
        className: "min-w-[220px]",
        cell: (item) => item.provider_name,
      },
      {
        id: "provider_type",
        header: "Tipo",
        className: "min-w-[180px]",
        cell: (item) => item.provider_type || "No definido",
      },
      {
        id: "location",
        header: "Ubicacion",
        className: "min-w-[180px]",
        cell: (item) => [item.city, item.country].filter(Boolean).join(" · ") || "No disponible",
      },
      {
        id: "status",
        header: "Estatus",
        className: "min-w-[150px]",
        cell: (item) => <StatusBadge status={item.status} />,
      },
      {
        id: "total_service_offerings",
        header: "Servicios",
        className: "min-w-[120px]",
        cell: (item) => item.total_service_offerings,
      },
      {
        id: "total_contacts",
        header: "Contactos",
        className: "min-w-[120px]",
        cell: (item) => item.total_contacts,
      },
      {
        id: "credit",
        header: "Crédito",
        className: "min-w-[180px]",
        cell: (item) =>
          item.credit_active
            ? `$${(item.credit_amount ?? 0).toLocaleString()} / ${item.credit_days ?? 0} días`
            : "No",
      },
      {
        id: "actions",
        header: "Mas",
        className: "w-[72px]",
        headClassName: "w-[72px]",
        cell: (item) => (
          <div className="flex justify-end">
            <PriorityActionMenu
              actions={[
                {
                  label: "Ver detalle",
                  onPress: () => router.push(`/pricing/providers/${item.id}`),
                },
                {
                  label: deletingId === item.id ? "Eliminando..." : "Eliminar",
                  onPress: () => void handleDeleteProvider(item.id),
                  disabled: deletingId === item.id,
                },
              ]}
            />
          </div>
        ),
      },
    ],
    [deletingId, handleDeleteProvider, router]
  )

  const activeProviders = filteredProviders.filter((provider) => provider.status === "activo").length
  const creditProviders = filteredProviders.filter((provider) => provider.credit_active).length
  const totalOfferings = filteredProviders.reduce(
    (sum, provider) => sum + provider.total_service_offerings,
    0
  )
  const isWorkspaceEmpty = filteredProviders.length === 0 && providers.length === 0 && !search.trim() && activeFilterCount === 0

  return (
    <PageContainer
      density="compact"
      title="Proveedores"
      description="Workspace de pricing para empresas proveedoras, servicios ofertados y contactos operativos."
      actions={
        !isWorkspaceEmpty ? (
          <Button type="button" onClick={() => setShowCreateModal(true)}>
            Añadir proveedor
          </Button>
        ) : null
      }
    >
      <section className="workspace-panel space-y-4 rounded-[24px] p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#607187]">
              Providers workspace
              {isDefaultViewApplied && selectedViewId ? (
                <span className="rounded-full bg-[rgba(179,58,91,0.08)] px-2 py-0.5 text-[10px] tracking-[0.14em] text-[var(--brand-burgundy)]">
                  Vista default aplicada
                </span>
              ) : null}
            </div>
            <PriorityTypography as="h2" variant="cardTitle">
              Registro de proveedores por estado operativo
            </PriorityTypography>
            <PriorityTypography variant="bodyMuted">
              El sourcing ahora se organiza por estatus y mantiene el acceso operativo directo al
              detalle sin pelear con menús secundarios.
            </PriorityTypography>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[420px]">
            <div className="rounded-[18px] border border-[rgba(144,158,174,0.16)] bg-[rgba(248,250,252,0.82)] px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#607187]">
                Activos visibles
              </div>
              <div className="mt-1 text-[0.98rem] font-semibold text-[var(--brand-navy)]">
                {activeProviders}
              </div>
            </div>
            <div className="rounded-[18px] border border-[rgba(144,158,174,0.16)] bg-[rgba(248,250,252,0.82)] px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#607187]">
                Servicios ofertados
              </div>
              <div className="mt-1 text-[0.98rem] font-semibold text-[var(--brand-navy)]">
                {totalOfferings}
              </div>
            </div>
            <div className="rounded-[18px] border border-[rgba(144,158,174,0.16)] bg-[rgba(248,250,252,0.82)] px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#607187]">
                Con crédito
              </div>
              <div className="mt-1 text-[0.98rem] font-semibold text-[var(--brand-navy)]">
                {creditProviders}
              </div>
            </div>
          </div>
        </div>

        <PriorityCollectionWorkspace
          toolbar={
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_auto_auto_auto] xl:items-center">
              <PrioritySearchField
                value={search}
                onChange={(value) => {
                  setSelectedViewId(null)
                  setIsDefaultViewApplied(false)
                  setSearch(value)
                }}
                placeholder="Buscar proveedor por empresa, tipo o ubicación"
                ariaLabel="Buscar proveedores"
              />
              <PriorityFilterPopover
                title="Filtros de sourcing"
                description="Refina la lane activa por tipo de proveedor antes de guardar una vista."
                activeCount={activeFilterCount}
                onApply={() => undefined}
                onClear={() => {
                  setSelectedViewId(null)
                  setIsDefaultViewApplied(false)
                  setFilterState(defaultFilters)
                }}
              >
                <PrioritySelectField
                  value={filterState.providerType ?? allFilterValue}
                  onValueChange={(value) => {
                    setSelectedViewId(null)
                    setIsDefaultViewApplied(false)
                    setFilterState({
                      providerType: value === allFilterValue ? null : value,
                    })
                  }}
                  placeholder="Tipo de proveedor"
                  options={[
                    { value: allFilterValue, label: "Todos los tipos" },
                    ...providerTypeOptions,
                  ]}
                />
              </PriorityFilterPopover>
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
          }
          lanes={
            <PriorityStatusLanes
              lanes={lanes}
              activeKey={activeLane}
              onChange={(key) => {
                setSelectedViewId(null)
                setIsDefaultViewApplied(false)
                setActiveLane(key as ProviderWorkspaceLane)
              }}
              className="xl:grid-cols-3"
            />
          }
          columns={providerColumns}
          items={filteredProviders}
          getRowId={(item) => item.id}
          loading={loading}
          emptyTitle={
            isWorkspaceEmpty ? "Sin proveedores todavía" : "No hay proveedores con la vista actual"
          }
          emptyDescription={
            isWorkspaceEmpty
              ? "Crea el primer proveedor para empezar el sourcing, cargar servicios ofertados y habilitar el flujo real de pricing."
              : "Prueba otra lane, búsqueda o tipo de proveedor para volver a poblar la tabla."
          }
          emptyAction={
            <Button type="button" onClick={() => setShowCreateModal(true)}>
              Añadir proveedor
            </Button>
          }
          footer={
            creditProviders > 0 ? (
              <PrioritySectionAlert title="Crédito detectado" variant="info">
                Algunos proveedores ya cuentan con línea de crédito. Revisa monto y días directamente
                en el detalle antes de operar.
              </PrioritySectionAlert>
            ) : null
          }
        />
      </section>

      {showCreateModal ? (
        <Modal
          title="Añadir proveedor"
          onClose={() => {
            if (!creating) {
              resetForm()
              setShowCreateModal(false)
            }
          }}
        >
          <ProviderForm
            title="Nuevo proveedor"
            description="Crea la ficha principal del proveedor. Los servicios y contactos se agregan desde el detalle."
            values={formValues}
            onChange={handleChange}
            onSubmit={() => void handleCreateProvider()}
            submitLabel="Guardar proveedor"
            loading={creating}
          />
        </Modal>
      ) : null}

      {confirmDialog}
    </PageContainer>
  )
}
