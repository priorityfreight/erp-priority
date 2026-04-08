import type { HTMLAttributes, ReactNode } from "react"
import type { Control, FieldPath, FieldValues, UseFormReturn } from "react-hook-form"
import { z, type ZodTypeAny } from "zod"

export type PriorityFormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "currency"
  | "percentage"
  | "select"
  | "toggle-group"
  | "switch"
  | "date"
  | "info"
  | "custom"

export type PriorityFormOption = {
  value: string
  label: string
  description?: string
}

export type FieldVisibilityRule<TValues extends FieldValues> = (values: TValues) => boolean

export type FieldDependencyRule<TValues extends FieldValues> = {
  dependsOn: FieldPath<TValues>
  when: (value: unknown, values: TValues) => boolean
}

export type OptionSourceDefinition<TValues extends FieldValues> =
  | PriorityFormOption[]
  | ((values: TValues) => PriorityFormOption[])

export type FieldRenderApi<TValues extends FieldValues> = {
  control: Control<TValues>
  form: UseFormReturn<TValues>
  values: TValues
  disabled?: boolean
}

export type FieldDefinition<TValues extends FieldValues> = {
  name?: FieldPath<TValues>
  type: PriorityFormFieldType
  label: string
  required?: boolean
  description?: string
  helperText?: string
  placeholder?: string
  className?: string
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"]
  options?: OptionSourceDefinition<TValues>
  visibility?: FieldVisibilityRule<TValues>
  dependency?: FieldDependencyRule<TValues>
  readOnly?: boolean
  infoValue?: (values: TValues) => string | null | undefined
  render?: (api: FieldRenderApi<TValues>) => ReactNode
}

export type RepeatableSectionDefinition<TValues extends FieldValues> = {
  id: string
  title: string
  description?: string
  emptyLabel?: string
  itemsField: FieldPath<TValues>
}

export type GridSectionDefinition = {
  id: string
  title: string
  description?: string
  mobileFallback: "cards" | "sheet" | "wizard"
}

export type FormSectionDefinition<TValues extends FieldValues> = {
  id: string
  title: string
  description?: string
  columnsClassName?: string
  fields: Array<FieldDefinition<TValues>>
}

export type HybridFormDefinition<TValues extends FieldValues> = {
  formSections: Array<FormSectionDefinition<TValues>>
  gridSection?: GridSectionDefinition
}

export type FormSchemaDefinition<TSchema extends ZodTypeAny> = {
  schema: TSchema
  title: string
  description?: string
  sections: Array<FormSectionDefinition<z.infer<TSchema> & FieldValues>>
}
