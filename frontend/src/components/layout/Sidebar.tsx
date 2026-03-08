"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

type NavItem = {
  href: string
  label: string
  section: "Dashboard" | "CRM" | "Operations" | "Finance"
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", section: "Dashboard" },
  { href: "/clients", label: "Clients", section: "CRM" },
  { href: "/contacts", label: "Contacts", section: "CRM" },
  { href: "/opportunities", label: "Opportunities", section: "CRM" },
  { href: "/quotations", label: "Quotations", section: "Operations" },
  { href: "/shipments", label: "Shipments", section: "Operations" },
  { href: "/invoices", label: "Invoices", section: "Finance" },
]

const sectionOrder: NavItem["section"][] = [
  "Dashboard",
  "CRM",
  "Operations",
  "Finance",
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex w-60 flex-col border-r border-[#E5E7EB] bg-[#111827] text-white">
      <div className="px-5 pb-6 pt-6">
        <div className="text-sm font-semibold uppercase tracking-wide text-[#9CA3AF]">
          Priority ERP
        </div>
        <div className="mt-1 text-lg font-semibold">Logistics</div>
      </div>

      <nav className="flex-1 space-y-5 px-3 pb-6">
        {sectionOrder.map((section) => {
          const items = navItems.filter((item) => item.section === section)
          if (items.length === 0) return null

          return (
            <div key={section}>
              <div className="px-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                {section}
              </div>
              <div className="mt-2 space-y-1">
                {items.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        "flex items-center rounded-md px-2 py-2 text-sm transition-colors",
                        active
                          ? "bg-[#F9FAFB] text-[#111827]"
                          : "text-[#E5E7EB] hover:bg-[#374151] hover:text-white",
                      ].join(" ")}
                    >
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

