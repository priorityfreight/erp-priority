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
} from "@/components/forms/ContactForm"
import { normalizeContactStatus, normalizeWhatsAppLink } from "@/components/forms/contact-form-utils"
import { PageContainer } from "@/components/layout/PageContainer"
import { PriorityCollectionTable } from "@/components/priority/collection/PriorityCollectionTable"
import { PriorityEmptyState } from "@/components/priority/PriorityEmptyState"
import { PriorityInput, PrioritySelectField } from "@/components/priority/PriorityForm"
import { PriorityMetricCard, PriorityMetricStrip } from "@/components/priority/PriorityWorkspace"
import { PriorityRowActions } from "@/components/priority/PriorityRowActions"
import { PriorityToolbar } from "@/components/priority/PriorityToolbar"
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
  const [clientFilter, setClientFilter] = useState("all")
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
      status: normalizeContactStatus(contact.status),
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
      notifyError("No se pudo crear el contacto", getErrorMessage(error, "No fue posible guardar el contacto."))
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
      notifyError("No se pudo guardar el contacto", getErrorMessage(error, "No fue posible actualizar el contacto."))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteContact = useCallback(async (id: string, name: string) => {
    const confirmed = await confirm({
      title: "Eliminar contacto",
      description: `Se eliminará el contacto ${name} de forma permanente del catálogo CRM.`,
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
      notifyError("No se pudo eliminar el contacto", getErrorMessage(error, "No fue posible eliminar el contacto."))
    } finally {
      setDeletingId(null)
    }
  }, [confirm, search, statusFilter])

  const filteredContacts = useMemo(() => {
    if (clientFilter === "all") {
      return contacts
    }

    return contacts.filter((contact) => contact.client_id === clientFilter)
  }, [clientFilter, contacts])

  const activeContacts = filteredContacts.filter((contact) => contact.status === "activo").length
  const inactiveContacts = filteredContacts.filter((contact) => contact.status === "ya_no_trabaja").length
  const hasActiveFilters =
    Boolean(deferredSearch.trim()) || statusFilter !== "all" || clientFilter !== "all"
  const isWorkspaceEmpty = !loading && contacts.length === 0 && !hasActiveFilters

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
            "Sin cliente"
          ),
      },
      {
        accessorKey: "phone",
        header: "Teléfono",
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
          <div className="flex justify-end">
            <PriorityRowActions
              label={`Acciones de ${row.original.name}`}
              actions={[
                {
                  label: "Editar",
                  onSelect: () => startEdit(row.original),
                },
                {
                  label: deletingId === row.original.id ? "Eliminando…" : "Eliminar",
                  onSelect: () => void handleDeleteContact(row.original.id, row.original.name),
                  disabled: deletingId === row.original.id,
                  destructive: true,
                },
              ]}
            />
          </div>
        ),
      },
    ],
    [deletingId, handleDeleteContact]
  )

  return (
    <PageContainer
      density="compact"
      title="Contactos"
      description="Gestión de contactos clave por cuenta con enlaces directos y estatus laboral."
      actions={
        !isWorkspaceEmpty ? (
          <Button type="button" size="lg" onClick={() => setShowCreateModal(true)}>
            Añadir contacto
          </Button>
        ) : null
      }
    >
      <div className={isWorkspaceEmpty ? "space-y-4" : "space-y-8"}>
        {!isWorkspaceEmpty ? (
        <PriorityMetricStrip>
          <PriorityMetricCard label="Total contactos" value={filteredContacts.length} helper={`${contacts.length} registros cargados.`} tone="info" />
          <PriorityMetricCard label="Activos" value={activeContacts} helper="Contactos listos para operar." tone="success" />
          <PriorityMetricCard label="Ya no trabaja" value={inactiveContacts} helper="Registros retenidos por historial." tone="warning" />
          <PriorityMetricCard
            label="Clientes cubiertos"
            value={new Set(contacts.map((contact) => contact.client_id)).size}
            helper="Cuentas con al menos un punto de contacto."
            tone="default"
          />
        </PriorityMetricStrip>
        ) : null}

        <section className={isWorkspaceEmpty ? "workspace-panel space-y-3 rounded-[24px] p-4" : "workspace-panel space-y-4 rounded-[28px] p-5"}>
          {!isWorkspaceEmpty ? (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--brand-navy)]">Lista de contactos</h2>
                <p className="mt-1 text-sm text-[#5B6A7D]">
                  Workspace comercial con filtros, acceso directo y edición sin salir de la pantalla.
                </p>
              </div>
              <PriorityToolbar className="w-full sm:max-w-2xl">
                <PriorityInput
                  placeholder="Buscar contacto o cliente…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="min-w-0 flex-1"
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
                <PrioritySelectField
                  value={clientFilter}
                  onValueChange={setClientFilter}
                  placeholder="Filtra por cliente"
                  options={[
                    { value: "all", label: "Todos los clientes" },
                    ...clients.map((client) => ({ value: client.id, label: client.company_name })),
                  ]}
                />
              </PriorityToolbar>
            </div>
          ) : (
            <>
              <PriorityToolbar density="compact" className="w-full xl:max-w-4xl">
                <PriorityInput
                  placeholder="Buscar contacto o cliente…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="min-w-0 flex-1"
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
                <PrioritySelectField
                  value={clientFilter}
                  onValueChange={setClientFilter}
                  placeholder="Filtra por cliente"
                  options={[
                    { value: "all", label: "Todos los clientes" },
                    ...clients.map((client) => ({ value: client.id, label: client.company_name })),
                  ]}
                />
              </PriorityToolbar>
              <PriorityEmptyState
                density="compact"
                title="Sin contactos"
                description="Agrega el primer punto de contacto para que comercial pueda llamar, escribir o actualizar el estatus desde aquí mismo."
                action={
                  <Button type="button" onClick={() => setShowCreateModal(true)}>
                    Añadir contacto
                  </Button>
                }
              />
            </>
          )}

          {!isWorkspaceEmpty ? (
          <>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 rounded-[20px]" />
                <Skeleton className="h-12 rounded-[20px]" />
                <Skeleton className="h-12 rounded-[20px]" />
              </div>
            ) : (
              <PriorityCollectionTable
                columns={contactColumns}
                data={filteredContacts}
                emptyTitle={
                  !deferredSearch.trim() && statusFilter === "all" && clientFilter === "all"
                    ? "Sin contactos"
                    : "Sin resultados"
                }
                emptyDescription={
                  !deferredSearch.trim() && statusFilter === "all" && clientFilter === "all"
                    ? "Todavía no hay contactos. Crea el primero desde este modal."
                    : "No encontramos contactos con los filtros actuales."
                }
              />
            )}
          </>
          ) : null}
        </section>
      </div>

      {showCreateModal ? (
        <Modal
          title="Añadir contacto"
          description="Captura los datos del contacto con validaciones básicas y enlaces futuros."
          size="standard"
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
          size="standard"
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
