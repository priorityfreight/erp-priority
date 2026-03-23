"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Brand } from "./Brand"

type NavItem = {
  href: string
  label: string
  section: "Dashboard" | "CRM" | "Pricing" | "Master Data"
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", section: "Dashboard" },
  { href: "/clients", label: "Clients", section: "CRM" },
  { href: "/contacts", label: "Contacts", section: "CRM" },
  { href: "/opportunities", label: "Opportunities", section: "CRM" },
  { href: "/quotations", label: "Quotations", section: "CRM" },
  { href: "/pricing/providers", label: "Providers", section: "Pricing" },
  { href: "/pricing/quotations", label: "Pricing / Quotations", section: "Pricing" },
  { href: "/master-data", label: "Master Data", section: "Master Data" },
  { href: "/master-data/users", label: "Usuarios", section: "Master Data" },
  {
    href: "/master-data/sales/service-types",
    label: "Ventas / Tipos de servicio",
    section: "Master Data",
  },
  {
    href: "/master-data/sales/accounting-concepts",
    label: "Ventas / Conceptos contables",
    section: "Master Data",
  },
  {
    href: "/master-data/sales/quotation-rejection-reasons",
    label: "Ventas / Motivos rechazo",
    section: "Master Data",
  },
  { href: "/master-data/unlocode", label: "UN/LOCODE", section: "Master Data" },
]

const sectionOrder: NavItem["section"][] = ["Dashboard", "CRM", "Pricing", "Master Data"]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="brand-shell sticky top-0 hidden min-h-screen w-72 shrink-0 flex-col overflow-hidden text-white lg:flex">
      <div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top_left,_rgba(179,58,91,0.4),_transparent_44%)]" />
      <div className="relative px-6 pb-6 pt-7">
        <Brand compact light />
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--brand-soft-gray)]">
            Corporate Operating Hub
          </div>
          <div className="mt-2 text-sm leading-6 text-[var(--brand-light-gray)]">
            Freight intelligence, pricing and execution in one secured workspace.
          </div>
        </div>
      </div>

      <nav className="relative flex-1 space-y-6 px-4 pb-6">
        {sectionOrder.map((section) => {
          const items = navItems.filter((item) => item.section === section)
          if (items.length === 0) return null

          return (
            <div key={section}>
              <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--brand-gray)]">
                {section}
              </div>
              <div className="mt-3 space-y-1.5">
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
                        "group flex items-center rounded-2xl px-3 py-3 text-sm font-medium transition-all",
                        active
                          ? "bg-[linear-gradient(135deg,_rgba(179,58,91,0.9),_rgba(128,0,32,0.88))] text-white shadow-[0_18px_38px_-20px_rgba(179,58,91,0.9)]"
                          : "text-[var(--brand-light-gray)] hover:bg-white/8 hover:text-white",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "mr-3 h-2 w-2 rounded-full",
                          active ? "bg-white" : "bg-[var(--brand-gray)]/60 group-hover:bg-[var(--brand-burgundy-light)]",
                        ].join(" ")}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="relative border-t border-white/10 px-6 py-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--brand-gray)]">
          Priority Freight Intelligence
        </div>
        <div className="mt-2 text-sm text-[var(--brand-soft-gray)]">Smarter · Better · Faster</div>
      </div>
    </aside>
  )
}
