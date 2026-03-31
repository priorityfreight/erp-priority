"use client"

import { type ColumnDef } from "@tanstack/react-table"
import {
  PencilLineIcon,
  PlusIcon,
  ShieldAlertIcon,
  Trash2Icon,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { notifyError, notifySuccess, notifyWarning } from "@/lib/feedback"
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
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<SalesAccountingConcept | null>(null)
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
      notifyError("No se pudo cargar el catalogo contable")
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
        if (!cancelled) {
          notifyError("No se pudo cargar el catalogo contable")
        }
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

  const serviceOptions = useMemo(
    () => [{ value: "all", label: "Todos los servicios" }].concat(
      serviceTypeOptions.map((option) => ({ value: option, label: option }))
    ),
    []
  )

  const operationOptions = useMemo(
    () => [{ value: "all", label: "Todas las operaciones" }].concat(
      operationTypeOptions.map((option) => ({ value: option, label: option }))
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
    if (!formValues.concept.trim()) {
      notifyWarning("El concepto es obligatorio")
      return
    }

    if (!formValues.satCode.trim()) {
      notifyWarning("La clave SAT es obligatoria")
      return
    }

    const parsedVat = Number(formValues.vatRate)
    if (!Number.isFinite(parsedVat) || parsedVat < 0 || parsedVat > 100) {
      notifyWarning("IVA invalido")
      return
    }

    try {
      setSaving(true)

      const payload = {
        concept: formValues.concept.trim(),
        service_type: formValues.serviceType,
        operation_type: formValues.operationType,
        vat_rate: parsedVat,
        sat_code: formValues.satCode.trim().toUpperCase(),
      }

      if (editingId) {
        await updateSalesAccountingConcept(editingId, payload)
        notifySuccess("Concepto contable actualizado correctamente")
      } else {
        await createSalesAccountingConcept(payload)
        notifySuccess("Concepto contable creado correctamente")
      }

      setShowModal(false)
      resetForm()
      await loadItems()
    } catch (error) {
      console.error(error)
      notifyError("No se pudo guardar el concepto contable")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!pendingDelete) {
      return
    }

    try {
      await deleteSalesAccountingConcept(pendingDelete.id)
      notifySuccess("Concepto contable eliminado correctamente")
      setPendingDelete(null)
      await loadItems()
    } catch (error) {
      console.error(error)
      notifyError("No se pudo eliminar el concepto contable")
    }
  }

  const columns = useMemo<ColumnDef<SalesAccountingConcept>[]>(
    () => [
      {
        accessorKey: "concept",
        header: "Concepto",
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-medium text-[var(--brand-navy)]">{row.original.concept}</div>
            <div className="text-xs uppercase tracking-[0.18em] text-[#7A8BA1]">
              {row.original.sat_code}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "service_type",
        header: "Servicio",
        cell: ({ row }) => <Badge variant="secondary">{row.original.service_type}</Badge>,
      },
      {
        accessorKey: "operation_type",
        header: "Operacion",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className="border-[rgba(37,99,235,0.18)] bg-[rgba(37,99,235,0.05)] text-[#1D4ED8]"
          >
            {row.original.operation_type}
          </Badge>
        ),
      },
      {
        accessorKey: "vat_rate",
        header: "IVA",
        cell: ({ row }) => <span className="font-medium">{row.original.vat_rate}%</span>,
      },
      {
        accessorKey: "sat_code",
        header: "Clave SAT",
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <PriorityRowActions
              label="Acciones de concepto"
              actions={[
                {
                  label: "Editar",
                  icon: <PencilLineIcon />,
                  onSelect: () => {
                    setEditingId(row.original.id)
                    setFormValues({
                      concept: row.original.concept,
                      serviceType: row.original.service_type,
                      operationType: row.original.operation_type,
                      vatRate: String(row.original.vat_rate),
                      satCode: row.original.sat_code,
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
      title="Conceptos contables"
      description="Catalogo SAT para ventas con tipo de servicio, operacion, IVA y clave SAT."
      actions={
        <Button type="button" size="lg" onClick={openCreateModal}>
          <PlusIcon />
          Anadir concepto
        </Button>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-[rgba(37,99,235,0.16)] bg-[linear-gradient(180deg,_rgba(239,246,255,0.95)_0%,_rgba(255,255,255,0.92)_100%)] p-5 shadow-[0_24px_48px_-36px_rgba(37,99,235,0.25)]">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1D4ED8]">
              Registros
            </div>
            <div className="mt-3 text-3xl font-semibold text-[var(--brand-navy)]">{items.length}</div>
          </div>
          <div className="rounded-[24px] border border-[rgba(16,185,129,0.16)] bg-[linear-gradient(180deg,_rgba(236,253,245,0.95)_0%,_rgba(255,255,255,0.92)_100%)] p-5 shadow-[0_24px_48px_-36px_rgba(16,185,129,0.22)]">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#047857]">
              Tipos de servicio
            </div>
            <div className="mt-3 text-3xl font-semibold text-[var(--brand-navy)]">
              {new Set(items.map((item) => item.service_type)).size}
            </div>
          </div>
          <div className="rounded-[24px] border border-[rgba(217,119,6,0.16)] bg-[linear-gradient(180deg,_rgba(255,251,235,0.95)_0%,_rgba(255,255,255,0.92)_100%)] p-5 shadow-[0_24px_48px_-36px_rgba(217,119,6,0.18)]">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B45309]">
              IVA acumulado
            </div>
            <div className="mt-3 text-3xl font-semibold text-[var(--brand-navy)]">
              {totalVatConfigured.toLocaleString()}%
            </div>
          </div>
        </section>

        <section className="space-y-5 rounded-[28px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.92)] p-6 shadow-[0_28px_56px_-42px_rgba(3,10,24,0.34)]">
          <div className="flex flex-col gap-4">
            <div>
              <PriorityCardTitle>Catalogo actual</PriorityCardTitle>
              <PriorityTypography variant="bodyMuted" className="mt-1">
                Filtra por servicio, operacion o busca por concepto y clave SAT.
              </PriorityTypography>
            </div>
            <PriorityToolbar className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(220px,1fr)_minmax(220px,1fr)_auto]">
              <PriorityInput
                placeholder="Buscar concepto o clave SAT"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <PrioritySelectField
                value={serviceTypeFilter}
                onValueChange={setServiceTypeFilter}
                placeholder="Servicio"
                options={serviceOptions}
              />
              <PrioritySelectField
                value={operationTypeFilter}
                onValueChange={setOperationTypeFilter}
                placeholder="Operacion"
                options={operationOptions}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setQuery("")
                  setServiceTypeFilter("all")
                  setOperationTypeFilter("all")
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
              emptyTitle="No hay conceptos contables registrados"
              emptyDescription="Crea el primer concepto para normalizar servicios, operaciones, IVA y referencias SAT."
            />
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
          <div className="space-y-5">
            <PriorityFormSection
              title="Identidad contable"
              description="Define el concepto y la referencia SAT que utilizará el equipo comercial."
            >
              <PriorityFormGrid className="xl:grid-cols-2">
                <PriorityFormField label="Concepto">
                  <PriorityInput
                    placeholder="Concepto"
                    value={formValues.concept}
                    onChange={(event) =>
                      setFormValues((current) => ({ ...current, concept: event.target.value }))
                    }
                  />
                </PriorityFormField>
                <PriorityFormField label="Clave SAT">
                  <PriorityInput
                    placeholder="Clave SAT"
                    value={formValues.satCode}
                    onChange={(event) =>
                      setFormValues((current) => ({ ...current, satCode: event.target.value }))
                    }
                  />
                </PriorityFormField>
              </PriorityFormGrid>
            </PriorityFormSection>

            <PriorityFormSection
              title="Aplicacion operativa"
              description="Selecciona donde aplica el concepto y el IVA asociado."
            >
              <PriorityFormGrid>
                <PriorityFormField label="Tipo de servicio">
                  <PrioritySelectField
                    value={formValues.serviceType}
                    onValueChange={(value) =>
                      setFormValues((current) => ({ ...current, serviceType: value }))
                    }
                    placeholder="Tipo de servicio"
                    options={serviceTypeOptions.map((option) => ({ value: option, label: option }))}
                  />
                </PriorityFormField>
                <PriorityFormField label="Operacion">
                  <PrioritySelectField
                    value={formValues.operationType}
                    onValueChange={(value) =>
                      setFormValues((current) => ({ ...current, operationType: value }))
                    }
                    placeholder="Operacion"
                    options={operationTypeOptions.map((option) => ({ value: option, label: option }))}
                  />
                </PriorityFormField>
                <PriorityFormField label="IVA (%)">
                  <PriorityInput
                    placeholder="IVA"
                    inputMode="decimal"
                    value={formValues.vatRate}
                    onChange={(event) =>
                      setFormValues((current) => ({ ...current, vatRate: event.target.value }))
                    }
                  />
                </PriorityFormField>
              </PriorityFormGrid>
              <div className="mt-4">
                <PriorityInfoField
                  label="Uso esperado"
                  value="Ventas, pricing y conciliacion comercial con catalogo SAT."
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
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? <Spinner className="text-current" /> : null}
                {saving ? "Guardando..." : editingId ? "Actualizar" : "Guardar"}
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
            <AlertDialogTitle>Eliminar concepto contable</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `Vas a eliminar "${pendingDelete.concept}". Asegurate de que no sea un concepto activo en workflows comerciales o reportes.`
                : "Confirma la eliminacion del concepto contable."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="rounded-b-[28px] border-t border-[var(--border-subtle)] bg-[rgba(11,31,59,0.03)] px-6 py-4">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleDeleteConfirm()}>
              Eliminar concepto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}
