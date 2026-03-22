"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  getClientSummaries,
  getContacts,
  getOpportunities,
  type ClientSummary,
  type ContactWithClient,
  type OpportunitySummary,
} from "@/lib/db"
import { PageContainer } from "@/components/layout/PageContainer"

type MetricCardProps = {
  label: string
  value: string
  tone: "blue" | "slate" | "emerald" | "amber"
}

const toneClasses: Record<MetricCardProps["tone"], string> = {
  blue: "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]",
  slate: "border-[#E5E7EB] bg-[#F8FAFC] text-[#0F172A]",
  emerald: "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]",
  amber: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",
}

function MetricCard({ label, value, tone }: MetricCardProps) {
  return (
    <div className={`rounded-xl border p-4 ${toneClasses[tone]}`}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  )
}

export function CrmOverview() {
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [contacts, setContacts] = useState<ContactWithClient[]>([])
  const [opportunities, setOpportunities] = useState<OpportunitySummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    Promise.all([getClientSummaries(), getContacts(), getOpportunities()])
      .then(([clientData, contactData, opportunityData]) => {
        if (!cancelled) {
          setClients(clientData)
          setContacts(contactData)
          setOpportunities(opportunityData)
        }
      })
      .catch((error) => {
        console.error(error)
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const pipelineValue = opportunities.reduce(
    (total, opportunity) => total + (opportunity.estimated_value ?? 0),
    0
  )

  return (
    <PageContainer
      title="CRM Dashboard"
      description="Monitor the customer pipeline, recent contacts, and sales activity from one place."
      actions={
        <>
          <Link
            href="/clients"
            className="rounded-md border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-medium text-[#111827] hover:bg-[#F9FAFB]"
          >
            Manage Clients
          </Link>
          <Link
            href="/opportunities"
            className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8]"
          >
            New Opportunity
          </Link>
        </>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Clients" value={String(clients.length)} tone="blue" />
          <MetricCard label="Contacts" value={String(contacts.length)} tone="slate" />
          <MetricCard
            label="Open Opportunities"
            value={String(opportunities.length)}
            tone="emerald"
          />
          <MetricCard
            label="Pipeline Value"
            value={`$${pipelineValue.toLocaleString()}`}
            tone="amber"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#111827]">Recent Opportunities</h2>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Active commercial work currently moving through CRM.
                </p>
              </div>
              <Link
                href="/opportunities"
                className="text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8]"
              >
                View all
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <p className="text-sm text-[#6B7280]">Loading CRM overview...</p>
              ) : opportunities.length === 0 ? (
                <p className="text-sm text-[#6B7280]">No opportunities yet.</p>
              ) : (
                opportunities.slice(0, 5).map((opportunity) => (
                  <Link
                    key={opportunity.id}
                    href={`/opportunities/${opportunity.id}`}
                    className="block rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 hover:bg-[#F9FAFB]"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-medium text-[#111827]">{opportunity.title}</div>
                        <div className="mt-1 text-xs text-[#6B7280]">
                          {opportunity.client_name || "No client"} · {opportunity.status || "No status"}
                        </div>
                      </div>
                      <div className="text-right text-xs text-[#6B7280]">
                        <div>
                          {opportunity.origin && opportunity.destination
                            ? `${opportunity.origin} -> ${opportunity.destination}`
                            : "No lane"}
                        </div>
                        <div className="mt-1 font-medium text-[#111827]">
                          {opportunity.estimated_value != null
                            ? `$${opportunity.estimated_value.toLocaleString()}`
                            : "No value"}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
              <h2 className="text-lg font-semibold text-[#111827]">Quick Actions</h2>
              <div className="mt-4 grid gap-3">
                <Link
                  href="/clients"
                  className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-sm font-medium text-[#111827] hover:bg-[#EEF2FF]"
                >
                  Add or review client accounts
                </Link>
                <Link
                  href="/contacts"
                  className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-sm font-medium text-[#111827] hover:bg-[#EEF2FF]"
                >
                  Add communication contacts
                </Link>
                <Link
                  href="/opportunities"
                  className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-sm font-medium text-[#111827] hover:bg-[#EEF2FF]"
                >
                  Open a new sales opportunity
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[#111827]">Recent Contacts</h2>
                <Link
                  href="/contacts"
                  className="text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8]"
                >
                  View all
                </Link>
              </div>

              <div className="mt-4 space-y-3">
                {loading ? (
                  <p className="text-sm text-[#6B7280]">Loading contacts...</p>
                ) : contacts.length === 0 ? (
                  <p className="text-sm text-[#6B7280]">No contacts yet.</p>
                ) : (
                  contacts.slice(0, 5).map((contact) => (
                    <div
                      key={contact.id}
                      className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3"
                    >
                      <div className="font-medium text-[#111827]">{contact.name}</div>
                      <div className="mt-1 text-xs text-[#6B7280]">
                        {contact.client_name || "No client"} · {contact.position || "No position"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#E5E7EB] bg-[#111827] p-5 text-white">
          <h2 className="text-lg font-semibold">CRM Scope Right Now</h2>
          <p className="mt-2 max-w-3xl text-sm text-[#D1D5DB]">
            The current live CRM covers clients, contacts, and opportunities end-to-end
            against the active cloud backend. Prospects remain part of the canonical roadmap,
            but the remote dev backend has not been migrated to that schema yet.
          </p>
        </section>
      </div>
    </PageContainer>
  )
}
