"use client"

import type { ReactNode } from "react"
import type { ServiceTransportType } from "@/lib/db"

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
    <section className="space-y-4 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
      <div>
        <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[#6B7280]">{description}</p> : null}
      </div>

      <FormSection
        title="Tipo de servicio y transporte"
        description="Selecciona una combinacion valida desde Master Data."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <select
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            value={values.serviceType}
            onChange={(event) => {
              onChange("serviceType", event.target.value)
              onChange("serviceTransportTypeId", "")
            }}
            disabled={disabled}
          >
            <option value="">Tipo de servicio</option>
            {uniqueServiceTypes.map((serviceType) => (
              <option key={serviceType} value={serviceType}>
                {serviceType}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            value={values.serviceTransportTypeId}
            onChange={(event) => onChange("serviceTransportTypeId", event.target.value)}
            disabled={disabled || !values.serviceType}
          >
            <option value="">Tipo de transporte</option>
            {filteredTransportTypes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.transport_type}
              </option>
            ))}
          </select>
        </div>
      </FormSection>

      <FormSection
        title="Terminos y condiciones"
        description="Informacion comercial especifica para ese servicio."
      >
        <textarea
          className="min-h-[140px] w-full rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          placeholder="Terminos y condiciones de la cotizacion"
          value={values.termsAndConditions}
          onChange={(event) => onChange("termsAndConditions", event.target.value)}
          disabled={disabled}
        />
      </FormSection>

      {onSubmit ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled || loading || !values.serviceTransportTypeId}
            className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Working..." : submitLabel}
          </button>
        </div>
      ) : null}
    </section>
  )
}
