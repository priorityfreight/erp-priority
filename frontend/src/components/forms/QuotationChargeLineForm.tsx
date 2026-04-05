"use client"

import { useMemo } from "react"
import type { ColDef } from "ag-grid-community"
import { PriorityDateField } from "@/components/priority/PriorityDateField"
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

function formatGroupedTotals(values: Record<string, number>, emptyLabel = "No disponible") {
  const entries = Object.entries(values).filter(([, amount]) => amount > 0)
  if (entries.length === 0) {
    return emptyLabel
  }

  return entries.map(([currency, amount]) => formatCurrencyValue(amount, currency)).join(" · ")
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
  const gridHeight = rows.length <= 2 ? 228 : Math.min(200 + rows.length * 72, 420)

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

    const validities = Array.from(new Set(rows.map((row) => row.purchaseValidUntil).filter((value) => value.trim())))

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

  const providerOptions = useMemo(
    () =>
      providers.map((provider) => ({
        value: provider.id,
        label: provider.name,
      })),
    [providers]
  )
  const conceptOptions = useMemo(
    () =>
      filteredConcepts.map((concept) => ({
        value: concept.id,
        label: `${concept.concept} · ${concept.sat_code}`,
      })),
    [filteredConcepts]
  )
  const columns = useMemo<Array<ColDef<QuotationChargeLineFormValues>>>(
    () => [
      {
        field: "providerId",
        headerName: "Proveedor",
        minWidth: 190,
        flex: 1.2,
        cellRenderer: (params: { data?: QuotationChargeLineFormValues }) => (
          <select
            className="h-11 w-full rounded-[16px] border border-[#D1D6DF] bg-white px-3 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-burgundy-light)]"
            value={params.data?.providerId ?? ""}
            disabled={disabled}
            onChange={(event) => {
              if (params.data) {
                onChangeRow(params.data.draftId, "providerId", event.target.value)
              }
            }}
          >
            <option value="">Proveedor</option>
            {providerOptions.map((provider) => (
              <option key={provider.value} value={provider.value}>
                {provider.label}
              </option>
            ))}
          </select>
        ),
      },
      {
        field: "salesAccountingConceptId",
        headerName: "Concepto contable",
        minWidth: 260,
        flex: 1.5,
        cellRenderer: (params: { data?: QuotationChargeLineFormValues }) => (
          <select
            className="h-11 w-full rounded-[16px] border border-[#D1D6DF] bg-white px-3 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-burgundy-light)]"
            value={params.data?.salesAccountingConceptId ?? ""}
            disabled={disabled}
            onChange={(event) => {
              if (!params.data) {
                return
              }

              const nextId = event.target.value
              const nextConcept = filteredConcepts.find((item) => item.id === nextId)
              onChangeRow(params.data.draftId, "salesAccountingConceptId", nextId)
              if (nextConcept) {
                onChangeRow(params.data.draftId, "vatRate", String(nextConcept.vat_rate))
              }
            }}
          >
            <option value="">Concepto contable</option>
            {conceptOptions.map((concept) => (
              <option key={concept.value} value={concept.value}>
                {concept.label}
              </option>
            ))}
          </select>
        ),
      },
      {
        field: "purchaseAmount",
        headerName: "Compra",
        minWidth: 140,
        cellRenderer: (params: { data?: QuotationChargeLineFormValues }) => (
          <input
            className="h-11 w-full rounded-[16px] border border-[#D1D6DF] px-3 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-burgundy-light)]"
            placeholder="Compra"
            inputMode="decimal"
            value={params.data?.purchaseAmount ?? ""}
            disabled={disabled}
            onChange={(event) => {
              if (params.data) {
                onChangeRow(params.data.draftId, "purchaseAmount", event.target.value)
              }
            }}
          />
        ),
      },
      {
        field: "vatRate",
        headerName: "IVA",
        minWidth: 120,
        cellRenderer: (params: { data?: QuotationChargeLineFormValues }) => (
          <input
            className="h-11 w-full rounded-[16px] border border-[#D1D6DF] px-3 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-burgundy-light)]"
            placeholder="IVA"
            inputMode="decimal"
            value={params.data?.vatRate ?? ""}
            disabled={disabled}
            onChange={(event) => {
              if (params.data) {
                onChangeRow(params.data.draftId, "vatRate", event.target.value)
              }
            }}
          />
        ),
      },
      {
        field: "purchaseCurrency",
        headerName: "Divisa",
        minWidth: 128,
        cellRenderer: (params: { data?: QuotationChargeLineFormValues }) => (
          <select
            className="h-11 w-full rounded-[16px] border border-[#D1D6DF] bg-white px-3 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-burgundy-light)]"
            value={params.data?.purchaseCurrency ?? "MXN"}
            disabled={disabled}
            onChange={(event) => {
              if (params.data) {
                onChangeRow(params.data.draftId, "purchaseCurrency", event.target.value)
              }
            }}
          >
            <option value="MXN">MXN</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        ),
      },
      {
        field: "purchaseValidUntil",
        headerName: "Vigencia",
        minWidth: 180,
        flex: 1,
        cellRenderer: (params: { data?: QuotationChargeLineFormValues }) => (
          <PriorityDateField
            value={params.data?.purchaseValidUntil ?? ""}
            disabled={disabled}
            ariaLabel="Vigencia de compra"
            placeholder="Vigencia"
            className="h-11 rounded-[16px] px-3 text-sm"
            onChange={(value) => {
              if (params.data) {
                onChangeRow(params.data.draftId, "purchaseValidUntil", value)
              }
            }}
          />
        ),
      },
      {
        field: "notes",
        headerName: "Notas del cargo",
        minWidth: 260,
        flex: 1.5,
        cellRenderer: (params: { data?: QuotationChargeLineFormValues }) => (
          <input
            className="h-11 w-full rounded-[16px] border border-[#D1D6DF] px-3 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-burgundy-light)]"
            placeholder="Notas del cargo"
            value={params.data?.notes ?? ""}
            disabled={disabled}
            onChange={(event) => {
              if (params.data) {
                onChangeRow(params.data.draftId, "notes", event.target.value)
              }
            }}
          />
        ),
      },
      {
        headerName: "",
        minWidth: 118,
        maxWidth: 118,
        sortable: false,
        filter: false,
        resizable: false,
        cellRenderer: (params: { data?: QuotationChargeLineFormValues }) => {
          if (!params.data) {
            return null
          }

          if (params.data.existingChargeId) {
            return <PriorityTypography variant="fieldLabel">Base</PriorityTypography>
          }

          return (
            <Button
              type="button"
              onClick={() => onRemoveRow(params.data!.draftId)}
              disabled={disabled || rows.length <= 1}
              variant="outline"
              className="border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] hover:bg-[#FEE2E2] hover:text-[#991B1B]"
            >
              Quitar
            </Button>
          )
        },
      },
    ],
    [conceptOptions, disabled, filteredConcepts, onChangeRow, onRemoveRow, providerOptions, rows.length]
  )

  return (
    <PriorityFormShell density="compact" className="space-y-4">
      <PriorityFormHeader title={title} description={description} density="compact" />

      <PriorityGrid
        rowData={rows}
        columnDefs={columns}
        mobileBreakpoint={767}
        height={gridHeight}
        rowHeight={78}
        emptyTitle="Sin conceptos de compra"
        emptyDescription="Agrega al menos un concepto para construir esta opcion comercial."
        getRowId={(params) => params.data.draftId}
        toolbar={
          <PriorityGridToolbar
            density="compact"
            title="Captura de cargos de compra"
            description="Usa una fila por concepto real. En desktop se prioriza velocidad; en mobile se degrada a tarjetas editables."
            actions={
              <Button
                type="button"
                onClick={onAddRow}
                disabled={disabled}
                variant="outline"
                className="border-[#CBD5E1] bg-white text-[var(--brand-navy)] hover:bg-[#F8FAFC]"
              >
                Añadir otro concepto
              </Button>
            }
          />
        }
        renderMobileCard={(row) => (
          <div className="rounded-[22px] border border-[rgba(144,158,174,0.16)] bg-white p-4 shadow-[0_18px_38px_-32px_rgba(3,10,24,0.28)]">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#72839A]">Proveedor</div>
                <select
                  className="h-11 w-full rounded-[16px] border border-[#D1D6DF] bg-white px-3 text-sm text-[var(--brand-navy)] outline-none"
                  value={row.providerId}
                  disabled={disabled}
                  onChange={(event) => onChangeRow(row.draftId, "providerId", event.target.value)}
                >
                  <option value="">Proveedor</option>
                  {providerOptions.map((provider) => (
                    <option key={provider.value} value={provider.value}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#72839A]">Concepto</div>
                <select
                  className="h-11 w-full rounded-[16px] border border-[#D1D6DF] bg-white px-3 text-sm text-[var(--brand-navy)] outline-none"
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
                  {conceptOptions.map((concept) => (
                    <option key={concept.value} value={concept.value}>
                      {concept.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#72839A]">Compra</div>
                <input
                  className="h-11 w-full rounded-[16px] border border-[#D1D6DF] px-3 text-sm text-[var(--brand-navy)] outline-none"
                  placeholder="Compra"
                  inputMode="decimal"
                  value={row.purchaseAmount}
                  disabled={disabled}
                  onChange={(event) => onChangeRow(row.draftId, "purchaseAmount", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#72839A]">IVA</div>
                <input
                  className="h-11 w-full rounded-[16px] border border-[#D1D6DF] px-3 text-sm text-[var(--brand-navy)] outline-none"
                  placeholder="IVA"
                  inputMode="decimal"
                  value={row.vatRate}
                  disabled={disabled}
                  onChange={(event) => onChangeRow(row.draftId, "vatRate", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#72839A]">Divisa</div>
                <select
                  className="h-11 w-full rounded-[16px] border border-[#D1D6DF] bg-white px-3 text-sm text-[var(--brand-navy)] outline-none"
                  value={row.purchaseCurrency}
                  disabled={disabled}
                  onChange={(event) => onChangeRow(row.draftId, "purchaseCurrency", event.target.value)}
                >
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#72839A]">Vigencia</div>
                <PriorityDateField
                  value={row.purchaseValidUntil}
                  disabled={disabled}
                  ariaLabel="Vigencia de compra"
                  placeholder="Vigencia"
                  className="h-11 rounded-[16px] px-3 text-sm"
                  onChange={(value) => onChangeRow(row.draftId, "purchaseValidUntil", value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#72839A]">Notas del cargo</div>
                <input
                  className="h-11 w-full rounded-[16px] border border-[#D1D6DF] px-3 text-sm text-[var(--brand-navy)] outline-none"
                  placeholder="Notas del cargo"
                  value={row.notes}
                  disabled={disabled}
                  onChange={(event) => onChangeRow(row.draftId, "notes", event.target.value)}
                />
              </div>
            </div>
            {!row.existingChargeId && rows.length > 1 ? (
              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  onClick={() => onRemoveRow(row.draftId)}
                  disabled={disabled}
                  variant="outline"
                  className="border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] hover:bg-[#FEE2E2] hover:text-[#991B1B]"
                >
                  Quitar
                </Button>
              </div>
            ) : null}
          </div>
        )}
      />

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-3.5">
        <PriorityTypography variant="cardTitle">Acumulado de la opcion</PriorityTypography>
        <PriorityTypography variant="bodyMuted" className="mt-1">
          La suma considera todos los conceptos capturados dentro de esta misma opcion de compra.
        </PriorityTypography>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <PriorityInfoField label="Conceptos en captura" value={String(summary.rowCount)} />
          <PriorityInfoField label="Compra acumulada" value={formatGroupedTotals(summary.purchaseByCurrency)} />
          <PriorityInfoField label="Total con IVA" value={formatGroupedTotals(summary.totalWithVatByCurrency)} />
        </div>
        <div className="mt-2.5">
          <PriorityInfoField label="Vigencia detectada" value={summary.validitySummary} />
        </div>
      </div>

      {disabledReason ? (
        <PrioritySectionAlert title="Captura bloqueada" variant="warning">
          {disabledReason}
        </PrioritySectionAlert>
      ) : null}

      <PrioritySectionAlert title="Captura tabular con fallback movil" variant="info">
        En desktop este flujo usa grid denso para velocidad operativa. En mobile se degrada a tarjetas editables sin perder contexto.
      </PrioritySectionAlert>

      {onSubmit ? (
        <PrioritySubmitBar density="compact" mode="inline" className="justify-between">
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
          <Button type="button" onClick={onSubmit} disabled={loading || disabled}>
            {loading ? "Guardando..." : submitLabel}
          </Button>
        </PrioritySubmitBar>
      ) : null}
    </PriorityFormShell>
  )
}
