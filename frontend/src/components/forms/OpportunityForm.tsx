"use client"

import { useEffect, useState } from "react"
import type {
  Client,
  Incoterm,
  ServiceTransportType,
  User,
} from "@/lib/db"
import { Button } from "@/components/ui/button"
import {
  PriorityFormHeader,
  PriorityFormField,
  PriorityFormGrid,
  PriorityFormSection,
  PriorityInfoField,
  PriorityInput,
  PrioritySelectField,
  PrioritySubmitBar,
  PriorityTextarea,
} from "@/components/priority/PriorityForm"
import { PrioritySectionAlert } from "@/components/priority/PrioritySectionAlert"
import { PriorityTypography } from "@/components/priority/PriorityTypography"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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

  const availableServiceTypes = Array.from(
    new Set(serviceTransportTypes.map((item) => item.service_type))
  ).sort((left, right) => left.localeCompare(right))

  const availableTransportTypes = serviceTransportTypes
    .filter((item) => item.service_type === values.serviceType)
    .map((item) => item.transport_type)

  useEffect(() => {
    if (!values.transportType) {
      return
    }

    if (!availableTransportTypes.includes(values.transportType)) {
      onChange("transportType", "")
    }
  }, [availableTransportTypes, onChange, values.transportType])

  const expectedProfit = Number(values.expectedProfitUsd || 0)
  const quantity = Number(values.serviceQuantity || 0)
  const estimatedValue =
    Number.isFinite(expectedProfit) && Number.isFinite(quantity)
      ? expectedProfit * quantity
      : 0

  return (
    <section className="space-y-5 rounded-[28px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(245,247,250,0.96)_100%)] p-5 shadow-[0_28px_60px_-44px_rgba(3,10,24,0.42)]">
      <PriorityFormHeader title={title} description={description} />

      <PriorityFormSection
        title="Informacion de la oportunidad"
        description="Relaciona cliente, servicio, transporte y la ruta estandarizada."
      >
        <PriorityFormGrid>
          <PriorityFormField label="Cliente">
            <PrioritySelectField
              value={values.clientId}
              onValueChange={(value) => onChange("clientId", value)}
              placeholder="Selecciona un cliente"
              disabled={disabled}
              options={clients.map((client) => ({
                value: client.id,
                label: client.company_name,
              }))}
            />
          </PriorityFormField>
          <PriorityFormField label="Usuario responsable">
            <PrioritySelectField
              value={values.salespersonId}
              onValueChange={(value) => onChange("salespersonId", value)}
              placeholder="Selecciona un responsable"
              disabled={disabled}
              options={users.map((user) => ({
                value: user.id,
                label: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email,
              }))}
            />
          </PriorityFormField>
          <PriorityFormField label="Tipo de servicio">
            <PrioritySelectField
              value={values.serviceType}
              onValueChange={(value) => onChange("serviceType", value)}
              placeholder="Selecciona un tipo de servicio"
              disabled={disabled}
              options={availableServiceTypes.map((serviceType) => ({
                value: serviceType,
                label: serviceType,
              }))}
            />
          </PriorityFormField>
          <PriorityFormField label="Tipo de transporte">
            <PrioritySelectField
              value={values.transportType}
              onValueChange={(value) => onChange("transportType", value)}
              placeholder="Selecciona un tipo de transporte"
              disabled={disabled || !values.serviceType}
              options={availableTransportTypes.map((transportType) => ({
                value: transportType,
                label: transportType,
              }))}
            />
          </PriorityFormField>
          <PriorityFormField label="Tipo de operacion">
            <div className="space-y-3">
              <ToggleGroup
                type="single"
                value={values.operationType}
                onValueChange={(value) => {
                  if (value) {
                    onChange("operationType", value)
                  }
                }}
                className="w-full justify-start"
              >
                <ToggleGroupItem value="Import" className="min-w-[120px]">
                  Import
                </ToggleGroupItem>
                <ToggleGroupItem value="Export" className="min-w-[120px]">
                  Export
                </ToggleGroupItem>
              </ToggleGroup>
              <PriorityTypography variant="caption">
                Define si la oportunidad nace como importacion o exportacion.
              </PriorityTypography>
            </div>
          </PriorityFormField>
          <PriorityFormField label="Incoterm">
            <PrioritySelectField
              value={values.incotermId}
              onValueChange={(value) => onChange("incotermId", value)}
              placeholder="Selecciona un incoterm"
              disabled={disabled}
              options={incoterms.map((incoterm) => ({
                value: incoterm.id,
                label: incoterm.code,
              }))}
            />
          </PriorityFormField>

          <div className="md:col-span-2 xl:col-span-3 grid gap-3 lg:grid-cols-2">
            <UnlocodeLookupField
              label="Origen"
              query={originQuery}
              displayValue={values.origin}
              selectedCode={values.originUnlocode}
              disabled={disabled}
              onQueryChange={(value) => setOriginQuery(value)}
              onClear={() => {
                setOriginQuery("")
                onChange("origin", "")
                onChange("originUnlocode", "")
              }}
              onSelect={(record) => {
                const label = record.subdivision_code
                  ? `${record.name}, ${record.subdivision_code}`
                  : record.name
                setOriginQuery(`${record.unlocode} · ${label}`)
                onChange("origin", label)
                onChange("originUnlocode", record.unlocode)
              }}
            />
            <UnlocodeLookupField
              label="Destino"
              query={destinationQuery}
              displayValue={values.destination}
              selectedCode={values.destinationUnlocode}
              disabled={disabled}
              onQueryChange={(value) => setDestinationQuery(value)}
              onClear={() => {
                setDestinationQuery("")
                onChange("destination", "")
                onChange("destinationUnlocode", "")
              }}
              onSelect={(record) => {
                const label = record.subdivision_code
                  ? `${record.name}, ${record.subdivision_code}`
                  : record.name
                setDestinationQuery(`${record.unlocode} · ${label}`)
                onChange("destination", label)
                onChange("destinationUnlocode", record.unlocode)
              }}
            />
          </div>
        </PriorityFormGrid>
      </PriorityFormSection>

      <PriorityFormSection
        title="Desglose de oportunidad"
        description="Captura la expectativa económica y el volumen mensual estimado."
      >
        <PriorityFormGrid>
          <PriorityFormField label="Profit esperado (USD)">
            <PriorityInput
              placeholder="Profit esperado (USD)"
              value={values.expectedProfitUsd}
              onChange={(event) => onChange("expectedProfitUsd", event.target.value)}
              disabled={disabled}
            />
          </PriorityFormField>
          <PriorityFormField label="Cantidad mensual aproximada">
            <PriorityInput
              placeholder="Cantidad mensual aproximada"
              value={values.serviceQuantity}
              onChange={(event) => onChange("serviceQuantity", event.target.value)}
              disabled={disabled}
            />
          </PriorityFormField>
          <PriorityInfoField
            label="Valor estimado"
            value={
              Number.isFinite(estimatedValue)
                ? `$${estimatedValue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : "No disponible"
            }
          />
          <PriorityFormField
            label="Notas internas"
            description="Resumen comercial y operativo para el equipo interno."
            className="md:col-span-2 xl:col-span-3"
          >
            <PriorityTextarea
              placeholder="Notas internas de la oportunidad"
              value={values.description}
              onChange={(event) => onChange("description", event.target.value)}
              disabled={disabled}
            />
          </PriorityFormField>
        </PriorityFormGrid>
      </PriorityFormSection>

      <PrioritySectionAlert title="Valor calculado" variant="info">
        El valor estimado se calcula como profit esperado por cantidad mensual aproximada y sirve como referencia comercial inicial.
      </PrioritySectionAlert>

      {values.originUnlocode && values.destinationUnlocode ? (
        <PrioritySectionAlert title="Ruta normalizada" variant="success">
          La oportunidad ya tiene origen y destino estandarizados por UN/LOCODE, lo que reduce errores operativos posteriores.
        </PrioritySectionAlert>
      ) : null}

      <PriorityFormSection
        title="Fechas"
        description="Estas fechas se calculan y controlan desde el backend canónico."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <PriorityInfoField label="Fecha creada" value={formatDate(createdAt)} />
          <PriorityInfoField label="Fecha de inicio" value={formatDate(startDate)} />
          <PriorityInfoField label="Fecha de vencimiento" value={formatDate(expirationDate)} />
        </div>
      </PriorityFormSection>

      {onSubmit ? (
        <PrioritySubmitBar>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={disabled || loading}
          >
            {loading ? "Guardando..." : submitLabel}
          </Button>
        </PrioritySubmitBar>
      ) : null}
    </section>
  )
}
