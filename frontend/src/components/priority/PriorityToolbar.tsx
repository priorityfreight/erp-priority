import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function PriorityToolbar({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[22px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.72)] p-4 md:flex-row md:flex-wrap md:items-center",
        className
      )}
    >
      {children}
    </div>
  )
}
