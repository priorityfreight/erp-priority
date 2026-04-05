"use client"

import { CalendarIcon } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type PriorityDateFieldProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  ariaLabel?: string
  className?: string
}

export function PriorityDateField({
  value,
  onChange,
  disabled = false,
  placeholder = "Seleccionar fecha",
  ariaLabel,
  className,
}: PriorityDateFieldProps) {
  const selectedDate = value ? parseISO(value) : undefined

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={ariaLabel ?? placeholder}
          disabled={disabled}
          className={cn(
            "h-11 w-full justify-between rounded-[18px] border-[#D1D6DF] bg-white px-4 text-left font-medium text-[var(--brand-navy)] shadow-none hover:bg-[rgba(11,31,59,0.03)]",
            !selectedDate && "text-[#7A8BA1]",
            className
          )}
        >
          <span>{selectedDate ? format(selectedDate, "PPP", { locale: es }) : placeholder}</span>
          <CalendarIcon data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto rounded-[22px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.98)] p-3 shadow-[0_24px_48px_-36px_rgba(3,10,24,0.45)]"
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")}
          locale={es}
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  )
}
