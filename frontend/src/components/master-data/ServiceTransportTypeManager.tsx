"use client"

import { useEffect, useMemo, useState } from "react"
import { PageContainer } from "@/components/layout/PageContainer"
import { getServiceTransportTypes, type ServiceTransportType } from "@/lib/db"

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-6 py-10 text-center text-sm text-[#64748B]">
      {hasQuery
        ? "No hay registros que coincidan con la busqueda actual."
        : "No hay tipos de servicio disponibles."}
    </div>
  )
}

const LOCKED_SERVICE_TYPES = ["AIR", "FCL", "LCL", "FTL", "LTL", "COURIER"] as const

export function ServiceTransportTypeManager() {
  const [items, setItems] = useState<ServiceTransportType[]>([])
  const [query, setQuery] = useState("")
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    getServiceTransportTypes({
      query,
      serviceType: serviceTypeFilter,
    })
      .then((data) => {
        if (!cancelled) {
          setItems(data)
        }
      })
      .catch((error) => {
        console.error(error)
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [query, serviceTypeFilter])

  const groupedCount = useMemo(
    () => new Set(items.map((item) => item.service_type)).size,
    [items]
  )

  return (
    <PageContainer
      title="Tipos de servicio"
      description="Catalogo canónico bloqueado para ventas, pricing, oportunidades, cotizaciones y operaciones."
      actions={
        <div className="rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-3 py-1 text-xs font-medium text-[#B45309]">
          Catalogo bloqueado
        </div>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#1D4ED8]">
              Registros
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">{items.length}</div>
          </div>
          <div className="rounded-xl border border-[#D1FAE5] bg-[#ECFDF5] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#047857]">
              Tipos canónicos
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">{groupedCount}</div>
          </div>
          <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#B45309]">
              Lista permitida
            </div>
            <div className="mt-2 text-sm font-medium text-[#111827]">
              {LOCKED_SERVICE_TYPES.join(", ")}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-5">
          <h2 className="text-lg font-semibold text-[#111827]">Regla del sistema</h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            Este catálogo ya no se edita desde la aplicación. Los tipos de servicio válidos
            son únicamente AIR, FCL, LCL, FTL, LTL y COURIER. Cualquier cambio futuro debe
            hacerse mediante migraciones controladas.
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">Catalogo actual</h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                Consulta los tipos de servicio y sus tipos de transporte relacionados.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                placeholder="Buscar"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <select
                className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                value={serviceTypeFilter}
                onChange={(event) => setServiceTypeFilter(event.target.value)}
              >
                <option value="all">Todos los servicios</option>
                {LOCKED_SERVICE_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
            {loading ? (
              <div className="px-6 py-10 text-sm text-[#6B7280]">Cargando catálogo...</div>
            ) : items.length === 0 ? (
              <div className="p-6">
                <EmptyState hasQuery={Boolean(query.trim())} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                  <thead className="bg-[#F8FAFC]">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-[#475467]">
                        Tipo de servicio
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-[#475467]">
                        Tipo de transporte
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-[#475467]">
                        Ultima actualizacion
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-[#F8FAFC]">
                        <td className="px-4 py-3 font-medium text-[#111827]">{item.service_type}</td>
                        <td className="px-4 py-3 text-[#475467]">{item.transport_type}</td>
                        <td className="px-4 py-3 text-[#475467]">
                          {item.updated_at
                            ? new Date(item.updated_at).toLocaleString()
                            : item.created_at
                              ? new Date(item.created_at).toLocaleString()
                              : "Sin fecha"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </PageContainer>
  )
}
