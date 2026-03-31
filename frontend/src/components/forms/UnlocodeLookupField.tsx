"use client"

import type { UnlocodeRecord } from "@/lib/db"
import { PrioritySearchCombobox } from "@/components/priority/PrioritySearchCombobox"
import { useUnlocodeLookup } from "@/lib/hooks/useUnlocodeLookup"

type UnlocodeLookupFieldProps = {
  label: string
  query: string
  selectedCode: string
  displayValue: string
  disabled?: boolean
  placeholder?: string
  onQueryChange: (value: string) => void
  onClear: () => void
  onSelect: (record: UnlocodeRecord) => void
}

export function UnlocodeLookupField({
  label,
  query,
  selectedCode,
  displayValue,
  disabled = false,
  placeholder,
  onQueryChange,
  onClear,
  onSelect,
}: UnlocodeLookupFieldProps) {
  const { results, loading } = useUnlocodeLookup(query, 6)

  return (
    <PrioritySearchCombobox
      label={label}
      query={query}
      selectedKey={selectedCode}
      selectedLabel={displayValue}
      placeholder={placeholder ?? `Buscar ${label}`}
      helperText="Usa teclado para buscar y seleccionar la ubicacion normalizada."
      results={results}
      loading={loading}
      disabled={disabled}
      loadingMessage="Buscando ubicaciones..."
      emptyMessage="No se encontraron ubicaciones."
      onQueryChange={onQueryChange}
      onClear={onClear}
      onSelect={onSelect}
      getKey={(record) => record.unlocode}
      getLabel={(record) => `${record.unlocode} · ${record.name}`}
      getDescription={(record) =>
        `${record.country_name}${record.subdivision_code ? ` · ${record.subdivision_code}` : ""}`
      }
    />
  )
}
