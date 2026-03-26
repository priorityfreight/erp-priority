"use client"

import type { ReactNode } from "react"

export type QuotationFormValues = {
  pickupAddress: string
  deliveryAddress: string
  requiredQuoteDate: string
  purchaseValidUntil: string
  salesValidUntil: string
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

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">{label}</div>
      <div className="mt-1 text-sm font-medium text-[#111827]">{value || "No disponible"}</div>
    </div>
  )
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
    <section className="space-y-4 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
      <div>
        <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[#6B7280]">{description}</p> : null}
      </div>

      <FormSection
        title="Informacion de la cotizacion"
        description="Esta informacion se arrastra desde la oportunidad comercial."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InfoField label="Cliente" value={clientName} />
          <InfoField label="Tipo de servicio" value={serviceType} />
          <InfoField label="Tipo de transporte" value={transportType} />
          <InfoField label="Tipo de operacion" value={operationType} />
          <InfoField label="Incoterm" value={incotermCode} />
          <InfoField label="Origen" value={origin} />
          <InfoField label="Destino" value={destination} />
          <InfoField label="Fecha creada" value={createdAt} />
        </div>
      </FormSection>

      <FormSection title="Ruta" description="Captura unicamente las direcciones operativas de recoleccion y entrega.">
        <div className="grid gap-3 md:grid-cols-2">
          <textarea
            className="min-h-[120px] rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            value={values.pickupAddress}
            onChange={(event) => onChange("pickupAddress", event.target.value)}
            placeholder="Direccion completa de pickup"
            disabled={disabled}
          />
          <textarea
            className="min-h-[120px] rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            value={values.deliveryAddress}
            onChange={(event) => onChange("deliveryAddress", event.target.value)}
            placeholder="Direccion completa de entrega"
            disabled={disabled}
          />
        </div>
      </FormSection>

      <FormSection
        title="Detalles de cotizacion"
        description="Captura las fechas comerciales necesarias para el seguimiento."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <input
            type="date"
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            value={values.requiredQuoteDate}
            onChange={(event) => onChange("requiredQuoteDate", event.target.value)}
            disabled={disabled}
          />
          <input
            type="date"
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            value={values.purchaseValidUntil}
            onChange={(event) => onChange("purchaseValidUntil", event.target.value)}
            disabled={disabled}
          />
          <input
            type="date"
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            value={values.salesValidUntil}
            onChange={(event) => onChange("salesValidUntil", event.target.value)}
            disabled={disabled}
          />
        </div>
      </FormSection>

      {onSubmit ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading || disabled}
            className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Guardando..." : submitLabel}
          </button>
        </div>
      ) : null}
    </section>
  )
}
