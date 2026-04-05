"use client"

import type { ReactNode } from "react"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

export function PriorityKanbanCard(props: {
  title?: ReactNode
  subtitle?: ReactNode
  description?: ReactNode
  badges?: ReactNode
  meta?: ReactNode
  footer?: ReactNode
  actions?: ReactNode
  onMovePrev?: (() => void) | undefined
  onMoveNext?: (() => void) | undefined
  movePrevLabel?: string
  moveNextLabel?: string
  isDragging?: boolean
  isMoving?: boolean
  className?: string
}) {
  const {
    title,
    subtitle,
    description,
    badges,
    meta,
    footer,
    actions,
    isDragging = false,
    isMoving = false,
    className,
  } = props

  return (
    <article
      className={cn(
        "space-y-3 rounded-[20px] border border-[rgba(144,158,174,0.16)] bg-white p-4 shadow-[0_18px_36px_-28px_rgba(3,10,24,0.34)] transition-all",
        isDragging ? "opacity-70 ring-2 ring-[rgba(179,58,91,0.22)]" : "hover:-translate-y-[1px]",
        isMoving ? "opacity-70 saturate-75" : "",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <GripVertical className="mt-1 size-4 shrink-0 text-[#8da0b6]" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-1">
          {title ? (
            <div className="min-w-0 text-[0.98rem] font-semibold tracking-[-0.02em] text-[var(--brand-navy)]">
              {title}
            </div>
          ) : null}
          {subtitle ? (
            <div
              className={cn(
                "text-[#607187]",
                title ? "text-sm" : "text-[0.98rem] font-semibold tracking-[-0.02em] text-[var(--brand-navy)]"
              )}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>

      {badges ? <div className="flex flex-wrap gap-2">{badges}</div> : null}
      {description ? <div className="text-sm leading-6 text-[#607187]">{description}</div> : null}
      {meta ? <div className="rounded-[16px] bg-[rgba(248,250,252,0.9)] px-3 py-2 text-sm text-[var(--brand-navy)]">{meta}</div> : null}
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      {footer ? <div className="border-t border-[rgba(144,158,174,0.14)] pt-3 text-xs text-[#607187]">{footer}</div> : null}
    </article>
  )
}
