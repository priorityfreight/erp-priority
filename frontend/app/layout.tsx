import "./globals.css"
import type { ReactNode } from "react"
import type { Metadata } from "next"
import { AppLayout } from "@/components/layout/AppLayout"
import { AppProviders } from "@/components/layout/AppProviders"
import { brandAssets, brandIdentity } from "@/lib/brand"

export const metadata: Metadata = {
  title: brandIdentity.appName,
  description: brandIdentity.description,
  icons: {
    icon: brandAssets.favicon,
    shortcut: brandAssets.favicon,
    apple: brandAssets.favicon,
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <AppLayout>{children}</AppLayout>
        </AppProviders>
      </body>
    </html>
  )
}
