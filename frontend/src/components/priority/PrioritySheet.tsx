"use client"

import type { ReactNode } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

type PrioritySheetProps = {
  open: boolean
  title: string
  description?: string
  onOpenChange: (open: boolean) => void
  children: ReactNode
  side?: "top" | "right" | "bottom" | "left"
  className?: string
}

export function PrioritySheet({
  open,
  title,
  description,
  onOpenChange,
  children,
  side = "right",
  className,
}: PrioritySheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          "w-full border-[var(--border-subtle)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.985)_0%,_rgba(244,246,249,0.96)_100%)] text-[var(--brand-navy)] shadow-[0_32px_80px_-36px_rgba(3,10,24,0.72)] sm:max-w-xl",
          className
        )}
      >
        <SheetHeader className="border-b border-[#E5E7EB] px-6 py-5 text-left">
          <SheetTitle className="text-xl font-semibold text-[var(--brand-navy)]">{title}</SheetTitle>
          {description ? (
            <SheetDescription className="text-sm leading-6 text-[#5B6A7D]">
              {description}
            </SheetDescription>
          ) : null}
        </SheetHeader>
        <div className="px-6 py-5">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
