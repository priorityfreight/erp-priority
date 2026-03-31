"use client"

import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonGroupVariants = cva("inline-flex items-center gap-2", {
  variants: {
    variant: {
      default: "rounded-[20px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.78)] p-1.5",
      ghost: "gap-1",
    },
    orientation: {
      horizontal: "flex-row",
      vertical: "flex-col items-stretch",
    },
  },
  defaultVariants: {
    variant: "default",
    orientation: "horizontal",
  },
})

function ButtonGroup({
  className,
  variant,
  orientation,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) {
  return (
    <div
      data-slot="button-group"
      className={cn(buttonGroupVariants({ variant, orientation }), className)}
      {...props}
    />
  )
}

export { ButtonGroup, buttonGroupVariants }
