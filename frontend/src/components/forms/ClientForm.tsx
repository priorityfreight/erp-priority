"use client"

import { useState } from "react"
import type { User } from "@/lib/db"
import {
  PriorityFormHeader,
  PriorityFormField,
  PriorityFormGrid,
  PriorityFormSection,
  PriorityInfoField,
  PriorityInput,
  PrioritySelectField,
  PrioritySubmitBar,
  PriorityTextarea,
} from "@/components/priority/PriorityForm"
import { PrioritySectionAlert } from "@/components/priority/PrioritySectionAlert"
import { PriorityTypography } from "@/components/priority/PriorityTypography"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { clientStatusOptions } from "@/features/client-detail/helpers"
import { UnlocodeLookupField } from "./UnlocodeLookupField"

type ClientFormValues = {
  companyName: string
  taxId: string
  status: string
  accountOwnerId: string
  industry: string
  country: string
  website: string
  corporatePhone: string
  fullAddress: string
  postalCode: string
  city: string
  cityUnlocode: string
}

type ClientFormProps = {
  title: string
  description?: string
  values: ClientFormValues
  users?: User[]
  onChange: (field: keyof ClientFormValues, value: string) => void
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
  return (
    <section className="space-y-5 rounded-[28px] border border-[var(--border-subtle)] bg-[rgba(248,250,252,0.82)] p-5 shadow-[0_26px_60px_-42px_rgba(3,10,24,0.42)]">
      <PriorityFormHeader title={title} description={description} />

      <PriorityFormSection
        title="Informacion de la empresa"
        description="Captura los datos base de identificacion comercial."
      >
        <PriorityFormGrid>
          <PriorityFormField label="Nombre de la empresa">
            <PriorityInput
              placeholder="Nombre *"
              value={values.companyName}
              onChange={(event) => onChange("companyName", event.target.value)}
              disabled={disabled}
            />
          </PriorityFormField>
          <PriorityFormField label="RFC">
            <PriorityInput
              placeholder="RFC"
              value={values.taxId}
              onChange={(event) => onChange("taxId", event.target.value)}
              disabled={disabled}
            />
          </PriorityFormField>
          <PriorityFormField label="Industria">
            <PriorityInput
              placeholder="Industria"
              value={values.industry}
              onChange={(event) => onChange("industry", event.target.value)}
              disabled={disabled}
            />
          </PriorityFormField>
          <PriorityFormField label="Estatus comercial" className="md:col-span-2">
            <div className="space-y-3">
              <ToggleGroup
                type="single"
                value={values.status}
                onValueChange={(value) => {
                  if (value) {
                    onChange("status", value)
                  }
                }}
                className="w-full flex-wrap justify-start"
              >
                {clientStatusOptions.map((option) => (
                  <ToggleGroupItem key={option.value} value={option.value} className="min-w-[132px]">
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <PriorityTypography variant="caption">
                Este estado debe reflejar el momento real del avance comercial del cliente.
              </PriorityTypography>
            </div>
          </PriorityFormField>
          <PriorityFormField label="Dueno de cuenta" className="md:col-span-2 xl:col-span-1">
            <PrioritySelectField
              value={values.accountOwnerId}
              onValueChange={(value) => onChange("accountOwnerId", value)}
              placeholder="Selecciona un vendedor"
              disabled={disabled}
              options={users.map((user) => ({
                value: user.id,
                label: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email,
              }))}
            />
          </PriorityFormField>
        </PriorityFormGrid>
      </PriorityFormSection>

      <PriorityFormSection
        title="Ubicacion de la empresa"
        description="Selecciona el UN/LOCODE para estandarizar ciudad y pais automaticamente."
      >
        <PriorityFormGrid className="xl:grid-cols-3">
          <PriorityFormField label="Direccion completa" className="md:col-span-2 xl:col-span-2">
            <PriorityTextarea
              className="min-h-[96px]"
              placeholder="Direccion completa"
              value={values.fullAddress}
              onChange={(event) => onChange("fullAddress", event.target.value)}
              disabled={disabled}
            />
          </PriorityFormField>
          <PriorityFormField label="Codigo postal">
            <PriorityInput
              placeholder="Codigo postal"
              value={values.postalCode}
              onChange={(event) => onChange("postalCode", event.target.value)}
              disabled={disabled}
            />
          </PriorityFormField>
          <div className="space-y-3 md:col-span-2 xl:col-span-3">
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
                onChange("cityUnlocode", "")
                onChange("country", "")
              }}
              onSelect={(city) => {
                const label = city.subdivision_code ? `${city.name}, ${city.subdivision_code}` : city.name
                setLocationQuery(`${city.unlocode} · ${label}`)
                onChange("city", label)
                onChange("cityUnlocode", city.unlocode)
                onChange("country", city.country_name)
              }}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <PriorityInfoField label="Ciudad calculada" value={values.city || "Selecciona un UN/LOCODE"} />
              <PriorityInfoField label="Pais calculado" value={values.country || "Selecciona un UN/LOCODE"} />
            </div>
            {values.cityUnlocode ? (
              <PrioritySectionAlert title="Ubicacion normalizada" variant="info">
                UN/LOCODE seleccionado: {values.cityUnlocode}
              </PrioritySectionAlert>
            ) : null}
          </div>
        </PriorityFormGrid>
      </PriorityFormSection>

      <PriorityFormSection
        title="Informacion de contacto"
        description="Datos de contacto principales de la empresa."
      >
        <PriorityFormGrid className="md:grid-cols-2 xl:grid-cols-2">
          <PriorityFormField label="Pagina web">
            <PriorityInput
              placeholder="Pagina web *"
              value={values.website}
              onChange={(event) => onChange("website", event.target.value)}
              disabled={disabled}
            />
          </PriorityFormField>
          <PriorityFormField label="Telefono corporativo">
            <PriorityInput
              placeholder="Telefono corporativo *"
              value={values.corporatePhone}
              onChange={(event) => onChange("corporatePhone", event.target.value)}
              disabled={disabled}
            />
          </PriorityFormField>
        </PriorityFormGrid>
      </PriorityFormSection>

      {submitNote ? (
        <PrioritySectionAlert title="Nota de sincronizacion" variant="info">
          {submitNote}
        </PrioritySectionAlert>
      ) : null}

      {onSubmit ? (
        <PrioritySubmitBar>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={disabled || loading}
          >
            {loading ? "Guardando..." : submitLabel}
          </Button>
        </PrioritySubmitBar>
      ) : null}
    </section>
  )
}
