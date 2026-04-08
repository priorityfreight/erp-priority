"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer } from "@/components/layout/PageContainer"
import { PriorityCollectionTable } from "@/components/priority/collection/PriorityCollectionTable"
import { PriorityInput, PrioritySelectField } from "@/components/priority/PriorityForm"
import { PrioritySectionAlert } from "@/components/priority/PrioritySectionAlert"
import { PriorityCardTitle, PriorityTypography } from "@/components/priority/PriorityTypography"
import { PriorityToolbar } from "@/components/priority/PriorityToolbar"
import { getServiceTransportTypes, type ServiceTransportType } from "@/lib/db"

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

  const serviceOptions = useMemo(
    () => [{ value: "all", label: "Todos los servicios" }].concat(
      LOCKED_SERVICE_TYPES.map((option) => ({ value: option, label: option }))
    ),
    []
  )

  const columns = useMemo<ColumnDef<ServiceTransportType>[]>(
    () => [
      {
        accessorKey: "service_type",
        header: "Tipo de servicio",
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-medium text-[var(--brand-navy)]">{row.original.service_type}</div>
            <Badge variant="secondary">Catalogo bloqueado</Badge>
          </div>
        ),
      },
      {
        accessorKey: "transport_type",
        header: "Tipo de transporte",
      },
      {
        id: "updated",
        header: "Ultima actualizacion",
        cell: ({ row }) =>
          row.original.updated_at
            ? new Date(row.original.updated_at).toLocaleString()
            : row.original.created_at
              ? new Date(row.original.created_at).toLocaleString()
              : "Sin fecha",
      },
    ],
    []
  )

  return (
    <PageContainer
      density="compact"
      title="Tipos de servicio"
      description="Catalogo canónico bloqueado para ventas, pricing, oportunidades, cotizaciones y operaciones."
      actions={
        <div className="rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-3 py-1 text-xs font-medium text-[#B45309]">
          Catalogo bloqueado
        </div>
      }
    >
      <div className="space-y-4">
        <section className="grid gap-2.5 md:grid-cols-3">
          <div className="rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#1D4ED8]">
              Registros
            </div>
            <div className="mt-1 text-[1.45rem] font-semibold text-[#111827]">{items.length}</div>
          </div>
          <div className="rounded-xl border border-[#D1FAE5] bg-[#ECFDF5] p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#047857]">
              Tipos canónicos
            </div>
            <div className="mt-1 text-[1.45rem] font-semibold text-[#111827]">{groupedCount}</div>
          </div>
          <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#B45309]">
              Lista permitida
            </div>
            <div className="mt-1 text-sm font-medium text-[#111827]">
              {LOCKED_SERVICE_TYPES.join(", ")}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-3">
          <PrioritySectionAlert title="Regla del sistema" variant="warning">
            Este catálogo ya no se edita desde la aplicación. Los tipos de servicio válidos
            son únicamente AIR, FCL, LCL, FTL, LTL y COURIER. Cualquier cambio futuro debe
            hacerse mediante migraciones controladas.
          </PrioritySectionAlert>
        </section>

        <section className="space-y-4 rounded-[24px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.92)] p-5 shadow-[0_24px_44px_-38px_rgba(3,10,24,0.28)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <PriorityCardTitle>Catalogo actual</PriorityCardTitle>
              <PriorityTypography variant="bodyMuted" className="mt-1">
                Consulta los tipos de servicio y sus tipos de transporte relacionados.
              </PriorityTypography>
            </div>
            <PriorityToolbar density="compact" className="grid gap-2.5 xl:grid-cols-[minmax(0,1.4fr)_minmax(220px,1fr)_auto]">
              <PriorityInput
                placeholder="Buscar"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <PrioritySelectField
                value={serviceTypeFilter}
                onValueChange={setServiceTypeFilter}
                placeholder="Servicio"
                options={serviceOptions}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setQuery("")
                  setServiceTypeFilter("all")
                }}
              >
                Limpiar
              </Button>
            </PriorityToolbar>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 rounded-[18px]" />
              <Skeleton className="h-12 rounded-[18px]" />
              <Skeleton className="h-12 rounded-[18px]" />
            </div>
          ) : (
            <PriorityCollectionTable
              columns={columns}
              data={items}
              emptyTitle={
                query.trim() ? "No hay registros que coincidan con la busqueda actual" : "No hay tipos de servicio disponibles"
              }
              emptyDescription="Consulta el catalogo canonico bloqueado. Cualquier cambio debe hacerse por migracion controlada."
            />
          )}
        </section>
      </div>
    </PageContainer>
  )
}
