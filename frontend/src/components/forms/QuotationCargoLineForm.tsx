"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  PriorityFormHeader,
  PriorityInfoField,
  PrioritySubmitBar,
} from "@/components/priority/PriorityForm"
import { PrioritySectionAlert } from "@/components/priority/PrioritySectionAlert"
import { PriorityTypography } from "@/components/priority/PriorityTypography"
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

  return (
    <section className="space-y-5 rounded-[28px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(245,247,250,0.96)_100%)] p-5 shadow-[0_28px_60px_-44px_rgba(3,10,24,0.42)]">
      <PriorityFormHeader title={title} description={description} />

      <div className="overflow-x-auto rounded-xl border border-[#D1D5DB] bg-white">
        <div className="min-w-[1120px]">
          <div className="grid grid-cols-[120px_140px_120px_120px_120px_120px_minmax(220px,1fr)_96px] border-b border-[#E5E7EB] bg-[#EEF2FF]">
            {["Cantidad", "Tipo", "Largo (cm)", "Ancho (cm)", "Alto (cm)", "Peso (kg)", "Commodities", ""].map(
              (label) => (
                <div
                  key={label}
                  className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#475569]"
                >
                  {label}
                </div>
              )
            )}
          </div>
          {rows.map((row) => (
            <div
              key={row.draftId}
              className="grid grid-cols-[120px_140px_120px_120px_120px_120px_minmax(220px,1fr)_96px] border-b border-[#E5E7EB] last:border-b-0"
            >
              <input
                className="border-r border-[#E5E7EB] px-3 py-3 text-sm outline-none placeholder:text-[#94A3B8] focus:bg-[#F8FAFC]"
                placeholder="Cantidad"
                inputMode="numeric"
                value={row.pieceCount}
                onChange={(event) => onChangeRow(row.draftId, "pieceCount", event.target.value)}
              />
              <select
                className="border-r border-[#E5E7EB] bg-white px-3 py-3 text-sm outline-none focus:bg-[#F8FAFC]"
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
              <input
                className="border-r border-[#E5E7EB] px-3 py-3 text-sm outline-none placeholder:text-[#94A3B8] focus:bg-[#F8FAFC]"
                placeholder="Largo"
                inputMode="decimal"
                value={row.length}
                onChange={(event) => onChangeRow(row.draftId, "length", event.target.value)}
              />
              <input
                className="border-r border-[#E5E7EB] px-3 py-3 text-sm outline-none placeholder:text-[#94A3B8] focus:bg-[#F8FAFC]"
                placeholder="Ancho"
                inputMode="decimal"
                value={row.width}
                onChange={(event) => onChangeRow(row.draftId, "width", event.target.value)}
              />
              <input
                className="border-r border-[#E5E7EB] px-3 py-3 text-sm outline-none placeholder:text-[#94A3B8] focus:bg-[#F8FAFC]"
                placeholder="Alto"
                inputMode="decimal"
                value={row.height}
                onChange={(event) => onChangeRow(row.draftId, "height", event.target.value)}
              />
              <input
                className="border-r border-[#E5E7EB] px-3 py-3 text-sm outline-none placeholder:text-[#94A3B8] focus:bg-[#F8FAFC]"
                placeholder="Peso"
                inputMode="decimal"
                value={row.weight}
                onChange={(event) => onChangeRow(row.draftId, "weight", event.target.value)}
              />
              <input
                className="border-r border-[#E5E7EB] px-3 py-3 text-sm outline-none placeholder:text-[#94A3B8] focus:bg-[#F8FAFC]"
                placeholder="Describe la mercancia"
                value={row.commodities}
                onChange={(event) => onChangeRow(row.draftId, "commodities", event.target.value)}
              />
              <div className="flex items-center justify-center px-2 py-2">
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
                    Quitar
                  </Button>
                ) : (
                  <PriorityTypography variant="fieldLabel" className="text-transparent">
                    ---
                  </PriorityTypography>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-start">
        <Button
          type="button"
          onClick={onAddRow}
          variant="outline"
          className="border-[#CBD5E1] bg-white text-[var(--brand-navy)] hover:bg-[#F8FAFC]"
        >
          Anadir otro tipo de carga
        </Button>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
        <PriorityTypography variant="cardTitle">{labels.helperTitle}</PriorityTypography>
        <PriorityTypography variant="bodyMuted" className="mt-1">
          {labels.helperDescription} El acumulado considera todos los renglones de la consolidacion.
        </PriorityTypography>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
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
        <div className="mt-4 grid gap-3 md:grid-cols-2">
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
        <PrioritySubmitBar>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? "Guardando..." : submitLabel}
          </Button>
        </PrioritySubmitBar>
      ) : null}
    </section>
  )
}
