import { supabase } from "@/lib/supabaseClient"
import { buildRpcPatch } from "./rpcPatch"
import type {
  NewProvider,
  NewProviderContact,
  NewProviderServiceOffering,
  Provider,
  ProviderContact,
  ProviderContactWithProvider,
  ProviderFullPayload,
  ProviderServiceOffering,
  ProviderSummary,
  UpdateProvider,
  UpdateProviderContact,
  UpdateProviderServiceOffering,
} from "./models"

export type ProviderPricingCandidate = {
  provider: Provider
  service_offering: ProviderServiceOffering
  contacts: ProviderContactWithProvider[]
}

const PROVIDER_COLUMNS =
  "id,name,tax_id,provider_type,corporate_phone,company_email,website,full_address,postal_code,city_unlocode,city_unlocode_id,city,country,credit_active,credit_amount,credit_days,status,created_at,updated_at"
const PROVIDER_SUMMARY_COLUMNS =
  "id,provider_name,provider_type,city,country,status,credit_active,credit_amount,credit_days,total_contacts,total_service_offerings"
const PROVIDER_CONTACT_COLUMNS =
  "id,provider_id,name,email,phone,linkedin_url,position,status,created_at,updated_at"
const PROVIDER_SERVICE_COLUMNS =
  "id,provider_id,service_transport_type_id,service_type,transport_type,terms_and_conditions,created_at,updated_at"

function mapProvider(row: Record<string, unknown>): Provider {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    tax_id: (row.tax_id as string | null | undefined) ?? null,
    provider_type: (row.provider_type as string | null | undefined) ?? null,
    corporate_phone: (row.corporate_phone as string | null | undefined) ?? null,
    company_email: (row.company_email as string | null | undefined) ?? null,
    website: (row.website as string | null | undefined) ?? null,
    full_address: (row.full_address as string | null | undefined) ?? null,
    postal_code: (row.postal_code as string | null | undefined) ?? null,
    city_unlocode: (row.city_unlocode as string | null | undefined) ?? null,
    city_unlocode_id: (row.city_unlocode_id as string | null | undefined) ?? null,
    city: (row.city as string | null | undefined) ?? null,
    country: (row.country as string | null | undefined) ?? null,
    credit_active: Boolean(row.credit_active ?? false),
    credit_amount: (row.credit_amount as number | null | undefined) ?? null,
    credit_days: (row.credit_days as number | null | undefined) ?? null,
    status: String(row.status ?? "en_proceso_de_alta"),
    created_at: String(row.created_at ?? new Date(0).toISOString()),
    updated_at: (row.updated_at as string | null | undefined) ?? null,
  }
}

function mapProviderContact(row: Record<string, unknown>): ProviderContactWithProvider {
  return {
    id: String(row.id),
    provider_id: String(row.provider_id),
    name: String(row.name ?? ""),
    email: (row.email as string | null | undefined) ?? null,
    phone: (row.phone as string | null | undefined) ?? null,
    linkedin_url: (row.linkedin_url as string | null | undefined) ?? null,
    position: (row.position as string | null | undefined) ?? null,
    status: String(row.status ?? "activo"),
    created_at: String(row.created_at ?? new Date(0).toISOString()),
    updated_at: (row.updated_at as string | null | undefined) ?? null,
    provider_name: (row.provider_name as string | null | undefined) ?? null,
  }
}

function mapProviderServiceOffering(
  row: Record<string, unknown>
): ProviderServiceOffering {
  return {
    id: String(row.id),
    provider_id: String(row.provider_id),
    service_transport_type_id: String(row.service_transport_type_id),
    service_type: String(row.service_type ?? ""),
    transport_type: String(row.transport_type ?? ""),
    terms_and_conditions:
      (row.terms_and_conditions as string | null | undefined) ?? null,
    created_at: String(row.created_at ?? new Date(0).toISOString()),
    updated_at: (row.updated_at as string | null | undefined) ?? null,
  }
}

async function readProviderById(id: string): Promise<Provider> {
  const { data, error } = await supabase
    .from("providers")
    .select(PROVIDER_COLUMNS)
    .eq("id", id)
    .single()

  if (error) {
    throw error
  }

  return mapProvider(data as Record<string, unknown>)
}

async function readProviderContactById(id: string): Promise<ProviderContact> {
  const { data, error } = await supabase
    .from("provider_contacts")
    .select(PROVIDER_CONTACT_COLUMNS)
    .eq("id", id)
    .single()

  if (error) {
    throw error
  }

  return mapProviderContact(data as Record<string, unknown>)
}

async function readProviderServiceOfferingById(id: string): Promise<ProviderServiceOffering> {
  const { data, error } = await supabase
    .from("provider_service_offering_view")
    .select(PROVIDER_SERVICE_COLUMNS)
    .eq("id", id)
    .single()

  if (error) {
    throw error
  }

  return mapProviderServiceOffering(data as Record<string, unknown>)
}

export async function getProviders(): Promise<Provider[]> {
  const { data, error } = await supabase
    .from("providers")
    .select(PROVIDER_COLUMNS)
    .order("name", { ascending: true })

  if (error) {
    throw error
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => mapProvider(row))
}

export async function getProviderSummaries(query?: string): Promise<ProviderSummary[]> {
  let request = supabase
    .from("provider_overview_view")
    .select(PROVIDER_SUMMARY_COLUMNS)
    .order("provider_name", { ascending: true })

  const normalized = query?.trim()
  if (normalized) {
    request = request.or(
      `provider_name.ilike.%${normalized}%,provider_type.ilike.%${normalized}%,city.ilike.%${normalized}%,country.ilike.%${normalized}%`
    )
  }

  const { data, error } = await request

  if (error) {
    throw error
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    provider_name: String(row.provider_name ?? ""),
    provider_type: (row.provider_type as string | null | undefined) ?? null,
    city: (row.city as string | null | undefined) ?? null,
    country: (row.country as string | null | undefined) ?? null,
    status: String(row.status ?? "en_proceso_de_alta"),
    credit_active: Boolean(row.credit_active ?? false),
    credit_amount: (row.credit_amount as number | null | undefined) ?? null,
    credit_days: (row.credit_days as number | null | undefined) ?? null,
    total_contacts: Number(row.total_contacts ?? 0),
    total_service_offerings: Number(row.total_service_offerings ?? 0),
  }))
}

export async function getProviderPricingCandidates(params: {
  serviceType: string | null
  transportType: string | null
}): Promise<ProviderPricingCandidate[]> {
  const normalizedServiceType = params.serviceType?.trim()
  const normalizedTransportType = params.transportType?.trim()

  if (!normalizedServiceType) {
    return []
  }

  const serviceType = normalizedServiceType

  async function loadOfferings(matchTransport: boolean) {
    let request = supabase
      .from("provider_service_offering_view")
      .select(PROVIDER_SERVICE_COLUMNS)
      .eq("service_type", serviceType)

    if (matchTransport && normalizedTransportType) {
      request = request.eq("transport_type", normalizedTransportType)
    }

    const { data, error } = await request.order("provider_name", { ascending: true })

    if (error) {
      throw error
    }

    return ((data ?? []) as Record<string, unknown>[]).map((row) => mapProviderServiceOffering(row))
  }

  let serviceOfferings = await loadOfferings(true)
  if (serviceOfferings.length === 0 && normalizedTransportType) {
    serviceOfferings = await loadOfferings(false)
  }

  if (serviceOfferings.length === 0) {
    return []
  }

  const providerIds = Array.from(new Set(serviceOfferings.map((item) => item.provider_id)))

  const [providersResult, contactsResult] = await Promise.all([
    supabase
      .from("providers")
      .select(PROVIDER_COLUMNS)
      .in("id", providerIds)
      .eq("status", "activo")
      .order("name", { ascending: true }),
    supabase
      .from("provider_contacts_view")
      .select(
        "id,provider_id,name,email,phone,linkedin_url,position,status,created_at,updated_at,provider_name"
      )
      .in("provider_id", providerIds)
      .eq("status", "activo")
      .order("created_at", { ascending: false }),
  ])

  if (providersResult.error) {
    throw providersResult.error
  }

  if (contactsResult.error) {
    throw contactsResult.error
  }

  const providers = ((providersResult.data ?? []) as Record<string, unknown>[]).map((row) =>
    mapProvider(row)
  )
  const contacts = ((contactsResult.data ?? []) as Record<string, unknown>[]).map((row) =>
    mapProviderContact(row)
  )

  const providerMap = new Map(providers.map((provider) => [provider.id, provider]))
  const contactsByProvider = new Map<string, ProviderContactWithProvider[]>()

  for (const contact of contacts) {
    const current = contactsByProvider.get(contact.provider_id) ?? []
    current.push(contact)
    contactsByProvider.set(contact.provider_id, current)
  }

  return serviceOfferings
    .map((serviceOffering) => {
      const provider = providerMap.get(serviceOffering.provider_id)
      if (!provider) {
        return null
      }

      return {
        provider,
        service_offering: serviceOffering,
        contacts: contactsByProvider.get(serviceOffering.provider_id) ?? [],
      }
    })
    .filter((candidate): candidate is ProviderPricingCandidate => candidate !== null)
}

export async function getProviderFull(id: string): Promise<ProviderFullPayload | null> {
  const { data, error } = await supabase.rpc("get_provider_full", {
    p_provider_id: id,
  } as never)

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const payload = data as Record<string, unknown>
  const providerRow = payload.provider as Record<string, unknown> | null

  if (!providerRow) {
    return null
  }

  const contactsRows = (payload.contacts as Record<string, unknown>[] | null) ?? []
  const serviceRows =
    (payload.service_offerings as Record<string, unknown>[] | null) ?? []

  return {
    provider: mapProvider(providerRow),
    contacts: contactsRows.map((row) => mapProviderContact(row)),
    service_offerings: serviceRows.map((row) => mapProviderServiceOffering(row)),
  }
}

export async function createProvider(payload: NewProvider): Promise<Provider> {
  const { data, error } = await supabase.rpc("create_provider", {
    p_name: payload.name,
    p_tax_id: payload.tax_id ?? null,
    p_provider_type: payload.provider_type ?? null,
    p_corporate_phone: payload.corporate_phone ?? null,
    p_company_email: payload.company_email ?? null,
    p_website: payload.website ?? null,
    p_full_address: payload.full_address ?? null,
    p_postal_code: payload.postal_code ?? null,
    p_city_unlocode: payload.city_unlocode ?? null,
    p_status: payload.status ?? "en_proceso_de_alta",
    p_credit_active: payload.credit_active ?? false,
    p_credit_amount: payload.credit_amount ?? null,
    p_credit_days: payload.credit_days ?? null,
    p_service_offerings: null,
  } as never)

  if (error || !data) {
    throw error ?? new Error("Failed to create provider")
  }

  return readProviderById(String(data))
}

export async function updateProvider(id: string, changes: UpdateProvider): Promise<Provider> {
  const { data: updatedId, error } = await supabase.rpc("update_provider_record" as never, {
    p_provider_id: id,
    p_changes: buildRpcPatch(changes),
  } as never)

  if (error || !updatedId) {
    throw error ?? new Error("Failed to update provider")
  }

  return readProviderById(id)
}

export async function deleteProvider(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_provider_record" as never, {
    p_provider_id: id,
  } as never)

  if (error) {
    throw error
  }
}

export async function createProviderContact(
  payload: NewProviderContact
): Promise<ProviderContact> {
  const { data, error } = await supabase.rpc("add_contact_to_provider", {
    p_provider_id: payload.provider_id,
    p_name: payload.name,
    p_email: payload.email ?? null,
    p_phone: payload.phone ?? null,
    p_linkedin_url: payload.linkedin_url ?? null,
    p_position: payload.position ?? null,
    p_status: payload.status ?? "activo",
  } as never)

  if (error || !data) {
    throw error ?? new Error("Failed to create provider contact")
  }

  return readProviderContactById(String(data))
}

export async function updateProviderContact(
  id: string,
  changes: UpdateProviderContact
): Promise<ProviderContact> {
  const { data: updatedId, error } = await supabase.rpc("update_provider_contact_record" as never, {
    p_contact_id: id,
    p_changes: buildRpcPatch(changes),
  } as never)

  if (error || !updatedId) {
    throw error ?? new Error("Failed to update provider contact")
  }

  return readProviderContactById(id)
}

export async function deleteProviderContact(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_provider_contact_record" as never, {
    p_contact_id: id,
  } as never)

  if (error) {
    throw error
  }
}

export async function createProviderServiceOffering(
  payload: NewProviderServiceOffering
): Promise<ProviderServiceOffering> {
  const { data, error } = await supabase.rpc("create_provider_service_offering_record" as never, {
    p_provider_id: payload.provider_id,
    p_service_transport_type_id: payload.service_transport_type_id,
    p_terms_and_conditions: payload.terms_and_conditions ?? null,
  } as never)

  if (error || !data) {
    throw error ?? new Error("Failed to create provider service offering")
  }

  return readProviderServiceOfferingById(String(data))
}

export async function updateProviderServiceOffering(
  id: string,
  changes: UpdateProviderServiceOffering
): Promise<ProviderServiceOffering> {
  const { data: updatedId, error } = await supabase.rpc("update_provider_service_offering_record" as never, {
    p_offering_id: id,
    p_changes: buildRpcPatch(changes),
  } as never)

  if (error || !updatedId) {
    throw error ?? new Error("Failed to update provider service offering")
  }

  return readProviderServiceOfferingById(id)
}

export async function deleteProviderServiceOffering(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_provider_service_offering_record" as never, {
    p_offering_id: id,
  } as never)

  if (error) {
    throw error
  }
}
