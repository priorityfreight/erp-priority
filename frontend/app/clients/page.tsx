"use client"

import Link from "next/link"
import { useDeferredValue, useEffect, useState } from "react"
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
import { PageContainer } from "@/components/layout/PageContainer"
import { Modal } from "@/components/data/Modal"
import { StatusBadge } from "@/components/data/StatusBadge"
import { ClientForm } from "@/components/forms/ClientForm"

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [backendMode, setBackendMode] = useState<BackendMode>("legacy")
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
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function loadClients(query: string) {
    try {
      const data = await getClientSummaries(query)
      setClients(data)
    } catch (err) {
      console.error(err)
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
      alert("Client name required")
      return
    }

    if (!website.trim()) {
      alert("Website required")
      return
    }

    if (!corporatePhone.trim()) {
      alert("Corporate phone required")
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
    } catch (err) {
      console.error(err)
      alert("Error creating client")
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteClient(id: string) {
    const confirmed = window.confirm(
      "Delete this client? In the current dev backend this also removes linked contacts and opportunities."
    )

    if (!confirmed) {
      return
    }

    try {
      setDeletingId(id)
      await deleteClient(id)
      await loadClients(search)
    } catch (error) {
      console.error(error)
      alert("Error deleting client")
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    let cancelled = false

    Promise.all([getBackendMode(), getUsers()])
      .then(([mode, userData]) => {
        if (!cancelled) {
          setBackendMode(mode)
          setUsers(userData)
        }
      })
      .catch((err) => {
        console.error(err)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    getClientSummaries(deferredSearch)
      .then((data) => {
        if (!cancelled) {
          setClients(data)
        }
      })
      .catch((err) => {
        console.error(err)
      })

    return () => {
      cancelled = true
    }
  }, [deferredSearch])

  useEffect(() => {
    setPage(1)
  }, [search, sortBy])

  const sortedClients = [...clients].sort((left, right) => {
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

  const pageSize = 8
  const totalPages = Math.max(1, Math.ceil(sortedClients.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedClients = sortedClients.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

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

  return (
    <PageContainer
      title="Clients"
      description="Manage customer companies and account information."
      actions={
        <div className="flex items-center gap-3">
          <div className="text-xs text-[#6B7280]">
            Backend mode: <span className="font-semibold text-[#111827]">{backendMode}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8]"
          >
            Anadir cliente
          </button>
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
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {totalOpportunities}
            </div>
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

        {backendMode !== "canonical" ? (
          <section className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
            The current cloud backend is still on the legacy client schema. Core client records are
            saved in Supabase, and the extended client profile fields are stored locally in this browser
            until the backend migration is applied.
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-lg font-semibold text-[#111827]">Client List</h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                placeholder="Search by company"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                className="rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="name">Sort: Name</option>
                <option value="city">Sort: City</option>
                <option value="country">Sort: Country</option>
                <option value="opportunities">Sort: Opportunities</option>
                <option value="pipeline">Sort: Pipeline Value</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-[#6B7280]">
            <span>{sortedClients.length} visible clients</span>
            <span>Page {currentPage} of {totalPages}</span>
          </div>

          {paginatedClients.length === 0 ? (
            <p className="text-sm text-[#6B7280]">
              {clients.length === 0
                ? "No clients yet. Add the first one with the button above."
                : "No clients match the current search."}
            </p>
          ) : (
            <div className="space-y-3">
              {paginatedClients.map((client) => (
                <div
                  key={client.id}
                  className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/clients/${client.id}`}
                          className="text-base font-semibold text-[#111827] hover:text-[#2563EB]"
                        >
                          {client.client_name || "Unnamed client"}
                        </Link>
                        <StatusBadge status={client.status} />
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-[#6B7280]">
                        <span>{client.city || "No city"}</span>
                        <span>{client.country || "No country"}</span>
                        <span>{client.account_owner_name || "Sin owner"}</span>
                        <span>{client.total_opportunities ?? 0} opportunities</span>
                        <span>${(client.pipeline_value ?? 0).toLocaleString()} pipeline</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/clients/${client.id}`}
                        className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm font-medium text-[#111827] hover:bg-[#F9FAFB]"
                      >
                        View
                      </Link>
                      <Link
                        href={`/opportunities?clientId=${client.id}`}
                        className="rounded-md border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-sm font-medium text-[#1D4ED8] hover:bg-[#DBEAFE]"
                      >
                        New Opportunity
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteClient(client.id)}
                        disabled={deletingId === client.id}
                        className="rounded-md border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 text-sm font-medium text-[#B91C1C] hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === client.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {sortedClients.length > pageSize ? (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={currentPage === 1}
                className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm font-medium text-[#111827] hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={currentPage === totalPages}
                className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm font-medium text-[#111827] hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Next
              </button>
            </div>
          ) : null}
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
            submitNote={
              backendMode === "canonical"
                ? "The full client profile is stored in the canonical backend."
                : "In legacy mode, the extended client profile is preserved locally in this browser."
            }
          />
        </Modal>
      ) : null}
    </PageContainer>
  )
}
