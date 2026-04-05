import { type ColumnDef } from "@tanstack/react-table"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { PriorityCollectionTable } from "@/components/priority/collection/PriorityCollectionTable"
import { PriorityEmptyState } from "@/components/priority/PriorityEmptyState"
import { PriorityRowActions } from "@/components/priority/PriorityRowActions"
import { PriorityToolbar } from "@/components/priority/PriorityToolbar"
import { PriorityTypography } from "@/components/priority/PriorityTypography"
import { PriorityUserAvatar } from "@/components/priority/PriorityUserAvatar"
import { Button } from "@/components/ui/button"

type SampleRow = {
  id: string
  quotation: string
  client: string
  owner: string
  status: string
  total: string
}

const sampleRows: SampleRow[] = [
  {
    id: "1",
    quotation: "QPRIFTL-000131",
    client: "Primak",
    owner: "Ana Pricing",
    status: "lista_para_enviar",
    total: "$128,500 MXN",
  },
  {
    id: "2",
    quotation: "QPRAIR-000201",
    client: "North Freight",
    owner: "Luis Admin",
    status: "cotizando",
    total: "$84,250 MXN",
  },
]

const columns: ColumnDef<SampleRow>[] = [
  {
    accessorKey: "quotation",
    header: "Referencia",
  },
  {
    accessorKey: "client",
    header: "Cliente",
  },
  {
    accessorKey: "owner",
    header: "Owner",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <PriorityUserAvatar name={row.original.owner} size="sm" />
        <span>{row.original.owner}</span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Estatus",
  },
  {
    accessorKey: "total",
    header: "Total",
  },
  {
    id: "actions",
    header: "Acciones",
    cell: () => (
      <div className="flex justify-end">
        <PriorityRowActions
          actions={[
            { label: "Ver detalle", onSelect: () => undefined },
            { label: "Duplicar", onSelect: () => undefined },
            { label: "Eliminar", onSelect: () => undefined, destructive: true },
          ]}
        />
      </div>
    ),
  },
]

const meta = {
  title: "Priority/Tables And States",
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

export const PriorityCollectionTableReview: Story = {
  render: () => (
    <div className="space-y-6 rounded-[32px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.92)] p-8 shadow-[0_32px_80px_-48px_rgba(3,10,24,0.4)]">
      <div className="space-y-2">
        <PriorityTypography variant="eyebrow">List Review</PriorityTypography>
        <PriorityTypography as="h1" variant="pageTitle">
          Tabla lista para auditoría visual
        </PriorityTypography>
        <PriorityTypography variant="bodyMuted">
          Sirve para revisar densidad, jerarquía, acciones por fila y estados vacíos antes de tocar
          listas live.
        </PriorityTypography>
      </div>

      <PriorityCollectionTable
        columns={columns}
        data={sampleRows}
        emptyTitle="Sin registros"
        emptyDescription="No hay datos todavía."
        enableRowSelection
        showColumnVisibilityMenu
        toolbar={
          <PriorityToolbar>
            <PriorityTypography variant="bodyMuted">
              Toolbar canónica para filtros, toggles y acciones masivas.
            </PriorityTypography>
            <div className="ml-auto">
              <Button type="button">Nueva cotización</Button>
            </div>
          </PriorityToolbar>
        }
      />
    </div>
  ),
}

export const EmptyStatesReview: Story = {
  render: () => (
    <div className="grid gap-6 xl:grid-cols-2">
      <PriorityEmptyState
        title="Sin resultados"
        description="No encontramos registros con los filtros actuales."
        variant="search"
      />
      <PriorityEmptyState
        title="Acceso restringido"
        description="Tu rol no puede consultar este bloque todavía."
        variant="blocked"
      />
      <PriorityEmptyState
        title="Sin datos iniciales"
        description="El módulo está listo, pero aún no se han cargado registros."
        action={<Button type="button">Crear primer registro</Button>}
      />
      <PriorityEmptyState
        title="Error recuperable"
        description="Hubo un problema al consultar el catálogo. Vuelve a intentarlo."
        variant="error"
        action={
          <Button type="button" variant="outline">
            Reintentar
          </Button>
        }
      />
    </div>
  ),
}
