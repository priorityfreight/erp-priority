import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import {
  PriorityMetricCard,
  PriorityMetricStrip,
  PrioritySummaryRail,
  PriorityWorkspaceHeader,
} from "@/components/priority/PriorityWorkspace"
import { Button } from "@/components/ui/button"

const meta = {
  title: "Priority/Workspace Patterns",
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

export const OperatorWorkspace: Story = {
  render: () => (
    <div className="space-y-6 rounded-[32px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.9)] p-8 shadow-[0_32px_80px_-48px_rgba(3,10,24,0.4)]">
      <PriorityWorkspaceHeader
        title="Pricing Workbench"
        description="Compact header with clear actions, quick orientation, and more viewport left for real work."
        meta={<div className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-medium text-[var(--brand-soft-gray)]">Pricing module</div>}
        actions={
          <>
            <Button type="button" variant="outline">
              Volver
            </Button>
            <Button type="button">Nueva acción</Button>
          </>
        }
      />

      <PrioritySummaryRail className="xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <div className="space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#66788D]">Workspace summary</div>
          <div className="max-w-3xl text-2xl font-semibold tracking-[-0.03em] text-[var(--brand-navy)]">
            La pantalla debe enseñar dónde estás, qué sigue y qué vale más sin hacerte leer un documento.
          </div>
          <div className="max-w-3xl text-sm leading-7 text-[#5B6A7D]">
            Este patrón reemplaza héroes decorativos por orientación útil y devuelve el viewport al trabajo real.
          </div>
        </div>
        <div className="rounded-[20px] border border-[rgba(11,31,59,0.08)] bg-[rgba(11,31,59,0.03)] p-4 text-sm leading-7 text-[var(--brand-navy)]">
          Panel secundario para contexto, estado o siguiente paso.
        </div>
      </PrioritySummaryRail>

      <PriorityMetricStrip>
        <PriorityMetricCard label="Pendientes" value="18" helper="Listos para tomar." tone="info" />
        <PriorityMetricCard label="En curso" value="7" helper="Ya en workspace activo." tone="warning" />
        <PriorityMetricCard label="Listos" value="4" helper="Con salida clara." tone="success" />
        <PriorityMetricCard label="Valor total" value="$1,248,900" helper="Lectura rápida con números tabulares." tone="spotlight" />
      </PriorityMetricStrip>
    </div>
  ),
}
