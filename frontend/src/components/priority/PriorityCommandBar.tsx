"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  Building2Icon,
  CalculatorIcon,
  ContactRoundIcon,
  DatabaseIcon,
  LayoutGridIcon,
  SearchIcon,
  UserRoundPlusIcon,
} from "lucide-react"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { getCurrentNavigationItems, type NavigationPermissionItem } from "@/lib/db"

type PriorityCommandBarProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type CommandAction = {
  id: string
  label: string
  helper: string
  shortcut?: string
  icon: React.ComponentType<{ className?: string }>
  onSelect: () => void
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
    submodule_code: "crm.contacts",
    submodule_name: "Contactos",
    route_path: "/contacts",
    route_matchers: ["/contacts"],
    submodule_sort_order: 1,
  },
  {
    module_code: "crm",
    module_name: "CRM",
    module_icon_key: "crm",
    module_sort_order: 1,
    submodule_code: "crm.opportunities",
    submodule_name: "Oportunidades",
    route_path: "/opportunities",
    route_matchers: ["/opportunities"],
    submodule_sort_order: 2,
  },
  {
    module_code: "crm",
    module_name: "CRM",
    module_icon_key: "crm",
    module_sort_order: 1,
    submodule_code: "crm.quotations",
    submodule_name: "Cotizaciones",
    route_path: "/quotations",
    route_matchers: ["/quotations"],
    submodule_sort_order: 3,
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
    module_code: "admin",
    module_name: "Admin",
    module_icon_key: "master_data",
    module_sort_order: 3,
    submodule_code: "admin.master-data",
    submodule_name: "Datos maestros",
    route_path: "/master-data",
    route_matchers: ["/master-data"],
    submodule_sort_order: 0,
  },
]

function getNavigationIcon(routePath: string | null) {
  if (!routePath || routePath === "/") return LayoutGridIcon
  if (routePath.startsWith("/clients")) return Building2Icon
  if (routePath.startsWith("/contacts")) return ContactRoundIcon
  if (routePath.startsWith("/opportunities")) return BriefcaseBusinessIcon
  if (routePath.startsWith("/quotations")) return CalculatorIcon
  if (routePath.startsWith("/pricing")) return CalculatorIcon
  if (routePath.startsWith("/master-data")) return DatabaseIcon
  return ArrowRightIcon
}

function getQuickActions(pathname: string, router: ReturnType<typeof useRouter>): CommandAction[] {
  const actions: CommandAction[] = [
    {
      id: "go-dashboard",
      label: "Ir al dashboard",
      helper: "Vuelve al centro operativo principal.",
      shortcut: "G D",
      icon: LayoutGridIcon,
      onSelect: () => router.push("/"),
    },
    {
      id: "go-clients",
      label: "Abrir clientes",
      helper: "Busca cuentas, owners y actividad comercial.",
      shortcut: "G C",
      icon: Building2Icon,
      onSelect: () => router.push("/clients"),
    },
    {
      id: "go-contacts",
      label: "Abrir contactos",
      helper: "Revisa interlocutores y seguimiento directo.",
      shortcut: "G T",
      icon: ContactRoundIcon,
      onSelect: () => router.push("/contacts"),
    },
  ]

  if (pathname.startsWith("/opportunities")) {
    actions.push({
      id: "go-quotations",
      label: "Abrir cotizaciones",
      helper: "Salta al seguimiento comercial y documental.",
      shortcut: "G Q",
      icon: CalculatorIcon,
      onSelect: () => router.push("/quotations"),
    })
  }

  if (pathname.startsWith("/pricing")) {
    actions.push({
      id: "go-providers",
      label: "Ir a proveedores",
      helper: "Consulta cobertura, contactos y términos activos.",
      shortcut: "G P",
      icon: Building2Icon,
      onSelect: () => router.push("/pricing/providers"),
    })
  }

  actions.push({
    id: "go-master-data",
    label: "Abrir master data",
    helper: "Administra catálogos y permisos canónicos.",
    shortcut: "G M",
    icon: DatabaseIcon,
    onSelect: () => router.push("/master-data"),
  })

  return actions
}

export function PriorityCommandBar({
  open,
  onOpenChange,
}: PriorityCommandBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [navigationItems, setNavigationItems] = useState<NavigationPermissionItem[]>(fallbackNavigation)

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

  const quickActions = useMemo(() => getQuickActions(pathname, router), [pathname, router])

  const navigationActions = useMemo(() => {
    const seen = new Set<string>()

    return navigationItems
      .filter((item) => item.route_path)
      .filter((item) => {
        const route = String(item.route_path)
        if (seen.has(route)) return false
        seen.add(route)
        return true
      })
      .map((item) => ({
        id: item.submodule_code,
        label: item.submodule_name,
        helper: item.module_name,
        icon: getNavigationIcon(item.route_path),
        onSelect: () => router.push(String(item.route_path)),
      }))
  }, [navigationItems, router])

  function handleSelect(action: CommandAction) {
    onOpenChange(false)
    action.onSelect()
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command Bar"
      description="Navega rápido entre módulos y acciones frecuentes."
      className="max-w-2xl border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.98)] shadow-[0_36px_90px_-42px_rgba(3,10,24,0.68)]"
    >
      <div className="border-b border-[var(--border-subtle)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.94),_rgba(248,250,252,0.98))] px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(11,31,59,0.08)] text-[var(--brand-navy)]">
            <SearchIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[var(--brand-navy)]">
              Buscar, navegar o cambiar de contexto
            </div>
            <div className="mt-1 text-sm text-[#5B6A7D]">
              Usa esta barra para moverte como en una app de escritorio: menos clics, menos scroll y menos búsqueda manual.
            </div>
          </div>
        </div>
      </div>

      <Command className="rounded-none border-0 bg-transparent p-0">
        <CommandInput placeholder="Busca un módulo, acción o destino…" />
        <CommandList className="max-h-[26rem]">
          <CommandEmpty>No encontré resultados para esa búsqueda.</CommandEmpty>

          <CommandGroup heading="Siguiente paso recomendado">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <CommandItem key={action.id} value={`${action.label} ${action.helper}`} onSelect={() => handleSelect(action)}>
                  <Icon className="size-4 text-[var(--brand-navy)]" />
                  <div className="min-w-0">
                    <div className="font-medium text-[var(--brand-navy)]">{action.label}</div>
                    <div className="text-xs text-[#6B7280]">{action.helper}</div>
                  </div>
                  {action.shortcut ? <CommandShortcut>{action.shortcut}</CommandShortcut> : null}
                </CommandItem>
              )
            })}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Navegación disponible">
            {navigationActions.map((action) => {
              const Icon = action.icon
              return (
                <CommandItem key={action.id} value={`${action.label} ${action.helper}`} onSelect={() => handleSelect(action)}>
                  <Icon className="size-4 text-[var(--brand-navy)]" />
                  <div className="min-w-0">
                    <div className="font-medium text-[var(--brand-navy)]">{action.label}</div>
                    <div className="text-xs text-[#6B7280]">{action.helper}</div>
                  </div>
                </CommandItem>
              )
            })}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Atajo útil">
            <CommandItem
              value="clientes crear editar"
              onSelect={() => {
                onOpenChange(false)
                router.push("/clients")
              }}
            >
              <UserRoundPlusIcon className="size-4 text-[var(--brand-navy)]" />
              <div className="min-w-0">
                <div className="font-medium text-[var(--brand-navy)]">Ir al workspace de clientes</div>
                <div className="text-xs text-[#6B7280]">Desde ahí podrás crear, editar y revisar cuentas.</div>
              </div>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
