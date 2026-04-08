import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function PriorityToolbar({
  children,
  className,
  density = "default",
}: {
  children: ReactNode
  className?: string
  density?: "default" | "compact"
}) {
  return (
    <div
      className={cn(
        density === "compact"
          ? "flex flex-col gap-2.5 rounded-[18px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.94),_rgba(247,249,252,0.94))] p-3 shadow-[0_14px_30px_-26px_rgba(3,10,24,0.26)] md:flex-row md:flex-wrap md:items-center"
          : "flex flex-col gap-3 rounded-[22px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.92),_rgba(247,249,252,0.92))] p-4 shadow-[0_20px_40px_-36px_rgba(3,10,24,0.32)] md:flex-row md:flex-wrap md:items-center",
        className
      )}
    >
      {children}
    </div>
  )
}
