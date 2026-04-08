"use client"

import { useMemo } from "react"
import { PriorityFormEngine } from "@/components/priority/forms/PriorityFormEngine"
import { PrioritySectionAlert } from "@/components/priority/PrioritySectionAlert"
import type { FormSchemaDefinition } from "@/lib/forms/types"
import {
  providerContactFormSchema,
  type ProviderContactFormSchemaValues,
} from "@/features/provider-detail/schemas/provider-form"
import {
  isValidEmail,
  isValidLinkedInUrl,
  normalizeWhatsAppLink,
} from "./contact-form-utils"

export type ProviderContactFormValues = ProviderContactFormSchemaValues

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
  const schemaDefinition = useMemo<FormSchemaDefinition<typeof providerContactFormSchema>>(
    () => ({
      schema: providerContactFormSchema,
      title,
      description,
      sections: [
        {
          id: "profile",
          title: "Información del contacto",
          description: "Datos base del contacto del proveedor.",
          columnsClassName: "xl:grid-cols-3",
          fields: [
            {
              name: "name",
              type: "text",
              label: "Nombre del contacto",
              placeholder: "Nombre del contacto",
              required: true,
            },
            {
              name: "position",
              type: "text",
              label: "Puesto",
              placeholder: "Puesto",
            },
            {
              name: "status",
              type: "toggle-group",
              label: "Estatus",
              helperText:
                "Mantener este estatus actualizado evita que el equipo use contactos fuera de operación.",
              required: true,
              options: [
                { value: "activo", label: "Activo" },
                { value: "ya_no_trabaja", label: "Ya no trabaja" },
              ],
            },
          ],
        },
        {
          id: "channels",
          title: "Canales directos",
          description: "Valida el formato de correo y habilita accesos directos.",
          fields: [
            {
              name: "phone",
              type: "text",
              label: "Teléfono",
              placeholder: "Teléfono",
              description: normalizeWhatsAppLink(values.phone)
                ? "Se puede abrir directo en WhatsApp."
                : "Opcional. Si lo capturas bien, quedará listo para WhatsApp.",
            },
            {
              name: "linkedinUrl",
              type: "text",
              label: "LinkedIn URL",
              placeholder: "LinkedIn URL",
              description: isValidLinkedInUrl(values.linkedinUrl)
                ? "Usa una URL valida de linkedin.com."
                : "La URL debe pertenecer a linkedin.com.",
            },
            {
              name: "email",
              type: "text",
              label: "Correo",
              placeholder: "Correo",
              className: "md:col-span-2",
              required: true,
              description: isValidEmail(values.email)
                ? values.email.trim()
                  ? "Validación de formato solamente. La existencia real requiere verificación externa."
                  : "Captura un correo para que compras y pricing puedan contactar al proveedor."
                : "El correo no tiene un formato válido.",
            },
          ],
        },
      ],
    }),
    [description, title, values.email, values.linkedinUrl, values.phone]
  )

  return (
    <PriorityFormEngine
      schemaDefinition={schemaDefinition}
      values={values}
      density="compact"
      loading={loading}
      disabled={disabled}
      submitLabel={submitLabel}
      onSubmit={onSubmit}
      onFieldChange={(field, value) => onChange(field as keyof ProviderContactFormValues, String(value ?? ""))}
      afterSections={(currentValues) => {
        const emailValid = isValidEmail(currentValues.email)
        const linkedinValid = isValidLinkedInUrl(currentValues.linkedinUrl)
        const whatsappLink = normalizeWhatsAppLink(currentValues.phone)

        return (
          <>
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
                Este contacto ya tiene un teléfono apto para abrir conversación directa en WhatsApp.
              </PrioritySectionAlert>
            ) : null}
          </>
        )
      }}
    />
  )
}
