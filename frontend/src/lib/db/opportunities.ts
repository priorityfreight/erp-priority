import { supabase } from "@/lib/supabaseClient"
import { getBackendMode } from "./backendMode"
import type {
  Opportunity,
  OpportunitySummary,
  OpportunityWithClient,
  UpdateOpportunity,
} from "./models"

const OPPORTUNITY_SYNC_INTERVAL_MS = 60_000
let lastOpportunitySyncAt = 0
const OPPORTUNITY_COLUMNS =
  "id,client_id,salesperson_id,title,description,service_type,transport_type,operation_type,incoterm_id,origin,origin_unlocode,origin_unlocode_id,destination,destination_unlocode,destination_unlocode_id,stage,status,expected_profit_usd,service_quantity,estimated_value,start_date,expiration_date,created_at,updated_at"
const OPPORTUNITY_SUMMARY_COLUMNS =
  "id,client_id,client_name,salesperson_id,salesperson_name,title,stage,status,service_type,transport_type,operation_type,incoterm_id,incoterm_code,origin,origin_unlocode,origin_unlocode_id,destination,destination_unlocode,destination_unlocode_id,expected_profit_usd,service_quantity,estimated_value,start_date,expiration_date,created_at"

export type CreateOpportunityInput = {
  clientId: string
  salespersonId?: string | null
  serviceType: string
  transportType: string
  operationType: string
  incotermId: string
  originUnlocode: string
  destinationUnlocode: string
  expectedProfitUsd: number | null
  serviceQuantity: number | null
  description?: string | null
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

function mapOpportunitySummary(row: Record<string, unknown>): OpportunitySummary {
  return {
    ...mapOpportunity(row),
    client_name: (row.client_name as string | null | undefined) ?? null,
    salesperson_name: (row.salesperson_name as string | null | undefined) ?? null,
  }
}

function applyOpportunityFilters(
  opportunities: OpportunitySummary[],
  params?: { query?: string; status?: string }
): OpportunitySummary[] {
  const normalizedQuery = params?.query?.trim().toLowerCase() ?? ""
  const normalizedStatus = params?.status?.trim() ?? "all"

  return opportunities.filter((opportunity) => {
    const matchesSearch =
      !normalizedQuery ||
      [
        opportunity.title,
        opportunity.client_name,
        opportunity.service_type,
        opportunity.transport_type,
        opportunity.operation_type,
        opportunity.incoterm_code,
        opportunity.origin,
        opportunity.destination,
        opportunity.salesperson_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))

    const matchesStatus =
      normalizedStatus === "all" || (opportunity.status ?? "unknown") === normalizedStatus

    return matchesSearch && matchesStatus
  })
}

async function syncExpiredOpportunitiesIfCanonical() {
  const mode = await getBackendMode()

  if (mode !== "canonical") {
    return mode
  }

  const now = Date.now()
  if (now - lastOpportunitySyncAt < OPPORTUNITY_SYNC_INTERVAL_MS) {
    return mode
  }

  const { error } = await supabase.rpc("sync_expired_opportunities" as never)
  if (error) {
    throw error
  }

  lastOpportunitySyncAt = now

  return mode
}

export async function getOpportunities(params?: {
  query?: string
  status?: string
}): Promise<OpportunitySummary[]> {
  const mode = await syncExpiredOpportunitiesIfCanonical()

  if (mode === "canonical") {
    let request = supabase
      .from("open_opportunities_view")
      .select(OPPORTUNITY_SUMMARY_COLUMNS)
      .order("created_at", { ascending: false })

    const normalizedQuery = params?.query?.trim()
    if (normalizedQuery) {
      request = request.or(
        `title.ilike.%${normalizedQuery}%,client_name.ilike.%${normalizedQuery}%,service_type.ilike.%${normalizedQuery}%,transport_type.ilike.%${normalizedQuery}%,operation_type.ilike.%${normalizedQuery}%,incoterm_code.ilike.%${normalizedQuery}%,origin.ilike.%${normalizedQuery}%,destination.ilike.%${normalizedQuery}%,salesperson_name.ilike.%${normalizedQuery}%`
      )
    }

    const normalizedStatus = params?.status?.trim()
    if (normalizedStatus && normalizedStatus !== "all") {
      request = request.eq("status", normalizedStatus)
    }

    const { data, error } = await request

    if (error) {
      throw error
    }

    return ((data ?? []) as Record<string, unknown>[]).map((row) => mapOpportunitySummary(row))
  }

  const [opportunitiesResult, clientsResult] = await Promise.all([
    supabase.from("opportunities").select("*").order("created_at", { ascending: false }),
    supabase.from("clients").select("id,company_name"),
  ])

  if (opportunitiesResult.error) {
    throw opportunitiesResult.error
  }

  if (clientsResult.error) {
    throw clientsResult.error
  }

  const clientRows = ((clientsResult.data ?? []) as unknown) as Array<{
    id: string
    company_name: string | null
  }>
  const opportunityRows = (opportunitiesResult.data ?? []) as Record<string, unknown>[]

  const clientNames = new Map(
    clientRows.map((client) => [String(client.id), String(client.company_name ?? "")])
  )

  return applyOpportunityFilters(opportunityRows.map((row) => ({
    ...mapOpportunity(row),
    client_name: clientNames.get(String(row.client_id)) ?? null,
    salesperson_name: null,
  })), params)
}

export async function getOpportunitiesByClientId(clientId: string): Promise<Opportunity[]> {
  const mode = await syncExpiredOpportunitiesIfCanonical()

  if (mode === "canonical") {
    const { data, error } = await supabase
      .from("open_opportunities_view")
      .select(OPPORTUNITY_SUMMARY_COLUMNS)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    return ((data ?? []) as Record<string, unknown>[]).map((row) => mapOpportunity(row))
  }

  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => mapOpportunity(row))
}

export async function getOpportunityById(id: string): Promise<OpportunityWithClient | null> {
  const mode = await syncExpiredOpportunitiesIfCanonical()

  if (mode === "canonical") {
    const { data, error } = await supabase
      .from("opportunities")
      .select(OPPORTUNITY_COLUMNS)
      .eq("id", id)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      return null
    }

    const record = data as unknown as Record<string, unknown>
    const [clientResult, salespersonResult, incotermResult] = await Promise.all([
      record.client_id
        ? supabase
            .from("clients")
            .select("id,company_name")
            .eq("id", String(record.client_id))
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      record.salesperson_id
        ? supabase
            .from("users")
            .select("first_name,last_name")
            .eq("id", String(record.salesperson_id))
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      record.incoterm_id
        ? supabase
            .from("incoterms")
            .select("code")
            .eq("id", String(record.incoterm_id))
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])

    if (clientResult.error) {
      throw clientResult.error
    }

    if (salespersonResult.error) {
      throw salespersonResult.error
    }

    if (incotermResult.error) {
      throw incotermResult.error
    }

    const clientRelation = clientResult.data
      ? {
          id: String((clientResult.data as { id: string }).id),
          company_name: String(
            (clientResult.data as { company_name?: string | null }).company_name ?? ""
          ),
        }
      : null

    const salespersonName = salespersonResult.data
      ? [
          (salespersonResult.data as { first_name?: string | null }).first_name,
          (salespersonResult.data as { last_name?: string | null }).last_name,
        ]
          .filter(Boolean)
          .join(" ")
      : null

    return {
      ...mapOpportunity(record),
      incoterm_code: incotermResult.data
        ? String((incotermResult.data as { code?: string | null }).code ?? "")
        : null,
      clients: clientRelation,
      salesperson_name: salespersonName,
    }
  }

  const { data, error } = await supabase.from("opportunities").select("*").eq("id", id).maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const opportunityRow = data as Record<string, unknown>

  const [clientResult, incotermResult] = await Promise.all([
    supabase
      .from("clients")
      .select("id,company_name")
      .eq("id", String(opportunityRow.client_id))
      .maybeSingle(),
    opportunityRow.incoterm_id
      ? supabase
          .from("incoterms")
          .select("code")
          .eq("id", String(opportunityRow.incoterm_id))
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  if (clientResult.error) {
    throw clientResult.error
  }

  if (incotermResult.error) {
    throw incotermResult.error
  }

  return {
    ...mapOpportunity(opportunityRow),
    clients: clientResult.data
      ? {
          id: String((clientResult.data as { id: string }).id),
          company_name: String(
            (clientResult.data as { company_name?: string | null }).company_name ?? ""
          ),
        }
      : null,
    incoterm_code: incotermResult.data
      ? String((incotermResult.data as { code?: string | null }).code ?? "")
      : null,
    salesperson_name: null,
  }
}

export async function createOpportunity(input: CreateOpportunityInput): Promise<string> {
  const mode = await getBackendMode()

  if (mode === "canonical") {
    const { data, error } = await supabase.rpc("create_opportunity", {
      p_client_id: input.clientId,
      p_service_type: input.serviceType,
      p_transport_type: input.transportType,
      p_operation_type: input.operationType,
      p_incoterm_id: input.incotermId || null,
      p_origin_unlocode: input.originUnlocode,
      p_destination_unlocode: input.destinationUnlocode,
      p_expected_profit_usd: input.expectedProfitUsd,
      p_service_quantity: input.serviceQuantity,
      p_salesperson_id: input.salespersonId || null,
      p_description: input.description || null,
      p_status: "investigando",
    } as never)

    if (error || !data) {
      throw error ?? new Error("Failed to create opportunity")
    }

    return String(data)
  }

  const { data, error } = await supabase
    .from("opportunities")
    .insert({
      client_id: input.clientId,
      salesperson_id: input.salespersonId || null,
      title: "Opportunity",
      service_type: input.serviceType,
      transport_type: input.transportType,
      operation_type: input.operationType,
      incoterm_id: input.incotermId || null,
      origin_unlocode: input.originUnlocode,
      destination_unlocode: input.destinationUnlocode,
      status: "investigando",
      expected_profit_usd: input.expectedProfitUsd,
      service_quantity: input.serviceQuantity,
      description: input.description || null,
    } as never)
    .select("id")
    .single()

  const createdRow = data as { id?: string } | null

  if (error || !createdRow?.id) {
    throw error ?? new Error("Failed to create opportunity")
  }

  return String(createdRow.id)
}

export async function updateOpportunity(
  id: string,
  changes: UpdateOpportunity
): Promise<Opportunity> {
  const { data: updatedRow, error } = await supabase
    .from("opportunities")
    .update(changes as never)
    .eq("id", id)
    .select("*")
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!updatedRow) {
    throw new Error("Opportunity update is not permitted by the current backend")
  }

  return mapOpportunity(updatedRow as Record<string, unknown>)
}

export async function updateOpportunityStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase.rpc("update_opportunity_status", {
    p_opportunity_id: id,
    p_status: status,
  } as never)

  if (error) {
    throw error
  }
}

export async function deleteOpportunity(id: string): Promise<void> {
  const { error } = await supabase.from("opportunities").delete().eq("id", id)

  if (error) {
    throw error
  }
}
