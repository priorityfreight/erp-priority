"use client"

import { cn } from "@/lib/utils"

export type PriorityLaneTone =
  | "neutral"
  | "info"
  | "warning"
  | "success"
  | "danger"
  | "spotlight"

export type PriorityStatusLaneItem = {
  key: string
  label: string
  count: number
  helper?: string
  tone?: PriorityLaneTone
}

const laneToneStyles: Record<PriorityLaneTone, string> = {
  neutral:
    "border-[rgba(11,31,59,0.12)] bg-[rgba(255,255,255,0.96)] text-[var(--brand-navy)]",
  info:
    "border-[rgba(37,99,235,0.16)] bg-[rgba(239,246,255,0.95)] text-[#1D4ED8]",
  warning:
    "border-[rgba(234,179,8,0.2)] bg-[rgba(254,249,195,0.96)] text-[#A16207]",
  success:
    "border-[rgba(5,150,105,0.2)] bg-[rgba(236,253,245,0.96)] text-[#047857]",
  danger:
    "border-[rgba(220,38,38,0.18)] bg-[rgba(254,242,242,0.96)] text-[#B91C1C]",
  spotlight:
    "border-[rgba(179,58,91,0.18)] bg-[rgba(253,242,248,0.96)] text-[var(--brand-burgundy)]",
}

export function PriorityStatusLanes({
  lanes,
  activeKey,
  onChange,
  showHelpers = true,
  className,
}: {
  lanes: PriorityStatusLaneItem[]
  activeKey: string
  onChange: (key: string) => void
  showHelpers?: boolean
  className?: string
}) {
  return (
    <div className={cn("grid gap-3 xl:grid-cols-4", className)}>
      {lanes.map((lane) => {
        const isActive = lane.key === activeKey
        const tone = lane.tone ?? "neutral"

        return (
          <button
            key={lane.key}
            type="button"
            onClick={() => onChange(lane.key)}
            className={cn(
              "group text-left rounded-[22px] border px-4 py-3.5 shadow-[0_18px_36px_-30px_rgba(3,10,24,0.24)] transition hover:-translate-y-[1px]",
              laneToneStyles[tone],
              isActive
                ? "ring-2 ring-[rgba(11,31,59,0.14)] shadow-[0_24px_48px_-32px_rgba(3,10,24,0.32)]"
                : "opacity-92 hover:opacity-100"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-[0.8rem] font-semibold uppercase tracking-[0.16em] opacity-70">
                  {lane.label}
                </div>
                {showHelpers && lane.helper ? (
                  <div className="max-w-[28ch] text-sm leading-6 opacity-80">{lane.helper}</div>
                ) : null}
              </div>
              <div className="rounded-full bg-[rgba(255,255,255,0.72)] px-2.5 py-1 text-sm font-semibold shadow-sm">
                {lane.count}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
