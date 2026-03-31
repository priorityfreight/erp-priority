"use client"

import { useId, useMemo, useState } from "react"
import { PriorityTypography } from "@/components/priority/PriorityTypography"
import { Combobox } from "@/components/ui/combobox"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"

type PrioritySearchComboboxProps<T> = {
  label: string
  query: string
  selectedKey?: string
  selectedLabel?: string
  placeholder?: string
  emptyMessage?: string
  loadingMessage?: string
  disabled?: boolean
  helperText?: string
  results: T[]
  loading?: boolean
  onQueryChange: (value: string) => void
  onClear: () => void
  onSelect: (record: T) => void
  getKey: (record: T) => string
  getLabel: (record: T) => string
  getDescription?: (record: T) => string | undefined
}

export function PrioritySearchCombobox<T>({
  label,
  query,
  selectedKey,
  selectedLabel,
  placeholder,
  emptyMessage = "No se encontraron resultados.",
  loadingMessage = "Buscando...",
  disabled = false,
  helperText,
  results,
  loading = false,
  onQueryChange,
  onClear,
  onSelect,
  getKey,
  getLabel,
  getDescription,
}: PrioritySearchComboboxProps<T>) {
  const [open, setOpen] = useState(false)
  const inputId = useId()

  const displayValue = useMemo(() => {
    if (query) {
      return query
    }

    if (!selectedKey) {
      return ""
    }

    return selectedLabel ? `${selectedKey} · ${selectedLabel}` : selectedKey
  }, [query, selectedKey, selectedLabel])

  return (
    <Field className="gap-3">
      <FieldLabel htmlFor={inputId} className="text-xs font-semibold uppercase tracking-[0.18em] text-[#526175]">
        {label}
      </FieldLabel>
      <FieldContent className="gap-3">
        <Combobox
          inputId={inputId}
          open={open}
          onOpenChange={setOpen}
          query={query}
          displayValue={displayValue}
          selectedValue={selectedKey}
          disabled={disabled}
          placeholder={placeholder ?? `Buscar ${label}`}
          loading={loading}
          loadingMessage={loadingMessage}
          emptyMessage={emptyMessage}
          options={results.map((record) => {
            const key = getKey(record)

            return {
              value: key,
              label: getLabel(record),
              description: getDescription?.(record),
              keywords: [key, getLabel(record), getDescription?.(record)].filter(Boolean).join(" "),
            }
          })}
          onQueryChange={onQueryChange}
          onClear={onClear}
          onSelect={(option) => {
            const record = results.find((candidate) => getKey(candidate) === option.value)
            if (record) {
              onSelect(record)
            }
          }}
        />
        {selectedKey ? (
          <div className="rounded-[18px] border border-[rgba(144,158,174,0.16)] bg-[rgba(11,31,59,0.04)] px-4 py-3">
            <PriorityTypography variant="eyebrow">Seleccion actual</PriorityTypography>
            <PriorityTypography variant="dataValue" className="mt-2">
              {selectedLabel ? `${selectedKey} · ${selectedLabel}` : selectedKey}
            </PriorityTypography>
          </div>
        ) : null}
        {helperText ? <FieldDescription className="text-xs text-[#64748B]">{helperText}</FieldDescription> : null}
      </FieldContent>
    </Field>
  )
}
