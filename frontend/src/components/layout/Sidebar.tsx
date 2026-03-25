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
  dashboard: "DB",
  crm: "CRM",
  pricing: "PR",
  master_data: "MD",
  operations: "OPS",
  finance: "FIN",
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

  const shellWidth = collapsed ? "lg:w-24" : "lg:w-80"
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
          "brand-shell fixed inset-y-0 left-0 z-50 flex min-h-screen w-[min(88vw,22rem)] shrink-0 flex-col overflow-hidden text-white transition-all duration-300 lg:sticky lg:top-0",
          shellWidth,
          mobileState,
        ].join(" ")}
      >
        <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top_left,_rgba(179,58,91,0.38),_transparent_44%)]" />
        <div className="relative flex items-center justify-between px-4 pb-5 pt-6">
          <div className={collapsed ? "mx-auto" : ""}>
            <Brand compact={collapsed} light />
          </div>
          <button
            type="button"
            onClick={collapsed ? onToggleCollapsed : onCloseMobile}
            className={[
              "rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--brand-soft-gray)] hover:bg-white/12 lg:hidden",
            ].join(" ")}
          >
            Cerrar
          </button>
        </div>

        {!collapsed ? (
          <div className="relative mx-4 rounded-[24px] border border-white/10 bg-white/6 px-4 py-4 shadow-[0_20px_60px_-40px_rgba(3,10,24,0.95)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--brand-soft-gray)]">
                  Operating Workspace
                </div>
                <div className="mt-2 text-sm leading-6 text-[var(--brand-light-gray)]">
                  Navegacion inteligente por modulo, con acceso filtrado por permisos reales.
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleCollapsed}
                className="hidden rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--brand-soft-gray)] hover:bg-white/12 lg:block"
              >
                Contraer
              </button>
            </div>
          </div>
        ) : (
          <div className="relative flex justify-center px-2 pb-3">
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="hidden h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-soft-gray)] hover:bg-white/12 lg:flex"
              title="Expandir menu"
            >
              +
            </button>
          </div>
        )}

        <nav className="relative flex-1 overflow-y-auto px-3 pb-5 pt-5">
          <div className="space-y-3">
            {moduleGroups.map((moduleGroup) => {
              const moduleHasActiveRoute = moduleGroup.items.some((item) =>
                isRouteActive(pathname, normalizeRoute(item.route_path))
              )
              const isExpanded =
                expandedModules[moduleGroup.moduleCode] ?? getDefaultExpandedState(moduleGroup)
              const iconLabel =
                moduleGroup.moduleIconKey ||
                moduleIconMap[moduleGroup.moduleCode] ||
                moduleGroup.moduleName.slice(0, 2).toUpperCase()

              return (
                <section
                  key={moduleGroup.moduleCode}
                  className={[
                    "rounded-[24px] border transition-all",
                    moduleHasActiveRoute
                      ? "border-[rgba(179,58,91,0.34)] bg-[linear-gradient(180deg,_rgba(128,0,32,0.18),_rgba(11,31,59,0.26))]"
                      : "border-white/8 bg-white/[0.03]",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    onClick={() => toggleModule(moduleGroup.moduleCode, isExpanded)}
                    className={[
                      "flex w-full items-center gap-3 px-3 py-3 text-left",
                      collapsed ? "justify-center" : "justify-between",
                    ].join(" ")}
                    title={collapsed ? moduleGroup.moduleName : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={[
                          "flex h-11 w-11 items-center justify-center rounded-2xl border text-[11px] font-semibold uppercase tracking-[0.16em]",
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
                          <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--brand-gray)]">
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
                    <div className="space-y-1 px-2 pb-2">
                      {moduleGroup.items.map((item) => {
                        const href = normalizeRoute(item.route_path)
                        const active = isRouteActive(pathname, href)

                        return (
                          <Link
                            key={item.submodule_code}
                            href={href}
                            onClick={onCloseMobile}
                            className={[
                              "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all",
                              active
                                ? "bg-[linear-gradient(135deg,_rgba(179,58,91,0.92),_rgba(128,0,32,0.88))] text-white shadow-[0_20px_34px_-24px_rgba(179,58,91,0.95)]"
                                : "text-[var(--brand-light-gray)] hover:bg-white/8 hover:text-white",
                            ].join(" ")}
                          >
                            <span
                              className={[
                                "h-2.5 w-2.5 rounded-full",
                                active
                                  ? "bg-white"
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

        <div className="relative border-t border-white/10 px-4 py-4">
          {collapsed ? (
            <div className="text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-gray)]">
              PFI
            </div>
          ) : (
            <>
              <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--brand-gray)]">
                Priority Freight Intelligence
              </div>
              <div className="mt-2 text-sm text-[var(--brand-soft-gray)]">
                Navegacion retractil, limpia y segura por permisos.
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  )
}
