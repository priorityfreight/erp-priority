"use client"

import { useState, type ReactNode } from "react"
import { UnlocodeLookupField } from "./UnlocodeLookupField"

export type ProviderFormValues = {
  name: string
  taxId: string
  status: string
  providerType: string
  corporatePhone: string
  companyEmail: string
  website: string
  fullAddress: string
  postalCode: string
  city: string
  cityUnlocode: string
  country: string
  creditActive: string
  creditAmount: string
  creditDays: string
}

type ProviderFormProps = {
  title: string
  description?: string
  values: ProviderFormValues
  onChange: (field: keyof ProviderFormValues, value: string) => void
  onSubmit?: () => void
  submitLabel?: string
  loading?: boolean
  disabled?: boolean
  showStatus?: boolean
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

const providerTypeOptions = [
  "Paqueteria",
  "Coloader",
  "Agente",
  "Broker",
  "Transportista",
  "Consolidadora",
  "Naviera",
  "Aerolinea",
]

export function ProviderForm({
  title,
  description,
  values,
  onChange,
  onSubmit,
  submitLabel = "Guardar",
  loading = false,
  disabled = false,
  showStatus = true,
}: ProviderFormProps) {
  const [locationQuery, setLocationQuery] = useState("")

  return (
    <section className="space-y-4 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
      <div>
        <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[#6B7280]">{description}</p> : null}
      </div>

      <FormSection
        title="Informacion de la empresa"
        description="Datos base del proveedor y su estatus comercial."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <input
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            placeholder="Nombre *"
            value={values.name}
            onChange={(event) => onChange("name", event.target.value)}
            disabled={disabled}
          />
          <input
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            placeholder="RFC"
            value={values.taxId}
            onChange={(event) => onChange("taxId", event.target.value)}
            disabled={disabled}
          />
          <select
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            value={values.providerType}
            onChange={(event) => onChange("providerType", event.target.value)}
            disabled={disabled}
          >
            <option value="">Tipo de proveedor</option>
            {providerTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {showStatus ? (
            <select
              className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              value={values.status}
              onChange={(event) => onChange("status", event.target.value)}
              disabled={disabled}
            >
              <option value="en_proceso_de_alta">En proceso de alta</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          ) : null}
        </div>
      </FormSection>

      <FormSection
        title="Informacion de contacto"
        description="Canales corporativos principales del proveedor."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <input
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            placeholder="Telefono corporativo"
            value={values.corporatePhone}
            onChange={(event) => onChange("corporatePhone", event.target.value)}
            disabled={disabled}
          />
          <input
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            placeholder="Correo de la empresa"
            value={values.companyEmail}
            onChange={(event) => onChange("companyEmail", event.target.value)}
            disabled={disabled}
          />
          <input
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            placeholder="Pagina web"
            value={values.website}
            onChange={(event) => onChange("website", event.target.value)}
            disabled={disabled}
          />
        </div>
      </FormSection>

      <FormSection
        title="Ubicacion de la empresa"
        description="Selecciona el UN/LOCODE para estandarizar ciudad y pais."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <textarea
            className="min-h-[92px] rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] md:col-span-2 xl:col-span-2"
            placeholder="Direccion"
            value={values.fullAddress}
            onChange={(event) => onChange("fullAddress", event.target.value)}
            disabled={disabled}
          />
          <input
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            placeholder="Codigo postal"
            value={values.postalCode}
            onChange={(event) => onChange("postalCode", event.target.value)}
            disabled={disabled}
          />
          <div className="space-y-2 md:col-span-2 xl:col-span-3">
            <UnlocodeLookupField
              label="UN/LOCODE"
              query={locationQuery}
              selectedCode={values.cityUnlocode}
              displayValue={values.city || ""}
              disabled={disabled}
              placeholder="Buscar UN/LOCODE"
              onQueryChange={setLocationQuery}
              onClear={() => {
                setLocationQuery("")
                onChange("city", "")
                onChange("cityUnlocode", "")
                onChange("country", "")
              }}
              onSelect={(city) => {
                const label = city.subdivision_code ? `${city.name}, ${city.subdivision_code}` : city.name
                setLocationQuery(`${city.unlocode} · ${label}`)
                onChange("city", label)
                onChange("cityUnlocode", city.unlocode)
                onChange("country", city.country_name)
              }}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Ciudad calculada
                </div>
                <div className="mt-1 text-sm font-medium text-[#111827]">
                  {values.city || "Selecciona un UN/LOCODE"}
                </div>
              </div>
              <div className="rounded-md border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Pais calculado
                </div>
                <div className="mt-1 text-sm font-medium text-[#111827]">
                  {values.country || "Selecciona un UN/LOCODE"}
                </div>
              </div>
            </div>
            {values.cityUnlocode ? (
              <div className="text-xs font-medium uppercase tracking-wide text-[#2563EB]">
                UN/LOCODE seleccionado: {values.cityUnlocode}
              </div>
            ) : null}
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Credito y cobranza"
        description="Condiciones comerciales de credito autorizadas por el proveedor."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <select
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            value={values.creditActive}
            onChange={(event) => onChange("creditActive", event.target.value)}
            disabled={disabled}
          >
            <option value="no">Credito activo: No</option>
            <option value="si">Credito activo: Si</option>
          </select>
          <input
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            placeholder="Monto de credito"
            value={values.creditAmount}
            onChange={(event) => onChange("creditAmount", event.target.value)}
            disabled={disabled}
          />
          <input
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            placeholder="Dias de credito"
            value={values.creditDays}
            onChange={(event) => onChange("creditDays", event.target.value)}
            disabled={disabled}
          />
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
