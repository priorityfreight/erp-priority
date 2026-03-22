"use client"

import { useEffect, useMemo, useState } from "react"
import { PageContainer } from "@/components/layout/PageContainer"
import {
  createServiceTransportType,
  deleteServiceTransportType,
  getServiceTransportTypes,
  type ServiceTransportType,
  updateServiceTransportType,
} from "@/lib/db"

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-6 py-10 text-center text-sm text-[#64748B]">
      {hasQuery
        ? "No hay registros que coincidan con la busqueda actual."
        : "Todavia no hay tipos de servicio registrados."}
    </div>
  )
}

export function ServiceTransportTypeManager() {
  const [items, setItems] = useState<ServiceTransportType[]>([])
  const [query, setQuery] = useState("")
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all")
  const [serviceType, setServiceType] = useState("Maritimo")
  const [transportType, setTransportType] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function loadItems(nextQuery = query, nextServiceType = serviceTypeFilter) {
    const data = await getServiceTransportTypes({
      query: nextQuery,
      serviceType: nextServiceType,
    })
    setItems(data)
  }

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    getServiceTransportTypes({
      query,
      serviceType: serviceTypeFilter,
    })
      .then((data) => {
        if (!cancelled) {
          setItems(data)
        }
      })
      .catch((error) => {
        console.error(error)
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [query, serviceTypeFilter])

  const serviceTypeOptions = useMemo(() => {
    const dynamic = Array.from(new Set(items.map((item) => item.service_type))).sort((left, right) =>
      left.localeCompare(right)
    )
    const defaults = ["Maritimo", "Terrestre", "Aereo"]
    return Array.from(new Set([...defaults, ...dynamic]))
  }, [items])

  const groupedCount = new Set(items.map((item) => item.service_type)).size

  function resetForm() {
    setEditingId(null)
    setServiceType("Maritimo")
    setTransportType("")
  }

  async function handleSubmit() {
    if (!serviceType.trim()) {
      alert("El tipo de servicio es obligatorio")
      return
    }

    if (!transportType.trim()) {
      alert("El tipo de transporte es obligatorio")
      return
    }

    try {
      setSaving(true)

      if (editingId) {
        await updateServiceTransportType(editingId, {
          service_type: serviceType.trim(),
          transport_type: transportType.trim(),
        })
      } else {
        await createServiceTransportType({
          service_type: serviceType.trim(),
          transport_type: transportType.trim(),
        })
      }

      resetForm()
      await loadItems()
    } catch (error) {
      console.error(error)
      alert("No se pudo guardar el registro")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Eliminar este tipo de servicio/transporte?")
    if (!confirmed) {
      return
    }

    try {
      setDeletingId(id)
      await deleteServiceTransportType(id)

      if (editingId === id) {
        resetForm()
      }

      await loadItems()
    } catch (error) {
      console.error(error)
      alert("No se pudo eliminar el registro")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <PageContainer
      title="Tipos de servicio"
      description="Catalogo editable de ventas para relacionar el tipo de servicio con el tipo de transporte."
      actions={
        <div className="rounded-full border border-[#D1FAE5] bg-[#ECFDF5] px-3 py-1 text-xs font-medium text-[#047857]">
          Editable en nube
        </div>
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
            <div className="mt-2 text-2xl font-semibold text-[#111827]">{groupedCount}</div>
          </div>
          <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#B45309]">
              Uso esperado
            </div>
            <div className="mt-2 text-sm font-medium text-[#111827]">
              Ventas, cotizaciones y futuros selectores operativos.
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-5">
            <h2 className="text-lg font-semibold text-[#111827]">
              {editingId ? "Editar registro" : "Nuevo registro"}
            </h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              Relaciona un tipo de servicio con un tipo de transporte disponible para el equipo comercial.
            </p>

            <div className="mt-5 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#111827]">
                  Tipo de servicio
                </label>
                <input
                  list="service-type-options"
                  className="w-full rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  value={serviceType}
                  onChange={(event) => setServiceType(event.target.value)}
                  placeholder="Maritimo"
                />
                <datalist id="service-type-options">
                  {serviceTypeOptions.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#111827]">
                  Tipo de transporte
                </label>
                <input
                  className="w-full rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  value={transportType}
                  onChange={(event) => setTransportType(event.target.value)}
                  placeholder="Caja de 53"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Guardando..." : editingId ? "Actualizar" : "Agregar"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-md border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-medium text-[#111827] hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Limpiar
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#111827]">Catalogo actual</h2>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Filtra por servicio o busca por cualquier valor del catalogo.
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
              </div>
            </div>

            {loading ? (
              <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-10 text-center text-sm text-[#6B7280]">
                Cargando catalogo...
              </div>
            ) : items.length === 0 ? (
              <EmptyState hasQuery={Boolean(query.trim())} />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
                <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                  <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                    <tr>
                      <th className="px-4 py-3">Tipo de servicio</th>
                      <th className="px-4 py-3">Tipo de transporte</th>
                      <th className="px-4 py-3">Actualizado</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] bg-white">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 font-medium text-[#111827]">{item.service_type}</td>
                        <td className="px-4 py-3 text-[#475569]">{item.transport_type}</td>
                        <td className="px-4 py-3 text-[#475569]">
                          {(item.updated_at ?? item.created_at).slice(0, 10)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(item.id)
                                setServiceType(item.service_type)
                                setTransportType(item.transport_type)
                              }}
                              className="rounded-md border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-1.5 text-sm font-medium text-[#1D4ED8] hover:bg-[#DBEAFE]"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              disabled={deletingId === item.id}
                              className="rounded-md border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-1.5 text-sm font-medium text-[#B91C1C] hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-60"
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
          </div>
        </section>
      </div>
    </PageContainer>
  )
}
