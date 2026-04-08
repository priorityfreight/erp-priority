"use client"

import { useMemo, useState } from "react"
import { PriorityInfoField, PrioritySectionAlert } from "@/components/priority"
import { PriorityFormEngine } from "@/components/priority/forms/PriorityFormEngine"
import type { FormSchemaDefinition } from "@/lib/forms/types"
import {
  clientLogisticsPartyFormSchema,
  type ClientLogisticsPartyFormSchemaValues,
} from "@/features/client-detail/schemas/client-logistics-party-form"
import { isValidEmail, normalizeWhatsAppLink } from "./contact-form-utils"
import { UnlocodeLookupField } from "./UnlocodeLookupField"

export type ClientLogisticsPartyFormValues = ClientLogisticsPartyFormSchemaValues

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

  const schemaDefinition = useMemo<FormSchemaDefinition<typeof clientLogisticsPartyFormSchema>>(
    () => ({
      schema: clientLogisticsPartyFormSchema,
      title,
      description,
      sections: [
        {
          id: "record",
          title: "Información del registro",
          description: "Define el tipo de registro logístico y el nombre operativo.",
          columnsClassName: "xl:grid-cols-3",
          fields: [
            {
              name: "partyType",
              type: "toggle-group",
              label: "Tipo de registro",
              helperText:
                "El tipo debe reflejar el rol logístico real que cumple este registro para la cuenta.",
              required: true,
              options: [
                { value: "shipper", label: "Shipper" },
                { value: "consignee", label: "Consignee" },
                { value: "aa", label: "AA" },
              ],
            },
            {
              name: "name",
              type: "text",
              label: "Nombre operativo",
              placeholder: "Nombre operativo",
              required: true,
            },
          ],
        },
        {
          id: "location",
          title: "Ubicación",
          description: "Selecciona un UN/LOCODE para estandarizar ciudad y país.",
          columnsClassName: "xl:grid-cols-3",
          fields: [
            {
              name: "fullAddress",
              type: "textarea",
              label: "Dirección completa",
              placeholder: "Dirección",
              className: "md:col-span-2 xl:col-span-2",
            },
            {
              name: "postalCode",
              type: "text",
              label: "Código postal",
              placeholder: "Código postal",
            },
            {
              type: "custom",
              label: "UN/LOCODE",
              className: "md:col-span-2 xl:col-span-3",
              render: ({ form }) => {
                const currentValues = form.getValues()

                return (
                  <div className="space-y-3">
                    <UnlocodeLookupField
                      label="UN/LOCODE"
                      query={locationQuery}
                      selectedCode={currentValues.cityUnlocode}
                      displayValue={currentValues.city || ""}
                      disabled={disabled}
                      placeholder="Buscar UN/LOCODE"
                      onQueryChange={setLocationQuery}
                      onClear={() => {
                        setLocationQuery("")
                        form.setValue("city", "")
                        form.setValue("country", "")
                        form.setValue("cityUnlocode", "")
                      }}
                      onSelect={(record) => {
                        const label = record.subdivision_code
                          ? `${record.name}, ${record.subdivision_code}`
                          : record.name
                        setLocationQuery(`${record.unlocode} · ${label}`)
                        form.setValue("city", label)
                        form.setValue("country", record.country_name)
                        form.setValue("cityUnlocode", record.unlocode)
                      }}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <PriorityInfoField label="Ciudad calculada" value={currentValues.city || "Selecciona un UN/LOCODE"} />
                      <PriorityInfoField label="País calculado" value={currentValues.country || "Selecciona un UN/LOCODE"} />
                    </div>
                    {currentValues.cityUnlocode ? (
                      <PrioritySectionAlert title="Ubicación normalizada" variant="info">
                        UN/LOCODE seleccionado: {currentValues.cityUnlocode}
                      </PrioritySectionAlert>
                    ) : null}
                  </div>
                )
              },
            },
          ],
        },
        {
          id: "contact",
          title: "Contacto asociado",
          description: "Persona y canales principales del registro.",
          columnsClassName: "xl:grid-cols-3",
          fields: [
            {
              name: "contactName",
              type: "text",
              label: "Nombre del contacto",
              placeholder: "Nombre del contacto",
            },
            {
              name: "contactEmail",
              type: "text",
              label: "Correo del contacto",
              placeholder: "Correo del contacto",
              required: true,
              description: isValidEmail(values.contactEmail)
                ? values.contactEmail.trim()
                  ? "Validación de formato solamente."
                  : "Captura un correo si este registro participa en coordinación operativa."
                : "El correo no tiene un formato válido.",
            },
            {
              name: "contactPhone",
              type: "text",
              label: "Numero de contacto",
              className: "md:col-span-2",
              placeholder: "Número de contacto",
              description: normalizeWhatsAppLink(values.contactPhone)
                ? "Se puede abrir directo en WhatsApp."
                : "Opcional. Si lo capturas bien, quedará listo para WhatsApp.",
            },
          ],
        },
      ],
    }),
    [description, disabled, locationQuery, title, values.contactEmail, values.contactPhone]
  )

  return (
    <PriorityFormEngine
      schemaDefinition={schemaDefinition}
      values={values}
      loading={loading}
      disabled={disabled}
      submitLabel={submitLabel}
      onSubmit={onSubmit}
      onFieldChange={(field, value) => onChange(field as keyof ClientLogisticsPartyFormValues, String(value ?? ""))}
      afterSections={(currentValues) => {
        const emailValid = isValidEmail(currentValues.contactEmail)

        return !emailValid ? (
          <PrioritySectionAlert title="Validación pendiente" variant="warning">
            Corrige el formato del correo del contacto antes de guardar este registro logístico.
          </PrioritySectionAlert>
        ) : null
      }}
    />
  )
}
