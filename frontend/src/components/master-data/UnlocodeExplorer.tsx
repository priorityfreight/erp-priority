"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { useEffect, useMemo, useState } from "react"
import { PageContainer } from "@/components/layout/PageContainer"
import { PriorityCollectionTable } from "@/components/priority/collection/PriorityCollectionTable"
import { PriorityEmptyState } from "@/components/priority/PriorityEmptyState"
import { PriorityInput, PrioritySelectField } from "@/components/priority/PriorityForm"
import { PriorityMetricCard, PriorityMetricStrip } from "@/components/priority/PriorityWorkspace"
import { PriorityCardTitle, PriorityTypography } from "@/components/priority/PriorityTypography"
import { PriorityToolbar } from "@/components/priority/PriorityToolbar"
import { Button } from "@/components/ui/button"
import { searchUnlocodes, type UnlocodeCountrySummary, type UnlocodeRecord, type UnlocodeSearchResult } from "@/lib/db"

const pageSize = 25

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <PriorityEmptyState
      title={hasQuery ? "Sin coincidencias UN/LOCODE" : "Sin datos UN/LOCODE"}
      description={
        hasQuery
          ? "No hay registros UN/LOCODE que coincidan con la búsqueda actual."
          : "No hay datos UN/LOCODE disponibles para el filtro seleccionado."
      }
      variant={hasQuery ? "search" : "default"}
    />
  )
}

export function UnlocodeExplorer() {
  const [result, setResult] = useState<UnlocodeSearchResult | null>(null)
  const [query, setQuery] = useState("")
  const [countryCode, setCountryCode] = useState("all")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    searchUnlocodes({
      query,
      countryCode,
      page,
      pageSize,
    })
      .then((data) => {
        if (!cancelled) {
          setResult(data)
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
  }, [query, countryCode, page])

  const items = result?.items ?? []
  const total = result?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const summaries = result?.countrySummaries ?? []
  const countryOptions = result?.availableCountries ?? ["MX", "US", "CA"]
  const currentRangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const currentRangeEnd = Math.min(page * pageSize, total)
  const highlightedSummary: UnlocodeCountrySummary | undefined =
    countryCode === "all"
      ? undefined
      : summaries.find((entry) => entry.country_code === countryCode.toUpperCase())
  const columns = useMemo<ColumnDef<UnlocodeRecord>[]>(
    () => [
      {
        accessorKey: "unlocode",
        header: "UN/LOCODE",
        cell: ({ row }) => row.original.unlocode,
      },
      {
        id: "location",
        header: "Ubicación",
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-[#111827]">{row.original.name}</div>
            <div className="mt-1 text-xs text-[#6B7280]">
              {row.original.name_without_diacritics || "Sin nombre alterno"}
            </div>
          </div>
        ),
      },
      {
        id: "country",
        header: "País",
        cell: ({ row }) => `${row.original.country_code} · ${row.original.country_name}`,
      },
      {
        accessorKey: "subdivision_code",
        header: "Subdivisión",
        cell: ({ row }) => row.original.subdivision_code || "N/A",
      },
      {
        accessorKey: "function_classifier",
        header: "Funciones",
        cell: ({ row }) => row.original.function_classifier || "N/A",
      },
      {
        accessorKey: "iata_code",
        header: "IATA",
        cell: ({ row }) => row.original.iata_code || "N/A",
      },
      {
        accessorKey: "coordinates",
        header: "Coordenadas",
        cell: ({ row }) => row.original.coordinates || "N/A",
      },
    ],
    []
  )

  return (
    <PageContainer
      title="UN/LOCODE"
      description="Consulta operativa de solo lectura para códigos UNECE de comercio y transporte."
      actions={
        <div className="rounded-full border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-1 text-xs font-medium text-[#475569]">
          Modo fuente: {result?.mode ?? "cargando"}
        </div>
      }
    >
      <div className="space-y-8">
        <PriorityMetricStrip>
          <PriorityMetricCard label="Resultados visibles" value={total.toLocaleString()} helper="Resultados que respetan país y búsqueda." tone="info" />
          <PriorityMetricCard label="Países activos" value={countryCode === "all" ? countryOptions.length : 1} helper="Cobertura visible en esta ventana." tone="success" />
          <PriorityMetricCard
            label="Foco país"
            value={highlightedSummary ? `${highlightedSummary.country_code}` : "MX / US / CA"}
            helper={highlightedSummary ? `${highlightedSummary.row_count.toLocaleString()} registros` : "Foco por país cuando conviene."}
            tone="warning"
          />
          <PriorityMetricCard label="Ventana actual" value={`${currentRangeStart.toLocaleString()}-${currentRangeEnd.toLocaleString()}`} helper={`de ${total.toLocaleString()} totales`} tone="default" />
        </PriorityMetricStrip>

        <section className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <PriorityCardTitle>Explorador de ubicaciones</PriorityCardTitle>
              <PriorityTypography variant="bodyMuted" className="mt-1">
                Busca por UN/LOCODE, nombre de ubicación, subdivisión, IATA o coordenadas.
              </PriorityTypography>
            </div>
            <PriorityToolbar className="flex flex-col gap-3 sm:flex-row">
              <PriorityInput
                placeholder="Buscar código o ubicación…"
                value={query}
                onChange={(event) => {
                  setLoading(true)
                  setPage(1)
                  setQuery(event.target.value)
                }}
              />
              <PrioritySelectField
                value={countryCode}
                onValueChange={(value) => {
                  setLoading(true)
                  setPage(1)
                  setCountryCode(value)
                }}
                placeholder="País"
                options={[
                  { value: "all", label: "Todos los países" },
                  ...countryOptions.map((code) => ({ value: code, label: code })),
                ]}
              />
            </PriorityToolbar>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {summaries.map((entry) => {
              const active = countryCode === entry.country_code
              return (
                <button
                  key={entry.country_code}
                  type="button"
                  onClick={() => {
                    setLoading(true)
                    setPage(1)
                    setCountryCode(active ? "all" : entry.country_code)
                  }}
                  className={[
                    "rounded-full border px-3 py-1 font-medium transition-colors",
                    active
                      ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]"
                      : "border-[#E5E7EB] bg-white text-[#475569] hover:border-[#BFDBFE] hover:text-[#1D4ED8]",
                  ].join(" ")}
                >
                  {entry.country_code} · {entry.row_count.toLocaleString()}
                </button>
              )
            })}
          </div>

          {loading ? (
            <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-10 text-center text-sm text-[#6B7280]">
              Cargando datos UN/LOCODE...
            </div>
          ) : items.length === 0 ? (
            <EmptyState hasQuery={Boolean(query.trim())} />
          ) : (
            <PriorityCollectionTable
              columns={columns}
              data={items}
              emptyTitle="Sin resultados UN/LOCODE"
              emptyDescription="Ajusta la búsqueda o el filtro por país para seguir explorando."
              paginationMode="none"
              getRowId={(row) => row.id}
              footerContent={
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      setLoading(true)
                      setPage((current) => Math.max(1, current - 1))
                    }}
                    type="button"
                    variant="outline"
                    disabled={page <= 1}
                  >
                    Anterior
                  </Button>
                  <div className="min-w-[118px] text-center text-sm text-[#526175]">
                    Página {page} de {totalPages}
                  </div>
                  <Button
                    onClick={() => {
                      setLoading(true)
                      setPage((current) => Math.min(totalPages, current + 1))
                    }}
                    type="button"
                    variant="outline"
                    disabled={page >= totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              }
            />
          )}

          <PriorityTypography variant="caption" className="uppercase tracking-[0.14em]">
            Ventana {currentRangeStart.toLocaleString()}-{currentRangeEnd.toLocaleString()} de {total.toLocaleString()}
          </PriorityTypography>
        </section>
      </div>
    </PageContainer>
  )
}
