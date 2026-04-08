"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { CommandIcon, MenuIcon, SearchIcon } from "lucide-react"

import { getCurrentErpUser, signOutCurrentUser, type CurrentErpUser } from "@/lib/auth"
import { getCurrentNavigationItems, type NavigationPermissionItem } from "@/lib/db"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { Brand } from "./Brand"

type TopbarProps = {
  onOpenCommandBar: () => void
}

type TopbarModuleGroup = {
  moduleCode: string
  moduleName: string
  moduleSortOrder: number
  items: Array<NavigationPermissionItem>
}

const fallbackNavigation: NavigationPermissionItem[] = [
  {
    module_code: "dashboard",
    module_name: "Dashboard",
    module_icon_key: "dashboard",
    module_sort_order: 0,
    submodule_code: "dashboard.home",
    submodule_name: "Dashboard",
    route_path: "/",
    route_matchers: ["/"],
    submodule_sort_order: 0,
  },
  {
    module_code: "crm",
    module_name: "CRM",
    module_icon_key: "crm",
    module_sort_order: 1,
    submodule_code: "crm.clients",
    submodule_name: "Clientes",
    route_path: "/clients",
    route_matchers: ["/clients"],
    submodule_sort_order: 0,
  },
  {
    module_code: "crm",
    module_name: "CRM",
    module_icon_key: "crm",
    module_sort_order: 1,
    submodule_code: "crm.email",
    submodule_name: "Correo",
    route_path: "/mail",
    route_matchers: ["/mail"],
    submodule_sort_order: 4,
  },
  {
    module_code: "pricing",
    module_name: "Pricing",
    module_icon_key: "pricing",
    module_sort_order: 2,
    submodule_code: "pricing.providers",
    submodule_name: "Proveedores",
    route_path: "/pricing/providers",
    route_matchers: ["/pricing/providers"],
    submodule_sort_order: 0,
  },
  {
    module_code: "master_data",
    module_name: "Master Data",
    module_icon_key: "master_data",
    module_sort_order: 3,
    submodule_code: "admin.master-data",
    submodule_name: "Master Data",
    route_path: "/master-data",
    route_matchers: ["/master-data"],
    submodule_sort_order: 0,
  },
]

function normalizeRoute(routePath: string | null) {
  if (!routePath || routePath === "/") {
    return "/"
  }

  return routePath.replace(/\/+$/, "")
}

function isRouteActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/" || pathname === "/dashboard"
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Topbar({ onOpenCommandBar }: TopbarProps) {
  const pathname = usePathname()
  const [currentUser, setCurrentUser] = useState<CurrentErpUser | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [navigationItems, setNavigationItems] = useState<NavigationPermissionItem[]>(fallbackNavigation)
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadCurrentUser() {
      try {
        const user = await getCurrentErpUser()

        if (!cancelled) {
          setCurrentUser(user)
        }
      } catch {
        if (!cancelled) {
          setCurrentUser(null)
        }
      }
    }

    void loadCurrentUser()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadNavigation() {
      try {
        const items = await getCurrentNavigationItems()

        if (!cancelled && items.length > 0) {
          setNavigationItems(items.filter((item) => Boolean(item.route_path)))
        }
      } catch {
        if (!cancelled) {
          setNavigationItems(fallbackNavigation)
        }
      }
    }

    void loadNavigation()

    return () => {
      cancelled = true
    }
  }, [])

  const initials = [currentUser?.first_name, currentUser?.last_name]
    .filter(Boolean)
    .map((value) => String(value).charAt(0).toUpperCase())
    .join("")
    .slice(0, 2) || "PL"

  const moduleGroups = useMemo<TopbarModuleGroup[]>(() => {
    const grouped = new Map<string, TopbarModuleGroup>()

    navigationItems.forEach((item) => {
      const current = grouped.get(item.module_code) ?? {
        moduleCode: item.module_code,
        moduleName: item.module_name,
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

  async function handleSignOut() {
    setSigningOut(true)

    try {
      await signOutCurrentUser()
      window.location.href = "/login"
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/8 bg-[rgba(7,16,32,0.62)] px-3 py-3 backdrop-blur-xl sm:px-5">
        <div className="mx-auto flex max-w-[96rem] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavigationOpen(true)}
              className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white lg:hidden"
              aria-label="Abrir navegación"
            >
              <MenuIcon className="size-4" />
            </button>
            <Link
              href="/dashboard"
              className="rounded-2xl border border-white/10 bg-white/6 px-3 py-2 transition hover:bg-white/10"
            >
              <Brand light />
            </Link>
          </div>

          <div className="hidden min-w-0 flex-1 justify-center lg:flex">
            <NavigationMenu viewport={false} className="justify-start">
              <NavigationMenuList className="gap-1">
                {moduleGroups.map((group) => {
                  const active = group.items.some((item) => isRouteActive(pathname, normalizeRoute(item.route_path)))
                  const firstHref = normalizeRoute(group.items[0]?.route_path ?? "/")

                  if (group.items.length === 1) {
                    return (
                      <NavigationMenuItem key={group.moduleCode}>
                        <NavigationMenuLink
                          asChild
                          className={cn(
                            navigationMenuTriggerStyle(),
                            "rounded-2xl bg-transparent px-3 text-[13px] font-semibold text-[var(--brand-soft-gray)] hover:bg-white/8 hover:text-white data-[active]:bg-white/10 data-[active]:text-white",
                            active && "bg-white/10 text-white"
                          )}
                          active={active}
                        >
                          <Link href={firstHref}>{group.moduleName}</Link>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                    )
                  }

                  return (
                    <NavigationMenuItem key={group.moduleCode}>
                      <NavigationMenuTrigger
                        className={cn(
                          "rounded-2xl bg-transparent px-3 text-[13px] font-semibold text-[var(--brand-soft-gray)] hover:bg-white/8 hover:text-white data-[state=open]:bg-white/10 data-[state=open]:text-white",
                          active && "bg-white/10 text-white"
                        )}
                      >
                        {group.moduleName}
                      </NavigationMenuTrigger>
                      <NavigationMenuContent className="rounded-[24px] border border-white/10 bg-[rgba(7,16,32,0.96)] p-2 text-white shadow-[0_24px_48px_-28px_rgba(3,10,24,0.72)]">
                        <div className="grid min-w-[18rem] gap-1.5">
                          {group.items.map((item) => {
                            const href = normalizeRoute(item.route_path)
                            const itemActive = isRouteActive(pathname, href)

                            return (
                              <NavigationMenuLink
                                key={item.submodule_code}
                                asChild
                                className={cn(
                                  "rounded-2xl px-3 py-3 hover:bg-white/8 focus:bg-white/8",
                                  itemActive && "bg-white text-[var(--brand-navy)] hover:bg-white focus:bg-white"
                                )}
                                active={itemActive}
                              >
                                <Link href={href} className="flex flex-col gap-1">
                                  <span className="text-sm font-semibold">{item.submodule_name}</span>
                                  <span className={cn("text-xs text-[var(--brand-gray)]", itemActive && "text-[#5B6A7D]")}>
                                    {group.moduleName}
                                  </span>
                                </Link>
                              </NavigationMenuLink>
                            )
                          })}
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  )
                })}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenCommandBar}
              className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/7 px-3 py-2 text-sm text-[var(--brand-soft-gray)] hover:border-white/15 hover:bg-white/10 md:flex"
              aria-label="Abrir command bar"
              title="Atajos y navegación rápida"
            >
              <SearchIcon className="size-4" aria-hidden="true" />
              <span className="hidden lg:inline">Buscar, navegar o crear…</span>
              <span className="rounded-lg border border-white/10 bg-white/6 px-2 py-1 text-[11px] font-semibold text-white/80">
                <CommandIcon className="mr-1 inline size-3" aria-hidden="true" />
                K
              </span>
            </button>

            <div className="hidden min-w-0 text-right md:block">
              <div className="truncate text-sm font-medium text-white">
                {currentUser
                  ? [currentUser.first_name, currentUser.last_name].filter(Boolean).join(" ") ||
                    currentUser.username ||
                    currentUser.email
                  : "ERP User"}
              </div>
              <div className="truncate text-[11px] uppercase tracking-[0.18em] text-[var(--brand-gray)]">
                {currentUser?.role_name || "Sin rol"}
              </div>
            </div>

            <div className="flex size-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,_#B33A5B,_#800020)] text-xs font-semibold text-white shadow-[0_14px_28px_-16px_rgba(179,58,91,0.9)]">
              {initials}
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="rounded-2xl border border-white/10 bg-white/7 px-4 py-2 text-sm font-medium text-[var(--brand-light-gray)] transition hover:border-[rgba(179,58,91,0.45)] hover:bg-[rgba(179,58,91,0.16)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {signingOut ? "Saliendo…" : "Salir"}
            </button>
          </div>
        </div>
      </header>

      <Sheet open={mobileNavigationOpen} onOpenChange={setMobileNavigationOpen}>
        <SheetContent
          side="left"
          className="w-full max-w-none border-r-0 bg-[linear-gradient(180deg,_rgba(7,16,32,0.985),_rgba(11,31,59,0.985))] p-0 text-white sm:max-w-none"
        >
          <SheetHeader className="border-b border-white/8 px-5 py-5 text-left">
            <SheetTitle className="text-white">
              <Brand light />
            </SheetTitle>
            <SheetDescription className="text-[var(--brand-soft-gray)]">
              Navegación principal del ERP.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-5 overflow-y-auto px-4 py-5">
            {moduleGroups.map((group) => (
              <section key={group.moduleCode} className="space-y-2">
                <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--brand-gray)]">
                  {group.moduleName}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const href = normalizeRoute(item.route_path)
                    const itemActive = isRouteActive(pathname, href)

                    return (
                      <Link
                        key={item.submodule_code}
                        href={href}
                        onClick={() => setMobileNavigationOpen(false)}
                        className={cn(
                          "flex flex-col gap-1 rounded-[20px] border border-white/8 px-4 py-3 transition",
                          itemActive
                            ? "bg-white text-[var(--brand-navy)]"
                            : "bg-white/4 text-[var(--brand-light-gray)] hover:bg-white/8 hover:text-white"
                        )}
                      >
                        <span className="text-sm font-semibold">{item.submodule_name}</span>
                        <span className={cn("text-xs text-[var(--brand-gray)]", itemActive && "text-[#5B6A7D]")}>
                          {group.moduleName}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
