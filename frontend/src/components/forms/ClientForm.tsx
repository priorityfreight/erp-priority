"use client"

import { useState, type ReactNode } from "react"
import type { User } from "@/lib/db"
import { UnlocodeLookupField } from "./UnlocodeLookupField"

type ClientFormValues = {
  companyName: string
  taxId: string
  status: string
  accountOwnerId: string
  industry: string
  country: string
  website: string
  corporatePhone: string
  fullAddress: string
  postalCode: string
  city: string
  cityUnlocode: string
}

type ClientFormProps = {
  title: string
  description?: string
  values: ClientFormValues
  users?: User[]
  onChange: (field: keyof ClientFormValues, value: string) => void
  onSubmit?: () => void
  submitLabel?: string
  loading?: boolean
  disabled?: boolean
  submitNote?: string
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
        {description ? (
          <p className="mt-1 text-sm text-[#64748B]">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

export function ClientForm({
  title,
  description,
  values,
  users = [],
  onChange,
  onSubmit,
  submitLabel = "Save",
  loading = false,
  disabled = false,
  submitNote,
}: ClientFormProps) {
  const [locationQuery, setLocationQuery] = useState("")

  return (
    <section className="space-y-4 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
      <div>
        <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-[#6B7280]">{description}</p>
        ) : null}
      </div>

      <FormSection
        title="Informacion de la empresa"
        description="Captura los datos base de identificacion comercial."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <input
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] disabled:cursor-not-allowed disabled:bg-[#F3F4F6]"
            placeholder="Nombre *"
            value={values.companyName}
            onChange={(event) => onChange("companyName", event.target.value)}
            disabled={disabled}
          />
          <input
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] disabled:cursor-not-allowed disabled:bg-[#F3F4F6]"
            placeholder="RFC"
            value={values.taxId}
            onChange={(event) => onChange("taxId", event.target.value)}
            disabled={disabled}
          />
          <input
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] disabled:cursor-not-allowed disabled:bg-[#F3F4F6]"
            placeholder="Industria"
            value={values.industry}
            onChange={(event) => onChange("industry", event.target.value)}
            disabled={disabled}
          />
          <select
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            value={values.accountOwnerId}
            onChange={(event) => onChange("accountOwnerId", event.target.value)}
            disabled={disabled}
          >
            <option value="">Vendedor dueno de cuenta</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {[user.first_name, user.last_name].filter(Boolean).join(" ") || user.email}
              </option>
            ))}
          </select>
        </div>
      </FormSection>

      <FormSection
        title="Ubicacion de la empresa"
        description="Selecciona el UN/LOCODE para estandarizar ciudad y pais automaticamente."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <textarea
            className="min-h-[92px] rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] disabled:cursor-not-allowed disabled:bg-[#F3F4F6] md:col-span-2 xl:col-span-2"
            placeholder="Direccion completa"
            value={values.fullAddress}
            onChange={(event) => onChange("fullAddress", event.target.value)}
            disabled={disabled}
          />
          <input
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] disabled:cursor-not-allowed disabled:bg-[#F3F4F6]"
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
        title="Informacion de contacto"
        description="Datos de contacto principales de la empresa."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] disabled:cursor-not-allowed disabled:bg-[#F3F4F6]"
            placeholder="Pagina web *"
            value={values.website}
            onChange={(event) => onChange("website", event.target.value)}
            disabled={disabled}
          />
          <input
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] disabled:cursor-not-allowed disabled:bg-[#F3F4F6]"
            placeholder="Telefono corporativo *"
            value={values.corporatePhone}
            onChange={(event) => onChange("corporatePhone", event.target.value)}
            disabled={disabled}
          />
        </div>
      </FormSection>

      {submitNote ? <div className="text-xs text-[#6B7280]">{submitNote}</div> : null}

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
