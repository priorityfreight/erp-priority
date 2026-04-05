"use client"

import { useMemo } from "react"
import type { ServiceTransportType } from "@/lib/db"
import { PriorityFormEngine } from "@/components/priority/forms/PriorityFormEngine"
import { PrioritySectionAlert } from "@/components/priority/PrioritySectionAlert"
import type { FormSchemaDefinition } from "@/lib/forms/types"
import {
  providerServiceOfferingFormSchema,
  type ProviderServiceOfferingFormSchemaValues,
} from "@/features/provider-detail/schemas/provider-form"

export type ProviderServiceOfferingFormValues = ProviderServiceOfferingFormSchemaValues

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
  const uniqueServiceTypes = useMemo(
    () => Array.from(new Set(serviceTransportTypes.map((item) => item.service_type))).sort((a, b) => a.localeCompare(b)),
    [serviceTransportTypes]
  )

  const filteredTransportTypes = useMemo(
    () => serviceTransportTypes.filter((item) => item.service_type === values.serviceType),
    [serviceTransportTypes, values.serviceType]
  )

  const schemaDefinition = useMemo<FormSchemaDefinition<typeof providerServiceOfferingFormSchema>>(
    () => ({
      schema: providerServiceOfferingFormSchema,
      title,
      description,
      sections: [
        {
          id: "service",
          title: "Tipo de servicio y transporte",
          description: "Selecciona una combinación válida desde Master Data.",
          fields: [
            {
              name: "serviceType",
              type: "select",
              label: "Tipo de servicio",
              placeholder: "Tipo de servicio",
              required: true,
              options: uniqueServiceTypes.map((serviceType) => ({
                value: serviceType,
                label: serviceType,
              })),
            },
            {
              name: "serviceTransportTypeId",
              type: "select",
              label: "Tipo de transporte",
              placeholder: "Tipo de transporte",
              required: true,
              options: filteredTransportTypes.map((item) => ({
                value: item.id,
                label: item.transport_type,
              })),
            },
          ],
        },
        {
          id: "terms",
          title: "Términos y condiciones",
          description: "Información comercial específica para ese servicio.",
          fields: [
            {
              name: "termsAndConditions",
              type: "textarea",
              label: "Términos y condiciones",
              description: "Usa este bloque para restricciones, tarifas especiales y condiciones de aprobación.",
              placeholder: "Términos y condiciones de la cotización",
            },
          ],
        },
      ],
    }),
    [description, filteredTransportTypes, title, uniqueServiceTypes]
  )

  return (
    <PriorityFormEngine
      schemaDefinition={schemaDefinition}
      values={values}
      density="compact"
      loading={loading}
      disabled={disabled}
      submitLabel={submitLabel}
      onSubmit={onSubmit}
      onFieldChange={(field, value) => {
        const nextField = field as keyof ProviderServiceOfferingFormValues
        const nextValue = String(value ?? "")
        onChange(nextField, nextValue)
        if (nextField === "serviceType") {
          onChange("serviceTransportTypeId", "")
        }
      }}
      afterSections={(currentValues) =>
        !currentValues.serviceTransportTypeId ? (
          <PrioritySectionAlert title="Selección requerida" variant="warning">
            Selecciona una combinación válida de servicio y transporte antes de guardar esta oferta.
          </PrioritySectionAlert>
        ) : null
      }
    />
  )
}
