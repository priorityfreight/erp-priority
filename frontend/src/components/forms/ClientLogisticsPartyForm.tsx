"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  PriorityFormHeader,
  PriorityFormField,
  PriorityFormGrid,
  PriorityFormSection,
  PriorityInfoField,
  PriorityInput,
  PrioritySubmitBar,
  PriorityTextarea,
} from "@/components/priority/PriorityForm"
import { PrioritySectionAlert } from "@/components/priority/PrioritySectionAlert"
import { PriorityTypography } from "@/components/priority/PriorityTypography"
import { isValidEmail, normalizeWhatsAppLink } from "./ContactForm"
import { UnlocodeLookupField } from "./UnlocodeLookupField"

export type ClientLogisticsPartyFormValues = {
  partyType: string
  name: string
  fullAddress: string
  postalCode: string
  city: string
  country: string
  cityUnlocode: string
  contactName: string
  contactEmail: string
  contactPhone: string
}

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
  const emailValid = isValidEmail(values.contactEmail)
  const whatsappLink = normalizeWhatsAppLink(values.contactPhone)

  return (
    <section className="space-y-5 rounded-[28px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(245,247,250,0.96)_100%)] p-5 shadow-[0_28px_60px_-44px_rgba(3,10,24,0.42)]">
      <PriorityFormHeader title={title} description={description} />

      <PriorityFormSection
        title="Informacion del registro"
        description="Define el tipo de registro logistico y el nombre operativo."
      >
        <PriorityFormGrid>
          <PriorityFormField label="Tipo de registro">
            <div className="space-y-3">
              <ToggleGroup
                type="single"
                value={values.partyType}
                onValueChange={(value) => {
                  if (value) {
                    onChange("partyType", value)
                  }
                }}
                className="w-full justify-start"
              >
                <ToggleGroupItem value="shipper" className="min-w-[120px]">
                  Shipper
                </ToggleGroupItem>
                <ToggleGroupItem value="consignee" className="min-w-[120px]">
                  Consignee
                </ToggleGroupItem>
                <ToggleGroupItem value="aa" className="min-w-[120px]">
                  AA
                </ToggleGroupItem>
              </ToggleGroup>
              <PriorityTypography variant="caption">
                El tipo debe reflejar el rol logistico real que cumple este registro para la cuenta.
              </PriorityTypography>
            </div>
          </PriorityFormField>
          <PriorityFormField label="Nombre operativo">
            <PriorityInput
              placeholder="Nombre *"
              value={values.name}
              onChange={(event) => onChange("name", event.target.value)}
              disabled={disabled}
            />
          </PriorityFormField>
        </PriorityFormGrid>
      </PriorityFormSection>

      <PriorityFormSection
        title="Ubicacion"
        description="Selecciona un UN/LOCODE para estandarizar ciudad y pais."
      >
        <PriorityFormGrid className="xl:grid-cols-3">
          <PriorityFormField label="Direccion completa" className="md:col-span-2 xl:col-span-2">
            <PriorityTextarea
              className="min-h-[96px]"
              placeholder="Direccion"
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
                onChange("country", "")
                onChange("cityUnlocode", "")
              }}
              onSelect={(record) => {
                const label = record.subdivision_code
                  ? `${record.name}, ${record.subdivision_code}`
                  : record.name
                setLocationQuery(`${record.unlocode} · ${label}`)
                onChange("city", label)
                onChange("country", record.country_name)
                onChange("cityUnlocode", record.unlocode)
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
        title="Contacto asociado"
        description="Persona y canales principales del registro."
      >
        <PriorityFormGrid className="md:grid-cols-2">
          <PriorityFormField label="Nombre del contacto">
            <PriorityInput
              placeholder="Nombre del contacto"
              value={values.contactName}
              onChange={(event) => onChange("contactName", event.target.value)}
              disabled={disabled}
            />
          </PriorityFormField>
          <PriorityFormField
            label="Correo del contacto"
            description={emailValid ? "Validacion de formato solamente." : "El correo no tiene un formato valido."}
          >
            <PriorityInput
              aria-invalid={!emailValid}
              className={!emailValid ? "border-[#FCA5A5] focus-visible:ring-[rgba(185,28,28,0.15)]" : undefined}
              placeholder="Correo del contacto"
              value={values.contactEmail}
              onChange={(event) => onChange("contactEmail", event.target.value)}
              disabled={disabled}
            />
          </PriorityFormField>
          <PriorityFormField
            label="Numero de contacto"
            description={whatsappLink ? "Se puede abrir directo en WhatsApp." : "Sin enlace de WhatsApp."}
            className="md:col-span-2"
          >
            <PriorityInput
              placeholder="Numero de contacto"
              value={values.contactPhone}
              onChange={(event) => onChange("contactPhone", event.target.value)}
              disabled={disabled}
            />
          </PriorityFormField>
        </PriorityFormGrid>
      </PriorityFormSection>

      {!emailValid ? (
        <PrioritySectionAlert title="Validacion pendiente" variant="warning">
          Corrige el formato del correo del contacto antes de guardar este registro logistico.
        </PrioritySectionAlert>
      ) : null}

      {onSubmit ? (
        <PrioritySubmitBar>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={disabled || loading || !emailValid}
          >
            {loading ? "Guardando..." : submitLabel}
          </Button>
        </PrioritySubmitBar>
      ) : null}
    </section>
  )
}
