"use client"

import Image from "next/image"

type BrandProps = {
  compact?: boolean
  showTagline?: boolean
  light?: boolean
}

export function Brand({ compact = false }: BrandProps) {
  const verticalLogo = "/assets/logo-vertical-dark-transparent.png"

  if (compact) {
    return (
      <div className="flex items-center justify-center">
        <Image
          src={verticalLogo}
          alt="Priority Freight Intelligence"
          width={64}
          height={64}
          className="h-14 w-14 object-contain"
          unoptimized
          priority
        />
      </div>
    )
  }

  return (
    <div className="flex items-center">
      <Image
        src={verticalLogo}
        alt="Priority Freight Intelligence"
        width={420}
        height={420}
        className="h-auto w-full max-w-[8.75rem] object-contain"
        unoptimized
        priority
      />
    </div>
  )
}
