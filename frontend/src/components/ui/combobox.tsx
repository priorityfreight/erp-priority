"use client"

import type { ReactNode } from "react"
import { CheckIcon, ChevronsUpDownIcon, SearchIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type ComboboxOption = {
  value: string
  label: string
  description?: ReactNode
  keywords?: string
}

type ComboboxProps = {
  inputId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  query: string
  displayValue: string
  options: ComboboxOption[]
  loading?: boolean
  loadingMessage?: string
  emptyTitle?: string
  emptyMessage?: string
  disabled?: boolean
  placeholder?: string
  onQueryChange: (value: string) => void
  onClear?: () => void
  onSelect: (option: ComboboxOption) => void
  className?: string
  inputClassName?: string
  contentClassName?: string
  emptyStateClassName?: string
  selectedValue?: string
}

export function Combobox({
  inputId,
  open,
  onOpenChange,
  query,
  displayValue,
  options,
  loading = false,
  loadingMessage = "Cargando opciones...",
  emptyTitle = "Sin coincidencias",
  emptyMessage = "No se encontraron resultados para esta busqueda.",
  disabled = false,
  placeholder = "Buscar opcion",
  onQueryChange,
  onClear,
  onSelect,
  className,
  inputClassName,
  contentClassName,
  emptyStateClassName,
  selectedValue,
}: ComboboxProps) {
  const hasValue = Boolean(query || displayValue)

  return (
    <Popover open={disabled ? false : open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>
        <div className={cn("relative", className)}>
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#7A8BA1]" />
          <Input
            id={inputId}
            value={displayValue}
            disabled={disabled}
            placeholder={placeholder}
            onFocus={() => onOpenChange(true)}
            onChange={(event) => {
              onQueryChange(event.target.value)
              onOpenChange(true)
            }}
            className={cn(
              "h-11 rounded-[18px] border-[#D1D6DF] bg-white pl-11 pr-24 text-[var(--brand-navy)] shadow-none focus-visible:border-[var(--brand-burgundy-light)] focus-visible:ring-[rgba(179,58,91,0.18)]",
              inputClassName
            )}
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {hasValue && onClear ? (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="rounded-full text-[#5B6A7D]"
                onClick={() => {
                  onClear()
                  onOpenChange(false)
                }}
              >
                <XIcon />
                <span className="sr-only">Limpiar</span>
              </Button>
            ) : null}
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="rounded-full text-[#5B6A7D]"
              onClick={() => onOpenChange(!open)}
              disabled={disabled}
            >
              <ChevronsUpDownIcon />
              <span className="sr-only">Mostrar opciones</span>
            </Button>
          </div>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className={cn(
          "w-[var(--radix-popover-trigger-width)] min-w-[22rem] rounded-[20px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.98)] p-2 shadow-[0_24px_48px_-36px_rgba(3,10,24,0.45)]",
          contentClassName
        )}
      >
        <Command className="bg-transparent p-0">
          <CommandInput
            value={query}
            onValueChange={onQueryChange}
            placeholder={placeholder}
          />
          <CommandList className="max-h-72">
            {loading ? (
              <div className="px-3 py-4 text-sm text-[#64748B]">{loadingMessage}</div>
            ) : (
              <CommandEmpty>
                <Empty
                  className={cn(
                    "rounded-[16px] border-none bg-transparent px-3 py-5 shadow-none",
                    emptyStateClassName
                  )}
                >
                  <EmptyHeader className="max-w-none gap-2">
                    <EmptyMedia
                      variant="icon"
                      className="size-10 rounded-xl border border-[rgba(179,58,91,0.18)] bg-[rgba(179,58,91,0.08)] text-[var(--brand-burgundy)]"
                    >
                      <SearchIcon />
                    </EmptyMedia>
                    <EmptyTitle className="text-sm font-semibold text-[var(--brand-navy)]">
                      {emptyTitle}
                    </EmptyTitle>
                    <EmptyDescription className="text-xs leading-6 text-[#64748B]">
                      {emptyMessage}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </CommandEmpty>
            )}
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={[option.value, option.label, option.keywords].filter(Boolean).join(" ")}
                  onSelect={() => {
                    onSelect(option)
                    onOpenChange(false)
                  }}
                  className="rounded-[14px] px-3 py-3"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate font-medium text-[var(--brand-navy)]">{option.label}</span>
                    {option.description ? (
                      <span className="truncate text-xs text-[#64748B]">{option.description}</span>
                    ) : null}
                  </div>
                  {option.value === selectedValue ? (
                    <CheckIcon className="size-4 text-[var(--brand-burgundy)] opacity-100" />
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
