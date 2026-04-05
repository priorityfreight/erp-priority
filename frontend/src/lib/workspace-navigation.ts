export type WorkspaceBreadcrumbItem = {
  label: string
  href?: string
}

const routeLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/clients": "Clientes",
  "/contacts": "Contactos",
  "/opportunities": "Oportunidades",
  "/quotations": "Cotizaciones",
  "/pricing": "Pricing",
  "/pricing/quotations": "Cotizaciones en pricing",
  "/pricing/providers": "Proveedores",
  "/master-data": "Master Data",
  "/master-data/users": "Usuarios",
  "/master-data/unlocode": "UN/LOCODE",
}

const navigablePaths = new Set(Object.keys(routeLabels))

function titleFromSegment(segment: string) {
  if (/^[0-9a-f-]{8,}$/i.test(segment)) {
    return "Detalle"
  }

  const normalized = segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (value) => value.toUpperCase())

  return normalized || "Detalle"
}

export function getWorkspaceBreadcrumbs(pathname: string): WorkspaceBreadcrumbItem[] {
  const cleanedPath = pathname.split("?")[0].replace(/\/+$/, "") || "/dashboard"

  if (cleanedPath === "/" || cleanedPath === "/dashboard") {
    return [{ label: "Dashboard", href: "/dashboard" }]
  }

  const segments = cleanedPath.split("/").filter(Boolean)
  const items: WorkspaceBreadcrumbItem[] = []

  segments.forEach((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`
    const isLast = index === segments.length - 1
    const label = routeLabels[href] ?? titleFromSegment(segment)

    items.push({
      label,
      href: !isLast && navigablePaths.has(href) ? href : undefined,
    })
  })

  return items
}
