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
  density?: "default" | "compact"
}

export function PriorityEmptyState({
  title,
  description,
  action,
  icon,
  className,
  variant = "default",
  density = "default",
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
        density === "compact"
          ? "rounded-[20px] border border-dashed border-[var(--border-subtle)] bg-[rgba(255,255,255,0.76)] px-5 py-8 shadow-[0_18px_36px_-30px_rgba(3,10,24,0.22)]"
          : "rounded-[24px] border border-dashed border-[var(--border-subtle)] bg-[rgba(255,255,255,0.72)] px-6 py-10 shadow-[0_24px_48px_-36px_rgba(3,10,24,0.28)]",
        className
      )}
    >
      <EmptyHeader className={cn("max-w-xl", density === "compact" ? "gap-2.5" : "gap-3")}>
        <EmptyMedia
          variant="icon"
          className={cn(
            density === "compact" ? "mb-0 size-12 rounded-[18px] [&_svg]:size-5" : "mb-0 size-14 rounded-2xl [&_svg]:size-6",
            mediaTone
          )}
        >
          {icon ?? fallbackIcon}
        </EmptyMedia>
        <EmptyTitle className={cn("font-semibold text-[var(--brand-navy)]", density === "compact" ? "text-base" : "text-lg")}>{title}</EmptyTitle>
        <EmptyDescription className={cn("max-w-xl text-[#5B6A7D]", density === "compact" ? "text-sm leading-6" : "text-sm leading-7")}>
          {description}
        </EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent className="mt-2">{action}</EmptyContent> : null}
    </Empty>
  )
}
