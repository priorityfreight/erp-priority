import path from "node:path"
import {
  assertWritableClone,
  createSupabaseAdminClient,
  ensureValidationDirectories,
  getValidationContext,
  isoTimestamp,
  writeJson,
  writeText,
} from "./shared/config.mjs"

const CLIENT_MATCHER = "company_name.ilike.%Cliente QA%,website.ilike.%example.com%"
const PROVIDER_MATCHER = "name.ilike.%Proveedor QA%,company_email.ilike.%@priority.test%,website.ilike.%example.com%"
const VIEW_MATCHER = "name.ilike.%Vista QA%,search_query.ilike.%QA%"
function isApplyMode() {
  return process.argv.includes("--apply") || String(process.env.QA_EXAMPLE_CLEANUP_APPLY || "").toLowerCase() === "true"
}

async function countQuery(query) {
  const { count, error } = await query.select("id", { count: "exact", head: true })

  if (error) {
    throw error
  }

  return count ?? 0
}

async function deleteByIds(client, table, column, ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return 0
  }

  const { error } = await client.from(table).delete().in(column, ids)

  if (error) {
    throw error
  }

  return ids.length
}

async function neutralizeAndSoftDeleteClient(client, id) {
  const { error: updateError } = await client
    .from("clients")
    .update({
      company_name: `PURGED_TEST_CLIENT_${id.slice(0, 8)}`,
      website: null,
      corporate_phone: null,
      full_address: null,
      account_owner_id: null,
    })
    .eq("id", id)

  if (updateError) {
    throw updateError
  }

  const { error: softDeleteError } = await client.rpc("soft_delete_client", {
    p_client_id: id,
  })

  if (softDeleteError) {
    throw softDeleteError
  }
}

async function loadQaExampleInventory(client) {
  const clientsResult = await client
    .from("clients")
    .select("id, company_name, website")
    .or(CLIENT_MATCHER)

  if (clientsResult.error) {
    throw clientsResult.error
  }

  const providersResult = await client
    .from("providers")
    .select("id, name, company_email, website")
    .or(PROVIDER_MATCHER)

  if (providersResult.error) {
    throw providersResult.error
  }

  const viewsResult = await client
    .from("workspace_saved_views")
    .select("id, workspace_key, name, search_query")
    .or(VIEW_MATCHER)

  if (viewsResult.error) {
    throw viewsResult.error
  }

  const clients = clientsResult.data ?? []
  const providers = providersResult.data ?? []
  const views = viewsResult.data ?? []
  const clientIds = clients.map((row) => row.id)
  const providerIds = providers.map((row) => row.id)

  const opportunitiesResult = clientIds.length
    ? await client.from("opportunities").select("id, client_id, title").in("client_id", clientIds)
    : { data: [], error: null }

  if (opportunitiesResult.error) {
    throw opportunitiesResult.error
  }

  const opportunities = opportunitiesResult.data ?? []
  const opportunityIds = opportunities.map((row) => row.id)

  const quotationsResult = opportunityIds.length
    ? await client
        .from("quotations")
        .select("id, opportunity_id, status, reference_number")
        .in("opportunity_id", opportunityIds)
    : { data: [], error: null }

  if (quotationsResult.error) {
    throw quotationsResult.error
  }

  const quotations = quotationsResult.data ?? []
  const quotationIds = quotations.map((row) => row.id)

  const shipmentsResult = quotationIds.length
    ? await client.from("shipments").select("id, quotation_id").in("quotation_id", quotationIds)
    : { data: [], error: null }

  if (shipmentsResult.error) {
    throw shipmentsResult.error
  }

  const shipments = shipmentsResult.data ?? []
  const shipmentIds = shipments.map((row) => row.id)

  return {
    clients,
    providers,
    opportunities,
    quotations,
    shipments,
    views,
    ids: {
      clientIds,
      providerIds,
      opportunityIds,
      quotationIds,
      shipmentIds,
      viewIds: views.map((row) => row.id),
    },
  }
}

async function buildSummary(client, inventory) {
  const {
    ids: { clientIds, providerIds, opportunityIds, quotationIds, shipmentIds },
  } = inventory

  return {
    clients: inventory.clients.length,
    providers: inventory.providers.length,
    opportunities: inventory.opportunities.length,
    quotations: inventory.quotations.length,
    shipments: inventory.shipments.length,
    shipment_events: shipmentIds.length
      ? await countQuery(client.from("shipment_events").in("shipment_id", shipmentIds))
      : 0,
    quotation_options: quotationIds.length
      ? await countQuery(client.from("quotation_options").in("quotation_id", quotationIds))
      : 0,
    quotation_costs: quotationIds.length
      ? await countQuery(client.from("quotation_costs").in("quotation_id", quotationIds))
      : 0,
    quotation_cargo_lines: quotationIds.length
      ? await countQuery(client.from("quotation_cargo_lines").in("quotation_id", quotationIds))
      : 0,
    provider_service_offerings: providerIds.length
      ? await countQuery(client.from("provider_service_offerings").in("provider_id", providerIds))
      : 0,
    provider_contacts: providerIds.length
      ? await countQuery(client.from("provider_contacts").in("provider_id", providerIds))
      : 0,
    contacts: clientIds.length ? await countQuery(client.from("contacts").in("client_id", clientIds)) : 0,
    client_logistics_parties: clientIds.length
      ? await countQuery(client.from("client_logistics_parties").in("client_id", clientIds))
      : 0,
    workspace_saved_views: inventory.views.length,
    opportunities_still_linked_to_clients: clientIds.length
      ? await countQuery(client.from("opportunities").in("client_id", clientIds))
      : 0,
    quotations_still_linked_to_opportunities: opportunityIds.length
      ? await countQuery(client.from("quotations").in("opportunity_id", opportunityIds))
      : 0,
  }
}

async function applyCleanup(client, inventory) {
  const {
    ids: { clientIds, providerIds, opportunityIds, quotationIds, shipmentIds, viewIds },
  } = inventory

  const deleted = {
    workspace_saved_views: await deleteByIds(client, "workspace_saved_views", "id", viewIds),
    shipment_events: await deleteByIds(client, "shipment_events", "shipment_id", shipmentIds),
    shipments: await deleteByIds(client, "shipments", "id", shipmentIds),
    quotation_costs: await deleteByIds(client, "quotation_costs", "quotation_id", quotationIds),
    quotation_cargo_lines: await deleteByIds(client, "quotation_cargo_lines", "quotation_id", quotationIds),
    quotation_options: await deleteByIds(client, "quotation_options", "quotation_id", quotationIds),
    quotations: await deleteByIds(client, "quotations", "id", quotationIds),
    opportunities: await deleteByIds(client, "opportunities", "id", opportunityIds),
    provider_service_offerings: await deleteByIds(
      client,
      "provider_service_offerings",
      "provider_id",
      providerIds
    ),
    provider_contacts: await deleteByIds(client, "provider_contacts", "provider_id", providerIds),
    providers: await deleteByIds(client, "providers", "id", providerIds),
    contacts: await deleteByIds(client, "contacts", "client_id", clientIds),
    client_logistics_parties: await deleteByIds(client, "client_logistics_parties", "client_id", clientIds),
    softened_clients: 0,
  }

  for (const clientId of clientIds) {
    await neutralizeAndSoftDeleteClient(client, clientId)
    deleted.softened_clients += 1
  }

  return deleted
}

async function writeArtifacts(context, payload) {
  const jsonPath = path.join(context.paths.generatedDocsDir, "qa-example-cleanup-summary.json")
  const mdPath = path.join(context.paths.docsValidationDir, "qa-example-cleanup-summary.md")

  await writeJson(jsonPath, payload)
  await writeText(
    mdPath,
    [
      "# QA Example Cleanup Summary",
      "",
      `- Generated at: \`${payload.generatedAt}\``,
      `- Mode: \`${payload.mode}\``,
      `- Target project ref: \`${payload.target.projectRef}\``,
      `- Target kind: \`${payload.target.kind}\``,
      "",
      "## Summary",
      "",
      ...Object.entries(payload.summaryBefore).map(([key, value]) => `- ${key}: \`${value}\``),
      "",
      payload.mode === "apply" ? "## Deleted" : "## Preview",
      "",
      ...Object.entries(payload.deleted ?? {}).map(([key, value]) => `- ${key}: \`${value}\``),
      "",
      "## Remaining",
      "",
      ...Object.entries(payload.summaryAfter).map(([key, value]) => `- ${key}: \`${value}\``),
      "",
      "The script targets QA/example artifacts created through UI and E2E flows, including `Cliente QA Proceso`, `Proveedor QA`, `@priority.test`, `example.com`, and `Vista QA` patterns.",
      "",
    ].join("\n")
  )
}

async function main() {
  const context = await getValidationContext()
  await ensureValidationDirectories()

  const apply = isApplyMode()

  if (apply) {
    assertWritableClone(context)
  }

  const client = createSupabaseAdminClient(context, { requireWritableClone: apply })
  const inventory = await loadQaExampleInventory(client)
  const summaryBefore = await buildSummary(client, inventory)
  const deleted = apply
    ? await applyCleanup(client, inventory)
    : {
        workspace_saved_views: 0,
        shipment_events: 0,
        shipments: 0,
        quotation_costs: 0,
        quotation_cargo_lines: 0,
        quotation_options: 0,
        quotations: 0,
        opportunities: 0,
        provider_service_offerings: 0,
        provider_contacts: 0,
        providers: 0,
        contacts: 0,
        client_logistics_parties: 0,
        softened_clients: 0,
      }

  const summaryAfter = apply
    ? await buildSummary(client, await loadQaExampleInventory(client))
    : summaryBefore

  const payload = {
    generatedAt: isoTimestamp(),
    mode: apply ? "apply" : "preview",
    target: {
      projectRef: context.target.projectRef,
      kind: context.target.kind,
    },
    summaryBefore,
    deleted,
    summaryAfter,
    samples: {
      clients: inventory.clients.slice(0, 20),
      providers: inventory.providers.slice(0, 20),
      opportunities: inventory.opportunities.slice(0, 20),
      quotations: inventory.quotations.slice(0, 20),
      views: inventory.views.slice(0, 20),
    },
  }

  await writeArtifacts(context, payload)
  console.log(JSON.stringify(payload, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
