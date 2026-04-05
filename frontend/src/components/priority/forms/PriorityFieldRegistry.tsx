"use client"

import { Controller, useFormContext, type FieldValues } from "react-hook-form"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Switch } from "@/components/ui/switch"
import {
  PriorityFormField,
  PriorityInfoField,
  PriorityInput,
  PrioritySelectField,
  PriorityTextarea,
} from "@/components/priority/PriorityForm"
import { PriorityDateField } from "@/components/priority/PriorityDateField"
import type { FieldDefinition, FieldRenderApi } from "@/lib/forms/types"
import { resolveFieldOptions } from "@/lib/forms/adapters"

function getInputStep(type: FieldDefinition<FieldValues>["type"]) {
  switch (type) {
    case "currency":
    case "percentage":
      return "0.01"
    default:
      return undefined
  }
}

export function PrioritySchemaField<TValues extends FieldValues>({
  fieldDefinition,
  values,
  disabled = false,
}: {
  fieldDefinition: FieldDefinition<TValues>
  values: TValues
  disabled?: boolean
}) {
  const form = useFormContext<TValues>()
  const api: FieldRenderApi<TValues> = {
    control: form.control,
    form,
    values,
    disabled,
  }

  if (fieldDefinition.type === "custom" && fieldDefinition.render) {
    return fieldDefinition.render(api)
  }

  if (fieldDefinition.type === "info") {
    return (
      <PriorityInfoField
        label={fieldDefinition.label}
        value={fieldDefinition.infoValue ? fieldDefinition.infoValue(values) : null}
        className={fieldDefinition.className}
      />
    )
  }

  if (!fieldDefinition.name) {
    return null
  }

  return (
    <Controller
      control={form.control}
      name={fieldDefinition.name}
      render={({ field, fieldState }) => {
        const fieldDisabled = disabled || fieldDefinition.readOnly

        let control = <div />

        switch (fieldDefinition.type) {
          case "textarea":
            control = (
              <PriorityTextarea
                value={String(field.value ?? "")}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder={fieldDefinition.placeholder}
                disabled={fieldDisabled}
              />
            )
            break
          case "number":
          case "currency":
          case "percentage":
          case "text":
            control = (
              <PriorityInput
                type={fieldDefinition.type === "text" ? "text" : "number"}
                step={getInputStep(fieldDefinition.type)}
                inputMode={fieldDefinition.inputMode}
                value={String(field.value ?? "")}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder={fieldDefinition.placeholder}
                disabled={fieldDisabled}
              />
            )
            break
          case "select":
            control = (
              <PrioritySelectField
                value={String(field.value ?? "")}
                onValueChange={field.onChange}
                ariaLabel={fieldDefinition.label}
                placeholder={fieldDefinition.placeholder ?? "Selecciona una opcion"}
                disabled={fieldDisabled}
                options={resolveFieldOptions(fieldDefinition, values)}
              />
            )
            break
          case "toggle-group":
            control = (
              <ToggleGroup
                type="single"
                value={String(field.value ?? "")}
                onValueChange={(value) => {
                  if (value) {
                    field.onChange(value)
                  }
                }}
                disabled={fieldDisabled}
                className="w-full flex-wrap justify-start"
              >
                {resolveFieldOptions(fieldDefinition, values).map((option) => (
                  <ToggleGroupItem key={option.value} value={option.value} className="min-w-[132px]">
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )
            break
          case "switch":
            control = (
              <div className="flex min-h-12 items-center justify-between rounded-[20px] border border-[#D1D6DF] bg-white px-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-[var(--brand-navy)]">
                    {field.value ? "Activo" : "Inactivo"}
                  </div>
                  {fieldDefinition.helperText ? (
                    <div className="text-xs text-[#7A8BA1]">{fieldDefinition.helperText}</div>
                  ) : null}
                </div>
                <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} disabled={fieldDisabled} />
              </div>
            )
            break
          case "date":
            control = (
              <PriorityDateField
                value={String(field.value ?? "")}
                onChange={field.onChange}
                disabled={fieldDisabled}
                ariaLabel={fieldDefinition.label}
                placeholder={fieldDefinition.placeholder}
              />
            )
            break
          default:
            break
        }

        return (
          <PriorityFormField
            label={fieldDefinition.label}
            description={fieldDefinition.description ?? fieldDefinition.helperText}
            error={fieldState.error?.message}
            required={fieldDefinition.required}
            className={fieldDefinition.className}
          >
            {control}
          </PriorityFormField>
        )
      }}
    />
  )
}
