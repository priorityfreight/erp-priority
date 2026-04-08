"use client"

import { useEffect, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { PriorityCommandBar } from "@/components/priority/PriorityCommandBar"
import { Topbar } from "./Topbar"

type AppLayoutProps = {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const [commandBarOpen, setCommandBarOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setCommandBarOpen((current) => !current)
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  if (pathname === "/login") {
    return <>{children}</>
  }

  return (
    <div className="relative min-h-screen bg-transparent text-[#111827]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(179,58,91,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(144,158,174,0.14),_transparent_24%)]" />
      <div className="relative flex min-h-screen flex-col">
        <Topbar onOpenCommandBar={() => setCommandBarOpen(true)} />
        <main className="mx-auto flex w-full max-w-[96rem] flex-1 flex-col px-3 pb-5 pt-3 sm:px-5 sm:pb-6 sm:pt-4 lg:px-6 lg:pb-7 lg:pt-5 xl:px-7">
          {children}
        </main>
      </div>
      <PriorityCommandBar open={commandBarOpen} onOpenChange={setCommandBarOpen} />
    </div>
  )
}
