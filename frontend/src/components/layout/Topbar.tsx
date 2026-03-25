"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { getCurrentErpUser, signOutCurrentUser, type CurrentErpUser } from "@/lib/auth"
import { Brand } from "./Brand"

function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Dashboard"
  const segments = pathname.split("/").filter(Boolean)
  const last = segments[segments.length - 1] ?? ""
  return last.charAt(0).toUpperCase() + last.slice(1)
}

type TopbarProps = {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  onToggleMobileSidebar: () => void
}

export function Topbar({
  sidebarCollapsed,
  onToggleSidebar,
  onToggleMobileSidebar,
}: TopbarProps) {
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

    void loadCurrentUser()

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
    <header className="relative border-b border-white/10 bg-[rgba(7,16,32,0.4)] px-4 py-4 backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-sm font-semibold text-white lg:hidden"
            aria-label="Abrir menu"
          >
            ≡
          </button>
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden h-11 items-center gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand-light-gray)] hover:bg-white/10 lg:flex"
          >
            <span>{sidebarCollapsed ? "Expandir" : "Contraer"}</span>
          </button>
          <div className="rounded-2xl border border-white/10 bg-white/6 px-3 py-2 lg:hidden">
            <Brand compact light />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--brand-gray)]">
              Module
            </span>
            <span className="text-lg font-semibold text-white">{title}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center rounded-2xl border border-white/10 bg-white/8 px-4 py-2 text-sm text-[var(--brand-soft-gray)] shadow-sm sm:flex">
            <span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--brand-gray)]">
              Search
            </span>
            <span className="text-xs text-white/50">⌘K</span>
          </div>

          <div className="hidden text-right md:block">
            <div className="text-sm font-medium text-white">
              {currentUser
                ? [currentUser.first_name, currentUser.last_name].filter(Boolean).join(" ") ||
                  currentUser.username ||
                  currentUser.email
                : "ERP User"}
            </div>
            <div className="text-[11px] uppercase tracking-[0.26em] text-[var(--brand-gray)]">
              {currentUser?.role_name || "Sin rol"}
            </div>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,_#B33A5B,_#800020)] text-xs font-semibold text-white shadow-[0_14px_28px_-16px_rgba(179,58,91,0.9)]">
            {initials}
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="rounded-2xl border border-white/10 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand-light-gray)] transition hover:border-[rgba(179,58,91,0.45)] hover:bg-[rgba(179,58,91,0.16)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {signingOut ? "Saliendo..." : "Salir"}
          </button>
        </div>
      </div>
    </header>
  )
}
