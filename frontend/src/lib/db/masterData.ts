import { supabase } from "@/lib/supabaseClient"
import { getMasterDataBackendMode, type MasterDataBackendMode } from "./backendMode"
import type {
  Incoterm,
  NewQuotationRejectionReason,
  NewSalesAccountingConcept,
  NewServiceTransportType,
  QuotationRejectionReason,
  SalesAccountingConcept,
  ServiceTransportType,
  UpdateQuotationRejectionReason,
  UpdateSalesAccountingConcept,
  UpdateServiceTransportType,
  UnlocodeCountrySummary,
  UnlocodeRecord,
  UnlocodeSearchParams,
  UnlocodeSearchResult,
} from "./models"

function mapUnlocodeRecord(row: Record<string, unknown>): UnlocodeRecord {
  return {
    id: String(row.id),
    country_code: String(row.country_code ?? ""),
    location_code: String(row.location_code ?? ""),
    unlocode: String(row.unlocode ?? ""),
    country_name: String(row.country_name ?? ""),
    name: String(row.name ?? ""),
    name_without_diacritics: (row.name_without_diacritics as string | null | undefined) ?? null,
    subdivision_code: (row.subdivision_code as string | null | undefined) ?? null,
    function_classifier: (row.function_classifier as string | null | undefined) ?? null,
    status: (row.status as string | null | undefined) ?? null,
    change_indicator: (row.change_indicator as string | null | undefined) ?? null,
    date_code: (row.date_code as string | null | undefined) ?? null,
    iata_code: (row.iata_code as string | null | undefined) ?? null,
    coordinates: (row.coordinates as string | null | undefined) ?? null,
    remarks: (row.remarks as string | null | undefined) ?? null,
    search_text: (row.search_text as string | null | undefined) ?? undefined,
    source_page_url: String(row.source_page_url ?? ""),
  }
}

function mapServiceTransportType(row: Record<string, unknown>): ServiceTransportType {
  return {
    id: String(row.id),
    service_type: String(row.service_type ?? ""),
    transport_type: String(row.transport_type ?? ""),
    created_at: String(row.created_at ?? new Date(0).toISOString()),
    updated_at: (row.updated_at as string | null | undefined) ?? null,
  }
}

function mapIncoterm(row: Record<string, unknown>): Incoterm {
  return {
    id: String(row.id),
    code: String(row.code ?? ""),
    description: (row.description as string | null | undefined) ?? null,
    created_at: String(row.created_at ?? new Date(0).toISOString()),
    updated_at: (row.updated_at as string | null | undefined) ?? null,
  }
}

function mapSalesAccountingConcept(row: Record<string, unknown>): SalesAccountingConcept {
  return {
    id: String(row.id),
    concept: String(row.concept ?? ""),
    service_type: String(row.service_type ?? ""),
    operation_type: String(row.operation_type ?? ""),
    vat_rate: Number(row.vat_rate ?? 0),
    sat_code: String(row.sat_code ?? ""),
    created_at: String(row.created_at ?? new Date(0).toISOString()),
    updated_at: (row.updated_at as string | null | undefined) ?? null,
  }
}

function mapQuotationRejectionReason(row: Record<string, unknown>): QuotationRejectionReason {
  return {
    id: String(row.id ?? ""),
    reason: String(row.reason ?? ""),
    created_at: String(row.created_at ?? new Date(0).toISOString()),
    updated_at: (row.updated_at as string | null | undefined) ?? null,
  }
}

function buildSearchFilter(query: string) {
  const normalized = query.replace(/,/g, " ").trim().toLowerCase()

  if (!normalized) {
    return null
  }

  return `search_text.ilike.%${normalized}%`
}

async function getCanonicalUnlocodes(
  params: UnlocodeSearchParams,
  mode: MasterDataBackendMode
): Promise<UnlocodeSearchResult> {
  const pageSize = Math.min(Math.max(params.pageSize ?? 25, 1), 100)
  const page = Math.max(params.page ?? 1, 1)
  const query = params.query?.trim() ?? ""
  const countryCode =
    params.countryCode && params.countryCode !== "all"
      ? params.countryCode.toUpperCase()
      : null

  let countQuery = supabase
    .from("unlocode_lookup_view")
    .select("id", { count: "exact", head: true })

  if (countryCode) {
    countQuery = countQuery.eq("country_code", countryCode)
  }

  const searchFilter = buildSearchFilter(query)
  if (searchFilter) {
    countQuery = countQuery.or(searchFilter)
  }

  const [{ count, error: countError }, { data, error }] = await Promise.all([
    countQuery,
    supabase.rpc("search_unlocodes", {
      p_query: query || null,
      p_country_code: countryCode,
      p_function_classifier: null,
      p_limit: pageSize,
      p_offset: (page - 1) * pageSize,
    } as never),
  ])

  if (countError) {
    throw countError
  }

  if (error) {
    throw error
  }

  const items = (((data ?? []) as unknown) as Record<string, unknown>[]).map((row) =>
    mapUnlocodeRecord(row)
  )

  let countrySummaryRequest = supabase
    .from("unlocode_country_summary_view")
    .select("country_code,row_count")
    .order("country_code", { ascending: true })

  if (countryCode) {
    countrySummaryRequest = countrySummaryRequest.eq("country_code", countryCode)
  }

  const { data: summaryRows, error: summaryError } = await countrySummaryRequest

  if (summaryError) {
    throw summaryError
  }

  const countrySummaries: UnlocodeCountrySummary[] = (
    (summaryRows ?? []) as Record<string, unknown>[]
  ).map((row) => ({
    country_code: String(row.country_code ?? ""),
    row_count: Number(row.row_count ?? 0),
  }))

  return {
    items,
    total: count ?? items.length,
    page,
    pageSize,
    mode,
    availableCountries: countrySummaries.map((entry) => entry.country_code),
    countrySummaries,
  }
}

async function getSnapshotUnlocodes(params: UnlocodeSearchParams): Promise<UnlocodeSearchResult> {
  const searchParams = new URLSearchParams()

  if (params.query) searchParams.set("query", params.query)
  if (params.countryCode) searchParams.set("country", params.countryCode)
  if (params.page) searchParams.set("page", String(params.page))
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize))

  const response = await fetch(`/api/master-data/unlocodes?${searchParams.toString()}`)
  if (!response.ok) {
    throw new Error("Unable to load UN/LOCODE snapshot")
  }

  return (await response.json()) as UnlocodeSearchResult
}

export async function searchUnlocodes(
  params: UnlocodeSearchParams = {}
): Promise<UnlocodeSearchResult> {
  const mode = await getMasterDataBackendMode()

  if (mode === "canonical") {
    return getCanonicalUnlocodes(params, mode)
  }

  // Temporary rollback safety only. Canonical backend search is the primary path.
  return getSnapshotUnlocodes(params)
}

export async function getServiceTransportTypes(params?: {
  query?: string
  serviceType?: string
}): Promise<ServiceTransportType[]> {
  let request = supabase
    .from("service_transport_type_lookup_view")
    .select("*")
    .order("service_type", { ascending: true })
    .order("transport_type", { ascending: true })

  const normalizedQuery = params?.query?.trim()
  if (normalizedQuery) {
    request = request.or(
      `service_type.ilike.%${normalizedQuery}%,transport_type.ilike.%${normalizedQuery}%`
    )
  }

  const normalizedServiceType = params?.serviceType?.trim()
  if (normalizedServiceType && normalizedServiceType !== "all") {
    request = request.eq("service_type", normalizedServiceType)
  }

  const { data, error } = await request

  if (error) {
    throw error
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) =>
    mapServiceTransportType(row)
  )
}

export async function getIncoterms(): Promise<Incoterm[]> {
  const { data, error } = await supabase
    .from("incoterms")
    .select("*")
    .order("code", { ascending: true })

  if (error) {
    throw error
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => mapIncoterm(row))
}

export async function getSalesAccountingConcepts(params?: {
  query?: string
  serviceType?: string
  operationType?: string
}): Promise<SalesAccountingConcept[]> {
  let request = supabase
    .from("sales_accounting_concept_lookup_view")
    .select("*")
    .order("service_type", { ascending: true })
    .order("operation_type", { ascending: true })
    .order("concept", { ascending: true })

  const normalizedQuery = params?.query?.trim()
  if (normalizedQuery) {
    request = request.or(
      `concept.ilike.%${normalizedQuery}%,service_type.ilike.%${normalizedQuery}%,operation_type.ilike.%${normalizedQuery}%,sat_code.ilike.%${normalizedQuery}%`
    )
  }

  const normalizedServiceType = params?.serviceType?.trim()
  if (normalizedServiceType && normalizedServiceType !== "all") {
    request = request.eq("service_type", normalizedServiceType)
  }

  const normalizedOperationType = params?.operationType?.trim()
  if (normalizedOperationType && normalizedOperationType !== "all") {
    request = request.eq("operation_type", normalizedOperationType)
  }

  const { data, error } = await request

  if (error) {
    throw error
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) =>
    mapSalesAccountingConcept(row)
  )
}

export async function createSalesAccountingConcept(
  payload: NewSalesAccountingConcept
): Promise<string> {
  const { data, error } = await supabase.rpc("create_sales_accounting_concept", {
    p_concept: payload.concept,
    p_service_type: payload.service_type,
    p_operation_type: payload.operation_type,
    p_vat_rate: payload.vat_rate,
    p_sat_code: payload.sat_code,
  } as never)

  if (error || !data) {
    throw error ?? new Error("Failed to create sales accounting concept")
  }

  return String(data)
}

export async function updateSalesAccountingConcept(
  id: string,
  payload: UpdateSalesAccountingConcept
): Promise<void> {
  const { error } = await supabase.rpc("update_sales_accounting_concept", {
    p_id: id,
    p_concept: payload.concept,
    p_service_type: payload.service_type,
    p_operation_type: payload.operation_type,
    p_vat_rate: payload.vat_rate,
    p_sat_code: payload.sat_code,
  } as never)

  if (error) {
    throw error
  }
}

export async function deleteSalesAccountingConcept(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_sales_accounting_concept", {
    p_id: id,
  } as never)

  if (error) {
    throw error
  }
}

export async function getQuotationRejectionReasons(params?: {
  query?: string
}): Promise<QuotationRejectionReason[]> {
  let request = supabase
    .from("quotation_rejection_reason_lookup_view")
    .select("*")
    .order("reason", { ascending: true })

  const normalizedQuery = params?.query?.trim()
  if (normalizedQuery) {
    request = request.ilike("reason", `%${normalizedQuery}%`)
  }

  const { data, error } = await request

  if (error) {
    throw error
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) =>
    mapQuotationRejectionReason(row)
  )
}

export async function createQuotationRejectionReason(
  payload: NewQuotationRejectionReason
): Promise<string> {
  const { data, error } = await supabase.rpc("create_quotation_rejection_reason", {
    p_reason: payload.reason,
  } as never)

  if (error || !data) {
    throw error ?? new Error("Failed to create quotation rejection reason")
  }

  return String(data)
}

export async function updateQuotationRejectionReason(
  id: string,
  payload: UpdateQuotationRejectionReason
): Promise<void> {
  const { error } = await supabase.rpc("update_quotation_rejection_reason", {
    p_id: id,
    p_reason: payload.reason,
  } as never)

  if (error) {
    throw error
  }
}

export async function deleteQuotationRejectionReason(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_quotation_rejection_reason", {
    p_id: id,
  } as never)

  if (error) {
    throw error
  }
}

export async function createServiceTransportType(
  payload: NewServiceTransportType
): Promise<string> {
  const { data, error } = await supabase.rpc("create_service_transport_type", {
    p_service_type: payload.service_type,
    p_transport_type: payload.transport_type,
  } as never)

  if (error || !data) {
    throw error ?? new Error("Failed to create service transport type")
  }

  return String(data)
}

export async function updateServiceTransportType(
  id: string,
  payload: UpdateServiceTransportType
): Promise<void> {
  const { error } = await supabase.rpc("update_service_transport_type", {
    p_id: id,
    p_service_type: payload.service_type,
    p_transport_type: payload.transport_type,
  } as never)

  if (error) {
    throw error
  }
}

export async function deleteServiceTransportType(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_service_transport_type", {
    p_id: id,
  } as never)

  if (error) {
    throw error
  }
}
