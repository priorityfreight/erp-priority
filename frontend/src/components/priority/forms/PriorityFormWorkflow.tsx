import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function PriorityHybridFormLayout({
  form,
  grid,
  className,
}: {
  form: ReactNode
  grid: ReactNode
  className?: string
}) {
  return (
    <div className={cn("grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]", className)}>
      <div className="min-w-0">{form}</div>
      <div className="min-w-0">{grid}</div>
    </div>
  )
}

export function PriorityWizardStepHeader({
  step,
  totalSteps,
  title,
  description,
}: {
  step: number
  totalSteps: number
  title: string
  description?: string
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#72839A]">
        Paso {step} de {totalSteps}
      </div>
      <h2 className="text-[1.45rem] font-semibold text-[var(--brand-navy)]">{title}</h2>
      {description ? <p className="text-sm leading-6 text-[#64748B]">{description}</p> : null}
    </div>
  )
}

