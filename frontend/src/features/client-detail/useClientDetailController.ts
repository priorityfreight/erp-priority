import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  createClientLogisticsParty,
  createContact,
  createOpportunity,
  deleteClient,
  deleteClientLogisticsParty,
  deleteContact,
  deleteOpportunity,
  getBackendMode,
  getClientFull,
  getIncoterms,
  getServiceTransportTypes,
  getUsers,
  updateClient,
  type BackendMode,
  type Client,
} from "@/lib/db"
import type { ClientLogisticsPartyFormValues } from "@/components/forms/ClientLogisticsPartyForm"
import type { OpportunityFormValues } from "@/components/forms/OpportunityForm"
import { usePriorityConfirm } from "@/components/priority/usePriorityConfirm"
import { notifyError, notifyWarning } from "@/lib/feedback"
import {
  createEmptyLogisticsPartyForm,
  createEmptyOpportunityForm,
  type ClientDetailsState,
} from "@/features/client-detail/helpers"

export function useClientDetailController(clientId: string | undefined) {
  const router = useRouter()
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
  const [backendMode, setBackendMode] = useState<BackendMode>("canonical")
  const [showEditModal, setShowEditModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showOpportunityModal, setShowOpportunityModal] = useState(false)
  const [showLogisticsPartyModal, setShowLogisticsPartyModal] = useState(false)
  const [activeTab, setActiveTab] = useState<"contacts" | "logistics" | "opportunities" | "emails">(
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
  const [logisticsPartyForm, setLogisticsPartyForm] = useState<ClientLogisticsPartyFormValues>(
    createEmptyLogisticsPartyForm()
  )
  const [opportunityForm, setOpportunityForm] = useState<OpportunityFormValues>(
    createEmptyOpportunityForm("", "")
  )
  const { confirm, confirmDialog } = usePriorityConfirm()

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
    setLogisticsPartyForm(createEmptyLogisticsPartyForm())
  }

  function resetOpportunityForm() {
    setOpportunityForm(
      createEmptyOpportunityForm(clientId ?? "", clientDetails?.client.account_owner_id || "")
    )
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
      notifyWarning("Company name is required")
      return
    }

    if (!website.trim()) {
      notifyWarning("Website is required")
      return
    }

    if (!corporatePhone.trim()) {
      notifyWarning("Corporate phone is required")
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
      notifyError("Error saving client")
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
      notifyError("Error updating client status")
    } finally {
      setSavingStatus(false)
    }
  }

  async function handleCreateContact() {
    if (!clientDetails) {
      return
    }

    if (!contactName.trim()) {
      notifyWarning("Contact name is required")
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
      notifyError("Error creating contact")
    } finally {
      setCreatingContact(false)
    }
  }

  async function handleCreateOpportunity() {
    if (!clientDetails) {
      return
    }

    if (!opportunityForm.serviceType || !opportunityForm.transportType) {
      notifyWarning("Selecciona servicio y transporte")
      return
    }

    if (!opportunityForm.operationType) {
      notifyWarning("Selecciona el tipo de operacion")
      return
    }

    if (!opportunityForm.incotermId) {
      notifyWarning("Selecciona el incoterm")
      return
    }

    if (!opportunityForm.originUnlocode || !opportunityForm.destinationUnlocode) {
      notifyWarning("Selecciona origen y destino desde UN/LOCODE")
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
      notifyError("Error creating opportunity")
    } finally {
      setCreatingOpportunity(false)
    }
  }

  async function handleCreateLogisticsParty() {
    if (!clientDetails) {
      return
    }

    if (!logisticsPartyForm.name.trim()) {
      notifyWarning("Nombre requerido")
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
      notifyError("Error creating logistics party")
    } finally {
      setCreatingLogisticsParty(false)
    }
  }

  async function handleDeleteClient() {
    if (!clientDetails) {
      return
    }

    const confirmed = await confirm({
      title: "Eliminar cliente",
      description: `Se eliminara ${clientDetails.client.company_name} y tambien el CRM relacionado del workflow canonico.`,
      actionLabel: "Eliminar cliente",
      variant: "destructive",
    })

    if (!confirmed) {
      return
    }

    try {
      setDeletingClient(true)
      await deleteClient(clientDetails.client.id)
      router.push("/clients")
    } catch (error) {
      console.error(error)
      notifyError("Error deleting client")
      setDeletingClient(false)
    }
  }

  async function handleDeleteContact(id: string) {
    const confirmed = await confirm({
      title: "Eliminar contacto",
      description: "El contacto se eliminara del cliente actual.",
      actionLabel: "Eliminar contacto",
      variant: "destructive",
    })

    if (!confirmed) {
      return
    }

    try {
      setDeletingContactId(id)
      await deleteContact(id)
      await refreshClientDetails()
    } catch (error) {
      console.error(error)
      notifyError("Error deleting contact")
    } finally {
      setDeletingContactId(null)
    }
  }

  async function handleDeleteOpportunity(id: string) {
    const confirmed = await confirm({
      title: "Eliminar oportunidad",
      description: "La oportunidad se eliminara del pipeline del cliente.",
      actionLabel: "Eliminar oportunidad",
      variant: "destructive",
    })

    if (!confirmed) {
      return
    }

    try {
      setDeletingOpportunityId(id)
      await deleteOpportunity(id)
      await refreshClientDetails()
    } catch (error) {
      console.error(error)
      notifyError("Error deleting opportunity")
    } finally {
      setDeletingOpportunityId(null)
    }
  }

  async function handleDeleteLogisticsParty(id: string) {
    const confirmed = await confirm({
      title: "Eliminar logistics party",
      description: "El registro de consignee / shipper se eliminara del cliente.",
      actionLabel: "Eliminar registro",
      variant: "destructive",
    })

    if (!confirmed) {
      return
    }

    try {
      setDeletingLogisticsPartyId(id)
      await deleteClientLogisticsParty(id)
      await refreshClientDetails()
    } catch (error) {
      console.error(error)
      notifyError("Error deleting logistics party")
    } finally {
      setDeletingLogisticsPartyId(null)
    }
  }

  return {
    clientDetails,
    loading,
    savingClient,
    savingStatus,
    creatingContact,
    creatingOpportunity,
    creatingLogisticsParty,
    deletingContactId,
    deletingLogisticsPartyId,
    deletingOpportunityId,
    deletingClient,
    backendMode,
    showEditModal,
    setShowEditModal,
    showContactModal,
    setShowContactModal,
    showOpportunityModal,
    setShowOpportunityModal,
    showLogisticsPartyModal,
    setShowLogisticsPartyModal,
    activeTab,
    setActiveTab,
    companyName,
    setCompanyName,
    taxId,
    setTaxId,
    status,
    setStatus,
    accountOwnerId,
    setAccountOwnerId,
    industry,
    setIndustry,
    country,
    setCountry,
    website,
    setWebsite,
    corporatePhone,
    setCorporatePhone,
    fullAddress,
    setFullAddress,
    postalCode,
    setPostalCode,
    city,
    setCity,
    cityUnlocode,
    setCityUnlocode,
    contactName,
    setContactName,
    contactEmail,
    setContactEmail,
    contactPhone,
    setContactPhone,
    contactLinkedinUrl,
    setContactLinkedinUrl,
    contactPosition,
    setContactPosition,
    contactStatus,
    setContactStatus,
    logisticsPartyForm,
    setLogisticsPartyForm,
    opportunityForm,
    setOpportunityForm,
    confirmDialog,
    syncClientForm,
    resetContactForm,
    resetLogisticsPartyForm,
    resetOpportunityForm,
    refreshClientDetails,
    handleSaveClient,
    handleUpdateStatus,
    handleCreateContact,
    handleCreateOpportunity,
    handleCreateLogisticsParty,
    handleDeleteClient,
    handleDeleteContact,
    handleDeleteOpportunity,
    handleDeleteLogisticsParty,
  }
}
