import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { useMemo, useState } from "react"
import { StatusBadge } from "@/components/data/StatusBadge"
import {
  PriorityActionMenu,
  PriorityActionRail,
  PriorityCollectionWorkspace,
  PriorityFilterPopover,
  PrioritySavedViews,
  PrioritySearchField,
  PriorityStatusLanes,
  type PriorityCollectionColumn,
  type PriorityStatusLaneItem,
} from "@/components/priority"
import { PrioritySelectField } from "@/components/priority/PriorityForm"
import { Button } from "@/components/ui/button"
import type { SavedWorkspaceView, WorkspaceKey } from "@/lib/db"

type DemoRow = {
  id: string
  title: string
  subtitle: string
  owner: string
  metric: string
  status: string
}

type DemoLane = {
  key: string
  label: string
  helper: string
  tone: PriorityStatusLaneItem["tone"]
}

const meta = {
  title: "Priority/Browse Workspaces v2",
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

const allFilterValue = "__all__"

const mockViews = (workspaceKey: WorkspaceKey): SavedWorkspaceView[] => [
  {
    id: `${workspaceKey}-default`,
    workspace_key: workspaceKey,
    owner_user_id: "user-1",
    name: "Vista operativa",
    search_query: null,
    status_lane: null,
    filters_json: {},
    sort_json: {},
    visible_columns_json: ["quickActions", "title", "owner", "status"],
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

function WorkspaceDemo({
  workspaceKey,
  title,
  description,
  searchPlaceholder,
  filterLabel,
  lanes,
  rows,
  defaultLane,
  primaryActions,
}: {
  workspaceKey: WorkspaceKey
  title: string
  description: string
  searchPlaceholder: string
  filterLabel: string
  lanes: DemoLane[]
  rows: DemoRow[]
  defaultLane: string
  primaryActions: string[]
}) {
  const [query, setQuery] = useState("")
  const [activeLane, setActiveLane] = useState(defaultLane)
  const [filterValue, setFilterValue] = useState(allFilterValue)
  const [views, setViews] = useState(() => mockViews(workspaceKey))
  const [selectedViewId, setSelectedViewId] = useState<string | null>(views[0]?.id ?? null)

  const laneItems = useMemo<PriorityStatusLaneItem[]>(
    () =>
      lanes.map((lane) => ({
        ...lane,
        count: rows.filter((row) => row.status === lane.key).length,
      })),
    [lanes, rows]
  )

  const visibleRows = useMemo(
    () =>
      rows.filter((row) => {
        if (row.status !== activeLane) {
          return false
        }

        if (
          query.trim() &&
          ![row.title, row.subtitle, row.owner].some((value) =>
            value.toLowerCase().includes(query.trim().toLowerCase())
          )
        ) {
          return false
        }

        if (filterValue !== allFilterValue && row.owner !== filterValue) {
          return false
        }

        return true
      }),
    [activeLane, filterValue, query, rows]
  )

  const ownerOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.owner))).map((owner) => ({
        value: owner,
        label: owner,
      })),
    [rows]
  )

  const columns: PriorityCollectionColumn<DemoRow>[] = [
    {
      id: "quickActions",
      header: "Flujo",
      className: "min-w-[220px]",
      headClassName: "min-w-[220px]",
      cell: () => (
        <PriorityActionRail
          actions={primaryActions.map((action, index) => ({
            label: action,
            variant: index === 0 ? "default" : "outline",
          }))}
        />
      ),
    },
    {
      id: "title",
      header: "Registro",
      className: "min-w-[240px]",
      cell: (item) => (
        <div className="space-y-1">
          <div className="font-semibold text-[var(--brand-navy)]">{item.title}</div>
          <div className="text-xs text-[#607187]">{item.subtitle}</div>
        </div>
      ),
    },
    {
      id: "owner",
      header: "Responsable",
      className: "min-w-[180px]",
      cell: (item) => item.owner,
    },
    {
      id: "metric",
      header: "Contexto",
      className: "min-w-[180px]",
      cell: (item) => item.metric,
    },
    {
      id: "status",
      header: "Estatus",
      className: "min-w-[160px]",
      cell: (item) => <StatusBadge status={item.status} />,
    },
    {
      id: "actions",
      header: "Mas",
      className: "w-[72px]",
      headClassName: "w-[72px]",
      cell: () => (
        <div className="flex justify-end">
          <PriorityActionMenu actions={[{ label: "Ver detalle" }, { label: "Actualizar vista" }]} />
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4 rounded-[32px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.94)] p-6 shadow-[0_32px_80px_-48px_rgba(3,10,24,0.38)]">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#607187]">
          {title}
        </div>
        <div className="text-[1.24rem] font-semibold tracking-[-0.02em] text-[var(--brand-navy)]">
          {description}
        </div>
      </div>

      <PriorityCollectionWorkspace
        toolbar={
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_auto_auto_auto] xl:items-center">
            <PrioritySearchField value={query} onChange={setQuery} placeholder={searchPlaceholder} />
            <PriorityFilterPopover
              title="Filtros de demo"
              description="Composición visual del nuevo patrón browse con filtros guardables."
              activeCount={filterValue === allFilterValue ? 0 : 1}
              onApply={() => undefined}
              onClear={() => setFilterValue(allFilterValue)}
            >
              <PrioritySelectField
                value={filterValue}
                onValueChange={setFilterValue}
                placeholder={filterLabel}
                options={[
                  { value: allFilterValue, label: `Todos ${filterLabel.toLowerCase()}` },
                  ...ownerOptions,
                ]}
              />
            </PriorityFilterPopover>
            <PrioritySavedViews
              views={views}
              selectedViewId={selectedViewId}
              quickViews={[
                {
                  key: `${workspaceKey}-default`,
                  label: "Vista operativa",
                  active: !selectedViewId,
                  onSelect: () => {
                    setQuery("")
                    setActiveLane(defaultLane)
                    setFilterValue(allFilterValue)
                    setSelectedViewId(null)
                  },
                },
              ]}
              onSelectView={setSelectedViewId}
              onSaveCurrentView={({ name, isDefault }) => {
                const next: SavedWorkspaceView = {
                  id: `${workspaceKey}-${views.length + 1}`,
                  workspace_key: workspaceKey,
                  owner_user_id: "user-1",
                  name,
                  search_query: query || null,
                  status_lane: activeLane,
                  filters_json: { owner: filterValue === allFilterValue ? null : filterValue },
                  sort_json: {},
                  visible_columns_json: ["quickActions", "title", "owner", "status"],
                  is_default: isDefault,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }
                setViews((current) => [...current, next])
                setSelectedViewId(next.id)
              }}
              onRenameView={(viewId, name) => {
                setViews((current) => current.map((view) => (view.id === viewId ? { ...view, name } : view)))
              }}
              onUpdateCurrentView={() => undefined}
              onDeleteView={(viewId) => {
                setViews((current) => current.filter((view) => view.id !== viewId))
                setSelectedViewId((current) => (current === viewId ? null : current))
              }}
              onSetDefaultView={(viewId) => {
                setViews((current) => current.map((view) => ({ ...view, is_default: view.id === viewId })))
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setQuery("")
                setActiveLane(defaultLane)
                setFilterValue(allFilterValue)
                setSelectedViewId(null)
              }}
            >
              Limpiar
            </Button>
          </div>
        }
        lanes={
          <PriorityStatusLanes
            lanes={laneItems}
            activeKey={activeLane}
            onChange={(key) => setActiveLane(key)}
          />
        }
        columns={columns}
        items={visibleRows}
        getRowId={(item) => item.id}
        emptyTitle="No hay resultados"
        emptyDescription="Cambia la lane o limpia filtros para volver a poblar la vista."
      />
    </div>
  )
}

export const QuotationsWorkspace: Story = {
  render: () => (
    <WorkspaceDemo
      workspaceKey="crm_quotations"
      title="Quotations workspace"
      description="Vista browse comercial con lanes, CTAs visibles y saved views."
      searchPlaceholder="Buscar cotización"
      filterLabel="Responsable"
      defaultLane="pendiente"
      primaryActions={["Ver detalle", "PDF"]}
      lanes={[
        { key: "pendiente", label: "Pendientes", helper: "Esperando pricing.", tone: "info" },
        { key: "lista_para_enviar", label: "Lista para enviar", helper: "Lista para comercial.", tone: "spotlight" },
        { key: "renegociar_tarifa", label: "Renegociación", helper: "Ventas devolvió la tarifa.", tone: "danger" },
      ]}
      rows={[
        { id: "q1", title: "Q-000231", subtitle: "Cliente Atlas", owner: "Ana Pricing", metric: "AIR / Monterrey", status: "pendiente" },
        { id: "q2", title: "Q-000232", subtitle: "Grupo Helix", owner: "Luis Pricing", metric: "FCL / Houston", status: "lista_para_enviar" },
        { id: "q3", title: "Q-000233", subtitle: "Electra Foods", owner: "Ana Pricing", metric: "Courier / Miami", status: "renegociar_tarifa" },
      ]}
    />
  ),
}

export const OpportunitiesWorkspace: Story = {
  render: () => (
    <WorkspaceDemo
      workspaceKey="opportunities"
      title="Opportunities workspace"
      description="Pipeline comercial listo para tabla y futura vista board."
      searchPlaceholder="Buscar oportunidad"
      filterLabel="Cliente"
      defaultLane="investigando"
      primaryActions={["Ver detalle", "Cotizar"]}
      lanes={[
        { key: "investigando", label: "Investigando", helper: "Exploración inicial.", tone: "info" },
        { key: "cotizando", label: "Cotizando", helper: "Ya pasó a pricing.", tone: "warning" },
        { key: "aceptado", label: "Ganadas", helper: "Cierre positivo.", tone: "success" },
      ]}
      rows={[
        { id: "o1", title: "Proyecto Atlas", subtitle: "Cliente Atlas", owner: "Adan Rodriguez", metric: "AIR / Importación", status: "investigando" },
        { id: "o2", title: "Helix Border", subtitle: "Grupo Helix", owner: "Martha Perez", metric: "LTL / Exportación", status: "cotizando" },
        { id: "o3", title: "Foods Miami", subtitle: "Electra Foods", owner: "Adan Rodriguez", metric: "Courier / Importación", status: "aceptado" },
      ]}
    />
  ),
}

export const ClientsWorkspace: Story = {
  render: () => (
    <WorkspaceDemo
      workspaceKey="clients"
      title="Clients workspace"
      description="Cartera CRM con acciones visibles y lanes por madurez comercial."
      searchPlaceholder="Buscar cliente"
      filterLabel="Responsable"
      defaultLane="prospecto"
      primaryActions={["Ver detalle", "Nueva oportunidad"]}
      lanes={[
        { key: "prospecto", label: "Prospectos", helper: "Primer contacto.", tone: "info" },
        { key: "cotizando", label: "Cotizando", helper: "Ya tienen movimiento activo.", tone: "warning" },
        { key: "cliente", label: "Clientes", helper: "Cuenta consolidada.", tone: "success" },
      ]}
      rows={[
        { id: "c1", title: "Cliente Atlas", subtitle: "Manufactura", owner: "Adan Rodriguez", metric: "Monterrey", status: "prospecto" },
        { id: "c2", title: "North Bridge", subtitle: "Retail", owner: "Ana Pricing", metric: "Querétaro", status: "cotizando" },
        { id: "c3", title: "Grupo Helix", subtitle: "Tecnología", owner: "Adan Rodriguez", metric: "CDMX", status: "cliente" },
      ]}
    />
  ),
}

export const ProvidersWorkspace: Story = {
  render: () => (
    <WorkspaceDemo
      workspaceKey="providers"
      title="Providers workspace"
      description="Sourcing con estados operativos, vista guardada y acceso directo al detalle."
      searchPlaceholder="Buscar proveedor"
      filterLabel="Tipo"
      defaultLane="activo"
      primaryActions={["Ver detalle"]}
      lanes={[
        { key: "en_proceso_de_alta", label: "En alta", helper: "Configuración pendiente.", tone: "warning" },
        { key: "activo", label: "Activos", helper: "Listos para operar.", tone: "success" },
        { key: "inactivo", label: "Inactivos", helper: "Fuera de operación.", tone: "danger" },
      ]}
      rows={[
        { id: "p1", title: "Carrier Atlas", subtitle: "Terrestre", owner: "Sourcing Team", metric: "Monterrey", status: "en_proceso_de_alta" },
        { id: "p2", title: "Aero Link", subtitle: "Aéreo", owner: "Sourcing Team", metric: "Houston", status: "activo" },
        { id: "p3", title: "Marítima Costa", subtitle: "FCL", owner: "Sourcing Team", metric: "Altamira", status: "inactivo" },
      ]}
    />
  ),
}
