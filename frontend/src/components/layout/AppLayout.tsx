"use client"

import type { ReactNode } from "react"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"

type AppLayoutProps = {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[#F9FAFB] text-[#111827]">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-6 lg:p-10">{children}</main>
      </div>
    </div>
  )
}

