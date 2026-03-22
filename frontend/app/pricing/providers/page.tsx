"use client"

import Link from "next/link"
import { useCallback, useDeferredValue, useEffect, useState } from "react"
import {
  createProvider,
  deleteProvider,
  getProviderSummaries,
  type ProviderSummary,
} from "@/lib/db"
import { Modal } from "@/components/data/Modal"
import { StatusBadge } from "@/components/data/StatusBadge"
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
  const [providers, setProviders] = useState<ProviderSummary[]>([])
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [sortBy, setSortBy] = useState("name")
  const [page, setPage] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formValues, setFormValues] = useState<ProviderFormValues>(emptyForm)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  useEffect(() => {
    setPage(1)
  }, [search, sortBy])

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
      alert("Nombre del proveedor requerido")
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
      alert("Error creating provider")
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteProvider(id: string) {
    const confirmed = window.confirm(
      "Eliminar este proveedor tambien borrara sus contactos y servicios ofrecidos."
    )

    if (!confirmed) {
      return
    }

    try {
      setDeletingId(id)
      await deleteProvider(id)
      await loadProviders(search)
    } catch (error) {
      console.error(error)
      alert("Error deleting provider")
    } finally {
      setDeletingId(null)
    }
  }

  const sortedProviders = [...providers].sort((left, right) => {
    if (sortBy === "type") {
      return (left.provider_type || "").localeCompare(right.provider_type || "")
    }

    if (sortBy === "city") {
      return (left.city || "").localeCompare(right.city || "")
    }

    if (sortBy === "services") {
      return left.total_service_offerings - right.total_service_offerings
    }

    return left.provider_name.localeCompare(right.provider_name)
  })

  const pageSize = 8
  const totalPages = Math.max(1, Math.ceil(sortedProviders.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedProviders = sortedProviders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const activeProviders = providers.filter((provider) => provider.status === "activo").length
  const creditProviders = providers.filter((provider) => provider.credit_active).length
  const totalOfferings = providers.reduce(
    (sum, provider) => sum + provider.total_service_offerings,
    0
  )

  return (
    <PageContainer
      title="Providers"
      description="Pricing module for provider company records, offered services, and supplier contacts."
      actions={
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8]"
        >
          Anadir proveedor
        </button>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#1D4ED8]">
              Total Providers
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">{providers.length}</div>
          </div>
          <div className="rounded-xl border border-[#D1FAE5] bg-[#ECFDF5] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#047857]">
              Active Providers
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">{activeProviders}</div>
          </div>
          <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#B45309]">
              Service Offerings
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">{totalOfferings}</div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-lg font-semibold text-[#111827]">Provider registry</div>
              <div className="text-sm text-[#6B7280]">
                {creditProviders} proveedores con credito activo.
              </div>
            </div>
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                className="rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                placeholder="Buscar proveedor"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                className="rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="name">Ordenar por nombre</option>
                <option value="type">Ordenar por tipo</option>
                <option value="city">Ordenar por ciudad</option>
                <option value="services">Ordenar por servicios</option>
              </select>
            </div>
          </div>

          {providers.length === 0 ? (
            <p className="text-sm text-[#6B7280]">
              No providers yet. Create the first one from the popup.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
              <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  <tr>
                    <th className="px-4 py-3">Proveedor</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Ubicacion</th>
                    <th className="px-4 py-3">Estatus</th>
                    <th className="px-4 py-3">Servicios</th>
                    <th className="px-4 py-3">Contactos</th>
                    <th className="px-4 py-3">Credito</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] bg-white">
                  {paginatedProviders.map((provider) => (
                    <tr key={provider.id}>
                      <td className="px-4 py-3 font-medium text-[#111827]">
                        <Link
                          href={`/pricing/providers/${provider.id}`}
                          className="text-[#2563EB] hover:text-[#1D4ED8]"
                        >
                          {provider.provider_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {provider.provider_type || "No definido"}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {[provider.city, provider.country].filter(Boolean).join(" · ") ||
                          "No disponible"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={provider.status} />
                      </td>
                      <td className="px-4 py-3 text-[#475569]">{provider.total_service_offerings}</td>
                      <td className="px-4 py-3 text-[#475569]">{provider.total_contacts}</td>
                      <td className="px-4 py-3 text-[#475569]">
                        {provider.credit_active
                          ? `$${(provider.credit_amount ?? 0).toLocaleString()} / ${provider.credit_days ?? 0} dias`
                          : "No"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/pricing/providers/${provider.id}`}
                            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 font-medium text-[#111827] hover:bg-[#F8FAFC]"
                          >
                            Ver
                          </Link>
                          <button
                            type="button"
                            onClick={() => void handleDeleteProvider(provider.id)}
                            disabled={deletingId === provider.id}
                            className="rounded-md border border-[#FECACA] bg-white px-3 py-1.5 font-medium text-[#B91C1C] hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingId === provider.id ? "Deleting..." : "Eliminar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-sm text-[#6B7280]">
            <div>
              Pagina {currentPage} de {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={currentPage === 1}
                className="rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 font-medium text-[#111827] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={currentPage === totalPages}
                className="rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 font-medium text-[#111827] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Siguiente
              </button>
            </div>
          </div>
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
    </PageContainer>
  )
}
