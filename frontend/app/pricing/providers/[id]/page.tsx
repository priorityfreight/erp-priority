"use client"

import Link from "next/link"
import { useCallback, useEffect, useState, type ReactNode } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  createProviderContact,
  createProviderServiceOffering,
  deleteProvider,
  deleteProviderContact,
  deleteProviderServiceOffering,
  getProviderFull,
  getServiceTransportTypes,
  type Provider,
  type ProviderContactWithProvider,
  type ProviderServiceOffering,
  type ServiceTransportType,
  updateProvider,
  updateProviderContact,
  updateProviderServiceOffering,
} from "@/lib/db"
import { Modal } from "@/components/data/Modal"
import { StatusBadge } from "@/components/data/StatusBadge"
import {
  ProviderForm,
  type ProviderFormValues,
} from "@/components/forms/ProviderForm"
import {
  ProviderContactForm,
  type ProviderContactFormValues,
} from "@/components/forms/ProviderContactForm"
import {
  ProviderServiceOfferingForm,
  type ProviderServiceOfferingFormValues,
} from "@/components/forms/ProviderServiceOfferingForm"
import { normalizeWhatsAppLink } from "@/components/forms/ContactForm"
import { PageContainer } from "@/components/layout/PageContainer"

type ProviderDetailsState = {
  provider: Provider
  contacts: ProviderContactWithProvider[]
  serviceOfferings: ProviderServiceOffering[]
  serviceTransportTypes: ServiceTransportType[]
}

const emptyProviderForm: ProviderFormValues = {
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

const emptyContactForm: ProviderContactFormValues = {
  name: "",
  email: "",
  phone: "",
  linkedinUrl: "",
  position: "",
  status: "activo",
}

const emptyOfferingForm: ProviderServiceOfferingFormValues = {
  serviceType: "",
  serviceTransportTypeId: "",
  termsAndConditions: "",
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

export default function ProviderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const providerId = typeof params?.id === "string" ? params.id : undefined

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

  function syncProviderForm(provider: Provider) {
    setProviderForm({
      name: provider.name || "",
      taxId: provider.tax_id || "",
      status: provider.status || "en_proceso_de_alta",
      providerType: provider.provider_type || "",
      corporatePhone: provider.corporate_phone || "",
      companyEmail: provider.company_email || "",
      website: provider.website || "",
      fullAddress: provider.full_address || "",
      postalCode: provider.postal_code || "",
      city: provider.city || "",
      cityUnlocode: provider.city_unlocode || "",
      country: provider.country || "",
      creditActive: provider.credit_active ? "si" : "no",
      creditAmount: provider.credit_amount ? String(provider.credit_amount) : "",
      creditDays: provider.credit_days ? String(provider.credit_days) : "",
    })
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
      alert("Nombre del proveedor requerido")
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
      alert("Error saving provider")
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
      alert("Error updating provider status")
      setStatus(providerDetails.provider.status)
    } finally {
      setSavingStatus(false)
    }
  }

  async function handleDeleteProvider() {
    if (!providerDetails) {
      return
    }

    const confirmed = window.confirm(
      "Eliminar este proveedor tambien borrara contactos y servicios ofrecidos."
    )

    if (!confirmed) {
      return
    }

    try {
      setDeletingProvider(true)
      await deleteProvider(providerDetails.provider.id)
      router.push("/pricing/providers")
    } catch (error) {
      console.error(error)
      alert("Error deleting provider")
    } finally {
      setDeletingProvider(false)
    }
  }

  async function handleSaveContact() {
    if (!providerDetails) {
      return
    }

    if (!contactForm.name.trim()) {
      alert("Nombre del contacto requerido")
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
      alert("Error saving provider contact")
    } finally {
      setSavingContact(false)
    }
  }

  function startEditContact(contact: ProviderContactWithProvider) {
    setEditingContact(contact)
    setContactForm({
      name: contact.name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      linkedinUrl: contact.linkedin_url || "",
      position: contact.position || "",
      status: contact.status || "activo",
    })
    setShowContactModal(true)
  }

  async function handleDeleteContact(id: string) {
    try {
      setDeletingContactId(id)
      await deleteProviderContact(id)
      await refreshProvider()
    } catch (error) {
      console.error(error)
      alert("Error deleting provider contact")
    } finally {
      setDeletingContactId(null)
    }
  }

  async function handleSaveOffering() {
    if (!providerDetails) {
      return
    }

    if (!offeringForm.serviceTransportTypeId) {
      alert("Selecciona un tipo de transporte")
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
      alert("Error saving offered service")
    } finally {
      setSavingOffering(false)
    }
  }

  function startEditOffering(offering: ProviderServiceOffering) {
    setEditingOffering(offering)
    setOfferingForm({
      serviceType: offering.service_type,
      serviceTransportTypeId: offering.service_transport_type_id,
      termsAndConditions: offering.terms_and_conditions || "",
    })
    setShowOfferingModal(true)
  }

  async function handleDeleteOffering(id: string) {
    try {
      setDeletingOfferingId(id)
      await deleteProviderServiceOffering(id)
      await refreshProvider()
    } catch (error) {
      console.error(error)
      alert("Error deleting offered service")
    } finally {
      setDeletingOfferingId(null)
    }
  }

  if (loading) {
    return (
      <PageContainer title="Provider detail" description="Loading provider information...">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-10 text-center text-sm text-[#6B7280]">
          Loading...
        </div>
      </PageContainer>
    )
  }

  if (!providerDetails) {
    return (
      <PageContainer title="Provider detail" description="The requested provider could not be found.">
        <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-6 text-sm text-[#991B1B]">
          Provider not found.
        </div>
      </PageContainer>
    )
  }

  const { provider, contacts, serviceOfferings, serviceTransportTypes } = providerDetails

  return (
    <PageContainer
      title={provider.name}
      description="Pricing provider profile with services, terms, and direct supplier contacts."
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/pricing/providers"
            className="rounded-md border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-medium text-[#111827] hover:bg-[#F8FAFC]"
          >
            Volver
          </Link>
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="rounded-md border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-medium text-[#111827] hover:bg-[#F8FAFC]"
          >
            Editar informacion
          </button>
          <button
            type="button"
            onClick={() => void handleDeleteProvider()}
            disabled={deletingProvider}
            className="rounded-md border border-[#FECACA] bg-white px-4 py-2 text-sm font-medium text-[#B91C1C] hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deletingProvider ? "Deleting..." : "Eliminar proveedor"}
          </button>
        </div>
      }
    >
      <div className="space-y-8">
        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-[#64748B]">
                Seguimiento del proveedor
              </div>
              <div className="mt-1 text-2xl font-semibold text-[#111827]">{provider.name}</div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={status} />
              <select
                className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                value={status}
                onChange={(event) => void handleStatusChange(event.target.value)}
                disabled={savingStatus}
              >
                <option value="en_proceso_de_alta">En proceso de alta</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          </div>
        </section>

        <InfoCard title="Informacion de la empresa">
          <InfoField label="Nombre" value={provider.name} />
          <InfoField label="RFC" value={provider.tax_id} />
          <InfoField label="Tipo de proveedor" value={provider.provider_type} />
        </InfoCard>

        <InfoCard title="Ubicacion de la empresa">
          <InfoField label="Direccion" value={provider.full_address} wide />
          <InfoField label="Codigo postal" value={provider.postal_code} />
          <InfoField label="UN/LOCODE" value={provider.city_unlocode} />
          <InfoField label="Ciudad" value={provider.city} />
          <InfoField label="Pais" value={provider.country} />
        </InfoCard>

        <InfoCard title="Informacion de contacto">
          <InfoField label="Telefono corporativo" value={provider.corporate_phone} />
          <InfoField label="Correo de la empresa" value={provider.company_email} />
          <InfoField label="Pagina web" value={provider.website} />
        </InfoCard>

        <InfoCard title="Credito y cobranza">
          <InfoField label="Credito activo" value={provider.credit_active ? "Si" : "No"} />
          <InfoField
            label="Monto de credito"
            value={provider.credit_amount !== null ? `$${provider.credit_amount.toLocaleString()}` : null}
          />
          <InfoField
            label="Dias de credito"
            value={provider.credit_days !== null ? String(provider.credit_days) : null}
          />
        </InfoCard>

        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-[#111827]">Tipos de servicio que ofrece</div>
              <div className="text-sm text-[#6B7280]">
                Cada fila representa un servicio habilitado y sus terminos.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                resetOfferingForm()
                setShowOfferingModal(true)
              }}
              className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8]"
            >
              Anadir servicio
            </button>
          </div>
          {serviceOfferings.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No services yet. Add the first one from the popup.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
              <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  <tr>
                    <th className="px-4 py-3">Tipo de servicio</th>
                    <th className="px-4 py-3">Tipo de transporte</th>
                    <th className="px-4 py-3">Terminos y condiciones</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] bg-white">
                  {serviceOfferings.map((offering) => (
                    <tr key={offering.id}>
                      <td className="px-4 py-3 text-[#111827]">{offering.service_type}</td>
                      <td className="px-4 py-3 text-[#475569]">{offering.transport_type}</td>
                      <td className="px-4 py-3 text-[#475569]">
                        {offering.terms_and_conditions || "No definido"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEditOffering(offering)}
                            className="rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 font-medium text-[#111827] hover:bg-[#F8FAFC]"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteOffering(offering.id)}
                            disabled={deletingOfferingId === offering.id}
                            className="rounded-md border border-[#FECACA] bg-white px-3 py-1.5 font-medium text-[#B91C1C] hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingOfferingId === offering.id ? "Deleting..." : "Eliminar"}
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

        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-[#111827]">Contactos de proveedor</div>
              <div className="text-sm text-[#6B7280]">
                Contactos directos para pricing, seguimiento y negociacion.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                resetContactForm()
                setShowContactModal(true)
              }}
              className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8]"
            >
              Anadir contacto
            </button>
          </div>
          {contacts.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No contacts yet. Add the first one from the popup.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
              <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Puesto</th>
                    <th className="px-4 py-3">Telefono</th>
                    <th className="px-4 py-3">LinkedIn</th>
                    <th className="px-4 py-3">Correo</th>
                    <th className="px-4 py-3">Estatus</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] bg-white">
                  {contacts.map((contact) => {
                    const whatsappLink = normalizeWhatsAppLink(contact.phone || "")

                    return (
                      <tr key={contact.id}>
                        <td className="px-4 py-3 font-medium text-[#111827]">{contact.name}</td>
                        <td className="px-4 py-3 text-[#475569]">{contact.position || "No disponible"}</td>
                        <td className="px-4 py-3 text-[#475569]">
                          <div className="flex flex-col gap-1">
                            <span>{contact.phone || "No disponible"}</span>
                            {whatsappLink ? (
                              <a
                                href={whatsappLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-medium text-[#16A34A] hover:text-[#15803D]"
                              >
                                Abrir WhatsApp
                              </a>
                            ) : null}
                          </div>
                        </td>
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
                        <td className="px-4 py-3 text-[#475569]">
                          {contact.email ? (
                            <a
                              href={`mailto:${contact.email}`}
                              className="font-medium text-[#2563EB] hover:text-[#1D4ED8]"
                            >
                              {contact.email}
                            </a>
                          ) : (
                            "No disponible"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={contact.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => startEditContact(contact)}
                              className="rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 font-medium text-[#111827] hover:bg-[#F8FAFC]"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteContact(contact.id)}
                              disabled={deletingContactId === contact.id}
                              className="rounded-md border border-[#FECACA] bg-white px-3 py-1.5 font-medium text-[#B91C1C] hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingContactId === contact.id ? "Deleting..." : "Eliminar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {showEditModal ? (
        <Modal
          title="Editar proveedor"
          onClose={() => {
            if (!savingProvider) {
              setShowEditModal(false)
              syncProviderForm(provider)
            }
          }}
        >
          <ProviderForm
            title="Informacion del proveedor"
            description="Edita la informacion base de la empresa."
            values={providerForm}
            onChange={(field, value) =>
              setProviderForm((current) => ({
                ...current,
                [field]: value,
              }))
            }
            onSubmit={() => void handleSaveProvider()}
            submitLabel="Guardar cambios"
            loading={savingProvider}
            showStatus={false}
          />
        </Modal>
      ) : null}

      {showContactModal ? (
        <Modal
          title={editingContact ? "Editar contacto de proveedor" : "Anadir contacto de proveedor"}
          onClose={() => {
            if (!savingContact) {
              setShowContactModal(false)
              resetContactForm()
            }
          }}
        >
          <ProviderContactForm
            title={editingContact ? "Editar contacto" : "Nuevo contacto"}
            description="Gestiona los contactos directos de este proveedor."
            values={contactForm}
            onChange={(field, value) =>
              setContactForm((current) => ({
                ...current,
                [field]: value,
              }))
            }
            onSubmit={() => void handleSaveContact()}
            submitLabel={editingContact ? "Guardar cambios" : "Guardar contacto"}
            loading={savingContact}
          />
        </Modal>
      ) : null}

      {showOfferingModal ? (
        <Modal
          title={editingOffering ? "Editar servicio ofrecido" : "Anadir servicio ofrecido"}
          onClose={() => {
            if (!savingOffering) {
              setShowOfferingModal(false)
              resetOfferingForm()
            }
          }}
        >
          <ProviderServiceOfferingForm
            title={editingOffering ? "Editar servicio" : "Nuevo servicio"}
            description="Relaciona un servicio del catalogo maestro con sus terminos."
            values={offeringForm}
            serviceTransportTypes={serviceTransportTypes}
            onChange={(field, value) =>
              setOfferingForm((current) => ({
                ...current,
                [field]: value,
              }))
            }
            onSubmit={() => void handleSaveOffering()}
            submitLabel={editingOffering ? "Guardar cambios" : "Guardar servicio"}
            loading={savingOffering}
          />
        </Modal>
      ) : null}
    </PageContainer>
  )
}
