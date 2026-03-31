"use client"

import type { ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type PriorityDialogProps = {
  open: boolean
  title: string
  description?: string
  onOpenChange: (open: boolean) => void
  headerActions?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}

export function PriorityDialog({
  open,
  title,
  description,
  onOpenChange,
  headerActions,
  footer,
  children,
  className,
  contentClassName,
}: PriorityDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "max-h-[92vh] w-[min(96vw,76rem)] max-w-5xl overflow-hidden rounded-[28px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.985)_0%,_rgba(244,246,249,0.96)_100%)] p-0 text-[var(--brand-navy)] shadow-[0_40px_120px_-40px_rgba(3,10,24,0.8)]",
          contentClassName
        )}
      >
        <div className={cn("flex max-h-[90vh] flex-col", className)}>
          <DialogHeader className="border-b border-[#E5E7EB] px-7 py-6 md:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-xl font-semibold tracking-[0.01em] text-[var(--brand-navy)]">
                  {title}
                </DialogTitle>
                {description ? (
                  <DialogDescription className="mt-1 text-sm leading-6 text-[#5B6A7D]">
                    {description}
                  </DialogDescription>
                ) : null}
              </div>
              {headerActions ? <div className="shrink-0">{headerActions}</div> : null}
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6 md:px-8">{children}</div>
          {footer ? (
            <DialogFooter className="border-t border-[#E5E7EB] bg-[rgba(11,31,59,0.03)] px-7 py-4 md:px-8 sm:justify-between">
              {footer}
            </DialogFooter>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
