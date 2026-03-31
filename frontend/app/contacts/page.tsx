"use client"

import { type ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import {
  createContact,
  deleteContact,
  getClients,
  getContacts,
  updateContact,
  type Client,
  type ContactWithClient,
} from "@/lib/db"
import { getErrorMessage, notifyError, notifyWarning } from "@/lib/feedback"
import { Modal } from "@/components/data/Modal"
import { StatusBadge } from "@/components/data/StatusBadge"
import {
  ContactForm,
  type ContactFormValues,
  normalizeWhatsAppLink,
} from "@/components/forms/ContactForm"
import { PageContainer } from "@/components/layout/PageContainer"
import { PriorityDataTable } from "@/components/priority/PriorityDataTable"
import { PriorityInput, PrioritySelectField } from "@/components/priority/PriorityForm"
import { usePriorityConfirm } from "@/components/priority/usePriorityConfirm"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

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
  const { confirm, confirmDialog } = usePriorityConfirm()

  async function loadClientsData() {
    try {
      const clientsData = await getClients()
      setClients(clientsData)
    } catch (error) {
      console.error(error)
      notifyError("No se pudieron cargar los clientes", getErrorMessage(error, "Intenta nuevamente."))
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
      notifyError("No se pudieron cargar los contactos", getErrorMessage(error, "Intenta nuevamente."))
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
      notifyWarning("Selecciona un cliente")
      return
    }

    if (!formValues.name.trim()) {
      notifyWarning("Nombre requerido")
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
      notifyError("Error creating contact", getErrorMessage(error, "The contact could not be saved."))
    } finally {
      setCreating(false)
    }
  }

  async function handleSaveContact() {
    if (!editingContact) {
      return
    }

    if (!formValues.name.trim()) {
      notifyWarning("Nombre requerido")
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
      notifyError("Error saving contact", getErrorMessage(error, "The contact could not be updated."))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteContact = useCallback(async (id: string, name: string) => {
    const confirmed = await confirm({
      title: "Eliminar contacto",
      description: `Se eliminara el contacto ${name} de forma permanente del catalogo CRM.`,
      actionLabel: "Eliminar contacto",
      variant: "destructive",
    })

    if (!confirmed) {
      return
    }

    try {
      setDeletingId(id)
      await deleteContact(id)
      await loadContactsData(search, statusFilter)
    } catch (error) {
      console.error(error)
      notifyError("Error deleting contact", getErrorMessage(error, "The contact could not be deleted."))
    } finally {
      setDeletingId(null)
    }
  }, [confirm, search, statusFilter])

  const activeContacts = contacts.filter((contact) => contact.status === "activo").length
  const inactiveContacts = contacts.filter((contact) => contact.status === "ya_no_trabaja").length

  const contactColumns = useMemo<ColumnDef<ContactWithClient>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Nombre",
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-medium text-[var(--brand-navy)]">{row.original.name}</div>
            <div className="text-xs text-[#5B6A7D]">{row.original.position || "Sin puesto"}</div>
          </div>
        ),
      },
      {
        accessorKey: "client_name",
        header: "Cliente",
        cell: ({ row }) =>
          row.original.client_name ? (
            <Link
              href={`/clients/${row.original.client_id}`}
              className="font-medium text-[#2563EB] hover:text-[#1D4ED8]"
            >
              {row.original.client_name}
            </Link>
          ) : (
            "No client"
          ),
      },
      {
        accessorKey: "phone",
        header: "Telefono",
        cell: ({ row }) => {
          const whatsappLink = normalizeWhatsAppLink(row.original.phone || "")
          return (
            <div className="flex flex-col gap-1">
              <span>{row.original.phone || "No disponible"}</span>
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
          )
        },
      },
      {
        accessorKey: "email",
        header: "Correo",
        cell: ({ row }) =>
          row.original.email ? (
            <a href={`mailto:${row.original.email}`} className="font-medium text-[#2563EB] hover:text-[#1D4ED8]">
              {row.original.email}
            </a>
          ) : (
            "No disponible"
          ),
      },
      {
        accessorKey: "status",
        header: "Estatus",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "updated_at",
        header: "Actualizado",
        cell: ({ row }) =>
          row.original.updated_at ? new Date(row.original.updated_at).toLocaleString("es-MX") : "No actualizado",
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => startEdit(row.original)}>
              Editar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => void handleDeleteContact(row.original.id, row.original.name)}
              disabled={deletingId === row.original.id}
            >
              {deletingId === row.original.id ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        ),
      },
    ],
    [deletingId, handleDeleteContact]
  )

  return (
    <PageContainer
      title="Contacts"
      description="Gestion de contactos clave por cuenta con enlaces directos y estatus laboral."
      actions={
        <Button type="button" size="lg" onClick={() => setShowCreateModal(true)}>
          Anadir contacto
        </Button>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#1D4ED8]">
              Total contactos
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">{contacts.length}</div>
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
              {new Set(contacts.map((contact) => contact.client_id)).size}
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-[28px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.95)] p-5 shadow-[0_28px_60px_-46px_rgba(3,10,24,0.45)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--brand-navy)]">Lista de contactos</h2>
              <p className="mt-1 text-sm text-[#5B6A7D]">
                Tooling comercial con filtros, acceso directo y edicion sin salir del workspace.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <PriorityInput
                placeholder="Buscar contacto o cliente"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <PrioritySelectField
                value={statusFilter}
                onValueChange={setStatusFilter}
                placeholder="Filtra por estatus"
                options={[
                  { value: "all", label: "Todos los estatus" },
                  { value: "activo", label: "Activo" },
                  { value: "ya_no_trabaja", label: "Ya no trabaja" },
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
              columns={contactColumns}
              data={contacts}
              emptyTitle={!deferredSearch.trim() && statusFilter === "all" ? "Sin contactos" : "Sin resultados"}
              emptyDescription={
                !deferredSearch.trim() && statusFilter === "all"
                  ? "Todavia no hay contactos. Crea el primero desde este popup."
                  : "No encontramos contactos con los filtros actuales."
              }
            />
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

      {confirmDialog}
    </PageContainer>
  )
}
