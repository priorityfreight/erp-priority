"use client"

import {
  PriorityFormField,
  PriorityFormGrid,
  PriorityFormSection,
  PriorityInfoField,
  PrioritySubmitBar,
  PriorityTextarea,
} from "@/components/priority/PriorityForm"
import { PriorityDateField } from "@/components/priority/PriorityDateField"
import { PriorityTypography } from "@/components/priority/PriorityTypography"
import { Button } from "@/components/ui/button"

export type QuotationFormValues = {
  pickupAddress: string
  deliveryAddress: string
  requiredQuoteDate: string
}

type QuotationFormProps = {
  title: string
  description?: string
  values: QuotationFormValues
  clientName: string | null
  origin: string | null
  destination: string | null
  serviceType: string | null
  transportType: string | null
  operationType: string | null
  incotermCode: string | null
  createdAt?: string | null
  onChange: (field: keyof QuotationFormValues, value: string) => void
  onSubmit?: () => void
  submitLabel?: string
  loading?: boolean
  disabled?: boolean
}

export function QuotationForm({
  title,
  description,
  values,
  clientName,
  origin,
  destination,
  serviceType,
  transportType,
  operationType,
  incotermCode,
  createdAt,
  onChange,
  onSubmit,
  submitLabel = "Guardar",
  loading = false,
  disabled = false,
}: QuotationFormProps) {
  return (
    <section className="space-y-5 rounded-[28px] border border-[var(--border-subtle)] bg-[rgba(248,250,252,0.82)] p-5 shadow-[0_26px_60px_-42px_rgba(3,10,24,0.42)]">
      <div>
        <PriorityTypography as="h2" variant="sectionTitle" className="text-xl">
          {title}
        </PriorityTypography>
        {description ? (
          <PriorityTypography variant="bodyMuted" className="mt-2">
            {description}
          </PriorityTypography>
        ) : null}
      </div>

      <PriorityFormSection
        title="Informacion de la cotizacion"
        description="Esta informacion se arrastra desde la oportunidad comercial."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <PriorityInfoField label="Cliente" value={clientName} />
          <PriorityInfoField label="Tipo de servicio" value={serviceType} />
          <PriorityInfoField label="Tipo de transporte" value={transportType} />
          <PriorityInfoField label="Tipo de operacion" value={operationType} />
          <PriorityInfoField label="Incoterm" value={incotermCode} />
          <PriorityInfoField label="Origen" value={origin} />
          <PriorityInfoField label="Destino" value={destination} />
          <PriorityInfoField label="Fecha creada" value={createdAt} />
        </div>
      </PriorityFormSection>

      <PriorityFormSection title="Ruta" description="Captura unicamente las direcciones operativas de recoleccion y entrega.">
        <PriorityFormGrid className="md:grid-cols-2 xl:grid-cols-2">
          <PriorityFormField label="Direccion de pickup">
            <PriorityTextarea
              value={values.pickupAddress}
              onChange={(event) => onChange("pickupAddress", event.target.value)}
              placeholder="Direccion completa de pickup"
              disabled={disabled}
              className="min-h-[120px]"
            />
          </PriorityFormField>
          <PriorityFormField label="Direccion de entrega">
            <PriorityTextarea
              value={values.deliveryAddress}
              onChange={(event) => onChange("deliveryAddress", event.target.value)}
              placeholder="Direccion completa de entrega"
              disabled={disabled}
              className="min-h-[120px]"
            />
          </PriorityFormField>
        </PriorityFormGrid>
      </PriorityFormSection>

      <PriorityFormSection
        title="Detalles de cotizacion"
        description="Captura las fechas comerciales necesarias para el seguimiento."
      >
        <PriorityFormGrid className="md:grid-cols-2 xl:grid-cols-2">
          <PriorityFormField label="Fecha que requieren la cotizacion">
            <PriorityDateField
              value={values.requiredQuoteDate}
              onChange={(value) => onChange("requiredQuoteDate", value)}
              disabled={disabled}
            />
          </PriorityFormField>
        </PriorityFormGrid>
      </PriorityFormSection>

      {onSubmit ? (
        <PrioritySubmitBar>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={loading || disabled}
          >
            {loading ? "Guardando..." : submitLabel}
          </Button>
        </PrioritySubmitBar>
      ) : null}
    </section>
  )
}
