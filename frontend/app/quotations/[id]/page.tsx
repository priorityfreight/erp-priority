"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
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
      <PageContainer title="Quotation" description="Invalid quotation id.">
        <p className="text-sm text-[#6B7280]">Quotation id is missing from the URL.</p>
      </PageContainer>
    )
  }

  if (controller.loading && !controller.details) {
    return (
      <PageContainer title="Quotation" description="Loading quotation data...">
        <p className="text-sm text-[#6B7280]">Loading quotation information.</p>
      </PageContainer>
    )
  }

  if (!controller.details) {
    return (
      <PageContainer title="Quotation" description="Quotation not found.">
        <p className="text-sm text-[#6B7280]">We could not find a quotation with this id.</p>
      </PageContainer>
    )
  }

  const quotation = controller.details.quotation

  return (
    <PageContainer
      title={quotation.reference_number || "Quotation"}
      description={`Cotizacion comercial para ${quotation.client_name || "cliente"}.`}
      actions={
        <>
          <PrioritySectionAlert
            title={quotation.status === "borrador" ? "Captura interna" : "Estatus de la cotizacion"}
            variant="info"
            className="max-w-[360px]"
          >
            {quotation.status === "borrador" ? (
              <>
                Completa ruta e informacion de carga antes de solicitarla a pricing.
              </>
            ) : (
              <div className="flex items-center gap-3">
                <StatusBadge status={quotation.status} />
                <span>{quotation.pricing_owner_name || "Sin owner de pricing"}</span>
              </div>
            )}
          </PrioritySectionAlert>
          <Button asChild type="button" variant="outline">
            <Link href="/quotations">Back</Link>
          </Button>
          {quotation.status === "borrador" ? (
            <Button
              type="button"
              onClick={() => void controller.handleRequestPricing()}
              disabled={controller.requestingPricing}
            >
              {controller.requestingPricing ? "Solicitando..." : "Solicitar a pricing"}
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
            Editar informacion
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
            Anadir detalle de carga
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
              {controller.creatingBooking ? "Creando booking..." : "Crear booking"}
            </Button>
          ) : null}
        </>
      }
    >
      <QuotationDetailView controller={controller} />
    </PageContainer>
  )
}
