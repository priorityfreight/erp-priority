"use client"

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  createContact,
  createClientLogisticsParty,
  createOpportunity,
  deleteClient,
  deleteContact,
  deleteClientLogisticsParty,
  deleteOpportunity,
  getBackendMode,
  getClientFull,
  getIncoterms,
  getServiceTransportTypes,
  getUsers,
  type BackendMode,
  type Client,
  type Contact,
  type ClientLogisticsParty,
  type Incoterm,
  type Opportunity,
  type ServiceTransportType,
  type User,
  updateClient,
} from "@/lib/db"
import { PageContainer } from "@/components/layout/PageContainer"
import { Modal } from "@/components/data/Modal"
import { StatusBadge } from "@/components/data/StatusBadge"
import { ClientForm } from "@/components/forms/ClientForm"
import {
  ClientLogisticsPartyForm,
  type ClientLogisticsPartyFormValues,
} from "@/components/forms/ClientLogisticsPartyForm"
import { ContactForm } from "@/components/forms/ContactForm"
import { OpportunityForm, type OpportunityFormValues } from "@/components/forms/OpportunityForm"

type ClientDetailsState = {
  client: Client
  contacts: Contact[]
  logistics_parties: ClientLogisticsParty[]
  opportunities: Opportunity[]
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

export default function ClientDetailPage() {
  const statusOptions = [
    { value: "prospecto", label: "Prospecto" },
    { value: "buscando_informacion", label: "Buscando informacion" },
    { value: "cotizando", label: "Cotizando" },
    { value: "aceptacion_verbal", label: "Aceptacion verbal" },
    { value: "cliente", label: "Cliente" },
  ]

  const params = useParams()
  const router = useRouter()
  const clientId = typeof params?.id === "string" ? params.id : undefined

  const [clientDetails, setClientDetails] = useState<ClientDetailsState | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingClient, setSavingClient] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [creatingContact, setCreatingContact] = useState(false)
  const [creatingOpportunity, setCreatingOpportunity] = useState(false)
  const [creatingLogisticsParty, setCreatingLogisticsParty] = useState(false)
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null)
  const [deletingLogisticsPartyId, setDeletingLogisticsPartyId] = useState<string | null>(null)
  const [deletingOpportunityId, setDeletingOpportunityId] = useState<string | null>(null)
  const [deletingClient, setDeletingClient] = useState(false)
  const [backendMode, setBackendMode] = useState<BackendMode>("legacy")
  const [showEditModal, setShowEditModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showOpportunityModal, setShowOpportunityModal] = useState(false)
  const [showLogisticsPartyModal, setShowLogisticsPartyModal] = useState(false)
  const [activeTab, setActiveTab] = useState<"contacts" | "logistics" | "opportunities">(
    "contacts"
  )
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
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [contactLinkedinUrl, setContactLinkedinUrl] = useState("")
  const [contactPosition, setContactPosition] = useState("")
  const [contactStatus, setContactStatus] = useState("activo")
  const [logisticsPartyForm, setLogisticsPartyForm] = useState<ClientLogisticsPartyFormValues>({
    partyType: "shipper",
    name: "",
    fullAddress: "",
    postalCode: "",
    city: "",
    country: "",
    cityUnlocode: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  })
  const [opportunityForm, setOpportunityForm] = useState<OpportunityFormValues>({
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

  function syncClientForm(client: Client) {
    setCompanyName(client.company_name || "")
    setTaxId(client.tax_id || "")
    setStatus(client.status || "prospecto")
    setAccountOwnerId(client.account_owner_id || "")
    setIndustry(client.industry || "")
    setCountry(client.country || "")
    setWebsite(client.website || "")
    setCorporatePhone(client.corporate_phone || "")
    setFullAddress(client.full_address || "")
    setPostalCode(client.postal_code || "")
    setCity(client.city || "")
    setCityUnlocode(client.city_unlocode || "")
  }

  function resetContactForm() {
    setContactName("")
    setContactEmail("")
    setContactPhone("")
    setContactLinkedinUrl("")
    setContactPosition("")
    setContactStatus("activo")
  }

  function resetLogisticsPartyForm() {
    setLogisticsPartyForm({
      partyType: "shipper",
      name: "",
      fullAddress: "",
      postalCode: "",
      city: "",
      country: "",
      cityUnlocode: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
    })
  }

  function resetOpportunityForm() {
    setOpportunityForm({
      clientId: clientId ?? "",
      salespersonId: clientDetails?.client.account_owner_id || "",
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
  }

  useEffect(() => {
    if (!clientId) {
      return
    }

    let cancelled = false

    async function load(id: string) {
      try {
        setLoading(true)
        const [data, mode, users, serviceTransportTypes, incoterms] = await Promise.all([
          getClientFull(id),
          getBackendMode(),
          getUsers(),
          getServiceTransportTypes(),
          getIncoterms(),
        ])

        if (cancelled || !data?.client) {
          return
        }

        setBackendMode(mode)
        setClientDetails({
          client: data.client,
          contacts: data.contacts ?? [],
          logistics_parties: data.logistics_parties ?? [],
          opportunities: data.opportunities ?? [],
          users,
          serviceTransportTypes,
          incoterms,
        })
        syncClientForm(data.client)
        setOpportunityForm((current) => ({
          ...current,
          clientId: data.client.id,
        }))
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load(clientId)

    return () => {
      cancelled = true
    }
  }, [clientId])

  async function refreshClientDetails() {
    if (!clientId || !clientDetails) {
      return
    }

    const data = await getClientFull(clientId)
    if (!data?.client) {
      return
    }

    setClientDetails({
      client: data.client,
      contacts: data.contacts ?? [],
      logistics_parties: data.logistics_parties ?? [],
      opportunities: data.opportunities ?? [],
      users: clientDetails.users,
      serviceTransportTypes: clientDetails.serviceTransportTypes,
      incoterms: clientDetails.incoterms,
    })
    syncClientForm(data.client)
    setOpportunityForm((current) => ({
      ...current,
      clientId: data.client.id,
    }))
  }

  async function handleSaveClient() {
    if (!clientDetails) {
      return
    }

    if (!companyName.trim()) {
      alert("Company name is required")
      return
    }

    if (!website.trim()) {
      alert("Website is required")
      return
    }

    if (!corporatePhone.trim()) {
      alert("Corporate phone is required")
      return
    }

    try {
      setSavingClient(true)
      await updateClient(clientDetails.client.id, {
        company_name: companyName.trim(),
        tax_id: taxId.trim() || null,
        status,
        account_owner_id: accountOwnerId || null,
        industry: industry.trim() || null,
        country: country.trim() || null,
        website: website.trim() || null,
        corporate_phone: corporatePhone.trim() || null,
        full_address: fullAddress.trim() || null,
        postal_code: postalCode.trim() || null,
        city: city.trim() || null,
        city_unlocode: cityUnlocode.trim() || null,
      })
      await refreshClientDetails()
      setShowEditModal(false)
    } catch (error) {
      console.error(error)
      alert("Error saving client")
    } finally {
      setSavingClient(false)
    }
  }

  async function handleUpdateStatus(nextStatus: string) {
    if (!clientDetails || nextStatus === status) {
      return
    }

    const previousStatus = status
    setStatus(nextStatus)

    try {
      setSavingStatus(true)
      await updateClient(clientDetails.client.id, {
        status: nextStatus,
      })
      await refreshClientDetails()
    } catch (error) {
      console.error(error)
      setStatus(previousStatus)
      alert("Error updating client status")
    } finally {
      setSavingStatus(false)
    }
  }

  async function handleCreateContact() {
    if (!clientDetails) {
      return
    }

    if (!contactName.trim()) {
      alert("Contact name is required")
      return
    }

    try {
      setCreatingContact(true)
      await createContact({
        client_id: clientDetails.client.id,
        name: contactName.trim(),
        email: contactEmail.trim() || null,
        phone: contactPhone.trim() || null,
        linkedin_url: contactLinkedinUrl.trim() || null,
        position: contactPosition.trim() || null,
        status: contactStatus,
      })
      resetContactForm()
      setShowContactModal(false)
      await refreshClientDetails()
    } catch (error) {
      console.error(error)
      alert("Error creating contact")
    } finally {
      setCreatingContact(false)
    }
  }

  async function handleCreateOpportunity() {
    if (!clientDetails) {
      return
    }

    if (!opportunityForm.serviceType || !opportunityForm.transportType) {
      alert("Selecciona servicio y transporte")
      return
    }

    if (!opportunityForm.operationType) {
      alert("Selecciona el tipo de operacion")
      return
    }

    if (!opportunityForm.incotermId) {
      alert("Selecciona el incoterm")
      return
    }

    if (!opportunityForm.originUnlocode || !opportunityForm.destinationUnlocode) {
      alert("Selecciona origen y destino desde UN/LOCODE")
      return
    }

    try {
      setCreatingOpportunity(true)
      await createOpportunity({
        clientId: clientDetails.client.id,
        salespersonId: opportunityForm.salespersonId || null,
        serviceType: opportunityForm.serviceType,
        transportType: opportunityForm.transportType,
        operationType: opportunityForm.operationType,
        incotermId: opportunityForm.incotermId,
        originUnlocode: opportunityForm.originUnlocode,
        destinationUnlocode: opportunityForm.destinationUnlocode,
        expectedProfitUsd: opportunityForm.expectedProfitUsd.trim()
          ? Number(opportunityForm.expectedProfitUsd)
          : null,
        serviceQuantity: opportunityForm.serviceQuantity.trim()
          ? Number(opportunityForm.serviceQuantity)
          : null,
        description: opportunityForm.description.trim() || null,
      })
      resetOpportunityForm()
      setShowOpportunityModal(false)
      await refreshClientDetails()
    } catch (error) {
      console.error(error)
      alert("Error creating opportunity")
    } finally {
      setCreatingOpportunity(false)
    }
  }

  async function handleCreateLogisticsParty() {
    if (!clientDetails) {
      return
    }

    if (!logisticsPartyForm.name.trim()) {
      alert("Nombre requerido")
      return
    }

    try {
      setCreatingLogisticsParty(true)
      await createClientLogisticsParty({
        client_id: clientDetails.client.id,
        party_type: logisticsPartyForm.partyType,
        name: logisticsPartyForm.name.trim(),
        full_address: logisticsPartyForm.fullAddress.trim() || null,
        postal_code: logisticsPartyForm.postalCode.trim() || null,
        city_unlocode: logisticsPartyForm.cityUnlocode.trim() || null,
        contact_name: logisticsPartyForm.contactName.trim() || null,
        contact_email: logisticsPartyForm.contactEmail.trim() || null,
        contact_phone: logisticsPartyForm.contactPhone.trim() || null,
      })
      resetLogisticsPartyForm()
      setShowLogisticsPartyModal(false)
      await refreshClientDetails()
    } catch (error) {
      console.error(error)
      alert("Error creating logistics party")
    } finally {
      setCreatingLogisticsParty(false)
    }
  }

  async function handleDeleteClient() {
    if (!clientDetails) {
      return
    }

    const confirmed = window.confirm(
      `Delete ${clientDetails.client.company_name}? This will remove related CRM data in the current dev backend.`
    )

    if (!confirmed) {
      return
    }

    try {
      setDeletingClient(true)
      await deleteClient(clientDetails.client.id)
      router.push("/clients")
    } catch (error) {
      console.error(error)
      alert("Error deleting client")
      setDeletingClient(false)
    }
  }

  async function handleDeleteContact(id: string) {
    const confirmed = window.confirm("Delete this contact from the client?")

    if (!confirmed) {
      return
    }

    try {
      setDeletingContactId(id)
      await deleteContact(id)
      await refreshClientDetails()
    } catch (error) {
      console.error(error)
      alert("Error deleting contact")
    } finally {
      setDeletingContactId(null)
    }
  }

  async function handleDeleteOpportunity(id: string) {
    const confirmed = window.confirm("Delete this opportunity from the client?")

    if (!confirmed) {
      return
    }

    try {
      setDeletingOpportunityId(id)
      await deleteOpportunity(id)
      await refreshClientDetails()
    } catch (error) {
      console.error(error)
      alert("Error deleting opportunity")
    } finally {
      setDeletingOpportunityId(null)
    }
  }

  async function handleDeleteLogisticsParty(id: string) {
    const confirmed = window.confirm("Delete this consignee / shipper record from the client?")

    if (!confirmed) {
      return
    }

    try {
      setDeletingLogisticsPartyId(id)
      await deleteClientLogisticsParty(id)
      await refreshClientDetails()
    } catch (error) {
      console.error(error)
      alert("Error deleting logistics party")
    } finally {
      setDeletingLogisticsPartyId(null)
    }
  }

  if (!clientId) {
    return (
      <PageContainer title="Client" description="Invalid client id.">
        <p className="text-sm text-[#6B7280]">Client id is missing from the URL.</p>
      </PageContainer>
    )
  }

  if (loading && !clientDetails) {
    return (
      <PageContainer title="Client" description="Loading client data...">
        <p className="text-sm text-[#6B7280]">Loading client information.</p>
      </PageContainer>
    )
  }

  if (!clientDetails) {
    return (
      <PageContainer title="Client" description="Client not found.">
        <p className="text-sm text-[#6B7280]">
          We could not find a client with this id. It may have been deleted.
        </p>
      </PageContainer>
    )
  }

  const {
    client,
    contacts,
    logistics_parties,
    opportunities,
    users,
    serviceTransportTypes,
    incoterms,
  } = clientDetails
  const pipelineValue = opportunities.reduce(
    (sum, opportunity) => sum + (opportunity.estimated_value ?? 0),
    0
  )
  const logisticsPartyTypeLabel: Record<string, string> = {
    shipper: "Shipper",
    consignee: "Consignee",
    aa: "AA",
  }

  return (
    <PageContainer
      title={client.company_name}
      description="Client overview with related contacts and opportunities."
      actions={
        <>
          <div className="min-w-[220px] rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#1D4ED8]">
              Estatus del cliente
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
              {savingStatus ? "Guardando estatus..." : "Seguimiento principal del cliente"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="rounded-md border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-medium text-[#111827] hover:bg-[#F9FAFB]"
          >
            Editar informacion
          </button>
          <button
            type="button"
            onClick={() => {
              setOpportunityForm((current) => ({
                ...current,
                clientId: client.id,
                salespersonId: current.salespersonId || client.account_owner_id || "",
              }))
              setShowOpportunityModal(true)
            }}
            className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8]"
          >
            Anadir oportunidad
          </button>
          <button
            type="button"
            onClick={handleDeleteClient}
            disabled={deletingClient}
            className="rounded-md border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-2 text-sm font-medium text-[#B91C1C] hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deletingClient ? "Deleting..." : "Delete Client"}
          </button>
        </>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Status
            </div>
            <div className="mt-3">
              <StatusBadge status={status} />
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Contacts
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">{contacts.length}</div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Consignee & Shippers
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {logistics_parties.length}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Opportunities
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {opportunities.length}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Pipeline Value
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              ${pipelineValue.toLocaleString()}
            </div>
          </div>
        </section>

        <InfoCard title="Informacion de la empresa">
          <InfoField label="Nombre" value={client.company_name} />
          <InfoField label="RFC" value={client.tax_id} />
          <InfoField
            label="Vendedor dueno de cuenta"
            value={
              users.find((user) => user.id === client.account_owner_id)
                ? [
                    users.find((user) => user.id === client.account_owner_id)?.first_name,
                    users.find((user) => user.id === client.account_owner_id)?.last_name,
                  ]
                    .filter(Boolean)
                    .join(" ")
                : null
            }
          />
          <InfoField label="Industria" value={client.industry} />
          <InfoField label="Estatus" value={client.status} />
        </InfoCard>

        <InfoCard title="Ubicacion de la empresa">
          <InfoField label="Direccion" value={client.full_address} wide />
          <InfoField label="Codigo postal" value={client.postal_code} />
          <InfoField label="Ciudad" value={client.city} />
          <InfoField label="UN/LOCODE" value={client.city_unlocode} />
          <InfoField label="Pais" value={client.country} />
        </InfoCard>

        <InfoCard title="Informacion de contacto">
          <InfoField label="Pagina web" value={client.website} />
          <InfoField label="Tel corporativo" value={client.corporate_phone} />
        </InfoCard>

        {backendMode !== "canonical" ? (
          <section className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
            Core client data is stored in the cloud backend. Extended client profile fields are being
            preserved locally in this browser until the canonical CRM schema is applied remotely.
          </section>
        ) : null}

        <section className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">Relacionados del cliente</h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                Consulta y administra contactos, consignee and shippers y oportunidades desde una sola zona.
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-[#D1D5DB] bg-[#F8FAFC] p-1">
              {[
                { key: "contacts", label: `Contacts (${contacts.length})` },
                { key: "logistics", label: `Consignee and Shippers (${logistics_parties.length})` },
                { key: "opportunities", label: `Opportunities (${opportunities.length})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() =>
                    setActiveTab(tab.key as "contacts" | "logistics" | "opportunities")
                  }
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    activeTab === tab.key
                      ? "bg-white text-[#111827] shadow-sm"
                      : "text-[#64748B] hover:text-[#111827]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "contacts" ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-[#111827]">Contacts</h3>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    Personas vinculadas actualmente a esta empresa.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowContactModal(true)}
                  className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8]"
                >
                  Anadir contacto
                </button>
              </div>

              {contacts.length === 0 ? (
                <p className="text-sm text-[#6B7280]">No contacts linked to this client yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
                  <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                    <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                      <tr>
                        <th className="px-4 py-3">Nombre</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Telefono</th>
                        <th className="px-4 py-3">LinkedIn</th>
                        <th className="px-4 py-3">Puesto</th>
                        <th className="px-4 py-3">Estatus</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] bg-white">
                      {contacts.map((contact) => (
                        <tr key={contact.id}>
                          <td className="px-4 py-3 font-medium text-[#111827]">{contact.name}</td>
                          <td className="px-4 py-3 text-[#475569]">{contact.email || "No disponible"}</td>
                          <td className="px-4 py-3 text-[#475569]">{contact.phone || "No disponible"}</td>
                          <td className="px-4 py-3 text-[#475569]">
                            {contact.linkedin_url ? (
                              <a
                                href={contact.linkedin_url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium text-[#2563EB] hover:text-[#1D4ED8]"
                              >
                                LinkedIn
                              </a>
                            ) : (
                              "No disponible"
                            )}
                          </td>
                          <td className="px-4 py-3 text-[#475569]">{contact.position || "No disponible"}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={contact.status} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleDeleteContact(contact.id)}
                                disabled={deletingContactId === contact.id}
                                className="rounded-md border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-1.5 font-medium text-[#B91C1C] hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {deletingContactId === contact.id ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}

          {activeTab === "logistics" ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-[#111827]">Consignee and Shippers</h3>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    Registros operativos del cliente para shipper, consignee y AA.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLogisticsPartyModal(true)}
                  className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8]"
                >
                  Anadir registro
                </button>
              </div>

              {logistics_parties.length === 0 ? (
                <p className="text-sm text-[#6B7280]">
                  No consignee or shipper records linked to this client yet.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
                  <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                    <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                      <tr>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Nombre</th>
                        <th className="px-4 py-3">Ubicacion</th>
                        <th className="px-4 py-3">UN/LOCODE</th>
                        <th className="px-4 py-3">Contacto</th>
                        <th className="px-4 py-3">Correo</th>
                        <th className="px-4 py-3">Numero</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] bg-white">
                      {logistics_parties.map((party) => (
                        <tr key={party.id}>
                          <td className="px-4 py-3 text-[#111827]">
                            {logisticsPartyTypeLabel[party.party_type] || party.party_type}
                          </td>
                          <td className="px-4 py-3 font-medium text-[#111827]">{party.name}</td>
                          <td className="px-4 py-3 text-[#475569]">
                            {[party.city, party.country, party.postal_code].filter(Boolean).join(" · ") ||
                              party.full_address ||
                              "No disponible"}
                          </td>
                          <td className="px-4 py-3 text-[#475569]">{party.city_unlocode || "No disponible"}</td>
                          <td className="px-4 py-3 text-[#475569]">{party.contact_name || "No disponible"}</td>
                          <td className="px-4 py-3 text-[#475569]">{party.contact_email || "No disponible"}</td>
                          <td className="px-4 py-3 text-[#475569]">{party.contact_phone || "No disponible"}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleDeleteLogisticsParty(party.id)}
                                disabled={deletingLogisticsPartyId === party.id}
                                className="rounded-md border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-1.5 font-medium text-[#B91C1C] hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {deletingLogisticsPartyId === party.id ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}

          {activeTab === "opportunities" ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-[#111827]">Opportunities</h3>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    Oportunidades activas o historicas vinculadas a esta cuenta.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOpportunityForm((current) => ({
                      ...current,
                      clientId: client.id,
                      salespersonId: current.salespersonId || client.account_owner_id || "",
                    }))
                    setShowOpportunityModal(true)
                  }}
                  className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8]"
                >
                  Anadir oportunidad
                </button>
              </div>

              {opportunities.length === 0 ? (
                <p className="text-sm text-[#6B7280]">
                  No opportunities created for this client yet.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
                  <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                    <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                      <tr>
                        <th className="px-4 py-3">Titulo</th>
                        <th className="px-4 py-3">Servicio</th>
                        <th className="px-4 py-3">Estatus</th>
                        <th className="px-4 py-3">Lane</th>
                        <th className="px-4 py-3">Valor</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] bg-white">
                      {opportunities.map((opportunity) => (
                        <tr key={opportunity.id}>
                          <td className="px-4 py-3">
                            <Link
                              href={`/opportunities/${opportunity.id}`}
                              className="font-medium text-[#111827] hover:text-[#1D4ED8]"
                            >
                              {opportunity.title || "Untitled opportunity"}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-[#475569]">
                            {[opportunity.service_type, opportunity.transport_type]
                              .filter(Boolean)
                              .join(" / ") || "No definido"}
                          </td>
                          <td className="px-4 py-3 text-[#475569]">
                            {opportunity.status || "No status"}
                          </td>
                          <td className="px-4 py-3 text-[#475569]">
                            {opportunity.origin && opportunity.destination
                              ? `${opportunity.origin} -> ${opportunity.destination}`
                              : "No disponible"}
                          </td>
                          <td className="px-4 py-3 text-[#475569]">
                            {opportunity.estimated_value != null
                              ? `$${opportunity.estimated_value.toLocaleString()}`
                              : "No value"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleDeleteOpportunity(opportunity.id)}
                                disabled={deletingOpportunityId === opportunity.id}
                                className="rounded-md border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-1.5 font-medium text-[#B91C1C] hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {deletingOpportunityId === opportunity.id ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}
        </section>
      </div>

      {showEditModal ? (
        <Modal
          title="Editar informacion del cliente"
          description="Actualiza la informacion principal de la empresa en una sola vista."
          onClose={() => {
            setShowEditModal(false)
            syncClientForm(client)
          }}
        >
          <ClientForm
            title="Perfil del cliente"
            description="Agrupa la informacion comercial, ubicacion y contacto de la empresa."
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
            onSubmit={handleSaveClient}
            submitLabel="Guardar cambios"
            loading={savingClient}
            submitNote={
              backendMode === "canonical"
                ? "This profile is stored in the canonical backend."
                : "Extended client fields are preserved locally in this browser until the backend migration is applied."
            }
          />
        </Modal>
      ) : null}

      {showContactModal ? (
        <Modal
          title="Anadir contacto"
          description="Crea un nuevo contacto vinculado a esta empresa."
          onClose={() => {
            setShowContactModal(false)
            resetContactForm()
          }}
        >
          <ContactForm
            title="Nuevo contacto"
            description="Captura los datos del contacto y deja listos los enlaces directos."
            values={{
              clientId: client.id,
              name: contactName,
              position: contactPosition,
              phone: contactPhone,
              linkedinUrl: contactLinkedinUrl,
              email: contactEmail,
              status: contactStatus,
            }}
            clients={[client]}
            onChange={(field, value) => {
              if (field === "clientId") return
              if (field === "name") setContactName(value)
              if (field === "position") setContactPosition(value)
              if (field === "phone") setContactPhone(value)
              if (field === "linkedinUrl") setContactLinkedinUrl(value)
              if (field === "email") setContactEmail(value)
              if (field === "status") setContactStatus(value)
            }}
            onSubmit={handleCreateContact}
            submitLabel="Guardar contacto"
            loading={creatingContact}
          />
        </Modal>
      ) : null}

      {showOpportunityModal ? (
        <Modal
          title="Anadir oportunidad"
          description="Registra una nueva oportunidad comercial para esta cuenta usando el modelo canonico."
          onClose={() => {
            setShowOpportunityModal(false)
            resetOpportunityForm()
          }}
        >
          <OpportunityForm
            title="Nueva oportunidad"
            description="La oportunidad se crea con servicio, transporte, lane estandarizado y valor calculado."
            values={opportunityForm}
            clients={[client]}
            users={users}
            serviceTransportTypes={serviceTransportTypes}
            incoterms={incoterms}
            onChange={(field, value) => {
              setOpportunityForm((current) => {
                if (field === "clientId") {
                  return {
                    ...current,
                    clientId: value,
                    salespersonId: current.salespersonId || client.account_owner_id || "",
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
            loading={creatingOpportunity}
          />
        </Modal>
      ) : null}

      {showLogisticsPartyModal ? (
        <Modal
          title="Anadir registro consignee / shipper"
          description="Guarda un registro logistico estandarizado vinculado al cliente."
          onClose={() => {
            setShowLogisticsPartyModal(false)
            resetLogisticsPartyForm()
          }}
        >
          <ClientLogisticsPartyForm
            title="Nuevo registro logistico"
            description="Captura el tipo, ubicacion estandarizada y contacto principal."
            values={logisticsPartyForm}
            onChange={(field, value) => {
              setLogisticsPartyForm((current) => ({
                ...current,
                [field]: value,
              }))
            }}
            onSubmit={handleCreateLogisticsParty}
            submitLabel="Guardar registro"
            loading={creatingLogisticsParty}
          />
        </Modal>
      ) : null}
    </PageContainer>
  )
}
