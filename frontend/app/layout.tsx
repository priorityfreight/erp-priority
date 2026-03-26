import "./globals.css"
import type { ReactNode } from "react"
import type { Metadata } from "next"
import { AppLayout } from "@/components/layout/AppLayout"

export const metadata: Metadata = {
  title: "Priority Freight Intelligence ERP",
  description: "Corporate ERP for freight intelligence, CRM, pricing, quotations and operations.",
  icons: {
    icon: "/assets/favicon-transparent.png",
    shortcut: "/assets/favicon-transparent.png",
    apple: "/assets/favicon-transparent.png",
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  )
}
