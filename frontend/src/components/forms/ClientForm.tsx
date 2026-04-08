"use client"

import { useMemo, useState } from "react"
import type { User } from "@/lib/db"
import { PrioritySectionAlert } from "@/components/priority/PrioritySectionAlert"
import { PriorityInfoField } from "@/components/priority/PriorityForm"
import { PriorityFormEngine } from "@/components/priority/forms/PriorityFormEngine"
import { clientStatusOptions } from "@/features/client-detail/helpers"
import { clientFormSchema, type ClientFormSchemaValues } from "@/features/client-detail/schemas/client-form"
import type { FormSchemaDefinition } from "@/lib/forms/types"
import { UnlocodeLookupField } from "./UnlocodeLookupField"

type ClientFormProps = {
  title: string
  description?: string
  values: ClientFormSchemaValues
  users?: User[]
  onChange: (field: keyof ClientFormSchemaValues, value: string) => void
  onSubmit?: () => void
  submitLabel?: string
  loading?: boolean
  disabled?: boolean
  submitNote?: string
}

export function ClientForm({
  title,
  description,
  values,
  users = [],
  onChange,
  onSubmit,
  submitLabel = "Guardar",
  loading = false,
  disabled = false,
  submitNote,
}: ClientFormProps) {
  const [locationQuery, setLocationQuery] = useState("")
  const schemaDefinition = useMemo<FormSchemaDefinition<typeof clientFormSchema>>(
    () => ({
      schema: clientFormSchema,
      title,
      description,
      sections: [
        {
          id: "company",
          title: "Información de la empresa",
          description: "Captura los datos base de identificación comercial.",
          columnsClassName: "xl:grid-cols-3",
          fields: [
            {
              name: "companyName",
              type: "text",
              label: "Nombre de la empresa",
              placeholder: "Nombre de la empresa",
              required: true,
            },
            {
              name: "taxId",
              type: "text",
              label: "RFC",
              placeholder: "RFC",
            },
            {
              name: "industry",
              type: "text",
              label: "Industria",
              placeholder: "Industria",
            },
            {
              name: "status",
              type: "toggle-group",
              label: "Estatus comercial",
              helperText: "Este estado debe reflejar el momento real del avance comercial del cliente.",
              className: "md:col-span-2",
              required: true,
              options: clientStatusOptions,
            },
            {
              name: "accountOwnerId",
              type: "select",
              label: "Dueño de cuenta",
              placeholder: "Selecciona un vendedor",
              className: "md:col-span-2 xl:col-span-1",
              options: users.map((user) => ({
                value: user.id,
                label: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email,
              })),
            },
          ],
        },
        {
          id: "location",
          title: "Ubicación de la empresa",
          description: "Selecciona el UN/LOCODE para estandarizar ciudad y país automáticamente.",
          fields: [
            {
              name: "fullAddress",
              type: "textarea",
              label: "Dirección completa",
              placeholder: "Dirección completa",
              className: "md:col-span-2",
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
              className: "md:col-span-2",
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
                        form.setValue("cityUnlocode", "")
                        form.setValue("country", "")
                      }}
                      onSelect={(city) => {
                        const label = city.subdivision_code ? `${city.name}, ${city.subdivision_code}` : city.name
                        setLocationQuery(`${city.unlocode} · ${label}`)
                        form.setValue("city", label)
                        form.setValue("cityUnlocode", city.unlocode)
                        form.setValue("country", city.country_name)
                      }}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <PriorityInfoField
                        label="Ciudad calculada"
                        value={currentValues.city || "Selecciona un UN/LOCODE"}
                      />
                      <PriorityInfoField
                        label="País calculado"
                        value={currentValues.country || "Selecciona un UN/LOCODE"}
                      />
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
          title: "Información de contacto",
          description: "Datos de contacto principales de la empresa.",
          columnsClassName: "xl:grid-cols-3",
          fields: [
            {
              name: "website",
              type: "text",
              label: "Página web",
              placeholder: "Página web",
            },
            {
              name: "corporatePhone",
              type: "text",
              label: "Teléfono corporativo",
              placeholder: "Teléfono corporativo",
            },
          ],
        },
      ],
    }),
    [description, disabled, locationQuery, title, users]
  )

  return (
    <PriorityFormEngine
      schemaDefinition={schemaDefinition}
      values={values}
      loading={loading}
      disabled={disabled}
      submitLabel={submitLabel}
      submitNote={submitNote}
      onSubmit={onSubmit}
      onFieldChange={(field, value) => onChange(field as keyof ClientFormSchemaValues, String(value ?? ""))}
    />
  )
}
