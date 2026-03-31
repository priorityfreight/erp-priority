"use client"

import { type ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { useDeferredValue, useEffect, useMemo, useState } from "react"
import { StatusBadge } from "@/components/data/StatusBadge"
import { PageContainer } from "@/components/layout/PageContainer"
import { PriorityDataTable } from "@/components/priority/PriorityDataTable"
import { PriorityInput, PrioritySelectField } from "@/components/priority/PriorityForm"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getQuotations, type QuotationSummary } from "@/lib/db"
import { getErrorMessage, notifyError } from "@/lib/feedback"

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
      notifyError("No se pudieron cargar las cotizaciones", getErrorMessage(error, "Intenta nuevamente."))
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

  const quotationColumns = useMemo<ColumnDef<QuotationSummary>[]>(
    () => [
      {
        accessorKey: "reference_number",
        header: "Referencia",
        cell: ({ row }) => row.original.reference_number || "Pendiente",
      },
      {
        accessorKey: "client_name",
        header: "Cliente",
        cell: ({ row }) => row.original.client_name || "No client",
      },
      {
        accessorKey: "opportunity_title",
        header: "Oportunidad",
        cell: ({ row }) => row.original.opportunity_title || "Sin oportunidad",
      },
      {
        id: "service",
        header: "Servicio",
        cell: ({ row }) =>
          [row.original.service_type, row.original.transport_type].filter(Boolean).join(" / ") ||
          "No definido",
      },
      {
        id: "lane",
        header: "Lane",
        cell: ({ row }) =>
          row.original.origin && row.original.destination
            ? `${row.original.origin} -> ${row.original.destination}`
            : "No definido",
      },
      {
        accessorKey: "pricing_owner_name",
        header: "Pricing",
        cell: ({ row }) => row.original.pricing_owner_name || "Sin asignar",
      },
      {
        accessorKey: "status",
        header: "Estatus",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "expected_profit",
        header: "Profit",
        cell: ({ row }) => formatCurrency(row.original.expected_profit),
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button asChild type="button" variant="outline" size="sm">
              <Link href={`/quotations/${row.original.id}`}>Ver</Link>
            </Button>
          </div>
        ),
      },
    ],
    []
  )

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

        <section className="space-y-4 rounded-[28px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.95)] p-5 shadow-[0_28px_60px_-46px_rgba(3,10,24,0.45)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--brand-navy)]">Pipeline de cotizaciones</h2>
              <p className="mt-1 text-sm text-[#5B6A7D]">
                Consulta por cliente, lane, estatus, owner de pricing o referencia.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <PriorityInput
                placeholder="Buscar cotizacion"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <PrioritySelectField
                value={statusFilter}
                onValueChange={setStatusFilter}
                placeholder="Filtra por estatus"
                options={[
                  { value: "all", label: "Todos los estatus" },
                  ...statusOptions.map((status) => ({
                    value: status,
                    label: status,
                  })),
                ]}
              />
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 rounded-[20px]" />
              <Skeleton className="h-12 rounded-[20px]" />
              <Skeleton className="h-12 rounded-[20px]" />
            </div>
          ) : (
            <PriorityDataTable
              columns={quotationColumns}
              data={items}
              emptyTitle={totalCount === 0 ? "Sin cotizaciones" : "Sin resultados"}
              emptyDescription={
                totalCount === 0
                  ? "No hay cotizaciones todavía. Crea la primera desde una oportunidad con el boton cotizar."
                  : "No encontramos cotizaciones con los filtros actuales."
              }
              paginationMode="none"
            />
          )}

          {totalCount > 0 ? (
            <div className="flex flex-col gap-3 border-t border-[#E5E7EB] pt-4 text-sm text-[#6B7280] sm:flex-row sm:items-center sm:justify-between">
              <div>
                Mostrando {showingFrom} a {showingTo} de {totalCount} cotizaciones
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  disabled={page === 1 || loading}
                >
                  Anterior
                </Button>
                <div className="min-w-[96px] text-center">
                  Pagina {page} de {totalPages}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
                  disabled={page >= totalPages || loading}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </PageContainer>
  )
}
