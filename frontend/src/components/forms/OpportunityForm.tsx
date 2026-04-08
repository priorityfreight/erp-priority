"use client"

import { useMemo, useState } from "react"
import type { Client, Incoterm, ServiceTransportType, User } from "@/lib/db"
import { PriorityInfoField, PrioritySectionAlert } from "@/components/priority"
import { PriorityFormEngine } from "@/components/priority/forms/PriorityFormEngine"
import type { FormSchemaDefinition } from "@/lib/forms/types"
import { opportunityFormSchema, type OpportunityFormSchemaValues } from "@/features/opportunities/schemas/opportunity-form"
import { UnlocodeLookupField } from "./UnlocodeLookupField"

export type OpportunityFormValues = {
  clientId: string
  salespersonId: string
  serviceType: string
  transportType: string
  operationType: string
  incotermId: string
  origin: string
  originUnlocode: string
  destination: string
  destinationUnlocode: string
  expectedProfitUsd: string
  serviceQuantity: string
  description: string
}

type OpportunityFormProps = {
  title: string
  description?: string
  values: OpportunityFormValues
  clients: Client[]
  users: User[]
  serviceTransportTypes: ServiceTransportType[]
  incoterms: Incoterm[]
  createdAt?: string | null
  startDate?: string | null
  expirationDate?: string | null
  onChange: (field: keyof OpportunityFormValues, value: string) => void
  onSubmit?: () => void
  submitLabel?: string
  loading?: boolean
  disabled?: boolean
}

function formatDate(value?: string | null) {
  if (!value) {
    return "No disponible"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}

export function OpportunityForm({
  title,
  description,
  values,
  clients,
  users,
  serviceTransportTypes,
  incoterms,
  createdAt,
  startDate,
  expirationDate,
  onChange,
  onSubmit,
  submitLabel = "Guardar",
  loading = false,
  disabled = false,
}: OpportunityFormProps) {
  const [originQuery, setOriginQuery] = useState("")
  const [destinationQuery, setDestinationQuery] = useState("")

  const availableServiceTypes = useMemo(
    () => Array.from(new Set(serviceTransportTypes.map((item) => item.service_type))).sort((a, b) => a.localeCompare(b)),
    [serviceTransportTypes]
  )
  const availableTransportTypes = useMemo(
    () => serviceTransportTypes.filter((item) => item.service_type === values.serviceType).map((item) => item.transport_type),
    [serviceTransportTypes, values.serviceType]
  )

  const schemaDefinition = useMemo<FormSchemaDefinition<typeof opportunityFormSchema>>(
    () => ({
      schema: opportunityFormSchema,
      title,
      description,
      sections: [
        {
          id: "opportunity",
          title: "Información de la oportunidad",
          description: "Relaciona cliente, servicio, transporte y la ruta estandarizada.",
          columnsClassName: "xl:grid-cols-3",
          fields: [
            {
              name: "clientId",
              type: "select",
              label: "Cliente",
              placeholder: "Selecciona un cliente",
              required: true,
              options: clients.map((client) => ({ value: client.id, label: client.company_name })),
            },
            {
              name: "salespersonId",
              type: "select",
              label: "Usuario responsable",
              placeholder: "Selecciona un responsable",
              required: true,
              options: users.map((user) => ({
                value: user.id,
                label: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email,
              })),
            },
            {
              name: "serviceType",
              type: "select",
              label: "Tipo de servicio",
              placeholder: "Selecciona un tipo de servicio",
              required: true,
              options: availableServiceTypes.map((serviceType) => ({ value: serviceType, label: serviceType })),
            },
            {
              name: "transportType",
              type: "select",
              label: "Tipo de transporte",
              placeholder: "Selecciona un tipo de transporte",
              options: availableTransportTypes.map((transportType) => ({ value: transportType, label: transportType })),
            },
            {
              name: "operationType",
              type: "toggle-group",
              label: "Tipo de operación",
              helperText: "Define si la oportunidad nace como importación o exportación.",
              required: true,
              options: [
                { value: "Import", label: "Importación" },
                { value: "Export", label: "Exportación" },
              ],
            },
            {
              name: "incotermId",
              type: "select",
              label: "Incoterm",
              placeholder: "Selecciona un incoterm",
              options: incoterms.map((incoterm) => ({
                value: incoterm.id,
                label: incoterm.code,
              })),
            },
            {
              type: "custom",
              label: "Ruta",
              className: "md:col-span-2",
              render: ({ form }) => {
                const currentValues = form.getValues()

                return (
                  <div className="grid gap-3">
                    <UnlocodeLookupField
                      label="Origen"
                      query={originQuery}
                      displayValue={currentValues.origin}
                      selectedCode={currentValues.originUnlocode}
                      disabled={disabled}
                      onQueryChange={setOriginQuery}
                      onClear={() => {
                        setOriginQuery("")
                        form.setValue("origin", "")
                        form.setValue("originUnlocode", "")
                      }}
                      onSelect={(record) => {
                        const label = record.subdivision_code ? `${record.name}, ${record.subdivision_code}` : record.name
                        setOriginQuery(`${record.unlocode} · ${label}`)
                        form.setValue("origin", label)
                        form.setValue("originUnlocode", record.unlocode)
                      }}
                    />
                    <UnlocodeLookupField
                      label="Destino"
                      query={destinationQuery}
                      displayValue={currentValues.destination}
                      selectedCode={currentValues.destinationUnlocode}
                      disabled={disabled}
                      onQueryChange={setDestinationQuery}
                      onClear={() => {
                        setDestinationQuery("")
                        form.setValue("destination", "")
                        form.setValue("destinationUnlocode", "")
                      }}
                      onSelect={(record) => {
                        const label = record.subdivision_code ? `${record.name}, ${record.subdivision_code}` : record.name
                        setDestinationQuery(`${record.unlocode} · ${label}`)
                        form.setValue("destination", label)
                        form.setValue("destinationUnlocode", record.unlocode)
                      }}
                    />
                  </div>
                )
              },
            },
          ],
        },
        {
          id: "commercial",
          title: "Contexto comercial",
          description: "Captura la expectativa económica y el volumen mensual estimado.",
          columnsClassName: "xl:grid-cols-3",
          fields: [
            {
              name: "expectedProfitUsd",
              type: "currency",
              label: "Profit esperado (USD)",
              placeholder: "Profit esperado (USD)",
              inputMode: "decimal",
            },
            {
              name: "serviceQuantity",
              type: "number",
              label: "Cantidad mensual aproximada",
              placeholder: "Cantidad mensual aproximada",
              inputMode: "numeric",
            },
            {
              type: "info",
              label: "Valor estimado",
              infoValue: (currentValues) => {
                const expectedProfit = Number(currentValues.expectedProfitUsd || 0)
                const quantity = Number(currentValues.serviceQuantity || 0)
                const estimatedValue =
                  Number.isFinite(expectedProfit) && Number.isFinite(quantity) ? expectedProfit * quantity : 0

                return Number.isFinite(estimatedValue)
                  ? `$${estimatedValue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : "No disponible"
              },
            },
            {
              name: "description",
              type: "textarea",
              label: "Notas internas",
              description: "Resumen comercial y operativo para el equipo interno.",
              className: "md:col-span-2",
              placeholder: "Notas internas de la oportunidad",
            },
          ],
        },
      ],
    }),
    [availableServiceTypes, availableTransportTypes, clients, description, disabled, destinationQuery, incoterms, originQuery, title, users]
  )

  return (
    <PriorityFormEngine
      schemaDefinition={schemaDefinition}
      values={values as unknown as OpportunityFormSchemaValues}
      loading={loading}
      disabled={disabled}
      submitLabel={submitLabel}
      onSubmit={onSubmit}
      onFieldChange={(field, value) => {
        const nextField = field as keyof OpportunityFormValues
        const nextValue = String(value ?? "")
        onChange(nextField, nextValue)
        if (nextField === "serviceType" && values.transportType && !availableTransportTypes.includes(values.transportType)) {
          onChange("transportType", "")
        }
      }}
      afterSections={(currentValues) => (
        <>
          <PrioritySectionAlert title="Valor calculado" variant="info">
            El valor estimado se calcula como profit esperado por cantidad mensual aproximada y sirve como referencia comercial inicial.
          </PrioritySectionAlert>

          {currentValues.originUnlocode && currentValues.destinationUnlocode ? (
            <PrioritySectionAlert title="Ruta normalizada" variant="success">
              La oportunidad ya tiene origen y destino estandarizados por UN/LOCODE, lo que reduce errores operativos posteriores.
            </PrioritySectionAlert>
          ) : null}

          <div className="rounded-[26px] border border-[rgba(144,158,174,0.14)] bg-[rgba(255,255,255,0.94)] p-6 shadow-[0_24px_48px_-42px_rgba(3,10,24,0.28)] md:p-7">
            <div className="mb-6">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#506278]">Fechas</div>
              <div className="mt-2 text-sm text-[#64748B]">Estas fechas se calculan y controlan desde el backend canónico.</div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <PriorityInfoField label="Fecha creada" value={formatDate(createdAt)} />
              <PriorityInfoField label="Fecha de inicio" value={formatDate(startDate)} />
              <PriorityInfoField label="Fecha de vencimiento" value={formatDate(expirationDate)} />
            </div>
          </div>
        </>
      )}
    />
  )
}
