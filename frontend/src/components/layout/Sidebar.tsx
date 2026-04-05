"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { getCurrentNavigationItems, type NavigationPermissionItem } from "@/lib/db"
import { Brand } from "./Brand"

type SidebarProps = {
  collapsed: boolean
  mobileOpen: boolean
  onToggleCollapsed: () => void
  onCloseMobile: () => void
}

type ModuleGroup = {
  moduleCode: string
  moduleName: string
  moduleIconKey: string | null
  moduleSortOrder: number
  items: Array<NavigationPermissionItem>
}

const moduleIconMap: Record<string, string> = {
  dashboard: "DA",
  home: "DA",
  crm: "CR",
  briefcase: "CR",
  pricing: "PR",
  calculator: "PR",
  master_data: "MD",
  database: "MD",
  operations: "OP",
  logistics: "OP",
  finance: "FI",
  banknote: "FI",
}

function normalizeRoute(routePath: string | null) {
  if (!routePath || routePath === "/") {
    return "/"
  }

  return routePath.replace(/\/+$/, "")
}

function isRouteActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/"
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Sidebar({
  collapsed,
  mobileOpen,
  onToggleCollapsed,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname()
  const [navigationItems, setNavigationItems] = useState<NavigationPermissionItem[]>([])
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false

    async function loadNavigationPermissions() {
      try {
        const items = await getCurrentNavigationItems()

        if (!cancelled) {
          setNavigationItems(items.filter((item) => Boolean(item.route_path)))
        }
      } catch {
        if (!cancelled) {
          setNavigationItems([
            {
              module_code: "dashboard",
              module_name: "Dashboard",
              module_icon_key: null,
              module_sort_order: 0,
              submodule_code: "dashboard.home",
              submodule_name: "Dashboard",
              route_path: "/",
              route_matchers: ["/"],
              submodule_sort_order: 0,
            },
          ])
        }
      }
    }

    void loadNavigationPermissions()

    return () => {
      cancelled = true
    }
  }, [])

  const moduleGroups = useMemo<ModuleGroup[]>(() => {
    const grouped = new Map<string, ModuleGroup>()

    navigationItems.forEach((item) => {
      const current = grouped.get(item.module_code) ?? {
        moduleCode: item.module_code,
        moduleName: item.module_name,
        moduleIconKey: item.module_icon_key,
        moduleSortOrder: item.module_sort_order,
        items: [],
      }

      current.items.push(item)
      grouped.set(item.module_code, current)
    })

    return Array.from(grouped.values())
      .map((group) => ({
        ...group,
        items: [...group.items].sort((left, right) => left.submodule_sort_order - right.submodule_sort_order),
      }))
      .sort((left, right) => left.moduleSortOrder - right.moduleSortOrder)
  }, [navigationItems])

  function getDefaultExpandedState(moduleGroup: ModuleGroup) {
    const hasActiveRoute = moduleGroup.items.some((item) =>
      isRouteActive(pathname, normalizeRoute(item.route_path))
    )

    return hasActiveRoute || moduleGroup.moduleCode === "dashboard"
  }

  function toggleModule(moduleCode: string, currentExpanded: boolean) {
    if (collapsed) {
      onToggleCollapsed()
    }

    setExpandedModules((current) => ({
      ...current,
      [moduleCode]: !currentExpanded,
    }))
  }

  const shellWidth = collapsed ? "lg:w-20" : "lg:w-64"
  const mobileState = mobileOpen
    ? "translate-x-0 opacity-100"
    : "-translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100"

  return (
    <>
      <div
        className={[
          "fixed inset-0 z-40 bg-[#020817]/55 backdrop-blur-sm transition lg:hidden",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={onCloseMobile}
      />

      <aside
        className={[
          "brand-shell fixed inset-y-0 left-0 z-50 flex min-h-screen w-[min(88vw,21rem)] shrink-0 flex-col overflow-hidden text-white transition-all duration-300 lg:sticky lg:top-0",
          shellWidth,
          mobileState,
        ].join(" ")}
      >
        <div className="absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top_left,_rgba(179,58,91,0.24),_transparent_42%)]" />
        <div className="relative flex items-center justify-between gap-3 border-b border-white/8 px-3 pb-3 pt-4">
          <div className={collapsed ? "mx-auto" : "min-w-0 flex-1"}>
            <Brand compact={collapsed} light />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={collapsed ? onToggleCollapsed : onCloseMobile}
              className="rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-soft-gray)] hover:bg-white/12 lg:hidden"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-sm font-semibold text-[var(--brand-soft-gray)] hover:bg-white/12 lg:flex"
              title={collapsed ? "Expandir menu" : "Contraer menu"}
            >
              {collapsed ? "+" : "−"}
            </button>
          </div>
        </div>

        <nav className="relative flex-1 overflow-y-auto px-2.5 pb-4 pt-3">
          <div className="space-y-4">
            {moduleGroups.map((moduleGroup) => {
              const moduleHasActiveRoute = moduleGroup.items.some((item) =>
                isRouteActive(pathname, normalizeRoute(item.route_path))
              )
              const isExpanded =
                expandedModules[moduleGroup.moduleCode] ?? getDefaultExpandedState(moduleGroup)
              const iconLabel =
                moduleIconMap[moduleGroup.moduleIconKey ?? ""] ||
                moduleIconMap[moduleGroup.moduleCode] ||
                moduleGroup.moduleName.slice(0, 2).toUpperCase()

              return (
                <section key={moduleGroup.moduleCode} className="space-y-2">
                  <button
                    type="button"
                    onClick={() => toggleModule(moduleGroup.moduleCode, isExpanded)}
                    className={[
                      "flex w-full items-center gap-3 rounded-[20px] px-2.5 py-2.5 text-left transition-all",
                      collapsed ? "justify-center border border-transparent" : "justify-between border border-white/6",
                      moduleHasActiveRoute
                        ? "bg-[linear-gradient(180deg,_rgba(128,0,32,0.18),_rgba(11,31,59,0.08))] shadow-[0_16px_34px_-28px_rgba(128,0,32,0.85)]"
                        : "bg-white/[0.03] hover:bg-white/[0.06]",
                    ].join(" ")}
                    title={collapsed ? moduleGroup.moduleName : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={[
                          "flex h-10 w-10 items-center justify-center rounded-2xl border text-[10px] font-semibold uppercase tracking-[0.12em]",
                          moduleHasActiveRoute
                            ? "border-[rgba(179,58,91,0.44)] bg-[rgba(179,58,91,0.22)] text-white"
                            : "border-white/10 bg-white/6 text-[var(--brand-soft-gray)]",
                        ].join(" ")}
                      >
                        {iconLabel}
                      </div>
                      {!collapsed ? (
                        <div>
                          <div className="text-sm font-semibold text-white">{moduleGroup.moduleName}</div>
                          <div className="mt-0.5 text-[11px] text-[var(--brand-gray)]">
                            {moduleGroup.items.length} vistas
                          </div>
                        </div>
                      ) : null}
                    </div>
                    {!collapsed ? (
                      <span className={["text-sm text-[var(--brand-gray)] transition-transform", isExpanded ? "rotate-180" : ""].join(" ")}>
                        ▾
                      </span>
                    ) : null}
                  </button>

                  {!collapsed && isExpanded ? (
                    <div className="space-y-1 px-1.5">
                      {moduleGroup.items.map((item) => {
                        const href = normalizeRoute(item.route_path)
                        const active = isRouteActive(pathname, href)

                        return (
                          <Link
                            key={item.submodule_code}
                            href={href}
                            onClick={onCloseMobile}
                            className={[
                              "group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-all",
                              active
                                ? "bg-white text-[var(--brand-navy)] shadow-[0_20px_34px_-24px_rgba(255,255,255,0.35)]"
                                : "text-[var(--brand-light-gray)] hover:bg-white/8 hover:text-white",
                            ].join(" ")}
                          >
                            <span
                              className={[
                                "h-2.5 w-2.5 rounded-full",
                                active
                                  ? "bg-[var(--brand-burgundy)]"
                                  : "bg-[var(--brand-gray)]/60 group-hover:bg-[var(--brand-burgundy-light)]",
                              ].join(" ")}
                            />
                            <span className="truncate">{item.submodule_name}</span>
                          </Link>
                        )
                      })}
                    </div>
                  ) : null}
                </section>
              )
            })}
          </div>
        </nav>
      </aside>
    </>
  )
}
