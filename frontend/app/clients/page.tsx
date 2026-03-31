"use client"

import { type ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import {
  createClient,
  deleteClient,
  getBackendMode,
  getClientSummaries,
  getUsers,
  type BackendMode,
  type ClientSummary,
  type User,
} from "@/lib/db"
import { getErrorMessage, notifyError, notifyWarning } from "@/lib/feedback"
import { PageContainer } from "@/components/layout/PageContainer"
import { Modal } from "@/components/data/Modal"
import { StatusBadge } from "@/components/data/StatusBadge"
import { ClientForm } from "@/components/forms/ClientForm"
import { PriorityDataTable } from "@/components/priority/PriorityDataTable"
import { PriorityInput, PrioritySelectField } from "@/components/priority/PriorityForm"
import { usePriorityConfirm } from "@/components/priority/usePriorityConfirm"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [backendMode, setBackendMode] = useState<BackendMode>("canonical")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [companyName, setCompanyName] = useState("")
  const [taxId, setTaxId] = useState("")
  const [status, setStatus] = useState("prospecto")
  const [accountOwnerId, setAccountOwnerId] = useState("")
  const [industry, setIndustry] = useState("")
  const [country, setCountry] = useState("")
  const [website, setWebsite] = useState("")
  const [corporatePhone, setCorporatePhone] = useState("")
  const [fullAddress, setFullAddress] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [city, setCity] = useState("")
  const [cityUnlocode, setCityUnlocode] = useState("")
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [sortBy, setSortBy] = useState("name")
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { confirm, confirmDialog } = usePriorityConfirm()

  async function loadClients(query: string) {
    try {
      setLoading(true)
      const data = await getClientSummaries(query)
      setClients(data)
    } catch (error) {
      console.error(error)
      notifyError("No se pudieron cargar los clientes", getErrorMessage(error, "Intenta nuevamente."))
    } finally {
      setLoading(false)
    }
  }

  function resetCreateForm() {
    setCompanyName("")
    setTaxId("")
    setStatus("prospecto")
    setAccountOwnerId("")
    setIndustry("")
    setCountry("")
    setWebsite("")
    setCorporatePhone("")
    setFullAddress("")
    setPostalCode("")
    setCity("")
    setCityUnlocode("")
  }

  async function handleCreateClient() {
    if (!companyName.trim()) {
      notifyWarning("Client name required")
      return
    }

    if (!website.trim()) {
      notifyWarning("Website required")
      return
    }

    if (!corporatePhone.trim()) {
      notifyWarning("Corporate phone required")
      return
    }

    try {
      setCreating(true)
      await createClient({
        company_name: companyName.trim(),
        account_owner_id: accountOwnerId || null,
        tax_id: taxId.trim() || null,
        status,
        industry: industry.trim() || null,
        country: country.trim() || null,
        website: website.trim(),
        corporate_phone: corporatePhone.trim(),
        full_address: fullAddress.trim() || null,
        postal_code: postalCode.trim() || null,
        city: city.trim() || null,
        city_unlocode: cityUnlocode.trim() || null,
      })

      resetCreateForm()
      setShowCreateModal(false)
      await loadClients(search)
    } catch (error) {
      console.error(error)
      notifyError("Error creating client", getErrorMessage(error, "The client could not be saved."))
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteClient = useCallback(async (id: string, name: string) => {
    const confirmed = await confirm({
      title: "Eliminar cliente",
      description: `Se eliminara ${name} y tambien los contactos y oportunidades vinculados por el workflow canonico.`,
      actionLabel: "Eliminar cliente",
      variant: "destructive",
    })

    if (!confirmed) {
      return
    }

    try {
      setDeletingId(id)
      await deleteClient(id)
      await loadClients(search)
    } catch (error) {
      console.error(error)
      notifyError("Error deleting client", getErrorMessage(error, "The client could not be deleted."))
    } finally {
      setDeletingId(null)
    }
  }, [confirm, search])

  useEffect(() => {
    let cancelled = false

    Promise.all([getBackendMode(), getUsers()])
      .then(([mode, userData]) => {
        if (!cancelled) {
          setBackendMode(mode)
          setUsers(userData)
        }
      })
      .catch((error) => {
        console.error(error)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    void loadClients(deferredSearch)
  }, [deferredSearch])

  const sortedClients = useMemo(() => {
    return [...clients].sort((left, right) => {
      if (sortBy === "country") {
        return (left.country || "").localeCompare(right.country || "")
      }

      if (sortBy === "city") {
        return (left.city || "").localeCompare(right.city || "")
      }

      if (sortBy === "opportunities") {
        return (right.total_opportunities ?? 0) - (left.total_opportunities ?? 0)
      }

      if (sortBy === "pipeline") {
        return (right.pipeline_value ?? 0) - (left.pipeline_value ?? 0)
      }

      return (left.client_name || "").localeCompare(right.client_name || "")
    })
  }, [clients, sortBy])

  const totalPipelineValue = sortedClients.reduce(
    (sum, client) => sum + (client.pipeline_value ?? 0),
    0
  )
  const representedCountries = new Set(
    sortedClients.map((client) => client.country).filter(Boolean)
  ).size
  const representedCities = new Set(sortedClients.map((client) => client.city).filter(Boolean)).size
  const totalOpportunities = sortedClients.reduce(
    (sum, client) => sum + (client.total_opportunities ?? 0),
    0
  )

  const clientColumns = useMemo<ColumnDef<ClientSummary>[]>(
    () => [
      {
        accessorKey: "client_name",
        header: "Cliente",
        cell: ({ row }) => (
          <div className="space-y-1">
            <Link
              href={`/clients/${row.original.id}`}
              className="font-medium text-[var(--brand-navy)] hover:text-[var(--brand-burgundy)]"
            >
              {row.original.client_name || "Unnamed client"}
            </Link>
            <div className="text-xs text-[#5B6A7D]">{row.original.account_owner_name || "Sin owner"}</div>
          </div>
        ),
      },
      {
        id: "status",
        header: "Estatus",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "location",
        header: "Ubicacion",
        cell: ({ row }) =>
          [row.original.city, row.original.country].filter(Boolean).join(" · ") || "No definida",
      },
      {
        accessorKey: "account_owner_name",
        header: "Owner",
        cell: ({ row }) => row.original.account_owner_name || "Sin owner",
      },
      {
        accessorKey: "total_opportunities",
        header: "Oportunidades",
        cell: ({ row }) => row.original.total_opportunities ?? 0,
      },
      {
        accessorKey: "pipeline_value",
        header: "Pipeline",
        cell: ({ row }) => `$${(row.original.pipeline_value ?? 0).toLocaleString()}`,
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button asChild type="button" variant="outline" size="sm">
              <Link href={`/clients/${row.original.id}`}>Ver</Link>
            </Button>
            <Button asChild type="button" variant="outline" size="sm">
              <Link href={`/opportunities?clientId=${row.original.id}`}>Nueva oportunidad</Link>
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => void handleDeleteClient(row.original.id, row.original.client_name || "este cliente")}
              disabled={deletingId === row.original.id}
            >
              {deletingId === row.original.id ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        ),
      },
    ],
    [deletingId, handleDeleteClient]
  )

  return (
    <PageContainer
      title="Clients"
      description="Manage customer companies and account information."
      actions={
        <div className="flex items-center gap-3">
          <div className="text-xs text-[#6B7280]">
            Backend mode: <span className="font-semibold text-[#111827]">{backendMode}</span>
          </div>
          <Button type="button" size="lg" onClick={() => setShowCreateModal(true)}>
            Anadir cliente
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#1D4ED8]">
              Total Clients
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">{clients.length}</div>
          </div>
          <div className="rounded-xl border border-[#D1FAE5] bg-[#ECFDF5] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#047857]">
              Open Opportunities
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">{totalOpportunities}</div>
          </div>
          <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#B45309]">
              Pipeline Value
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              ${totalPipelineValue.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#475569]">
              Cities
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">{representedCities}</div>
            <div className="mt-1 text-xs text-[#6B7280]">{representedCountries} countries</div>
          </div>
        </section>

        <section className="space-y-4 rounded-[28px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.95)] p-5 shadow-[0_28px_60px_-46px_rgba(3,10,24,0.45)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--brand-navy)]">Client registry</h2>
              <p className="mt-1 text-sm text-[#5B6A7D]">
                Central CRM view with search, sort presets, pipeline value and direct drill-down.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row">
              <PriorityInput
                placeholder="Search by company"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <PrioritySelectField
                value={sortBy}
                onValueChange={setSortBy}
                placeholder="Ordena la lista"
                options={[
                  { value: "name", label: "Sort: Name" },
                  { value: "city", label: "Sort: City" },
                  { value: "country", label: "Sort: Country" },
                  { value: "opportunities", label: "Sort: Opportunities" },
                  { value: "pipeline", label: "Sort: Pipeline Value" },
                ]}
              />
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 rounded-[20px]" />
              <Skeleton className="h-12 rounded-[20px]" />
              <Skeleton className="h-12 rounded-[20px]" />
            </div>
          ) : (
            <PriorityDataTable
              columns={clientColumns}
              data={sortedClients}
              emptyTitle={clients.length === 0 ? "Sin clientes registrados" : "Sin resultados"}
              emptyDescription={
                clients.length === 0
                  ? "Todavia no hay clientes. Crea el primero para arrancar el CRM."
                  : "No encontramos clientes con los filtros actuales."
              }
            />
          )}
        </section>
      </div>

      {showCreateModal ? (
        <Modal
          title="Anadir cliente"
          description="Nombre, pagina web y telefono corporativo son obligatorios."
          onClose={() => {
            setShowCreateModal(false)
            resetCreateForm()
          }}
        >
          <ClientForm
            title="Nuevo cliente"
            description="Completa el perfil basico y agrega los datos operativos cuando los tengas."
            values={{
              companyName,
              taxId,
              status,
              accountOwnerId,
              industry,
              country,
              website,
              corporatePhone,
              fullAddress,
              postalCode,
              city,
              cityUnlocode,
            }}
            users={users}
            onChange={(field, value) => {
              if (field === "companyName") setCompanyName(value)
              if (field === "taxId") setTaxId(value)
              if (field === "status") setStatus(value)
              if (field === "accountOwnerId") setAccountOwnerId(value)
              if (field === "industry") setIndustry(value)
              if (field === "country") setCountry(value)
              if (field === "website") setWebsite(value)
              if (field === "corporatePhone") setCorporatePhone(value)
              if (field === "fullAddress") setFullAddress(value)
              if (field === "postalCode") setPostalCode(value)
              if (field === "city") setCity(value)
              if (field === "cityUnlocode") setCityUnlocode(value)
            }}
            onSubmit={handleCreateClient}
            submitLabel="Guardar cliente"
            loading={creating}
            submitNote="The full client profile is stored in the canonical backend."
          />
        </Modal>
      ) : null}

      {confirmDialog}
    </PageContainer>
  )
}
