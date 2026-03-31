"use client"

import { toast } from "sonner"

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function notifyError(message: string, description?: string) {
  toast.error(message, description ? { description } : undefined)
}

export function notifySuccess(message: string, description?: string) {
  toast.success(message, description ? { description } : undefined)
}

export function notifyInfo(message: string, description?: string) {
  toast.info(message, description ? { description } : undefined)
}

export function notifyWarning(message: string, description?: string) {
  toast.warning(message, description ? { description } : undefined)
}
