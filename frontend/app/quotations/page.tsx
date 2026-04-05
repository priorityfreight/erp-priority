"use client"

import { Fragment, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { ArrowDown, ArrowDownUp, ArrowUp, Columns3, Eye, EyeOff, GripVertical, RotateCcw, X } from "lucide-react"
import { StatusBadge } from "@/components/data/StatusBadge"
import { PageContainer } from "@/components/layout/PageContainer"
import {
  PriorityActionMenu,
  PriorityActionRail,
  PriorityCollectionWorkspace,
  PriorityDateField,
  PriorityFilterPopover,
  PriorityModalShell,
  PrioritySavedViews,
  PrioritySearchField,
  type PriorityCollectionColumn,
  type PriorityStatusLaneItem,
} from "@/components/priority"
import { PrioritySelectField } from "@/components/priority/PriorityForm"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  createWorkspaceView,
  deleteWorkspaceView,
  getQuotations,
  getWorkspaceColumnPreference,
  getWorkspaceViews,
  setWorkspaceColumnPreference,
  setDefaultWorkspaceView,
  updateWorkspaceView,
  type QuotationSummary,
  type SavedWorkspaceView,
  type SavedWorkspaceViewPayload,
  type WorkspaceKey,
} from "@/lib/db"
import { notifySuccess } from "@/lib/feedback"
import { cn } from "@/lib/utils"
import {
  formatCurrency,
} from "@/features/pricing/quotations/helpers"

type QuotationWorkspaceLane =
  | "all"
  | "borrador"
  | "pendiente"
  | "cotizando"
  | "lista_para_enviar"
  | "enviada"
  | "renegociar_tarifa"
  | "aceptada"
  | "rechazada"
  | "cancelada"

type QuotationFilterColumn =
  | "created_at"
  | "required_quote_date"
  | "reference_number"
  | "client_name"
  | "opportunity_title"
  | "origin"
  | "destination"
  | "salesperson_name"
  | "pricing_owner_name"
  | "status"
  | "service_type"
  | "transport_type"
  | "expected_profit"

type QuotationSortableColumn =
  | "created_at"
  | "required_quote_date"
  | "reference_number"
  | "client_name"
  | "opportunity_title"
  | "origin"
  | "destination"
  | "salesperson_name"
  | "pricing_owner_name"
  | "status"
  | "service_type"
  | "transport_type"
  | "expected_profit"

type QuotationColumnFilter = {
  id: string
  column: QuotationFilterColumn
  value: string
  valueTo?: string
}

type QuotationSortState = {
  columnId: QuotationSortableColumn
  direction: "asc" | "desc"
}

type QuotationColumnDefinition = PriorityCollectionColumn<QuotationSummary> & {
  fixed?: "leading" | "trailing"
  sortKey?: QuotationSortableColumn
}

type QuotationColumnSchema = {
  id: string
  label: string
  sortKey?: QuotationSortableColumn
  filterColumn?: QuotationFilterColumn
  filterKind?: "text" | "date" | "number" | "select"
  filterPlaceholder?: string
  filterOptions?: ReadonlyArray<{ value: string; label: string }>
}

type QuotationFilterState = {
  columnFilters: QuotationColumnFilter[]
}

type ColumnBucket = "visible" | "hidden"

const workspaceKey: WorkspaceKey = "crm_quotations"
const pageSize = 25
const defaultLane: QuotationWorkspaceLane = "all"
const defaultFilters: QuotationFilterState = {
  columnFilters: [],
}
const fixedLeadingColumns = ["quickActions"] as const
const fixedTrailingColumns = ["actions"] as const

const quotationStatusOptions = [
  { value: "borrador", label: "Borradores" },
  { value: "pendiente", label: "Pendientes pricing" },
  { value: "cotizando", label: "Cotizando" },
  { value: "lista_para_enviar", label: "Lista para enviar" },
  { value: "enviada", label: "Enviadas" },
  { value: "renegociar_tarifa", label: "Renegociación" },
  { value: "aceptada", label: "Ganadas" },
  { value: "rechazada", label: "Perdidas" },
  { value: "cancelada", label: "Canceladas" },
] as const

const quotationWorkspaceColumnSchema: QuotationColumnSchema[] = [
  {
    id: "reference_number",
    label: "Referencia",
    sortKey: "reference_number",
    filterColumn: "reference_number",
    filterKind: "text",
    filterPlaceholder: "Ej. Q-2026-001",
  },
  {
    id: "created_at",
    label: "Fecha",
    sortKey: "created_at",
    filterColumn: "created_at",
    filterKind: "date",
  },
  {
    id: "client_name",
    label: "Cliente",
    sortKey: "client_name",
    filterColumn: "client_name",
    filterKind: "text",
    filterPlaceholder: "Ej. Diken",
  },
  {
    id: "opportunity_title",
    label: "Oportunidad",
    sortKey: "opportunity_title",
    filterColumn: "opportunity_title",
    filterKind: "text",
    filterPlaceholder: "Ej. Proyecto Atlas",
  },
  {
    id: "salesperson_name",
    label: "Vendedor",
    sortKey: "salesperson_name",
    filterColumn: "salesperson_name",
    filterKind: "text",
    filterPlaceholder: "Ej. Adan",
  },
  {
    id: "service",
    label: "Servicio",
    sortKey: "service_type",
    filterColumn: "service_type",
    filterKind: "text",
    filterPlaceholder: "Ej. AIR",
  },
  {
    id: "transport_type",
    label: "Transporte",
    sortKey: "transport_type",
    filterColumn: "transport_type",
    filterKind: "text",
    filterPlaceholder: "Ej. FTL",
  },
  {
    id: "origin",
    label: "Origen",
    sortKey: "origin",
    filterColumn: "origin",
    filterKind: "text",
    filterPlaceholder: "Ej. CNLTO o Monterrey",
  },
  {
    id: "destination",
    label: "Destino",
    sortKey: "destination",
    filterColumn: "destination",
    filterKind: "text",
    filterPlaceholder: "Ej. MXZLO o Manzanillo",
  },
  {
    id: "pricing_owner_name",
    label: "Pricing",
    sortKey: "pricing_owner_name",
    filterColumn: "pricing_owner_name",
    filterKind: "text",
    filterPlaceholder: "Ej. Ana Pricing",
  },
  {
    id: "status",
    label: "Estatus",
    sortKey: "status",
    filterColumn: "status",
    filterKind: "select",
    filterOptions: quotationStatusOptions.map((option) => ({
      value: option.value,
      label: option.label,
    })),
  },
  {
    id: "expected_profit",
    label: "Profit",
    sortKey: "expected_profit",
    filterColumn: "expected_profit",
    filterKind: "number",
  },
  {
    id: "required_quote_date",
    label: "Fecha requerida",
    sortKey: "required_quote_date",
    filterColumn: "required_quote_date",
    filterKind: "date",
  },
]

const defaultManagedColumns = quotationWorkspaceColumnSchema.map((column) => column.id)
const defaultVisibleManagedColumns = [
  "reference_number",
  "created_at",
  "client_name",
  "opportunity_title",
  "salesperson_name",
  "service",
  "origin",
  "destination",
  "pricing_owner_name",
  "status",
  "expected_profit",
  "required_quote_date",
]

const laneMeta: Record<
  QuotationWorkspaceLane,
  { label: string; helper: string; tone: PriorityStatusLaneItem["tone"] }
> = {
  all: {
    label: "Todas",
    helper: "Sin recorte por estatus.",
    tone: "neutral",
  },
  borrador: {
    label: "Borradores",
    helper: "Cotizaciones internas todavia en armado comercial.",
    tone: "neutral",
  },
  pendiente: {
    label: "Pendientes pricing",
    helper: "Esperando que pricing tome la solicitud.",
    tone: "info",
  },
  cotizando: {
    label: "Cotizando",
    helper: "Pricing ya esta recopilando costos.",
    tone: "warning",
  },
  lista_para_enviar: {
    label: "Lista para enviar",
    helper: "Ya pueden regresar al frente comercial.",
    tone: "spotlight",
  },
  enviada: {
    label: "Enviadas",
    helper: "La propuesta comercial ya salio al cliente.",
    tone: "success",
  },
  renegociar_tarifa: {
    label: "Renegociacion",
    helper: "Ventas devolvio la tarifa para un nuevo ajuste.",
    tone: "danger",
  },
  aceptada: {
    label: "Ganadas",
    helper: "Cotizaciones cerradas positivamente.",
    tone: "success",
  },
  rechazada: {
    label: "Perdidas",
    helper: "Cotizaciones que no avanzaron comercialmente.",
    tone: "danger",
  },
  cancelada: {
    label: "Canceladas",
    helper: "Cotizaciones detenidas o fuera de proceso.",
    tone: "neutral",
  },
}

const quotationFilterColumnOptions: Array<{ value: QuotationFilterColumn; label: string }> = Array.from(
  new Map(
    quotationWorkspaceColumnSchema.flatMap((column) =>
      column.filterColumn ? [[column.filterColumn, { value: column.filterColumn, label: column.label }]] : []
    )
  ).values()
)

const quotationColumnLabels: Record<string, string> = Object.fromEntries(
  quotationWorkspaceColumnSchema.map((column) => [column.id, column.label])
)

const quotationFilterSchemaByColumn = new Map(
  quotationWorkspaceColumnSchema.flatMap((column) =>
    column.filterColumn ? [[column.filterColumn, column] as const] : []
  )
)

const laneTabs = (Object.keys(laneMeta) as QuotationWorkspaceLane[]).map((lane) => ({
  key: lane,
  label: laneMeta[lane].label,
}))

function resolveLocationLabel(code: string | null | undefined, place: string | null | undefined) {
  if (code && place) {
    return `${code} · ${place}`
  }

  return code || place || "No definido"
}

function getFilterColumnLabel(column: QuotationFilterColumn) {
  return quotationFilterColumnOptions.find((option) => option.value === column)?.label ?? column
}

function formatFilterSummary(filter: QuotationColumnFilter) {
  const columnLabel = getFilterColumnLabel(filter.column)

  if (filter.column === "created_at" || filter.column === "required_quote_date") {
    const from = filter.value || "Inicio"
    const to = filter.valueTo || "Hoy"
    return `${columnLabel}: ${from} - ${to}`
  }

  if (filter.column === "expected_profit") {
    const from = filter.value || "0"
    const to = filter.valueTo || "Max"
    return `${columnLabel}: ${from} - ${to}`
  }

  if (filter.column === "status") {
    const statusLabel =
      quotationStatusOptions.find((option) => option.value === filter.value)?.label ?? filter.value
    return `${columnLabel}: ${statusLabel || "Todos"}`
  }

  return `${columnLabel}: ${filter.value || "Todos"}`
}

function isFilterActive(filter: QuotationColumnFilter) {
  const schema = quotationFilterSchemaByColumn.get(filter.column)

  if (!schema) {
    return Boolean(filter.value?.trim() || filter.valueTo?.trim())
  }

  if (schema.filterKind === "date" || schema.filterKind === "number") {
    return Boolean(filter.value || filter.valueTo)
  }

  return Boolean(filter.value.trim())
}

function getColumnInsertId(bucket: ColumnBucket, index: number) {
  return `${bucket}::__insert::${index}`
}

function parseColumnInsertId(id: string): { bucket: ColumnBucket; index: number } | null {
  const match = /^(visible|hidden)::__insert::(\d+)$/.exec(id)
  if (!match) {
    return null
  }

  return {
    bucket: match[1] as ColumnBucket,
    index: Number(match[2]),
  }
}

function resolveBucketFromColumnId(
  id: string,
  visibleColumns: string[],
  hiddenColumns: string[]
): ColumnBucket | null {
  if (visibleColumns.includes(id)) {
    return "visible"
  }

  if (hiddenColumns.includes(id)) {
    return "hidden"
  }

  return null
}

function ColumnInsertZone({
  bucket,
  index,
}: {
  bucket: ColumnBucket
  index: number
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: getColumnInsertId(bucket, index),
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "my-1.5 flex h-4 items-center rounded-full transition",
        isOver ? "bg-[rgba(179,58,91,0.12)]" : "bg-transparent"
      )}
    >
      <div
        className={cn(
          "h-[3px] w-full rounded-full transition",
          isOver ? "bg-[var(--brand-burgundy)] shadow-[0_0_0_1px_rgba(179,58,91,0.12)]" : "bg-transparent"
        )}
      />
    </div>
  )
}

function DraggableColumnRow({
  id,
  bucket,
  label,
  index,
  bucketLength,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
}: {
  id: string
  bucket: ColumnBucket
  label: string
  index: number
  bucketLength: number
  onMoveUp: () => void
  onMoveDown: () => void
  onToggleVisibility: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? CSS.Translate.toString(transform) : undefined,
      }}
      className={cn(
        "flex items-center justify-between gap-3 rounded-[18px] border border-[rgba(144,158,174,0.14)] bg-white px-4 py-3 shadow-[0_16px_28px_-26px_rgba(3,10,24,0.26)]",
        isDragging ? "z-20 opacity-70 shadow-[0_24px_48px_-24px_rgba(3,10,24,0.3)]" : null
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="inline-flex shrink-0 cursor-grab items-center justify-center rounded-full border border-[rgba(144,158,174,0.16)] bg-[rgba(248,250,252,0.84)] p-2 text-[#90A4B8] active:cursor-grabbing"
          aria-label={`Arrastrar ${label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <span className="rounded-full bg-[rgba(11,31,59,0.06)] px-2.5 py-1 text-xs font-semibold text-[#607187]">
          {bucket === "visible" ? index + 1 : "Off"}
        </span>
        <div className="truncate text-sm font-semibold text-[var(--brand-navy)]">{label}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={index === 0}
          onClick={onMoveUp}
          aria-label={`Subir ${label}`}
        >
          <ArrowUp className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={index === bucketLength - 1}
          onClick={onMoveDown}
          aria-label={`Bajar ${label}`}
        >
          <ArrowDown className="size-4" />
        </Button>
        <Button type="button" variant="ghost" className="shrink-0" onClick={onToggleVisibility}>
          <span className="inline-flex items-center gap-2">
            {bucket === "visible" ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {bucket === "visible" ? "Ocultar" : "Mostrar"}
          </span>
        </Button>
      </div>
    </div>
  )
}

function normalizeManagedColumns(raw: string[] | null | undefined) {
  const allowed = new Set(defaultManagedColumns)
  const ordered = (raw ?? []).filter((columnId, index, source) => {
    return allowed.has(columnId) && source.indexOf(columnId) === index
  })

  return [...ordered, ...defaultManagedColumns.filter((columnId) => !ordered.includes(columnId))]
}

function parseSortState(raw: Record<string, unknown> | null | undefined): QuotationSortState | null {
  const columnId = raw?.columnId
  const direction = raw?.direction

  const validColumnIds: QuotationSortableColumn[] = [
    "created_at",
    "required_quote_date",
    "reference_number",
    "client_name",
    "opportunity_title",
    "origin",
    "destination",
    "salesperson_name",
    "pricing_owner_name",
    "status",
    "service_type",
    "transport_type",
    "expected_profit",
  ]

  if (
    typeof columnId === "string" &&
    validColumnIds.includes(columnId as QuotationSortableColumn) &&
    (direction === "asc" || direction === "desc")
  ) {
    return {
      columnId: columnId as QuotationSortableColumn,
      direction,
    }
  }

  if (raw?.orderBy === "created_at_desc") {
    return {
      columnId: "created_at",
      direction: "desc",
    }
  }

  return null
}

function createQuotationColumnFilter(
  column: QuotationFilterColumn = "status"
): QuotationColumnFilter {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    column,
    value: "",
    valueTo: "",
  }
}

function parseQuotationFilters(raw: Record<string, unknown> | null | undefined): QuotationFilterState {
  const rawColumnFilters = Array.isArray(raw?.columnFilters) ? raw.columnFilters : []
  const legacyFilters: QuotationColumnFilter[] = []

  if (typeof raw?.pricingOwnerName === "string" && raw.pricingOwnerName.trim()) {
    legacyFilters.push({
      id: "legacy-pricing-owner",
      column: "pricing_owner_name",
      value: raw.pricingOwnerName.trim(),
      valueTo: "",
    })
  }

  if (typeof raw?.serviceType === "string" && raw.serviceType.trim()) {
    legacyFilters.push({
      id: "legacy-service-type",
      column: "service_type",
      value: raw.serviceType.trim(),
      valueTo: "",
    })
  }

  return {
    columnFilters: [
      ...rawColumnFilters.flatMap((filter) => {
        if (!filter || typeof filter !== "object") {
          return []
        }

        const candidate = filter as Record<string, unknown>
        const column = candidate.column

        if (
          column !== "created_at" &&
          column !== "required_quote_date" &&
          column !== "reference_number" &&
          column !== "client_name" &&
          column !== "opportunity_title" &&
          column !== "origin" &&
          column !== "destination" &&
          column !== "salesperson_name" &&
          column !== "pricing_owner_name" &&
          column !== "status" &&
          column !== "service_type" &&
          column !== "transport_type" &&
          column !== "expected_profit"
        ) {
          return []
        }

        return [
          {
            id:
              typeof candidate.id === "string" && candidate.id.trim()
                ? candidate.id
                : createQuotationColumnFilter(column).id,
            column,
            value: typeof candidate.value === "string" ? candidate.value : "",
            valueTo: typeof candidate.valueTo === "string" ? candidate.valueTo : "",
          } satisfies QuotationColumnFilter,
        ]
      }),
      ...legacyFilters,
    ],
  }
}

export default function QuotationsPage() {
  const [items, setItems] = useState<QuotationSummary[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const [activeLane, setActiveLane] = useState<QuotationWorkspaceLane>(defaultLane)
  const [filterState, setFilterState] = useState<QuotationFilterState>(defaultFilters)
  const [page, setPage] = useState(1)
  const [savedViews, setSavedViews] = useState<SavedWorkspaceView[]>([])
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null)
  const [isDefaultViewApplied, setIsDefaultViewApplied] = useState(false)
  const [sortState, setSortState] = useState<QuotationSortState | null>({
    columnId: "created_at",
    direction: "desc",
  })
  const [managedColumnOrder, setManagedColumnOrder] = useState<string[]>(() =>
    normalizeManagedColumns(defaultVisibleManagedColumns)
  )
  const [hiddenManagedColumns, setHiddenManagedColumns] = useState<string[]>(
    () => defaultManagedColumns.filter((columnId) => !defaultVisibleManagedColumns.includes(columnId))
  )
  const [showColumnsModal, setShowColumnsModal] = useState(false)
  const [openSaveComposerSignal, setOpenSaveComposerSignal] = useState<number | undefined>(undefined)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  const activeFilterCount = useMemo(
    () => filterState.columnFilters.filter((filter) => isFilterActive(filter)).length,
    [filterState.columnFilters]
  )
  const laneCounts = useMemo(() => {
    const counts = {
      all: items.length,
      borrador: 0,
      pendiente: 0,
      cotizando: 0,
      lista_para_enviar: 0,
      enviada: 0,
      renegociar_tarifa: 0,
      aceptada: 0,
      rechazada: 0,
      cancelada: 0,
    } satisfies Record<QuotationWorkspaceLane, number>

    items.forEach((item) => {
      const status = item.status as QuotationWorkspaceLane
      if (status in counts) {
        counts[status] += 1
      }
    })

    return counts
  }, [items])

  const quickViews = useMemo(
    () => [
      {
        key: "pendientes-pricing",
        label: "Pendientes pricing",
        active: !selectedViewId && activeLane === "pendiente" && activeFilterCount === 0 && !query.trim(),
        onSelect: () => {
          setSelectedViewId(null)
          setIsDefaultViewApplied(false)
          setQuery("")
          setActiveLane("pendiente")
          setFilterState(defaultFilters)
          setPage(1)
        },
      },
      {
        key: "listas-comercial",
        label: "Listas para comercial",
        active:
          !selectedViewId && activeLane === "lista_para_enviar" && activeFilterCount === 0 && !query.trim(),
        onSelect: () => {
          setSelectedViewId(null)
          setIsDefaultViewApplied(false)
          setQuery("")
          setActiveLane("lista_para_enviar")
          setFilterState(defaultFilters)
          setPage(1)
        },
      },
      {
        key: "renegociacion",
        label: "Renegociacion",
        active:
          !selectedViewId && activeLane === "renegociar_tarifa" && activeFilterCount === 0 && !query.trim(),
        onSelect: () => {
          setSelectedViewId(null)
          setIsDefaultViewApplied(false)
          setQuery("")
          setActiveLane("renegociar_tarifa")
          setFilterState(defaultFilters)
          setPage(1)
        },
      },
    ],
    [activeFilterCount, activeLane, query, selectedViewId]
  )

  const toggleSort = useCallback((columnId: QuotationSortableColumn) => {
    setSelectedViewId(null)
    setIsDefaultViewApplied(false)
    setSortState((current) => {
      if (!current || current.columnId !== columnId) {
        return { columnId, direction: "asc" }
      }

      if (current.direction === "asc") {
        return { columnId, direction: "desc" }
      }

      return null
    })
  }, [])

  const renderSortableHeader = useCallback(
    (label: string, columnId?: QuotationSortableColumn) => {
      if (!columnId) {
        return label
      }

      const isActive = sortState?.columnId === columnId
      const Icon = !isActive ? ArrowDownUp : sortState.direction === "asc" ? ArrowUp : ArrowDown

      return (
        <button
          type="button"
          onClick={() => toggleSort(columnId)}
          className="inline-flex items-center gap-2 rounded-full px-1 py-0.5 transition hover:text-[var(--brand-navy)]"
        >
          <span>{label}</span>
          <Icon className="size-3.5" />
        </button>
      )
    },
    [sortState, toggleSort]
  )

  const allQuotationColumns = useMemo<QuotationColumnDefinition[]>(
    () => [
      {
        id: "quickActions",
        fixed: "leading",
        header: "Flujo",
        className: "min-w-[220px]",
        headClassName: "min-w-[220px]",
        cell: (item) => (
          <PriorityActionRail
            actions={[
              { label: "Ver detalle", href: `/quotations/${item.id}`, variant: "default" },
              { label: "PDF", href: `/quotations/${item.id}/document/pdf`, variant: "outline" },
            ]}
          />
        ),
      },
      {
        id: "reference_number",
        header: renderSortableHeader("Referencia", "reference_number"),
        sortKey: "reference_number",
        className: "min-w-[170px]",
        cell: (item) => item.reference_number || "Pendiente",
      },
      {
        id: "created_at",
        header: renderSortableHeader("Fecha", "created_at"),
        sortKey: "created_at",
        className: "min-w-[170px]",
        cell: (item) => item.created_at?.slice(0, 10) || "Sin fecha",
      },
      {
        id: "client_name",
        header: renderSortableHeader("Cliente", "client_name"),
        sortKey: "client_name",
        className: "min-w-[200px]",
        cell: (item) => item.client_name || "Sin cliente",
      },
      {
        id: "opportunity_title",
        header: renderSortableHeader("Oportunidad", "opportunity_title"),
        sortKey: "opportunity_title",
        className: "min-w-[200px]",
        cell: (item) => item.opportunity_title || "Sin oportunidad",
      },
      {
        id: "salesperson_name",
        header: renderSortableHeader("Vendedor", "salesperson_name"),
        sortKey: "salesperson_name",
        className: "min-w-[180px]",
        cell: (item) => item.salesperson_name || "Sin vendedor",
      },
      {
        id: "service",
        header: renderSortableHeader("Servicio", "service_type"),
        sortKey: "service_type",
        className: "min-w-[200px]",
        cell: (item) =>
          [item.service_type, item.transport_type].filter(Boolean).join(" / ") || "No definido",
      },
      {
        id: "transport_type",
        header: renderSortableHeader("Transporte", "transport_type"),
        sortKey: "transport_type",
        className: "min-w-[170px]",
        cell: (item) => item.transport_type || "No definido",
      },
      {
        id: "origin",
        header: renderSortableHeader("Origen", "origin"),
        sortKey: "origin",
        className: "min-w-[180px]",
        cell: (item) => resolveLocationLabel(item.origin_unlocode, item.origin),
      },
      {
        id: "destination",
        header: renderSortableHeader("Destino", "destination"),
        sortKey: "destination",
        className: "min-w-[180px]",
        cell: (item) => resolveLocationLabel(item.destination_unlocode, item.destination),
      },
      {
        id: "pricing_owner_name",
        header: renderSortableHeader("Pricing", "pricing_owner_name"),
        sortKey: "pricing_owner_name",
        className: "min-w-[180px]",
        cell: (item) => item.pricing_owner_name || "Sin asignar",
      },
      {
        id: "status",
        header: renderSortableHeader("Estatus", "status"),
        sortKey: "status",
        className: "min-w-[160px]",
        cell: (item) => <StatusBadge status={item.status} />,
      },
      {
        id: "expected_profit",
        header: renderSortableHeader("Profit", "expected_profit"),
        sortKey: "expected_profit",
        className: "min-w-[150px]",
        cell: (item) => formatCurrency(item.expected_profit),
      },
      {
        id: "required_quote_date",
        header: renderSortableHeader("Fecha requerida", "required_quote_date"),
        sortKey: "required_quote_date",
        className: "min-w-[180px]",
        cell: (item) => item.required_quote_date || "Sin fecha",
      },
      {
        id: "actions",
        fixed: "trailing",
        header: "Mas",
        className: "w-[72px]",
        headClassName: "w-[72px]",
        cell: (item) => (
          <div className="flex justify-end">
            <PriorityActionMenu
              label={`Mas acciones para ${item.reference_number || "cotizacion"}`}
              actions={[
                { label: "Ver detalle", href: `/quotations/${item.id}` },
                { label: "Solicitud pricing PDF", href: `/quotations/${item.id}/pricing-request/pdf` },
              ]}
            />
          </div>
        ),
      },
    ],
    [renderSortableHeader]
  )

  const visibleManagedColumns = useMemo(
    () => managedColumnOrder.filter((columnId) => !hiddenManagedColumns.includes(columnId)),
    [hiddenManagedColumns, managedColumnOrder]
  )
  const hiddenManagedOrderedColumns = useMemo(
    () => managedColumnOrder.filter((columnId) => hiddenManagedColumns.includes(columnId)),
    [hiddenManagedColumns, managedColumnOrder]
  )

  const updateColumnBuckets = useCallback(
    (nextVisible: string[], nextHidden: string[]) => {
      setSelectedViewId(null)
      setIsDefaultViewApplied(false)
      setManagedColumnOrder([...nextVisible, ...nextHidden])
      setHiddenManagedColumns(nextHidden)
    },
    []
  )

  const moveColumnToBucket = useCallback(
    (columnId: string, targetBucket: ColumnBucket, targetIndex?: number) => {
      const sourceVisible = visibleManagedColumns.filter((item) => item !== columnId)
      const sourceHidden = hiddenManagedOrderedColumns.filter((item) => item !== columnId)
      const nextTargetList = [...(targetBucket === "visible" ? sourceVisible : sourceHidden)]
      const insertionIndex = Math.max(0, Math.min(targetIndex ?? nextTargetList.length, nextTargetList.length))
      nextTargetList.splice(insertionIndex, 0, columnId)

      updateColumnBuckets(
        targetBucket === "visible" ? nextTargetList : sourceVisible,
        targetBucket === "hidden" ? nextTargetList : sourceHidden
      )
    },
    [hiddenManagedOrderedColumns, updateColumnBuckets, visibleManagedColumns]
  )

  const moveColumnWithinBucket = useCallback(
    (columnId: string, bucket: ColumnBucket, direction: "up" | "down") => {
      const bucketItems = bucket === "visible" ? visibleManagedColumns : hiddenManagedOrderedColumns
      const currentIndex = bucketItems.indexOf(columnId)
      if (currentIndex === -1) {
        return
      }

      const targetIndex =
        direction === "up" ? Math.max(currentIndex - 1, 0) : Math.min(currentIndex + 1, bucketItems.length - 1)

      if (targetIndex === currentIndex) {
        return
      }

      const nextBucketItems = [...bucketItems]
      const [moved] = nextBucketItems.splice(currentIndex, 1)
      nextBucketItems.splice(targetIndex, 0, moved)

      updateColumnBuckets(
        bucket === "visible" ? nextBucketItems : visibleManagedColumns,
        bucket === "hidden" ? nextBucketItems : hiddenManagedOrderedColumns
      )
    },
    [hiddenManagedOrderedColumns, updateColumnBuckets, visibleManagedColumns]
  )

  const handleColumnDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over) {
        return
      }

      const activeId = String(active.id)
      const overId = String(over.id)

      const sourceBucket = resolveBucketFromColumnId(activeId, visibleManagedColumns, hiddenManagedOrderedColumns)
      const target = parseColumnInsertId(overId)

      if (!sourceBucket || !target) {
        return
      }

      const sourceItems = sourceBucket === "visible" ? visibleManagedColumns : hiddenManagedOrderedColumns
      const activeIndex = sourceItems.indexOf(activeId)

      if (activeIndex === -1) {
        return
      }

      const sourceWithoutActive = sourceItems.filter((item) => item !== activeId)
      const normalizedTargetIndex =
        sourceBucket === target.bucket && activeIndex < target.index ? target.index - 1 : target.index
      const insertionIndex = Math.max(0, Math.min(normalizedTargetIndex, sourceWithoutActive.length))

      if (sourceBucket === target.bucket) {
        if (insertionIndex === activeIndex) {
          return
        }

        const reordered = [...sourceWithoutActive]
        reordered.splice(insertionIndex, 0, activeId)
        updateColumnBuckets(
          sourceBucket === "visible" ? reordered : visibleManagedColumns,
          sourceBucket === "hidden" ? reordered : hiddenManagedOrderedColumns
        )
        return
      }

      moveColumnToBucket(activeId, target.bucket, insertionIndex)
    },
    [hiddenManagedOrderedColumns, moveColumnToBucket, updateColumnBuckets, visibleManagedColumns]
  )

  const quotationColumns = useMemo<PriorityCollectionColumn<QuotationSummary>[]>(
    () => {
      const columnMap = new Map(allQuotationColumns.map((column) => [column.id, column]))
      return [
        ...fixedLeadingColumns.map((columnId) => columnMap.get(columnId)).filter(Boolean),
        ...visibleManagedColumns.map((columnId) => columnMap.get(columnId)).filter(Boolean),
        ...fixedTrailingColumns.map((columnId) => columnMap.get(columnId)).filter(Boolean),
      ] as PriorityCollectionColumn<QuotationSummary>[]
    },
    [allQuotationColumns, visibleManagedColumns]
  )

  const loadItems = useCallback(async (
    search = "",
    lane: QuotationWorkspaceLane = defaultLane,
    nextPage = 1,
    nextFilters: QuotationFilterState = defaultFilters,
    nextSort: QuotationSortState | null = null
  ) => {
    try {
      setLoading(true)
      const data = await getQuotations({
        scope: "crm",
        query: search,
        status: lane === "all" ? "all" : lane,
        page: nextPage,
        pageSize,
        columnFilters: nextFilters.columnFilters,
        sort: nextSort,
      })
      setItems(data.items)
      setTotalCount(data.totalCount)
    } catch {
      setItems([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [])

  function applyWorkspaceView(view: SavedWorkspaceView) {
    setQuery(view.search_query ?? "")
    setActiveLane((view.status_lane as QuotationWorkspaceLane | null) ?? defaultLane)
    setFilterState(parseQuotationFilters(view.filters_json))
    const visibleManagedFromView = (view.visible_columns_json ?? []).filter((columnId) =>
      defaultManagedColumns.includes(columnId)
    )
    const effectiveVisibleManagedColumns =
      visibleManagedFromView.length > 0 ? visibleManagedFromView : defaultVisibleManagedColumns
    const nextManagedColumns = normalizeManagedColumns(effectiveVisibleManagedColumns)
    setManagedColumnOrder(nextManagedColumns)
    setHiddenManagedColumns(
      defaultManagedColumns.filter((columnId) => !effectiveVisibleManagedColumns.includes(columnId))
    )
    setSortState(parseSortState(view.sort_json))
    setSelectedViewId(view.id)
    setIsDefaultViewApplied(view.is_default)
    setPage(1)
  }

  const applyStoredColumnPreset = useCallback(async () => {
    const preferenceColumns = await getWorkspaceColumnPreference(workspaceKey)
    if (!preferenceColumns || preferenceColumns.length === 0) {
      return
    }

    const effectiveVisibleManagedColumns = preferenceColumns.filter((columnId) =>
      defaultManagedColumns.includes(columnId)
    )
    const nextManagedColumns = normalizeManagedColumns(effectiveVisibleManagedColumns)

    setManagedColumnOrder(nextManagedColumns)
    setHiddenManagedColumns(
      defaultManagedColumns.filter((columnId) => !effectiveVisibleManagedColumns.includes(columnId))
    )
  }, [])

  const bootstrapWorkspace = useCallback(async () => {
    try {
      const views = await getWorkspaceViews(workspaceKey)
      setSavedViews(views)
      const defaultView = views.find((view) => view.is_default)
      if (defaultView) {
        applyWorkspaceView(defaultView)
      } else {
        await applyStoredColumnPreset()
      }
    } catch {
      setSavedViews([])
      await applyStoredColumnPreset()
    }
  }, [applyStoredColumnPreset])

  useEffect(() => {
    void bootstrapWorkspace()
  }, [bootstrapWorkspace])

  useEffect(() => {
    setPage(1)
  }, [activeLane, deferredQuery, filterState, sortState])

  useEffect(() => {
    void loadItems(deferredQuery, activeLane, page, filterState, sortState)
  }, [activeLane, deferredQuery, filterState, loadItems, page, sortState])

  function buildCurrentViewPayload(name: string, isDefault: boolean): SavedWorkspaceViewPayload {
    return {
      workspace_key: workspaceKey,
      name,
      search_query: query.trim() || null,
      status_lane: activeLane,
      filters_json: {
        columnFilters: filterState.columnFilters,
      },
      sort_json: sortState
        ? {
            columnId: sortState.columnId,
            direction: sortState.direction,
          }
        : {},
      visible_columns_json: [
        ...fixedLeadingColumns,
        ...visibleManagedColumns,
        ...fixedTrailingColumns,
      ],
      is_default: isDefault,
    }
  }

  const handleResetWorkspace = () => {
    setSelectedViewId(null)
    setIsDefaultViewApplied(false)
    setQuery("")
    setActiveLane(defaultLane)
    setFilterState(defaultFilters)
    setSortState({
      columnId: "created_at",
      direction: "desc",
    })
    setPage(1)
  }
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


  const workspaceItems =
    activeLane === "all"
      ? items
      : items.filter((item) => item.status === activeLane)
  const totalSales = workspaceItems.reduce((sum, item) => sum + (item.estimated_price ?? 0), 0)
  const isWorkspaceEmpty = !loading && totalCount === 0 && !query.trim() && activeFilterCount === 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const rowToneClassByStatus: Record<string, string> = {
    borrador: "bg-[rgba(248,250,252,0.92)]",
    pendiente: "bg-[rgba(219,234,254,0.74)]",
    cotizando: "bg-[rgba(254,240,138,0.66)]",
    lista_para_enviar: "bg-[rgba(251,207,232,0.42)]",
    enviada: "bg-[rgba(209,250,229,0.62)]",
    renegociar_tarifa: "bg-[rgba(254,202,202,0.56)]",
    aceptada: "bg-[rgba(134,239,172,0.72)]",
    rechazada: "bg-[rgba(253,186,116,0.72)]",
    cancelada: "bg-[rgba(229,231,235,0.88)]",
  }
  const workspaceToolbar = (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_auto_auto_auto_auto] xl:items-center">
      <PrioritySearchField
        value={query}
        onChange={(value) => {
          setSelectedViewId(null)
          setIsDefaultViewApplied(false)
          setQuery(value)
        }}
        placeholder="Buscar cotización por referencia, cliente, ruta o oportunidad"
        ariaLabel="Buscar cotizaciones comerciales"
      />
      <PriorityFilterPopover
        title="Filtros del workspace"
        description="Agrega filtros por columna y guarda esa combinación como una vista operativa."
        activeCount={activeFilterCount}
        onApply={() => undefined}
        onClear={() => {
          setSelectedViewId(null)
          setIsDefaultViewApplied(false)
          setFilterState(defaultFilters)
        }}
        presentation="modal"
        modalClassName="w-[min(94vw,980px)]"
        saveAction={
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpenSaveComposerSignal(Date.now())}
          >
            Guardar como vista
          </Button>
        }
      >
        <div className="space-y-3">
          {activeFilterCount > 0 ? (
            <div className="rounded-[18px] border border-[rgba(144,158,174,0.16)] bg-[rgba(248,250,252,0.82)] p-3">
              <div className="text-[0.74rem] font-semibold uppercase tracking-[0.16em] text-[#607187]">
                Filtros activos
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {filterState.columnFilters
                  .filter((filter) => isFilterActive(filter))
                  .map((filter) => (
                    <span
                      key={filter.id}
                      className="rounded-full border border-[rgba(144,158,174,0.2)] bg-white px-3 py-1 text-xs font-semibold text-[var(--brand-navy)]"
                    >
                      {formatFilterSummary(filter)}
                    </span>
                  ))}
              </div>
            </div>
          ) : null}

          {filterState.columnFilters.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-[rgba(144,158,174,0.22)] px-4 py-3 text-sm text-[#607187]">
              Añade filtros por columna para construir vistas como: cotizaciones ganadas ADAN.
            </div>
          ) : null}

          {filterState.columnFilters.map((filter) => {
            const filterSchema = quotationFilterSchemaByColumn.get(filter.column)

            return (
              <div
                key={filter.id}
                className="space-y-3 rounded-[18px] border border-[rgba(144,158,174,0.16)] bg-[rgba(248,250,252,0.72)] p-3"
              >
                <div className="grid gap-3 md:grid-cols-[minmax(0,220px)_1fr_auto] md:items-end">
                  <PrioritySelectField
                    value={filter.column}
                    onValueChange={(value) => {
                      setSelectedViewId(null)
                      setIsDefaultViewApplied(false)
                      setFilterState((current) => ({
                        ...current,
                        columnFilters: current.columnFilters.map((item) =>
                          item.id === filter.id
                            ? {
                                ...item,
                                column: value as QuotationFilterColumn,
                                value: "",
                                valueTo: "",
                              }
                            : item
                        ),
                      }))
                    }}
                    placeholder="Columna"
                    ariaLabel="Columna a filtrar"
                    options={quotationFilterColumnOptions}
                  />

                  {filterSchema?.filterKind === "date" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <PriorityDateField
                      value={filter.value}
                      onChange={(value) => {
                        setSelectedViewId(null)
                        setIsDefaultViewApplied(false)
                        setFilterState((current) => ({
                          ...current,
                          columnFilters: current.columnFilters.map((item) =>
                            item.id === filter.id ? { ...item, value } : item
                          ),
                        }))
                      }}
                      placeholder="Desde"
                      ariaLabel={`Fecha inicial para ${filterSchema?.label ?? "columna"}`}
                    />
                    <PriorityDateField
                      value={filter.valueTo ?? ""}
                      onChange={(value) => {
                        setSelectedViewId(null)
                        setIsDefaultViewApplied(false)
                        setFilterState((current) => ({
                          ...current,
                          columnFilters: current.columnFilters.map((item) =>
                            item.id === filter.id ? { ...item, valueTo: value } : item
                          ),
                        }))
                      }}
                      placeholder="Hasta"
                      ariaLabel={`Fecha final para ${filterSchema?.label ?? "columna"}`}
                    />
                  </div>
                  ) : filterSchema?.filterKind === "number" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      type="number"
                      value={filter.value}
                      onChange={(event) => {
                        const value = event.target.value
                        setSelectedViewId(null)
                        setIsDefaultViewApplied(false)
                        setFilterState((current) => ({
                          ...current,
                          columnFilters: current.columnFilters.map((item) =>
                            item.id === filter.id ? { ...item, value } : item
                          ),
                        }))
                      }}
                      placeholder="Desde"
                      className="h-11 rounded-[18px] border-[#D1D6DF] bg-white px-4 text-[var(--brand-navy)] shadow-none"
                    />
                    <Input
                      type="number"
                      value={filter.valueTo ?? ""}
                      onChange={(event) => {
                        const value = event.target.value
                        setSelectedViewId(null)
                        setIsDefaultViewApplied(false)
                        setFilterState((current) => ({
                          ...current,
                          columnFilters: current.columnFilters.map((item) =>
                            item.id === filter.id ? { ...item, valueTo: value } : item
                          ),
                        }))
                      }}
                      placeholder="Hasta"
                      className="h-11 rounded-[18px] border-[#D1D6DF] bg-white px-4 text-[var(--brand-navy)] shadow-none"
                    />
                  </div>
                  ) : filterSchema?.filterKind === "select" ? (
                    <PrioritySelectField
                      value={filter.value}
                      onValueChange={(value) => {
                        setSelectedViewId(null)
                        setIsDefaultViewApplied(false)
                        setFilterState((current) => ({
                          ...current,
                          columnFilters: current.columnFilters.map((item) =>
                            item.id === filter.id ? { ...item, value } : item
                          ),
                        }))
                      }}
                      placeholder={`Selecciona ${filterSchema.label.toLocaleLowerCase()}`}
                      ariaLabel={`Valor para ${filterSchema.label}`}
                      options={filterSchema.filterOptions ? [...filterSchema.filterOptions] : []}
                    />
                  ) : (
                    <Input
                      value={filter.value}
                      onChange={(event) => {
                        const value = event.target.value
                        setSelectedViewId(null)
                        setIsDefaultViewApplied(false)
                        setFilterState((current) => ({
                          ...current,
                          columnFilters: current.columnFilters.map((item) =>
                            item.id === filter.id ? { ...item, value } : item
                          ),
                        }))
                      }}
                      placeholder={filterSchema?.filterPlaceholder ?? "Escribe un valor"}
                      className="h-11 rounded-[18px] border-[#D1D6DF] bg-white px-4 text-[var(--brand-navy)] shadow-none"
                    />
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setSelectedViewId(null)
                      setIsDefaultViewApplied(false)
                      setFilterState((current) => ({
                        ...current,
                        columnFilters: current.columnFilters.filter((item) => item.id !== filter.id),
                      }))
                    }}
                  >
                    Quitar
                  </Button>
                </div>
              </div>
            )
          })}

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSelectedViewId(null)
              setIsDefaultViewApplied(false)
              setFilterState((current) => ({
                ...current,
                columnFilters: [...current.columnFilters, createQuotationColumnFilter()],
              }))
            }}
          >
            Añadir filtro
          </Button>
        </div>
      </PriorityFilterPopover>
      <Button type="button" variant="outline" onClick={() => setShowColumnsModal(true)}>
        <span className="inline-flex items-center gap-2">
          <Columns3 className="size-4" />
          Columnas
        </span>
      </Button>
      <PrioritySavedViews
        views={savedViews}
        selectedViewId={selectedViewId}
        openSaveComposerSignal={openSaveComposerSignal}
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
      <Button type="button" variant="outline" onClick={handleResetWorkspace}>
        Limpiar
      </Button>
    </div>
  )
  const workspaceFooter =
    totalCount > 0 ? (
      <div className="flex flex-col gap-3 border-t border-[rgba(144,158,174,0.16)] pt-4 text-sm text-[#607187] sm:flex-row sm:items-center sm:justify-between">
        <div>
          Mostrando {workspaceItems.length} registro(s) de {totalCount}. Página {page} de {totalPages}.
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            disabled={page === 1 || loading}
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPage((current) => current + 1)}
            disabled={page >= totalPages || loading}
          >
            Siguiente
          </Button>
        </div>
      </div>
    ) : null
  const workspaceTabs = (
    <Tabs
      value={activeLane}
      onValueChange={(value) => {
        setSelectedViewId(null)
        setIsDefaultViewApplied(false)
        setActiveLane(value as QuotationWorkspaceLane)
        setPage(1)
      }}
      className="gap-0"
    >
      <TabsList
        className="h-auto w-full justify-start overflow-x-auto rounded-[20px] border border-[rgba(144,158,174,0.16)] bg-[rgba(248,250,252,0.78)] p-1.5"
      >
        {laneTabs.map((lane) => (
          <TabsTrigger
            key={lane.key}
            value={lane.key}
            className="rounded-[16px] px-3.5 py-2.5 text-[0.84rem] font-semibold"
          >
            <span>{lane.label}</span>
            <span className="rounded-full bg-[rgba(11,31,59,0.07)] px-2 py-0.5 text-[11px] font-semibold text-[#607187]">
              {laneCounts[lane.key]}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
  const activeFilterChips =
    activeFilterCount > 0 ? (
      <div className="flex flex-wrap items-center gap-2">
        {filterState.columnFilters
          .filter((filter) => isFilterActive(filter))
          .map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => {
                setSelectedViewId(null)
                setIsDefaultViewApplied(false)
                setFilterState((current) => ({
                  ...current,
                  columnFilters: current.columnFilters.filter((item) => item.id !== filter.id),
                }))
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(144,158,174,0.18)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--brand-navy)] shadow-[0_14px_28px_-24px_rgba(3,10,24,0.32)] transition hover:border-[rgba(11,31,59,0.18)]"
            >
              <span>{formatFilterSummary(filter)}</span>
              <X className="size-3.5 text-[#607187]" />
            </button>
          ))}
      </div>
    ) : null

  return (
    <PageContainer
      density="compact"
      title="Cotizaciones"
      description="Workspace comercial de cotizaciones con lanes por estatus, acciones visibles y vistas guardadas."
    >
      <section className="workspace-panel space-y-4 rounded-[24px] p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#607187]">
              CRM quotations workspace
              {isDefaultViewApplied && selectedViewId ? (
                <span className="rounded-full bg-[rgba(179,58,91,0.08)] px-2 py-0.5 text-[10px] tracking-[0.14em] text-[var(--brand-burgundy)]">
                  Vista default aplicada
                </span>
              ) : null}
            </div>
            <h2 className="text-[1.24rem] font-semibold tracking-[-0.02em] text-[var(--brand-navy)]">
              Cotizaciones por estado comercial
            </h2>
            <p className="max-w-4xl text-[0.95rem] leading-7 text-[#607187]">
              Cambia entre lanes para ubicar rápido el momento de cada cotización y operar desde la
              misma tabla sin depender de menús escondidos.
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
                {workspaceItems.length}
              </div>
            </div>
            <div className="rounded-[18px] border border-[rgba(144,158,174,0.16)] bg-[rgba(248,250,252,0.82)] px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#607187]">
                Venta estimada
              </div>
              <div className="mt-1 text-[0.98rem] font-semibold text-[var(--brand-navy)]">
                {formatCurrency(totalSales)}
              </div>
            </div>
          </div>
        </div>

        <PriorityCollectionWorkspace
          toolbar={
            <div className="space-y-3">
              {workspaceToolbar}
              {workspaceTabs}
              {activeFilterChips}
            </div>
          }
          columns={quotationColumns}
          items={workspaceItems}
          getRowId={(item) => item.id}
          getRowClassName={(item) => rowToneClassByStatus[item.status] ?? ""}
          loading={loading}
          emptyTitle={
            isWorkspaceEmpty ? "Sin cotizaciones" : "No hay cotizaciones con la vista actual"
          }
          emptyDescription={
            isWorkspaceEmpty
              ? "Todavía no hay cotizaciones visibles en CRM. El flujo se activa cuando comercial convierte una oportunidad en cotización."
              : "Prueba otra combinación de tab, búsqueda o filtros para volver a poblar la tabla comercial."
          }
          footer={workspaceFooter}
        />
      </section>

      <PriorityModalShell
        isOpen={showColumnsModal}
        onOpenChange={setShowColumnsModal}
        title="Columnas del workspace"
        description="Arrastra columnas entre visibles y disponibles. La columna de flujo se mantiene fija."
        className="w-[min(94vw,1180px)]"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSelectedViewId(null)
                setIsDefaultViewApplied(false)
                setManagedColumnOrder(normalizeManagedColumns(defaultVisibleManagedColumns))
                setHiddenManagedColumns(
                  defaultManagedColumns.filter((columnId) => !defaultVisibleManagedColumns.includes(columnId))
                )
              }}
            >
              <span className="inline-flex items-center gap-2">
                <RotateCcw className="size-4" />
                Resetear columnas
              </span>
            </Button>
            <Button
              type="button"
              onClick={async () => {
                await setWorkspaceColumnPreference(workspaceKey, visibleManagedColumns)
                notifySuccess(
                  "Preset de columnas guardado",
                  "Este workspace volverá a abrir con tu layout preferido."
                )
                setShowColumnsModal(false)
              }}
            >
              Guardar
            </Button>
          </div>
        }
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleColumnDragEnd}>
          <div className="grid gap-4 lg:grid-cols-2">
            {(
              [
                {
                  bucket: "visible" as const,
                  title: "Columnas visibles",
                  description: "Estas columnas aparecen en la tabla y puedes reordenarlas.",
                  columns: visibleManagedColumns,
                },
                {
                  bucket: "hidden" as const,
                  title: "Columnas disponibles",
                  description: "Arrástralas a visibles cuando quieras mostrarlas.",
                  columns: hiddenManagedOrderedColumns,
                },
              ] satisfies Array<{
                bucket: ColumnBucket
                title: string
                description: string
                columns: string[]
              }>
            ).map((group) => (
              <div
                key={group.bucket}
                className="flex min-h-0 flex-col gap-3 rounded-[24px] border border-[rgba(144,158,174,0.16)] bg-[rgba(248,250,252,0.72)] p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[0.82rem] font-semibold uppercase tracking-[0.16em] text-[#607187]">
                      {group.title}
                    </div>
                    <span className="rounded-full bg-[rgba(11,31,59,0.06)] px-2.5 py-1 text-xs font-semibold text-[#607187]">
                      {group.columns.length}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-[#607187]">{group.description}</p>
                </div>

                <div className="h-[min(52vh,480px)] overflow-y-auto rounded-[22px] border border-[rgba(144,158,174,0.14)] bg-[rgba(255,255,255,0.72)] p-3">
                  <div className="space-y-1">
                    <ColumnInsertZone bucket={group.bucket} index={0} />
                    {group.columns.map((columnId, index) => {
                      const headerLabel = quotationColumnLabels[columnId] ?? columnId

                      return (
                        <Fragment key={columnId}>
                          <DraggableColumnRow
                            id={columnId}
                            bucket={group.bucket}
                            label={headerLabel}
                            index={index}
                            bucketLength={group.columns.length}
                            onMoveUp={() => moveColumnWithinBucket(columnId, group.bucket, "up")}
                            onMoveDown={() => moveColumnWithinBucket(columnId, group.bucket, "down")}
                            onToggleVisibility={() =>
                              moveColumnToBucket(
                                columnId,
                                group.bucket === "visible" ? "hidden" : "visible"
                              )
                            }
                          />
                          <ColumnInsertZone bucket={group.bucket} index={index + 1} />
                        </Fragment>
                      )
                    })}
                    {group.columns.length === 0 ? (
                      <div className="rounded-[18px] border border-dashed border-[rgba(144,158,174,0.2)] bg-white px-4 py-5 text-sm text-[#607187]">
                        Arrastra aquí una columna para colocarla en esta lista.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DndContext>
      </PriorityModalShell>
    </PageContainer>
  )
}
