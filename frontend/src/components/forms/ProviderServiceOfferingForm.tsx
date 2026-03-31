"use client"

import type { ServiceTransportType } from "@/lib/db"
import { Button } from "@/components/ui/button"
import {
  PriorityFormHeader,
  PriorityFormField,
  PriorityFormGrid,
  PriorityFormSection,
  PrioritySelectField,
  PrioritySubmitBar,
  PriorityTextarea,
} from "@/components/priority/PriorityForm"
import { PrioritySectionAlert } from "@/components/priority/PrioritySectionAlert"

export type ProviderServiceOfferingFormValues = {
  serviceType: string
  serviceTransportTypeId: string
  termsAndConditions: string
}

type ProviderServiceOfferingFormProps = {
  title: string
  description?: string
  values: ProviderServiceOfferingFormValues
  serviceTransportTypes: ServiceTransportType[]
  onChange: (field: keyof ProviderServiceOfferingFormValues, value: string) => void
  onSubmit?: () => void
  submitLabel?: string
  loading?: boolean
  disabled?: boolean
}

export function ProviderServiceOfferingForm({
  title,
  description,
  values,
  serviceTransportTypes,
  onChange,
  onSubmit,
  submitLabel = "Guardar",
  loading = false,
  disabled = false,
}: ProviderServiceOfferingFormProps) {
  const uniqueServiceTypes = Array.from(
    new Set(serviceTransportTypes.map((item) => item.service_type))
  ).sort((left, right) => left.localeCompare(right))

  const filteredTransportTypes = serviceTransportTypes.filter(
    (item) => item.service_type === values.serviceType
  )

  return (
    <section className="space-y-5 rounded-[28px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(245,247,250,0.96)_100%)] p-5 shadow-[0_28px_60px_-44px_rgba(3,10,24,0.42)]">
      <PriorityFormHeader title={title} description={description} />

      <PriorityFormSection
        title="Tipo de servicio y transporte"
        description="Selecciona una combinacion valida desde Master Data."
      >
        <PriorityFormGrid>
          <PriorityFormField label="Tipo de servicio">
            <PrioritySelectField
              value={values.serviceType}
              onValueChange={(value) => {
                onChange("serviceType", value)
                onChange("serviceTransportTypeId", "")
              }}
              placeholder="Tipo de servicio"
              disabled={disabled}
              options={uniqueServiceTypes.map((serviceType) => ({
                value: serviceType,
                label: serviceType,
              }))}
            />
          </PriorityFormField>
          <PriorityFormField label="Tipo de transporte">
            <PrioritySelectField
              value={values.serviceTransportTypeId}
              onValueChange={(value) => onChange("serviceTransportTypeId", value)}
              placeholder="Tipo de transporte"
              disabled={disabled || !values.serviceType}
              options={filteredTransportTypes.map((item) => ({
                value: item.id,
                label: item.transport_type,
              }))}
            />
          </PriorityFormField>
        </PriorityFormGrid>
      </PriorityFormSection>

      <PriorityFormSection
        title="Terminos y condiciones"
        description="Informacion comercial especifica para ese servicio."
      >
        <PriorityFormField
          label="Terminos y condiciones"
          description="Usa este bloque para restricciones, tarifas especiales y condiciones de aprobacion."
        >
          <PriorityTextarea
            className="min-h-[140px]"
            placeholder="Terminos y condiciones de la cotizacion"
            value={values.termsAndConditions}
            onChange={(event) => onChange("termsAndConditions", event.target.value)}
            disabled={disabled}
          />
        </PriorityFormField>
      </PriorityFormSection>

      {!values.serviceTransportTypeId ? (
        <PrioritySectionAlert title="Seleccion requerida" variant="warning">
          Selecciona una combinacion valida de servicio y transporte antes de guardar esta oferta.
        </PrioritySectionAlert>
      ) : null}

      {onSubmit ? (
        <PrioritySubmitBar>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={disabled || loading || !values.serviceTransportTypeId}
          >
            {loading ? "Guardando..." : submitLabel}
          </Button>
        </PrioritySubmitBar>
      ) : null}
    </section>
  )
}
