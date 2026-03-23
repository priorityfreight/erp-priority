"use client"

import { useEffect, useMemo, useState } from "react"
import { Modal } from "@/components/data/Modal"
import { PageContainer } from "@/components/layout/PageContainer"
import {
  createSalesAccountingConcept,
  deleteSalesAccountingConcept,
  getSalesAccountingConcepts,
  type SalesAccountingConcept,
  updateSalesAccountingConcept,
} from "@/lib/db"

const serviceTypeOptions = ["GENERAL", "AIR", "FCL", "LCL", "FTL", "LTL", "COURIER"]
const operationTypeOptions = ["IMPORT", "EXPORT"]

type FormValues = {
  concept: string
  serviceType: string
  operationType: string
  vatRate: string
  satCode: string
}

const emptyForm: FormValues = {
  concept: "",
  serviceType: "GENERAL",
  operationType: "IMPORT",
  vatRate: "16",
  satCode: "",
}

export function SalesAccountingConceptManager() {
  const [items, setItems] = useState<SalesAccountingConcept[]>([])
  const [query, setQuery] = useState("")
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all")
  const [operationTypeFilter, setOperationTypeFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<FormValues>(emptyForm)

  async function loadItems() {
    try {
      setLoading(true)
      const data = await getSalesAccountingConcepts({
        query,
        serviceType: serviceTypeFilter,
        operationType: operationTypeFilter,
      })
      setItems(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function loadForFilters() {
      try {
        setLoading(true)
        const data = await getSalesAccountingConcepts({
          query,
          serviceType: serviceTypeFilter,
          operationType: operationTypeFilter,
        })

        if (!cancelled) {
          setItems(data)
        }
      } catch (error) {
        console.error(error)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadForFilters()

    return () => {
      cancelled = true
    }
  }, [query, serviceTypeFilter, operationTypeFilter])

  const totalVatConfigured = useMemo(
    () => items.reduce((sum, item) => sum + item.vat_rate, 0),
    [items]
  )

  function resetForm() {
    setEditingId(null)
    setFormValues(emptyForm)
  }

  async function handleSave() {
    if (!formValues.concept.trim()) {
      alert("El concepto es obligatorio")
      return
    }

    if (!formValues.satCode.trim()) {
      alert("La clave SAT es obligatoria")
      return
    }

    const parsedVat = Number(formValues.vatRate)
    if (!Number.isFinite(parsedVat) || parsedVat < 0 || parsedVat > 100) {
      alert("IVA invalido")
      return
    }

    try {
      setSaving(true)

      if (editingId) {
        await updateSalesAccountingConcept(editingId, {
          concept: formValues.concept.trim(),
          service_type: formValues.serviceType,
          operation_type: formValues.operationType,
          vat_rate: parsedVat,
          sat_code: formValues.satCode.trim().toUpperCase(),
        })
      } else {
        await createSalesAccountingConcept({
          concept: formValues.concept.trim(),
          service_type: formValues.serviceType,
          operation_type: formValues.operationType,
          vat_rate: parsedVat,
          sat_code: formValues.satCode.trim().toUpperCase(),
        })
      }

      setShowModal(false)
      resetForm()
      await loadItems()
    } catch (error) {
      console.error(error)
      alert("No se pudo guardar el concepto contable")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Eliminar este concepto contable?")
    if (!confirmed) {
      return
    }

    try {
      setDeletingId(id)
      await deleteSalesAccountingConcept(id)
      await loadItems()
    } catch (error) {
      console.error(error)
      alert("No se pudo eliminar el concepto contable")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <PageContainer
      title="Conceptos contables"
      description="Catalogo SAT para ventas con tipo de servicio, operacion, IVA y clave SAT."
      actions={
        <button
          type="button"
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8]"
        >
          Anadir concepto
        </button>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#1D4ED8]">
              Registros
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">{items.length}</div>
          </div>
          <div className="rounded-xl border border-[#D1FAE5] bg-[#ECFDF5] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#047857]">
              Tipos de servicio
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {new Set(items.map((item) => item.service_type)).size}
            </div>
          </div>
          <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#B45309]">
              IVA acumulado
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {totalVatConfigured.toLocaleString()}%
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">Catalogo actual</h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                Filtra por servicio, operacion o busca por concepto y clave SAT.
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
                value={serviceTypeFilter}
                onChange={(event) => setServiceTypeFilter(event.target.value)}
              >
                <option value="all">Todos los servicios</option>
                {serviceTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                value={operationTypeFilter}
                onChange={(event) => setOperationTypeFilter(event.target.value)}
              >
                <option value="all">Todas las operaciones</option>
                {operationTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-[#6B7280]">Cargando conceptos contables...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-[#6B7280]">
              No hay conceptos contables registrados todavia.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
              <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  <tr>
                    <th className="px-4 py-3">Concepto</th>
                    <th className="px-4 py-3">Servicio</th>
                    <th className="px-4 py-3">Operacion</th>
                    <th className="px-4 py-3">IVA</th>
                    <th className="px-4 py-3">Clave SAT</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] bg-white">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-[#111827]">{item.concept}</td>
                      <td className="px-4 py-3 text-[#475569]">{item.service_type}</td>
                      <td className="px-4 py-3 text-[#475569]">{item.operation_type}</td>
                      <td className="px-4 py-3 text-[#475569]">{item.vat_rate}%</td>
                      <td className="px-4 py-3 text-[#475569]">{item.sat_code}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(item.id)
                              setFormValues({
                                concept: item.concept,
                                serviceType: item.service_type,
                                operationType: item.operation_type,
                                vatRate: String(item.vat_rate),
                                satCode: item.sat_code,
                              })
                              setShowModal(true)
                            }}
                            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 font-medium text-[#111827] hover:bg-[#F8FAFC]"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
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
          title={editingId ? "Editar concepto contable" : "Anadir concepto contable"}
          description="Captura el concepto, el alcance comercial y la referencia SAT."
          onClose={() => {
            setShowModal(false)
            resetForm()
          }}
        >
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                placeholder="Concepto"
                value={formValues.concept}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, concept: event.target.value }))
                }
              />
              <input
                className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                placeholder="Clave SAT"
                value={formValues.satCode}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, satCode: event.target.value }))
                }
              />
              <select
                className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                value={formValues.serviceType}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, serviceType: event.target.value }))
                }
              >
                {serviceTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                value={formValues.operationType}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, operationType: event.target.value }))
                }
              >
                {operationTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <input
                className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                placeholder="IVA"
                value={formValues.vatRate}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, vatRate: event.target.value }))
                }
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className="rounded-md border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-medium text-[#111827] hover:bg-[#F8FAFC]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Guardando..." : editingId ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </PageContainer>
  )
}
