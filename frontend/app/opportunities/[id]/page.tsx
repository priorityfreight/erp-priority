"use client"

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  deleteOpportunity,
  getClients,
  getOpportunityById,
  getServiceTransportTypes,
  getUsers,
  type Client,
  type OpportunityWithClient,
  type ServiceTransportType,
  type User,
  updateOpportunity,
  updateOpportunityStatus,
} from "@/lib/db"
import { StatusBadge } from "@/components/data/StatusBadge"
import { Modal } from "@/components/data/Modal"
import { OpportunityForm, type OpportunityFormValues } from "@/components/forms/OpportunityForm"
import { PageContainer } from "@/components/layout/PageContainer"

const statusOptions = [
  { value: "investigando", label: "Investigando" },
  { value: "confirmado", label: "Confirmado" },
  { value: "cotizando", label: "Cotizando" },
  { value: "aceptado", label: "Aceptado" },
  { value: "rechazada", label: "Rechazada" },
  { value: "vencida", label: "Vencida" },
]

type OpportunityDetailsState = {
  opportunity: OpportunityWithClient
  clients: Client[]
  users: User[]
  serviceTransportTypes: ServiceTransportType[]
}

function InfoCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#64748B]">
        {title}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  )
}

function InfoField({
  label,
  value,
  wide = false,
}: {
  label: string
  value: string | null | undefined
  wide?: boolean
}) {
  return (
    <div className={wide ? "sm:col-span-2 xl:col-span-3" : ""}>
      <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">{label}</div>
      <div className="mt-1 text-sm font-medium text-[#111827]">{value || "No disponible"}</div>
    </div>
  )
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) {
    return "No disponible"
  }

  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function OpportunityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const opportunityId = typeof params?.id === "string" ? params.id : undefined

  const [details, setDetails] = useState<OpportunityDetailsState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [formValues, setFormValues] = useState<OpportunityFormValues>({
    clientId: "",
    salespersonId: "",
    serviceType: "",
    transportType: "",
    origin: "",
    originUnlocode: "",
    destination: "",
    destinationUnlocode: "",
    expectedProfitUsd: "",
    serviceQuantity: "",
    description: "",
  })
  const [status, setStatus] = useState("investigando")

  function syncForm(opportunity: OpportunityWithClient) {
    setFormValues({
      clientId: opportunity.client_id || "",
      salespersonId: opportunity.salesperson_id || "",
      serviceType: opportunity.service_type || "",
      transportType: opportunity.transport_type || "",
      origin: opportunity.origin || "",
      originUnlocode: opportunity.origin_unlocode || "",
      destination: opportunity.destination || "",
      destinationUnlocode: opportunity.destination_unlocode || "",
      expectedProfitUsd:
        opportunity.expected_profit_usd != null ? String(opportunity.expected_profit_usd) : "",
      serviceQuantity:
        opportunity.service_quantity != null ? String(opportunity.service_quantity) : "",
      description: opportunity.description || "",
    })
    setStatus(opportunity.status || "investigando")
  }

  useEffect(() => {
    if (!opportunityId) {
      return
    }

    let cancelled = false

    async function load(id: string) {
      try {
        setLoading(true)
        const [opportunity, clients, users, serviceTransportTypes] = await Promise.all([
          getOpportunityById(id),
          getClients(),
          getUsers(),
          getServiceTransportTypes(),
        ])

        if (cancelled || !opportunity) {
          return
        }

        setDetails({
          opportunity,
          clients,
          users,
          serviceTransportTypes,
        })
        syncForm(opportunity)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load(opportunityId)

    return () => {
      cancelled = true
    }
  }, [opportunityId])

  async function refreshOpportunity() {
    if (!opportunityId || !details) {
      return
    }

    const opportunity = await getOpportunityById(opportunityId)
    if (!opportunity) {
      return
    }

    setDetails({
      ...details,
      opportunity,
    })
    syncForm(opportunity)
  }

  async function handleSave() {
    if (!details) {
      return
    }

    if (!formValues.clientId) {
      alert("Selecciona un cliente")
      return
    }

    if (!formValues.serviceType || !formValues.transportType) {
      alert("Selecciona servicio y transporte")
      return
    }

    if (!formValues.originUnlocode || !formValues.destinationUnlocode) {
      alert("Selecciona origen y destino desde UN/LOCODE")
      return
    }

    try {
      setSaving(true)
      await updateOpportunity(details.opportunity.id, {
        client_id: formValues.clientId,
        salesperson_id: formValues.salespersonId || null,
        service_type: formValues.serviceType || null,
        transport_type: formValues.transportType || null,
        origin_unlocode: formValues.originUnlocode || null,
        destination_unlocode: formValues.destinationUnlocode || null,
        expected_profit_usd: formValues.expectedProfitUsd
          ? Number(formValues.expectedProfitUsd)
          : null,
        service_quantity: formValues.serviceQuantity ? Number(formValues.serviceQuantity) : null,
        description: formValues.description.trim() || null,
      })
      await refreshOpportunity()
      setShowEditModal(false)
    } catch (error) {
      console.error(error)
      alert("Error saving opportunity")
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdateStatus(nextStatus: string) {
    if (!details || nextStatus === status) {
      return
    }

    const previousStatus = status
    setStatus(nextStatus)

    try {
      setSavingStatus(true)
      await updateOpportunityStatus(details.opportunity.id, nextStatus)
      await refreshOpportunity()
    } catch (error) {
      console.error(error)
      setStatus(previousStatus)
      alert("Error updating opportunity status")
    } finally {
      setSavingStatus(false)
    }
  }

  async function handleDelete() {
    if (!details) {
      return
    }

    const confirmed = window.confirm("Delete this opportunity?")
    if (!confirmed) {
      return
    }

    try {
      setDeleting(true)
      await deleteOpportunity(details.opportunity.id)
      router.push("/opportunities")
    } catch (error) {
      console.error(error)
      alert("Error deleting opportunity")
      setDeleting(false)
    }
  }

  if (!opportunityId) {
    return (
      <PageContainer title="Opportunity" description="Invalid opportunity id.">
        <p className="text-sm text-[#6B7280]">Opportunity id is missing from the URL.</p>
      </PageContainer>
    )
  }

  if (loading && !details) {
    return (
      <PageContainer title="Opportunity" description="Loading opportunity data...">
        <p className="text-sm text-[#6B7280]">Loading opportunity information.</p>
      </PageContainer>
    )
  }

  if (!details) {
    return (
      <PageContainer title="Opportunity" description="Opportunity not found.">
        <p className="text-sm text-[#6B7280]">
          We could not find an opportunity with this id.
        </p>
      </PageContainer>
    )
  }

  const { opportunity, clients, users, serviceTransportTypes } = details
  const estimatedValue =
    opportunity.expected_profit_usd != null && opportunity.service_quantity != null
      ? opportunity.expected_profit_usd * opportunity.service_quantity
      : opportunity.estimated_value

  return (
    <PageContainer
      title={opportunity.title || "Opportunity"}
      description={`Seguimiento comercial para ${opportunity.clients?.company_name || "cliente"}.`}
      actions={
        <>
          <div className="min-w-[220px] rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#1D4ED8]">
              Estatus de la oportunidad
            </div>
            <div className="mt-2 flex items-center gap-3">
              <select
                value={status}
                onChange={(event) => {
                  void handleUpdateStatus(event.target.value)
                }}
                disabled={savingStatus}
                className="w-full rounded-md border border-[#93C5FD] bg-white px-3 py-2 text-sm font-medium text-[#1E3A8A] outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] disabled:cursor-not-allowed disabled:bg-[#DBEAFE]"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <StatusBadge status={status} />
            </div>
            <div className="mt-2 text-[11px] text-[#1D4ED8]">
              {savingStatus ? "Guardando estatus..." : "Seguimiento principal de la oportunidad"}
            </div>
          </div>
          <Link
            href="/opportunities"
            className="rounded-md border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-medium text-[#111827] hover:bg-[#F9FAFB]"
          >
            Back
          </Link>
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="rounded-md border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-medium text-[#111827] hover:bg-[#F9FAFB]"
          >
            Editar informacion
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-2 text-sm font-medium text-[#B91C1C] hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Cliente
            </div>
            <div className="mt-2 text-base font-semibold text-[#111827]">
              {opportunity.clients?.company_name || "No asignado"}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Servicio
            </div>
            <div className="mt-2 text-base font-semibold text-[#111827]">
              {opportunity.service_type || "No definido"}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Transporte
            </div>
            <div className="mt-2 text-base font-semibold text-[#111827]">
              {opportunity.transport_type || "No definido"}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Estimated value
            </div>
            <div className="mt-2 text-base font-semibold text-[#111827]">
              {formatCurrency(estimatedValue)}
            </div>
          </div>
        </section>

        <InfoCard title="Informacion de la oportunidad">
          <InfoField label="Cliente" value={opportunity.clients?.company_name} />
          <InfoField label="Usuario" value={opportunity.salesperson_name} />
          <InfoField label="Tipo de servicio" value={opportunity.service_type} />
          <InfoField label="Tipo de transporte" value={opportunity.transport_type} />
          <InfoField label="Origen" value={opportunity.origin} />
          <InfoField label="UN/LOCODE origen" value={opportunity.origin_unlocode} />
          <InfoField label="Destino" value={opportunity.destination} />
          <InfoField label="UN/LOCODE destino" value={opportunity.destination_unlocode} />
        </InfoCard>

        <InfoCard title="Desglose de oportunidad">
          <InfoField label="Profit esperado (USD)" value={formatCurrency(opportunity.expected_profit_usd)} />
          <InfoField
            label="Cantidad de servicios"
            value={
              opportunity.service_quantity != null
                ? String(opportunity.service_quantity)
                : "No disponible"
            }
          />
          <InfoField label="Estimated value" value={formatCurrency(estimatedValue)} />
          <InfoField label="Notas internas" value={opportunity.description} wide />
        </InfoCard>

        <InfoCard title="Fechas">
          <InfoField label="Fecha creada" value={opportunity.created_at} />
          <InfoField label="Fecha de inicio" value={opportunity.start_date} />
          <InfoField label="Fecha de vencimiento" value={opportunity.expiration_date} />
          <InfoField label="Estatus actual" value={status} />
        </InfoCard>
      </div>

      {showEditModal ? (
        <Modal
          title="Editar oportunidad"
          description="Actualiza cliente, servicio, transporte, lane y desglose comercial."
          onClose={() => {
            setShowEditModal(false)
            syncForm(opportunity)
          }}
        >
          <OpportunityForm
            title="Perfil de la oportunidad"
            description="Edita la informacion principal sin duplicar el resumen visible."
            values={formValues}
            clients={clients}
            users={users}
            serviceTransportTypes={serviceTransportTypes}
            createdAt={opportunity.created_at}
            startDate={opportunity.start_date}
            expirationDate={opportunity.expiration_date}
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
            onSubmit={handleSave}
            submitLabel="Guardar cambios"
            loading={saving}
          />
        </Modal>
      ) : null}
    </PageContainer>
  )
}
