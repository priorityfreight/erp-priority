"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { StatusBadge } from "@/components/data/StatusBadge"
import { PageContainer } from "@/components/layout/PageContainer"
import { PrioritySectionAlert } from "@/components/priority/PrioritySectionAlert"
import { QuotationDetailView } from "@/features/quotations/detail/QuotationDetailView"
import {
  buildQuotationFormValues,
  buildStatusFormValues,
} from "@/features/quotations/detail/helpers"
import { useQuotationDetailController } from "@/features/quotations/detail/useQuotationDetailController"

export default function QuotationDetailPage() {
  const params = useParams()
  const quotationId = typeof params?.id === "string" ? params.id : undefined
  const controller = useQuotationDetailController(quotationId)

  if (!quotationId) {
    return (
      <PageContainer title="Cotización" description="ID de cotización inválido.">
        <p className="text-sm text-[#6B7280]">Falta el identificador de la cotización en la URL.</p>
      </PageContainer>
    )
  }

  if (controller.loading && !controller.details) {
    return (
      <PageContainer title="Cotización" description="Cargando información de la cotización…">
        <p className="text-sm text-[#6B7280]">Estamos preparando la vista comercial de la cotización.</p>
      </PageContainer>
    )
  }

  if (!controller.details) {
    return (
      <PageContainer title="Cotización" description="Cotización no encontrada.">
        <p className="text-sm text-[#6B7280]">No encontramos una cotización con este identificador.</p>
      </PageContainer>
    )
  }

  const quotation = controller.details.quotation

  return (
    <PageContainer
      title={quotation.reference_number || "Cotización"}
      description={`Cotización comercial para ${quotation.client_name || "cliente"}.`}
      actions={
        <ButtonGroup className="flex flex-wrap items-center gap-3 bg-transparent p-0">
          <PrioritySectionAlert
            title={quotation.status === "borrador" ? "Captura interna" : "Estatus de la cotización"}
            variant="info"
            className="max-w-[360px]"
          >
            {quotation.status === "borrador" ? (
              <>
                Completa ruta e información de carga antes de solicitarla a pricing.
              </>
            ) : (
              <div className="flex items-center gap-3">
                <StatusBadge status={quotation.status} />
                <span>{quotation.pricing_owner_name || "Sin responsable de pricing"}</span>
              </div>
            )}
          </PrioritySectionAlert>
          <Button asChild type="button" variant="outline">
            <Link href="/quotations">Volver</Link>
          </Button>
          {quotation.status === "borrador" ? (
            <Button
              type="button"
              onClick={() => void controller.handleRequestPricing()}
              disabled={controller.requestingPricing}
            >
              {controller.requestingPricing ? "Solicitando…" : "Solicitar a pricing"}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              controller.setQuoteFormValues(buildQuotationFormValues(quotation))
              controller.setShowEditModal(true)
            }}
          >
            Editar información
          </Button>
          {quotation.status !== "borrador" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                controller.setStatusFormValues(buildStatusFormValues(quotation))
                controller.setShowStatusModal(true)
              }}
            >
              Actualizar estatus
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              controller.resetCargoForm()
              controller.setShowCargoModal(true)
            }}
          >
            Añadir detalle de carga
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href={`/quotations/${quotation.id}/document/pdf`} target="_blank">
              Documento / PDF
            </Link>
          </Button>
          {quotation.status === "aceptada" ? (
            <Button
              type="button"
              onClick={() => void controller.handleCreateBooking()}
              disabled={controller.creatingBooking}
              variant="secondary"
            >
              {controller.creatingBooking ? "Creando booking…" : "Crear booking"}
            </Button>
          ) : null}
        </ButtonGroup>
      }
    >
      <QuotationDetailView controller={controller} />
    </PageContainer>
  )
}
