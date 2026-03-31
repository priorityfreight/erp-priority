"use client"

import * as React from "react"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function ToggleGroup({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & {
  variant?: "default" | "outline"
}) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      className={cn(
        "inline-flex items-center gap-2 rounded-[20px] p-1",
        variant === "default"
          ? "bg-[rgba(11,31,59,0.06)]"
          : "border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.85)]",
        className
      )}
      {...props}
    />
  )
}

function ToggleGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-[16px] px-4 text-sm font-semibold text-[#6B7B90] transition hover:text-[var(--brand-navy)] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none data-[state=on]:bg-white data-[state=on]:text-[var(--brand-navy)] data-[state=on]:shadow-[0_14px_28px_-24px_rgba(3,10,24,0.45)] disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem }
