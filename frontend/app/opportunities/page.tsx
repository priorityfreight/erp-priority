"use client"

import Link from "next/link"
import { useDeferredValue, useEffect, useState } from "react"
import {
  createOpportunity,
  deleteOpportunity,
  getClients,
  getIncoterms,
  getOpportunities,
  getServiceTransportTypes,
  getUsers,
  type Client,
  type Incoterm,
  type OpportunitySummary,
  type ServiceTransportType,
  type User,
} from "@/lib/db"
import { StatusBadge } from "@/components/data/StatusBadge"
import { Modal } from "@/components/data/Modal"
import { OpportunityForm, type OpportunityFormValues } from "@/components/forms/OpportunityForm"
import { PageContainer } from "@/components/layout/PageContainer"

const statusOptions = [
  "investigando",
  "confirmado",
  "cotizando",
  "aceptado",
  "rechazada",
  "vencida",
]

const emptyForm: OpportunityFormValues = {
  clientId: "",
  salespersonId: "",
  serviceType: "",
  transportType: "",
  operationType: "",
  incotermId: "",
  origin: "",
  originUnlocode: "",
  destination: "",
  destinationUnlocode: "",
  expectedProfitUsd: "",
  serviceQuantity: "",
  description: "",
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<OpportunitySummary[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [serviceTransportTypes, setServiceTransportTypes] = useState<ServiceTransportType[]>([])
  const [incoterms, setIncoterms] = useState<Incoterm[]>([])
  const [formValues, setFormValues] = useState<OpportunityFormValues>(emptyForm)
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [statusFilter, setStatusFilter] = useState("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function loadReferenceData() {
    try {
      const [clientsData, usersData, serviceTransportData, incotermData] = await Promise.all([
        getClients(),
        getUsers(),
        getServiceTransportTypes(),
        getIncoterms(),
      ])
      setClients(clientsData)
      setUsers(usersData)
      setServiceTransportTypes(serviceTransportData)
      setIncoterms(incotermData)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    void loadReferenceData()
  }, [])

  async function loadOpportunityList(query = "", status = "all") {
    try {
      setLoading(true)
      const opportunitiesData = await getOpportunities({
        query,
        status,
      })
      setOpportunities(opportunitiesData)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOpportunityList(deferredSearch, statusFilter)
  }, [deferredSearch, statusFilter])

  useEffect(() => {
    const fromClientId = new URLSearchParams(window.location.search).get("clientId")

    if (fromClientId) {
      setFormValues((current) => ({
        ...current,
        clientId: current.clientId || fromClientId,
      }))
      setShowCreateModal(true)
    }
  }, [])

  async function handleCreateOpportunity() {
    if (!formValues.clientId) {
      alert("Selecciona un cliente")
      return
    }

    if (!formValues.serviceType) {
      alert("Selecciona un tipo de servicio")
      return
    }

    if (!formValues.transportType) {
      alert("Selecciona un tipo de transporte")
      return
    }

    if (!formValues.operationType) {
      alert("Selecciona el tipo de operacion")
      return
    }

    if (!formValues.incotermId) {
      alert("Selecciona el incoterm")
      return
    }

    if (!formValues.originUnlocode || !formValues.destinationUnlocode) {
      alert("Selecciona origen y destino desde UN/LOCODE")
      return
    }

    try {
      setCreating(true)
      await createOpportunity({
        clientId: formValues.clientId,
        salespersonId: formValues.salespersonId || null,
        serviceType: formValues.serviceType,
        transportType: formValues.transportType,
        operationType: formValues.operationType,
        incotermId: formValues.incotermId,
        originUnlocode: formValues.originUnlocode,
        destinationUnlocode: formValues.destinationUnlocode,
        expectedProfitUsd: formValues.expectedProfitUsd
          ? Number(formValues.expectedProfitUsd)
          : null,
        serviceQuantity: formValues.serviceQuantity ? Number(formValues.serviceQuantity) : null,
        description: formValues.description.trim() || null,
      })

      setFormValues(emptyForm)
      setShowCreateModal(false)
      await loadOpportunityList(search, statusFilter)
    } catch (error) {
      console.error(error)
      alert("Error creating opportunity")
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteOpportunity(id: string) {
    const confirmed = window.confirm("Delete this opportunity?")

    if (!confirmed) {
      return
    }

    try {
      setDeletingId(id)
      await deleteOpportunity(id)
      await loadOpportunityList(search, statusFilter)
    } catch (error) {
      console.error(error)
      alert("Error deleting opportunity")
    } finally {
      setDeletingId(null)
    }
  }

  const filteredOpportunities = opportunities

  const totalPipeline = filteredOpportunities.reduce(
    (sum, opportunity) => sum + (opportunity.estimated_value ?? 0),
    0
  )

  return (
    <PageContainer
      title="Opportunities"
      description="Seguimiento comercial de oportunidades con servicio, transporte, lane y vencimiento."
      actions={
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8]"
        >
          Anadir oportunidad
        </button>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Oportunidades
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {filteredOpportunities.length}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Pipeline estimado
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              ${totalPipeline.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Investigando
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {filteredOpportunities.filter((item) => item.status === "investigando").length}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Cotizando
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {filteredOpportunities.filter((item) => item.status === "cotizando").length}
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">Lista de oportunidades</h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                Vista comercial con cliente, servicio, lane, owner y fechas clave.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                placeholder="Buscar oportunidad"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                className="rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">Todos los estatus</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-[#6B7280]">Cargando oportunidades...</p>
          ) : filteredOpportunities.length === 0 ? (
            <p className="text-sm text-[#6B7280]">
              {!deferredSearch.trim() && statusFilter === "all"
                ? "No opportunities yet. Create the first one from the popup."
                : "No opportunities match the current filters."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
              <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  <tr>
                    <th className="px-4 py-3">Oportunidad</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Servicio</th>
                    <th className="px-4 py-3">Lane</th>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">Estatus</th>
                    <th className="px-4 py-3">Estimated value</th>
                    <th className="px-4 py-3">Vencimiento</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] bg-white">
                  {filteredOpportunities.map((opportunity) => (
                    <tr key={opportunity.id}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/opportunities/${opportunity.id}`}
                          className="font-medium text-[#111827] hover:text-[#1D4ED8]"
                        >
                          {opportunity.title || "Oportunidad"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {opportunity.client_name || "No client"}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {[opportunity.service_type, opportunity.transport_type]
                          .filter(Boolean)
                          .join(" / ") || "No definido"}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {opportunity.origin && opportunity.destination
                          ? `${opportunity.origin} -> ${opportunity.destination}`
                          : "No definido"}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {opportunity.salesperson_name || "No asignado"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={opportunity.status} />
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {opportunity.estimated_value != null
                          ? `$${opportunity.estimated_value.toLocaleString()}`
                          : "No value"}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {opportunity.expiration_date || "No definida"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/opportunities/${opportunity.id}`}
                            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 font-medium text-[#111827] hover:bg-[#F8FAFC]"
                          >
                            Ver
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteOpportunity(opportunity.id)}
                            disabled={deletingId === opportunity.id}
                            className="rounded-md border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-1.5 font-medium text-[#B91C1C] hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingId === opportunity.id ? "Deleting..." : "Delete"}
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

      {showCreateModal ? (
        <Modal
          title="Anadir oportunidad"
          description="Crea una oportunidad comercial usando cliente, servicio, transporte y lane estandarizado."
          onClose={() => {
            setShowCreateModal(false)
            setFormValues(emptyForm)
          }}
        >
          <OpportunityForm
            title="Nueva oportunidad"
            description="La informacion principal se captura en secciones limpias y el valor estimado se calcula automaticamente."
            values={formValues}
            clients={clients}
            users={users}
            serviceTransportTypes={serviceTransportTypes}
            incoterms={incoterms}
            onChange={(field, value) => {
              setFormValues((current) => {
                if (field === "clientId") {
                  const client = clients.find((item) => item.id === value)
                  return {
                    ...current,
                    clientId: value,
                    salespersonId: current.salespersonId || client?.account_owner_id || "",
                  }
                }

                return {
                  ...current,
                  [field]: value,
                }
              })
            }}
            onSubmit={handleCreateOpportunity}
            submitLabel="Guardar oportunidad"
            loading={creating}
          />
        </Modal>
      ) : null}
    </PageContainer>
  )
}
