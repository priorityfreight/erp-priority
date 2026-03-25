"use client"

import { useEffect, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"

type AppLayoutProps = {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false
    }

    return window.localStorage.getItem("priority.sidebar.collapsed") === "true"
  })
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    window.localStorage.setItem("priority.sidebar.collapsed", String(sidebarCollapsed))
  }, [sidebarCollapsed])

  if (pathname === "/login") {
    return <>{children}</>
  }

  return (
    <div className="relative flex min-h-screen bg-transparent text-[#111827]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(179,58,91,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(144,158,174,0.14),_transparent_24%)]" />
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />
      <div className="relative flex min-h-screen flex-1 flex-col">
        <Topbar
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
          onToggleMobileSidebar={() => setMobileSidebarOpen((current) => !current)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 xl:p-10">{children}</main>
      </div>
    </div>
  )
}
