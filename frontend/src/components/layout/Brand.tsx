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
          src="/assets/logo-app-transparent.png"
          alt="Priority Freight Intelligence"
          width={56}
          height={56}
          className="h-12 w-12 object-contain"
          priority
        />
      </div>
    )
  }

  return (
    <div className="flex items-center">
      <Image
        src="/assets/logo-horizontal-transparent.png"
        alt="Priority Freight Intelligence"
        width={700}
        height={180}
        className="h-auto w-full max-w-[15.75rem] object-contain"
        priority
      />
    </div>
  )
}
