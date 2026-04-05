"use client"

import { useMemo, useState } from "react"
import { PriorityInfoField, PrioritySectionAlert } from "@/components/priority"
import { PriorityFormEngine } from "@/components/priority/forms/PriorityFormEngine"
import type { FormSchemaDefinition } from "@/lib/forms/types"
import {
  providerFormSchema,
  type ProviderFormSchemaValues,
} from "@/features/provider-detail/schemas/provider-form"
import { isValidEmail } from "./contact-form-utils"
import { UnlocodeLookupField } from "./UnlocodeLookupField"

export type ProviderFormValues = ProviderFormSchemaValues

type ProviderFormProps = {
  title: string
  description?: string
  values: ProviderFormValues
  onChange: (field: keyof ProviderFormValues, value: string) => void
  onSubmit?: () => void
  submitLabel?: string
  loading?: boolean
  disabled?: boolean
  showStatus?: boolean
}

const providerTypeOptions = [
  "Paqueteria",
  "Coloader",
  "Agente",
  "Broker",
  "Transportista",
  "Consolidadora",
  "Naviera",
  "Aerolinea",
]

export function ProviderForm({
  title,
  description,
  values,
  onChange,
  onSubmit,
  submitLabel = "Guardar",
  loading = false,
  disabled = false,
  showStatus = true,
}: ProviderFormProps) {
  const [locationQuery, setLocationQuery] = useState("")

  const schemaDefinition = useMemo<FormSchemaDefinition<typeof providerFormSchema>>(
    () => ({
      schema: providerFormSchema,
      title,
      description,
      sections: [
        {
          id: "company",
          title: "Información de la empresa",
          description: "Datos base del proveedor y su estatus comercial.",
          columnsClassName: "xl:grid-cols-3",
          fields: [
            {
              name: "name",
              type: "text",
              label: "Nombre comercial",
              placeholder: "Nombre comercial",
              required: true,
            },
            {
              name: "taxId",
              type: "text",
              label: "RFC",
              placeholder: "RFC",
            },
            {
              name: "providerType",
              type: "select",
              label: "Tipo de proveedor",
              placeholder: "Selecciona un tipo de proveedor",
              required: true,
              options: providerTypeOptions.map((option) => ({ value: option, label: option })),
            },
            ...(showStatus
              ? [
                  {
                    name: "status" as const,
                    type: "toggle-group" as const,
                    label: "Estatus comercial",
                    className: "md:col-span-2 xl:col-span-3",
                    helperText:
                      "El estatus debe reflejar si el proveedor ya puede operar o si sigue en validacion interna.",
                    required: true,
                    options: [
                      { value: "en_proceso_de_alta", label: "En proceso de alta" },
                      { value: "activo", label: "Activo" },
                      { value: "inactivo", label: "Inactivo" },
                    ],
                  },
                ]
              : []),
          ],
        },
        {
          id: "contact",
          title: "Información de contacto",
          description: "Canales corporativos principales del proveedor.",
          columnsClassName: "xl:grid-cols-3",
          fields: [
            {
              name: "corporatePhone",
              type: "text",
              label: "Teléfono corporativo",
              placeholder: "Teléfono corporativo",
            },
            {
              name: "companyEmail",
              type: "text",
              label: "Correo de la empresa",
              placeholder: "Correo de la empresa",
              description: isValidEmail(values.companyEmail)
                ? values.companyEmail.trim()
                  ? "Validación de formato solamente."
                  : "Opcional. Captúralo si el proveedor centraliza comunicación por correo."
                : "El correo no tiene un formato válido.",
            },
            {
              name: "website",
              type: "text",
              label: "Página web",
              placeholder: "Página web",
            },
          ],
        },
        {
          id: "location",
          title: "Ubicación de la empresa",
          description: "Selecciona el UN/LOCODE para estandarizar ciudad y país.",
          fields: [
            {
              name: "fullAddress",
              type: "textarea",
              label: "Dirección completa",
              placeholder: "Dirección completa",
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
          id: "credit",
          title: "Crédito y cobranza",
          description: "Condiciones comerciales de crédito autorizadas por el proveedor.",
          columnsClassName: "xl:grid-cols-3",
          fields: [
            {
              name: "creditActive",
              type: "switch",
              label: "Crédito activo",
              switchLabel: "Línea de crédito aprobada",
              description: "Activa esta opción solo cuando el proveedor ya tenga línea de crédito aprobada.",
            },
            {
              name: "creditAmount",
              type: "text",
              label: "Monto de crédito",
              placeholder: "Monto de crédito",
              disabled: values.creditActive !== "si",
            },
            {
              name: "creditDays",
              type: "text",
              label: "Días de crédito",
              placeholder: "Días de crédito",
              disabled: values.creditActive !== "si",
            },
          ],
        },
      ],
    }),
    [description, disabled, locationQuery, showStatus, title, values.companyEmail, values.creditActive]
  )

  return (
    <PriorityFormEngine
      schemaDefinition={schemaDefinition}
      values={values}
      loading={loading}
      disabled={disabled}
      submitLabel={submitLabel}
      onSubmit={onSubmit}
      onFieldChange={(field, value) => {
        const nextValue = typeof value === "boolean" ? (value ? "si" : "no") : String(value ?? "")
        onChange(field as keyof ProviderFormValues, nextValue)

        if (field === "creditActive" && !value) {
          onChange("creditAmount", "")
          onChange("creditDays", "")
        }
      }}
      afterSections={(currentValues) => (
        <>
          {!isValidEmail(currentValues.companyEmail) ? (
            <PrioritySectionAlert title="Validación pendiente" variant="warning">
              Corrige el formato del correo corporativo antes de guardar este proveedor.
            </PrioritySectionAlert>
          ) : null}

          {currentValues.creditActive === "si" ? (
            <PrioritySectionAlert title="Crédito habilitado" variant="success">
              Revisa que monto y días de crédito coincidan con la aprobación comercial vigente.
            </PrioritySectionAlert>
          ) : null}
        </>
      )}
    />
  )
}
