"use client"

import Link from "next/link"
import { useDeferredValue, useEffect, useState } from "react"
import { StatusBadge } from "@/components/data/StatusBadge"
import { PageContainer } from "@/components/layout/PageContainer"
import { getQuotations, type QuotationSummary } from "@/lib/db"

const statusOptions = [
  "borrador",
  "pendiente",
  "cotizando",
  "lista_para_enviar",
  "enviada",
  "cancelada",
  "rechazada",
  "renegociar_tarifa",
  "aceptada",
]

function formatCurrency(value: number | null | undefined) {
  if (value == null) {
    return "No disponible"
  }

  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function QuotationsPage() {
  const [items, setItems] = useState<QuotationSummary[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const pageSize = 25

  async function loadItems(search = "", status = "all", nextPage = 1) {
    try {
      setLoading(true)
      const data = await getQuotations({
        scope: "crm",
        query: search,
        status,
        page: nextPage,
        pageSize,
      })
      setItems(data.items)
      setTotalCount(data.totalCount)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
  }, [deferredQuery, statusFilter])

  useEffect(() => {
    void loadItems(deferredQuery, statusFilter, page)
  }, [deferredQuery, page, statusFilter])

  const totalSales = items.reduce((sum, item) => sum + (item.estimated_price ?? 0), 0)
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const showingFrom = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const showingTo = totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount)

  return (
    <PageContainer
      title="Quotations"
      description="Vista CRM de cotizaciones nacidas desde oportunidades y listas para seguimiento comercial."
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Cotizaciones
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">{totalCount}</div>
          </div>
          <div className="rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#1D4ED8]">
              Borradores
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {items.filter((item) => item.status === "borrador").length}
            </div>
          </div>
          <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#B45309]">
              Lista para enviar
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {items.filter((item) => item.status === "lista_para_enviar").length}
            </div>
          </div>
          <div className="rounded-xl border border-[#DCFCE7] bg-[#F0FDF4] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#15803D]">
              Venta estimada
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {formatCurrency(totalSales)}
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">Pipeline de cotizaciones</h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                Consulta por cliente, lane, estatus, owner de pricing o referencia.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                placeholder="Buscar cotizacion"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <select
                className="rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">Todos los estatus</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-[#6B7280]">Cargando cotizaciones...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-[#6B7280]">
              No hay cotizaciones todavía. Crea la primera desde una oportunidad con el boton
              cotizar.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
              <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  <tr>
                    <th className="px-4 py-3">Referencia</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Oportunidad</th>
                    <th className="px-4 py-3">Servicio</th>
                    <th className="px-4 py-3">Lane</th>
                    <th className="px-4 py-3">Pricing</th>
                    <th className="px-4 py-3">Estatus</th>
                    <th className="px-4 py-3">Profit</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] bg-white">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-[#111827]">
                        {item.reference_number || "Pendiente"}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">{item.client_name || "No client"}</td>
                      <td className="px-4 py-3 text-[#475569]">
                        {item.opportunity_title || "Sin oportunidad"}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {[item.service_type, item.transport_type].filter(Boolean).join(" / ") ||
                          "No definido"}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {item.origin && item.destination
                          ? `${item.origin} -> ${item.destination}`
                          : "No definido"}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {item.pricing_owner_name || "Sin asignar"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {formatCurrency(item.expected_profit)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Link
                            href={`/quotations/${item.id}`}
                            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 font-medium text-[#111827] hover:bg-[#F8FAFC]"
                          >
                            Ver
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalCount > 0 ? (
            <div className="flex flex-col gap-3 border-t border-[#E5E7EB] pt-4 text-sm text-[#6B7280] sm:flex-row sm:items-center sm:justify-between">
              <div>
                Mostrando {showingFrom} a {showingTo} de {totalCount} cotizaciones
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  disabled={page === 1 || loading}
                  className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 font-medium text-[#111827] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Anterior
                </button>
                <div className="min-w-[96px] text-center">
                  Pagina {page} de {totalPages}
                </div>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
                  disabled={page >= totalPages || loading}
                  className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 font-medium text-[#111827] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Siguiente
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </PageContainer>
  )
}
