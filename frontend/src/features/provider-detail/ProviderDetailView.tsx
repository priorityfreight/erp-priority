"use client"

import { useMemo } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import type { ColDef } from "ag-grid-community"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Modal } from "@/components/data/Modal"
import { StatusBadge } from "@/components/data/StatusBadge"
import { ProviderContactForm } from "@/components/forms/ProviderContactForm"
import { ProviderForm } from "@/components/forms/ProviderForm"
import { ProviderServiceOfferingForm } from "@/components/forms/ProviderServiceOfferingForm"
import { normalizeWhatsAppLink } from "@/components/forms/contact-form-utils"
import { PageContainer } from "@/components/layout/PageContainer"
import { PriorityCollectionTable } from "@/components/priority/collection/PriorityCollectionTable"
import { PriorityEmptyState } from "@/components/priority/PriorityEmptyState"
import { PriorityGrid } from "@/components/priority/grid/PriorityGrid"
import { PriorityHoverPreview } from "@/components/priority/PriorityHoverPreview"
import { PriorityRowActions } from "@/components/priority/PriorityRowActions"
import { PriorityTypography } from "@/components/priority/PriorityTypography"
import { PriorityMetricCard, PriorityMetricStrip, PrioritySummaryRail } from "@/components/priority/PriorityWorkspace"
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

export function ProviderDetailView({
  controller,
}: {
  controller: ProviderDetailController
}) {
  const searchParams = useSearchParams()
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

  const defaultTab = useMemo(() => {
    const requestedTab = searchParams.get("tab")
    return requestedTab === "contacts" || requestedTab === "offerings" ? requestedTab : "profile"
  }, [searchParams])

  if (loading) {
    return (
      <PageContainer title="Proveedor" description="Cargando información del proveedor…">
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
      <PageContainer title="Proveedor" description="No encontramos el proveedor solicitado.">
        <PriorityEmptyState
          title="Proveedor no encontrado"
          description="El registro solicitado no existe o ya no está disponible en el catálogo de pricing."
        />
      </PageContainer>
    )
  }

  const { provider, contacts, serviceOfferings, serviceTransportTypes } = providerDetails

  const serviceGridColumns: ColDef<(typeof serviceOfferings)[number]>[] = [
    {
      field: "service_type",
      headerName: "Servicio",
      flex: 1.2,
      cellRenderer: (params: { data?: (typeof serviceOfferings)[number] }) => {
        const offering = params.data

        if (!offering) {
          return null
        }

        return (
          <div className="flex h-full items-center py-2">
            <div className="space-y-1">
              <div className="font-medium text-[var(--brand-navy)]">{offering.service_type}</div>
              <Badge variant="secondary">{offering.transport_type}</Badge>
            </div>
          </div>
        )
      },
    },
    {
      field: "transport_type",
      headerName: "Transporte",
      flex: 0.9,
    },
    {
      field: "terms_and_conditions",
      headerName: "Términos y condiciones",
      flex: 1.8,
      valueGetter: ({ data }) => data?.terms_and_conditions || "No definido",
    },
    {
      headerName: "Acciones",
      width: 160,
      sortable: false,
      filter: false,
      cellRenderer: (params: { data?: (typeof serviceOfferings)[number] }) => {
        const offering = params.data

        if (!offering) {
          return null
        }

        return (
          <div className="flex h-full items-center justify-end">
            <PriorityRowActions
              label={`Acciones de ${offering.service_type}`}
              actions={[
                {
                  label: "Editar",
                  onSelect: () => startEditOffering(offering),
                },
                {
                  label: deletingOfferingId === offering.id ? "Eliminando..." : "Eliminar",
                  onSelect: () => void handleDeleteOffering(offering.id),
                  disabled: deletingOfferingId === offering.id,
                  destructive: true,
                },
              ]}
            />
          </div>
        )
      },
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
            { label: "Teléfono", value: row.original.phone || "No disponible" },
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
      description="Workspace de pricing para revisar empresa, contactos, términos y cobertura del proveedor."
      actions={
        <ButtonGroup className="flex flex-wrap items-center gap-3 bg-transparent p-0">
          <Button asChild type="button" variant="outline" size="lg">
            <Link href="/pricing/providers">Volver</Link>
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => setShowEditModal(true)}>
            Editar información
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            onClick={() => void handleDeleteProvider()}
            disabled={deletingProvider}
          >
            {deletingProvider ? "Eliminando…" : "Eliminar proveedor"}
          </Button>
        </ButtonGroup>
      }
      meta={
        <div className="flex flex-wrap items-center gap-3 rounded-[20px] border border-white/10 bg-white/8 px-3 py-2 text-sm text-[var(--brand-light-gray)]">
          <StatusBadge status={status} />
          <select
            className="rounded-xl border border-white/10 bg-[rgba(255,255,255,0.08)] px-3 py-2 text-sm outline-none focus:border-[rgba(179,58,91,0.45)]"
            value={status}
            onChange={(event) => void handleStatusChange(event.target.value)}
            disabled={savingStatus}
          >
            <option value="en_proceso_de_alta">En proceso de alta</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
          <span className="text-xs text-[var(--brand-soft-gray)]">
            {savingStatus ? "Guardando estatus…" : "Seguimiento del proveedor"}
          </span>
        </div>
      }
    >
      <div className="space-y-8">
        <PrioritySummaryRail className="xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
          <div>
            <PriorityTypography variant="eyebrow">Proveedor</PriorityTypography>
            <PriorityTypography as="h2" variant="sectionTitle" className="mt-2">
              Empresa, contactos y servicios ofertados en un solo espacio de trabajo.
            </PriorityTypography>
            <PriorityTypography variant="bodyMuted" className="mt-2">
              Diseñado para que pricing decida rápido: quién cotiza, bajo qué términos y con qué contacto directo.
            </PriorityTypography>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#5B6A7D]">
              <Badge variant="outline">{provider.provider_type || "Sin clasificar"}</Badge>
              <span>{provider.company_email || "Sin correo corporativo"}</span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[20px] border border-[rgba(11,31,59,0.08)] bg-[rgba(11,31,59,0.03)] p-4">
              <PriorityTypography variant="eyebrow">Crédito</PriorityTypography>
              <PriorityTypography variant="body" className="mt-2 font-medium">
                {provider.credit_active
                  ? `${provider.credit_days || 0} días y ${provider.credit_amount ? `$${provider.credit_amount.toLocaleString()}` : "monto pendiente"}`
                  : "Sin crédito activo configurado."}
              </PriorityTypography>
            </div>
          </div>
        </PrioritySummaryRail>

        <PriorityMetricStrip>
          <PriorityMetricCard label="Contactos" value={String(contacts.length)} helper="Directos para pricing y negociación." tone="info" />
          <PriorityMetricCard label="Servicios" value={String(serviceOfferings.length)} helper="Ofertas habilitadas por servicio y transporte." tone="success" />
          <PriorityMetricCard label="Crédito" value={provider.credit_active ? "Activo" : "Sin crédito"} helper={provider.credit_days ? `${provider.credit_days} días de crédito configurados.` : "Crédito aún no definido."} tone="warning" />
          <PriorityMetricCard label="Ubicación" value={provider.country || "Sin país"} helper={provider.city || provider.city_unlocode || "Ciudad no definida"} tone="default" />
        </PriorityMetricStrip>

        <Tabs key={defaultTab} defaultValue={defaultTab} className="gap-5">
          <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.86)] px-4 py-3 shadow-[0_20px_40px_-34px_rgba(3,10,24,0.26)]">
            <TabsList variant="line" className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="profile">Perfil</TabsTrigger>
              <TabsTrigger value="contacts">Contactos</TabsTrigger>
              <TabsTrigger value="offerings">Servicios ofertados</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="profile" className="space-y-6">
            <InfoCard title="Información de la empresa">
              <InfoField label="Nombre" value={provider.name} />
              <InfoField label="RFC" value={provider.tax_id} />
              <InfoField label="Tipo de proveedor" value={provider.provider_type} />
            </InfoCard>

            <InfoCard title="Ubicación de la empresa">
              <InfoField label="Dirección" value={provider.full_address} wide />
              <InfoField label="Código postal" value={provider.postal_code} />
              <InfoField label="UN/LOCODE" value={provider.city_unlocode} />
              <InfoField label="Ciudad" value={provider.city} />
              <InfoField label="País" value={provider.country} />
            </InfoCard>

            <InfoCard title="Información de contacto">
              <InfoField label="Teléfono corporativo" value={provider.corporate_phone} />
              <InfoField label="Correo de la empresa" value={provider.company_email} />
              <InfoField label="Página web" value={provider.website} />
            </InfoCard>

            <InfoCard title="Crédito y cobranza">
              <InfoField label="Crédito activo" value={provider.credit_active ? "Sí" : "No"} />
              <InfoField
                label="Monto de crédito"
                value={provider.credit_amount !== null ? `$${provider.credit_amount.toLocaleString()}` : null}
              />
              <InfoField
                label="Días de crédito"
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
                    Contactos directos para pricing, seguimiento y negociación.
                  </PriorityTypography>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    resetContactForm()
                    setShowContactModal(true)
                  }}
                >
                  Añadir contacto
                </Button>
              </div>

              <PriorityCollectionTable
                columns={contactColumns}
                data={contacts}
                emptyTitle="No hay contactos registrados"
                emptyDescription="Agrega el primer contacto operativo o comercial del proveedor desde este espacio de trabajo."
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
                    Cada fila representa un servicio habilitado y sus términos comerciales para pricing.
                  </PriorityTypography>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    resetOfferingForm()
                    setShowOfferingModal(true)
                  }}
                >
                  Añadir servicio
                </Button>
              </div>

              <PriorityGrid
                mode="hybrid"
                rowData={serviceOfferings}
                columnDefs={serviceGridColumns}
                emptyTitle="No hay servicios configurados"
                emptyDescription="Agrega el primer servicio del proveedor para habilitar su uso desde pricing."
                height={420}
                rowHeight={76}
                renderMobileCard={(offering) => (
                  <div className="space-y-3 rounded-[22px] border border-[var(--border-subtle)] bg-white p-4 shadow-[0_20px_40px_-34px_rgba(3,10,24,0.26)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-[var(--brand-navy)]">{offering.service_type}</div>
                        <div className="mt-1 text-sm text-[#5B6A7D]">{offering.transport_type}</div>
                      </div>
                      <PriorityRowActions
                        label={`Acciones de ${offering.service_type}`}
                        actions={[
                          {
                            label: "Editar",
                            onSelect: () => startEditOffering(offering),
                          },
                          {
                            label: deletingOfferingId === offering.id ? "Eliminando..." : "Eliminar",
                            onSelect: () => void handleDeleteOffering(offering.id),
                            disabled: deletingOfferingId === offering.id,
                            destructive: true,
                          },
                        ]}
                      />
                    </div>
                    <div className="rounded-[18px] bg-[rgba(11,31,59,0.04)] px-3 py-3 text-sm text-[#334155]">
                      {offering.terms_and_conditions || "No definido"}
                    </div>
                  </div>
                )}
              />
            </section>
          </TabsContent>
        </Tabs>
      </div>

      {showEditModal ? (
        <Modal
          title="Editar proveedor"
          size="workspace"
          onClose={() => {
            if (!savingProvider) {
              setShowEditModal(false)
              syncProviderForm(provider)
            }
          }}
        >
          <ProviderForm
            title="Información del proveedor"
            description="Edita la información base de la empresa."
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
          title={editingContact ? "Editar contacto de proveedor" : "Añadir contacto de proveedor"}
          size="standard"
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
          title={editingOffering ? "Editar servicio ofrecido" : "Añadir servicio ofrecido"}
          size="standard"
          onClose={() => {
            if (!savingOffering) {
              setShowOfferingModal(false)
              resetOfferingForm()
            }
          }}
        >
          <ProviderServiceOfferingForm
            title={editingOffering ? "Editar servicio" : "Nuevo servicio"}
            description="Relaciona un servicio del catálogo maestro con sus términos."
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
