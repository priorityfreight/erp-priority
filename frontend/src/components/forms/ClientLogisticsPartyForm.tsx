"use client"

import { useState, type ReactNode } from "react"
import { isValidEmail, normalizeWhatsAppLink } from "./ContactForm"
import { UnlocodeLookupField } from "./UnlocodeLookupField"

export type ClientLogisticsPartyFormValues = {
  partyType: string
  name: string
  fullAddress: string
  postalCode: string
  city: string
  country: string
  cityUnlocode: string
  contactName: string
  contactEmail: string
  contactPhone: string
}

type ClientLogisticsPartyFormProps = {
  title: string
  description?: string
  values: ClientLogisticsPartyFormValues
  onChange: (field: keyof ClientLogisticsPartyFormValues, value: string) => void
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

export function ClientLogisticsPartyForm({
  title,
  description,
  values,
  onChange,
  onSubmit,
  submitLabel = "Guardar",
  loading = false,
  disabled = false,
}: ClientLogisticsPartyFormProps) {
  const [locationQuery, setLocationQuery] = useState("")
  const emailValid = isValidEmail(values.contactEmail)
  const whatsappLink = normalizeWhatsAppLink(values.contactPhone)

  return (
    <section className="space-y-4 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
      <div>
        <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[#6B7280]">{description}</p> : null}
      </div>

      <FormSection
        title="Informacion del registro"
        description="Define el tipo de registro logistico y el nombre operativo."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <select
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            value={values.partyType}
            onChange={(event) => onChange("partyType", event.target.value)}
            disabled={disabled}
          >
            <option value="shipper">Shipper</option>
            <option value="consignee">Consignee</option>
            <option value="aa">AA</option>
          </select>
          <input
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            placeholder="Nombre *"
            value={values.name}
            onChange={(event) => onChange("name", event.target.value)}
            disabled={disabled}
          />
        </div>
      </FormSection>

      <FormSection
        title="Ubicacion"
        description="Selecciona un UN/LOCODE para estandarizar ciudad y pais."
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
                onChange("country", "")
                onChange("cityUnlocode", "")
              }}
              onSelect={(record) => {
                const label = record.subdivision_code
                  ? `${record.name}, ${record.subdivision_code}`
                  : record.name
                setLocationQuery(`${record.unlocode} · ${label}`)
                onChange("city", label)
                onChange("country", record.country_name)
                onChange("cityUnlocode", record.unlocode)
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
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Contacto asociado"
        description="Persona y canales principales del registro."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            placeholder="Nombre del contacto"
            value={values.contactName}
            onChange={(event) => onChange("contactName", event.target.value)}
            disabled={disabled}
          />
          <div className="space-y-2">
            <input
              className={`rounded-md border bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] ${
                emailValid ? "border-[#D1D5DB]" : "border-[#FCA5A5]"
              }`}
              placeholder="Correo del contacto"
              value={values.contactEmail}
              onChange={(event) => onChange("contactEmail", event.target.value)}
              disabled={disabled}
            />
            <div className={`text-xs ${emailValid ? "text-[#6B7280]" : "text-[#B91C1C]"}`}>
              {emailValid
                ? "Validacion de formato solamente."
                : "El correo no tiene un formato valido."}
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <input
              className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              placeholder="Numero de contacto"
              value={values.contactPhone}
              onChange={(event) => onChange("contactPhone", event.target.value)}
              disabled={disabled}
            />
            <div className="text-xs text-[#6B7280]">
              {whatsappLink ? "Se puede abrir directo en WhatsApp." : "Sin enlace de WhatsApp."}
            </div>
          </div>
        </div>
      </FormSection>

      {onSubmit ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled || loading || !emailValid}
            className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Working..." : submitLabel}
          </button>
        </div>
      ) : null}
    </section>
  )
}
