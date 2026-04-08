"use client"

import type { ReactNode } from "react"
import { XIcon } from "lucide-react"
import {
  Dialog,
  Heading,
  Modal as AriaModal,
  ModalOverlay,
} from "react-aria-components"
import { Button } from "@/components/ui/button"

export function PriorityModalShell({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(7,18,34,0.48)] p-4 backdrop-blur-[2px]"
    >
      <AriaModal className={`w-[min(92vw,640px)] rounded-[28px] border border-[rgba(144,158,174,0.18)] bg-white shadow-[0_36px_96px_-40px_rgba(3,10,24,0.44)] outline-none ${className ?? ""}`}>
        <Dialog className="outline-none">
          {({ close }) => (
            <div className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Heading slot="title" className="text-[1.3rem] font-semibold text-[var(--brand-navy)]">
                    {title}
                  </Heading>
                  {description ? (
                    <p className="max-w-[56ch] text-sm leading-6 text-[#607187]">{description}</p>
                  ) : null}
                </div>
                <Button type="button" variant="ghost" size="icon-sm" onClick={close} aria-label="Cerrar modal">
                  <XIcon className="size-4" />
                </Button>
              </div>
              <div>{children}</div>
              {footer ? <div className="border-t border-[rgba(144,158,174,0.16)] pt-4">{footer}</div> : null}
            </div>
          )}
        </Dialog>
      </AriaModal>
    </ModalOverlay>
  )
}
