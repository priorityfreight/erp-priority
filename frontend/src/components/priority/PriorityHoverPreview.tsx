"use client"

import type { ReactNode } from "react"

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { PriorityTypography } from "@/components/priority/PriorityTypography"

type PriorityHoverPreviewProps = {
  trigger: ReactNode
  eyebrow?: string
  title: string
  description?: ReactNode
  lines?: Array<{
    label: string
    value: ReactNode
  }>
}

export function PriorityHoverPreview({
  trigger,
  eyebrow,
  title,
  description,
  lines = [],
}: PriorityHoverPreviewProps) {
  return (
    <HoverCard openDelay={120} closeDelay={120}>
      <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
      <HoverCardContent
        align="start"
        className="w-[22rem] rounded-[22px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.98)] p-4 shadow-[0_24px_48px_-36px_rgba(3,10,24,0.45)]"
      >
        {eyebrow ? <PriorityTypography variant="eyebrow">{eyebrow}</PriorityTypography> : null}
        <PriorityTypography variant="cardTitle" className="mt-1">
          {title}
        </PriorityTypography>
        {description ? (
          <PriorityTypography variant="bodyMuted" className="mt-2">
            {description}
          </PriorityTypography>
        ) : null}
        {lines.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {lines.map((line) => (
              <div key={line.label} className="rounded-[16px] border border-[rgba(144,158,174,0.16)] bg-[rgba(11,31,59,0.04)] px-3 py-2.5">
                <PriorityTypography variant="fieldLabel">{line.label}</PriorityTypography>
                <PriorityTypography variant="body" className="mt-1 leading-6">
                  {line.value}
                </PriorityTypography>
              </div>
            ))}
          </div>
        ) : null}
      </HoverCardContent>
    </HoverCard>
  )
}
