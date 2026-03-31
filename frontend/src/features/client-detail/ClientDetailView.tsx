"use client"

import { type ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { Modal } from "@/components/data/Modal"
import { StatusBadge } from "@/components/data/StatusBadge"
import { PriorityDataTable } from "@/components/priority/PriorityDataTable"
import { PriorityHoverPreview } from "@/components/priority/PriorityHoverPreview"
import { PriorityRowActions } from "@/components/priority/PriorityRowActions"
import { PriorityTypography } from "@/components/priority/PriorityTypography"
import { ClientForm } from "@/components/forms/ClientForm"
import { ClientLogisticsPartyForm } from "@/components/forms/ClientLogisticsPartyForm"
import { ContactForm } from "@/components/forms/ContactForm"
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
            { label: "Telefono", value: row.original.phone || "No disponible" },
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
      header: "Telefono",
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
      header: "Ubicacion",
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
      header: "Numero",
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
      header: "Titulo",
      cell: ({ row }) => (
        <PriorityHoverPreview
          eyebrow="Oportunidad"
          title={row.original.title || "Untitled opportunity"}
          description={
            [row.original.service_type, row.original.transport_type].filter(Boolean).join(" / ") || "No definido"
          }
          lines={[
            {
              label: "Lane",
              value:
                row.original.origin && row.original.destination
                  ? `${row.original.origin} -> ${row.original.destination}`
                  : "No disponible",
            },
            {
              label: "Valor estimado",
              value:
                row.original.estimated_value != null
                  ? `$${row.original.estimated_value.toLocaleString()}`
                  : "No value",
            },
          ]}
          trigger={
            <Link href={`/opportunities/${row.original.id}`} className="font-medium text-[#111827] hover:text-[#1D4ED8]">
              {row.original.title || "Untitled opportunity"}
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
      cell: ({ row }) => row.original.status || "No status",
    },
    {
      id: "lane",
      header: "Lane",
      cell: ({ row }) =>
        row.original.origin && row.original.destination
          ? `${row.original.origin} -> ${row.original.destination}`
          : "No disponible",
    },
    {
      accessorKey: "estimated_value",
      header: "Valor",
      cell: ({ row }) =>
        row.original.estimated_value != null ? `$${row.original.estimated_value.toLocaleString()}` : "No value",
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
          <InfoField label="Vendedor dueno de cuenta" value={accountOwnerName} />
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

        <section className="space-y-4 rounded-[28px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.95)] p-5 shadow-[0_28px_60px_-46px_rgba(3,10,24,0.45)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">Relacionados del cliente</h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                Consulta y administra contactos, consignee and shippers y oportunidades desde una
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
                Contacts ({contacts.length})
              </TabsTrigger>
              <TabsTrigger value="logistics" className="rounded-[16px] px-4 py-2.5 text-sm font-medium">
                Consignee and Shippers ({logistics_parties.length})
              </TabsTrigger>
              <TabsTrigger value="opportunities" className="rounded-[16px] px-4 py-2.5 text-sm font-medium">
                Opportunities ({opportunities.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="contacts" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <PriorityTypography as="h3" variant="cardTitle">
                    Contacts
                  </PriorityTypography>
                  <PriorityTypography variant="bodyMuted" className="mt-1">
                    Personas vinculadas actualmente a esta empresa.
                  </PriorityTypography>
                </div>
                <Button type="button" onClick={() => setShowContactModal(true)}>
                  Anadir contacto
                </Button>
              </div>

              <PriorityDataTable
                columns={contactColumns}
                data={contacts}
                emptyTitle="Sin contactos vinculados"
                emptyDescription="Todavia no hay contactos asociados a esta empresa. Agrega el primer contacto para dejar listo el seguimiento comercial."
              />
            </TabsContent>

            <TabsContent value="logistics" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <PriorityTypography as="h3" variant="cardTitle">
                    Consignee and Shippers
                  </PriorityTypography>
                  <PriorityTypography variant="bodyMuted" className="mt-1">
                    Registros operativos del cliente para shipper, consignee y AA.
                  </PriorityTypography>
                </div>
                <Button type="button" onClick={() => setShowLogisticsPartyModal(true)}>
                  Anadir registro
                </Button>
              </div>

              <PriorityDataTable
                columns={logisticsColumns}
                data={logistics_parties}
                emptyTitle="Sin registros logisticos"
                emptyDescription="Aun no hay consignee, shipper o agentes aduanales vinculados al cliente. Agrega el primer registro operativo para acelerar futuras oportunidades."
              />
            </TabsContent>

            <TabsContent value="opportunities" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <PriorityTypography as="h3" variant="cardTitle">
                    Opportunities
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
                  Anadir oportunidad
                </Button>
              </div>

              <PriorityDataTable
                columns={opportunityColumns}
                data={opportunities}
                emptyTitle="Sin oportunidades comerciales"
                emptyDescription="Este cliente todavia no tiene oportunidades abiertas o historicas. Crea la primera oportunidad desde aqui para iniciar el flujo comercial."
              />
            </TabsContent>
          </Tabs>
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
            submitNote="This profile is stored in the canonical backend."
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

      {confirmDialog}
    </>
  )
}
