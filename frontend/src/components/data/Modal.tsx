import type { ReactNode } from "react"
import { PriorityDialog } from "@/components/priority/PriorityDialog"
import { Button } from "@/components/ui/button"

type ModalProps = {
  title: string
  description?: string
  onClose: () => void
  size?: "compact" | "standard" | "workspace"
  headerActions?: ReactNode
  children: ReactNode
}

export function Modal({ title, description, onClose, size = "standard", headerActions, children }: ModalProps) {
  return (
    <PriorityDialog
      open
      title={title}
      description={description}
      size={size}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
      headerActions={
        <div className="flex items-center gap-3">
          {headerActions}
          <Button
            type="button"
            variant="secondary"
            className="min-w-[110px] border border-[rgba(11,31,59,0.12)] bg-[rgba(11,31,59,0.07)] text-[var(--brand-navy)] hover:bg-[rgba(11,31,59,0.12)]"
            onClick={onClose}
          >
            Cerrar
          </Button>
        </div>
      }
    >
      {children}
    </PriorityDialog>
  )
}
