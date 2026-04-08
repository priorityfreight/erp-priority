import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function PriorityGridToolbar({
  title,
  description,
  actions,
  className,
  density = "default",
}: {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
  density?: "default" | "compact"
}) {
  return (
    <div
      className={cn(
        density === "compact"
          ? "flex flex-col gap-3 rounded-[20px] border border-[rgba(144,158,174,0.16)] bg-[rgba(11,31,59,0.035)] px-3.5 py-3 sm:flex-row sm:items-end sm:justify-between"
          : "flex flex-col gap-4 rounded-[24px] border border-[rgba(144,158,174,0.16)] bg-[rgba(11,31,59,0.04)] px-4 py-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className={cn(density === "compact" ? "space-y-0.5" : "space-y-1")}>
        <div className={cn("font-semibold text-[var(--brand-navy)]", density === "compact" ? "text-[0.92rem]" : "text-sm")}>
          {title}
        </div>
        {description ? (
          <div className={cn("text-[#64748B]", density === "compact" ? "text-[0.82rem] leading-5" : "text-sm leading-6")}>
            {description}
          </div>
        ) : null}
      </div>
      {actions ? <div className={cn("flex flex-wrap items-center", density === "compact" ? "gap-2" : "gap-3")}>{actions}</div> : null}
    </div>
  )
}
