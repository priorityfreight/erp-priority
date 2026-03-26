"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Modal } from "@/components/data/Modal"
import { PageContainer } from "@/components/layout/PageContainer"
import {
  createExchangeRate,
  deleteExchangeRate,
  getExchangeRates,
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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
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

  function resetForm() {
    setEditingId(null)
    setFormValues(emptyForm)
  }

  async function handleSave() {
    if (!formValues.rateDate || !formValues.rateValue.trim()) {
      alert("Fecha y tipo de cambio son obligatorios")
      return
    }

    const parsedRate = Number(formValues.rateValue)
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      alert("El tipo de cambio debe ser mayor a cero")
      return
    }

    try {
      setSaving(true)

      if (editingId) {
        await updateExchangeRate(editingId, {
          rate_date: formValues.rateDate,
          base_currency: formValues.baseCurrency,
          quote_currency: formValues.quoteCurrency,
          rate_value: parsedRate,
          source: formValues.source,
          source_series_code: formValues.sourceSeriesCode.trim() || null,
        })
      } else {
        await createExchangeRate({
          rate_date: formValues.rateDate,
          base_currency: formValues.baseCurrency,
          quote_currency: formValues.quoteCurrency,
          rate_value: parsedRate,
          source: formValues.source,
          source_series_code: formValues.sourceSeriesCode.trim() || null,
        })
      }

      setShowModal(false)
      resetForm()
      await loadItems()
    } catch (error) {
      console.error(error)
      alert("No se pudo guardar el tipo de cambio")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Eliminar este tipo de cambio?")
    if (!confirmed) {
      return
    }

    try {
      setDeletingId(id)
      await deleteExchangeRate(id)
      await loadItems()
    } catch (error) {
      console.error(error)
      alert("No se pudo eliminar el tipo de cambio")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <PageContainer
      title="Tipo de cambio"
      description="Catalogo canonico para convertir compras, ventas y profit contable a MXN usando la tasa del dia anterior."
      actions={
        <button
          type="button"
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8]"
        >
          Anadir tipo de cambio
        </button>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-3">
          {latestByCurrency.map(({ currency, item }) => (
            <div key={currency} className="rounded-xl border border-[#E5E7EB] bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                {currency} → MXN
              </div>
              <div className="mt-2 text-2xl font-semibold text-[#111827]">
                {item ? item.rate_value.toFixed(4) : "—"}
              </div>
              <div className="mt-1 text-sm text-[#6B7280]">
                {item ? `Fecha ${item.rate_date}` : "Sin registro"}
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">Catalogo de tipos de cambio</h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                El ERP toma la ultima tasa disponible anterior al dia de trabajo para convertir todo a MXN.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                placeholder="Buscar"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <select
                className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                value={baseCurrencyFilter}
                onChange={(event) => setBaseCurrencyFilter(event.target.value)}
              >
                <option value="all">Todas las monedas</option>
                {currencyOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-[#6B7280]">Cargando tipos de cambio...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No hay tipos de cambio registrados todavia.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
              <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Moneda base</th>
                    <th className="px-4 py-3">Moneda destino</th>
                    <th className="px-4 py-3">Tasa</th>
                    <th className="px-4 py-3">Fuente</th>
                    <th className="px-4 py-3">Serie</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] bg-white">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-[#475569]">{item.rate_date}</td>
                      <td className="px-4 py-3 text-[#475569]">{item.base_currency}</td>
                      <td className="px-4 py-3 text-[#475569]">{item.quote_currency}</td>
                      <td className="px-4 py-3 font-medium text-[#111827]">
                        {item.rate_value.toFixed(6)}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">{item.source}</td>
                      <td className="px-4 py-3 text-[#475569]">
                        {item.source_series_code || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(item.id)
                              setFormValues({
                                rateDate: item.rate_date,
                                baseCurrency: item.base_currency,
                                quoteCurrency: item.quote_currency,
                                rateValue: String(item.rate_value),
                                source: item.source,
                                sourceSeriesCode: item.source_series_code || "",
                              })
                              setShowModal(true)
                            }}
                            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 font-medium text-[#111827] hover:bg-[#F8FAFC]"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            className="rounded-md border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-1.5 font-medium text-[#B91C1C] hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingId === item.id ? "Eliminando..." : "Eliminar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="date"
              className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              value={formValues.rateDate}
              onChange={(event) => setFormValues((current) => ({ ...current, rateDate: event.target.value }))}
            />
            <select
              className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              value={formValues.baseCurrency}
              onChange={(event) => setFormValues((current) => ({ ...current, baseCurrency: event.target.value }))}
            >
              {currencyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              value={formValues.quoteCurrency}
              onChange={(event) => setFormValues((current) => ({ ...current, quoteCurrency: event.target.value }))}
            >
              <option value="MXN">MXN</option>
            </select>
            <input
              className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              placeholder="Tipo de cambio"
              inputMode="decimal"
              value={formValues.rateValue}
              onChange={(event) => setFormValues((current) => ({ ...current, rateValue: event.target.value }))}
            />
            <select
              className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              value={formValues.source}
              onChange={(event) => setFormValues((current) => ({ ...current, source: event.target.value }))}
            >
              {sourceOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              placeholder="Serie BANXICO"
              value={formValues.sourceSeriesCode}
              onChange={(event) =>
                setFormValues((current) => ({ ...current, sourceSeriesCode: event.target.value }))
              }
            />
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </Modal>
      ) : null}
    </PageContainer>
  )
}
