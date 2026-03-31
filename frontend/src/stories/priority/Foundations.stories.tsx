import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { PrioritySectionAlert } from "@/components/priority/PrioritySectionAlert"
import {
  PriorityCardTitle,
  PriorityPageTitle,
  PrioritySectionTitle,
  PriorityTypography,
} from "@/components/priority/PriorityTypography"
import { PriorityUserAvatar } from "@/components/priority/PriorityUserAvatar"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"

const meta = {
  title: "Priority/Foundations",
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

export const TypographyAndFeedback: Story = {
  render: () => (
    <div className="space-y-8 rounded-[32px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.9)] p-8 shadow-[0_32px_80px_-48px_rgba(3,10,24,0.4)]">
      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-4">
          <PriorityTypography variant="eyebrow">Priority UI Review</PriorityTypography>
          <PriorityPageTitle>Jerarquía visual y legibilidad del ERP</PriorityPageTitle>
          <PriorityTypography variant="bodyMuted">
            Esta vista sirve para revisar rápidamente si títulos, textos secundarios, alertas y acciones
            hablan el mismo idioma visual antes de tocar módulos live.
          </PriorityTypography>
        </div>
        <div className="flex items-start justify-end gap-3">
          <PriorityUserAvatar name="Ana Pricing" size="lg" />
          <PriorityUserAvatar name="Jose Ventas" />
          <PriorityUserAvatar name="Luis Admin" size="sm" />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4 rounded-[28px] border border-[var(--border-subtle)] bg-white p-6">
          <PrioritySectionTitle>Escala tipográfica</PrioritySectionTitle>
          <div className="space-y-3">
            <PriorityCardTitle>Card title para bloques críticos</PriorityCardTitle>
            <PriorityTypography variant="body">
              El cuerpo base debe seguir siendo cómodo para workflows densos sin perder elegancia.
            </PriorityTypography>
            <PriorityTypography variant="bodyMuted">
              El texto secundario explica contexto, no compite con datos ni acciones.
            </PriorityTypography>
            <PriorityTypography variant="fieldLabel">Field label / label de dato</PriorityTypography>
            <PriorityTypography variant="dataValue">$128,500.00 MXN</PriorityTypography>
            <PriorityTypography variant="caption">
              Caption para ayuda contextual, políticas o datos derivados.
            </PriorityTypography>
          </div>
        </div>

        <div className="space-y-4 rounded-[28px] border border-[var(--border-subtle)] bg-white p-6">
          <PrioritySectionTitle>Acciones y contrastes</PrioritySectionTitle>
          <ButtonGroup>
            <Button type="button">Guardar cambios</Button>
            <Button type="button" variant="outline">
              Editar
            </Button>
            <Button type="button" variant="secondary">
              Duplicar
            </Button>
            <Button type="button" variant="destructive">
              Eliminar
            </Button>
          </ButtonGroup>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <PrioritySectionAlert title="Info operativa">
          Los cambios visuales deben proteger primero legibilidad, densidad y acciones críticas.
        </PrioritySectionAlert>
        <PrioritySectionAlert title="Cambios listos para validar" variant="success">
          El patrón visual ya está listo para revisión interna antes de pasar a los módulos live.
        </PrioritySectionAlert>
        <PrioritySectionAlert title="Revisión pendiente" variant="warning">
          Si algún texto pierde contraste sobre fondos claros, se ajusta en el wrapper base, no con hacks
          por pantalla.
        </PrioritySectionAlert>
        <PrioritySectionAlert title="Riesgo visual" variant="destructive">
          No se permiten acciones primarias o destructivas con contraste ambiguo dentro del ERP.
        </PrioritySectionAlert>
      </section>
    </div>
  ),
}
