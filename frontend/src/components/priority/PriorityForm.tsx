import type { ReactNode } from "react"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PriorityTypography } from "@/components/priority/PriorityTypography"
import { cn } from "@/lib/utils"

export function PriorityFormHeader({
  title,
  description,
  className,
}: {
  title: string
  description?: string
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <PriorityTypography as="h2" variant="sectionTitle" className="text-xl">
        {title}
      </PriorityTypography>
      {description ? <PriorityTypography variant="bodyMuted">{description}</PriorityTypography> : null}
    </div>
  )
}

export function PriorityFormSection({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "rounded-[24px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.92)] p-6 shadow-[0_22px_48px_-42px_rgba(3,10,24,0.45)] md:p-7",
        className
      )}
    >
      <div className="mb-5">
        <PriorityTypography as="h3" variant="eyebrow" className="text-[#506278]">
          {title}
        </PriorityTypography>
        {description ? (
          <PriorityTypography variant="bodyMuted" className="mt-2">
            {description}
          </PriorityTypography>
        ) : null}
      </div>
      {children}
    </section>
  )
}

export function PriorityFormGrid({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <FieldGroup className={cn("grid gap-5 md:grid-cols-2", className)}>{children}</FieldGroup>
}

export function PriorityFormField({
  label,
  description,
  children,
  className,
}: {
  label: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <Field className={cn("gap-2.5", className)}>
      <FieldLabel className="text-xs font-semibold uppercase tracking-[0.16em] text-[#526175]">
        {label}
      </FieldLabel>
      <FieldContent>
        {children}
        {description ? (
          <FieldDescription className="text-xs leading-6 text-[#7A8BA1]">{description}</FieldDescription>
        ) : null}
      </FieldContent>
    </Field>
  )
}

export function PriorityInput(props: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className={cn(
        "h-11 rounded-[18px] border-[#D1D6DF] bg-white px-4 text-[var(--brand-navy)] shadow-none focus-visible:border-[var(--brand-burgundy-light)] focus-visible:ring-[rgba(179,58,91,0.18)]",
        "placeholder:text-[#8A9AAF]",
        props.className
      )}
    />
  )
}

export function PriorityTextarea(props: React.ComponentProps<typeof Textarea>) {
  return (
    <Textarea
      {...props}
      className={cn(
        "min-h-[112px] rounded-[18px] border-[#D1D6DF] bg-white px-4 py-3 text-[var(--brand-navy)] shadow-none focus-visible:border-[var(--brand-burgundy-light)] focus-visible:ring-[rgba(179,58,91,0.18)]",
        "placeholder:text-[#8A9AAF]",
        props.className
      )}
    />
  )
}

type PrioritySelectOption = {
  value: string
  label: string
}

export function PrioritySelectField({
  value,
  onValueChange,
  placeholder,
  options,
  disabled,
}: {
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  options: PrioritySelectOption[]
  disabled?: boolean
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="h-11 w-full rounded-[18px] border-[#D1D6DF] bg-white px-4 text-left text-[var(--brand-navy)] shadow-none focus-visible:border-[var(--brand-burgundy-light)] focus-visible:ring-[rgba(179,58,91,0.18)] data-[placeholder]:text-[#8A9AAF]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function PriorityInfoField({
  label,
  value,
  className,
}: {
  label: string
  value: string | null | undefined
  className?: string
}) {
  return (
      <div
      className={cn(
        "rounded-[20px] border border-[rgba(144,158,174,0.18)] bg-[rgba(11,31,59,0.04)] px-4 py-4",
        className
      )}
    >
      <PriorityTypography variant="fieldLabel" className="text-[#72839A]">
        {label}
      </PriorityTypography>
      <PriorityTypography variant="dataValue" className="mt-2">
        {value || "No disponible"}
      </PriorityTypography>
    </div>
  )
}

export function PrioritySubmitBar({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 flex items-center justify-end gap-3 rounded-[22px] border border-[rgba(144,158,174,0.16)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.95)_0%,_rgba(243,246,250,0.98)_100%)] px-4 py-3 shadow-[0_24px_48px_-32px_rgba(3,10,24,0.35)] backdrop-blur",
        className
      )}
    >
      {children}
    </div>
  )
}
