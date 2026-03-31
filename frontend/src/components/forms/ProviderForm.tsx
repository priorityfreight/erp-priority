"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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
import { UnlocodeLookupField } from "./UnlocodeLookupField"

export type ProviderFormValues = {
  name: string
  taxId: string
  status: string
  providerType: string
  corporatePhone: string
  companyEmail: string
  website: string
  fullAddress: string
  postalCode: string
  city: string
  cityUnlocode: string
  country: string
  creditActive: string
  creditAmount: string
  creditDays: string
}

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
  const creditEnabled = values.creditActive === "si"

  return (
    <section className="space-y-5 rounded-[28px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(245,247,250,0.96)_100%)] p-5 shadow-[0_28px_60px_-44px_rgba(3,10,24,0.42)]">
      <PriorityFormHeader title={title} description={description} />

      <PriorityFormSection
        title="Informacion de la empresa"
        description="Datos base del proveedor y su estatus comercial."
      >
        <PriorityFormGrid className="xl:grid-cols-3">
          <PriorityFormField label="Nombre comercial">
            <PriorityInput
              placeholder="Nombre *"
              value={values.name}
              onChange={(event) => onChange("name", event.target.value)}
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
          <PriorityFormField label="Tipo de proveedor">
            <PrioritySelectField
              value={values.providerType}
              onValueChange={(value) => onChange("providerType", value)}
              placeholder="Tipo de proveedor"
              disabled={disabled}
              options={providerTypeOptions.map((option) => ({ value: option, label: option }))}
            />
          </PriorityFormField>
          {showStatus ? (
            <PriorityFormField label="Estatus comercial" className="md:col-span-2 xl:col-span-3">
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
                  <ToggleGroupItem value="en_proceso_de_alta" className="min-w-[170px]">
                    En proceso de alta
                  </ToggleGroupItem>
                  <ToggleGroupItem value="activo" className="min-w-[120px]">
                    Activo
                  </ToggleGroupItem>
                  <ToggleGroupItem value="inactivo" className="min-w-[120px]">
                    Inactivo
                  </ToggleGroupItem>
                </ToggleGroup>
                <PriorityTypography variant="caption">
                  El estatus debe reflejar si el proveedor ya puede operar o si sigue en validacion interna.
                </PriorityTypography>
              </div>
            </PriorityFormField>
          ) : null}
        </PriorityFormGrid>
      </PriorityFormSection>

      <PriorityFormSection
        title="Informacion de contacto"
        description="Canales corporativos principales del proveedor."
      >
        <PriorityFormGrid className="xl:grid-cols-3">
          <PriorityFormField label="Telefono corporativo">
            <PriorityInput
              placeholder="Telefono corporativo"
              value={values.corporatePhone}
              onChange={(event) => onChange("corporatePhone", event.target.value)}
              disabled={disabled}
            />
          </PriorityFormField>
          <PriorityFormField label="Correo de la empresa">
            <PriorityInput
              placeholder="Correo de la empresa"
              value={values.companyEmail}
              onChange={(event) => onChange("companyEmail", event.target.value)}
              disabled={disabled}
            />
          </PriorityFormField>
          <PriorityFormField label="Pagina web">
            <PriorityInput
              placeholder="Pagina web"
              value={values.website}
              onChange={(event) => onChange("website", event.target.value)}
              disabled={disabled}
            />
          </PriorityFormField>
        </PriorityFormGrid>
      </PriorityFormSection>

      <PriorityFormSection
        title="Ubicacion de la empresa"
        description="Selecciona el UN/LOCODE para estandarizar ciudad y pais."
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
        title="Credito y cobranza"
        description="Condiciones comerciales de credito autorizadas por el proveedor."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-[rgba(144,158,174,0.18)] bg-[rgba(11,31,59,0.04)] px-4 py-4">
            <div className="space-y-1">
              <PriorityTypography variant="fieldLabel">Credito activo</PriorityTypography>
              <PriorityTypography variant="bodyMuted">
                Activa esta opcion solo cuando el proveedor ya tenga linea de credito aprobada.
              </PriorityTypography>
            </div>
            <div className="flex items-center gap-3">
              <PriorityTypography variant="caption">{creditEnabled ? "Si" : "No"}</PriorityTypography>
              <Switch
                checked={creditEnabled}
                onCheckedChange={(checked) => onChange("creditActive", checked ? "si" : "no")}
                disabled={disabled}
                aria-label="Credito activo"
              />
            </div>
          </div>
          <PriorityFormGrid className="md:grid-cols-2 xl:grid-cols-2">
            <PriorityFormField label="Monto de credito">
              <PriorityInput
                placeholder="Monto de credito"
                value={values.creditAmount}
                onChange={(event) => onChange("creditAmount", event.target.value)}
                disabled={disabled || !creditEnabled}
              />
            </PriorityFormField>
            <PriorityFormField label="Dias de credito">
              <PriorityInput
                placeholder="Dias de credito"
                value={values.creditDays}
                onChange={(event) => onChange("creditDays", event.target.value)}
                disabled={disabled || !creditEnabled}
              />
            </PriorityFormField>
          </PriorityFormGrid>
        </div>
      </PriorityFormSection>

      {creditEnabled ? (
        <PrioritySectionAlert title="Credito habilitado" variant="success">
          Revisa que monto y dias de credito coincidan con la aprobacion comercial vigente.
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
