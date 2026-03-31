import Link from "next/link"
import { PageContainer } from "@/components/layout/PageContainer"
import { PriorityCardTitle, PriorityTypography } from "@/components/priority/PriorityTypography"

const submodules = [
  {
    title: "Usuarios",
    href: "/master-data/users",
    status: "Live",
    coverage: "Admin-only ERP access directory",
    notes: "Administra usuarios del ERP, rol, username, estatus y aprovisionamiento de acceso.",
  },
  {
    title: "Usuarios / Roles y permisos",
    href: "/master-data/users/roles",
    status: "Live",
    coverage: "Workspace visual de permisos por rol",
    notes: "Configura acceso por modulo, submodulo, recurso y campos sensibles desde una matriz visual.",
  },
  {
    title: "Ventas / Tipos de servicio",
    href: "/master-data/sales/service-types",
    status: "Live",
    coverage: "Catalogo bloqueado en backend canonico",
    notes: "Relaciona el tipo de servicio con el tipo de transporte disponible para ventas.",
  },
  {
    title: "Ventas / Conceptos contables",
    href: "/master-data/sales/accounting-concepts",
    status: "Live",
    coverage: "Catalogo SAT editable en backend canonico",
    notes: "Administra concepto, servicio, operacion, IVA y clave SAT para ventas.",
  },
  {
    title: "Ventas / Motivos de rechazo",
    href: "/master-data/sales/quotation-rejection-reasons",
    status: "Live",
    coverage: "Catalogo editable para rechazo de cotizaciones",
    notes: "Permite clasificar de forma consistente por que el cliente o pricing rechaza una cotizacion.",
  },
  {
    title: "Contabilidad / Tipo de cambio",
    href: "/master-data/accounting/exchange-rates",
    status: "Live",
    coverage: "MXN, USD y EUR con control manual canonico",
    notes: "Mantiene tipo de cambio base MXN para profit contable y conversion de compras/ventas.",
  },
  {
    title: "UN/LOCODE",
    href: "/master-data/unlocode",
    status: "Live",
    coverage: "Canonical backend lookup",
    notes: "Read-only explorer for UNECE location codes used in logistics lanes.",
  },
  {
    title: "External Databases",
    href: "/master-data",
    status: "Planned",
    coverage: "Future public datasets",
    notes: "This space will host additional public-domain reference datasets as the ERP grows.",
  },
]

export function MasterDataOverview() {
  return (
    <PageContainer
      title="Master Data"
      description="Centralize reusable reference datasets and external public catalogs."
      actions={
        <div className="rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1 text-xs font-medium text-[#1D4ED8]">
          Canonical mode
        </div>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#1D4ED8]">
              Active Submodules
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">7</div>
          </div>
          <div className="rounded-xl border border-[#D1FAE5] bg-[#ECFDF5] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#047857]">
              Data Strategy
            </div>
            <div className="mt-2 text-sm font-medium text-[#111827]">
              Canonical backend only for live master data reads and writes.
            </div>
          </div>
          <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#B45309]">
              Initial Scope
            </div>
            <div className="mt-2 text-sm font-medium text-[#111827]">
              UN/LOCODE, usuarios, catalogos comerciales y tipo de cambio
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <PriorityCardTitle>Submodules</PriorityCardTitle>
          <div className="grid gap-4 lg:grid-cols-2">
            {submodules.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="rounded-xl border border-[#E5E7EB] bg-white p-5 transition-colors hover:border-[#BFDBFE] hover:bg-[#F8FAFC]"
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
                      item.status === "Live"
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
      </div>
    </PageContainer>
  )
}
