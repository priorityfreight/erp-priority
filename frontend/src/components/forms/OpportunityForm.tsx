"use client"

import { useEffect, useState, type ReactNode } from "react"
import type {
  Client,
  Incoterm,
  ServiceTransportType,
  User,
} from "@/lib/db"
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

function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-4 rounded-xl border border-[#E5E7EB] bg-white p-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#334155]">{title}</h3>
        {description ? <p className="mt-1 text-sm text-[#64748B]">{description}</p> : null}
      </div>
      {children}
    </section>
  )
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
    <section className="space-y-4 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
      <div>
        <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[#6B7280]">{description}</p> : null}
      </div>

      <FormSection
        title="Informacion de la oportunidad"
        description="Relaciona cliente, servicio, transporte y la ruta estandarizada."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <select
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            value={values.clientId}
            onChange={(event) => onChange("clientId", event.target.value)}
            disabled={disabled}
          >
            <option value="">Cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.company_name}
              </option>
            ))}
          </select>

          <select
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            value={values.salespersonId}
            onChange={(event) => onChange("salespersonId", event.target.value)}
            disabled={disabled}
          >
            <option value="">Usuario responsable</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {[user.first_name, user.last_name].filter(Boolean).join(" ") || user.email}
              </option>
            ))}
          </select>

          <select
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            value={values.serviceType}
            onChange={(event) => onChange("serviceType", event.target.value)}
            disabled={disabled}
          >
            <option value="">Tipo de servicio</option>
            {availableServiceTypes.map((serviceType) => (
              <option key={serviceType} value={serviceType}>
                {serviceType}
              </option>
            ))}
          </select>

          <select
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] disabled:cursor-not-allowed disabled:bg-[#F3F4F6]"
            value={values.transportType}
            onChange={(event) => onChange("transportType", event.target.value)}
            disabled={disabled || !values.serviceType}
          >
            <option value="">Tipo de transporte</option>
            {availableTransportTypes.map((transportType) => (
              <option key={transportType} value={transportType}>
                {transportType}
              </option>
            ))}
          </select>

          <select
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            value={values.operationType}
            onChange={(event) => onChange("operationType", event.target.value)}
            disabled={disabled}
          >
            <option value="">Tipo de operacion</option>
            <option value="Import">Import</option>
            <option value="Export">Export</option>
          </select>

          <select
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            value={values.incotermId}
            onChange={(event) => onChange("incotermId", event.target.value)}
            disabled={disabled}
          >
            <option value="">Incoterm</option>
            {incoterms.map((incoterm) => (
              <option key={incoterm.id} value={incoterm.id}>
                {incoterm.code}
              </option>
            ))}
          </select>

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
        </div>
      </FormSection>

      <FormSection
        title="Desglose de oportunidad"
        description="Captura la expectativa económica y el volumen mensual estimado."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <input
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            placeholder="Profit esperado (USD)"
            value={values.expectedProfitUsd}
            onChange={(event) => onChange("expectedProfitUsd", event.target.value)}
            disabled={disabled}
          />
          <input
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            placeholder="Cantidad mensual aproximada"
            value={values.serviceQuantity}
            onChange={(event) => onChange("serviceQuantity", event.target.value)}
            disabled={disabled}
          />
          <div className="rounded-md border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
              Estimated value
            </div>
            <div className="mt-1 text-sm font-medium text-[#111827]">
              {Number.isFinite(estimatedValue)
                ? `$${estimatedValue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : "No disponible"}
            </div>
          </div>
          <textarea
            className="min-h-[96px] rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] md:col-span-2 xl:col-span-3"
            placeholder="Notas internas de la oportunidad"
            value={values.description}
            onChange={(event) => onChange("description", event.target.value)}
            disabled={disabled}
          />
        </div>
      </FormSection>

      <FormSection
        title="Fechas"
        description="Estas fechas se calculan y controlan desde el backend canónico."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
              Fecha creada
            </div>
            <div className="mt-1 text-sm font-medium text-[#111827]">
              {formatDate(createdAt)}
            </div>
          </div>
          <div className="rounded-md border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
              Fecha de inicio
            </div>
            <div className="mt-1 text-sm font-medium text-[#111827]">
              {formatDate(startDate)}
            </div>
          </div>
          <div className="rounded-md border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
              Fecha de vencimiento
            </div>
            <div className="mt-1 text-sm font-medium text-[#111827]">
              {formatDate(expirationDate)}
            </div>
          </div>
        </div>
      </FormSection>

      {onSubmit ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled || loading}
            className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Working..." : submitLabel}
          </button>
        </div>
      ) : null}
    </section>
  )
}
