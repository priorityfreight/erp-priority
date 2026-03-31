"use client"

import { useMemo } from "react"
import { PriorityDateField } from "@/components/priority/PriorityDateField"
import { Button } from "@/components/ui/button"
import {
  PriorityFormHeader,
  PriorityInfoField,
  PrioritySubmitBar,
} from "@/components/priority/PriorityForm"
import { PrioritySectionAlert } from "@/components/priority/PrioritySectionAlert"
import { PriorityTypography } from "@/components/priority/PriorityTypography"
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
    <section className="space-y-5 rounded-[28px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(245,247,250,0.96)_100%)] p-5 shadow-[0_28px_60px_-44px_rgba(3,10,24,0.42)]">
      <PriorityFormHeader title={title} description={description} />

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

              <div className="border-r border-[#E5E7EB] px-3 py-2">
                <PriorityDateField
                  value={row.purchaseValidUntil}
                  disabled={disabled}
                  placeholder="Vigencia"
                  className="h-10 rounded-[14px] px-3 text-sm"
                  onChange={(value) => onChangeRow(row.draftId, "purchaseValidUntil", value)}
                />
              </div>

              <input
                className="border-r border-[#E5E7EB] px-3 py-3 text-sm outline-none placeholder:text-[#94A3B8] focus:bg-[#F8FAFC]"
                placeholder="Notas del cargo"
                value={row.notes}
                disabled={disabled}
                onChange={(event) => onChangeRow(row.draftId, "notes", event.target.value)}
              />

              <div className="flex items-center justify-center px-2 py-2">
                {row.existingChargeId ? (
                  <PriorityTypography variant="fieldLabel" className="text-[#94A3B8]">
                    Base
                  </PriorityTypography>
                ) : rows.length > 1 ? (
                  <Button
                    type="button"
                    onClick={() => onRemoveRow(row.draftId)}
                    disabled={disabled}
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
          disabled={disabled}
          variant="outline"
          className="border-[#CBD5E1] bg-white text-[var(--brand-navy)] hover:bg-[#F8FAFC]"
        >
          Anadir otro concepto
        </Button>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
        <PriorityTypography variant="cardTitle">Acumulado de la opcion</PriorityTypography>
        <PriorityTypography variant="bodyMuted" className="mt-1">
          La suma considera todos los conceptos capturados dentro de esta misma opcion de compra.
        </PriorityTypography>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <PriorityInfoField label="Conceptos en captura" value={String(summary.rowCount)} />
          <PriorityInfoField label="Compra acumulada" value={formatGroupedTotals(summary.purchaseByCurrency)} />
          <PriorityInfoField label="Total con IVA" value={formatGroupedTotals(summary.totalWithVatByCurrency)} />
        </div>
        <div className="mt-3">
          <PriorityInfoField label="Vigencia detectada" value={summary.validitySummary} />
        </div>
      </div>

      {disabledReason ? (
        <PrioritySectionAlert title="Captura bloqueada" variant="warning">
          {disabledReason}
        </PrioritySectionAlert>
      ) : null}

      <PrioritySectionAlert title="Captura tabular" variant="info">
        Este bloque privilegia velocidad operativa. Agrega un renglon por concepto real de compra y revisa la vigencia antes de guardar.
      </PrioritySectionAlert>

      {onSubmit ? (
        <PrioritySubmitBar className="justify-between">
          {onCancel ? (
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              className="border-[#D1D5DB] bg-white text-[var(--brand-navy)] hover:bg-[#F8FAFC]"
            >
              Cancelar
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={onSubmit}
            disabled={loading || disabled}
          >
            {loading ? "Guardando..." : submitLabel}
          </Button>
        </PrioritySubmitBar>
      ) : null}
    </section>
  )
}
