"use client"

import { useMemo } from "react"
import type { Provider, SalesAccountingConcept } from "@/lib/db"

export type QuotationChargeLineFormValues = {
  draftId: string
  existingChargeId?: string | null
  providerId: string
  salesAccountingConceptId: string
  purchaseAmount: string
  purchaseCurrency: string
  purchaseValidUntil: string
  saleAmount: string
  saleCurrency: string
  vatRate: string
  notes: string
}

type QuotationChargeLineFormProps = {
  title: string
  description?: string
  rows: QuotationChargeLineFormValues[]
  providers: Provider[]
  concepts: SalesAccountingConcept[]
  serviceType: string | null
  operationType: string | null
  onChangeRow: (
    draftId: string,
    field: keyof Omit<QuotationChargeLineFormValues, "draftId" | "existingChargeId">,
    value: string
  ) => void
  onAddRow: () => void
  onRemoveRow: (draftId: string) => void
  onSubmit?: () => void
  onCancel?: () => void
  submitLabel?: string
  loading?: boolean
  disabled?: boolean
  disabledReason?: string | null
}

function formatCurrencyValue(value: number, currency: string) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatGroupedTotals(
  values: Record<string, number>,
  emptyLabel = "No disponible"
) {
  const entries = Object.entries(values).filter(([, amount]) => amount > 0)
  if (entries.length === 0) {
    return emptyLabel
  }

  return entries
    .map(([currency, amount]) => formatCurrencyValue(amount, currency))
    .join(" · ")
}

export function QuotationChargeLineForm({
  title,
  description,
  rows,
  providers,
  concepts,
  serviceType,
  operationType,
  onChangeRow,
  onAddRow,
  onRemoveRow,
  onSubmit,
  onCancel,
  submitLabel = "Guardar cargo",
  loading = false,
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

  const summary = useMemo(() => {
    const groupedPurchase: Record<string, number> = {}
    const groupedWithVat: Record<string, number> = {}

    for (const row of rows) {
      const amount = Number(row.purchaseAmount)
      const vatRate = Number(row.vatRate || 0)
      const currency = row.purchaseCurrency || "MXN"

      if (!Number.isFinite(amount) || amount <= 0) {
        continue
      }

      groupedPurchase[currency] = (groupedPurchase[currency] ?? 0) + amount
      groupedWithVat[currency] =
        (groupedWithVat[currency] ?? 0) + amount * (1 + (Number.isFinite(vatRate) ? vatRate : 0) / 100)
    }

    const validities = Array.from(
      new Set(rows.map((row) => row.purchaseValidUntil).filter((value) => value.trim()))
    )

    return {
      rowCount: rows.length,
      purchaseByCurrency: groupedPurchase,
      totalWithVatByCurrency: groupedWithVat,
      validitySummary:
        validities.length === 0
          ? "No definida"
          : validities.length === 1
            ? validities[0]
            : "Revisar vigencias",
    }
  }, [rows])

  return (
    <section className="space-y-4 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
      <div>
        <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[#6B7280]">{description}</p> : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D1D5DB] bg-white pb-3">
        <div className="min-w-[1480px] pr-3">
          <div className="grid grid-cols-[190px_240px_120px_100px_100px_160px_minmax(240px,1fr)_96px] border-b border-[#E5E7EB] bg-[#EEF2FF]">
            {[
              "Proveedor",
              "Concepto contable",
              "Compra",
              "IVA",
              "Divisa",
              "Valides",
              "Notas del cargo",
              "",
            ].map((label) => (
              <div
                key={label}
                className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#475569]"
              >
                {label}
              </div>
            ))}
          </div>

          {rows.map((row) => (
            <div
              key={row.draftId}
              className="grid grid-cols-[190px_240px_120px_100px_100px_160px_minmax(240px,1fr)_96px] border-b border-[#E5E7EB] last:border-b-0"
            >
              <select
                className="border-r border-[#E5E7EB] bg-white px-3 py-3 text-sm outline-none focus:bg-[#F8FAFC]"
                value={row.providerId}
                disabled={disabled}
                onChange={(event) => onChangeRow(row.draftId, "providerId", event.target.value)}
              >
                <option value="">Proveedor</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>

              <select
                className="border-r border-[#E5E7EB] bg-white px-3 py-3 text-sm outline-none focus:bg-[#F8FAFC]"
                value={row.salesAccountingConceptId}
                disabled={disabled}
                onChange={(event) => {
                  const nextId = event.target.value
                  const nextConcept = filteredConcepts.find((item) => item.id === nextId)
                  onChangeRow(row.draftId, "salesAccountingConceptId", nextId)
                  if (nextConcept) {
                    onChangeRow(row.draftId, "vatRate", String(nextConcept.vat_rate))
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
                className="border-r border-[#E5E7EB] px-3 py-3 text-sm outline-none placeholder:text-[#94A3B8] focus:bg-[#F8FAFC]"
                placeholder="Compra"
                inputMode="decimal"
                value={row.purchaseAmount}
                disabled={disabled}
                onChange={(event) => onChangeRow(row.draftId, "purchaseAmount", event.target.value)}
              />

              <input
                className="border-r border-[#E5E7EB] px-3 py-3 text-sm outline-none placeholder:text-[#94A3B8] focus:bg-[#F8FAFC]"
                placeholder="IVA"
                inputMode="decimal"
                value={row.vatRate}
                disabled={disabled}
                onChange={(event) => onChangeRow(row.draftId, "vatRate", event.target.value)}
              />

              <select
                className="border-r border-[#E5E7EB] bg-white px-3 py-3 text-sm outline-none focus:bg-[#F8FAFC]"
                value={row.purchaseCurrency}
                disabled={disabled}
                onChange={(event) => onChangeRow(row.draftId, "purchaseCurrency", event.target.value)}
              >
                <option value="MXN">MXN</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>

              <input
                className="border-r border-[#E5E7EB] px-3 py-3 text-sm outline-none focus:bg-[#F8FAFC]"
                type="date"
                value={row.purchaseValidUntil}
                disabled={disabled}
                onChange={(event) =>
                  onChangeRow(row.draftId, "purchaseValidUntil", event.target.value)
                }
              />

              <input
                className="border-r border-[#E5E7EB] px-3 py-3 text-sm outline-none placeholder:text-[#94A3B8] focus:bg-[#F8FAFC]"
                placeholder="Notas del cargo"
                value={row.notes}
                disabled={disabled}
                onChange={(event) => onChangeRow(row.draftId, "notes", event.target.value)}
              />

              <div className="flex items-center justify-center px-2 py-2">
                {row.existingChargeId ? (
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                    Base
                  </span>
                ) : rows.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => onRemoveRow(row.draftId)}
                    disabled={disabled}
                    className="rounded-md border border-[#FCA5A5] bg-[#FEF2F2] px-2 py-1 text-xs font-semibold text-[#B91C1C] hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Quitar
                  </button>
                ) : (
                  <span className="text-xs font-semibold uppercase tracking-wide text-transparent">
                    ---
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-start">
        <button
          type="button"
          onClick={onAddRow}
          disabled={disabled}
          className="rounded-md border border-[#CBD5E1] bg-white px-4 py-2 text-sm font-medium text-[#1E3A8A] shadow-sm hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Anadir otro concepto
        </button>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
        <div className="text-sm font-semibold text-[#111827]">Acumulado de la opcion</div>
        <div className="mt-1 text-sm text-[#64748B]">
          La suma considera todos los conceptos capturados dentro de esta misma opcion de compra.
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
              Conceptos en captura
            </div>
            <div className="mt-1 text-sm font-medium text-[#111827]">{summary.rowCount}</div>
          </div>
          <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
              Compra acumulada
            </div>
            <div className="mt-1 text-sm font-medium text-[#111827]">
              {formatGroupedTotals(summary.purchaseByCurrency)}
            </div>
          </div>
          <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
              Total con IVA
            </div>
            <div className="mt-1 text-sm font-medium text-[#111827]">
              {formatGroupedTotals(summary.totalWithVatByCurrency)}
            </div>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
            Vigencia detectada
          </div>
          <div className="mt-1 text-sm font-medium text-[#111827]">
            {summary.validitySummary}
          </div>
        </div>
      </div>

      {disabledReason ? (
        <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-3 text-sm text-[#92400E]">
          {disabledReason}
        </div>
      ) : null}

      {onSubmit ? (
        <div className="flex justify-end gap-3">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-medium text-[#111827] shadow-sm hover:bg-[#F8FAFC]"
            >
              Cancelar
            </button>
          ) : null}
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
