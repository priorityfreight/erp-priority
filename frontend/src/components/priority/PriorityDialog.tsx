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
  size?: "compact" | "standard" | "workspace"
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
  size = "standard",
  headerActions,
  footer,
  children,
  className,
  contentClassName,
}: PriorityDialogProps) {
  const sizeClassName =
    size === "compact"
      ? "w-[min(82vw,52rem)] max-w-none"
      : size === "workspace"
        ? "w-[min(92vw,108rem)] max-w-none"
        : "w-[min(86vw,90rem)] max-w-none"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "max-h-[93vh] overflow-hidden rounded-[30px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.99)_0%,_rgba(244,246,249,0.97)_100%)] p-0 text-[var(--brand-navy)] shadow-[0_36px_96px_-42px_rgba(3,10,24,0.72)] [--dialog-content-width:90rem]",
          sizeClassName,
          contentClassName
        )}
      >
        <div className={cn("flex max-h-[90vh] flex-col", className)}>
          <DialogHeader className="border-b border-[#E5E7EB] px-6 py-5 md:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-[1.15rem] font-semibold tracking-[0.01em] text-[var(--brand-navy)] md:text-[1.25rem]">
                  {title}
                </DialogTitle>
                {description ? (
                  <DialogDescription className="mt-1 text-sm leading-6 text-[#5B6A7D] md:max-w-3xl">
                    {description}
                  </DialogDescription>
                ) : null}
              </div>
              {headerActions ? <div className="shrink-0">{headerActions}</div> : null}
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 md:px-8">{children}</div>
          {footer ? (
            <DialogFooter className="border-t border-[#E5E7EB] bg-[rgba(11,31,59,0.03)] px-6 py-4 md:px-8 sm:justify-between">
              {footer}
            </DialogFooter>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
