import fs from "node:fs/promises"
import path from "node:path"
import { createSupabaseAnonClient, isoTimestamp } from "./config.mjs"
import { buildSessionPoolCounts, loadProfiles } from "./hardeningThresholds.mjs"

function randomFrom(items) {
  return items[Math.floor(Math.random() * items.length)]
}

function nextBusinessDate(offsetDays = 1) {
  const value = new Date()
  value.setUTCDate(value.getUTCDate() + offsetDays)
  return value.toISOString().slice(0, 10)
}

export async function loadSessionUsers(context) {
  const filePath =
    context.env.VALIDATION_SESSION_USERS_FILE ||
    path.join(context.paths.runtimeValidationDir, "session-users.generated.json")

  if (!filePath) {
    return []
  }

  let raw
  try {
    raw = await fs.readFile(path.resolve(filePath), "utf8")
  } catch {
    return []
  }
  const parsed = JSON.parse(raw)

  if (!Array.isArray(parsed)) {
    throw new Error("VALIDATION_SESSION_USERS_FILE must contain a JSON array.")
  }

  return parsed
}

export function organizeSessionUsers(sessionUsers) {
  const grouped = {
    sales: [],
    pricing: [],
    admin: [],
    authenticated: [],
  }

  for (const user of sessionUsers) {
    const persona = String(user.persona || "authenticated").toLowerCase()

    if (persona === "sales" || persona === "pricing" || persona === "admin") {
      grouped[persona].push(user)
    }

    grouped.authenticated.push(user)
  }

  return grouped
}

export function assertDestructiveSessionCoverage(groupedUsers) {
  for (const persona of ["sales", "pricing", "admin"]) {
    if ((groupedUsers[persona] ?? []).length === 0) {
      throw new Error(
        `Missing ${persona} session users. Destructive validation now requires VALIDATION_SESSION_USERS_FILE with persona-tagged credentials.`
      )
    }
  }
}

export function assertSessionPoolCoverage(groupedUsers, requiredCounts) {
  for (const persona of ["sales", "pricing", "admin"]) {
    const available = groupedUsers[persona]?.length ?? 0
    const required = requiredCounts[persona] ?? 0

    if (available < required) {
      throw new Error(
        `Session pool for ${persona} is undersized. Required ${required}, found ${available}. Run validation:bootstrap-sessions with the same VALIDATION_LOAD_LEVEL before stress validation.`
      )
    }
  }
}

export function pickSessionUser(groupedUsers, persona, index = 0) {
  const pool = groupedUsers[persona] ?? []

  if (pool.length === 0) {
    throw new Error(`No session user configured for persona ${persona}.`)
  }

  return pool[index % pool.length]
}

export async function signInSessionUser(context, sessionUser) {
  const client = createSupabaseAnonClient(context)
  const { error: loginError } = await client.auth.signInWithPassword({
    email: sessionUser.email,
    password: sessionUser.password,
  })

  if (loginError) {
    throw new Error(`Failed to sign in ${sessionUser.email}: ${loginError.message}`)
  }

  const { data: erpUser, error: profileError } = await client.rpc("get_current_erp_user")

  if (profileError) {
    await client.auth.signOut()
    throw profileError
  }

  return {
    client,
    erpUser: Array.isArray(erpUser) ? erpUser[0] ?? null : erpUser ?? null,
    sessionUser,
  }
}

export async function withSessionUser(context, sessionUser, work) {
  const { client, erpUser } = await signInSessionUser(context, sessionUser)

  try {
    return await work(client, erpUser)
  } finally {
    await client.auth.signOut()
  }
}

export async function createStressSessionPool(context, groupedUsers, loadProfile) {
  const requiredCounts = buildSessionPoolCounts(loadProfile)
  assertSessionPoolCoverage(groupedUsers, requiredCounts)

  const sessions = {
    sales: [],
    pricing: [],
    admin: [],
  }

  for (const persona of ["sales", "pricing", "admin"]) {
    for (let index = 0; index < requiredCounts[persona]; index += 1) {
      sessions[persona].push(await signInSessionUser(context, pickSessionUser(groupedUsers, persona, index)))
    }
  }

  return {
    requiredCounts,
    sessions,
    pick(persona, index = 0) {
      const pool = sessions[persona] ?? []

      if (pool.length === 0) {
        throw new Error(`No signed-in sessions available for persona ${persona}.`)
      }

      return pool[index % pool.length]
    },
    async close() {
      await Promise.allSettled(
        Object.values(sessions)
          .flat()
          .map((session) => session.client.auth.signOut())
      )
    },
  }
}

export async function loadLookups(client) {
  const [usersResult, serviceTypesResult, incotermsResult, accountingResult, unlocodesResult] =
    await Promise.all([
      client.from("users").select("id, role_id, email, first_name, last_name").eq("active", true).limit(25),
      client.from("service_transport_type_lookup_view").select("*").limit(20),
      client.from("incoterms").select("id, code").limit(20),
      client.from("sales_accounting_concept_lookup_view").select("*").limit(50),
      client.from("unlocode_lookup_view").select("id, unlocode, country_name, name").limit(20),
    ])

  for (const result of [
    usersResult,
    serviceTypesResult,
    incotermsResult,
    accountingResult,
    unlocodesResult,
  ]) {
    if (result.error) {
      throw result.error
    }
  }

  return {
    users: usersResult.data ?? [],
    serviceTypes: serviceTypesResult.data ?? [],
    incoterms: incotermsResult.data ?? [],
    accountingConcepts: accountingResult.data ?? [],
    unlocodes: unlocodesResult.data ?? [],
  }
}

export function createEmptyLedger(runPrefix, context) {
  return {
    generatedAt: isoTimestamp(),
    runPrefix,
    target: {
      kind: context.target.kind,
      projectRef: context.target.projectRef,
    },
    providers: [],
    provider_contacts: [],
    provider_service_offerings: [],
    clients: [],
    contacts: [],
    client_logistics_parties: [],
    opportunities: [],
    quotations: [],
    quotation_options: [],
    quotation_costs: [],
    quotation_cargo_lines: [],
    shipments: [],
    shipment_events: [],
    service_transport_types: [],
    sales_accounting_concepts: [],
    quotation_rejection_reasons: [],
    exchange_rates: [],
  }
}

export async function createProviderBundle(client, lookups, runPrefix, ledger) {
  const serviceType = randomFrom(lookups.serviceTypes)
  const providerName = `${runPrefix}PROVIDER_${crypto.randomUUID().slice(0, 8)}`
  const { data: providerId, error: providerError } = await client.rpc("create_provider", {
    p_name: providerName,
    p_tax_id: null,
    p_provider_type: "carrier",
    p_corporate_phone: "+52 555 000 0000",
    p_company_email: `${providerName.toLowerCase()}@example.test`,
    p_website: "https://example.test",
    p_full_address: "QA provider address",
    p_postal_code: "64000",
    p_city_unlocode: randomFrom(lookups.unlocodes)?.unlocode ?? null,
    p_status: "en_proceso_de_alta",
    p_credit_active: false,
    p_credit_amount: null,
    p_credit_days: null,
    p_service_offerings: null,
  })

  if (providerError || !providerId) {
    throw providerError ?? new Error("Failed to create provider bundle.")
  }

  ledger.providers.push(String(providerId))

  const { data: contactId, error: contactError } = await client.rpc("add_contact_to_provider", {
    p_provider_id: providerId,
    p_name: `${runPrefix}CONTACT_PROVIDER`,
    p_email: `${runPrefix.toLowerCase()}provider@example.test`,
    p_phone: "+52 555 000 1000",
    p_linkedin_url: null,
    p_position: "Sales",
    p_status: "activo",
  })

  if (contactError || !contactId) {
    throw contactError ?? new Error("Failed to create provider contact.")
  }

  ledger.provider_contacts.push(String(contactId))

  const { data: offeringId, error: offeringError } = await client.rpc(
    "create_provider_service_offering_record",
    {
      p_provider_id: providerId,
      p_service_transport_type_id: serviceType?.id ?? null,
      p_terms_and_conditions: "QA terms",
    }
  )

  if (offeringError || !offeringId) {
    throw offeringError ?? new Error("Failed to create provider service offering.")
  }

  ledger.provider_service_offerings.push(String(offeringId))

  return String(providerId)
}

export async function createSalesFlow(client, lookups, runPrefix, ledger, options = {}) {
  const serviceType = randomFrom(lookups.serviceTypes)
  const incoterm = randomFrom(lookups.incoterms)
  const [origin, destination] = lookups.unlocodes.slice(0, 2)
  const owner = options.ownerUserId
    ? { id: options.ownerUserId }
    : randomFrom(lookups.users)

  const clientName = `${runPrefix}CLIENT_${crypto.randomUUID().slice(0, 8)}`
  const { data: clientId, error: clientError } = await client.rpc("create_client_with_contacts", {
    p_company_name: clientName,
    p_website: "https://example.test",
    p_corporate_phone: "+52 555 100 0000",
    p_country: origin?.country_name ?? "MEXICO",
    p_industry: "Logistics QA",
    p_status: "prospecto",
    p_full_address: "QA client address",
    p_postal_code: "64000",
    p_city: origin?.name ?? "Monterrey",
    p_city_unlocode: origin?.unlocode ?? null,
    p_account_owner_id: owner?.id ?? null,
    p_contacts: null,
  })

  if (clientError || !clientId) {
    throw clientError ?? new Error("Failed to create client.")
  }

  ledger.clients.push(String(clientId))

  const { data: contactId, error: contactError } = await client.rpc("add_contact_to_client", {
    p_client_id: clientId,
    p_name: `${runPrefix}CONTACT_CLIENT`,
    p_email: `${runPrefix.toLowerCase()}client@example.test`,
    p_phone: "+52 555 100 1000",
    p_linkedin_url: null,
    p_position: "Buyer",
    p_status: "activo",
    p_is_primary: true,
  })

  if (contactError || !contactId) {
    throw contactError ?? new Error("Failed to create client contact.")
  }

  ledger.contacts.push(String(contactId))

  const { data: partyId, error: partyError } = await client.rpc("add_client_logistics_party", {
    p_client_id: clientId,
    p_party_type: "shipper",
    p_name: `${runPrefix}SHIPPER`,
    p_full_address: "QA shipper address",
    p_postal_code: "64000",
    p_city_unlocode: origin?.unlocode ?? null,
    p_contact_name: `${runPrefix}SHIPPER_CONTACT`,
    p_contact_email: `${runPrefix.toLowerCase()}shipper@example.test`,
    p_contact_phone: "+52 555 100 2000",
  })

  if (partyError || !partyId) {
    throw partyError ?? new Error("Failed to create logistics party.")
  }

  ledger.client_logistics_parties.push(String(partyId))

  const { data: opportunityId, error: opportunityError } = await client.rpc("create_opportunity", {
    p_client_id: clientId,
    p_service_type: serviceType?.service_type ?? "FTL",
    p_transport_type: serviceType?.transport_type ?? "ROAD",
    p_operation_type: "IMPORT",
    p_incoterm_id: incoterm?.id ?? null,
    p_origin_unlocode: origin?.unlocode ?? null,
    p_destination_unlocode: destination?.unlocode ?? origin?.unlocode ?? null,
    p_expected_profit_usd: 1250,
    p_service_quantity: 1,
    p_salesperson_id: owner?.id ?? null,
    p_description: `${runPrefix} opportunity flow`,
    p_status: "investigando",
  })

  if (opportunityError || !opportunityId) {
    throw opportunityError ?? new Error("Failed to create opportunity.")
  }

  ledger.opportunities.push(String(opportunityId))

  const { data: quotationId, error: quotationError } = await client.rpc("create_quotation_from_opportunity", {
    p_opportunity_id: opportunityId,
    p_pickup_address: `${runPrefix} pickup`,
    p_delivery_address: `${runPrefix} delivery`,
    p_required_quote_date: nextBusinessDate(2),
  })

  if (quotationError || !quotationId) {
    throw quotationError ?? new Error("Failed to create quotation.")
  }

  ledger.quotations.push(String(quotationId))

  const { data: cargoId, error: cargoError } = await client.rpc("create_quotation_cargo_line", {
    p_quotation_id: quotationId,
    p_load_type: "Pallets",
    p_commodities: `${runPrefix} commodities`,
    p_piece_count: 10,
    p_width: 1.2,
    p_length: 1.0,
    p_height: 1.5,
    p_weight: 800,
    p_freight_class: null,
    p_cbm: 1.8,
    p_volumetric_weight_kg: null,
    p_sort_order: 1,
  })

  if (cargoError || !cargoId) {
    throw cargoError ?? new Error("Failed to create cargo line.")
  }

  ledger.quotation_cargo_lines.push(String(cargoId))

  return String(quotationId)
}

export async function executePricingFlow(client, lookups, runPrefix, ledger, options = {}) {
  const providerId =
    options.providerId ?? (await createProviderBundle(client, lookups, runPrefix, ledger))
  const quotationId =
    options.quotationId ?? (await createSalesFlow(client, lookups, runPrefix, ledger))

  if (options.requestPricing !== false) {
    const { error: requestError } = await client.rpc("request_quotation_pricing", {
      p_quotation_id: quotationId,
    })

    if (requestError) {
      throw requestError
    }
  }

  const { error: takeError } = await client.rpc("take_quotation_for_pricing", {
    p_quotation_id: quotationId,
  })

  if (takeError) {
    throw takeError
  }

  const accountingConcept = randomFrom(lookups.accountingConcepts)
  const optionLabel = `${runPrefix}OPTION_A`
  const { data: optionId, error: optionError } = await client.rpc("save_quotation_purchase_option", {
    p_quotation_id: quotationId,
    p_quotation_option_id: null,
    p_option_label: optionLabel,
    p_purchase_valid_until: nextBusinessDate(7),
    p_lines: [
      {
        provider_id: providerId,
        sales_accounting_concept_id: accountingConcept?.id ?? null,
        purchase_amount: 1000,
        purchase_currency: "USD",
        vat_rate: accountingConcept?.vat_rate ?? 16,
        notes: `${runPrefix} purchase option`,
      },
    ],
  })

  if (optionError || !optionId) {
    throw optionError ?? new Error("Failed to save purchase option.")
  }

  ledger.quotation_options.push(String(optionId))

  const { data: costLines, error: costLineError } = await client
    .from("quotation_costs")
    .select("id")
    .eq("quotation_option_id", optionId)

  if (costLineError) {
    throw costLineError
  }

  for (const line of costLines ?? []) {
    ledger.quotation_costs.push(String(line.id))
  }

  const statusPayload = {
    p_quotation_id: quotationId,
    p_rejection_reason_id: null,
    p_rejection_notes: null,
    p_cancellation_notes: null,
    p_target_rate: null,
  }

  const { error: readyError } = await client.rpc("update_quotation_status", {
    ...statusPayload,
    p_status: "lista_para_enviar",
  })

  if (readyError) {
    throw readyError
  }

  return {
    quotationId,
    optionId: String(optionId),
    costLineIds: (costLines ?? []).map((line) => String(line.id)),
  }
}

export async function executeSalesFollowUp(client, quotationId, optionId, costLineIds = []) {
  const salesAmounts = Object.fromEntries(
    costLineIds.map((lineId) => [
      String(lineId),
      {
        sale_amount: "1450",
        sale_currency: "USD",
      },
    ])
  )

  const { error: salesError } = await client.rpc("update_quotation_option_sales_amounts", {
    p_quotation_id: quotationId,
    p_quotation_option_id: optionId,
    p_sales_amounts: salesAmounts,
  })

  if (salesError) {
    throw salesError
  }

  const { error: visibilityError } = await client.rpc("set_quotation_option_customer_visibility", {
    p_quotation_option_id: optionId,
    p_include_in_customer_quote: true,
  })

  if (visibilityError) {
    throw visibilityError
  }

  const { error: sendError } = await client.rpc("update_quotation_status", {
    p_quotation_id: quotationId,
    p_status: "enviada",
    p_rejection_reason_id: null,
    p_rejection_notes: null,
    p_cancellation_notes: null,
    p_target_rate: null,
  })

  if (sendError) {
    throw sendError
  }

  return {
    quotationId,
    optionId,
    costLineIds,
  }
}

export async function executeReadBurst(client) {
  const readTargets = [
    client.from("client_overview_view").select("id").limit(20),
    client.from("open_opportunities_view").select("id").limit(20),
    client.from("quotation_summary_view").select("id").limit(20),
    client.from("provider_overview_view").select("id").limit(20),
    client.from("unlocode_lookup_view").select("id").limit(20),
  ]

  const results = await Promise.all(readTargets)
  const failedRead = results.find((result) => result.error)

  if (failedRead?.error) {
    throw failedRead.error
  }
}

export async function executeAdminSmoke(client, runPrefix, ledger, options = {}) {
  const uniqueSuffix = crypto.randomUUID().slice(0, 8).toUpperCase()
  const flowIndex = Number.isFinite(options.flowIndex) ? Number(options.flowIndex) : 0
  const prefixSeed =
    Array.from(runPrefix).reduce((sum, character) => sum + character.charCodeAt(0), 0) % 120
  const manualDate = nextBusinessDate(30 + prefixSeed + flowIndex)
  const { data: conceptId, error: conceptError } = await client.rpc("create_sales_accounting_concept", {
    p_concept: `${runPrefix}CONCEPT_${uniqueSuffix}`,
    p_service_type: "GENERAL",
    p_operation_type: "IMPORT",
    p_vat_rate: 16,
    p_sat_code: `QA-${uniqueSuffix}`,
  })

  if (conceptError || !conceptId) {
    throw conceptError ?? new Error("Failed to create accounting concept.")
  }

  ledger.sales_accounting_concepts.push(String(conceptId))

  const { data: reasonId, error: reasonError } = await client.rpc("create_quotation_rejection_reason", {
    p_reason: `${runPrefix}REJECTION_REASON_${uniqueSuffix}`,
  })

  if (reasonError || !reasonId) {
    throw reasonError ?? new Error("Failed to create quotation rejection reason.")
  }

  ledger.quotation_rejection_reasons.push(String(reasonId))

  const { data: exchangeRateId, error: exchangeRateError } = await client.rpc("create_exchange_rate", {
    p_rate_date: manualDate,
    p_base_currency: "USD",
    p_quote_currency: "MXN",
    p_rate_value: 18.25,
    p_source: "MANUAL",
    p_source_series_code: `${runPrefix}FX_${uniqueSuffix}`,
  })

  if (exchangeRateError || !exchangeRateId) {
    throw exchangeRateError ?? new Error("Failed to create exchange rate.")
  }

  ledger.exchange_rates.push(String(exchangeRateId))

  await executeReadBurst(client)

  const readTargets = [
    client.from("service_transport_type_lookup_view").select("id").limit(20),
    client.from("sales_accounting_concept_lookup_view").select("id").limit(20),
    client.from("quotation_rejection_reason_lookup_view").select("id").limit(20),
    client.from("exchange_rates").select("id").limit(20),
  ]

  const readResults = await Promise.all(readTargets)
  const failedRead = readResults.find((result) => result.error)

  if (failedRead?.error) {
    throw failedRead.error
  }
}

export async function executeAuthenticatedChecks(context, sessionUsers, summary) {
  if (sessionUsers.length === 0) {
    summary.skipped.push("authenticated-route-and-rls")
    return
  }

  for (const user of sessionUsers) {
    const client = createSupabaseAnonClient(context)
    const { error: loginError } = await client.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    })

    if (loginError) {
      summary.errors.push({
        persona: "authenticated",
        detail: `Failed to sign in ${user.email}: ${loginError.message}`,
      })
      continue
    }

    const [profileResult, navResult, routeResult] = await Promise.all([
      client.rpc("get_current_erp_user"),
      client.rpc("get_current_navigation_items"),
      client.rpc("erp_can_access_route", {
        p_route_path: user.routePath ?? "/dashboard",
        p_action_code: "view",
      }),
    ])

    if (profileResult.error || navResult.error || routeResult.error) {
      summary.errors.push({
        persona: "authenticated",
        detail: `Auth smoke failed for ${user.email}.`,
      })
    } else {
      summary.completed += 1
    }

    await client.auth.signOut()
  }
}

export async function executeAuthenticatedChecksWithPool(sessionPool, loadProfile, summary) {
  const desiredCount = Math.max(Math.min(loadProfile?.authenticated ?? 1, 3), 1)
  const stats = {
    mode: "post-peak-pooled-subset",
    desiredCount,
    executedCount: 0,
    personasChecked: [],
    skipped: false,
    reason: null,
  }
  const orderedChecks = []

  for (const persona of ["sales", "pricing", "admin"]) {
    const session = sessionPool.sessions[persona]?.[0] ?? null
    if (session) {
      orderedChecks.push(session)
    }
  }

  if (orderedChecks.length === 0) {
    summary.skipped.push("authenticated-route-and-rls")
    return {
      ...stats,
      skipped: true,
      reason: "no-sessions-available",
    }
  }

  const sessionsToCheck = orderedChecks.slice(0, desiredCount)

  for (const session of sessionsToCheck) {
    const { client, sessionUser } = session
    stats.executedCount += 1
    stats.personasChecked.push(sessionUser.persona ?? "authenticated")
    const [profileResult, navResult, routeResult] = await Promise.all([
      client.rpc("get_current_erp_user"),
      client.rpc("get_current_navigation_items"),
      client.rpc("erp_can_access_route", {
        p_route_path: sessionUser.routePath ?? "/dashboard",
        p_action_code: "view",
      }),
    ])

    if (profileResult.error || navResult.error || routeResult.error) {
      summary.errors.push({
        persona: "authenticated",
        detail: `Auth smoke failed for ${sessionUser.email}.`,
      })
    } else {
      summary.completed += 1
    }
  }

  return stats
}

export { loadProfiles }
