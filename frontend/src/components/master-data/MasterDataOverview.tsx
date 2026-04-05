import Link from "next/link"
import { PageContainer } from "@/components/layout/PageContainer"
import { PriorityMetricCard, PriorityMetricStrip } from "@/components/priority/PriorityWorkspace"
import { PriorityCardTitle, PriorityTypography } from "@/components/priority/PriorityTypography"

const processGroups = [
  {
    title: "Acceso y seguridad",
    description: "Todo lo que define quién entra al ERP y qué puede ver o editar.",
    accent: "from-[#EFF6FF] via-white to-[#F8FAFC]",
    items: [
      {
        title: "Usuarios",
        href: "/master-data/users",
        status: "Activo",
        coverage: "Directorio de acceso ERP solo para admins",
        notes: "Administra usuarios del ERP, rol, username, estatus y aprovisionamiento de acceso.",
      },
      {
        title: "Roles y permisos",
        href: "/master-data/users/roles",
        status: "Activo",
        coverage: "Workspace visual de permisos por rol",
        notes: "Configura acceso por modulo, submodulo, recurso y campos sensibles desde una matriz visual.",
      },
    ],
  },
  {
    title: "Ventas y pricing",
    description: "Catálogos que impactan el flujo comercial, la configuración de servicios y la salida de cotizaciones.",
    accent: "from-[#FFF7ED] via-white to-[#FFFBEB]",
    items: [
      {
        title: "Tipos de servicio",
        href: "/master-data/sales/service-types",
        status: "Activo",
        coverage: "Catalogo bloqueado en backend canonico",
        notes: "Relaciona el tipo de servicio con el tipo de transporte disponible para ventas y pricing.",
      },
      {
        title: "Conceptos contables",
        href: "/master-data/sales/accounting-concepts",
        status: "Activo",
        coverage: "Catalogo SAT editable en backend canonico",
        notes: "Administra concepto, servicio, operacion, IVA y clave SAT para compras y ventas.",
      },
      {
        title: "Motivos de rechazo",
        href: "/master-data/sales/quotation-rejection-reasons",
        status: "Activo",
        coverage: "Catalogo editable para rechazo de cotizaciones",
        notes: "Permite clasificar de forma consistente por qué el cliente o pricing rechaza una cotización.",
      },
    ],
  },
  {
    title: "Finanzas y referencias",
    description: "Datos de soporte para cálculo, conversión monetaria y normalización logística.",
    accent: "from-[#ECFDF5] via-white to-[#F0FDF4]",
    items: [
      {
        title: "Tipo de cambio",
        href: "/master-data/accounting/exchange-rates",
        status: "Activo",
        coverage: "MXN, USD y EUR con control manual canonico",
        notes: "Mantiene tipo de cambio base MXN para profit contable y conversión de compras/ventas.",
      },
      {
        title: "UN/LOCODE",
        href: "/master-data/unlocode",
        status: "Activo",
        coverage: "Lookup canonico de backend",
        notes: "Explorador de solo lectura para códigos UNECE usados en lanes logísticos.",
      },
      {
        title: "Bases de datos externas",
        href: "/master-data",
        status: "Planeado",
        coverage: "Datasets publicos futuros",
        notes: "Este espacio alojará datasets de referencia adicionales conforme crezca el ERP.",
      },
    ],
  },
]

export function MasterDataOverview() {
  return (
    <PageContainer
      title="Datos maestros"
      description="Centro de control para catálogos canónicos, permisos y referencias operativas organizados por proceso real de trabajo."
      actions={
        <div className="rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1 text-xs font-medium text-[#1D4ED8]">
          Modo canónico
        </div>
      }
    >
      <div className="space-y-8">
        <PriorityMetricStrip className="xl:grid-cols-3">
          <PriorityMetricCard label="Submódulos activos" value="7" helper="Cobertura viva del backbone actual." tone="info" />
          <PriorityMetricCard
            label="Áreas operativas"
            value="3"
            helper="Acceso, comercial y finanzas/referencias."
            tone="success"
          />
          <PriorityMetricCard
            label="Ruta sugerida"
            value="Seguridad -> Ventas/Pricing -> Referencias"
            helper="Pensado para que un admin encuentre rápido dónde operar."
            tone="warning"
            className="xl:col-span-1 [&_div:nth-child(2)]:text-[1.25rem] [&_div:nth-child(2)]:leading-tight"
          />
        </PriorityMetricStrip>

        {processGroups.map((group) => (
          <section key={group.title} className="space-y-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <PriorityCardTitle>{group.title}</PriorityCardTitle>
                <PriorityTypography variant="bodyMuted" className="mt-1">
                  {group.description}
                </PriorityTypography>
              </div>
              <div className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                {group.items.length} módulos
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {group.items.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`rounded-[24px] border border-[#E5E7EB] bg-gradient-to-br ${group.accent} p-5 transition-colors hover:border-[#BFDBFE]`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <PriorityCardTitle className="text-[1.05rem]">{item.title}</PriorityCardTitle>
                      <PriorityTypography variant="bodyMuted" className="mt-1">
                        {item.notes}
                      </PriorityTypography>
                    </div>
                    <span
                      className={[
                        "rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
                        item.status === "Activo"
                          ? "bg-[#DCFCE7] text-[#166534]"
                          : "bg-[#E5E7EB] text-[#475569]",
                      ].join(" ")}
                    >
                      {item.status}
                    </span>
                  </div>
                  <PriorityTypography variant="caption" className="mt-4 uppercase tracking-[0.14em]">
                    {item.coverage}
                  </PriorityTypography>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageContainer>
  )
}
