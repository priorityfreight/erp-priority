import { supabase } from "@/lib/supabaseClient"
import { getBackendMode } from "./backendMode"
import { buildRpcPatch } from "./rpcPatch"
import type {
  Client,
  ClientFullPayload,
  ClientLogisticsParty,
  ClientSummary,
  NewClient,
  NewClientLogisticsParty,
  Opportunity,
  UpdateClient,
} from "./models"

const CLIENT_COLUMNS =
  "id,company_name,account_owner_id,country,industry,website,corporate_phone,status,is_deleted,created_at,updated_at,full_address,postal_code,city,city_unlocode,city_unlocode_id,branch_id,credit_days,credit_limit,prospect_id,tax_id"
const CLIENT_SUMMARY_COLUMNS =
  "id,client_name,account_owner_id,account_owner_name,country,city,status,total_opportunities,pipeline_value"

function mapClient(row: Record<string, unknown>): Client {
  return {
    id: String(row.id),
    company_name: String(row.company_name ?? row.name ?? ""),
    account_owner_id: (row.account_owner_id as string | null | undefined) ?? null,
    country: (row.country as string | null | undefined) ?? null,
    industry: (row.industry as string | null | undefined) ?? null,
    website:
      (row.website as string | null | undefined) ??
      (row.email as string | null | undefined) ??
      null,
    corporate_phone:
      (row.corporate_phone as string | null | undefined) ??
      (row.phone as string | null | undefined) ??
      null,
    status: String(row.status ?? "cliente"),
    is_deleted: Boolean(row.is_deleted ?? false),
    created_at: String(row.created_at ?? new Date(0).toISOString()),
    updated_at: (row.updated_at as string | null | undefined) ?? null,
    full_address:
      (row.full_address as string | null | undefined) ??
      (row.address as string | null | undefined) ??
      null,
    postal_code: (row.postal_code as string | null | undefined) ?? null,
    city: (row.city as string | null | undefined) ?? null,
    city_unlocode: (row.city_unlocode as string | null | undefined) ?? null,
    city_unlocode_id: (row.city_unlocode_id as string | null | undefined) ?? null,
    branch_id: (row.branch_id as string | null | undefined) ?? null,
    credit_days: (row.credit_days as number | null | undefined) ?? null,
    credit_limit: (row.credit_limit as number | null | undefined) ?? null,
    prospect_id: (row.prospect_id as string | null | undefined) ?? null,
    tax_id: (row.tax_id as string | null | undefined) ?? null,
  }
}

async function deriveLocationFromUnlocode(cityUnlocode?: string | null): Promise<{
  city: string | null
  country: string | null
  city_unlocode: string | null
}> {
  const normalizedCode = cityUnlocode?.trim().toUpperCase() ?? ""

  if (!normalizedCode) {
    return {
      city: null,
      country: null,
      city_unlocode: null,
    }
  }

  const { data, error } = await supabase
    .from("unlocode_lookup_view")
    .select("unlocode,name,subdivision_code,country_name")
    .eq("unlocode", normalizedCode)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return {
      city: null,
      country: null,
      city_unlocode: normalizedCode,
    }
  }

  const cityName =
    data.subdivision_code && String(data.subdivision_code).trim().length > 0
      ? `${String(data.name)}, ${String(data.subdivision_code)}`
      : String(data.name)

  return {
    city: cityName,
    country: String(data.country_name ?? ""),
    city_unlocode: String(data.unlocode ?? normalizedCode),
  }
}

function mapOpportunity(row: Record<string, unknown>): Opportunity {
  return {
    id: String(row.id),
    client_id: String(row.client_id),
    salesperson_id: (row.salesperson_id as string | null | undefined) ?? null,
    title: String(row.title ?? ""),
    description: (row.description as string | null | undefined) ?? null,
    service_type: (row.service_type as string | null | undefined) ?? null,
    transport_type: (row.transport_type as string | null | undefined) ?? null,
    operation_type: (row.operation_type as string | null | undefined) ?? null,
    incoterm_id: (row.incoterm_id as string | null | undefined) ?? null,
    incoterm_code: (row.incoterm_code as string | null | undefined) ?? null,
    origin: (row.origin as string | null | undefined) ?? null,
    origin_unlocode: (row.origin_unlocode as string | null | undefined) ?? null,
    origin_unlocode_id: (row.origin_unlocode_id as string | null | undefined) ?? null,
    destination: (row.destination as string | null | undefined) ?? null,
    destination_unlocode: (row.destination_unlocode as string | null | undefined) ?? null,
    destination_unlocode_id: (row.destination_unlocode_id as string | null | undefined) ?? null,
    stage: (row.stage as string | null | undefined) ?? null,
    status: (row.status as string | null | undefined) ?? null,
    expected_profit_usd:
      (row.expected_profit_usd as number | null | undefined) ?? null,
    service_quantity: (row.service_quantity as number | null | undefined) ?? null,
    estimated_value: (row.estimated_value as number | null | undefined) ?? null,
    start_date: (row.start_date as string | null | undefined) ?? null,
    expiration_date: (row.expiration_date as string | null | undefined) ?? null,
    created_at: String(row.created_at ?? new Date(0).toISOString()),
    updated_at: (row.updated_at as string | null | undefined) ?? null,
  }
}

function mapClientLogisticsParty(row: Record<string, unknown>): ClientLogisticsParty {
  return {
    id: String(row.id),
    client_id: String(row.client_id),
    party_type: String(row.party_type ?? "shipper"),
    name: String(row.name ?? ""),
    full_address: (row.full_address as string | null | undefined) ?? null,
    postal_code: (row.postal_code as string | null | undefined) ?? null,
    city_unlocode: (row.city_unlocode as string | null | undefined) ?? null,
    city_unlocode_id: (row.city_unlocode_id as string | null | undefined) ?? null,
    city: (row.city as string | null | undefined) ?? null,
    country: (row.country as string | null | undefined) ?? null,
    contact_name: (row.contact_name as string | null | undefined) ?? null,
    contact_email: (row.contact_email as string | null | undefined) ?? null,
    contact_phone: (row.contact_phone as string | null | undefined) ?? null,
    created_at: String(row.created_at ?? new Date(0).toISOString()),
    updated_at: (row.updated_at as string | null | undefined) ?? null,
  }
}

export async function getClients(): Promise<Client[]> {
  await getBackendMode()

  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_COLUMNS)
    .eq("is_deleted", false)
    .order("company_name", { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => mapClient(row as Record<string, unknown>))
}

export async function getClientSummaries(query?: string): Promise<ClientSummary[]> {
  await getBackendMode()

  let request = supabase
    .from("client_overview_view")
    .select(CLIENT_SUMMARY_COLUMNS)
    .order("client_name", { ascending: true })

  const normalized = query?.trim()
  if (normalized) {
    request = request.ilike("client_name", `%${normalized}%`)
  }

  const { data, error } = await request

  if (error) {
    throw error
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    client_name: String(row.client_name ?? ""),
    account_owner_id: (row.account_owner_id as string | null | undefined) ?? null,
    account_owner_name: (row.account_owner_name as string | null | undefined) ?? null,
    country: (row.country as string | null | undefined) ?? null,
    city: (row.city as string | null | undefined) ?? null,
    status: String(row.status ?? "cliente"),
    total_opportunities: Number(row.total_opportunities ?? 0),
    pipeline_value: (row.pipeline_value as number | null | undefined) ?? null,
  }))
}

export async function searchClients(query: string): Promise<Client[]> {
  const normalized = query.trim()

  if (!normalized) {
    return getClients()
  }

  await getBackendMode()

  const { data, error } = await supabase.rpc("search_clients", {
    p_query: normalized,
  } as never)

  if (error) {
    throw error
  }

  const rows = ((data ?? []) as unknown) as Record<string, unknown>[]
  return rows.map((row) => mapClient(row))
}

export async function getClientById(id: string): Promise<Client | null> {
  await getBackendMode()

  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_COLUMNS)
    .eq("id", id)
    .eq("is_deleted", false)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ? mapClient(data as Record<string, unknown>) : null
}

export async function getClientFull(id: string): Promise<ClientFullPayload | null> {
  await getBackendMode()

  const { data, error } = await supabase.rpc("get_client_full", {
    p_client_id: id,
  } as never)

  if (error) {
    throw error
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null
  }

  const payload = data as Record<string, unknown>
  const client =
    payload.client && typeof payload.client === "object"
      ? mapClient(payload.client as Record<string, unknown>)
      : null

  if (!client) {
    return null
  }

  return {
    client,
    contacts: Array.isArray(payload.contacts)
      ? (payload.contacts as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          client_id: String(row.client_id),
          name: String(row.name ?? ""),
          email: (row.email as string | null | undefined) ?? null,
          phone: (row.phone as string | null | undefined) ?? null,
          linkedin_url: (row.linkedin_url as string | null | undefined) ?? null,
          position: (row.position as string | null | undefined) ?? null,
          status: String(row.status ?? "activo"),
          is_primary: Boolean(row.is_primary ?? false),
          created_at: String(row.created_at ?? new Date(0).toISOString()),
          updated_at: (row.updated_at as string | null | undefined) ?? null,
        }))
      : [],
    logistics_parties: Array.isArray(payload.logistics_parties)
      ? (payload.logistics_parties as Record<string, unknown>[]).map((row) =>
          mapClientLogisticsParty(row)
        )
      : [],
    opportunities: Array.isArray(payload.opportunities)
      ? (payload.opportunities as Record<string, unknown>[]).map((row) => mapOpportunity(row))
      : [],
    quotations: Array.isArray(payload.quotations)
      ? (payload.quotations as Array<Record<string, unknown>>)
      : [],
    shipments: Array.isArray(payload.shipments)
      ? (payload.shipments as Array<Record<string, unknown>>)
      : [],
  }
}

export async function createClient(payload: NewClient): Promise<Client> {
  await getBackendMode()
  const derivedLocation = payload.city_unlocode
    ? await deriveLocationFromUnlocode(payload.city_unlocode)
    : {
        city: payload.city ?? null,
        country: payload.country ?? null,
        city_unlocode: payload.city_unlocode ?? null,
      }

  const { data, error } = await supabase.rpc("create_client_with_contacts", {
    p_company_name: payload.company_name,
    p_website: payload.website ?? null,
    p_corporate_phone: payload.corporate_phone ?? null,
    p_country: derivedLocation.country ?? null,
    p_industry: payload.industry ?? null,
    p_status: payload.status ?? "prospecto",
    p_full_address: payload.full_address ?? null,
    p_postal_code: payload.postal_code ?? null,
    p_city: derivedLocation.city ?? null,
    p_city_unlocode: derivedLocation.city_unlocode ?? null,
    p_account_owner_id: payload.account_owner_id ?? null,
    p_contacts: null,
  } as never)

  if (error || !data) {
    throw error ?? new Error("Failed to create client")
  }

  const client = await getClientById(String(data))
  if (!client) {
    throw new Error("Created client could not be loaded")
  }

  if (payload.tax_id !== undefined && payload.tax_id !== null) {
    return updateClient(client.id, {
      tax_id: payload.tax_id,
    })
  }

  return client
}

export async function updateClient(id: string, changes: UpdateClient): Promise<Client> {
  await getBackendMode()

  const canonicalChanges: Record<string, unknown> = {}
  const shouldDeriveLocation = changes.city_unlocode !== undefined
  const derivedLocation = shouldDeriveLocation
    ? await deriveLocationFromUnlocode(changes.city_unlocode ?? null)
    : null

  if (changes.company_name !== undefined) canonicalChanges.company_name = changes.company_name
  if (changes.industry !== undefined) canonicalChanges.industry = changes.industry
  if (changes.website !== undefined) canonicalChanges.website = changes.website
  if (changes.corporate_phone !== undefined) canonicalChanges.corporate_phone = changes.corporate_phone
  if (changes.status !== undefined) canonicalChanges.status = changes.status
  if (changes.account_owner_id !== undefined) canonicalChanges.account_owner_id = changes.account_owner_id
  if (changes.full_address !== undefined) canonicalChanges.full_address = changes.full_address
  if (changes.postal_code !== undefined) canonicalChanges.postal_code = changes.postal_code
  if (shouldDeriveLocation) {
    canonicalChanges.city = derivedLocation?.city ?? null
    canonicalChanges.country = derivedLocation?.country ?? null
    canonicalChanges.city_unlocode = derivedLocation?.city_unlocode ?? null
  } else {
    if (changes.city !== undefined) canonicalChanges.city = changes.city
    if (changes.country !== undefined) canonicalChanges.country = changes.country
  }
  if (changes.tax_id !== undefined) canonicalChanges.tax_id = changes.tax_id

  if (Object.keys(canonicalChanges).length === 0) {
    const currentClient = await getClientById(id)
    if (!currentClient) {
      throw new Error("Client could not be loaded")
    }

    return currentClient
  }

  const { data, error } = await supabase.rpc("update_client_record" as never, {
    p_client_id: id,
    p_changes: buildRpcPatch(canonicalChanges),
  } as never)

  if (error || !data) {
    throw error ?? new Error("Client update is not permitted by the current backend")
  }

  const updatedClient = await getClientById(id)
  if (!updatedClient) {
    throw new Error("Updated client could not be loaded")
  }

  return updatedClient
}

export async function createClientLogisticsParty(
  payload: NewClientLogisticsParty
): Promise<ClientLogisticsParty> {
  const { data, error } = await supabase.rpc("add_client_logistics_party", {
    p_client_id: payload.client_id,
    p_party_type: payload.party_type,
    p_name: payload.name,
    p_full_address: payload.full_address ?? null,
    p_postal_code: payload.postal_code ?? null,
    p_city_unlocode: payload.city_unlocode ?? null,
    p_contact_name: payload.contact_name ?? null,
    p_contact_email: payload.contact_email ?? null,
    p_contact_phone: payload.contact_phone ?? null,
  } as never)

  if (error || !data) {
    throw error ?? new Error("Failed to create client logistics party")
  }

  const { data: row, error: readError } = await supabase
    .from("client_logistics_parties")
    .select("*")
    .eq("id", data)
    .single()

  if (readError) {
    throw readError
  }

  return mapClientLogisticsParty(row as Record<string, unknown>)
}

export async function deleteClientLogisticsParty(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_client_logistics_party", {
    p_party_id: id,
  } as never)

  if (error) {
    throw error
  }
}

export async function deleteClient(id: string): Promise<void> {
  await getBackendMode()

  const { error } = await supabase.rpc("delete_client_record" as never, {
    p_client_id: id,
  } as never)

  if (error) {
    throw error
  }
}
