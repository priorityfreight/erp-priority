import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { InfoIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { StatusBadge } from "@/components/data/StatusBadge"
import {
  PriorityActionMenu,
  PriorityActionRail,
  PriorityCollectionWorkspace,
  PriorityFilterPopover,
  PriorityModalShell,
  PrioritySavedViews,
  PrioritySearchField,
  PriorityStatusLanes,
  PriorityTooltip,
  type PriorityCollectionColumn,
  type PriorityStatusLaneItem,
} from "@/components/priority"
import { PrioritySelectField } from "@/components/priority/PriorityForm"
import { Button } from "@/components/ui/button"
import type { PricingQuotationLane, SavedWorkspaceView } from "@/lib/db"

type MockQuotation = {
  id: string
  reference: string
  client: string
  service: string
  route: string
  owner: string
  status: PricingQuotationLane
  cost: string
  target: string
}

const meta = {
  title: "Priority/Pricing Workspace v2",
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

const laneMeta: Record<
  PricingQuotationLane,
  { label: string; helper: string; tone: PriorityStatusLaneItem["tone"] }
> = {
  pendiente: {
    label: "Pendientes",
    helper: "Cotizaciones listas para ser tomadas.",
    tone: "info",
  },
  cotizando: {
    label: "Cotizando",
    helper: "Pricing ya esta levantando compra.",
    tone: "warning",
  },
  lista_para_enviar: {
    label: "Lista para enviar",
    helper: "Opciones listas para volver a comercial.",
    tone: "spotlight",
  },
  renegociar_tarifa: {
    label: "Renegociacion",
    helper: "Ventas devolvio la tarifa para ajuste.",
    tone: "danger",
  },
}

const mockQuotations: MockQuotation[] = [
  {
    id: "q-1",
    reference: "QPRIFTL-000231",
    client: "Cliente Atlas",
    service: "AIR / Paqueteria",
    route: "Monterrey -> Laredo",
    owner: "Ana Pricing",
    status: "pendiente",
    cost: "$18,250.00 MXN",
    target: "Sin observaciones",
  },
  {
    id: "q-2",
    reference: "QPRIFTL-000232",
    client: "Grupo Helix",
    service: "FCL / Maritimo",
    route: "Altamira -> Houston",
    owner: "Luis Pricing",
    status: "cotizando",
    cost: "$41,900.00 MXN",
    target: "Sin observaciones",
  },
  {
    id: "q-3",
    reference: "QPRIFTL-000233",
    client: "North Bridge",
    service: "LTL / Terrestre",
    route: "Monterrey -> Queretaro",
    owner: "Ana Pricing",
    status: "lista_para_enviar",
    cost: "$12,480.00 MXN",
    target: "Lista para comercial",
  },
  {
    id: "q-4",
    reference: "QPRIFTL-000234",
    client: "Electra Foods",
    service: "AIR / Courier",
    route: "CDMX -> Miami",
    owner: "Jose Ventas",
    status: "renegociar_tarifa",
    cost: "$22,930.00 MXN",
    target: "Objetivo $21,000.00 MXN",
  },
]

const mockViews: SavedWorkspaceView[] = [
  {
    id: "view-1",
    workspace_key: "pricing_quotations",
    owner_user_id: "user-1",
    name: "Mis pendientes",
    search_query: null,
    status_lane: "pendiente",
    filters_json: { mineOnly: true },
    sort_json: { orderBy: "match_rank_desc" },
    visible_columns_json: ["quickActions", "reference", "client"],
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "view-2",
    workspace_key: "pricing_quotations",
    owner_user_id: "user-1",
    name: "Renegociacion",
    search_query: null,
    status_lane: "renegociar_tarifa",
    filters_json: {},
    sort_json: { orderBy: "match_rank_desc" },
    visible_columns_json: ["quickActions", "reference", "client"],
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

function PricingWorkspaceDemo({
  initialLane = "pendiente",
  empty = false,
}: {
  initialLane?: PricingQuotationLane
  empty?: boolean
}) {
  const [query, setQuery] = useState("")
  const [activeLane, setActiveLane] = useState<PricingQuotationLane>(initialLane)
  const [views, setViews] = useState(mockViews)
  const [selectedViewId, setSelectedViewId] = useState<string | null>(mockViews[0]?.id ?? null)
  const [modalOpen, setModalOpen] = useState(false)
  const [serviceFilter, setServiceFilter] = useState(allFilterValue)

  const items = useMemo(() => {
    if (empty) {
      return []
    }

    return mockQuotations.filter((item) => {
      const matchesLane = item.status === activeLane
      const matchesQuery =
        query.trim().length === 0 ||
        [item.reference, item.client, item.route].some((value) =>
          value.toLowerCase().includes(query.trim().toLowerCase())
        )
      const matchesService =
        serviceFilter === allFilterValue || item.service.includes(serviceFilter)
      return matchesLane && matchesQuery && matchesService
    })
  }, [activeLane, empty, query, serviceFilter])

  const lanes = (Object.keys(laneMeta) as PricingQuotationLane[]).map((lane) => ({
    key: lane,
    label: laneMeta[lane].label,
    helper: laneMeta[lane].helper,
    count: mockQuotations.filter((item) => item.status === lane).length,
    tone: laneMeta[lane].tone,
  }))

  const columns: PriorityCollectionColumn<MockQuotation>[] = [
    {
      id: "quickActions",
      header: "Flujo",
      className: "min-w-[240px]",
      headClassName: "min-w-[240px]",
      cell: (item) => (
        <PriorityActionRail
          actions={
            item.status === "pendiente"
              ? [{ label: "Tomar", variant: "default" }]
              : [
                  { label: "Proveedores", variant: "outline" },
                  { label: "Cargos", variant: "outline" },
                ]
          }
        />
      ),
    },
    {
      id: "reference",
      header: "Referencia",
      className: "min-w-[180px]",
      cell: (item) => (
        <div className="space-y-1">
          <div className="font-semibold text-[var(--brand-navy)]">{item.reference}</div>
          <div className="text-xs text-[#607187]">{item.client}</div>
        </div>
      ),
    },
    {
      id: "service",
      header: "Servicio",
      className: "min-w-[180px]",
      cell: (item) => item.service,
    },
    {
      id: "route",
      header: "Ruta",
      className: "min-w-[220px]",
      cell: (item) => item.route,
    },
    {
      id: "owner",
      header: "Responsable",
      className: "min-w-[180px]",
      cell: (item) => item.owner,
    },
    {
      id: "status",
      header: "Estatus",
      className: "min-w-[200px]",
      cell: (item) => (
        <div className="space-y-2">
          <StatusBadge status={item.status} />
          <div className="text-xs text-[#607187]">{laneMeta[item.status].helper}</div>
        </div>
      ),
    },
    {
      id: "cost",
      header: "Costo",
      className: "min-w-[160px]",
      cell: (item) => item.cost,
    },
    {
      id: "target",
      header: "Objetivo / comentarios",
      className: "min-w-[220px]",
      cell: (item) => item.target,
    },
    {
      id: "actions",
      header: "Mas",
      className: "w-[72px]",
      headClassName: "w-[72px]",
      cell: () => (
        <div className="flex justify-end">
          <PriorityActionMenu actions={[{ label: "Ver detalle" }, { label: "Abrir historial" }]} />
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4 rounded-[32px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.94)] p-6 shadow-[0_32px_80px_-48px_rgba(3,10,24,0.38)]">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#607187]">
            Pricing quotations workspace
            <span className="rounded-full bg-[rgba(179,58,91,0.08)] px-2 py-0.5 text-[10px] tracking-[0.14em] text-[var(--brand-burgundy)]">
              Vista default aplicada
            </span>
          </div>
          <div className="text-[1.24rem] font-semibold tracking-[-0.02em] text-[var(--brand-navy)]">
            Cotizaciones para pricing con lanes y CTA visible
          </div>
          <div className="max-w-4xl text-[0.95rem] leading-7 text-[#607187]">
            Demo visual del nuevo patrón browse: lanes, filtros, vistas guardadas y acciones
            primarias visibles desde la primera columna.
          </div>
        </div>

        <div className="flex items-center gap-3">
          <PriorityTooltip content="Las acciones primarias ahora viven en la primera columna de la tabla.">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(144,158,174,0.18)] bg-[rgba(248,250,252,0.88)] px-3 py-2 text-sm text-[var(--brand-navy)]"
            >
              <InfoIcon className="size-4" />
              CTA visible
            </button>
          </PriorityTooltip>
          <Button type="button" variant="outline" onClick={() => setModalOpen(true)}>
            Abrir modal shared
          </Button>
        </div>
      </div>

      <PriorityCollectionWorkspace
        toolbar={
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_auto_auto_auto] xl:items-center">
            <PrioritySearchField
              value={query}
              onChange={setQuery}
              placeholder="Buscar cotización por referencia, cliente, origen o destino"
            />
            <PriorityFilterPopover
              title="Filtros de la demo"
              description="Muestra la composición del nuevo popover de filtros con React Aria."
              activeCount={serviceFilter === allFilterValue ? 0 : 1}
              onApply={() => undefined}
              onClear={() => setServiceFilter(allFilterValue)}
              saveAction={<div className="text-xs text-[#607187]">Listo para integrarse con Saved Views.</div>}
            >
              <PrioritySelectField
                value={serviceFilter}
                onValueChange={setServiceFilter}
                placeholder="Servicio"
                options={[
                  { value: allFilterValue, label: "Todos los servicios" },
                  { value: "AIR", label: "AIR" },
                  { value: "FCL", label: "FCL" },
                  { value: "LTL", label: "LTL" },
                ]}
              />
            </PriorityFilterPopover>
            <PrioritySavedViews
              views={views}
              selectedViewId={selectedViewId}
              quickViews={[
                {
                  key: "cotizando",
                  label: "Cotizando",
                  active: !selectedViewId && activeLane === "cotizando",
                  onSelect: () => setActiveLane("cotizando"),
                },
              ]}
              onSelectView={(viewId) => setSelectedViewId(viewId)}
              onSaveCurrentView={({ name, isDefault }) => {
                const next: SavedWorkspaceView = {
                  id: `view-${views.length + 1}`,
                  workspace_key: "pricing_quotations",
                  owner_user_id: "user-1",
                  name,
                  search_query: query || null,
                  status_lane: activeLane,
                  filters_json: {},
                  sort_json: {},
                  visible_columns_json: [],
                  is_default: isDefault,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }
                setViews((current) => [...current.map((view) => ({ ...view, is_default: isDefault ? false : view.is_default })), next])
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
                setViews((current) =>
                  current.map((view) => ({
                    ...view,
                    is_default: view.id === viewId,
                  }))
                )
              }}
            />
            <Button type="button" variant="outline" onClick={() => {
              setQuery("")
              setSelectedViewId(null)
              setActiveLane("pendiente")
              setServiceFilter(allFilterValue)
            }}>
              Limpiar
            </Button>
          </div>
        }
        lanes={<PriorityStatusLanes lanes={lanes} activeKey={activeLane} onChange={(key) => setActiveLane(key as PricingQuotationLane)} />}
        columns={columns}
        items={items}
        getRowId={(item) => item.id}
        emptyTitle="No hay cotizaciones con la vista actual"
        emptyDescription="Cambia la lane o limpia filtros para volver a poblar la mesa de trabajo."
        footer={
          <div className="flex items-center justify-between border-t border-[rgba(144,158,174,0.16)] pt-4 text-sm text-[#607187]">
            <div>Mostrando {items.length} resultados en la lane activa.</div>
            <div className="inline-flex items-center gap-2">
              <Button type="button" variant="outline" size="sm">
                Anterior
              </Button>
              <Button type="button" variant="outline" size="sm">
                Siguiente
              </Button>
            </div>
          </div>
        }
      />

      <PriorityModalShell
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        title="Priority Modal Shell"
        description="Este modal shared sirve como base para guardar vistas, confirmaciones ligeras y overlays browse."
        footer={
          <div className="flex justify-end">
            <Button type="button" onClick={() => setModalOpen(false)}>
              Cerrar modal
            </Button>
          </div>
        }
      >
        <div className="rounded-[18px] border border-[rgba(144,158,174,0.16)] bg-[rgba(248,250,252,0.82)] px-4 py-4 text-sm leading-7 text-[#607187]">
          El workspace browse y sus overlays ahora usan la misma base accesible de React Aria.
        </div>
      </PriorityModalShell>
    </div>
  )
}

export const FoundationPrimitives: Story = {
  render: () => <PricingWorkspaceDemo initialLane="pendiente" />,
}

export const PendingLane: Story = {
  render: () => <PricingWorkspaceDemo initialLane="pendiente" />,
}

export const RenegotiationLane: Story = {
  render: () => <PricingWorkspaceDemo initialLane="renegociar_tarifa" />,
}

export const EmptyWorkspace: Story = {
  render: () => <PricingWorkspaceDemo initialLane="pendiente" empty />,
}

export const MultipleSavedViews: Story = {
  render: () => <PricingWorkspaceDemo initialLane="cotizando" />,
}

const allFilterValue = "__all__"
