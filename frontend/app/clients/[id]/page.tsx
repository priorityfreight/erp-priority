"use client"

import { useParams } from "next/navigation"
import { PageContainer } from "@/components/layout/PageContainer"
import { StatusBadge } from "@/components/data/StatusBadge"
import { ClientDetailView } from "@/features/client-detail/ClientDetailView"
import { clientStatusOptions } from "@/features/client-detail/helpers"
import { useClientDetailController } from "@/features/client-detail/useClientDetailController"

export default function ClientDetailPage() {
  const params = useParams()
  const clientId = typeof params?.id === "string" ? params.id : undefined
  const controller = useClientDetailController(clientId)

  if (!clientId) {
    return (
      <PageContainer title="Client" description="Invalid client id.">
        <p className="text-sm text-[#6B7280]">Client id is missing from the URL.</p>
      </PageContainer>
    )
  }

  if (controller.loading && !controller.clientDetails) {
    return (
      <PageContainer title="Client" description="Loading client data...">
        <p className="text-sm text-[#6B7280]">Loading client information.</p>
      </PageContainer>
    )
  }

  if (!controller.clientDetails) {
    return (
      <PageContainer title="Client" description="Client not found.">
        <p className="text-sm text-[#6B7280]">
          We could not find a client with this id. It may have been deleted.
        </p>
      </PageContainer>
    )
  }

  const client = controller.clientDetails.client

  return (
    <PageContainer
      title={client.company_name}
      description="Client overview with related contacts and opportunities."
      actions={
        <>
          <div className="min-w-[220px] rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#1D4ED8]">
              Estatus del cliente
            </div>
            <div className="mt-2 flex items-center gap-3">
              <select
                value={controller.status}
                onChange={(event) => {
                  void controller.handleUpdateStatus(event.target.value)
                }}
                disabled={controller.savingStatus}
                className="w-full rounded-md border border-[#93C5FD] bg-white px-3 py-2 text-sm font-medium text-[#1E3A8A] outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] disabled:cursor-not-allowed disabled:bg-[#DBEAFE]"
              >
                {clientStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <StatusBadge status={controller.status} />
            </div>
            <div className="mt-2 text-[11px] text-[#1D4ED8]">
              {controller.savingStatus ? "Guardando estatus..." : "Seguimiento principal del cliente"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => controller.setShowEditModal(true)}
            className="rounded-md border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-medium text-[#111827] hover:bg-[#F9FAFB]"
          >
            Editar informacion
          </button>
          <button
            type="button"
            onClick={() => {
              controller.setOpportunityForm((current) => ({
                ...current,
                clientId: client.id,
                salespersonId: current.salespersonId || client.account_owner_id || "",
              }))
              controller.setShowOpportunityModal(true)
            }}
            className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8]"
          >
            Anadir oportunidad
          </button>
          <button
            type="button"
            onClick={controller.handleDeleteClient}
            disabled={controller.deletingClient}
            className="rounded-md border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-2 text-sm font-medium text-[#B91C1C] hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {controller.deletingClient ? "Deleting..." : "Delete Client"}
          </button>
        </>
      }
    >
      <ClientDetailView controller={controller} />
    </PageContainer>
  )
}
