import "./globals.css"
import type { ReactNode } from "react"
import { AppLayout } from "@/components/layout/AppLayout"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  )
}

