import type { ReactNode } from "react"
import type {
  Client,
  ClientLogisticsParty,
  Contact,
  Incoterm,
  Opportunity,
  ServiceTransportType,
  User,
} from "@/lib/db"
import type { ClientLogisticsPartyFormValues } from "@/components/forms/ClientLogisticsPartyForm"
import type { OpportunityFormValues } from "@/components/forms/OpportunityForm"

export type ClientDetailsState = {
  client: Client
  contacts: Contact[]
  logistics_parties: ClientLogisticsParty[]
  opportunities: Opportunity[]
  users: User[]
  serviceTransportTypes: ServiceTransportType[]
  incoterms: Incoterm[]
}

export const clientStatusOptions = [
  { value: "prospecto", label: "Prospecto" },
  { value: "buscando_informacion", label: "Buscando informacion" },
  { value: "cotizando", label: "Cotizando" },
  { value: "aceptacion_verbal", label: "Aceptacion verbal" },
  { value: "cliente", label: "Cliente" },
]

export function createEmptyLogisticsPartyForm(): ClientLogisticsPartyFormValues {
  return {
    partyType: "shipper",
    name: "",
    fullAddress: "",
    postalCode: "",
    city: "",
    country: "",
    cityUnlocode: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  }
}

export function createEmptyOpportunityForm(
  clientId: string,
  accountOwnerId: string
): OpportunityFormValues {
  return {
    clientId,
    salespersonId: accountOwnerId,
    serviceType: "",
    transportType: "",
    operationType: "",
    incotermId: "",
    origin: "",
    originUnlocode: "",
    destination: "",
    destinationUnlocode: "",
    expectedProfitUsd: "",
    serviceQuantity: "",
    description: "",
  }
}

export function InfoCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#64748B]">
        {title}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  )
}

export function InfoField({
  label,
  value,
  wide = false,
}: {
  label: string
  value: string | null | undefined
  wide?: boolean
}) {
  return (
    <div className={wide ? "sm:col-span-2 xl:col-span-3" : ""}>
      <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">{label}</div>
      <div className="mt-1 text-sm font-medium text-[#111827]">{value || "No disponible"}</div>
    </div>
  )
}
