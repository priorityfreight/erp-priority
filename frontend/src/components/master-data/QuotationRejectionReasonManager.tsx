"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { PencilLineIcon, PlusIcon, ShieldAlertIcon, Trash2Icon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Modal } from "@/components/data/Modal"
import { PriorityCollectionTable } from "@/components/priority/collection/PriorityCollectionTable"
import { PriorityRowActions } from "@/components/priority/PriorityRowActions"
import {
  PriorityFormField,
  PriorityFormSection,
  PriorityInput,
  PrioritySubmitBar,
} from "@/components/priority/PriorityForm"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { notifyError, notifySuccess, notifyWarning } from "@/lib/feedback"
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
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<QuotationRejectionReason | null>(null)
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
      notifyError("No se pudo cargar el catálogo de motivos")
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

  function openCreateModal() {
    resetForm()
    setShowModal(true)
  }

  async function handleSave() {
    if (!formValues.reason.trim()) {
      notifyWarning("El motivo es obligatorio")
      return
    }

    try {
      setSaving(true)
      if (editingId) {
        await updateQuotationRejectionReason(editingId, {
          reason: formValues.reason.trim(),
        })
        notifySuccess("Motivo actualizado correctamente")
      } else {
        await createQuotationRejectionReason({
          reason: formValues.reason.trim(),
        })
        notifySuccess("Motivo creado correctamente")
      }

      setShowModal(false)
      resetForm()
      await loadItems(query)
    } catch (error) {
      console.error(error)
      notifyError("No se pudo guardar el motivo")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!pendingDelete) {
      return
    }

    try {
      await deleteQuotationRejectionReason(pendingDelete.id)
      notifySuccess("Motivo eliminado correctamente")
      setPendingDelete(null)
      await loadItems(query)
    } catch (error) {
      console.error(error)
      notifyError("No se pudo eliminar el motivo")
    }
  }

  const columns = useMemo<ColumnDef<QuotationRejectionReason>[]>(
    () => [
      {
        accessorKey: "reason",
        header: "Motivo",
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-medium text-[var(--brand-navy)]">{row.original.reason}</div>
            <Badge
              variant="outline"
              className="border-[rgba(179,58,91,0.18)] bg-[rgba(179,58,91,0.06)] text-[var(--brand-burgundy)]"
            >
              Catálogo comercial
            </Badge>
          </div>
        ),
      },
      {
        id: "updated",
        header: "Actualizado",
        cell: ({ row }) => (
          <span className="text-[#5B6A7D]">{row.original.updated_at || row.original.created_at}</span>
        ),
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <PriorityRowActions
              label="Acciones de motivo"
              actions={[
                {
                  label: "Editar",
                  icon: <PencilLineIcon />,
                  onSelect: () => {
                    setEditingId(row.original.id)
                    setFormValues({
                      reason: row.original.reason,
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
      density="compact"
      title="Motivos de rechazo de cotización"
      description="Catálogo editable para clasificar rechazos comerciales de forma consistente."
      actions={
        <Button type="button" size="lg" onClick={openCreateModal}>
          <PlusIcon />
          Añadir motivo
        </Button>
      }
    >
      <div className="space-y-4">
        <section className="grid gap-2.5 md:grid-cols-3">
          <div className="rounded-[20px] border border-[rgba(37,99,235,0.16)] bg-[linear-gradient(180deg,_rgba(239,246,255,0.95)_0%,_rgba(255,255,255,0.92)_100%)] p-3.5 shadow-[0_16px_28px_-26px_rgba(37,99,235,0.18)]">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1D4ED8]">
              Registros
            </div>
            <div className="mt-1.5 text-[1.45rem] font-semibold text-[var(--brand-navy)]">{items.length}</div>
          </div>
          <div className="rounded-[20px] border border-[rgba(16,185,129,0.16)] bg-[linear-gradient(180deg,_rgba(236,253,245,0.95)_0%,_rgba(255,255,255,0.92)_100%)] p-3.5 shadow-[0_16px_28px_-26px_rgba(16,185,129,0.16)]">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#047857]">
              Catálogo activo
            </div>
            <div className="mt-1.5 text-sm leading-6 text-[#27445D]">
              Reutilizable en CRM, Pricing y reportes.
            </div>
          </div>
          <div className="rounded-[20px] border border-[rgba(217,119,6,0.16)] bg-[linear-gradient(180deg,_rgba(255,251,235,0.95)_0%,_rgba(255,255,255,0.92)_100%)] p-3.5 shadow-[0_16px_28px_-26px_rgba(217,119,6,0.14)]">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B45309]">
              Uso recomendado
            </div>
            <div className="mt-1.5 text-sm leading-6 text-[#27445D]">
              Selección estándar en lugar de texto libre.
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-[24px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.92)] p-5 shadow-[0_24px_44px_-38px_rgba(3,10,24,0.28)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <PriorityCardTitle>Catálogo actual</PriorityCardTitle>
              <PriorityTypography variant="bodyMuted" className="mt-1">
                Busca por texto y mantén una lista limpia de motivos reutilizables.
              </PriorityTypography>
            </div>
            <PriorityToolbar density="compact" className="flex w-full max-w-xl flex-col gap-2.5 sm:flex-row">
              <PriorityInput
                placeholder="Buscar motivo"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="sm:flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuery("")}
                disabled={!query}
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
            <PriorityCollectionTable
              columns={columns}
              data={items}
              emptyTitle="No hay motivos configurados todavía"
              emptyDescription="Crea el primer motivo para estandarizar rechazos comerciales y evitar texto libre."
            />
          )}
        </section>
      </div>

      {showModal ? (
        <Modal
          title={editingId ? "Editar motivo" : "Añadir motivo"}
          description="Mantén el catálogo de rechazo limpio y reutilizable."
          size="compact"
          onClose={() => {
            setShowModal(false)
            resetForm()
          }}
        >
          <div className="space-y-5">
            <PriorityFormSection
              density="compact"
              title="Motivo comercial"
              description="Usa una etiqueta clara, corta y reutilizable para reportes y seguimiento."
            >
              <PriorityFormField label="Motivo">
                <PriorityInput
                  placeholder="Motivo de rechazo"
                  value={formValues.reason}
                  onChange={(event) =>
                    setFormValues({
                      reason: event.target.value,
                    })
                  }
                />
              </PriorityFormField>
            </PriorityFormSection>
            <PrioritySubmitBar density="compact" mode="inline">
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
                {saving ? "Guardando..." : "Guardar motivo"}
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
            <AlertDialogTitle>Eliminar motivo</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `Vas a eliminar "${pendingDelete.reason}". Esta acción impacta catálogos operativos y no debe ejecutarse por error.`
                : "Confirma la eliminacion del motivo."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="rounded-b-[28px] border-t border-[var(--border-subtle)] bg-[rgba(11,31,59,0.03)] px-6 py-4">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void handleDeleteConfirm()}
            >
              Eliminar motivo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}
