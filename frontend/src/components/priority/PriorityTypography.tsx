import type { ReactNode } from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const typographyVariants = cva("text-[var(--brand-navy)]", {
  variants: {
    variant: {
      pageTitle: "text-[clamp(1.9rem,3vw,2.7rem)] font-semibold tracking-[-0.03em] text-balance",
      sectionTitle: "text-[1.65rem] font-semibold tracking-[-0.022em] text-balance",
      cardTitle: "text-[1.08rem] font-semibold tracking-[-0.015em] text-balance",
      eyebrow: "text-[11px] font-semibold uppercase tracking-[0.2em] text-[#66788D]",
      body: "text-[0.95rem] leading-7 text-[var(--brand-navy)]",
      bodyMuted: "text-[0.95rem] leading-7 text-[#5B6A7D]",
      fieldLabel: "text-[11px] font-semibold uppercase tracking-[0.12em] text-[#526175]",
      dataValue: "text-base font-semibold text-[var(--brand-navy)] [font-variant-numeric:tabular-nums]",
      tableHeader: "text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5B6A7D]",
      caption: "text-xs leading-6 text-[#7A8BA1]",
    },
  },
  defaultVariants: {
    variant: "body",
  },
})

type PriorityTypographyProps = {
  children: ReactNode
  className?: string
  as?: "div" | "p" | "span" | "h1" | "h2" | "h3"
} & VariantProps<typeof typographyVariants>

export function PriorityTypography({
  children,
  className,
  variant,
  as = "div",
}: PriorityTypographyProps) {
  const Comp = as
  return <Comp className={cn(typographyVariants({ variant }), className)}>{children}</Comp>
}

export function PriorityPageTitle({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <PriorityTypography as="h1" variant="pageTitle" className={className}>
      {children}
    </PriorityTypography>
  )
}

export function PrioritySectionTitle({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <PriorityTypography as="h2" variant="sectionTitle" className={className}>
      {children}
    </PriorityTypography>
  )
}

export function PriorityCardTitle({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <PriorityTypography as="h3" variant="cardTitle" className={className}>
      {children}
    </PriorityTypography>
  )
}
