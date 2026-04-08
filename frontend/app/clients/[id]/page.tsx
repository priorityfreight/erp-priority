"use client"

import { useParams } from "next/navigation"
import { PageContainer } from "@/components/layout/PageContainer"
import { StatusBadge } from "@/components/data/StatusBadge"
import { ClientDetailView } from "@/features/client-detail/ClientDetailView"
import { clientStatusOptions } from "@/features/client-detail/helpers"
import { useClientDetailController } from "@/features/client-detail/useClientDetailController"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"

export default function ClientDetailPage() {
  const params = useParams()
  const clientId = typeof params?.id === "string" ? params.id : undefined
  const controller = useClientDetailController(clientId)

  if (!clientId) {
    return (
      <PageContainer title="Cliente" description="ID de cliente inválido.">
        <p className="text-sm text-[#6B7280]">Falta el identificador del cliente en la URL.</p>
      </PageContainer>
    )
  }

  if (controller.loading && !controller.clientDetails) {
    return (
      <PageContainer title="Cliente" description="Cargando información del cliente…">
        <p className="text-sm text-[#6B7280]">Estamos preparando la ficha del cliente.</p>
      </PageContainer>
    )
  }

  if (!controller.clientDetails) {
    return (
      <PageContainer title="Cliente" description="Cliente no encontrado.">
        <p className="text-sm text-[#6B7280]">
          No encontramos un cliente con este identificador. Es posible que ya no exista.
        </p>
      </PageContainer>
    )
  }

  const client = controller.clientDetails.client

  return (
    <PageContainer
      title={client.company_name}
      description="Resumen comercial de la cuenta con contactos, registros operativos y oportunidades relacionadas."
      meta={
        <div className="flex flex-wrap items-center gap-3 rounded-[20px] border border-white/10 bg-white/8 px-3 py-2 text-sm text-[var(--brand-light-gray)]">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-gray)]">Estatus comercial</span>
          <select
            value={controller.status}
            onChange={(event) => {
              void controller.handleUpdateStatus(event.target.value)
            }}
            disabled={controller.savingStatus}
            className="rounded-xl border border-white/10 bg-[rgba(255,255,255,0.08)] px-3 py-2 text-sm font-medium text-white outline-none focus:border-[rgba(179,58,91,0.45)]"
          >
            {clientStatusOptions.map((option) => (
              <option key={option.value} value={option.value} className="text-[#111827]">
                {option.label}
              </option>
            ))}
          </select>
          <StatusBadge status={controller.status} />
          <span className="text-xs text-[var(--brand-soft-gray)]">
            {controller.savingStatus ? "Guardando estatus…" : "Seguimiento principal del cliente"}
          </span>
        </div>
      }
      actions={
        <ButtonGroup className="flex flex-wrap items-center gap-3 bg-transparent p-0">
          <Button type="button" variant="outline" onClick={() => history.back()}>
            Volver
          </Button>
          <Button type="button" variant="outline" onClick={() => controller.setShowEditModal(true)}>
            Editar perfil
          </Button>
          <Button
            type="button"
            onClick={() => {
              controller.setOpportunityForm((current) => ({
                ...current,
                clientId: client.id,
                salespersonId: current.salespersonId || client.account_owner_id || "",
              }))
              controller.setShowOpportunityModal(true)
            }}
          >
            Añadir oportunidad
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={controller.handleDeleteClient}
            disabled={controller.deletingClient}
          >
            {controller.deletingClient ? "Eliminando…" : "Eliminar cliente"}
          </Button>
        </ButtonGroup>
      }
    >
      <ClientDetailView controller={controller} />
    </PageContainer>
  )
}
