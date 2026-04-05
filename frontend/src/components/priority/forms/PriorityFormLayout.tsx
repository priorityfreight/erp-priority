import type { ReactNode } from "react"
import { PriorityFormGrid, type PriorityFormDensity } from "@/components/priority/PriorityForm"
import { cn } from "@/lib/utils"

export function PriorityFormLayout({
  children,
  className,
  density = "workspace",
}: {
  children: ReactNode
  className?: string
  density?: PriorityFormDensity
}) {
  return (
    <PriorityFormGrid
      density={density}
      className={cn(
        density === "compact" ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-2" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
        className
      )}
    >
      {children}
    </PriorityFormGrid>
  )
}
