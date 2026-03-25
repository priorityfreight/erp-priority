"use client"

import { useMemo } from "react"
import type { Provider, SalesAccountingConcept } from "@/lib/db"

export type QuotationChargeLineFormValues = {
  optionLabel: string
  providerId: string
  salesAccountingConceptId: string
  purchaseAmount: string
  saleAmount: string
  vatRate: string
  notes: string
}

type QuotationChargeLineFormProps = {
  title: string
  description?: string
  values: QuotationChargeLineFormValues
  providers: Provider[]
  concepts: SalesAccountingConcept[]
  serviceType: string | null
  operationType: string | null
  onChange: (field: keyof QuotationChargeLineFormValues, value: string) => void
  onSubmit?: () => void
  submitLabel?: string
  loading?: boolean
  allowSaleAmount?: boolean
  disabled?: boolean
  disabledReason?: string | null
}

export function QuotationChargeLineForm({
  title,
  description,
  values,
  providers,
  concepts,
  serviceType,
  operationType,
  onChange,
  onSubmit,
  submitLabel = "Guardar cargo",
  loading = false,
  allowSaleAmount = false,
  disabled = false,
  disabledReason = null,
}: QuotationChargeLineFormProps) {
  const filteredConcepts = useMemo(
    () =>
      concepts.filter((concept) => {
        const matchesService =
          concept.service_type === "GENERAL" || concept.service_type === (serviceType || "")
        const matchesOperation =
          !operationType || concept.operation_type === operationType.toUpperCase()
        return matchesService && matchesOperation
      }),
    [concepts, operationType, serviceType]
  )

  const selectedConcept = filteredConcepts.find(
    (concept) => concept.id === values.salesAccountingConceptId
  )

  const purchaseAmount = Number(values.purchaseAmount || 0)
  const profit =
    Number.isFinite(purchaseAmount) && Number.isFinite(Number(values.saleAmount || 0))
      ? Number(values.saleAmount || 0) - purchaseAmount
      : 0

  return (
    <section className="space-y-4 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
      <div>
        <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[#6B7280]">{description}</p> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <input
          className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          placeholder="Opcion (ej. Opcion 1)"
          value={values.optionLabel}
          disabled={disabled}
          onChange={(event) => onChange("optionLabel", event.target.value)}
        />

        <select
          className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          value={values.providerId}
          disabled={disabled}
          onChange={(event) => onChange("providerId", event.target.value)}
        >
          <option value="">Proveedor</option>
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
            </option>
          ))}
        </select>

        <select
          className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          value={values.salesAccountingConceptId}
          disabled={disabled}
          onChange={(event) => {
            const nextId = event.target.value
            const nextConcept = filteredConcepts.find((item) => item.id === nextId)
            onChange("salesAccountingConceptId", nextId)
            if (nextConcept) {
              onChange("vatRate", String(nextConcept.vat_rate))
            }
          }}
        >
          <option value="">Concepto contable</option>
          {filteredConcepts.map((concept) => (
            <option key={concept.id} value={concept.id}>
              {concept.concept} · {concept.sat_code}
            </option>
          ))}
        </select>

        <input
          className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          placeholder="Compra"
          inputMode="decimal"
          value={values.purchaseAmount}
          disabled={disabled}
          onChange={(event) => onChange("purchaseAmount", event.target.value)}
        />

        {allowSaleAmount ? (
          <input
            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            placeholder="Venta"
            inputMode="decimal"
            value={values.saleAmount}
            disabled={disabled}
            onChange={(event) => onChange("saleAmount", event.target.value)}
          />
        ) : null}

        <input
          className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          placeholder="IVA"
          inputMode="decimal"
          value={values.vatRate}
          disabled={disabled}
          onChange={(event) => onChange("vatRate", event.target.value)}
        />

        {allowSaleAmount ? (
          <div className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#111827]">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
              Profit
            </div>
            <div className="mt-1 font-medium">
              {Number.isFinite(profit) ? `$${profit.toLocaleString()}` : "No disponible"}
            </div>
          </div>
        ) : null}

        <textarea
          className="md:col-span-2 min-h-[100px] rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          placeholder="Notas del cargo"
          value={values.notes}
          disabled={disabled}
          onChange={(event) => onChange("notes", event.target.value)}
        />
      </div>

      <div className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-3 text-sm text-[#475569]">
        {selectedConcept ? (
          <>
            <span className="font-medium text-[#111827]">{selectedConcept.concept}</span>
            {" · "}
            SAT {selectedConcept.sat_code}
          </>
        ) : (
          "Selecciona un concepto contable para autocompletar el IVA base."
        )}
      </div>

      {disabledReason ? (
        <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-3 text-sm text-[#92400E]">
          {disabledReason}
        </div>
      ) : null}

      {onSubmit ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading || disabled}
            className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Guardando..." : submitLabel}
          </button>
        </div>
      ) : null}
    </section>
  )
}
