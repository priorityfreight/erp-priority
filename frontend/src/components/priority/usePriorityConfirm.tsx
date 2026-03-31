"use client"

import { AlertTriangleIcon } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type ConfirmOptions = {
  title: string
  description?: string
  actionLabel?: string
  cancelLabel?: string
  variant?: "default" | "destructive"
}

const defaultOptions: Required<Pick<ConfirmOptions, "actionLabel" | "cancelLabel" | "variant">> = {
  actionLabel: "Continuar",
  cancelLabel: "Cancelar",
  variant: "destructive",
}

export function usePriorityConfirm(initialOptions?: Partial<ConfirmOptions>) {
  const resolverRef = useRef<((result: boolean) => void) | null>(null)
  const [options, setOptions] = useState<ConfirmOptions>({
    title: "",
    description: "",
    ...defaultOptions,
    ...initialOptions,
  })
  const [open, setOpen] = useState(false)

  const resolveConfirmation = useCallback((result: boolean) => {
    resolverRef.current?.(result)
    resolverRef.current = null
    setOpen(false)
  }, [])

  const confirm = useCallback(
    (nextOptions: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolverRef.current = resolve
        setOptions({
          ...defaultOptions,
          ...initialOptions,
          ...nextOptions,
        })
        setOpen(true)
      }),
    [initialOptions]
  )

  useEffect(
    () => () => {
      resolverRef.current?.(false)
      resolverRef.current = null
    },
    []
  )

  const confirmDialog = (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resolveConfirmation(false)
        }
      }}
    >
      <AlertDialogContent
        className="rounded-[28px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(244,246,249,0.96)_100%)] p-0 text-[var(--brand-navy)] shadow-[0_36px_80px_-36px_rgba(3,10,24,0.55)]"
      >
        <AlertDialogHeader className="px-6 pt-6 text-left sm:place-items-start sm:text-left">
          <AlertDialogMedia className="bg-[rgba(179,58,91,0.08)] text-[var(--brand-burgundy)]">
            <AlertTriangleIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>{options.title}</AlertDialogTitle>
          <AlertDialogDescription>{options.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="rounded-b-[28px] border-t border-[var(--border-subtle)] bg-[rgba(11,31,59,0.03)] px-6 py-4">
          <AlertDialogCancel>{options.cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={options.variant}
            onClick={() => resolveConfirmation(true)}
          >
            {options.actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return {
    confirm,
    confirmDialog,
  }
}
