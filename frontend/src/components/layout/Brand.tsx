"use client"

import Image from "next/image"

type BrandProps = {
  compact?: boolean
  showTagline?: boolean
  light?: boolean
}

export function Brand({ compact = false }: BrandProps) {
  if (compact) {
    return (
      <div className="flex items-center justify-center">
        <Image
          src="/brand/priority-mark.svg"
          alt="Priority Freight Intelligence"
          width={48}
          height={48}
          className="h-12 w-12"
          priority
        />
      </div>
    )
  }

  return (
    <div className="flex items-center">
      <Image
        src="/brand/priority-wordmark.svg"
        alt="Priority Freight Intelligence"
        width={420}
        height={110}
        className="h-auto w-full max-w-[15.5rem]"
        priority
      />
    </div>
  )
}
