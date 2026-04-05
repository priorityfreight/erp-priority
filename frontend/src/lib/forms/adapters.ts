import type { FieldDefinition, PriorityFormOption } from "@/lib/forms/types"
import type { FieldValues } from "react-hook-form"

export function resolveFieldOptions<TValues extends FieldValues>(
  field: FieldDefinition<TValues>,
  values: TValues
): PriorityFormOption[] {
  if (!field.options) {
    return []
  }

  return typeof field.options === "function" ? field.options(values) : field.options
}

export function isFieldVisible<TValues extends FieldValues>(
  field: FieldDefinition<TValues>,
  values: TValues
): boolean {
  if (field.visibility && !field.visibility(values)) {
    return false
  }

  if (field.dependency && !field.dependency.when(values[field.dependency.dependsOn], values)) {
    return false
  }

  return true
}

