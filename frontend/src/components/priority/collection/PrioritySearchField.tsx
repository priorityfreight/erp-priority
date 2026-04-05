"use client"

import { SearchIcon, XIcon } from "lucide-react"
import {
  Button as AriaButton,
  Input as AriaInput,
  SearchField as AriaSearchField,
} from "react-aria-components"
import { cn } from "@/lib/utils"

type PrioritySearchFieldProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel?: string
  className?: string
  disabled?: boolean
}

export function PrioritySearchField({
  value,
  onChange,
  placeholder = "Buscar…",
  ariaLabel = "Buscar",
  className,
  disabled = false,
}: PrioritySearchFieldProps) {
  return (
    <AriaSearchField
      aria-label={ariaLabel}
      value={value}
      onChange={onChange}
      isDisabled={disabled}
      className={cn("w-full", className)}
    >
      <div className="flex min-h-11 items-center gap-3 rounded-[18px] border border-[rgba(11,31,59,0.14)] bg-[rgba(255,255,255,0.98)] px-4 shadow-[0_14px_28px_-24px_rgba(3,10,24,0.28)] transition focus-within:border-[rgba(11,31,59,0.26)] focus-within:ring-2 focus-within:ring-[rgba(11,31,59,0.08)]">
        <SearchIcon className="size-4 text-[#607187]" />
        <AriaInput
          placeholder={placeholder}
          className="h-11 w-full bg-transparent text-[0.95rem] text-[var(--brand-navy)] outline-none placeholder:text-[#8A98AA]"
        />
        {value ? (
          <AriaButton
            type="button"
            aria-label="Limpiar búsqueda"
            onPress={() => onChange("")}
            className="inline-flex size-8 items-center justify-center rounded-full text-[#607187] transition hover:bg-[rgba(11,31,59,0.06)] hover:text-[var(--brand-navy)]"
          >
            <XIcon className="size-4" />
          </AriaButton>
        ) : null}
      </div>
    </AriaSearchField>
  )
}
