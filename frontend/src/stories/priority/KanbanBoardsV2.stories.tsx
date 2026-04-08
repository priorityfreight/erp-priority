import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/data/StatusBadge"
import { PriorityKanbanBoard, PriorityKanbanCard, type PriorityKanbanLane } from "@/components/priority"

type BoardItem = {
  id: string
  title: string
  subtitle: string
  service: string
  owner: string
  value: string
  status: string
}

const meta = {
  title: "Priority/Kanban Boards v2",
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

const opportunityLanes: PriorityKanbanLane[] = [
  { key: "investigando", label: "Investigando", helper: "Primer análisis comercial.", tone: "info" },
  { key: "confirmado", label: "Confirmadas", helper: "Solicitud validada.", tone: "neutral" },
  { key: "cotizando", label: "Cotizando", helper: "Pricing en proceso.", tone: "warning" },
  { key: "aceptado", label: "Ganadas", helper: "Cierre positivo.", tone: "success" },
]

const opportunityItems: BoardItem[] = [
  {
    id: "opp-1",
    title: "Proyecto Atlas",
    subtitle: "Cliente Atlas · Monterrey -> Laredo",
    service: "AIR / Importación",
    owner: "Adan Rodriguez",
    value: "$42,000",
    status: "investigando",
  },
  {
    id: "opp-2",
    title: "Helix Border",
    subtitle: "Grupo Helix · Querétaro -> Houston",
    service: "LTL / Exportación",
    owner: "Martha Perez",
    value: "$18,500",
    status: "confirmado",
  },
  {
    id: "opp-3",
    title: "Foods Miami",
    subtitle: "Electra Foods · CDMX -> Miami",
    service: "Courier / Importación",
    owner: "Adan Rodriguez",
    value: "$27,200",
    status: "cotizando",
  },
]

const clientLanes: PriorityKanbanLane[] = [
  { key: "prospecto", label: "Prospectos", helper: "Alta reciente o pendiente.", tone: "info" },
  {
    key: "buscando_informacion",
    label: "Investigando",
    helper: "Levantamiento operativo y documental.",
    tone: "neutral",
  },
  { key: "cotizando", label: "Cotizando", helper: "Cuenta ya ligada a oportunidad activa.", tone: "warning" },
  {
    key: "aceptacion_verbal",
    label: "Aceptación verbal",
    helper: "Cerca del cierre comercial formal.",
    tone: "spotlight",
  },
  { key: "cliente", label: "Clientes activos", helper: "Cuentas operando en el ERP.", tone: "success" },
]

const clientItems: BoardItem[] = [
  {
    id: "client-1",
    title: "Cliente Atlas",
    subtitle: "Manufactura · Monterrey",
    service: "Owner: Adan Rodriguez",
    owner: "Seguimiento esta semana",
    value: "$320,000 pipeline",
    status: "cliente",
  },
  {
    id: "client-2",
    title: "North Bridge",
    subtitle: "Retail · Querétaro",
    service: "Owner: Ana Pricing",
    owner: "Último contacto hace 15 días",
    value: "$95,000 pipeline",
    status: "cotizando",
  },
]

function renderBoard(
  lanes: PriorityKanbanLane[],
  items: BoardItem[],
  highlightedLaneKey: string
) {
  return (
    <div className="space-y-4 rounded-[32px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.94)] p-6 shadow-[0_32px_80px_-48px_rgba(3,10,24,0.38)]">
      <PriorityKanbanBoard
        lanes={lanes}
        highlightedLaneKey={highlightedLaneKey}
        itemsByLane={lanes.reduce<Record<string, BoardItem[]>>(
          (accumulator, lane) => ({
            ...accumulator,
            [lane.key]: items.filter((item) => item.status === lane.key),
          }),
          {}
        )}
        getItemId={(item) => item.id}
        emptyTitle="Sin registros"
        emptyDescription="La demo del board se queda vacía para mostrar el estado compartido."
        renderCard={(item) => (
          <PriorityKanbanCard
            title={item.title}
            subtitle={item.subtitle}
            badges={
              <>
                <StatusBadge status={item.status} />
                <span className="rounded-full bg-[rgba(11,31,59,0.08)] px-2.5 py-1 text-xs font-semibold text-[var(--brand-navy)]">
                  {item.service}
                </span>
              </>
            }
            meta={
              <div className="space-y-1">
                <div>{item.owner}</div>
                <div className="text-xs text-[#607187]">{item.value}</div>
              </div>
            }
            actions={
              <>
                <Button type="button" size="sm" variant="outline">
                  Abrir
                </Button>
                <Button type="button" size="sm" variant="outline">
                  Acción rápida
                </Button>
              </>
            }
          />
        )}
      />
    </div>
  )
}

export const OpportunitiesBoard: Story = {
  render: () => renderBoard(opportunityLanes, opportunityItems, "cotizando"),
}

export const ClientsPipelineBoard: Story = {
  render: () => renderBoard(clientLanes, clientItems, "cliente"),
}
