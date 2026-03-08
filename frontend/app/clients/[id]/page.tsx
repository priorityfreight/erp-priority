"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import {
  getClientById,
  getContactsByClientId,
  getOpportunitiesByClientId,
  type Client,
  type Contact,
  type Opportunity,
} from "@/lib/db"
import { PageContainer } from "@/components/layout/PageContainer"

export default function ClientDetailPage() {
  const params = useParams()
  const clientId = params?.id as string | undefined

  const [client, setClient] = useState<Client | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId) return

    let cancelled = false

    async function load() {
      try {
        setLoading(true)

        const [clientData, contactsData, opportunitiesData] = await Promise.all([
          getClientById(clientId),
          getContactsByClientId(clientId),
          getOpportunitiesByClientId(clientId),
        ])

        if (cancelled) return

        setClient(clientData)
        setContacts(contactsData)
        setOpportunities(opportunitiesData)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [clientId])

  if (!clientId) {
    return (
      <PageContainer title="Client" description="Invalid client id.">
        <p className="text-sm text-[#6B7280]">Client id is missing from the URL.</p>
      </PageContainer>
    )
  }

  if (loading && !client) {
    return (
      <PageContainer title="Client" description="Loading client data...">
        <p className="text-sm text-[#6B7280]">Loading client information.</p>
      </PageContainer>
    )
  }

  if (!client) {
    return (
      <PageContainer title="Client" description="Client not found.">
        <p className="text-sm text-[#6B7280]">
          We could not find a client with this id. It may have been deleted.
        </p>
      </PageContainer>
    )
  }

  return (
    <PageContainer
      title={client.name}
      description="Client overview with related contacts and opportunities."
    >
      <div className="space-y-8">
        <section className="grid gap-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm sm:grid-cols-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Name
            </div>
            <div className="mt-1 text-[#111827]">{client.name}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Industry
            </div>
            <div className="mt-1 text-[#111827]">
              {client.industry || "Not specified"}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Country
            </div>
            <div className="mt-1 text-[#111827]">
              {client.country || "Not specified"}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[#111827]">Contacts</h2>
          {contacts.length === 0 ? (
            <p className="text-sm text-[#6B7280]">
              No contacts linked to this client yet.
            </p>
          ) : (
            <div className="space-y-2">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between rounded-md border border-[#E5E7EB] bg-white px-4 py-3 text-sm"
                >
                  <div>
                    <div className="font-medium text-[#111827]">{contact.name}</div>
                    <div className="mt-1 text-xs text-[#6B7280]">
                      {contact.email || "No email"} · {contact.phone || "No phone"}
                    </div>
                  </div>
                  <div className="text-xs text-[#6B7280]">
                    {contact.position || "No position"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[#111827]">Opportunities</h2>
          {opportunities.length === 0 ? (
            <p className="text-sm text-[#6B7280]">
              No opportunities created for this client yet.
            </p>
          ) : (
            <div className="space-y-2">
              {opportunities.map((opportunity) => (
                <div
                  key={opportunity.id}
                  className="flex items-center justify-between rounded-md border border-[#E5E7EB] bg-white px-4 py-3 text-sm"
                >
                  <div>
                    <div className="font-medium text-[#111827]">
                      {opportunity.title || "Untitled opportunity"}
                    </div>
                    <div className="mt-1 text-xs text-[#6B7280]">
                      {opportunity.status || "No status"} ·{" "}
                      {opportunity.estimated_value != null
                        ? `Value: ${opportunity.estimated_value}`
                        : "No value"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageContainer>
  )
}

