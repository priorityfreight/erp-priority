"use client"

import { useMemo } from "react"
import { FormProvider, useWatch, type DefaultValues } from "react-hook-form"
import { z, type ZodTypeAny } from "zod"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  PriorityFormHeader,
  PriorityFormSection,
  PriorityFormShell,
  PrioritySectionAlert,
  PrioritySubmitBar,
} from "@/components/priority"
import { isFieldVisible } from "@/lib/forms/adapters"
import { usePrioritySchemaForm } from "@/lib/forms/usePrioritySchemaForm"
import type { FormSchemaDefinition } from "@/lib/forms/types"
import { PrioritySchemaField } from "@/components/priority/forms/PriorityFieldRegistry"
import { PriorityFormLayout } from "@/components/priority/forms/PriorityFormLayout"

type SchemaValues<TSchema extends ZodTypeAny> = z.infer<TSchema> & Record<string, unknown>

type PriorityFormEngineProps<TSchema extends ZodTypeAny> = {
  schemaDefinition: FormSchemaDefinition<TSchema>
  values: SchemaValues<TSchema>
  loading?: boolean
  disabled?: boolean
  submitLabel?: string
  submitNote?: string
  density?: "compact" | "workspace"
  submitBarMode?: "sticky" | "inline" | "auto"
  onSubmit?: () => void
  onFieldChange?: (field: string, value: unknown, values: SchemaValues<TSchema>) => void
  beforeSections?: ReactNode | ((values: SchemaValues<TSchema>) => ReactNode)
  afterSections?: ReactNode | ((values: SchemaValues<TSchema>) => ReactNode)
}

export function PriorityFormEngine<TSchema extends ZodTypeAny>({
  schemaDefinition,
  values,
  loading = false,
  disabled = false,
  submitLabel = "Guardar",
  submitNote,
  density = "workspace",
  submitBarMode = "auto",
  onSubmit,
  onFieldChange,
  beforeSections,
  afterSections,
}: PriorityFormEngineProps<TSchema>) {
  const form = usePrioritySchemaForm({
    schema: schemaDefinition.schema,
    defaultValues: values as DefaultValues<SchemaValues<TSchema>>,
    disabled,
    onFieldChange,
  })
  const watchedValues = useWatch({ control: form.control }) as SchemaValues<TSchema>
  const sections = useMemo(
    () =>
      schemaDefinition.sections.map((section) => ({
        ...section,
        fields: section.fields.filter((field) => isFieldVisible(field as never, watchedValues as never)),
      })),
    [schemaDefinition.sections, watchedValues]
  )
  const resolvedSubmitBarMode =
    submitBarMode === "auto" ? (density === "compact" ? "inline" : "sticky") : submitBarMode

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(() => {
          onSubmit?.()
        })}
      >
        <PriorityFormShell density={density}>
          <PriorityFormHeader density={density} title={schemaDefinition.title} description={schemaDefinition.description} />

          {typeof beforeSections === "function" ? beforeSections(watchedValues) : beforeSections}

          {sections.map((section) => (
            <PriorityFormSection
              key={section.id}
              title={section.title}
              description={section.description}
              density={density}
            >
              <PriorityFormLayout density={density} className={section.columnsClassName}>
                {section.fields.map((field) => (
                  <PrioritySchemaField<SchemaValues<TSchema>>
                    key={`${section.id}-${field.name ?? field.label}`}
                    fieldDefinition={field as never}
                    values={watchedValues}
                    disabled={disabled}
                  />
                ))}
              </PriorityFormLayout>
            </PriorityFormSection>
          ))}

          {typeof afterSections === "function" ? afterSections(watchedValues) : afterSections}

          {submitNote ? (
            <PrioritySectionAlert title="Nota de sincronizacion" variant="info">
              {submitNote}
            </PrioritySectionAlert>
          ) : null}

          {onSubmit ? (
            <PrioritySubmitBar density={density} mode={resolvedSubmitBarMode}>
              <Button type="submit" disabled={disabled || loading}>
                {loading ? "Guardando..." : submitLabel}
              </Button>
            </PrioritySubmitBar>
          ) : null}
        </PriorityFormShell>
      </form>
    </FormProvider>
  )
}
