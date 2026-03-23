"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { getCurrentErpUser, signOutCurrentUser, type CurrentErpUser } from "@/lib/auth"

function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Dashboard"
  const segments = pathname.split("/").filter(Boolean)
  const last = segments[segments.length - 1] ?? ""
  return last.charAt(0).toUpperCase() + last.slice(1)
}

export function Topbar() {
  const pathname = usePathname()
  const title = getPageTitle(pathname)
  const [currentUser, setCurrentUser] = useState<CurrentErpUser | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadCurrentUser() {
      try {
        const user = await getCurrentErpUser()

        if (!cancelled) {
          setCurrentUser(user)
        }
      } catch {
        if (!cancelled) {
          setCurrentUser(null)
        }
      }
    }

    loadCurrentUser()

    return () => {
      cancelled = true
    }
  }, [])

  const initials = [currentUser?.first_name, currentUser?.last_name]
    .filter(Boolean)
    .map((value) => String(value).charAt(0).toUpperCase())
    .join("")
    .slice(0, 2) || "PL"

  async function handleSignOut() {
    setSigningOut(true)

    try {
      await signOutCurrentUser()
      window.location.href = "/login"
    } finally {
      setSigningOut(false)
    }
  }

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

        <div className="hidden text-right md:block">
          <div className="text-sm font-medium text-[#111827]">
            {currentUser
              ? [currentUser.first_name, currentUser.last_name].filter(Boolean).join(" ") || currentUser.username || currentUser.email
              : "ERP User"}
          </div>
          <div className="text-xs uppercase tracking-wide text-[#94A3B8]">
            {currentUser?.role_name || "Sin rol"}
          </div>
        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#111827] text-xs font-semibold text-white">
          {initials}
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#334155] transition hover:border-[#CBD5E1] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {signingOut ? "Saliendo..." : "Salir"}
        </button>
      </div>
    </header>
  )
}
