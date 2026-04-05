"use client"

import { useMemo } from "react"
import type { ColDef } from "ag-grid-community"
import { Button } from "@/components/ui/button"
import {
  PriorityFormShell,
  PriorityFormHeader,
  PriorityInfoField,
  PrioritySubmitBar,
} from "@/components/priority/PriorityForm"
import { PrioritySectionAlert } from "@/components/priority/PrioritySectionAlert"
import { PriorityTypography } from "@/components/priority/PriorityTypography"
import { PriorityGrid } from "@/components/priority/grid/PriorityGrid"
import { PriorityGridToolbar } from "@/components/priority/grid/PriorityGridToolbar"
import {
  calculateCbm,
  calculateVolumetricWeightKg,
  estimateFreightClass,
  estimateFreightClassFromTotals,
  toNumberOrNull,
} from "@/lib/quotations/calculations"
import type { QuotationCargoLine } from "@/lib/db"

export type QuotationCargoLineFormValues = {
  draftId: string
  existingCargoId?: string | null
  loadType: string
  commodities: string
  pieceCount: string
  width: string
  length: string
  height: string
  weight: string
}

type QuotationCargoLineFormProps = {
  title: string
  description?: string
  serviceType: string | null
  rows: QuotationCargoLineFormValues[]
  existingLines?: QuotationCargoLine[]
  onChangeRow: (
    draftId: string,
    field: keyof Omit<QuotationCargoLineFormValues, "draftId" | "existingCargoId">,
    value: string
  ) => void
  onAddRow: () => void
  onRemoveRow: (draftId: string) => void
  onSubmit?: () => void
  submitLabel?: string
  loading?: boolean
}

const loadTypeOptions = ["Pallet", "Box", "Crate", "Case"]

function getComputedLabels(serviceType: string | null) {
  switch ((serviceType || "").toUpperCase()) {
    case "LTL":
      return {
        helperTitle: "Clase de carga estimada",
        helperDescription:
          "Se calcula por densidad estimada usando dimensiones en cm y peso en kg.",
      }
    case "LCL":
      return {
        helperTitle: "CBM calculado",
        helperDescription: "Se calcula por largo × ancho × alto × piezas / 1,000,000.",
      }
    case "AIR":
    case "COURIER":
      return {
        helperTitle: "Peso volumetrico",
        helperDescription: "Se calcula con divisor 5000 usando dimensiones en cm.",
      }
    default:
      return {
        helperTitle: "Calculos",
        helperDescription: "Captura piezas, dimensiones y peso para calcular referencias.",
      }
  }
}

export function QuotationCargoLineForm({
  title,
  description,
  serviceType,
  rows,
  existingLines = [],
  onChangeRow,
  onAddRow,
  onRemoveRow,
  onSubmit,
  submitLabel = "Guardar detalle",
  loading = false,
}: QuotationCargoLineFormProps) {
  const gridHeight = rows.length <= 2 ? 214 : Math.min(196 + rows.length * 70, 420)

  const rowComputations = useMemo(
    () =>
      rows.map((row) => {
        const pieceCount = toNumberOrNull(row.pieceCount)
        const width = toNumberOrNull(row.width)
        const length = toNumberOrNull(row.length)
        const height = toNumberOrNull(row.height)
        const weight = toNumberOrNull(row.weight)
        const cbm = calculateCbm({
          pieceCount,
          widthCm: width,
          lengthCm: length,
          heightCm: height,
        })
        const volumetricWeightKg = calculateVolumetricWeightKg({
          pieceCount,
          widthCm: width,
          lengthCm: length,
          heightCm: height,
        })
        const estimatedClass = estimateFreightClass({
          pieceCount,
          widthCm: width,
          lengthCm: length,
          heightCm: height,
          weightKg: weight,
        })

        return {
          draftId: row.draftId,
          pieceCount,
          weight,
          cbm,
          volumetricWeightKg,
          estimatedClass,
        }
      }),
    [rows]
  )

  const aggregateComputed = useMemo(() => {
    const editingIds = new Set(
      rows.map((row) => row.existingCargoId).filter((value): value is string => Boolean(value))
    )
    const filteredExistingLines = existingLines.filter((line) => !editingIds.has(line.id))
    const draftTotals = rowComputations.reduce(
      (accumulator, row) => ({
        totalPieceCount: accumulator.totalPieceCount + (row.pieceCount ?? 0),
        totalWeightKg: accumulator.totalWeightKg + (row.weight ?? 0),
        totalCbm: accumulator.totalCbm + (row.cbm ?? 0),
        totalVolumetricWeightKg:
          accumulator.totalVolumetricWeightKg + (row.volumetricWeightKg ?? 0),
      }),
      {
        totalPieceCount: 0,
        totalWeightKg: 0,
        totalCbm: 0,
        totalVolumetricWeightKg: 0,
      }
    )
    const totalPieceCount =
      filteredExistingLines.reduce((sum, line) => sum + (line.piece_count ?? 0), 0) +
      draftTotals.totalPieceCount
    const totalWeightKg =
      filteredExistingLines.reduce((sum, line) => sum + (line.weight ?? 0), 0) +
      draftTotals.totalWeightKg
    const totalCbm =
      filteredExistingLines.reduce((sum, line) => sum + (line.cbm ?? 0), 0) +
      draftTotals.totalCbm
    const totalVolumetricWeightKg =
      filteredExistingLines.reduce((sum, line) => sum + (line.volumetric_weight_kg ?? 0), 0) +
      draftTotals.totalVolumetricWeightKg

    return {
      totalPieceCount,
      totalWeightKg,
      totalCbm: totalCbm > 0 ? totalCbm : null,
      totalVolumetricWeightKg:
        totalVolumetricWeightKg > 0 ? totalVolumetricWeightKg : null,
      estimatedClass: estimateFreightClassFromTotals({
        totalCbm: totalCbm > 0 ? totalCbm : null,
        totalWeightKg: totalWeightKg > 0 ? totalWeightKg : null,
      }),
    }
  }, [existingLines, rowComputations, rows])

  const labels = getComputedLabels(serviceType)
  const columns = useMemo<Array<ColDef<QuotationCargoLineFormValues>>>(
    () => [
      {
        field: "pieceCount",
        headerName: "Cantidad",
        minWidth: 120,
        cellRenderer: (params: { data?: QuotationCargoLineFormValues }) => (
          <input
            className="h-11 w-full rounded-[16px] border border-[#D1D6DF] px-3 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-burgundy-light)]"
            placeholder="Cantidad"
            inputMode="numeric"
            value={params.data?.pieceCount ?? ""}
            onChange={(event) => {
              if (params.data) {
                onChangeRow(params.data.draftId, "pieceCount", event.target.value)
              }
            }}
          />
        ),
      },
      {
        field: "loadType",
        headerName: "Tipo",
        minWidth: 140,
        cellRenderer: (params: { data?: QuotationCargoLineFormValues }) => (
          <select
            className="h-11 w-full rounded-[16px] border border-[#D1D6DF] bg-white px-3 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-burgundy-light)]"
            value={params.data?.loadType ?? ""}
            onChange={(event) => {
              if (params.data) {
                onChangeRow(params.data.draftId, "loadType", event.target.value)
              }
            }}
          >
            <option value="">Tipo</option>
            {loadTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ),
      },
      {
        field: "length",
        headerName: "Largo (cm)",
        minWidth: 130,
        cellRenderer: (params: { data?: QuotationCargoLineFormValues }) => (
          <input
            className="h-11 w-full rounded-[16px] border border-[#D1D6DF] px-3 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-burgundy-light)]"
            placeholder="Largo"
            inputMode="decimal"
            value={params.data?.length ?? ""}
            onChange={(event) => {
              if (params.data) {
                onChangeRow(params.data.draftId, "length", event.target.value)
              }
            }}
          />
        ),
      },
      {
        field: "width",
        headerName: "Ancho (cm)",
        minWidth: 130,
        cellRenderer: (params: { data?: QuotationCargoLineFormValues }) => (
          <input
            className="h-11 w-full rounded-[16px] border border-[#D1D6DF] px-3 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-burgundy-light)]"
            placeholder="Ancho"
            inputMode="decimal"
            value={params.data?.width ?? ""}
            onChange={(event) => {
              if (params.data) {
                onChangeRow(params.data.draftId, "width", event.target.value)
              }
            }}
          />
        ),
      },
      {
        field: "height",
        headerName: "Alto (cm)",
        minWidth: 130,
        cellRenderer: (params: { data?: QuotationCargoLineFormValues }) => (
          <input
            className="h-11 w-full rounded-[16px] border border-[#D1D6DF] px-3 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-burgundy-light)]"
            placeholder="Alto"
            inputMode="decimal"
            value={params.data?.height ?? ""}
            onChange={(event) => {
              if (params.data) {
                onChangeRow(params.data.draftId, "height", event.target.value)
              }
            }}
          />
        ),
      },
      {
        field: "weight",
        headerName: "Peso (kg)",
        minWidth: 130,
        cellRenderer: (params: { data?: QuotationCargoLineFormValues }) => (
          <input
            className="h-11 w-full rounded-[16px] border border-[#D1D6DF] px-3 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-burgundy-light)]"
            placeholder="Peso"
            inputMode="decimal"
            value={params.data?.weight ?? ""}
            onChange={(event) => {
              if (params.data) {
                onChangeRow(params.data.draftId, "weight", event.target.value)
              }
            }}
          />
        ),
      },
      {
        field: "commodities",
        headerName: "Mercancía",
        minWidth: 240,
        flex: 1,
        cellRenderer: (params: { data?: QuotationCargoLineFormValues }) => (
          <input
            className="h-11 w-full rounded-[16px] border border-[#D1D6DF] px-3 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-burgundy-light)]"
            placeholder="Describe la mercancía"
            value={params.data?.commodities ?? ""}
            onChange={(event) => {
              if (params.data) {
                onChangeRow(params.data.draftId, "commodities", event.target.value)
              }
            }}
          />
        ),
      },
      {
        headerName: "Acción",
        minWidth: 120,
        sortable: false,
        filter: false,
        cellRenderer: (params: { data?: QuotationCargoLineFormValues }) => {
          const row = params.data
          if (!row) return null

          if (row.existingCargoId) {
            return (
              <PriorityTypography variant="fieldLabel" className="text-[#94A3B8]">
                Base
              </PriorityTypography>
            )
          }

          if (rows.length <= 1) {
            return (
              <PriorityTypography variant="fieldLabel" className="text-[#94A3B8]">
                Activa
              </PriorityTypography>
            )
          }

          return (
            <Button
              type="button"
              onClick={() => onRemoveRow(row.draftId)}
              variant="outline"
              className="border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] hover:bg-[#FEE2E2] hover:text-[#991B1B]"
            >
              Quitar
            </Button>
          )
        },
      },
    ],
    [onChangeRow, onRemoveRow, rows.length]
  )

  return (
    <PriorityFormShell density="compact" className="space-y-4">
      <PriorityFormHeader title={title} description={description} density="compact" />

      <PriorityGrid
        mode="hybrid"
        rowData={rows}
        columnDefs={columns}
        mobileBreakpoint={767}
        emptyTitle="Sin renglones de carga"
        emptyDescription="Agrega al menos un tipo de carga para estimar volumen, peso y clase."
        height={gridHeight}
        rowHeight={76}
        getRowId={(params) => params.data.draftId}
        toolbar={
          <PriorityGridToolbar
            density="compact"
            title="Detalle tabular de carga"
            description="Captura piezas, dimensiones y peso en formato denso. En móvil se transforma a tarjetas editables."
            actions={
              <Button
                type="button"
                onClick={onAddRow}
                variant="outline"
                className="border-[#CBD5E1] bg-white text-[var(--brand-navy)] hover:bg-[#F8FAFC]"
              >
                Añadir otro tipo de carga
              </Button>
            }
          />
        }
        renderMobileCard={(row) => (
          <div className="space-y-4 rounded-[22px] border border-[var(--border-subtle)] bg-white p-4 shadow-[0_20px_40px_-34px_rgba(3,10,24,0.26)]">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">Cantidad</span>
                <input
                  className="h-11 w-full rounded-[16px] border border-[#D1D6DF] px-3 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-burgundy-light)]"
                  placeholder="Cantidad"
                  inputMode="numeric"
                  value={row.pieceCount}
                  onChange={(event) => onChangeRow(row.draftId, "pieceCount", event.target.value)}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">Tipo</span>
                <select
                  className="h-11 w-full rounded-[16px] border border-[#D1D6DF] bg-white px-3 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-burgundy-light)]"
                  value={row.loadType}
                  onChange={(event) => onChangeRow(row.draftId, "loadType", event.target.value)}
                >
                  <option value="">Tipo</option>
                  {loadTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">Largo (cm)</span>
                <input
                  className="h-11 w-full rounded-[16px] border border-[#D1D6DF] px-3 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-burgundy-light)]"
                  placeholder="Largo"
                  inputMode="decimal"
                  value={row.length}
                  onChange={(event) => onChangeRow(row.draftId, "length", event.target.value)}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">Ancho (cm)</span>
                <input
                  className="h-11 w-full rounded-[16px] border border-[#D1D6DF] px-3 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-burgundy-light)]"
                  placeholder="Ancho"
                  inputMode="decimal"
                  value={row.width}
                  onChange={(event) => onChangeRow(row.draftId, "width", event.target.value)}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">Alto (cm)</span>
                <input
                  className="h-11 w-full rounded-[16px] border border-[#D1D6DF] px-3 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-burgundy-light)]"
                  placeholder="Alto"
                  inputMode="decimal"
                  value={row.height}
                  onChange={(event) => onChangeRow(row.draftId, "height", event.target.value)}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">Peso (kg)</span>
                <input
                  className="h-11 w-full rounded-[16px] border border-[#D1D6DF] px-3 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-burgundy-light)]"
                  placeholder="Peso"
                  inputMode="decimal"
                  value={row.weight}
                  onChange={(event) => onChangeRow(row.draftId, "weight", event.target.value)}
                />
              </label>
            </div>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">Mercancía</span>
              <input
                className="h-11 w-full rounded-[16px] border border-[#D1D6DF] px-3 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-burgundy-light)]"
                placeholder="Describe la mercancía"
                value={row.commodities}
                onChange={(event) => onChangeRow(row.draftId, "commodities", event.target.value)}
              />
            </label>

            <div className="flex justify-end">
              {row.existingCargoId ? (
                <PriorityTypography variant="fieldLabel" className="text-[#94A3B8]">
                  Base
                </PriorityTypography>
              ) : rows.length > 1 ? (
                <Button
                  type="button"
                  onClick={() => onRemoveRow(row.draftId)}
                  variant="outline"
                  className="border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] hover:bg-[#FEE2E2] hover:text-[#991B1B]"
                >
                  Quitar renglón
                </Button>
              ) : (
                <PriorityTypography variant="fieldLabel" className="text-[#94A3B8]">
                  Renglón activo
                </PriorityTypography>
              )}
            </div>
          </div>
        )}
      />

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-3.5">
        <PriorityTypography variant="cardTitle">{labels.helperTitle}</PriorityTypography>
        <PriorityTypography variant="bodyMuted" className="mt-1">
          {labels.helperDescription} El acumulado considera todos los renglones de la consolidacion.
        </PriorityTypography>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <PriorityInfoField
            label="CBM"
            value={aggregateComputed.totalCbm != null ? aggregateComputed.totalCbm.toFixed(3) : "No disponible"}
          />
          <PriorityInfoField
            label="KG / VOL"
            value={
              aggregateComputed.totalVolumetricWeightKg != null
                ? aggregateComputed.totalVolumetricWeightKg.toFixed(2)
                : "No disponible"
            }
          />
          <PriorityInfoField label="Clase estimada" value={aggregateComputed.estimatedClass || "No disponible"} />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <PriorityInfoField
            label="Cantidad total"
            value={aggregateComputed.totalPieceCount > 0 ? String(aggregateComputed.totalPieceCount) : "No disponible"}
          />
          <PriorityInfoField
            label="Peso total"
            value={
              aggregateComputed.totalWeightKg > 0
                ? `${aggregateComputed.totalWeightKg.toFixed(2)} kg`
                : "No disponible"
            }
          />
        </div>
      </div>

      <PrioritySectionAlert title="Captura tabular" variant="info">
        Este formulario prioriza velocidad de captura. Usa un renglon por tipo de carga y agrega otro solo cuando la consolidacion lo requiera.
      </PrioritySectionAlert>

      {onSubmit ? (
        <PrioritySubmitBar density="compact" mode="inline">
          <Button
            type="button"
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? "Guardando..." : submitLabel}
          </Button>
        </PrioritySubmitBar>
      ) : null}
    </PriorityFormShell>
  )
}
