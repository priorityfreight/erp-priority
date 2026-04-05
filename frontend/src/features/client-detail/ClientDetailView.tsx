"use client"

import { type ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { Modal } from "@/components/data/Modal"
import { StatusBadge } from "@/components/data/StatusBadge"
import { PriorityCollectionTable } from "@/components/priority/collection/PriorityCollectionTable"
import { PriorityHoverPreview } from "@/components/priority/PriorityHoverPreview"
import { PriorityRowActions } from "@/components/priority/PriorityRowActions"
import { PriorityTypography } from "@/components/priority/PriorityTypography"
import { PriorityMetricCard, PriorityMetricStrip, PrioritySummaryRail } from "@/components/priority/PriorityWorkspace"
import { ClientForm } from "@/components/forms/ClientForm"
import { ClientLogisticsPartyForm } from "@/components/forms/ClientLogisticsPartyForm"
import { ContactForm } from "@/components/forms/ContactForm"
import { normalizeContactStatus } from "@/components/forms/contact-form-utils"
import { OpportunityForm } from "@/components/forms/OpportunityForm"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  InfoCard,
  InfoField,
} from "@/features/client-detail/helpers"
import { useClientDetailController } from "@/features/client-detail/useClientDetailController"

type ClientDetailController = ReturnType<typeof useClientDetailController>

export function ClientDetailView({
  controller,
}: {
  controller: ClientDetailController
}) {
  const {
    clientDetails,
    savingClient,
    creatingContact,
    creatingOpportunity,
    creatingLogisticsParty,
    deletingContactId,
    deletingLogisticsPartyId,
    deletingOpportunityId,
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
    handleSaveClient,
    handleCreateContact,
    handleCreateOpportunity,
    handleCreateLogisticsParty,
    handleDeleteContact,
    handleDeleteOpportunity,
    handleDeleteLogisticsParty,
  } = controller

  if (!clientDetails) {
    return null
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
  const accountOwner = users.find((user) => user.id === client.account_owner_id)
  const accountOwnerName = accountOwner
    ? [accountOwner.first_name, accountOwner.last_name].filter(Boolean).join(" ")
    : null

  const contactColumns: ColumnDef<(typeof contacts)[number]>[] = [
    {
      accessorKey: "name",
      header: "Contacto",
      cell: ({ row }) => (
        <PriorityHoverPreview
          eyebrow="Contacto del cliente"
          title={row.original.name}
          description={row.original.position || "Puesto no definido"}
          lines={[
            { label: "Correo", value: row.original.email || "No disponible" },
            { label: "Teléfono", value: row.original.phone || "No disponible" },
            { label: "LinkedIn", value: row.original.linkedin_url || "No disponible" },
          ]}
          trigger={<span className="font-medium text-[var(--brand-navy)]">{row.original.name}</span>}
        />
      ),
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
      accessorKey: "phone",
      header: "Teléfono",
      cell: ({ row }) => row.original.phone || "No disponible",
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
            Perfil
          </a>
        ) : (
          "No disponible"
        ),
    },
    {
      accessorKey: "position",
      header: "Puesto",
      cell: ({ row }) => row.original.position || "No disponible",
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
                label: deletingContactId === row.original.id ? "Eliminando..." : "Eliminar",
                onSelect: () => handleDeleteContact(row.original.id),
                disabled: deletingContactId === row.original.id,
                destructive: true,
              },
            ]}
          />
        </div>
      ),
    },
  ]

  const logisticsColumns: ColumnDef<(typeof logistics_parties)[number]>[] = [
    {
      accessorKey: "party_type",
      header: "Tipo",
      cell: ({ row }) => logisticsPartyTypeLabel[row.original.party_type] || row.original.party_type,
    },
    {
      accessorKey: "name",
      header: "Nombre",
      cell: ({ row }) => <span className="font-medium text-[var(--brand-navy)]">{row.original.name}</span>,
    },
    {
      id: "location",
      header: "Ubicación",
      cell: ({ row }) =>
        [row.original.city, row.original.country, row.original.postal_code].filter(Boolean).join(" · ") ||
        row.original.full_address ||
        "No disponible",
    },
    {
      accessorKey: "city_unlocode",
      header: "UN/LOCODE",
      cell: ({ row }) => row.original.city_unlocode || "No disponible",
    },
    {
      accessorKey: "contact_name",
      header: "Contacto",
      cell: ({ row }) => row.original.contact_name || "No disponible",
    },
    {
      accessorKey: "contact_email",
      header: "Correo",
      cell: ({ row }) => row.original.contact_email || "No disponible",
    },
    {
      accessorKey: "contact_phone",
      header: "Número",
      cell: ({ row }) => row.original.contact_phone || "No disponible",
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
                label: deletingLogisticsPartyId === row.original.id ? "Eliminando..." : "Eliminar",
                onSelect: () => handleDeleteLogisticsParty(row.original.id),
                disabled: deletingLogisticsPartyId === row.original.id,
                destructive: true,
              },
            ]}
          />
        </div>
      ),
    },
  ]

  const opportunityColumns: ColumnDef<(typeof opportunities)[number]>[] = [
    {
      accessorKey: "title",
      header: "Título",
      cell: ({ row }) => (
        <PriorityHoverPreview
          eyebrow="Oportunidad"
          title={row.original.title || "Oportunidad sin título"}
          description={
            [row.original.service_type, row.original.transport_type].filter(Boolean).join(" / ") || "No definido"
          }
          lines={[
            {
              label: "Ruta",
              value:
                row.original.origin && row.original.destination
                  ? `${row.original.origin} → ${row.original.destination}`
                  : "No disponible",
            },
            {
              label: "Valor estimado",
              value:
                row.original.estimated_value != null
                  ? `$${row.original.estimated_value.toLocaleString()}`
                  : "Sin valor",
            },
          ]}
          trigger={
            <Link href={`/opportunities/${row.original.id}`} className="font-medium text-[#111827] hover:text-[#1D4ED8]">
              {row.original.title || "Oportunidad sin título"}
            </Link>
          }
        />
      ),
    },
    {
      id: "service",
      header: "Servicio",
      cell: ({ row }) =>
        [row.original.service_type, row.original.transport_type].filter(Boolean).join(" / ") || "No definido",
    },
    {
      accessorKey: "status",
      header: "Estatus",
      cell: ({ row }) => row.original.status || "Sin estatus",
    },
    {
      id: "lane",
      header: "Ruta",
      cell: ({ row }) =>
        row.original.origin && row.original.destination
          ? `${row.original.origin} → ${row.original.destination}`
          : "No disponible",
    },
    {
      accessorKey: "estimated_value",
      header: "Valor",
      cell: ({ row }) =>
        row.original.estimated_value != null ? `$${row.original.estimated_value.toLocaleString()}` : "Sin valor",
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <PriorityRowActions
            label={`Acciones de ${row.original.title || "oportunidad"}`}
            actions={[
              {
                label: deletingOpportunityId === row.original.id ? "Eliminando..." : "Eliminar",
                onSelect: () => handleDeleteOpportunity(row.original.id),
                disabled: deletingOpportunityId === row.original.id,
                destructive: true,
              },
            ]}
          />
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="space-y-8">
        <PrioritySummaryRail className="xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
          <div>
            <PriorityTypography variant="eyebrow">Cuenta cliente</PriorityTypography>
            <PriorityTypography as="h2" variant="sectionTitle" className="mt-2">
              Cuenta, contactos y actividad comercial visibles desde una sola superficie.
            </PriorityTypography>
            <PriorityTypography variant="bodyMuted" className="mt-2">
              Diseñado para que cualquier ejecutivo entienda rápido el estado del cliente, sus registros operativos y el pipeline asociado.
            </PriorityTypography>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[20px] border border-[rgba(11,31,59,0.08)] bg-[rgba(11,31,59,0.03)] p-4">
              <PriorityTypography variant="eyebrow">Responsable comercial</PriorityTypography>
              <PriorityTypography variant="body" className="mt-2 font-medium">
                {accountOwnerName || "Sin responsable asignado"}
              </PriorityTypography>
              <div className="mt-2">
                <StatusBadge status={status} />
              </div>
            </div>
          </div>
        </PrioritySummaryRail>

        <PriorityMetricStrip className="xl:grid-cols-5">
          <PriorityMetricCard label="Contactos" value={String(contacts.length)} helper="Personas activas para seguimiento comercial." tone="info" />
          <PriorityMetricCard label="Registros operativos" value={String(logistics_parties.length)} helper="Consignee, shipper y AA vinculados." tone="default" />
          <PriorityMetricCard label="Oportunidades" value={String(opportunities.length)} helper="Histórico y pipeline vivo de la cuenta." tone="warning" />
          <PriorityMetricCard label="Pipeline" value={`$${pipelineValue.toLocaleString()}`} helper="Valor estimado acumulado." tone="spotlight" />
          <PriorityMetricCard label="Estatus" value={client.status || "Sin estatus"} helper="Seguimiento comercial actual." tone="success" />
        </PriorityMetricStrip>

        <InfoCard title="Información de la empresa">
          <InfoField label="Nombre" value={client.company_name} />
          <InfoField label="RFC" value={client.tax_id} />
          <InfoField label="Responsable de cuenta" value={accountOwnerName} />
          <InfoField label="Industria" value={client.industry} />
          <InfoField label="Estatus" value={client.status} />
        </InfoCard>

        <InfoCard title="Ubicación de la empresa">
          <InfoField label="Dirección" value={client.full_address} wide />
          <InfoField label="Código postal" value={client.postal_code} />
          <InfoField label="Ciudad" value={client.city} />
          <InfoField label="UN/LOCODE" value={client.city_unlocode} />
          <InfoField label="País" value={client.country} />
        </InfoCard>

        <InfoCard title="Información de contacto">
          <InfoField label="Página web" value={client.website} />
          <InfoField label="Teléfono corporativo" value={client.corporate_phone} />
        </InfoCard>

        {backendMode !== "canonical" ? (
          <section className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
            La ficha principal del cliente ya vive en el backend canónico. Los campos extendidos de
            perfil siguen resguardándose localmente en este navegador hasta terminar la migración del
            esquema CRM remoto.
          </section>
        ) : null}

        <section className="workspace-panel space-y-4 rounded-[28px] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">Relacionados del cliente</h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                    Consulta y administra contactos, consignee, shippers y oportunidades desde una
                    sola zona.
              </p>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "contacts" | "logistics" | "opportunities")
            }
            className="space-y-4"
          >
            <TabsList className="h-auto w-full flex-wrap justify-start rounded-[22px] border border-[rgba(144,158,174,0.16)] bg-[rgba(11,31,59,0.04)] p-1.5">
              <TabsTrigger value="contacts" className="rounded-[16px] px-4 py-2.5 text-sm font-medium">
                Contactos ({contacts.length})
              </TabsTrigger>
              <TabsTrigger value="logistics" className="rounded-[16px] px-4 py-2.5 text-sm font-medium">
                Consignee y Shippers ({logistics_parties.length})
              </TabsTrigger>
              <TabsTrigger value="opportunities" className="rounded-[16px] px-4 py-2.5 text-sm font-medium">
                Oportunidades ({opportunities.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="contacts" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <PriorityTypography as="h3" variant="cardTitle">
                    Contactos
                  </PriorityTypography>
                  <PriorityTypography variant="bodyMuted" className="mt-1">
                    Personas vinculadas actualmente a esta empresa.
                  </PriorityTypography>
                </div>
                <Button type="button" onClick={() => setShowContactModal(true)}>
                  Añadir contacto
                </Button>
              </div>

              <PriorityCollectionTable
                columns={contactColumns}
                data={contacts}
                emptyTitle="Sin contactos vinculados"
                emptyDescription="Todavía no hay contactos asociados a esta empresa. Agrega el primer contacto para dejar listo el seguimiento comercial."
              />
            </TabsContent>

            <TabsContent value="logistics" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <PriorityTypography as="h3" variant="cardTitle">
                    Consignee y Shippers
                  </PriorityTypography>
                  <PriorityTypography variant="bodyMuted" className="mt-1">
                    Registros operativos del cliente para shipper, consignee y AA.
                  </PriorityTypography>
                </div>
                <Button type="button" onClick={() => setShowLogisticsPartyModal(true)}>
                  Añadir registro
                </Button>
              </div>

              <PriorityCollectionTable
                columns={logisticsColumns}
                data={logistics_parties}
                emptyTitle="Sin registros logísticos"
                emptyDescription="Aún no hay consignee, shipper o agentes aduanales vinculados al cliente. Agrega el primer registro operativo para acelerar futuras oportunidades."
              />
            </TabsContent>

            <TabsContent value="opportunities" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <PriorityTypography as="h3" variant="cardTitle">
                    Oportunidades
                  </PriorityTypography>
                  <PriorityTypography variant="bodyMuted" className="mt-1">
                    Oportunidades activas o historicas vinculadas a esta cuenta.
                  </PriorityTypography>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    setOpportunityForm((current) => ({
                      ...current,
                      clientId: client.id,
                      salespersonId: current.salespersonId || client.account_owner_id || "",
                    }))
                    setShowOpportunityModal(true)
                  }}
                >
                  Añadir oportunidad
                </Button>
              </div>

              <PriorityCollectionTable
                columns={opportunityColumns}
                data={opportunities}
                emptyTitle="Sin oportunidades comerciales"
                emptyDescription="Este cliente todavía no tiene oportunidades abiertas o históricas. Crea la primera oportunidad desde aquí para iniciar el flujo comercial."
              />
            </TabsContent>
          </Tabs>
        </section>
      </div>

      {showEditModal ? (
        <Modal
          title="Editar información del cliente"
          description="Actualiza la información principal de la empresa en una sola vista."
          size="workspace"
          onClose={() => {
            setShowEditModal(false)
            syncClientForm(client)
          }}
        >
          <ClientForm
            title="Perfil del cliente"
            description="Agrupa la información comercial, ubicación y contacto de la empresa."
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
            submitNote="Este perfil se guarda en el backend canónico."
          />
        </Modal>
      ) : null}

      {showContactModal ? (
        <Modal
          title="Añadir contacto"
          description="Crea un nuevo contacto vinculado a esta empresa."
          size="standard"
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
              status: normalizeContactStatus(contactStatus),
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
          title="Añadir oportunidad"
          description="Registra una nueva oportunidad comercial para esta cuenta usando el modelo canónico."
          size="workspace"
          onClose={() => {
            setShowOpportunityModal(false)
            resetOpportunityForm()
          }}
        >
          <OpportunityForm
            title="Nueva oportunidad"
            description="La oportunidad se crea con servicio, transporte, ruta estandarizada y valor calculado."
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
          title="Añadir registro consignee / shipper"
          description="Guarda un registro logístico estandarizado vinculado al cliente."
          size="workspace"
          onClose={() => {
            setShowLogisticsPartyModal(false)
            resetLogisticsPartyForm()
          }}
        >
          <ClientLogisticsPartyForm
            title="Nuevo registro logistico"
            description="Captura el tipo, ubicación estandarizada y contacto principal."
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

      {confirmDialog}
    </>
  )
}
