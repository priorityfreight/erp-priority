"use client"

import type { ReactNode } from "react"
import { Tooltip as AriaTooltip, TooltipTrigger } from "react-aria-components"

export function PriorityTooltip({
  content,
  children,
}: {
  content: ReactNode
  children: ReactNode
}) {
  return (
    <TooltipTrigger delay={300}>
      {children}
      <AriaTooltip className="z-[95] rounded-[14px] border border-[rgba(11,31,59,0.12)] bg-[rgba(17,24,39,0.96)] px-3 py-2 text-xs font-medium text-white shadow-[0_18px_36px_-24px_rgba(3,10,24,0.46)]">
        {content}
      </AriaTooltip>
    </TooltipTrigger>
  )
}
