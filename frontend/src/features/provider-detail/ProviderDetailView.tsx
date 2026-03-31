"use client"

import { type ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { Modal } from "@/components/data/Modal"
import { StatusBadge } from "@/components/data/StatusBadge"
import { ProviderContactForm } from "@/components/forms/ProviderContactForm"
import { ProviderForm } from "@/components/forms/ProviderForm"
import { ProviderServiceOfferingForm } from "@/components/forms/ProviderServiceOfferingForm"
import { normalizeWhatsAppLink } from "@/components/forms/ContactForm"
import { PageContainer } from "@/components/layout/PageContainer"
import { PriorityDataTable } from "@/components/priority/PriorityDataTable"
import { PriorityEmptyState } from "@/components/priority/PriorityEmptyState"
import { PriorityHoverPreview } from "@/components/priority/PriorityHoverPreview"
import { PriorityRowActions } from "@/components/priority/PriorityRowActions"
import { PriorityTypography } from "@/components/priority/PriorityTypography"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ButtonGroup } from "@/components/ui/button-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useProviderDetailController } from "@/features/provider-detail/useProviderDetailController"
import { InfoCard, InfoField } from "@/features/provider-detail/helpers"

type ProviderDetailController = ReturnType<typeof useProviderDetailController>

function LoadingCard() {
  return <Skeleton className="h-28 rounded-[24px]" />
}

function HeaderMetric({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper: string
}) {
  return (
    <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.92)] p-5 shadow-[0_24px_48px_-36px_rgba(3,10,24,0.28)]">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5B6A7D]">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-[var(--brand-navy)]">{value}</div>
      <div className="mt-2 text-sm text-[#5B6A7D]">{helper}</div>
    </div>
  )
}

export function ProviderDetailView({
  controller,
}: {
  controller: ProviderDetailController
}) {
  const {
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
    handleSaveProvider,
    handleStatusChange,
    handleDeleteProvider,
    handleSaveContact,
    startEditContact,
    handleDeleteContact,
    handleSaveOffering,
    startEditOffering,
    handleDeleteOffering,
  } = controller

  if (loading) {
    return (
      <PageContainer title="Provider detail" description="Loading provider information...">
        <div className="space-y-4">
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
        </div>
      </PageContainer>
    )
  }

  if (!providerDetails) {
    return (
      <PageContainer title="Provider detail" description="The requested provider could not be found.">
        <PriorityEmptyState
          title="Proveedor no encontrado"
          description="El registro solicitado no existe o ya no está disponible en el catalogo de pricing."
        />
      </PageContainer>
    )
  }

  const { provider, contacts, serviceOfferings, serviceTransportTypes } = providerDetails

  const serviceColumns: ColumnDef<(typeof serviceOfferings)[number]>[] = [
    {
      accessorKey: "service_type",
      header: "Servicio",
      cell: ({ row }) => (
        <PriorityHoverPreview
          eyebrow="Servicio del proveedor"
          title={row.original.service_type}
          description="Configuracion comercial habilitada para pricing."
          lines={[
            { label: "Transporte", value: row.original.transport_type },
            { label: "Terminos", value: row.original.terms_and_conditions || "No definido" },
          ]}
          trigger={
            <div className="space-y-1">
              <div className="font-medium text-[var(--brand-navy)]">{row.original.service_type}</div>
              <Badge variant="secondary">{row.original.transport_type}</Badge>
            </div>
          }
        />
      ),
    },
    {
      accessorKey: "terms_and_conditions",
      header: "Terminos y condiciones",
      cell: ({ row }) => row.original.terms_and_conditions || "No definido",
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <PriorityRowActions
            label={`Acciones de ${row.original.service_type}`}
            actions={[
              {
                label: "Editar",
                onSelect: () => startEditOffering(row.original),
              },
              {
                label: deletingOfferingId === row.original.id ? "Eliminando..." : "Eliminar",
                onSelect: () => void handleDeleteOffering(row.original.id),
                disabled: deletingOfferingId === row.original.id,
                destructive: true,
              },
            ]}
          />
        </div>
      ),
    },
  ]

  const contactColumns: ColumnDef<(typeof contacts)[number]>[] = [
    {
      accessorKey: "name",
      header: "Contacto",
      cell: ({ row }) => (
        <PriorityHoverPreview
          eyebrow="Contacto del proveedor"
          title={row.original.name}
          description={row.original.position || "Sin puesto definido"}
          lines={[
            { label: "Correo", value: row.original.email || "No disponible" },
            { label: "Telefono", value: row.original.phone || "No disponible" },
            { label: "LinkedIn", value: row.original.linkedin_url || "No disponible" },
          ]}
          trigger={
            <div className="space-y-1">
              <div className="font-medium text-[var(--brand-navy)]">{row.original.name}</div>
              <div className="text-xs text-[#5B6A7D]">{row.original.position || "Sin puesto definido"}</div>
            </div>
          }
        />
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
      accessorKey: "linkedin_url",
      header: "LinkedIn",
      cell: ({ row }) =>
        row.original.linkedin_url ? (
          <a
            href={row.original.linkedin_url}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[#2563EB] hover:text-[#1D4ED8]"
          >
            LinkedIn
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
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <PriorityRowActions
            label={`Acciones de ${row.original.name}`}
            actions={[
              {
                label: "Editar",
                onSelect: () => startEditContact(row.original),
              },
              {
                label: deletingContactId === row.original.id ? "Eliminando..." : "Eliminar",
                onSelect: () => void handleDeleteContact(row.original.id),
                disabled: deletingContactId === row.original.id,
                destructive: true,
              },
            ]}
          />
        </div>
      ),
    },
  ]

  return (
    <PageContainer
      title={provider.name}
      description="Pricing provider profile with services, terms, and direct supplier contacts."
      actions={
        <ButtonGroup className="flex flex-wrap items-center gap-3 bg-transparent p-0">
          <Button asChild type="button" variant="outline" size="lg">
            <Link href="/pricing/providers">Volver</Link>
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => setShowEditModal(true)}>
            Editar informacion
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            onClick={() => void handleDeleteProvider()}
            disabled={deletingProvider}
          >
            {deletingProvider ? "Deleting..." : "Eliminar proveedor"}
          </Button>
        </ButtonGroup>
      }
    >
      <div className="space-y-8">
        <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(245,247,250,0.96)_100%)] p-6 shadow-[0_28px_60px_-42px_rgba(3,10,24,0.34)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#64748B]">
                Seguimiento del proveedor
              </div>
              <div className="mt-2 text-3xl font-semibold text-[var(--brand-navy)]">{provider.name}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#5B6A7D]">
                <Badge variant="outline">{provider.provider_type || "Sin clasificar"}</Badge>
                <span>{provider.company_email || "Sin correo corporativo"}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={status} />
              <select
                className="rounded-xl border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
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

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <HeaderMetric
            label="Contactos"
            value={String(contacts.length)}
            helper="Directos para pricing, negociacion y seguimiento."
          />
          <HeaderMetric
            label="Servicios"
            value={String(serviceOfferings.length)}
            helper="Ofertas habilitadas con terminos y transporte."
          />
          <HeaderMetric
            label="Credito"
            value={provider.credit_active ? "Activo" : "Sin credito"}
            helper={
              provider.credit_days
                ? `${provider.credit_days} dias de credito configurados`
                : "Credito aun no definido"
            }
          />
          <HeaderMetric
            label="Ubicacion"
            value={provider.country || "Sin pais"}
            helper={provider.city || provider.city_unlocode || "Ciudad no definida"}
          />
        </section>

        <Tabs defaultValue="profile" className="gap-5">
          <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.86)] px-4 py-3 shadow-[0_20px_40px_-34px_rgba(3,10,24,0.26)]">
            <TabsList variant="line" className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="profile">Perfil</TabsTrigger>
              <TabsTrigger value="contacts">Contactos</TabsTrigger>
              <TabsTrigger value="offerings">Service Offerings</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="profile" className="space-y-6">
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
          </TabsContent>

          <TabsContent value="contacts" className="space-y-6">
            <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.92)] p-6 shadow-[0_28px_56px_-42px_rgba(3,10,24,0.34)]">
              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <PriorityTypography as="h3" variant="cardTitle">
                    Contactos de proveedor
                  </PriorityTypography>
                  <PriorityTypography variant="bodyMuted" className="mt-1">
                    Contactos directos para pricing, seguimiento y negociacion.
                  </PriorityTypography>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    resetContactForm()
                    setShowContactModal(true)
                  }}
                >
                  Anadir contacto
                </Button>
              </div>

              <PriorityDataTable
                columns={contactColumns}
                data={contacts}
                emptyTitle="No hay contactos registrados"
                emptyDescription="Agrega el primer contacto operativo o comercial del proveedor desde este workspace."
              />
            </section>
          </TabsContent>

          <TabsContent value="offerings" className="space-y-6">
            <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.92)] p-6 shadow-[0_28px_56px_-42px_rgba(3,10,24,0.34)]">
              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <PriorityTypography as="h3" variant="cardTitle">
                    Tipos de servicio que ofrece
                  </PriorityTypography>
                  <PriorityTypography variant="bodyMuted" className="mt-1">
                    Cada fila representa un servicio habilitado y sus terminos.
                  </PriorityTypography>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    resetOfferingForm()
                    setShowOfferingModal(true)
                  }}
                >
                  Anadir servicio
                </Button>
              </div>

              <PriorityDataTable
                columns={serviceColumns}
                data={serviceOfferings}
                emptyTitle="No hay servicios configurados"
                emptyDescription="Agrega el primer servicio del proveedor para habilitar su uso desde pricing."
              />
            </section>
          </TabsContent>
        </Tabs>
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

      {confirmDialog}
    </PageContainer>
  )
}
