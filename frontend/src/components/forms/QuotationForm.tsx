"use client"

import { useMemo } from "react"
import { PriorityFormEngine } from "@/components/priority/forms/PriorityFormEngine"
import { quotationFormSchema, type QuotationFormSchemaValues } from "@/features/quotations/detail/schemas/quotation-form"
import type { FormSchemaDefinition } from "@/lib/forms/types"

export type QuotationFormValues = QuotationFormSchemaValues

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
  const schemaDefinition = useMemo<FormSchemaDefinition<typeof quotationFormSchema>>(
    () => ({
      schema: quotationFormSchema,
      title,
      description,
      sections: [
        {
          id: "summary",
          title: "Información de la cotización",
          description: "Esta información se arrastra desde la oportunidad comercial.",
          columnsClassName: "xl:grid-cols-4",
          fields: [
            { type: "info", label: "Cliente", infoValue: () => clientName },
            { type: "info", label: "Tipo de servicio", infoValue: () => serviceType },
            { type: "info", label: "Tipo de transporte", infoValue: () => transportType },
            { type: "info", label: "Tipo de operación", infoValue: () => operationType },
            { type: "info", label: "Incoterm", infoValue: () => incotermCode },
            { type: "info", label: "Origen", infoValue: () => origin },
            { type: "info", label: "Destino", infoValue: () => destination },
            { type: "info", label: "Fecha creada", infoValue: () => createdAt ?? null },
          ],
        },
        {
          id: "route",
          title: "Ruta",
          description: "Captura únicamente las direcciones operativas de recolección y entrega.",
          fields: [
            {
              name: "pickupAddress",
              type: "textarea",
              label: "Dirección de pickup",
              placeholder: "Dirección completa de pickup",
            },
            {
              name: "deliveryAddress",
              type: "textarea",
              label: "Dirección de entrega",
              placeholder: "Dirección completa de entrega",
            },
          ],
        },
        {
          id: "dates",
          title: "Detalles de cotización",
          description: "Captura las fechas comerciales necesarias para el seguimiento.",
          fields: [
            {
              name: "requiredQuoteDate",
              type: "date",
              label: "Fecha en que requieren la cotización",
            },
          ],
        },
      ],
    }),
    [clientName, createdAt, description, destination, incotermCode, operationType, origin, serviceType, title, transportType]
  )

  return (
    <PriorityFormEngine
      schemaDefinition={schemaDefinition}
      values={values}
      loading={loading}
      disabled={disabled}
      submitLabel={submitLabel}
      onSubmit={onSubmit}
      onFieldChange={(field, value) => onChange(field as keyof QuotationFormValues, String(value ?? ""))}
    />
  )
}
