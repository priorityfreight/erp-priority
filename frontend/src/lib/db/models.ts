export type Client = {
  id: string
  company_name: string
  account_owner_id: string | null
  country: string | null
  industry: string | null
  website: string | null
  corporate_phone: string | null
  status: string
  is_deleted: boolean
  created_at: string
  updated_at: string | null
  full_address: string | null
  postal_code: string | null
  city: string | null
  city_unlocode: string | null
  city_unlocode_id?: string | null
  branch_id: string | null
  credit_days: number | null
  credit_limit: number | null
  prospect_id: string | null
  tax_id: string | null
}

export type ClientSummary = {
  id: string
  client_name: string
  account_owner_id: string | null
  account_owner_name: string | null
  country: string | null
  city: string | null
  status: string
  total_opportunities: number
  pipeline_value: number | null
}

export type Contact = {
  id: string
  client_id: string
  name: string
  email: string | null
  phone: string | null
  linkedin_url: string | null
  position: string | null
  status: string
  is_primary: boolean
  created_at: string
  updated_at: string | null
}

export type ContactWithClient = Contact & {
  client_name: string | null
}

export type ClientLogisticsParty = {
  id: string
  client_id: string
  party_type: string
  name: string
  full_address: string | null
  postal_code: string | null
  city_unlocode: string | null
  city_unlocode_id?: string | null
  city: string | null
  country: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  created_at: string
  updated_at: string | null
}

export type User = {
  id: string
  auth_user_id?: string | null
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  username?: string | null
  role_id?: string | null
  role_name?: string | null
  active: boolean
  created_at: string
  updated_at: string | null
}

export type UserRole = {
  id: string
  name: string
  description: string | null
}

export type Opportunity = {
  id: string
  client_id: string
  salesperson_id: string | null
  title: string
  description: string | null
  service_type: string | null
  transport_type: string | null
  operation_type: string | null
  incoterm_id: string | null
  incoterm_code?: string | null
  origin: string | null
  origin_unlocode: string | null
  origin_unlocode_id?: string | null
  destination: string | null
  destination_unlocode: string | null
  destination_unlocode_id?: string | null
  stage: string | null
  status: string | null
  expected_profit_usd: number | null
  service_quantity: number | null
  estimated_value: number | null
  start_date: string | null
  expiration_date: string | null
  created_at: string
  updated_at: string | null
}

export type OpportunitySummary = Opportunity & {
  client_name: string | null
  salesperson_name: string | null
}

export type OpportunityWithClient = Opportunity & {
  clients: {
    id: string
    company_name: string | null
  } | null
  salesperson_name?: string | null
}

export type Provider = {
  id: string
  name: string
  tax_id: string | null
  provider_type: string | null
  corporate_phone: string | null
  company_email: string | null
  website: string | null
  full_address: string | null
  postal_code: string | null
  city_unlocode: string | null
  city_unlocode_id?: string | null
  city: string | null
  country: string | null
  credit_active: boolean
  credit_amount: number | null
  credit_days: number | null
  status: string
  created_at: string
  updated_at: string | null
}

export type ProviderSummary = {
  id: string
  provider_name: string
  provider_type: string | null
  city: string | null
  country: string | null
  status: string
  credit_active: boolean
  credit_amount: number | null
  credit_days: number | null
  total_contacts: number
  total_service_offerings: number
}

export type ProviderContact = {
  id: string
  provider_id: string
  name: string
  email: string | null
  phone: string | null
  linkedin_url: string | null
  position: string | null
  status: string
  created_at: string
  updated_at: string | null
}

export type ProviderContactWithProvider = ProviderContact & {
  provider_name: string | null
}

export type ProviderServiceOffering = {
  id: string
  provider_id: string
  service_transport_type_id: string
  service_type: string
  transport_type: string
  terms_and_conditions: string | null
  created_at: string
  updated_at: string | null
}

export type UnlocodeRecord = {
  id: string
  country_code: string
  location_code: string
  unlocode: string
  country_name: string
  name: string
  name_without_diacritics: string | null
  subdivision_code: string | null
  function_classifier: string | null
  status: string | null
  change_indicator: string | null
  date_code: string | null
  iata_code: string | null
  coordinates: string | null
  remarks: string | null
  search_text?: string
  source_page_url: string
}

export type UnlocodeSearchParams = {
  query?: string
  countryCode?: string
  page?: number
  pageSize?: number
}

export type UnlocodeCountrySummary = {
  country_code: string
  row_count: number
}

export type UnlocodeSearchResult = {
  items: UnlocodeRecord[]
  total: number
  page: number
  pageSize: number
  mode: "canonical" | "snapshot"
  availableCountries: string[]
  countrySummaries: UnlocodeCountrySummary[]
}

export type ServiceTransportType = {
  id: string
  service_type: string
  transport_type: string
  created_at: string
  updated_at: string | null
}

export type Incoterm = {
  id: string
  code: string
  description: string | null
  created_at: string
  updated_at: string | null
}

export type SalesAccountingConcept = {
  id: string
  concept: string
  service_type: string
  operation_type: string
  vat_rate: number
  sat_code: string
  created_at: string
  updated_at: string | null
}

export type ClientFullPayload = {
  client: Client
  contacts: Contact[]
  logistics_parties: ClientLogisticsParty[]
  opportunities: Opportunity[]
  quotations: Array<Record<string, unknown>>
  shipments: Array<Record<string, unknown>>
}

export type ProviderFullPayload = {
  provider: Provider
  contacts: ProviderContactWithProvider[]
  service_offerings: ProviderServiceOffering[]
}

export type NewClient = {
  company_name: string
  website: string
  corporate_phone: string
  account_owner_id?: string | null
  tax_id?: string | null
  status?: string | null
  country?: string | null
  industry?: string | null
  full_address?: string | null
  postal_code?: string | null
  city?: string | null
  city_unlocode?: string | null
}

export type UpdateClient = Partial<Client>
export type NewContact = Partial<Contact> & Pick<Contact, "client_id" | "name">
export type UpdateContact = Partial<Contact>
export type NewClientLogisticsParty = Pick<
  ClientLogisticsParty,
  "client_id" | "party_type" | "name"
> &
  Partial<
    Pick<
      ClientLogisticsParty,
      | "full_address"
      | "postal_code"
      | "city_unlocode"
      | "contact_name"
      | "contact_email"
      | "contact_phone"
    >
  >
export type UpdateOpportunity = Partial<Opportunity>
export type NewProvider = Pick<Provider, "name"> &
  Partial<
    Pick<
      Provider,
      | "tax_id"
      | "provider_type"
      | "corporate_phone"
      | "company_email"
      | "website"
      | "full_address"
      | "postal_code"
      | "city_unlocode"
      | "credit_active"
      | "credit_amount"
      | "credit_days"
      | "status"
    >
  >
export type UpdateProvider = Partial<Provider>
export type NewProviderContact = Partial<ProviderContact> &
  Pick<ProviderContact, "provider_id" | "name">
export type UpdateProviderContact = Partial<ProviderContact>
export type NewProviderServiceOffering = Pick<
  ProviderServiceOffering,
  "provider_id" | "service_transport_type_id"
> &
  Partial<Pick<ProviderServiceOffering, "terms_and_conditions">>
export type UpdateProviderServiceOffering = Partial<
  Pick<ProviderServiceOffering, "service_transport_type_id" | "terms_and_conditions">
>
export type NewServiceTransportType = Pick<
  ServiceTransportType,
  "service_type" | "transport_type"
>
export type UpdateServiceTransportType = Pick<
  ServiceTransportType,
  "service_type" | "transport_type"
>
export type NewSalesAccountingConcept = Pick<
  SalesAccountingConcept,
  "concept" | "service_type" | "operation_type" | "vat_rate" | "sat_code"
>
export type UpdateSalesAccountingConcept = NewSalesAccountingConcept
