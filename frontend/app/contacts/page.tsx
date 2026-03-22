"use client"

import Link from "next/link"
import { useDeferredValue, useEffect, useState } from "react"
import {
  createContact,
  deleteContact,
  getClients,
  getContacts,
  updateContact,
  type Client,
  type ContactWithClient,
} from "@/lib/db"
import { Modal } from "@/components/data/Modal"
import { StatusBadge } from "@/components/data/StatusBadge"
import {
  ContactForm,
  type ContactFormValues,
  normalizeWhatsAppLink,
} from "@/components/forms/ContactForm"
import { PageContainer } from "@/components/layout/PageContainer"

const emptyForm: ContactFormValues = {
  clientId: "",
  name: "",
  position: "",
  phone: "",
  linkedinUrl: "",
  email: "",
  status: "activo",
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactWithClient[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [statusFilter, setStatusFilter] = useState("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingContact, setEditingContact] = useState<ContactWithClient | null>(null)
  const [formValues, setFormValues] = useState<ContactFormValues>(emptyForm)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadClientsData() {
    try {
      const clientsData = await getClients()
      setClients(clientsData)
    } catch (error) {
      console.error(error)
    }
  }

  async function loadContactsData(query = "", status = "all") {
    try {
      setLoading(true)
      const contactsData = await getContacts({
        query,
        status,
      })
      setContacts(contactsData)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadClientsData()
  }, [])

  useEffect(() => {
    void loadContactsData(deferredSearch, statusFilter)
  }, [deferredSearch, statusFilter])

  function resetForm() {
    setFormValues(emptyForm)
  }

  function startEdit(contact: ContactWithClient) {
    setEditingContact(contact)
    setFormValues({
      clientId: contact.client_id,
      name: contact.name || "",
      position: contact.position || "",
      phone: contact.phone || "",
      linkedinUrl: contact.linkedin_url || "",
      email: contact.email || "",
      status: contact.status || "activo",
    })
  }

  async function handleCreateContact() {
    if (!formValues.clientId) {
      alert("Selecciona un cliente")
      return
    }

    if (!formValues.name.trim()) {
      alert("Nombre requerido")
      return
    }

    try {
      setCreating(true)
      await createContact({
        client_id: formValues.clientId,
        name: formValues.name.trim(),
        email: formValues.email.trim() || null,
        phone: formValues.phone.trim() || null,
        linkedin_url: formValues.linkedinUrl.trim() || null,
        position: formValues.position.trim() || null,
        status: formValues.status,
      })
      resetForm()
      setShowCreateModal(false)
      await loadContactsData(search, statusFilter)
    } catch (error) {
      console.error(error)
      alert("Error creating contact")
    } finally {
      setCreating(false)
    }
  }

  async function handleSaveContact() {
    if (!editingContact) {
      return
    }

    if (!formValues.name.trim()) {
      alert("Nombre requerido")
      return
    }

    try {
      setSaving(true)
      await updateContact(editingContact.id, {
        client_id: formValues.clientId,
        name: formValues.name.trim(),
        email: formValues.email.trim() || null,
        phone: formValues.phone.trim() || null,
        linkedin_url: formValues.linkedinUrl.trim() || null,
        position: formValues.position.trim() || null,
        status: formValues.status,
      })
      setEditingContact(null)
      resetForm()
      await loadContactsData(search, statusFilter)
    } catch (error) {
      console.error(error)
      alert("Error saving contact")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteContact(id: string) {
    const confirmed = window.confirm("Delete this contact?")

    if (!confirmed) {
      return
    }

    try {
      setDeletingId(id)
      await deleteContact(id)
      await loadContactsData(search, statusFilter)
    } catch (error) {
      console.error(error)
      alert("Error deleting contact")
    } finally {
      setDeletingId(null)
    }
  }

  const filteredContacts = contacts

  const activeContacts = filteredContacts.filter((contact) => contact.status === "activo").length
  const inactiveContacts = filteredContacts.filter(
    (contact) => contact.status === "ya_no_trabaja"
  ).length

  return (
    <PageContainer
      title="Contacts"
      description="Gestion de contactos clave por cuenta con enlaces directos y estatus laboral."
      actions={
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8]"
        >
          Anadir contacto
        </button>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#1D4ED8]">
              Total contactos
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">{filteredContacts.length}</div>
          </div>
          <div className="rounded-xl border border-[#D1FAE5] bg-[#ECFDF5] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#047857]">
              Activos
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">{activeContacts}</div>
          </div>
          <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#B45309]">
              Ya no trabaja
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">{inactiveContacts}</div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#475569]">
              Clientes cubiertos
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {new Set(filteredContacts.map((contact) => contact.client_id)).size}
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">Lista de contactos</h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                Usa la tabla como fuente principal y edita mediante popup.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                placeholder="Buscar contacto o cliente"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                className="rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">Todos los estatus</option>
                <option value="activo">Activo</option>
                <option value="ya_no_trabaja">Ya no trabaja</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-[#6B7280]">Cargando contactos...</p>
          ) : filteredContacts.length === 0 ? (
            <p className="text-sm text-[#6B7280]">
              {!deferredSearch.trim() && statusFilter === "all"
                ? "No contacts yet. Create the first one from the popup."
                : "No contacts match the current filters."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
              <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Puesto</th>
                    <th className="px-4 py-3">Telefono directo</th>
                    <th className="px-4 py-3">LinkedIn</th>
                    <th className="px-4 py-3">Correo</th>
                    <th className="px-4 py-3">Estatus</th>
                    <th className="px-4 py-3">Creado</th>
                    <th className="px-4 py-3">Actualizado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] bg-white">
                  {filteredContacts.map((contact) => {
                    const whatsappLink = normalizeWhatsAppLink(contact.phone || "")

                    return (
                      <tr key={contact.id}>
                        <td className="px-4 py-3 font-medium text-[#111827]">{contact.name}</td>
                        <td className="px-4 py-3 text-[#475569]">
                          {contact.client_name ? (
                            <Link
                              href={`/clients/${contact.client_id}`}
                              className="font-medium text-[#2563EB] hover:text-[#1D4ED8]"
                            >
                              {contact.client_name}
                            </Link>
                          ) : (
                            "No client"
                          )}
                        </td>
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
                        <td className="px-4 py-3 text-[#475569]">
                          {new Date(contact.created_at).toLocaleString("es-MX")}
                        </td>
                        <td className="px-4 py-3 text-[#475569]">
                          {contact.updated_at
                            ? new Date(contact.updated_at).toLocaleString("es-MX")
                            : "No actualizado"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(contact)}
                              className="rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 font-medium text-[#111827] hover:bg-[#F8FAFC]"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteContact(contact.id)}
                              disabled={deletingId === contact.id}
                              className="rounded-md border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-1.5 font-medium text-[#B91C1C] hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingId === contact.id ? "Deleting..." : "Delete"}
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

      {showCreateModal ? (
        <Modal
          title="Anadir contacto"
          description="Captura los datos del contacto con validaciones básicas y enlaces futuros."
          onClose={() => {
            setShowCreateModal(false)
            resetForm()
          }}
        >
          <ContactForm
            title="Nuevo contacto"
            description="El correo se valida por formato. WhatsApp y LinkedIn quedan listos para acceso directo."
            values={formValues}
            clients={clients}
            onChange={(field, value) => {
              setFormValues((current) => ({
                ...current,
                [field]: value,
              }))
            }}
            onSubmit={handleCreateContact}
            submitLabel="Guardar contacto"
            loading={creating}
          />
        </Modal>
      ) : null}

      {editingContact ? (
        <Modal
          title="Editar contacto"
          description="Actualiza el perfil del contacto sin salir de la tabla principal."
          onClose={() => {
            setEditingContact(null)
            resetForm()
          }}
        >
          <ContactForm
            title="Perfil del contacto"
            description="Gestiona disponibilidad, enlaces y datos directos de contacto."
            values={formValues}
            clients={clients}
            createdAt={editingContact.created_at}
            updatedAt={editingContact.updated_at}
            onChange={(field, value) => {
              setFormValues((current) => ({
                ...current,
                [field]: value,
              }))
            }}
            onSubmit={handleSaveContact}
            submitLabel="Guardar cambios"
            loading={saving}
          />
        </Modal>
      ) : null}
    </PageContainer>
  )
}
