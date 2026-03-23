"use client"

import { useEffect, useState } from "react"
import { Modal } from "@/components/data/Modal"
import { PageContainer } from "@/components/layout/PageContainer"
import {
  createQuotationRejectionReason,
  deleteQuotationRejectionReason,
  getQuotationRejectionReasons,
  type QuotationRejectionReason,
  updateQuotationRejectionReason,
} from "@/lib/db"

const emptyForm = {
  reason: "",
}

export function QuotationRejectionReasonManager() {
  const [items, setItems] = useState<QuotationRejectionReason[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formValues, setFormValues] = useState(emptyForm)

  async function loadItems(search = "") {
    try {
      setLoading(true)
      const data = await getQuotationRejectionReasons({
        query: search,
      })
      setItems(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadItems(query)
  }, [query])

  function resetForm() {
    setEditingId(null)
    setFormValues(emptyForm)
  }

  async function handleSave() {
    if (!formValues.reason.trim()) {
      alert("El motivo es obligatorio")
      return
    }

    try {
      setSaving(true)
      if (editingId) {
        await updateQuotationRejectionReason(editingId, {
          reason: formValues.reason.trim(),
        })
      } else {
        await createQuotationRejectionReason({
          reason: formValues.reason.trim(),
        })
      }

      setShowModal(false)
      resetForm()
      await loadItems(query)
    } catch (error) {
      console.error(error)
      alert("No se pudo guardar el motivo")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Eliminar este motivo de rechazo?")
    if (!confirmed) {
      return
    }

    try {
      setDeletingId(id)
      await deleteQuotationRejectionReason(id)
      await loadItems(query)
    } catch (error) {
      console.error(error)
      alert("No se pudo eliminar el motivo")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <PageContainer
      title="Motivos de rechazo de cotizacion"
      description="Catalogo editable para clasificar rechazos comerciales de forma consistente."
      actions={
        <button
          type="button"
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8]"
        >
          Anadir motivo
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
              Catalogo activo
            </div>
            <div className="mt-2 text-sm font-medium text-[#111827]">
              Reutilizable en CRM, Pricing y reportes.
            </div>
          </div>
          <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#B45309]">
              Uso recomendado
            </div>
            <div className="mt-2 text-sm font-medium text-[#111827]">
              Seleccion estandar en lugar de texto libre.
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">Catalogo actual</h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                Busca por texto y mantén una lista limpia de motivos reutilizables.
              </p>
            </div>
            <input
              className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] sm:max-w-sm"
              placeholder="Buscar motivo"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          {loading ? (
            <p className="text-sm text-[#6B7280]">Cargando motivos...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No hay motivos configurados todavia.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
              <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  <tr>
                    <th className="px-4 py-3">Motivo</th>
                    <th className="px-4 py-3">Actualizado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] bg-white">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-[#111827]">{item.reason}</td>
                      <td className="px-4 py-3 text-[#475569]">
                        {item.updated_at || item.created_at}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(item.id)
                              setFormValues({
                                reason: item.reason,
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
          title={editingId ? "Editar motivo" : "Anadir motivo"}
          description="Mantén el catalogo de rechazo limpio y reutilizable."
          onClose={() => {
            setShowModal(false)
            resetForm()
          }}
        >
          <section className="space-y-4 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
            <input
              className="w-full rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              placeholder="Motivo de rechazo"
              value={formValues.reason}
              onChange={(event) =>
                setFormValues({
                  reason: event.target.value,
                })
              }
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar motivo"}
              </button>
            </div>
          </section>
        </Modal>
      ) : null}
    </PageContainer>
  )
}
