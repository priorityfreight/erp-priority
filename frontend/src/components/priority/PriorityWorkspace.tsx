import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { PriorityTypography } from "@/components/priority/PriorityTypography"

export function PriorityWorkspaceHeader({
  eyebrow = "Priority Workspace",
  title,
  description,
  meta,
  actions,
  className,
  variant = "default",
}: {
  eyebrow?: ReactNode
  title: string
  description?: string
  meta?: ReactNode
  actions?: ReactNode
  className?: string
  variant?: "default" | "compact"
}) {
  return (
    <section
      className={cn(
        variant === "compact"
          ? "grid gap-3.5 rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,_rgba(11,31,59,0.82),_rgba(7,16,32,0.92))] px-4 py-3.5 shadow-[0_22px_56px_-40px_rgba(3,10,24,0.64)] lg:grid-cols-[minmax(0,1fr)_auto]"
          : "grid gap-5 rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,_rgba(11,31,59,0.82),_rgba(7,16,32,0.92))] px-5 py-5 shadow-[0_32px_90px_-42px_rgba(3,10,24,0.82)] lg:grid-cols-[minmax(0,1fr)_auto]",
        className
      )}
    >
      <div className={cn("min-w-0", variant === "compact" ? "space-y-2" : "space-y-3")}>
        {typeof eyebrow === "string" ? (
          <PriorityTypography variant="eyebrow" className="text-[var(--brand-gray)]">
            {eyebrow}
          </PriorityTypography>
        ) : (
          eyebrow
        )}
        <PriorityTypography
          as="h1"
          variant="pageTitle"
          className={cn(
            "max-w-4xl text-white text-balance",
            variant === "compact" ? "text-[clamp(1.42rem,1.7vw,2rem)]" : "text-[clamp(1.8rem,2.5vw,2.7rem)]"
          )}
        >
          {title}
        </PriorityTypography>
        {description ? (
          <PriorityTypography
            variant="bodyMuted"
            className={cn("text-[var(--brand-soft-gray)]", variant === "compact" ? "max-w-2xl text-[0.93rem] leading-6" : "max-w-3xl")}
          >
            {description}
          </PriorityTypography>
        ) : null}
        {meta ? <div className="flex flex-wrap items-center gap-2 pt-1">{meta}</div> : null}
      </div>

      {actions ? <div className="flex flex-wrap items-start justify-start gap-3 lg:justify-end">{actions}</div> : null}
    </section>
  )
}

export function PriorityMetricStrip({
  children,
  className,
  density = "default",
}: {
  children: ReactNode
  className?: string
  density?: "default" | "compact"
}) {
  return <section className={cn(density === "compact" ? "grid gap-2 md:grid-cols-2 xl:grid-cols-4" : "grid gap-3 md:grid-cols-2 xl:grid-cols-4", className)}>{children}</section>
}

export function PriorityMetricCard({
  label,
  value,
  helper,
  tone = "default",
  className,
  density = "default",
}: {
  label: string
  value: ReactNode
  helper?: ReactNode
  tone?: "default" | "info" | "success" | "warning" | "spotlight"
  className?: string
  density?: "default" | "compact"
}) {
  const toneClasses: Record<NonNullable<typeof tone>, string> = {
    default:
      "border-[rgba(144,158,174,0.16)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(244,246,249,0.98))]",
    info:
      "border-[rgba(37,99,235,0.18)] bg-[linear-gradient(180deg,_rgba(239,246,255,0.98),_rgba(255,255,255,0.98))]",
    success:
      "border-[rgba(5,150,105,0.18)] bg-[linear-gradient(180deg,_rgba(236,253,245,0.98),_rgba(255,255,255,0.98))]",
    warning:
      "border-[rgba(217,119,6,0.18)] bg-[linear-gradient(180deg,_rgba(255,251,235,0.98),_rgba(255,255,255,0.98))]",
    spotlight:
      "border-[rgba(179,58,91,0.22)] bg-[linear-gradient(145deg,_rgba(179,58,91,0.1),_rgba(255,255,255,0.98))]",
  }

  return (
    <div
      className={cn(
        density === "compact"
          ? "rounded-[18px] border px-3 py-2.5 shadow-[0_12px_24px_-24px_rgba(3,10,24,0.22)]"
          : "rounded-[24px] border p-4 shadow-[0_18px_42px_-34px_rgba(3,10,24,0.38)]",
        toneClasses[tone],
        className
      )}
    >
      <PriorityTypography variant="eyebrow" className="text-[#5F7287]">
        {label}
      </PriorityTypography>
      <div className={cn("mt-1.5 min-w-0 font-semibold tracking-[-0.03em] text-[var(--brand-navy)] [font-variant-numeric:tabular-nums]", density === "compact" ? "text-[1.32rem]" : "text-[1.85rem]")}>
        {value}
      </div>
      {helper ? (
        <PriorityTypography variant="caption" className={cn(density === "compact" ? "mt-1.5" : "mt-2")}>
          {helper}
        </PriorityTypography>
      ) : null}
    </div>
  )
}

export function PrioritySummaryRail({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "grid gap-4 rounded-[24px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.84)] p-4 shadow-[0_24px_48px_-38px_rgba(3,10,24,0.32)] md:grid-cols-2 xl:grid-cols-4",
        className
      )}
    >
      {children}
    </section>
  )
}
