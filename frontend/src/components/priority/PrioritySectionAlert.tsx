import type { ReactNode } from "react"
import { AlertTriangleIcon, CircleCheckBigIcon, InfoIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

type PrioritySectionAlertProps = {
  title: string
  children: ReactNode
  variant?: "info" | "success" | "warning" | "destructive"
  className?: string
}

const iconMap = {
  info: InfoIcon,
  success: CircleCheckBigIcon,
  warning: AlertTriangleIcon,
  destructive: AlertTriangleIcon,
} as const

const toneMap = {
  info: "border-[rgba(11,31,59,0.08)] bg-[rgba(11,31,59,0.04)] text-[var(--brand-navy)] [&_[data-slot=alert-description]]:text-[#5B6A7D]",
  success:
    "border-[rgba(16,185,129,0.18)] bg-[rgba(236,253,245,0.92)] text-[#166534] [&_[data-slot=alert-description]]:text-[#166534]",
  warning:
    "border-[rgba(245,158,11,0.2)] bg-[rgba(255,251,235,0.95)] text-[#92400E] [&_[data-slot=alert-description]]:text-[#92400E]",
  destructive:
    "border-[rgba(239,68,68,0.18)] bg-[rgba(254,242,242,0.95)] text-[#B91C1C] [&_[data-slot=alert-description]]:text-[#B91C1C]",
} as const

export function PrioritySectionAlert({
  title,
  children,
  variant = "info",
  className,
}: PrioritySectionAlertProps) {
  const Icon = iconMap[variant]

  return (
    <Alert className={cn("rounded-[22px] px-4 py-4 shadow-none", toneMap[variant], className)}>
      <Icon />
      <AlertTitle className="font-semibold">{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}
