"use client"

import { type ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
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
import { getErrorMessage, notifyError, notifyWarning } from "@/lib/feedback"
import { StatusBadge } from "@/components/data/StatusBadge"
import { Modal } from "@/components/data/Modal"
import { OpportunityForm, type OpportunityFormValues } from "@/components/forms/OpportunityForm"
import { PageContainer } from "@/components/layout/PageContainer"
import { PriorityDataTable } from "@/components/priority/PriorityDataTable"
import { PriorityInput, PrioritySelectField } from "@/components/priority/PriorityForm"
import { usePriorityConfirm } from "@/components/priority/usePriorityConfirm"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

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
  const { confirm, confirmDialog } = usePriorityConfirm()

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
      notifyError("No se pudo cargar la referencia comercial", getErrorMessage(error, "Intenta nuevamente."))
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
      notifyError("No se pudieron cargar las oportunidades", getErrorMessage(error, "Intenta nuevamente."))
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
      notifyWarning("Selecciona un cliente")
      return
    }

    if (!formValues.serviceType) {
      notifyWarning("Selecciona un tipo de servicio")
      return
    }

    if (!formValues.transportType) {
      notifyWarning("Selecciona un tipo de transporte")
      return
    }

    if (!formValues.operationType) {
      notifyWarning("Selecciona el tipo de operacion")
      return
    }

    if (!formValues.incotermId) {
      notifyWarning("Selecciona el incoterm")
      return
    }

    if (!formValues.originUnlocode || !formValues.destinationUnlocode) {
      notifyWarning("Selecciona origen y destino desde UN/LOCODE")
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
      notifyError("Error creating opportunity", getErrorMessage(error, "The opportunity could not be saved."))
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteOpportunity = useCallback(async (id: string, title: string) => {
    const confirmed = await confirm({
      title: "Eliminar oportunidad",
      description: `Se eliminara ${title} y se perdera el seguimiento comercial relacionado.`,
      actionLabel: "Eliminar oportunidad",
      variant: "destructive",
    })

    if (!confirmed) {
      return
    }

    try {
      setDeletingId(id)
      await deleteOpportunity(id)
      await loadOpportunityList(search, statusFilter)
    } catch (error) {
      console.error(error)
      notifyError("Error deleting opportunity", getErrorMessage(error, "The opportunity could not be deleted."))
    } finally {
      setDeletingId(null)
    }
  }, [confirm, search, statusFilter])

  const totalPipeline = opportunities.reduce(
    (sum, opportunity) => sum + (opportunity.estimated_value ?? 0),
    0
  )

  const opportunityColumns = useMemo<ColumnDef<OpportunitySummary>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Oportunidad",
        cell: ({ row }) => (
          <Link
            href={`/opportunities/${row.original.id}`}
            className="font-medium text-[var(--brand-navy)] hover:text-[var(--brand-burgundy)]"
          >
            {row.original.title || "Oportunidad"}
          </Link>
        ),
      },
      {
        accessorKey: "client_name",
        header: "Cliente",
        cell: ({ row }) => row.original.client_name || "No client",
      },
      {
        id: "service",
        header: "Servicio",
        cell: ({ row }) =>
          [row.original.service_type, row.original.transport_type].filter(Boolean).join(" / ") ||
          "No definido",
      },
      {
        id: "lane",
        header: "Lane",
        cell: ({ row }) =>
          row.original.origin && row.original.destination
            ? `${row.original.origin} -> ${row.original.destination}`
            : "No definido",
      },
      {
        accessorKey: "salesperson_name",
        header: "Usuario",
        cell: ({ row }) => row.original.salesperson_name || "No asignado",
      },
      {
        accessorKey: "status",
        header: "Estatus",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "estimated_value",
        header: "Estimated value",
        cell: ({ row }) =>
          row.original.estimated_value != null
            ? `$${row.original.estimated_value.toLocaleString()}`
            : "No value",
      },
      {
        accessorKey: "expiration_date",
        header: "Vencimiento",
        cell: ({ row }) => row.original.expiration_date || "No definida",
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button asChild type="button" variant="outline" size="sm">
              <Link href={`/opportunities/${row.original.id}`}>Ver</Link>
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => void handleDeleteOpportunity(row.original.id, row.original.title || "esta oportunidad")}
              disabled={deletingId === row.original.id}
            >
              {deletingId === row.original.id ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        ),
      },
    ],
    [deletingId, handleDeleteOpportunity]
  )

  return (
    <PageContainer
      title="Opportunities"
      description="Seguimiento comercial de oportunidades con servicio, transporte, lane y vencimiento."
      actions={
        <Button type="button" size="lg" onClick={() => setShowCreateModal(true)}>
          Anadir oportunidad
        </Button>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Oportunidades
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">{opportunities.length}</div>
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
              {opportunities.filter((item) => item.status === "investigando").length}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Cotizando
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {opportunities.filter((item) => item.status === "cotizando").length}
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-[28px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.95)] p-5 shadow-[0_28px_60px_-46px_rgba(3,10,24,0.45)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--brand-navy)]">Lista de oportunidades</h2>
              <p className="mt-1 text-sm text-[#5B6A7D]">
                Vista comercial con cliente, servicio, lane, owner y fechas clave.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <PriorityInput
                placeholder="Buscar oportunidad"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <PrioritySelectField
                value={statusFilter}
                onValueChange={setStatusFilter}
                placeholder="Filtra por estatus"
                options={[
                  { value: "all", label: "Todos los estatus" },
                  ...statusOptions.map((status) => ({
                    value: status,
                    label: status,
                  })),
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
              columns={opportunityColumns}
              data={opportunities}
              emptyTitle={!deferredSearch.trim() && statusFilter === "all" ? "Sin oportunidades" : "Sin resultados"}
              emptyDescription={
                !deferredSearch.trim() && statusFilter === "all"
                  ? "Todavia no hay oportunidades. Crea la primera desde este popup."
                  : "No encontramos oportunidades con los filtros actuales."
              }
            />
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

      {confirmDialog}
    </PageContainer>
  )
}
