"use client"

import { useState, type ReactNode } from "react"
import { SlidersHorizontalIcon } from "lucide-react"
import { Dialog, DialogTrigger, Popover } from "react-aria-components"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PriorityModalShell } from "./PriorityModalShell"

type PriorityFilterPopoverProps = {
  title: string
  description?: string
  activeCount?: number
  children: ReactNode
  onApply?: () => void
  onClear?: () => void
  saveAction?: ReactNode
  className?: string
  presentation?: "popover" | "modal"
  modalClassName?: string
}

export function PriorityFilterPopover({
  title,
  description,
  activeCount = 0,
  children,
  onApply,
  onClear,
  saveAction,
  className,
  presentation = "popover",
  modalClassName,
}: PriorityFilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (presentation === "modal") {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          className={cn("min-w-[148px] justify-between", className)}
          onClick={() => setIsOpen(true)}
        >
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontalIcon className="size-4" />
            Filtros
          </span>
          {activeCount > 0 ? (
            <span className="rounded-full bg-[rgba(11,31,59,0.08)] px-2 py-0.5 text-xs font-semibold text-[var(--brand-navy)]">
              {activeCount}
            </span>
          ) : null}
        </Button>

        <PriorityModalShell
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          title={title}
          description={description}
          className={cn("w-[min(94vw,880px)]", modalClassName)}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>{saveAction}</div>
              <div className="flex flex-wrap items-center gap-2">
                {onClear ? (
                  <Button type="button" variant="ghost" onClick={onClear}>
                    Limpiar
                  </Button>
                ) : null}
                <Button
                  type="button"
                  onClick={() => {
                    onApply?.()
                    setIsOpen(false)
                  }}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-3">{children}</div>
        </PriorityModalShell>
      </>
    )
  }

  return (
    <DialogTrigger>
      <Button type="button" variant="outline" className={cn("min-w-[148px] justify-between", className)}>
        <span className="inline-flex items-center gap-2">
          <SlidersHorizontalIcon className="size-4" />
          Filtros
        </span>
        {activeCount > 0 ? (
          <span className="rounded-full bg-[rgba(11,31,59,0.08)] px-2 py-0.5 text-xs font-semibold text-[var(--brand-navy)]">
            {activeCount}
          </span>
        ) : null}
      </Button>
      <Popover
        offset={10}
        className="z-[75] w-[min(92vw,420px)] rounded-[24px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.98)] p-0 shadow-[0_32px_80px_-38px_rgba(3,10,24,0.42)]"
      >
        <Dialog className="outline-none">
          {({ close }) => (
            <div className="space-y-4 p-4">
              <div className="space-y-1">
                <h3 className="text-[1rem] font-semibold text-[var(--brand-navy)]">{title}</h3>
                {description ? (
                  <p className="text-sm leading-6 text-[#607187]">{description}</p>
                ) : null}
              </div>

              <div className="space-y-3">{children}</div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(144,158,174,0.16)] pt-3">
                <div>{saveAction}</div>
                <div className="flex flex-wrap items-center gap-2">
                  {onClear ? (
                    <Button type="button" variant="ghost" onClick={onClear}>
                      Limpiar
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    onClick={() => {
                      onApply?.()
                      close()
                    }}
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  )
}
