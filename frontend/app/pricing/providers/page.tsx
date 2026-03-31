"use client"

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import {
  createProvider,
  deleteProvider,
  getProviderSummaries,
  type ProviderSummary,
} from "@/lib/db"
import { getErrorMessage, notifyError, notifyWarning } from "@/lib/feedback"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/data/Modal"
import { StatusBadge } from "@/components/data/StatusBadge"
import { usePriorityConfirm } from "@/components/priority/usePriorityConfirm"
import { PriorityDataTable } from "@/components/priority/PriorityDataTable"
import { PriorityRowActions } from "@/components/priority/PriorityRowActions"
import { PrioritySectionAlert } from "@/components/priority/PrioritySectionAlert"
import { PriorityToolbar } from "@/components/priority/PriorityToolbar"
import { PriorityTypography } from "@/components/priority/PriorityTypography"
import {
  ProviderForm,
  type ProviderFormValues,
} from "@/components/forms/ProviderForm"
import { PageContainer } from "@/components/layout/PageContainer"

const emptyForm: ProviderFormValues = {
  name: "",
  taxId: "",
  status: "en_proceso_de_alta",
  providerType: "",
  corporatePhone: "",
  companyEmail: "",
  website: "",
  fullAddress: "",
  postalCode: "",
  city: "",
  cityUnlocode: "",
  country: "",
  creditActive: "no",
  creditAmount: "",
  creditDays: "",
}

export default function ProvidersPage() {
  const router = useRouter()
  const [providers, setProviders] = useState<ProviderSummary[]>([])
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formValues, setFormValues] = useState<ProviderFormValues>(emptyForm)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { confirm, confirmDialog } = usePriorityConfirm()

  const loadProviders = useCallback(async (query = "") => {
    try {
      const data = await getProviderSummaries(query)
      setProviders(data)
    } catch (error) {
      console.error(error)
    }
  }, [])

  useEffect(() => {
    void loadProviders(deferredSearch)
  }, [deferredSearch, loadProviders])

  function handleChange(field: keyof ProviderFormValues, value: string) {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function resetForm() {
    setFormValues(emptyForm)
  }

  async function handleCreateProvider() {
    if (!formValues.name.trim()) {
      notifyWarning("Nombre del proveedor requerido")
      return
    }

    try {
      setCreating(true)
      await createProvider({
        name: formValues.name.trim(),
        tax_id: formValues.taxId.trim() || null,
        status: formValues.status,
        provider_type: formValues.providerType.trim() || null,
        corporate_phone: formValues.corporatePhone.trim() || null,
        company_email: formValues.companyEmail.trim() || null,
        website: formValues.website.trim() || null,
        full_address: formValues.fullAddress.trim() || null,
        postal_code: formValues.postalCode.trim() || null,
        city_unlocode: formValues.cityUnlocode.trim() || null,
        credit_active: formValues.creditActive === "si",
        credit_amount: formValues.creditAmount ? Number(formValues.creditAmount) : null,
        credit_days: formValues.creditDays ? Number(formValues.creditDays) : null,
      })

      resetForm()
      setShowCreateModal(false)
      await loadProviders(search)
    } catch (error) {
      console.error(error)
      notifyError("Error creating provider", getErrorMessage(error, "The provider could not be saved."))
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteProvider = useCallback(async (id: string) => {
    const confirmed = await confirm({
      title: "Eliminar proveedor",
      description: "Se eliminara el proveedor junto con sus contactos y servicios ofrecidos.",
      actionLabel: "Eliminar proveedor",
      variant: "destructive",
    })

    if (!confirmed) {
      return
    }

    try {
      setDeletingId(id)
      await deleteProvider(id)
      await loadProviders(search)
    } catch (error) {
      console.error(error)
      notifyError("Error deleting provider", getErrorMessage(error, "The provider could not be deleted."))
    } finally {
      setDeletingId(null)
    }
  }, [confirm, loadProviders, search])

  const activeProviders = providers.filter((provider) => provider.status === "activo").length
  const creditProviders = providers.filter((provider) => provider.credit_active).length
  const totalOfferings = providers.reduce(
    (sum, provider) => sum + provider.total_service_offerings,
    0
  )
  const providerColumns = useMemo<ColumnDef<ProviderSummary>[]>(
    () => [
      {
        accessorKey: "provider_name",
        header: "Proveedor",
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => router.push(`/pricing/providers/${row.original.id}`)}
            className="text-left font-semibold text-[var(--brand-navy)] transition hover:text-[var(--brand-burgundy)]"
          >
            {row.original.provider_name}
          </button>
        ),
      },
      {
        accessorKey: "provider_type",
        header: "Tipo",
        cell: ({ row }) => row.original.provider_type || "No definido",
      },
      {
        id: "location",
        header: "Ubicacion",
        cell: ({ row }) =>
          [row.original.city, row.original.country].filter(Boolean).join(" · ") || "No disponible",
      },
      {
        accessorKey: "status",
        header: "Estatus",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "total_service_offerings",
        header: "Servicios",
      },
      {
        accessorKey: "total_contacts",
        header: "Contactos",
      },
      {
        id: "credit",
        header: "Credito",
        cell: ({ row }) =>
          row.original.credit_active
            ? `$${(row.original.credit_amount ?? 0).toLocaleString()} / ${row.original.credit_days ?? 0} dias`
            : "No",
      },
      {
        id: "actions",
        header: "Acciones",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <PriorityRowActions
              actions={[
                {
                  label: "Ver detalle",
                  onSelect: () => router.push(`/pricing/providers/${row.original.id}`),
                },
                {
                  label: deletingId === row.original.id ? "Eliminando..." : "Eliminar",
                  onSelect: () => void handleDeleteProvider(row.original.id),
                  disabled: deletingId === row.original.id,
                  destructive: true,
                },
              ]}
            />
          </div>
        ),
      },
    ],
    [deletingId, handleDeleteProvider, router]
  )

  return (
    <PageContainer
      title="Providers"
      description="Pricing module for provider company records, offered services, and supplier contacts."
      actions={
        <Button type="button" onClick={() => setShowCreateModal(true)}>
          Anadir proveedor
        </Button>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-4">
            <PriorityTypography variant="eyebrow" className="text-[#1D4ED8]">
              Total Providers
            </PriorityTypography>
            <PriorityTypography variant="sectionTitle" className="mt-2 text-[var(--brand-navy)]">
              {providers.length}
            </PriorityTypography>
          </div>
          <div className="rounded-xl border border-[#D1FAE5] bg-[#ECFDF5] p-4">
            <PriorityTypography variant="eyebrow" className="text-[#047857]">
              Active Providers
            </PriorityTypography>
            <PriorityTypography variant="sectionTitle" className="mt-2 text-[var(--brand-navy)]">
              {activeProviders}
            </PriorityTypography>
          </div>
          <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
            <PriorityTypography variant="eyebrow" className="text-[#B45309]">
              Service Offerings
            </PriorityTypography>
            <PriorityTypography variant="sectionTitle" className="mt-2 text-[var(--brand-navy)]">
              {totalOfferings}
            </PriorityTypography>
          </div>
        </section>

        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="mb-4 space-y-4">
            <div>
              <PriorityTypography as="h2" variant="cardTitle">
                Provider registry
              </PriorityTypography>
              <PriorityTypography variant="bodyMuted" className="mt-1">
                {creditProviders} proveedores con credito activo.
              </PriorityTypography>
            </div>
            <PriorityToolbar className="justify-between">
              <input
                className="rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                placeholder="Buscar proveedor"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <PriorityTypography variant="caption">
                Usa las columnas para ordenar y el menu de acciones para operar cada proveedor.
              </PriorityTypography>
            </PriorityToolbar>
          </div>

          <PriorityDataTable
            columns={providerColumns}
            data={providers}
            emptyTitle="Sin proveedores todavia"
            emptyDescription={
              search
                ? "No hay proveedores que coincidan con la busqueda actual."
                : "Crea el primer proveedor para comenzar a construir el sourcing de pricing."
            }
            emptyVariant={search ? "search" : "default"}
          />

          {creditProviders > 0 ? (
            <PrioritySectionAlert title="Credito detectado" variant="info" className="mt-4">
              Algunos proveedores ya cuentan con linea de credito. Revisa monto y dias directamente en el detalle antes de operar.
            </PrioritySectionAlert>
          ) : null}
        </section>
      </div>

      {showCreateModal ? (
        <Modal
          title="Anadir proveedor"
          onClose={() => {
            if (!creating) {
              resetForm()
              setShowCreateModal(false)
            }
          }}
        >
          <ProviderForm
            title="Nuevo proveedor"
            description="Crea la ficha principal del proveedor. Los servicios y contactos se agregan desde el detalle."
            values={formValues}
            onChange={handleChange}
            onSubmit={() => void handleCreateProvider()}
            submitLabel="Guardar proveedor"
            loading={creating}
          />
        </Modal>
      ) : null}

      {confirmDialog}
    </PageContainer>
  )
}
