"use client"

import type { UnlocodeRecord } from "@/lib/db"
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
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</div>
      <div className="flex gap-2">
        <input
          className="w-full rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] disabled:cursor-not-allowed disabled:bg-[#F3F4F6]"
          placeholder={placeholder ?? `Buscar ${label}`}
          value={query || selectedCode || displayValue}
          onChange={(event) => onQueryChange(event.target.value)}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm font-medium text-[#374151] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Limpiar
        </button>
      </div>
      {loading ? <div className="text-xs text-[#6B7280]">Buscando ubicaciones...</div> : null}
      {results.length > 0 ? (
        <div className="max-h-44 overflow-y-auto rounded-md border border-[#E5E7EB] bg-white">
          {results.map((record) => (
            <button
              key={record.id}
              type="button"
              onClick={() => onSelect(record)}
              className="flex w-full flex-col items-start border-b border-[#F1F5F9] px-3 py-2 text-left text-sm last:border-b-0 hover:bg-[#F8FAFC]"
            >
              <span className="font-medium text-[#111827]">
                {record.unlocode} · {record.name}
              </span>
              <span className="text-xs text-[#6B7280]">
                {record.country_name}
                {record.subdivision_code ? ` · ${record.subdivision_code}` : ""}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="rounded-md border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
          Seleccion actual
        </div>
        <div className="mt-1 text-sm font-medium text-[#111827]">
          {selectedCode
            ? `${selectedCode}${displayValue ? ` · ${displayValue}` : ""}`
            : "Selecciona un UN/LOCODE"}
        </div>
      </div>
    </div>
  )
}
