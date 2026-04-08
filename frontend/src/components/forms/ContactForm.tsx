"use client"

import { useMemo } from "react"
import type { Client } from "@/lib/db"
import { PrioritySectionAlert } from "@/components/priority"
import { PriorityFormEngine } from "@/components/priority/forms/PriorityFormEngine"
import type { FormSchemaDefinition } from "@/lib/forms/types"
import { contactFormSchema, type ContactFormSchemaValues } from "@/features/contacts/schemas/contact-form"
import {
  isValidEmail,
  isValidLinkedInUrl,
  normalizeWhatsAppLink,
} from "./contact-form-utils"

export type ContactFormValues = ContactFormSchemaValues

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
  const schemaDefinition = useMemo<FormSchemaDefinition<typeof contactFormSchema>>(
    () => ({
      schema: contactFormSchema,
      title,
      description,
      sections: [
        {
          id: "profile",
          title: "Información del contacto",
          description: "Datos base del contacto y su relación con la cuenta.",
          columnsClassName: "xl:grid-cols-3",
          fields: [
            {
              name: "clientId",
              type: "select",
              label: "Cliente",
              placeholder: "Selecciona un cliente",
              required: true,
              options: clients.map((client) => ({
                value: client.id,
                label: client.company_name,
              })),
            },
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
              helperText: "El estatus controla si el contacto debe considerarse para salida comercial activa.",
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
          title: "Canales de contacto",
          description: "Canales directos de contacto y enlaces rápidos.",
          columnsClassName: "xl:grid-cols-3",
          fields: [
            {
              name: "phone",
              type: "text",
              label: "Teléfono directo",
              placeholder: "Teléfono directo",
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
                ? values.linkedinUrl.trim()
                  ? "Usa una URL válida de linkedin.com."
                  : "Opcional. Agrega el perfil si ayuda al seguimiento comercial."
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
                  : "Captura un correo para habilitar comunicación comercial."
                : "El correo no tiene un formato válido.",
            },
          ],
        },
        {
          id: "audit",
          title: "Fechas de referencia",
          description: "Contexto rápido para saber si el contacto está reciente o requiere depuración.",
          fields: [
            { type: "info", label: "Creado", infoValue: () => formatDate(createdAt) },
            { type: "info", label: "Última actualización", infoValue: () => formatDate(updatedAt) },
          ],
        },
      ],
    }),
    [clients, createdAt, description, title, updatedAt, values.email, values.linkedinUrl, values.phone]
  )

  return (
    <PriorityFormEngine
      schemaDefinition={schemaDefinition}
      density="compact"
      values={values}
      loading={loading}
      disabled={disabled}
      submitLabel={submitLabel}
      onSubmit={onSubmit}
      onFieldChange={(field, value) => onChange(field as keyof ContactFormValues, String(value ?? ""))}
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
