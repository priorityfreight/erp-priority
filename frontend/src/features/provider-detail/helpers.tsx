import type { ReactNode } from "react"
import type {
  Provider,
  ProviderContactWithProvider,
  ProviderServiceOffering,
  ServiceTransportType,
} from "@/lib/db"
import type { ProviderContactFormValues } from "@/components/forms/ProviderContactForm"
import type { ProviderFormValues } from "@/components/forms/ProviderForm"
import type { ProviderServiceOfferingFormValues } from "@/components/forms/ProviderServiceOfferingForm"

export type ProviderDetailsState = {
  provider: Provider
  contacts: ProviderContactWithProvider[]
  serviceOfferings: ProviderServiceOffering[]
  serviceTransportTypes: ServiceTransportType[]
}

export const emptyProviderForm: ProviderFormValues = {
  name: "",
  taxId: "",
  status: "en_proceso_de_alta",
  providerType: "",
  corporatePhone: "",
  companyEmail: "",
  website: "",
  fullAddress: "",
  postalCode: "",
  city: "",
  cityUnlocode: "",
  country: "",
  creditActive: "no",
  creditAmount: "",
  creditDays: "",
}

export const emptyContactForm: ProviderContactFormValues = {
  name: "",
  email: "",
  phone: "",
  linkedinUrl: "",
  position: "",
  status: "activo",
}

export const emptyOfferingForm: ProviderServiceOfferingFormValues = {
  serviceType: "",
  serviceTransportTypeId: "",
  termsAndConditions: "",
}

export function buildProviderForm(provider: Provider): ProviderFormValues {
  return {
    name: provider.name || "",
    taxId: provider.tax_id || "",
    status: provider.status || "en_proceso_de_alta",
    providerType: provider.provider_type || "",
    corporatePhone: provider.corporate_phone || "",
    companyEmail: provider.company_email || "",
    website: provider.website || "",
    fullAddress: provider.full_address || "",
    postalCode: provider.postal_code || "",
    city: provider.city || "",
    cityUnlocode: provider.city_unlocode || "",
    country: provider.country || "",
    creditActive: provider.credit_active ? "si" : "no",
    creditAmount: provider.credit_amount ? String(provider.credit_amount) : "",
    creditDays: provider.credit_days ? String(provider.credit_days) : "",
  }
}

export function buildProviderContactForm(contact: ProviderContactWithProvider): ProviderContactFormValues {
  return {
    name: contact.name || "",
    email: contact.email || "",
    phone: contact.phone || "",
    linkedinUrl: contact.linkedin_url || "",
    position: contact.position || "",
    status: contact.status || "activo",
  }
}

export function buildProviderOfferingForm(
  offering: ProviderServiceOffering
): ProviderServiceOfferingFormValues {
  return {
    serviceType: offering.service_type || "",
    serviceTransportTypeId: offering.service_transport_type_id || "",
    termsAndConditions: offering.terms_and_conditions || "",
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
