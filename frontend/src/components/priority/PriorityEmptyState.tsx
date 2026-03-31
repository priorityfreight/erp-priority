import type { ReactNode } from "react"
import { AlertTriangleIcon, InboxIcon, SearchIcon, ShieldAlertIcon } from "lucide-react"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"

type PriorityEmptyStateProps = {
  title: string
  description: ReactNode
  action?: ReactNode
  icon?: ReactNode
  className?: string
  variant?: "default" | "search" | "blocked" | "error"
}

export function PriorityEmptyState({
  title,
  description,
  action,
  icon,
  className,
  variant = "default",
}: PriorityEmptyStateProps) {
  const fallbackIcon = {
    default: <InboxIcon />,
    search: <SearchIcon />,
    blocked: <ShieldAlertIcon />,
    error: <AlertTriangleIcon />,
  }[variant]

  const mediaTone = {
    default: "border-[rgba(179,58,91,0.18)] bg-[rgba(179,58,91,0.08)] text-[var(--brand-burgundy)]",
    search: "border-[rgba(37,99,235,0.18)] bg-[rgba(37,99,235,0.08)] text-[#1D4ED8]",
    blocked: "border-[rgba(234,179,8,0.2)] bg-[rgba(234,179,8,0.1)] text-[#A16207]",
    error: "border-[rgba(220,38,38,0.18)] bg-[rgba(220,38,38,0.08)] text-[#B91C1C]",
  }[variant]

  return (
    <Empty
      className={cn(
        "rounded-[24px] border border-dashed border-[var(--border-subtle)] bg-[rgba(255,255,255,0.62)] px-6 py-10 shadow-[0_24px_48px_-36px_rgba(3,10,24,0.35)]",
        className
      )}
    >
      <EmptyHeader className="max-w-xl gap-3">
        <EmptyMedia
          variant="icon"
          className={cn("mb-0 size-14 rounded-2xl [&_svg]:size-6", mediaTone)}
        >
          {icon ?? fallbackIcon}
        </EmptyMedia>
        <EmptyTitle className="text-lg font-semibold text-[var(--brand-navy)]">{title}</EmptyTitle>
        <EmptyDescription className="max-w-xl text-sm leading-7 text-[#5B6A7D]">
          {description}
        </EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent className="mt-2">{action}</EmptyContent> : null}
    </Empty>
  )
}
