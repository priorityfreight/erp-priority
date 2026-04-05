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

export type PriorityFormDensity = "compact" | "workspace"

export const priorityFormShellClassName =
  "space-y-5 rounded-[28px] border border-[rgba(144,158,174,0.14)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.985)_0%,_rgba(243,246,250,0.97)_100%)] p-5 shadow-[0_30px_64px_-46px_rgba(3,10,24,0.34)] md:p-6"

export function PriorityFormShell({
  children,
  className,
  density = "workspace",
}: {
  children: ReactNode
  className?: string
  density?: PriorityFormDensity
}) {
  return (
    <section
      className={cn(
        priorityFormShellClassName,
        density === "compact" ? "space-y-4 rounded-[24px] p-4 md:p-5" : null,
        className
      )}
    >
      {children}
    </section>
  )
}

export function PriorityFormHeader({
  title,
  description,
  className,
  density = "workspace",
}: {
  title: string
  description?: string
  className?: string
  density?: PriorityFormDensity
}) {
  return (
    <div className={cn(density === "compact" ? "space-y-2" : "space-y-2.5", className)}>
      <PriorityTypography variant="eyebrow">Formulario</PriorityTypography>
      <PriorityTypography
        as="h2"
        variant="sectionTitle"
        className={cn(
          "max-w-3xl",
          density === "compact" ? "text-[1.2rem] md:text-[1.28rem]" : "text-[1.42rem] md:text-[1.5rem]"
        )}
      >
        {title}
      </PriorityTypography>
      {description ? (
        <PriorityTypography variant="bodyMuted" className="max-w-3xl">
          {description}
        </PriorityTypography>
      ) : null}
    </div>
  )
}

export function PriorityFormSection({
  title,
  description,
  children,
  className,
  density = "workspace",
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
  density?: PriorityFormDensity
}) {
  return (
    <section
      className={cn(
        density === "compact"
          ? "rounded-[20px] border border-[rgba(144,158,174,0.14)] bg-[rgba(255,255,255,0.94)] p-4 shadow-[0_16px_30px_-24px_rgba(3,10,24,0.18)] md:p-5"
          : "rounded-[24px] border border-[rgba(144,158,174,0.14)] bg-[rgba(255,255,255,0.94)] p-5 shadow-[0_20px_40px_-34px_rgba(3,10,24,0.22)] md:p-6",
        className
      )}
    >
      <div className={cn(density === "compact" ? "mb-4" : "mb-5")}>
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
  density = "workspace",
}: {
  children: ReactNode
  className?: string
  density?: PriorityFormDensity
}) {
  return (
    <FieldGroup
      className={cn(
        density === "compact"
          ? "grid gap-3 md:grid-cols-2 xl:grid-cols-2 xl:gap-4"
          : "grid gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5",
        className
      )}
    >
      {children}
    </FieldGroup>
  )
}

export function PriorityFormField({
  label,
  description,
  error,
  required = false,
  children,
  className,
}: {
  label: string
  description?: string
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <Field className={cn("gap-2", className)}>
      <FieldLabel className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#526175]">
        <span>{label}</span>
        {required ? <span className="text-[var(--brand-burgundy)]">*</span> : null}
      </FieldLabel>
      <FieldContent className="gap-2">
        {children}
        {error ? (
          <FieldDescription className="text-xs leading-6 text-[#B42318]">{error}</FieldDescription>
        ) : description ? (
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
        "h-11 rounded-[18px] border-[#D1D6DF] bg-white px-4 text-[0.96rem] text-[var(--brand-navy)] shadow-none focus-visible:border-[var(--brand-burgundy-light)] focus-visible:ring-[rgba(179,58,91,0.18)]",
        "placeholder:text-[#8A9AAF] hover:border-[#B8C2D0] disabled:border-[#E4E9F0] disabled:bg-[#F5F7FA] disabled:text-[#90A0B3]",
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
        "min-h-[120px] rounded-[18px] border-[#D1D6DF] bg-white px-4 py-3 text-[0.96rem] text-[var(--brand-navy)] shadow-none focus-visible:border-[var(--brand-burgundy-light)] focus-visible:ring-[rgba(179,58,91,0.18)]",
        "placeholder:text-[#8A9AAF] hover:border-[#B8C2D0] disabled:border-[#E4E9F0] disabled:bg-[#F5F7FA] disabled:text-[#90A0B3]",
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
  ariaLabel,
}: {
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  options: PrioritySelectOption[]
  disabled?: boolean
  ariaLabel?: string
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        aria-label={ariaLabel ?? placeholder}
        className="h-11 w-full rounded-[18px] border-[#D1D6DF] bg-white px-4 text-left text-[0.96rem] text-[var(--brand-navy)] shadow-none hover:border-[#B8C2D0] focus-visible:border-[var(--brand-burgundy-light)] focus-visible:ring-[rgba(179,58,91,0.18)] data-[placeholder]:text-[#8A9AAF] disabled:border-[#E4E9F0] disabled:bg-[#F5F7FA] disabled:text-[#90A0B3]"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" className="z-[140]">
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
        "rounded-[20px] border border-[rgba(144,158,174,0.16)] bg-[rgba(11,31,59,0.035)] px-4 py-3.5",
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
  density = "workspace",
  mode = "sticky",
}: {
  children: ReactNode
  className?: string
  density?: PriorityFormDensity
  mode?: "sticky" | "inline"
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 border border-[rgba(144,158,174,0.14)] backdrop-blur",
        mode === "sticky" ? "xl:sticky xl:bottom-0" : "relative",
        density === "compact"
          ? "rounded-[18px] bg-[rgba(255,255,255,0.88)] px-3.5 py-2.5 shadow-[0_10px_22px_-18px_rgba(3,10,24,0.16)]"
          : "rounded-[22px] bg-[linear-gradient(180deg,_rgba(255,255,255,0.94)_0%,_rgba(243,246,250,0.975)_100%)] px-4 py-3 shadow-[0_18px_36px_-24px_rgba(3,10,24,0.2)]",
        "supports-[backdrop-filter]:bg-[rgba(255,255,255,0.9)]",
        className
      )}
    >
      {children}
    </div>
  )
}
