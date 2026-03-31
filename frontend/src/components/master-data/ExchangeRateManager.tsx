"use client"

import { type ColumnDef } from "@tanstack/react-table"
import {
  PencilLineIcon,
  PlusIcon,
  RefreshCcwIcon,
  ShieldAlertIcon,
  Trash2Icon,
  TrendingUpIcon,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Modal } from "@/components/data/Modal"
import { PriorityDataTable } from "@/components/priority/PriorityDataTable"
import {
  PriorityFormField,
  PriorityFormGrid,
  PriorityFormSection,
  PriorityInfoField,
  PriorityInput,
  PrioritySelectField,
  PrioritySubmitBar,
} from "@/components/priority/PriorityForm"
import { PriorityDateField } from "@/components/priority/PriorityDateField"
import { PriorityRowActions } from "@/components/priority/PriorityRowActions"
import { PriorityCardTitle, PriorityTypography } from "@/components/priority/PriorityTypography"
import { PriorityToolbar } from "@/components/priority/PriorityToolbar"
import { PageContainer } from "@/components/layout/PageContainer"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { getErrorMessage, notifyError, notifySuccess, notifyWarning } from "@/lib/feedback"
import {
  createExchangeRate,
  deleteExchangeRate,
  getExchangeRates,
  syncExchangeRatesFromBanxico,
  type ExchangeRate,
  updateExchangeRate,
} from "@/lib/db"

const currencyOptions = ["USD", "EUR"]
const sourceOptions = ["BANXICO", "MANUAL"]

type FormValues = {
  rateDate: string
  baseCurrency: string
  quoteCurrency: string
  rateValue: string
  source: string
  sourceSeriesCode: string
}

const emptyForm: FormValues = {
  rateDate: "",
  baseCurrency: "USD",
  quoteCurrency: "MXN",
  rateValue: "",
  source: "BANXICO",
  sourceSeriesCode: "",
}

export function ExchangeRateManager() {
  const [items, setItems] = useState<ExchangeRate[]>([])
  const [query, setQuery] = useState("")
  const [baseCurrencyFilter, setBaseCurrencyFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<ExchangeRate | null>(null)
  const [formValues, setFormValues] = useState<FormValues>(emptyForm)

  const loadItems = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getExchangeRates({
        query,
        baseCurrency: baseCurrencyFilter,
      })
      setItems(data)
    } catch (error) {
      console.error(error)
      notifyError("No se pudo cargar el catalogo de tipos de cambio")
    } finally {
      setLoading(false)
    }
  }, [baseCurrencyFilter, query])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  const latestByCurrency = useMemo(() => {
    return currencyOptions.map((currency) => ({
      currency,
      item: items.find((entry) => entry.base_currency === currency) ?? null,
    }))
  }, [items])

  const baseCurrencyOptions = useMemo(
    () => [{ value: "all", label: "Todas las monedas" }].concat(
      currencyOptions.map((option) => ({ value: option, label: option }))
    ),
    []
  )

  function resetForm() {
    setEditingId(null)
    setFormValues(emptyForm)
  }

  function openCreateModal() {
    resetForm()
    setShowModal(true)
  }

  async function handleSave() {
    if (!formValues.rateDate || !formValues.rateValue.trim()) {
      notifyWarning("Fecha y tipo de cambio son obligatorios")
      return
    }

    const parsedRate = Number(formValues.rateValue)
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      notifyWarning("El tipo de cambio debe ser mayor a cero")
      return
    }

    try {
      setSaving(true)

      const payload = {
        rate_date: formValues.rateDate,
        base_currency: formValues.baseCurrency,
        quote_currency: formValues.quoteCurrency,
        rate_value: parsedRate,
        source: formValues.source,
        source_series_code: formValues.sourceSeriesCode.trim() || null,
      }

      if (editingId) {
        await updateExchangeRate(editingId, payload)
        notifySuccess("Tipo de cambio actualizado correctamente")
      } else {
        await createExchangeRate(payload)
        notifySuccess("Tipo de cambio creado correctamente")
      }

      setShowModal(false)
      resetForm()
      await loadItems()
    } catch (error) {
      console.error(error)
      notifyError("No se pudo guardar el tipo de cambio")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!pendingDelete) {
      return
    }

    try {
      await deleteExchangeRate(pendingDelete.id)
      notifySuccess("Tipo de cambio eliminado correctamente")
      setPendingDelete(null)
      await loadItems()
    } catch (error) {
      console.error(error)
      notifyError("No se pudo eliminar el tipo de cambio")
    }
  }

  async function handleSyncBanxico() {
    try {
      setSyncing(true)
      await syncExchangeRatesFromBanxico(7)
      await loadItems()
      notifySuccess("Tipos de cambio sincronizados desde Banxico correctamente.")
    } catch (error) {
      console.error(error)
      notifyError(getErrorMessage(error, "No se pudo sincronizar Banxico"))
    } finally {
      setSyncing(false)
    }
  }

  const columns = useMemo<ColumnDef<ExchangeRate>[]>(
    () => [
      {
        accessorKey: "rate_date",
        header: "Fecha",
      },
      {
        id: "pair",
        header: "Par",
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-medium text-[var(--brand-navy)]">
              {row.original.base_currency}/{row.original.quote_currency}
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-[#7A8BA1]">
              {row.original.source}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "rate_value",
        header: "Tasa",
        cell: ({ row }) => (
          <span className="font-medium text-[var(--brand-navy)]">
            {row.original.rate_value.toFixed(6)}
          </span>
        ),
      },
      {
        accessorKey: "source",
        header: "Fuente",
        cell: ({ row }) => (
          <Badge
            variant={row.original.source === "MANUAL" ? "outline" : "secondary"}
            className={
              row.original.source === "MANUAL"
                ? "border-[rgba(179,58,91,0.18)] bg-[rgba(179,58,91,0.05)] text-[var(--brand-burgundy)]"
                : undefined
            }
          >
            {row.original.source}
          </Badge>
        ),
      },
      {
        accessorKey: "source_series_code",
        header: "Serie",
        cell: ({ row }) => <span>{row.original.source_series_code || "—"}</span>,
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <PriorityRowActions
              label="Acciones de tasa"
              actions={[
                {
                  label: "Editar",
                  icon: <PencilLineIcon />,
                  onSelect: () => {
                    setEditingId(row.original.id)
                    setFormValues({
                      rateDate: row.original.rate_date,
                      baseCurrency: row.original.base_currency,
                      quoteCurrency: row.original.quote_currency,
                      rateValue: String(row.original.rate_value),
                      source: row.original.source,
                      sourceSeriesCode: row.original.source_series_code || "",
                    })
                    setShowModal(true)
                  },
                },
                {
                  label: "Eliminar",
                  icon: <Trash2Icon />,
                  onSelect: () => setPendingDelete(row.original),
                  destructive: true,
                },
              ]}
            />
          </div>
        ),
      },
    ],
    []
  )

  return (
    <PageContainer
      title="Tipo de cambio"
      description="Catalogo canonico para convertir compras, ventas y profit contable a MXN usando la tasa Banxico del dia anterior. La sincronizacion automatica queda programada diariamente a las 6:00 a.m."
      actions={
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" size="lg" onClick={() => void handleSyncBanxico()} disabled={syncing}>
            {syncing ? <Spinner className="text-current" /> : <RefreshCcwIcon />}
            {syncing ? "Sincronizando..." : "Sincronizar Banxico"}
          </Button>
          <Button type="button" size="lg" onClick={openCreateModal}>
            <PlusIcon />
            Anadir tipo de cambio
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {latestByCurrency.map(({ currency, item }) => (
            <div
              key={currency}
              className="rounded-[24px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.92)] p-5 shadow-[0_24px_48px_-36px_rgba(3,10,24,0.28)]"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5B6A7D]">
                  {currency} → MXN
                </div>
                <TrendingUpIcon className="size-4 text-[#0F766E]" />
              </div>
              <div className="mt-3 text-3xl font-semibold text-[var(--brand-navy)]">
                {item ? item.rate_value.toFixed(4) : "—"}
              </div>
              <div className="mt-2 text-sm text-[#5B6A7D]">
                {item ? `Fecha ${item.rate_date}` : "Sin registro"}
              </div>
            </div>
          ))}
          <div className="rounded-[24px] border border-[rgba(37,99,235,0.16)] bg-[linear-gradient(180deg,_rgba(239,246,255,0.95)_0%,_rgba(255,255,255,0.92)_100%)] p-5 shadow-[0_24px_48px_-36px_rgba(37,99,235,0.25)]">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1D4ED8]">
              Registros vigentes
            </div>
            <div className="mt-3 text-3xl font-semibold text-[var(--brand-navy)]">{items.length}</div>
            <div className="mt-2 text-sm text-[#5B6A7D]">
              El ERP toma la ultima tasa disponible anterior al dia de operacion.
            </div>
          </div>
        </section>

        <section className="space-y-5 rounded-[28px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.92)] p-6 shadow-[0_28px_56px_-42px_rgba(3,10,24,0.34)]">
          <div className="flex flex-col gap-4">
            <div>
              <PriorityCardTitle>Catalogo de tipos de cambio</PriorityCardTitle>
              <PriorityTypography variant="bodyMuted" className="mt-1">
                El ERP toma la ultima tasa disponible anterior al dia de trabajo para convertir todo a MXN.
              </PriorityTypography>
            </div>
            <PriorityToolbar className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(220px,1fr)_auto]">
              <PriorityInput
                placeholder="Buscar por fecha, fuente o serie"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <PrioritySelectField
                value={baseCurrencyFilter}
                onValueChange={setBaseCurrencyFilter}
                placeholder="Moneda base"
                options={baseCurrencyOptions}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setQuery("")
                  setBaseCurrencyFilter("all")
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
            <PriorityDataTable
              columns={columns}
              data={items}
              emptyTitle="No hay tipos de cambio registrados"
              emptyDescription="Sincroniza Banxico o registra una tasa manual para arrancar el catalogo canonico."
            />
          )}
        </section>
      </div>

      {showModal ? (
        <Modal
          title={editingId ? "Editar tipo de cambio" : "Anadir tipo de cambio"}
          description="Registra la tasa oficial del dia. El ERP usara la ultima disponible anterior al dia de operacion."
          onClose={() => {
            setShowModal(false)
            resetForm()
          }}
        >
          <div className="space-y-5">
            <PriorityFormSection
              title="Identidad de la tasa"
              description="Define la fecha, el par cambiario y el origen de la tasa oficial."
            >
              <PriorityFormGrid>
                <PriorityFormField label="Fecha">
                  <PriorityDateField
                    value={formValues.rateDate}
                    onChange={(value) => setFormValues((current) => ({ ...current, rateDate: value }))}
                  />
                </PriorityFormField>
                <PriorityFormField label="Moneda base">
                  <PrioritySelectField
                    value={formValues.baseCurrency}
                    onValueChange={(value) =>
                      setFormValues((current) => ({ ...current, baseCurrency: value }))
                    }
                    placeholder="Moneda base"
                    options={currencyOptions.map((option) => ({ value: option, label: option }))}
                  />
                </PriorityFormField>
                <PriorityFormField label="Moneda destino">
                  <PrioritySelectField
                    value={formValues.quoteCurrency}
                    onValueChange={(value) =>
                      setFormValues((current) => ({ ...current, quoteCurrency: value }))
                    }
                    placeholder="Moneda destino"
                    options={[{ value: "MXN", label: "MXN" }]}
                  />
                </PriorityFormField>
                <PriorityFormField label="Tipo de cambio">
                  <PriorityInput
                    placeholder="Tipo de cambio"
                    inputMode="decimal"
                    value={formValues.rateValue}
                    onChange={(event) =>
                      setFormValues((current) => ({ ...current, rateValue: event.target.value }))
                    }
                  />
                </PriorityFormField>
              </PriorityFormGrid>
            </PriorityFormSection>

            <PriorityFormSection
              title="Fuente y trazabilidad"
              description="Mantén la procedencia visible para auditoría y validación contable."
            >
              <PriorityFormGrid className="xl:grid-cols-2">
                <PriorityFormField label="Fuente">
                  <div className="space-y-3">
                    <RadioGroup
                      value={formValues.source}
                      onValueChange={(value) =>
                        setFormValues((current) => ({ ...current, source: value }))
                      }
                      className="grid gap-3 sm:grid-cols-2"
                    >
                      {sourceOptions.map((option) => (
                        <label
                          key={option}
                          className="flex items-center gap-3 rounded-[18px] border border-[#D1D6DF] bg-white px-4 py-3 text-sm font-medium text-[var(--brand-navy)]"
                        >
                          <RadioGroupItem value={option} />
                          <span>{option}</span>
                        </label>
                      ))}
                    </RadioGroup>
                    <PriorityTypography variant="caption">
                      El origen queda visible para auditoría y conciliación.
                    </PriorityTypography>
                  </div>
                </PriorityFormField>
                <PriorityFormField label="Serie Banxico">
                  <PriorityInput
                    placeholder="Serie BANXICO"
                    value={formValues.sourceSeriesCode}
                    onChange={(event) =>
                      setFormValues((current) => ({ ...current, sourceSeriesCode: event.target.value }))
                    }
                  />
                </PriorityFormField>
              </PriorityFormGrid>
              <div className="mt-4">
                <PriorityInfoField
                  label="Uso esperado"
                  value="Conversion canonica de compras, ventas y profit contable hacia MXN."
                />
              </div>
            </PriorityFormSection>

            <PrioritySubmitBar>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={() => void handleSave()} disabled={saving}>
                {saving ? <Spinner className="text-current" /> : null}
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </PrioritySubmitBar>
          </div>
        </Modal>
      ) : null}

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent className="rounded-[28px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(244,246,249,0.96)_100%)] p-0 text-[var(--brand-navy)] shadow-[0_36px_80px_-36px_rgba(3,10,24,0.55)]">
          <AlertDialogHeader className="px-6 pt-6 text-left sm:place-items-start sm:text-left">
            <AlertDialogMedia className="bg-[rgba(179,58,91,0.08)] text-[var(--brand-burgundy)]">
              <ShieldAlertIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Eliminar tipo de cambio</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `Vas a eliminar la tasa ${pendingDelete.base_currency}/${pendingDelete.quote_currency} del ${pendingDelete.rate_date}. Verifica que no sea necesaria para conciliacion o auditoria.`
                : "Confirma la eliminacion del tipo de cambio."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="rounded-b-[28px] border-t border-[var(--border-subtle)] bg-[rgba(11,31,59,0.03)] px-6 py-4">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleDeleteConfirm()}>
              Eliminar tasa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}
