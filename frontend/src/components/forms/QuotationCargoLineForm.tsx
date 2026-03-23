"use client"

import { useMemo } from "react"
import {
  calculateCbm,
  calculateVolumetricWeightKg,
  estimateFreightClass,
  toNumberOrNull,
} from "@/lib/quotations/calculations"

export type QuotationCargoLineFormValues = {
  loadType: string
  commodities: string
  pieceCount: string
  width: string
  length: string
  height: string
  weight: string
  freightClass: string
  sortOrder: string
}

type QuotationCargoLineFormProps = {
  title: string
  description?: string
  serviceType: string | null
  values: QuotationCargoLineFormValues
  onChange: (field: keyof QuotationCargoLineFormValues, value: string) => void
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
  values,
  onChange,
  onSubmit,
  submitLabel = "Guardar detalle",
  loading = false,
}: QuotationCargoLineFormProps) {
  const pieceCount = toNumberOrNull(values.pieceCount)
  const width = toNumberOrNull(values.width)
  const length = toNumberOrNull(values.length)
  const height = toNumberOrNull(values.height)
  const weight = toNumberOrNull(values.weight)

  const computed = useMemo(() => {
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
      cbm,
      volumetricWeightKg,
      estimatedClass,
    }
  }, [height, length, pieceCount, weight, width])

  const labels = getComputedLabels(serviceType)

  return (
    <section className="space-y-4 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
      <div>
        <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[#6B7280]">{description}</p> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <select
          className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          value={values.loadType}
          onChange={(event) => onChange("loadType", event.target.value)}
        >
          <option value="">Tipo de carga</option>
          {loadTypeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <input
          className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          placeholder="Commodities"
          value={values.commodities}
          onChange={(event) => onChange("commodities", event.target.value)}
        />

        <input
          className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          placeholder="Cantidad"
          inputMode="numeric"
          value={values.pieceCount}
          onChange={(event) => onChange("pieceCount", event.target.value)}
        />

        <input
          className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          placeholder="Ancho (cm)"
          inputMode="decimal"
          value={values.width}
          onChange={(event) => onChange("width", event.target.value)}
        />

        <input
          className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          placeholder="Largo (cm)"
          inputMode="decimal"
          value={values.length}
          onChange={(event) => onChange("length", event.target.value)}
        />

        <input
          className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          placeholder="Alto (cm)"
          inputMode="decimal"
          value={values.height}
          onChange={(event) => onChange("height", event.target.value)}
        />

        <input
          className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          placeholder="Peso (kg)"
          inputMode="decimal"
          value={values.weight}
          onChange={(event) => onChange("weight", event.target.value)}
        />

        <input
          className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          placeholder="Clase de carga"
          value={values.freightClass}
          onChange={(event) => onChange("freightClass", event.target.value)}
        />

        <input
          className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          placeholder="Orden"
          inputMode="numeric"
          value={values.sortOrder}
          onChange={(event) => onChange("sortOrder", event.target.value)}
        />
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
        <div className="text-sm font-semibold text-[#111827]">{labels.helperTitle}</div>
        <div className="mt-1 text-sm text-[#64748B]">{labels.helperDescription}</div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
              CBM
            </div>
            <div className="mt-1 text-sm font-medium text-[#111827]">
              {computed.cbm != null ? computed.cbm.toFixed(3) : "No disponible"}
            </div>
          </div>
          <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
              KG / VOL
            </div>
            <div className="mt-1 text-sm font-medium text-[#111827]">
              {computed.volumetricWeightKg != null
                ? computed.volumetricWeightKg.toFixed(2)
                : "No disponible"}
            </div>
          </div>
          <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
              Clase estimada
            </div>
            <div className="mt-1 text-sm font-medium text-[#111827]">
              {values.freightClass || computed.estimatedClass || "No disponible"}
            </div>
          </div>
        </div>
      </div>

      {onSubmit ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Guardando..." : submitLabel}
          </button>
        </div>
      ) : null}
    </section>
  )
}
