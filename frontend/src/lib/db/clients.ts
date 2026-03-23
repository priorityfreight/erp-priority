import { supabase } from "@/lib/supabaseClient"
import { getBackendMode } from "./backendMode"
import {
  applyClientProfileOverlay,
  removeClientProfileOverlay,
  saveClientProfileOverlay,
} from "./clientProfileStore"
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

function mapClient(row: Record<string, unknown>, mode: "legacy" | "canonical" = "legacy"): Client {
  const client = {
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

  return mode === "legacy" ? applyClientProfileOverlay(client) : client
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

function mapClientSummary(
  client: Client,
  opportunities: Opportunity[]
): ClientSummary {
  const related = opportunities.filter((opportunity) => opportunity.client_id === client.id)

  return {
    id: client.id,
    client_name: client.company_name,
    account_owner_id: client.account_owner_id,
    account_owner_name: null,
    country: client.country,
    city: client.city,
    status: client.status,
    total_opportunities: related.length,
    pipeline_value: related.reduce(
      (total, opportunity) => total + (opportunity.estimated_value ?? 0),
      0
    ),
  }
}

async function getLegacyOpportunities(): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => mapOpportunity(row as Record<string, unknown>))
}

export async function getClients(): Promise<Client[]> {
  const mode = await getBackendMode()

  if (mode === "canonical") {
    const { data, error } = await supabase
      .from("clients")
      .select(CLIENT_COLUMNS)
      .eq("is_deleted", false)
      .order("company_name", { ascending: true })

    if (error) {
      throw error
    }

    return (data ?? []).map((row) => mapClient(row as Record<string, unknown>, "canonical"))
  }

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("name", { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => mapClient(row as Record<string, unknown>, "legacy"))
}

export async function getClientSummaries(query?: string): Promise<ClientSummary[]> {
  const mode = await getBackendMode()

  if (mode === "canonical") {
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

  const [clients, opportunities] = await Promise.all([getClients(), getLegacyOpportunities()])
  const normalized = query?.trim().toLowerCase()

  return clients
    .filter((client) =>
      normalized ? client.company_name.toLowerCase().includes(normalized) : true
    )
    .map((client) => mapClientSummary(client, opportunities))
}

export async function searchClients(query: string): Promise<Client[]> {
  const normalized = query.trim()

  if (!normalized) {
    return getClients()
  }

  const mode = await getBackendMode()

  if (mode === "canonical") {
    const { data, error } = await supabase.rpc("search_clients", {
      p_query: normalized,
    } as never)

    if (error) {
      throw error
    }

    const rows = ((data ?? []) as unknown) as Record<string, unknown>[]
    return rows.map((row) => mapClient(row, "canonical"))
  }

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .ilike("name", `%${normalized}%`)
    .order("name", { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => mapClient(row as Record<string, unknown>, "legacy"))
}

export async function getClientById(id: string): Promise<Client | null> {
  const mode = await getBackendMode()

  let request = supabase.from("clients").select("*").eq("id", id)
  if (mode === "canonical") {
    request = request.eq("is_deleted", false)
  }

  const { data, error } = await request.maybeSingle()

  if (error) {
    throw error
  }

  return data ? mapClient(data as Record<string, unknown>, mode) : null
}

export async function getClientFull(id: string): Promise<ClientFullPayload | null> {
  const mode = await getBackendMode()

  if (mode === "canonical") {
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
    const client = payload.client && typeof payload.client === "object"
      ? mapClient(payload.client as Record<string, unknown>, "canonical")
      : null

    if (!client) {
      return null
    }

    return {
      client,
      contacts: Array.isArray(payload.contacts) ? (payload.contacts as Record<string, unknown>[]).map((row) => ({
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
      })) : [],
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

  const [client, contactsResult, opportunitiesResult] = await Promise.all([
    getClientById(id),
    supabase.from("contacts").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    supabase.from("opportunities").select("*").eq("client_id", id).order("created_at", { ascending: false }),
  ])

  if (!client) {
    return null
  }

  if (contactsResult.error) {
    throw contactsResult.error
  }

  if (opportunitiesResult.error) {
    throw opportunitiesResult.error
  }

  const contactRows = ((contactsResult.data ?? []) as unknown) as Record<string, unknown>[]
  const opportunityRows =
    ((opportunitiesResult.data ?? []) as unknown) as Record<string, unknown>[]

  return {
    client,
    contacts: contactRows.map((row) => ({
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
    })),
    logistics_parties: [],
    opportunities: opportunityRows.map((row) => mapOpportunity(row)),
    quotations: [],
    shipments: [],
  }
}

export async function createClient(payload: NewClient): Promise<Client> {
  const mode = await getBackendMode()

  if (mode === "canonical") {
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

    removeClientProfileOverlay(client.id)
    return client
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: payload.company_name,
      country: payload.country ?? null,
      industry: payload.industry ?? null,
    } as never)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  const client = mapClient(data as Record<string, unknown>)

  saveClientProfileOverlay(client.id, {
    website: payload.website ?? null,
    corporate_phone: payload.corporate_phone ?? null,
    status: payload.status ?? "prospecto",
    full_address: payload.full_address ?? null,
    postal_code: payload.postal_code ?? null,
    city: payload.city ?? null,
    city_unlocode: payload.city_unlocode ?? null,
  })

  return applyClientProfileOverlay(client)
}

export async function updateClient(id: string, changes: UpdateClient): Promise<Client> {
  const mode = await getBackendMode()

  if (mode === "canonical") {
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

    const { data, error } = await supabase
      .from("clients")
      .update(canonicalChanges as never)
      .eq("id", id)
      .select("id")
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error("Client update is not permitted by the current backend")
    }

    removeClientProfileOverlay(id)

    const updatedClient = await getClientById(id)
    if (!updatedClient) {
      throw new Error("Updated client could not be loaded")
    }

    return updatedClient
  }

  const legacyChanges: Record<string, unknown> = {}

  if (typeof changes.company_name === "string") {
    legacyChanges.name = changes.company_name
  }
  if (changes.country !== undefined) {
    legacyChanges.country = changes.country
  }
  if (changes.industry !== undefined) {
    legacyChanges.industry = changes.industry
  }

  saveClientProfileOverlay(id, {
    website: changes.website,
    corporate_phone: changes.corporate_phone,
    status: changes.status,
    full_address: changes.full_address,
    postal_code: changes.postal_code,
    city: changes.city,
    city_unlocode: changes.city_unlocode,
  })

  if (Object.keys(legacyChanges).length === 0) {
    const currentClient = await getClientById(id)
    if (!currentClient) {
      throw new Error("Client could not be loaded")
    }

    return currentClient
  }

  const { data, error } = await supabase
    .from("clients")
    .update(legacyChanges as never)
    .eq("id", id)
    .select("id")
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error("Client update is not permitted by the current backend")
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
  const mode = await getBackendMode()

  if (mode === "canonical") {
    const { error } = await supabase.rpc("soft_delete_client", {
      p_client_id: id,
    } as never)

    if (error) {
      throw error
    }

    removeClientProfileOverlay(id)
    return
  }

  const [deleteOpportunities, deleteContacts] = await Promise.all([
    supabase.from("opportunities").delete().eq("client_id", id),
    supabase.from("contacts").delete().eq("client_id", id),
  ])

  if (deleteOpportunities.error) {
    throw deleteOpportunities.error
  }

  if (deleteContacts.error) {
    throw deleteContacts.error
  }

  const { error } = await supabase.from("clients").delete().eq("id", id)

  if (error) {
    throw error
  }

  removeClientProfileOverlay(id)
}
