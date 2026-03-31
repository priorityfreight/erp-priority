"use client"

import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  PriorityFormHeader,
  PriorityFormField,
  PriorityFormGrid,
  PriorityFormSection,
  PriorityInput,
  PrioritySubmitBar,
} from "@/components/priority/PriorityForm"
import { PrioritySectionAlert } from "@/components/priority/PrioritySectionAlert"
import { PriorityTypography } from "@/components/priority/PriorityTypography"
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
    <section className="space-y-5 rounded-[28px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(245,247,250,0.96)_100%)] p-5 shadow-[0_28px_60px_-44px_rgba(3,10,24,0.42)]">
      <PriorityFormHeader title={title} description={description} />

      <PriorityFormSection
        title="Informacion del contacto"
        description="Datos base del contacto del proveedor."
      >
        <PriorityFormGrid className="xl:grid-cols-3">
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
                Mantener este estatus actualizado evita que el equipo use contactos fuera de operacion.
              </PriorityTypography>
            </div>
          </PriorityFormField>
        </PriorityFormGrid>
      </PriorityFormSection>

      <PriorityFormSection
        title="Canales directos"
        description="Valida el formato de correo y habilita accesos directos."
      >
        <PriorityFormGrid className="md:grid-cols-2">
          <PriorityFormField
            label="Telefono"
            description={whatsappLink ? "Se puede abrir directo en WhatsApp." : "Sin enlace de WhatsApp."}
          >
            <PriorityInput
              placeholder="Telefono"
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
