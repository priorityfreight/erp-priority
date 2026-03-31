"use client"

import type { ReactNode } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={120}>
      {children}
      <Toaster
        position="top-right"
        expand
        richColors
        closeButton
        duration={4200}
      />
    </TooltipProvider>
  )
}
