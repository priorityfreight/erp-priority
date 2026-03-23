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
import { Brand } from "@/components/layout/Brand"

type MetricCardProps = {
  label: string
  value: string
  accent: "burgundy" | "steel" | "navy" | "light"
}

const accentClasses: Record<MetricCardProps["accent"], string> = {
  burgundy:
    "border-[rgba(179,58,91,0.24)] bg-[linear-gradient(160deg,_rgba(179,58,91,0.12),_rgba(255,255,255,0.95))] text-[var(--brand-navy)]",
  steel:
    "border-[rgba(144,158,174,0.22)] bg-[linear-gradient(160deg,_rgba(144,158,174,0.12),_rgba(255,255,255,0.95))] text-[var(--brand-navy)]",
  navy:
    "border-[rgba(11,31,59,0.2)] bg-[linear-gradient(160deg,_rgba(11,31,59,0.1),_rgba(255,255,255,0.96))] text-[var(--brand-navy)]",
  light:
    "border-[rgba(207,207,207,0.45)] bg-[linear-gradient(160deg,_rgba(255,255,255,0.98),_rgba(239,243,247,0.92))] text-[var(--brand-navy)]",
}

function MetricCard({ label, value, accent }: MetricCardProps) {
  return (
    <div className={`rounded-[24px] border p-5 shadow-[0_22px_42px_-34px_rgba(11,31,59,0.55)] ${accentClasses[accent]}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.32em] opacity-70">{label}</div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
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
      title="Dashboard"
      description="Vista ejecutiva del pipeline comercial, actividad del CRM y prioridad operativa del día."
      actions={
        <>
          <Link
            href="/clients"
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/16"
          >
            Manage Clients
          </Link>
          <Link
            href="/opportunities"
            className="rounded-2xl bg-[linear-gradient(135deg,_#B33A5B,_#800020)] px-4 py-2 text-sm font-medium text-white shadow-[0_18px_36px_-20px_rgba(128,0,32,0.85)] hover:translate-y-[-1px]"
          >
            New Opportunity
          </Link>
        </>
      }
    >
      <div className="space-y-8">
        <section className="overflow-hidden rounded-[30px] border border-[rgba(11,31,59,0.08)] bg-[linear-gradient(130deg,_#0B1F3B_0%,_#132C52_52%,_#17243B_100%)] px-6 py-7 text-white shadow-[0_36px_70px_-40px_rgba(3,10,24,0.8)]">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[var(--brand-gray)]">
                Corporate Freight Operating System
              </div>
              <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[0.02em] sm:text-4xl">
                Pipeline comercial y ejecución con identidad Priority.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-8 text-[var(--brand-soft-gray)] sm:text-base">
                Mantén el control del flujo desde cliente, oportunidad y cotización con una
                experiencia más ejecutiva, más clara y más preparada para escalar.
              </p>
            </div>
            <div className="flex items-center justify-start lg:justify-end">
              <div className="rounded-[28px] border border-white/10 bg-white/6 p-6 backdrop-blur">
                <Brand compact light />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Clients" value={String(clients.length)} accent="burgundy" />
          <MetricCard label="Contacts" value={String(contacts.length)} accent="steel" />
          <MetricCard label="Open Opportunities" value={String(opportunities.length)} accent="navy" />
          <MetricCard label="Pipeline Value" value={`$${pipelineValue.toLocaleString()}`} accent="light" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] border border-[rgba(11,31,59,0.08)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(243,246,250,0.95))] p-6 shadow-[0_26px_52px_-40px_rgba(11,31,59,0.55)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--brand-navy)]">Recent Opportunities</h2>
                <p className="mt-1 text-sm text-[#5A687A]">
                  Trabajo comercial que hoy mueve el negocio.
                </p>
              </div>
              <Link
                href="/opportunities"
                className="text-sm font-semibold text-[var(--brand-burgundy)] hover:text-[var(--brand-burgundy-light)]"
              >
                View all
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {loading ? (
                <p className="text-sm text-[#6B7280]">Loading CRM overview...</p>
              ) : opportunities.length === 0 ? (
                <p className="text-sm text-[#6B7280]">No opportunities yet.</p>
              ) : (
                opportunities.slice(0, 5).map((opportunity) => (
                  <Link
                    key={opportunity.id}
                    href={`/opportunities/${opportunity.id}`}
                    className="block rounded-[22px] border border-[rgba(11,31,59,0.08)] bg-white px-5 py-4 hover:border-[rgba(179,58,91,0.22)] hover:bg-[rgba(179,58,91,0.04)]"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-[var(--brand-navy)]">{opportunity.title}</div>
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
                        <div className="mt-1 font-semibold text-[var(--brand-burgundy)]">
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
            <div className="rounded-[28px] border border-[rgba(11,31,59,0.08)] bg-white p-6 shadow-[0_26px_52px_-40px_rgba(11,31,59,0.55)]">
              <h2 className="text-lg font-semibold text-[var(--brand-navy)]">Quick Actions</h2>
              <div className="mt-4 grid gap-3">
                <Link
                  href="/clients"
                  className="rounded-[20px] border border-[rgba(11,31,59,0.08)] bg-[rgba(11,31,59,0.04)] px-4 py-3 text-sm font-medium text-[var(--brand-navy)] hover:border-[rgba(179,58,91,0.2)] hover:bg-[rgba(179,58,91,0.05)]"
                >
                  Add or review client accounts
                </Link>
                <Link
                  href="/contacts"
                  className="rounded-[20px] border border-[rgba(11,31,59,0.08)] bg-[rgba(11,31,59,0.04)] px-4 py-3 text-sm font-medium text-[var(--brand-navy)] hover:border-[rgba(179,58,91,0.2)] hover:bg-[rgba(179,58,91,0.05)]"
                >
                  Add communication contacts
                </Link>
                <Link
                  href="/opportunities"
                  className="rounded-[20px] border border-[rgba(11,31,59,0.08)] bg-[rgba(11,31,59,0.04)] px-4 py-3 text-sm font-medium text-[var(--brand-navy)] hover:border-[rgba(179,58,91,0.2)] hover:bg-[rgba(179,58,91,0.05)]"
                >
                  Open a new sales opportunity
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] border border-[rgba(11,31,59,0.08)] bg-white p-6 shadow-[0_26px_52px_-40px_rgba(11,31,59,0.55)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[var(--brand-navy)]">Recent Contacts</h2>
                <Link
                  href="/contacts"
                  className="text-sm font-semibold text-[var(--brand-burgundy)] hover:text-[var(--brand-burgundy-light)]"
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
                      className="rounded-[20px] border border-[rgba(11,31,59,0.08)] bg-[rgba(11,31,59,0.04)] px-4 py-3"
                    >
                      <div className="font-semibold text-[var(--brand-navy)]">{contact.name}</div>
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

        <section className="overflow-hidden rounded-[28px] border border-[rgba(179,58,91,0.16)] bg-[linear-gradient(135deg,_rgba(179,58,91,0.12),_rgba(11,31,59,0.96))] p-6 text-white shadow-[0_26px_52px_-40px_rgba(11,31,59,0.8)]">
          <h2 className="text-lg font-semibold">CRM Scope Right Now</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--brand-soft-gray)]">
            El CRM en vivo ya cubre clientes, contactos, oportunidades y cotizaciones con backend
            cloud canónico, control de acceso y master data centralizado.
          </p>
        </section>
      </div>
    </PageContainer>
  )
}
