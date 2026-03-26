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

export type PermissionModule = {
  id: string
  code: string
  name: string
  icon_key: string | null
  sort_order: number
  active: boolean
}

export type PermissionSubmodule = {
  id: string
  module_id: string
  code: string
  name: string
  route_path: string | null
  route_matchers: string[]
  sort_order: number
  active: boolean
}

export type PermissionAction = {
  id: string
  code: string
  name: string
  scope_type: string
  active: boolean
}

export type PermissionCondition = {
  id: string
  code: string
  name: string
  description: string | null
}

export type PermissionResourceCatalogItem = {
  module_id: string
  module_code: string
  module_name: string
  module_icon_key: string | null
  module_sort_order: number
  module_active: boolean
  submodule_id: string | null
  submodule_code: string | null
  submodule_name: string | null
  route_path: string | null
  route_matchers: string[]
  submodule_sort_order: number | null
  submodule_active: boolean | null
  resource_id: string
  resource_key: string
  resource_name: string
  resource_type: string
  resource_group: string | null
  table_name: string | null
  view_name: string | null
  rpc_name: string | null
  entity_owner_field: string | null
  entity_branch_field: string | null
  resource_sort_order: number
  resource_active: boolean
}

export type PermissionFieldCatalogItem = {
  resource_key: string
  resource_name: string
  field_id: string
  resource_id: string
  field_key: string
  label: string
  data_type: string | null
  field_group: string | null
  field_sort_order: number
  active: boolean
}

export type RoleResourcePermissionMatrixRow = {
  role_id: string
  role_name: string
  module_id: string
  module_code: string
  module_name: string
  module_icon_key: string | null
  module_sort_order: number
  submodule_id: string | null
  submodule_code: string | null
  submodule_name: string | null
  route_path: string | null
  route_matchers: string[]
  submodule_sort_order: number | null
  resource_id: string
  resource_key: string
  resource_name: string
  resource_type: string
  resource_group: string | null
  action_id: string
  action_code: string
  action_name: string
  allowed: boolean
  condition_id: string | null
  condition_code: string
  condition_name: string
  role_permission_id: string | null
}

export type RoleFieldPermissionMatrixRow = {
  role_id: string
  role_name: string
  resource_key: string
  resource_name: string
  field_id: string
  field_key: string
  field_label: string
  data_type: string | null
  field_group: string | null
  field_sort_order: number
  action_id: string
  action_code: string
  action_name: string
  allowed: boolean
  condition_id: string | null
  condition_code: string
  condition_name: string
  role_field_permission_id: string | null
}

export type NavigationPermissionItem = {
  module_code: string
  module_name: string
  module_icon_key: string | null
  module_sort_order: number
  submodule_code: string
  submodule_name: string
  route_path: string | null
  route_matchers: string[]
  submodule_sort_order: number
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

export type QuotationStatus =
  | "borrador"
  | "pendiente"
  | "cotizando"
  | "lista_para_enviar"
  | "enviada"
  | "cancelada"
  | "rechazada"
  | "renegociar_tarifa"
  | "aceptada"

export type Quotation = {
  id: string
  client_id: string
  opportunity_id: string
  created_by: string | null
  pricing_owner_id: string | null
  reference_number: string | null
  status: QuotationStatus
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
  pickup_address: string | null
  delivery_address: string | null
  required_quote_date: string | null
  purchase_valid_until: string | null
  sales_valid_until: string | null
  rejection_reason_id: string | null
  rejection_reason?: string | null
  rejection_notes: string | null
  cancellation_notes: string | null
  target_rate: number | null
  currency: string
  estimated_cost: number | null
  estimated_price: number | null
  expected_profit: number | null
  accepted_usd_rate_date?: string | null
  accepted_usd_to_mxn_rate?: number | null
  accepted_eur_rate_date?: string | null
  accepted_eur_to_mxn_rate?: number | null
  exchange_rates_locked_at?: string | null
  can_view_cost?: boolean
  can_edit_purchase_amount?: boolean
  can_view_sale_price?: boolean
  can_edit_sale_price?: boolean
  can_view_expected_profit?: boolean
  total_charge_lines?: number
  created_at: string
  updated_at: string | null
}

export type QuotationSummary = Quotation & {
  client_name: string | null
  opportunity_title: string | null
  salesperson_id: string | null
  salesperson_name: string | null
  pricing_owner_name: string | null
  created_by_name: string | null
}

export type QuotationChargeLine = {
  id: string
  quotation_id: string
  quotation_option_id: string | null
  option_label: string
  option_sort_order?: number | null
  include_in_customer_quote?: boolean
  provider_id: string | null
  provider_name?: string | null
  sales_accounting_concept_id: string | null
  accounting_concept?: string | null
  service_name: string
  cost: number | null
  purchase_amount: number | null
  purchase_currency: string
  purchase_amount_mxn?: number | null
  sale_amount: number | null
  sale_currency: string
  sale_amount_mxn?: number | null
  profit_amount: number | null
  profit_amount_mxn?: number | null
  can_view_cost?: boolean
  can_edit_purchase_amount?: boolean
  can_view_sale_price?: boolean
  can_edit_sale_price?: boolean
  can_view_expected_profit?: boolean
  vat_rate: number
  notes: string | null
  created_at: string
}

export type QuotationCargoLine = {
  id: string
  quotation_id: string
  load_type: string
  commodities: string | null
  piece_count: number | null
  width: number | null
  length: number | null
  height: number | null
  weight: number | null
  freight_class: string | null
  cbm: number | null
  volumetric_weight_kg: number | null
  sort_order: number
  created_at: string
  updated_at: string | null
}

export type Shipment = {
  id: string
  quotation_id: string
  client_id: string
  shipment_reference: string | null
  status: string
  origin: string | null
  destination: string | null
  booking_number: string | null
  departure_date: string | null
  arrival_date: string | null
  delivered_at: string | null
  created_at: string
  updated_at: string | null
}

export type QuotationRejectionReason = {
  id: string
  reason: string
  created_at: string
  updated_at: string | null
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

export type ExchangeRate = {
  id: string
  rate_date: string
  base_currency: string
  quote_currency: string
  rate_value: number
  source: string
  source_series_code: string | null
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
export type NewQuotation = {
  opportunity_id: string
  pickup_address?: string | null
  delivery_address?: string | null
  required_quote_date?: string | null
  purchase_valid_until?: string | null
  sales_valid_until?: string | null
}
export type UpdateQuotation = Partial<
  Pick<
    Quotation,
    | "pickup_address"
    | "delivery_address"
    | "required_quote_date"
    | "purchase_valid_until"
    | "sales_valid_until"
    | "target_rate"
    | "rejection_reason_id"
    | "rejection_notes"
    | "cancellation_notes"
  >
>
export type NewQuotationChargeLine = Pick<QuotationChargeLine, "quotation_id"> &
  Partial<
    Pick<
      QuotationChargeLine,
      | "quotation_option_id"
      | "option_label"
      | "provider_id"
      | "sales_accounting_concept_id"
      | "purchase_amount"
      | "purchase_currency"
      | "sale_amount"
      | "sale_currency"
      | "vat_rate"
      | "notes"
    >
  >
export type UpdateQuotationChargeLine = Partial<
  Pick<
    QuotationChargeLine,
    | "quotation_option_id"
    | "option_label"
    | "provider_id"
    | "sales_accounting_concept_id"
    | "purchase_amount"
    | "purchase_currency"
    | "sale_amount"
    | "sale_currency"
    | "vat_rate"
    | "notes"
  >
>
export type NewQuotationCargoLine = Pick<QuotationCargoLine, "quotation_id" | "load_type"> &
  Partial<
    Pick<
      QuotationCargoLine,
      | "commodities"
      | "piece_count"
      | "width"
      | "length"
      | "height"
      | "weight"
      | "freight_class"
      | "cbm"
      | "volumetric_weight_kg"
      | "sort_order"
    >
  >
export type UpdateQuotationCargoLine = Partial<
  Pick<
    QuotationCargoLine,
    | "load_type"
    | "commodities"
    | "piece_count"
    | "width"
    | "length"
    | "height"
    | "weight"
    | "freight_class"
    | "cbm"
    | "volumetric_weight_kg"
    | "sort_order"
  >
>
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
export type NewQuotationRejectionReason = Pick<QuotationRejectionReason, "reason">
export type UpdateQuotationRejectionReason = NewQuotationRejectionReason
export type NewExchangeRate = Pick<
  ExchangeRate,
  "rate_date" | "base_currency" | "quote_currency" | "rate_value" | "source" | "source_series_code"
>
export type UpdateExchangeRate = Partial<NewExchangeRate>
