"use client"

import { PageContainer } from "@/components/layout/PageContainer"
import { PricingQuotationsView } from "@/features/pricing/quotations/PricingQuotationsView"
import { usePricingQuotationsController } from "@/features/pricing/quotations/usePricingQuotationsController"

export default function PricingQuotationsPage() {
  const controller = usePricingQuotationsController()

  return (
    <PageContainer
      title="Pricing Quotations"
      description="Tablero de pricing para tomar cotizaciones, contactar proveedores y consolidar compra antes de enviarlas al equipo comercial."
    >
      <PricingQuotationsView controller={controller} />
    </PageContainer>
  )
}
