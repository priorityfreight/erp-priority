"use client"

import { usePathname } from "next/navigation"

function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Dashboard"
  const segments = pathname.split("/").filter(Boolean)
  const last = segments[segments.length - 1] ?? ""
  return last.charAt(0).toUpperCase() + last.slice(1)
}

export function Topbar() {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <header className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#FFFFFF]/70 px-6 py-3 backdrop-blur">
      <div className="flex flex-col">
        <span className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
          Module
        </span>
        <span className="text-lg font-semibold text-[#111827]">{title}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center rounded-md border border-[#E5E7EB] bg-white px-3 py-1 text-sm text-[#6B7280] shadow-sm sm:flex">
          <span className="mr-2 text-xs text-[#9CA3AF]">Search</span>
          <span className="text-xs text-[#D1D5DB]">⌘K</span>
        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#111827] text-xs font-semibold text-white">
          PL
        </div>
      </div>
    </header>
  )
}

