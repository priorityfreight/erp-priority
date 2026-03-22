"use client"

import type { ReactNode } from "react"
import {
  isValidEmail,
  isValidLinkedInUrl,
  normalizeWhatsAppLink,
} from "./ContactForm"

export type ProviderContactFormValues = {
  name: string
  email: string
  phone: string
  linkedinUrl: string
  position: string
  status: string
}

type ProviderContactFormProps = {
  title: string
  description?: string
  values: ProviderContactFormValues
  onChange: (field: keyof ProviderContactFormValues, value: string) => void
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

export function ProviderContactForm({
  title,
  description,
  values,
  onChange,
  onSubmit,
  submitLabel = "Guardar",
  loading = false,
  disabled = false,
}: ProviderContactFormProps) {
  const whatsappLink = normalizeWhatsAppLink(values.phone)
  const emailValid = isValidEmail(values.email)
  const linkedinValid = isValidLinkedInUrl(values.linkedinUrl)

  return (
    <section className="space-y-4 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
      <div>
        <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[#6B7280]">{description}</p> : null}
      </div>

      <FormSection
        title="Informacion del contacto"
        description="Datos base del contacto del proveedor."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <input
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            placeholder="Nombre del contacto *"
            value={values.name}
            onChange={(event) => onChange("name", event.target.value)}
            disabled={disabled}
          />
          <input
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            placeholder="Puesto"
            value={values.position}
            onChange={(event) => onChange("position", event.target.value)}
            disabled={disabled}
          />
          <select
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            value={values.status}
            onChange={(event) => onChange("status", event.target.value)}
            disabled={disabled}
          >
            <option value="activo">Activo</option>
            <option value="ya_no_trabaja">Ya no trabaja</option>
          </select>
        </div>
      </FormSection>

      <FormSection
        title="Canales directos"
        description="Valida el formato de correo y habilita accesos directos."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <input
              className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              placeholder="Telefono"
              value={values.phone}
              onChange={(event) => onChange("phone", event.target.value)}
              disabled={disabled}
            />
            <div className="text-xs text-[#6B7280]">
              {whatsappLink ? "Se puede abrir directo en WhatsApp." : "Sin enlace de WhatsApp."}
            </div>
          </div>
          <div className="space-y-2">
            <input
              className={`rounded-md border bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] ${
                linkedinValid ? "border-[#D1D5DB]" : "border-[#FCA5A5]"
              }`}
              placeholder="LinkedIn URL"
              value={values.linkedinUrl}
              onChange={(event) => onChange("linkedinUrl", event.target.value)}
              disabled={disabled}
            />
            <div className={`text-xs ${linkedinValid ? "text-[#6B7280]" : "text-[#B91C1C]"}`}>
              {linkedinValid ? "Usa una URL valida de linkedin.com." : "La URL debe pertenecer a linkedin.com."}
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <input
              className={`rounded-md border bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] ${
                emailValid ? "border-[#D1D5DB]" : "border-[#FCA5A5]"
              }`}
              placeholder="Correo"
              value={values.email}
              onChange={(event) => onChange("email", event.target.value)}
              disabled={disabled}
            />
            <div className={`text-xs ${emailValid ? "text-[#6B7280]" : "text-[#B91C1C]"}`}>
              {emailValid
                ? "Validacion de formato solamente. La existencia real requiere verificacion externa."
                : "El correo no tiene un formato valido."}
            </div>
          </div>
        </div>
      </FormSection>

      {onSubmit ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled || loading || !emailValid || !linkedinValid}
            className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Working..." : submitLabel}
          </button>
        </div>
      ) : null}
    </section>
  )
}
