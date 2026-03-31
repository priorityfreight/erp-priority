import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  createProviderContact,
  createProviderServiceOffering,
  deleteProvider,
  deleteProviderContact,
  deleteProviderServiceOffering,
  getProviderFull,
  getServiceTransportTypes,
  updateProvider,
  updateProviderContact,
  updateProviderServiceOffering,
  type Provider,
  type ProviderContactWithProvider,
  type ProviderServiceOffering,
} from "@/lib/db"
import type { ProviderContactFormValues } from "@/components/forms/ProviderContactForm"
import type { ProviderFormValues } from "@/components/forms/ProviderForm"
import type { ProviderServiceOfferingFormValues } from "@/components/forms/ProviderServiceOfferingForm"
import { usePriorityConfirm } from "@/components/priority/usePriorityConfirm"
import { notifyError, notifyWarning } from "@/lib/feedback"
import {
  buildProviderContactForm,
  buildProviderForm,
  buildProviderOfferingForm,
  emptyContactForm,
  emptyOfferingForm,
  emptyProviderForm,
  type ProviderDetailsState,
} from "@/features/provider-detail/helpers"

export function useProviderDetailController(providerId: string | undefined) {
  const router = useRouter()
  const [providerDetails, setProviderDetails] = useState<ProviderDetailsState | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingProvider, setSavingProvider] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [deletingProvider, setDeletingProvider] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showOfferingModal, setShowOfferingModal] = useState(false)
  const [editingContact, setEditingContact] = useState<ProviderContactWithProvider | null>(null)
  const [editingOffering, setEditingOffering] = useState<ProviderServiceOffering | null>(null)
  const [savingContact, setSavingContact] = useState(false)
  const [savingOffering, setSavingOffering] = useState(false)
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null)
  const [deletingOfferingId, setDeletingOfferingId] = useState<string | null>(null)
  const [status, setStatus] = useState("en_proceso_de_alta")
  const [providerForm, setProviderForm] = useState<ProviderFormValues>(emptyProviderForm)
  const [contactForm, setContactForm] = useState<ProviderContactFormValues>(emptyContactForm)
  const [offeringForm, setOfferingForm] = useState<ProviderServiceOfferingFormValues>(emptyOfferingForm)
  const { confirm, confirmDialog } = usePriorityConfirm()

  function syncProviderForm(provider: Provider) {
    setProviderForm(buildProviderForm(provider))
    setStatus(provider.status || "en_proceso_de_alta")
  }

  function resetContactForm() {
    setEditingContact(null)
    setContactForm(emptyContactForm)
  }

  function resetOfferingForm() {
    setEditingOffering(null)
    setOfferingForm(emptyOfferingForm)
  }

  const loadProvider = useCallback(async (id: string) => {
    try {
      setLoading(true)
      const [data, serviceTransportTypes] = await Promise.all([
        getProviderFull(id),
        getServiceTransportTypes(),
      ])

      if (!data?.provider) {
        return
      }

      setProviderDetails({
        provider: data.provider,
        contacts: data.contacts,
        serviceOfferings: data.service_offerings,
        serviceTransportTypes,
      })
      syncProviderForm(data.provider)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (providerId) {
      void loadProvider(providerId)
    }
  }, [loadProvider, providerId])

  async function refreshProvider() {
    if (!providerId) {
      return
    }

    await loadProvider(providerId)
  }

  async function handleSaveProvider() {
    if (!providerDetails) {
      return
    }

    if (!providerForm.name.trim()) {
      notifyWarning("Nombre del proveedor requerido")
      return
    }

    try {
      setSavingProvider(true)
      await updateProvider(providerDetails.provider.id, {
        name: providerForm.name.trim(),
        tax_id: providerForm.taxId.trim() || null,
        provider_type: providerForm.providerType.trim() || null,
        corporate_phone: providerForm.corporatePhone.trim() || null,
        company_email: providerForm.companyEmail.trim() || null,
        website: providerForm.website.trim() || null,
        full_address: providerForm.fullAddress.trim() || null,
        postal_code: providerForm.postalCode.trim() || null,
        city_unlocode: providerForm.cityUnlocode.trim() || null,
        credit_active: providerForm.creditActive === "si",
        credit_amount: providerForm.creditAmount ? Number(providerForm.creditAmount) : null,
        credit_days: providerForm.creditDays ? Number(providerForm.creditDays) : null,
      })
      await refreshProvider()
      setShowEditModal(false)
    } catch (error) {
      console.error(error)
      notifyError("Error saving provider")
    } finally {
      setSavingProvider(false)
    }
  }

  async function handleStatusChange(nextStatus: string) {
    if (!providerDetails) {
      return
    }

    try {
      setSavingStatus(true)
      setStatus(nextStatus)
      await updateProvider(providerDetails.provider.id, {
        status: nextStatus,
      })
      await refreshProvider()
    } catch (error) {
      console.error(error)
      notifyError("Error updating provider status")
      setStatus(providerDetails.provider.status)
    } finally {
      setSavingStatus(false)
    }
  }

  async function handleDeleteProvider() {
    if (!providerDetails) {
      return
    }

    const confirmed = await confirm({
      title: "Eliminar proveedor",
      description: "Se eliminaran tambien sus contactos y servicios ofrecidos.",
      actionLabel: "Eliminar proveedor",
      variant: "destructive",
    })

    if (!confirmed) {
      return
    }

    try {
      setDeletingProvider(true)
      await deleteProvider(providerDetails.provider.id)
      router.push("/pricing/providers")
    } catch (error) {
      console.error(error)
      notifyError("Error deleting provider")
    } finally {
      setDeletingProvider(false)
    }
  }

  async function handleSaveContact() {
    if (!providerDetails) {
      return
    }

    if (!contactForm.name.trim()) {
      notifyWarning("Nombre del contacto requerido")
      return
    }

    try {
      setSavingContact(true)
      if (editingContact) {
        await updateProviderContact(editingContact.id, {
          name: contactForm.name.trim(),
          email: contactForm.email.trim() || null,
          phone: contactForm.phone.trim() || null,
          linkedin_url: contactForm.linkedinUrl.trim() || null,
          position: contactForm.position.trim() || null,
          status: contactForm.status,
        })
      } else {
        await createProviderContact({
          provider_id: providerDetails.provider.id,
          name: contactForm.name.trim(),
          email: contactForm.email.trim() || null,
          phone: contactForm.phone.trim() || null,
          linkedin_url: contactForm.linkedinUrl.trim() || null,
          position: contactForm.position.trim() || null,
          status: contactForm.status,
        })
      }

      resetContactForm()
      setShowContactModal(false)
      await refreshProvider()
    } catch (error) {
      console.error(error)
      notifyError("Error saving provider contact")
    } finally {
      setSavingContact(false)
    }
  }

  function startEditContact(contact: ProviderContactWithProvider) {
    setEditingContact(contact)
    setContactForm(buildProviderContactForm(contact))
    setShowContactModal(true)
  }

  async function handleDeleteContact(id: string) {
    try {
      setDeletingContactId(id)
      await deleteProviderContact(id)
      await refreshProvider()
    } catch (error) {
      console.error(error)
      notifyError("Error deleting provider contact")
    } finally {
      setDeletingContactId(null)
    }
  }

  async function handleSaveOffering() {
    if (!providerDetails) {
      return
    }

    if (!offeringForm.serviceTransportTypeId) {
      notifyWarning("Selecciona un tipo de transporte")
      return
    }

    try {
      setSavingOffering(true)
      if (editingOffering) {
        await updateProviderServiceOffering(editingOffering.id, {
          service_transport_type_id: offeringForm.serviceTransportTypeId,
          terms_and_conditions: offeringForm.termsAndConditions.trim() || null,
        })
      } else {
        await createProviderServiceOffering({
          provider_id: providerDetails.provider.id,
          service_transport_type_id: offeringForm.serviceTransportTypeId,
          terms_and_conditions: offeringForm.termsAndConditions.trim() || null,
        })
      }

      resetOfferingForm()
      setShowOfferingModal(false)
      await refreshProvider()
    } catch (error) {
      console.error(error)
      notifyError("Error saving offered service")
    } finally {
      setSavingOffering(false)
    }
  }

  function startEditOffering(offering: ProviderServiceOffering) {
    setEditingOffering(offering)
    setOfferingForm(buildProviderOfferingForm(offering))
    setShowOfferingModal(true)
  }

  async function handleDeleteOffering(id: string) {
    try {
      setDeletingOfferingId(id)
      await deleteProviderServiceOffering(id)
      await refreshProvider()
    } catch (error) {
      console.error(error)
      notifyError("Error deleting offered service")
    } finally {
      setDeletingOfferingId(null)
    }
  }

  return {
    providerDetails,
    loading,
    savingProvider,
    savingStatus,
    deletingProvider,
    showEditModal,
    setShowEditModal,
    showContactModal,
    setShowContactModal,
    showOfferingModal,
    setShowOfferingModal,
    editingContact,
    editingOffering,
    savingContact,
    savingOffering,
    deletingContactId,
    deletingOfferingId,
    status,
    providerForm,
    setProviderForm,
    contactForm,
    setContactForm,
    offeringForm,
    setOfferingForm,
    confirmDialog,
    syncProviderForm,
    resetContactForm,
    resetOfferingForm,
    refreshProvider,
    handleSaveProvider,
    handleStatusChange,
    handleDeleteProvider,
    handleSaveContact,
    startEditContact,
    handleDeleteContact,
    handleSaveOffering,
    startEditOffering,
    handleDeleteOffering,
  }
}
