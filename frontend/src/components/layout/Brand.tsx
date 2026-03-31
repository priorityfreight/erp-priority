"use client"

import { brandIdentity } from "@/lib/brand"

type BrandProps = {
  compact?: boolean
  showTagline?: boolean
  light?: boolean
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={[
        "relative shrink-0 overflow-hidden rounded-[1.35rem] border border-white/12 bg-[linear-gradient(145deg,_rgba(179,58,91,0.95),_rgba(11,31,59,0.95))] shadow-[0_18px_38px_-24px_rgba(8,20,38,0.95)]",
        compact ? "h-[3.35rem] w-[3.35rem]" : "h-[4.2rem] w-[4.2rem]",
      ].join(" ")}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.22),_transparent_36%)]" />
      <div className="absolute left-[18%] top-[22%] h-[24%] w-[24%] rounded-full bg-white/90" />
      <div className="absolute bottom-[22%] left-[18%] h-[14%] w-[50%] rounded-full bg-white/88" />
      <div className="absolute right-[18%] top-[26%] h-[48%] w-[16%] rounded-full bg-[rgba(215,222,231,0.9)]" />
      <div className="absolute bottom-[22%] left-[38%] h-[10%] w-[28%] rounded-full bg-[rgba(207,207,207,0.72)]" />
    </div>
  )
}

export function Brand({ compact = false, showTagline = false, light = false }: BrandProps) {
  const titleColor = light ? "text-white" : "text-[var(--brand-navy)]"
  const subtitleColor = light ? "text-[var(--brand-soft-gray)]" : "text-[#526175]"
  const eyebrowColor = light ? "text-white/70" : "text-[#6B7280]"

  if (compact) {
    return (
      <div className="flex min-w-0 items-center justify-center">
        <BrandMark compact />
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex min-w-0 items-center gap-4">
        <BrandMark />
        <div className="min-w-0">
          <div className={`text-[1.05rem] font-semibold leading-none tracking-[0.06em] ${titleColor}`}>
            Priority Freight
          </div>
          <div className={`mt-2 text-[1rem] font-medium leading-none tracking-[0.08em] ${subtitleColor}`}>
            Intelligence
          </div>
          <div
            className={`mt-3 text-[10px] font-semibold uppercase tracking-[0.28em] ${eyebrowColor}`}
          >
            {brandIdentity.appName}
          </div>
        </div>
      </div>
      {showTagline ? (
        <div
          className={`mt-4 pl-[5.2rem] text-[10px] font-semibold uppercase tracking-[0.28em] ${subtitleColor}`}
        >
          {brandIdentity.tagline}
        </div>
      ) : null}
    </div>
  )
}
