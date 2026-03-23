"use client"

type BrandProps = {
  compact?: boolean
  showTagline?: boolean
  light?: boolean
}

function BrandMark({ light = false }: { light?: boolean }) {
  const techColor = light ? "#C8D2DD" : "#909EAE"
  const lineColor = light ? "#E5E5E5" : "#0B1F3B"

  return (
    <svg
      viewBox="0 0 84 84"
      aria-hidden="true"
      className="h-12 w-12 shrink-0"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="priority-burgundy" x1="10" y1="8" x2="42" y2="68" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B33A5B" />
          <stop offset="1" stopColor="#800020" />
        </linearGradient>
        <linearGradient id="priority-metal" x1="42" y1="8" x2="72" y2="70" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D7DEE7" />
          <stop offset="1" stopColor={techColor} />
        </linearGradient>
        <linearGradient id="priority-orbit" x1="8" y1="55" x2="76" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B33A5B" />
          <stop offset="1" stopColor="#C7D2E0" />
        </linearGradient>
      </defs>

      <path
        d="M13 53C25 20 48 11 66 12C72 12 76 14 76 17C76 21 70 20 66 20C53 20 34 28 20 56C17 62 11 66 8 64C5 62 8 58 13 53Z"
        fill="url(#priority-orbit)"
      />

      <path
        d="M18 13C24 10 32 10 36 14C40 18 38 25 32 29C27 32 24 36 25 40C26 44 29 47 35 49C40 51 41 56 37 61C33 66 23 67 18 62C11 55 10 43 11 34C12 25 13 16 18 13Z"
        fill="url(#priority-burgundy)"
      />
      <path d="M22 25C24 22 28 20 31 20" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M21 37C24 34 29 33 33 34" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M21 50C24 47 29 46 33 47" stroke="white" strokeWidth="3.5" strokeLinecap="round" />

      <path
        d="M43 14C49 10 58 10 64 15C70 20 72 28 72 38C72 49 68 57 61 61C54 65 46 65 43 60V14Z"
        fill="url(#priority-metal)"
      />
      <path d="M50 23H58" stroke={lineColor} strokeWidth="3" strokeLinecap="round" />
      <path d="M50 23L45 31" stroke={lineColor} strokeWidth="3" strokeLinecap="round" />
      <path d="M58 23L63 31" stroke={lineColor} strokeWidth="3" strokeLinecap="round" />
      <path d="M45 31L53 39" stroke={lineColor} strokeWidth="3" strokeLinecap="round" />
      <path d="M63 31L55 39" stroke={lineColor} strokeWidth="3" strokeLinecap="round" />
      <path d="M53 39L48 49" stroke={lineColor} strokeWidth="3" strokeLinecap="round" />
      <path d="M55 39L63 45" stroke={lineColor} strokeWidth="3" strokeLinecap="round" />
      <circle cx="45" cy="31" r="4.5" fill="white" stroke={lineColor} strokeWidth="2.5" />
      <circle cx="63" cy="31" r="4.5" fill="white" stroke={lineColor} strokeWidth="2.5" />
      <circle cx="54" cy="39" r="4.5" fill="white" stroke={lineColor} strokeWidth="2.5" />
      <circle cx="48" cy="49" r="4.5" fill="white" stroke={lineColor} strokeWidth="2.5" />
      <circle cx="63" cy="45" r="4.5" fill="white" stroke={lineColor} strokeWidth="2.5" />
    </svg>
  )
}

export function Brand({ compact = false, showTagline = true, light = false }: BrandProps) {
  const titleColor = light ? "text-white" : "text-[var(--brand-navy)]"
  const subtitleColor = light ? "text-[var(--brand-soft-gray)]" : "text-[var(--brand-gray)]"

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <BrandMark light={light} />
        <div>
          <div className={`text-xl font-black tracking-[0.18em] ${titleColor}`}>PRIORITY</div>
          <div className={`text-[10px] font-semibold tracking-[0.42em] ${subtitleColor}`}>
            FREIGHT INTELLIGENCE
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <BrandMark light={light} />
      <div className="space-y-2">
        <div className={`text-4xl font-black tracking-[0.18em] sm:text-5xl ${titleColor}`}>
          PRIORITY
        </div>
        <div className={`text-sm font-semibold tracking-[0.44em] sm:text-base ${subtitleColor}`}>
          FREIGHT INTELLIGENCE
        </div>
        {showTagline ? (
          <div className={`text-xs font-semibold tracking-[0.34em] sm:text-sm ${subtitleColor}`}>
            SMARTER · BETTER · FASTER
          </div>
        ) : null}
      </div>
    </div>
  )
}
