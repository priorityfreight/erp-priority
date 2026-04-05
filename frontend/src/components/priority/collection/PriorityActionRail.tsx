"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type PriorityRailAction = {
  label: string
  onPress?: () => void
  href?: string
  disabled?: boolean
  variant?: "default" | "outline" | "secondary" | "ghost"
}

export function PriorityActionRail({
  actions,
  className,
  compact = false,
}: {
  actions: PriorityRailAction[]
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        compact ? "flex min-w-[188px] flex-wrap items-start gap-1.5" : "flex min-w-[220px] flex-wrap items-start gap-2",
        className
      )}
    >
      {actions.map((action) => (
        <Button
          key={`${action.label}-${action.href ?? "action"}`}
          type="button"
          size="sm"
          variant={action.variant ?? "outline"}
          className={cn(compact ? "h-8 px-2.5 text-[0.72rem]" : "")}
          disabled={action.disabled}
          onClick={() => {
            if (action.href) {
              window.location.assign(action.href)
              return
            }
            action.onPress?.()
          }}
        >
          {action.label}
        </Button>
      ))}
    </div>
  )
}
