"use client"

import { useEffect, useRef } from "react"
import { useForm, type DefaultValues, type FieldValues } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z, type ZodTypeAny } from "zod"

type SchemaValues<TSchema extends ZodTypeAny> = z.infer<TSchema> & FieldValues

type UsePrioritySchemaFormOptions<TSchema extends ZodTypeAny> = {
  schema: TSchema
  defaultValues: DefaultValues<SchemaValues<TSchema>>
  disabled?: boolean
  onFieldChange?: (field: string, value: unknown, values: SchemaValues<TSchema>) => void
}

function shallowEqualObjects<TValues extends FieldValues>(left: TValues, right: TValues) {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])

  for (const key of keys) {
    if (!Object.is(left[key], right[key])) {
      return false
    }
  }

  return true
}

export function usePrioritySchemaForm<TSchema extends ZodTypeAny>({
  schema,
  defaultValues,
  disabled = false,
  onFieldChange,
}: UsePrioritySchemaFormOptions<TSchema>) {
  const form = useForm<SchemaValues<TSchema>>({
    resolver: zodResolver(schema as never) as never,
    defaultValues,
    mode: "onBlur",
    disabled,
  })
  const previousValuesRef = useRef(form.getValues())

  useEffect(() => {
    const currentValues = form.getValues()
    if (shallowEqualObjects(currentValues, defaultValues as SchemaValues<TSchema>)) {
      return
    }

    form.reset(defaultValues)
    previousValuesRef.current = defaultValues as SchemaValues<TSchema>
  }, [defaultValues, form])

  useEffect(() => {
    if (!onFieldChange) {
      return
    }

    // eslint-disable-next-line react-hooks/incompatible-library
    const subscription = form.watch((values, info) => {
      if (!info.name) {
        previousValuesRef.current = values as SchemaValues<TSchema>
        return
      }

      const field = info.name
      const nextValue = values[field]
      const previousValue = previousValuesRef.current[field]

      if (!Object.is(nextValue, previousValue)) {
        previousValuesRef.current = values as SchemaValues<TSchema>
        onFieldChange(field, nextValue, values as SchemaValues<TSchema>)
      }
    })

    return () => subscription.unsubscribe()
  }, [form, onFieldChange])

  return form
}
