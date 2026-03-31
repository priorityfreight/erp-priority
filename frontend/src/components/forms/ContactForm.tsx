"use client"

import type { Client } from "@/lib/db"
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
} from "@/components/priority/PriorityForm"
import { PrioritySectionAlert } from "@/components/priority/PrioritySectionAlert"
import { PriorityTypography } from "@/components/priority/PriorityTypography"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

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
    <section className="space-y-5 rounded-[28px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(245,247,250,0.96)_100%)] p-5 shadow-[0_28px_60px_-44px_rgba(3,10,24,0.42)]">
      <PriorityFormHeader title={title} description={description} />

      <PriorityFormSection
        title="Informacion del contacto"
        description="Datos base del contacto y su relacion con la cuenta."
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
          <PriorityFormField label="Nombre del contacto">
            <PriorityInput
              placeholder="Nombre del contacto *"
              value={values.name}
              onChange={(event) => onChange("name", event.target.value)}
              disabled={disabled}
            />
          </PriorityFormField>
          <PriorityFormField label="Puesto">
            <PriorityInput
              placeholder="Puesto"
              value={values.position}
              onChange={(event) => onChange("position", event.target.value)}
              disabled={disabled}
            />
          </PriorityFormField>
          <PriorityFormField label="Estatus">
            <div className="space-y-3">
              <ToggleGroup
                type="single"
                value={values.status}
                onValueChange={(value) => {
                  if (value) {
                    onChange("status", value)
                  }
                }}
                className="w-full justify-start"
              >
                <ToggleGroupItem value="activo" className="min-w-[120px]">
                  Activo
                </ToggleGroupItem>
                <ToggleGroupItem value="ya_no_trabaja" className="min-w-[140px]">
                  Ya no trabaja
                </ToggleGroupItem>
              </ToggleGroup>
              <PriorityTypography variant="caption">
                El estatus controla si el contacto debe considerarse para salida comercial activa.
              </PriorityTypography>
            </div>
          </PriorityFormField>
        </PriorityFormGrid>
      </PriorityFormSection>

      <PriorityFormSection
        title="Informacion de contacto"
        description="Canales directos de contacto y enlaces rapidos."
      >
        <PriorityFormGrid className="md:grid-cols-2">
          <PriorityFormField
            label="Telefono directo"
            description={whatsappLink ? "Se puede abrir directo en WhatsApp." : "Sin enlace de WhatsApp."}
          >
            <PriorityInput
              placeholder="Telefono directo"
              value={values.phone}
              onChange={(event) => onChange("phone", event.target.value)}
              disabled={disabled}
            />
          </PriorityFormField>
          <PriorityFormField
            label="LinkedIn URL"
            description={
              linkedinValid
                ? "Usa una URL valida de linkedin.com."
                : "La URL debe pertenecer a linkedin.com."
            }
          >
            <PriorityInput
              aria-invalid={!linkedinValid}
              placeholder="LinkedIn URL"
              value={values.linkedinUrl}
              onChange={(event) => onChange("linkedinUrl", event.target.value)}
              disabled={disabled}
              className={!linkedinValid ? "border-[#FCA5A5] focus-visible:ring-[rgba(185,28,28,0.15)]" : undefined}
            />
          </PriorityFormField>
          <PriorityFormField
            label="Correo"
            description={
              emailValid
                ? "Validacion de formato solamente. La existencia real requiere verificacion externa."
                : "El correo no tiene un formato valido."
            }
            className="md:col-span-2"
          >
            <PriorityInput
              aria-invalid={!emailValid}
              placeholder="Correo"
              value={values.email}
              onChange={(event) => onChange("email", event.target.value)}
              disabled={disabled}
              className={!emailValid ? "border-[#FCA5A5] focus-visible:ring-[rgba(185,28,28,0.15)]" : undefined}
            />
          </PriorityFormField>
        </PriorityFormGrid>
      </PriorityFormSection>

      {!emailValid || !linkedinValid ? (
        <PrioritySectionAlert title="Validaciones pendientes" variant="warning">
          {!emailValid && !linkedinValid
            ? "Corrige el formato del correo y la URL de LinkedIn antes de guardar."
            : !emailValid
              ? "Corrige el formato del correo antes de guardar."
              : "Corrige la URL de LinkedIn antes de guardar."}
        </PrioritySectionAlert>
      ) : null}

      {whatsappLink ? (
        <PrioritySectionAlert title="Canal rapido disponible" variant="success">
          Este contacto ya tiene un telefono apto para abrir conversacion directa en WhatsApp.
        </PrioritySectionAlert>
      ) : null}

      {(createdAt || updatedAt) ? (
        <PriorityFormSection
          title="Registro"
          description="Campos automáticos controlados por la base de datos."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <PriorityInfoField label="Fecha de creacion" value={formatDate(createdAt)} />
            <PriorityInfoField label="Ultima vez actualizado" value={formatDate(updatedAt)} />
          </div>
        </PriorityFormSection>
      ) : null}

      {onSubmit ? (
        <PrioritySubmitBar>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={disabled || loading || !emailValid || !linkedinValid}
          >
            {loading ? "Guardando..." : submitLabel}
          </Button>
        </PrioritySubmitBar>
      ) : null}
    </section>
  )
}
