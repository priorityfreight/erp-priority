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
import { PriorityMetricCard, PriorityMetricStrip } from "@/components/priority/PriorityWorkspace"
import { PriorityCardTitle, PriorityTypography } from "@/components/priority/PriorityTypography"

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
      description="Centro de trabajo comercial para ver el pipeline, detectar bloqueos y entrar a la siguiente acción sin buscar de más."
      actions={
        <>
          <Link
            href="/clients"
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/16"
          >
            Ver clientes
          </Link>
          <Link
            href="/opportunities"
            className="rounded-2xl bg-[linear-gradient(135deg,_#B33A5B,_#800020)] px-4 py-2 text-sm font-medium text-white shadow-[0_18px_36px_-20px_rgba(128,0,32,0.85)] hover:translate-y-[-1px]"
          >
            Nueva oportunidad
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <section className="workspace-panel rounded-[24px] p-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] xl:items-start">
            <div className="space-y-2">
              <PriorityTypography variant="eyebrow">Hoy en CRM</PriorityTypography>
              <PriorityTypography as="h2" variant="sectionTitle" className="max-w-3xl">
                Revisa qué está activo y entra rápido al siguiente seguimiento comercial.
              </PriorityTypography>
              <PriorityTypography variant="bodyMuted" className="max-w-3xl">
                El dashboard debe orientar en segundos: qué mover hoy, qué vale más y dónde conviene entrar primero.
              </PriorityTypography>
            </div>
            <div className="rounded-[18px] border border-[rgba(11,31,59,0.08)] bg-[rgba(11,31,59,0.03)] px-4 py-3">
              <PriorityTypography variant="eyebrow">Siguiente foco</PriorityTypography>
              <PriorityTypography variant="body" className="mt-1.5 font-medium">
                Abre oportunidades recientes y entra directo a la ruta o al contacto que necesita atención.
              </PriorityTypography>
            </div>
          </div>
        </section>

        <PriorityMetricStrip density="compact">
          <PriorityMetricCard label="Clientes" value={String(clients.length)} helper="Cuentas visibles en CRM." tone="spotlight" />
          <PriorityMetricCard label="Contactos" value={String(contacts.length)} helper="Personas de contacto registradas." tone="default" />
          <PriorityMetricCard label="Oportunidades abiertas" value={String(opportunities.length)} helper="Registros activos que mueven pipeline." tone="info" />
          <PriorityMetricCard label="Valor estimado" value={`$${pipelineValue.toLocaleString()}`} helper="Pipeline comercial agregado." tone="success" />
        </PriorityMetricStrip>

        <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="workspace-panel rounded-[24px] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <PriorityCardTitle>Oportunidades recientes</PriorityCardTitle>
                <PriorityTypography variant="bodyMuted" className="mt-1">
                  Trabajo comercial que hoy más probablemente necesita seguimiento.
                </PriorityTypography>
              </div>
              <Link href="/opportunities" className="text-sm font-semibold text-[var(--brand-burgundy)] hover:text-[var(--brand-burgundy-light)]">
                Ver todas
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <PriorityTypography variant="bodyMuted">Cargando resumen comercial…</PriorityTypography>
              ) : opportunities.length === 0 ? (
                <PriorityTypography variant="bodyMuted">Todavía no hay oportunidades registradas.</PriorityTypography>
              ) : (
                opportunities.slice(0, 5).map((opportunity) => (
                  <Link
                    key={opportunity.id}
                    href={`/opportunities/${opportunity.id}`}
                    className="block rounded-[20px] border border-[rgba(11,31,59,0.08)] bg-white px-4 py-3.5 hover:border-[rgba(179,58,91,0.22)] hover:bg-[rgba(179,58,91,0.04)]"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                          <div className="font-semibold text-[var(--brand-navy)]">{opportunity.title}</div>
                          <div className="mt-1 text-xs text-[#6B7280]">
                          {opportunity.client_name || "Sin cliente"} · {opportunity.status || "Sin estatus"}
                          </div>
                      </div>
                      <div className="text-right text-xs text-[#6B7280]">
                        <div>
                          {opportunity.origin && opportunity.destination
                            ? `${opportunity.origin} → ${opportunity.destination}`
                            : "Sin ruta"}
                        </div>
                        <div className="mt-1 font-semibold text-[var(--brand-burgundy)]">
                          {opportunity.estimated_value != null
                            ? `$${opportunity.estimated_value.toLocaleString()}`
                            : "Sin valor"}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="workspace-panel rounded-[24px] p-5">
              <PriorityCardTitle>Acciones rápidas</PriorityCardTitle>
              <div className="mt-3 grid gap-2.5">
                <Link
                  href="/clients"
                  className="rounded-[18px] border border-[rgba(11,31,59,0.08)] bg-[rgba(11,31,59,0.04)] px-4 py-3 text-sm font-medium text-[var(--brand-navy)] hover:border-[rgba(179,58,91,0.2)] hover:bg-[rgba(179,58,91,0.05)]"
                >
                  Crear o revisar cuentas cliente
                </Link>
                <Link
                  href="/contacts"
                  className="rounded-[18px] border border-[rgba(11,31,59,0.08)] bg-[rgba(11,31,59,0.04)] px-4 py-3 text-sm font-medium text-[var(--brand-navy)] hover:border-[rgba(179,58,91,0.2)] hover:bg-[rgba(179,58,91,0.05)]"
                >
                  Gestionar contactos comerciales
                </Link>
                <Link
                  href="/opportunities"
                  className="rounded-[18px] border border-[rgba(11,31,59,0.08)] bg-[rgba(11,31,59,0.04)] px-4 py-3 text-sm font-medium text-[var(--brand-navy)] hover:border-[rgba(179,58,91,0.2)] hover:bg-[rgba(179,58,91,0.05)]"
                >
                  Abrir una nueva oportunidad
                </Link>
              </div>
            </div>

            <div className="workspace-panel rounded-[24px] p-5">
              <div className="flex items-center justify-between gap-3">
                <PriorityCardTitle>Contactos recientes</PriorityCardTitle>
                <Link
                  href="/contacts"
                  className="text-sm font-semibold text-[var(--brand-burgundy)] hover:text-[var(--brand-burgundy-light)]"
                >
                  Ver todos
                </Link>
              </div>

              <div className="mt-3 space-y-3">
                {loading ? (
                  <PriorityTypography variant="bodyMuted">Cargando contactos…</PriorityTypography>
                ) : contacts.length === 0 ? (
                  <PriorityTypography variant="bodyMuted">Todavía no hay contactos registrados.</PriorityTypography>
                ) : (
                  contacts.slice(0, 5).map((contact) => (
                    <div
                      key={contact.id}
                      className="rounded-[18px] border border-[rgba(11,31,59,0.08)] bg-[rgba(11,31,59,0.04)] px-4 py-3"
                    >
                      <div className="font-semibold text-[var(--brand-navy)]">{contact.name}</div>
                      <div className="mt-1 text-xs text-[#6B7280]">
                        {contact.client_name || "Sin cliente"} · {contact.position || "Sin puesto"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-[rgba(179,58,91,0.16)] bg-[linear-gradient(135deg,_rgba(179,58,91,0.12),_rgba(11,31,59,0.96))] p-5 text-white shadow-[0_24px_44px_-38px_rgba(11,31,59,0.72)]">
          <PriorityTypography as="h2" variant="cardTitle" className="text-white">
            Alcance actual del CRM
          </PriorityTypography>
          <PriorityTypography variant="bodyMuted" className="mt-2 max-w-3xl text-[var(--brand-soft-gray)]">
            El CRM en vivo ya cubre clientes, contactos, oportunidades y cotizaciones con backend
            canónico en la nube, control de acceso y master data centralizado.
          </PriorityTypography>
        </section>
      </div>
    </PageContainer>
  )
}
