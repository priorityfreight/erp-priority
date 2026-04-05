"use client"

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  createQuotation,
  deleteOpportunity,
  getClients,
  getIncoterms,
  getOpportunityById,
  getServiceTransportTypes,
  getUsers,
  type Client,
  type Incoterm,
  type OpportunityWithClient,
  type ServiceTransportType,
  type User,
  updateOpportunity,
  updateOpportunityStatus,
} from "@/lib/db"
import { getErrorMessage, notifyError, notifyWarning } from "@/lib/feedback"
import { StatusBadge } from "@/components/data/StatusBadge"
import { Modal } from "@/components/data/Modal"
import { OpportunityForm, type OpportunityFormValues } from "@/components/forms/OpportunityForm"
import { QuotationForm, type QuotationFormValues } from "@/components/forms/QuotationForm"
import { PageContainer } from "@/components/layout/PageContainer"
import { PrioritySectionAlert } from "@/components/priority/PrioritySectionAlert"
import { PriorityTypography } from "@/components/priority/PriorityTypography"
import { PriorityMetricCard, PriorityMetricStrip, PrioritySummaryRail } from "@/components/priority/PriorityWorkspace"
import { usePriorityConfirm } from "@/components/priority/usePriorityConfirm"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"

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
  incoterms: Incoterm[]
}

function InfoCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="workspace-panel space-y-4 rounded-[24px] p-5">
      <PriorityTypography variant="eyebrow">{title}</PriorityTypography>
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
      <PriorityTypography variant="fieldLabel">{label}</PriorityTypography>
      <PriorityTypography variant="body" className="mt-1 font-medium">
        {value || "No disponible"}
      </PriorityTypography>
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

function getQuotationReadinessIssues(opportunity: OpportunityWithClient) {
  const issues: string[] = []

  if (!opportunity.client_id) {
    issues.push("cliente")
  }

  if (!opportunity.service_type) {
    issues.push("tipo de servicio")
  }

  if (!opportunity.transport_type) {
    issues.push("tipo de transporte")
  }

  if (!opportunity.operation_type) {
    issues.push("tipo de operacion")
  }

  if (!opportunity.incoterm_id) {
    issues.push("incoterm")
  }

  if (!opportunity.origin_unlocode) {
    issues.push("origen UN/LOCODE")
  }

  if (!opportunity.destination_unlocode) {
    issues.push("destino UN/LOCODE")
  }

  return issues
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
  const [showQuoteModal, setShowQuoteModal] = useState(false)
  const [creatingQuote, setCreatingQuote] = useState(false)
  const [formValues, setFormValues] = useState<OpportunityFormValues>({
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
  })
  const [quoteFormValues, setQuoteFormValues] = useState<QuotationFormValues>({
    pickupAddress: "",
    deliveryAddress: "",
    requiredQuoteDate: "",
  })
  const [status, setStatus] = useState("investigando")
  const { confirm, confirmDialog } = usePriorityConfirm()

  function syncForm(opportunity: OpportunityWithClient) {
    setFormValues({
      clientId: opportunity.client_id || "",
      salespersonId: opportunity.salesperson_id || "",
      serviceType: opportunity.service_type || "",
      transportType: opportunity.transport_type || "",
      operationType: opportunity.operation_type || "",
      incotermId: opportunity.incoterm_id || "",
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
        const [opportunity, clients, users, serviceTransportTypes, incoterms] = await Promise.all([
          getOpportunityById(id),
          getClients(),
          getUsers(),
          getServiceTransportTypes(),
          getIncoterms(),
        ])

        if (cancelled || !opportunity) {
          return
        }

        setDetails({
          opportunity,
          clients,
          users,
          serviceTransportTypes,
          incoterms,
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
      notifyWarning("Selecciona un cliente")
      return
    }

    if (!formValues.serviceType || !formValues.transportType) {
      notifyWarning("Selecciona servicio y transporte")
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
      setSaving(true)
      await updateOpportunity(details.opportunity.id, {
        client_id: formValues.clientId,
        salesperson_id: formValues.salespersonId || null,
        service_type: formValues.serviceType || null,
        transport_type: formValues.transportType || null,
        operation_type: formValues.operationType || null,
        incoterm_id: formValues.incotermId || null,
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
      notifyError("Error saving opportunity", getErrorMessage(error, "The opportunity could not be saved."))
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
      notifyError("Error updating opportunity status", getErrorMessage(error, "Status could not be updated."))
    } finally {
      setSavingStatus(false)
    }
  }

  async function handleDelete() {
    if (!details) {
      return
    }

    const confirmed = await confirm({
      title: "Eliminar oportunidad",
      description: "La oportunidad se eliminara y ya no podra convertirse en cotizacion.",
      actionLabel: "Eliminar oportunidad",
      variant: "destructive",
    })
    if (!confirmed) {
      return
    }

    try {
      setDeleting(true)
      await deleteOpportunity(details.opportunity.id)
      router.push("/opportunities")
    } catch (error) {
      console.error(error)
      notifyError("Error deleting opportunity", getErrorMessage(error, "The opportunity could not be deleted."))
      setDeleting(false)
    }
  }

  async function handleCreateQuotation() {
    if (!details) {
      return
    }

    const readinessIssues = getQuotationReadinessIssues(details.opportunity)
    if (readinessIssues.length > 0) {
      notifyWarning(
        `La oportunidad debe completar estos campos antes de cotizar: ${readinessIssues.join(", ")}`
      )
      return
    }

    try {
      setCreatingQuote(true)
      const quotationId = await createQuotation({
        opportunity_id: details.opportunity.id,
        pickup_address: quoteFormValues.pickupAddress.trim() || null,
        delivery_address: quoteFormValues.deliveryAddress.trim() || null,
        required_quote_date: quoteFormValues.requiredQuoteDate || null,
      })

      setShowQuoteModal(false)
      setQuoteFormValues({
        pickupAddress: "",
        deliveryAddress: "",
        requiredQuoteDate: "",
      })
      router.push(`/quotations/${quotationId}`)
    } catch (error) {
      console.error(error)
      notifyError("No se pudo crear la cotizacion", getErrorMessage(error, "Intenta nuevamente."))
    } finally {
      setCreatingQuote(false)
    }
  }

  if (!opportunityId) {
    return (
      <PageContainer title="Oportunidad" description="ID de oportunidad inválido.">
        <p className="text-sm text-[#6B7280]">Falta el identificador de la oportunidad en la URL.</p>
      </PageContainer>
    )
  }

  if (loading && !details) {
    return (
      <PageContainer title="Oportunidad" description="Cargando información de la oportunidad…">
        <p className="text-sm text-[#6B7280]">Cargando información de la oportunidad.</p>
      </PageContainer>
    )
  }

  if (!details) {
    return (
      <PageContainer title="Oportunidad" description="Oportunidad no encontrada.">
        <p className="text-sm text-[#6B7280]">No encontramos una oportunidad con ese identificador.</p>
      </PageContainer>
    )
  }

  const { opportunity, clients, users, serviceTransportTypes, incoterms } = details
  const quotationReadinessIssues = getQuotationReadinessIssues(opportunity)
  const canCreateQuotation = quotationReadinessIssues.length === 0
  const estimatedValue =
    opportunity.expected_profit_usd != null && opportunity.service_quantity != null
      ? opportunity.expected_profit_usd * opportunity.service_quantity
      : opportunity.estimated_value

  return (
    <PageContainer
      title={opportunity.title || "Oportunidad"}
      description={`Seguimiento comercial para ${opportunity.clients?.company_name || "cliente"}.`}
      meta={
        <div className="flex flex-wrap items-center gap-3 rounded-[20px] border border-white/10 bg-white/8 px-3 py-2 text-sm text-[var(--brand-light-gray)]">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-gray)]">Estatus</span>
          <select
            value={status}
            onChange={(event) => {
              void handleUpdateStatus(event.target.value)
            }}
            disabled={savingStatus}
            className="rounded-xl border border-white/10 bg-[rgba(255,255,255,0.08)] px-3 py-2 text-sm font-medium text-white outline-none focus:border-[rgba(179,58,91,0.45)]"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value} className="text-[#111827]">
                {option.label}
              </option>
            ))}
          </select>
          <StatusBadge status={status} />
          <span className="text-xs text-[var(--brand-soft-gray)]">
            {savingStatus ? "Guardando estatus…" : "Seguimiento principal de la oportunidad"}
          </span>
        </div>
      }
      actions={
        <ButtonGroup className="flex flex-wrap items-center gap-3 bg-transparent p-0">
          <Button asChild variant="outline" size="lg">
            <Link href="/opportunities">Volver</Link>
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => setShowEditModal(true)}>
            Editar información
          </Button>
          <Button type="button" size="lg" onClick={() => setShowQuoteModal(true)} disabled={!canCreateQuotation}>
            Cotizar
          </Button>
          <Button type="button" variant="destructive" size="lg" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Eliminando…" : "Eliminar oportunidad"}
          </Button>
        </ButtonGroup>
      }
    >
      <div className="space-y-8">
        {!canCreateQuotation ? (
          <PrioritySectionAlert title="Aún no está lista para cotizar" variant="warning">
            Completa antes de cotizar: {quotationReadinessIssues.join(", ")}.
          </PrioritySectionAlert>
        ) : null}

        <PrioritySummaryRail className="xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <div>
            <PriorityTypography variant="eyebrow">Workspace comercial</PriorityTypography>
            <PriorityTypography as="h2" variant="sectionTitle" className="mt-2">
              Perfil comercial, lane y readiness de cotización en un solo lugar.
            </PriorityTypography>
            <PriorityTypography variant="bodyMuted" className="mt-2">
              Diseñado para que ventas entienda rápido qué falta, qué sí está listo y cuándo conviene convertir esta oportunidad en cotización.
            </PriorityTypography>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#5B6A7D]">
              <StatusBadge status={status} />
              <span>{opportunity.salesperson_name || "Sin ejecutivo asignado"}</span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[20px] border border-[rgba(11,31,59,0.08)] bg-[rgba(11,31,59,0.03)] p-4">
              <PriorityTypography variant="eyebrow">Readiness</PriorityTypography>
              <PriorityTypography variant="body" className="mt-2 font-medium">
                {canCreateQuotation
                  ? "Lista para convertirse en cotización cuando el equipo comercial lo decida."
                  : `Faltan ${quotationReadinessIssues.length} dato(s) clave para cotizar.`}
              </PriorityTypography>
            </div>
          </div>
        </PrioritySummaryRail>

        <PriorityMetricStrip>
          <PriorityMetricCard label="Cliente" value={opportunity.clients?.company_name || "No asignado"} helper="Cuenta vinculada a esta oportunidad." tone="info" />
          <PriorityMetricCard label="Servicio" value={opportunity.service_type || "No definido"} helper={opportunity.operation_type || "Tipo de operación pendiente"} tone="default" />
          <PriorityMetricCard label="Transporte" value={opportunity.transport_type || "No definido"} helper={opportunity.incoterm_code || "Incoterm pendiente"} tone="warning" />
          <PriorityMetricCard label="Valor estimado" value={formatCurrency(estimatedValue)} helper="Profit esperado por volumen aproximado." tone="spotlight" />
        </PriorityMetricStrip>

        <InfoCard title="Información de la oportunidad">
          <InfoField label="Cliente" value={opportunity.clients?.company_name} />
          <InfoField label="Usuario" value={opportunity.salesperson_name} />
          <InfoField label="Tipo de servicio" value={opportunity.service_type} />
          <InfoField label="Tipo de transporte" value={opportunity.transport_type} />
          <InfoField label="Tipo de operacion" value={opportunity.operation_type} />
          <InfoField label="Incoterm" value={opportunity.incoterm_code} />
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
          <InfoField label="Valor estimado" value={formatCurrency(estimatedValue)} />
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
            incoterms={incoterms}
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

      {showQuoteModal ? (
        <Modal
          title="Crear cotizacion"
          description="La cotizacion nace desde esta oportunidad y arrastra su informacion comercial principal."
          onClose={() => {
            setShowQuoteModal(false)
              setQuoteFormValues({
                pickupAddress: "",
                deliveryAddress: "",
                requiredQuoteDate: "",
              })
          }}
        >
          {!canCreateQuotation ? (
            <PrioritySectionAlert title="Aún no está lista para cotizar" variant="warning">
              Completa estos campos en la oportunidad antes de crear una cotizacion:{" "}
              {quotationReadinessIssues.join(", ")}.
            </PrioritySectionAlert>
          ) : (
            <QuotationForm
              title="Nueva cotizacion"
              description="Completa detalles de carga y fechas; la ficha base se toma desde la oportunidad."
              values={quoteFormValues}
              clientName={opportunity.clients?.company_name || null}
              origin={opportunity.origin}
              destination={opportunity.destination}
              serviceType={opportunity.service_type}
              transportType={opportunity.transport_type}
              operationType={opportunity.operation_type}
              incotermCode={opportunity.incoterm_code || null}
              createdAt={new Date().toISOString()}
              onChange={(field, value) => {
                setQuoteFormValues((current) => ({
                  ...current,
                  [field]: value,
                }))
              }}
              onSubmit={handleCreateQuotation}
              submitLabel="Crear cotizacion"
              loading={creatingQuote}
            />
          )}
        </Modal>
      ) : null}

      {confirmDialog}
    </PageContainer>
  )
}
