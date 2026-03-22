"use client"

import type { ReactNode } from "react"
import type { Client } from "@/lib/db"

export type ContactFormValues = {
  clientId: string
  name: string
  position: string
  phone: string
  linkedinUrl: string
  email: string
  status: string
}

type ContactFormProps = {
  title: string
  description?: string
  values: ContactFormValues
  clients: Client[]
  onChange: (field: keyof ContactFormValues, value: string) => void
  onSubmit?: () => void
  submitLabel?: string
  loading?: boolean
  disabled?: boolean
  createdAt?: string | null
  updatedAt?: string | null
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function normalizeWhatsAppLink(value: string) {
  const digits = value.replace(/[^\d]/g, "")
  if (!digits) {
    return null
  }

  let normalized = digits

  if (normalized.startsWith("00")) {
    normalized = normalized.slice(2)
  }

  // Default local 10-digit numbers to Mexico's country code so WhatsApp
  // links work even when the user captures a national-format phone number.
  if (normalized.length === 10) {
    normalized = `52${normalized}`
  }

  // Older Mexico WhatsApp patterns sometimes include an extra mobile "1".
  if (normalized.startsWith("521") && normalized.length === 13) {
    normalized = `52${normalized.slice(3)}`
  }

  if (normalized.length < 12) {
    return null
  }

  return `https://api.whatsapp.com/send?phone=${normalized}`
}

export function isValidEmail(value: string) {
  if (!value.trim()) {
    return true
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function isValidLinkedInUrl(value: string) {
  if (!value.trim()) {
    return true
  }

  try {
    const url = new URL(value.trim())
    return url.hostname.includes("linkedin.com")
  } catch {
    return false
  }
}

export function ContactForm({
  title,
  description,
  values,
  clients,
  onChange,
  onSubmit,
  submitLabel = "Guardar",
  loading = false,
  disabled = false,
  createdAt,
  updatedAt,
}: ContactFormProps) {
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
        description="Datos base del contacto y su relacion con la cuenta."
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
        title="Informacion de contacto"
        description="Canales directos de contacto y enlaces rapidos."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <input
              className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              placeholder="Telefono directo"
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
              {linkedinValid
                ? "Usa una URL valida de linkedin.com."
                : "La URL debe pertenecer a linkedin.com."}
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

      {(createdAt || updatedAt) ? (
        <FormSection
          title="Registro"
          description="Campos automáticos controlados por la base de datos."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                Fecha de creacion
              </div>
              <div className="mt-1 text-sm font-medium text-[#111827]">{formatDate(createdAt)}</div>
            </div>
            <div className="rounded-md border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                Ultima vez actualizado
              </div>
              <div className="mt-1 text-sm font-medium text-[#111827]">{formatDate(updatedAt)}</div>
            </div>
          </div>
        </FormSection>
      ) : null}

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
