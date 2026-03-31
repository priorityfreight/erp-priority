import path from "node:path"
import {
  createSupabaseAdminClient,
  ensureValidationDirectories,
  getValidationContext,
  isoTimestamp,
  writeJson,
  writeText,
} from "./shared/config.mjs"
import { stressPrefixes } from "./shared/liveModules.mjs"

function buildOrFilter(columns) {
  return stressPrefixes
    .flatMap((prefix) => columns.map((column) => `${column}.ilike.${prefix}%`))
    .join(",")
}

async function scanTable(client, table, columns) {
  const orFilter = buildOrFilter(columns)
  const { data, error } = await client.from(table).select("id").or(orFilter).limit(100)

  if (error) {
    return {
      table,
      ok: false,
      error: error.message,
    }
  }

  return {
    table,
    ok: true,
    count: data?.length ?? 0,
  }
}

async function main() {
  const context = await getValidationContext()
  await ensureValidationDirectories()
  const client = createSupabaseAdminClient(context)

  const scans = await Promise.all([
    scanTable(client, "clients", ["company_name"]),
    scanTable(client, "contacts", ["name", "email"]),
    scanTable(client, "client_logistics_parties", ["name", "contact_name", "contact_email"]),
    scanTable(client, "opportunities", ["description", "title"]),
    scanTable(client, "providers", ["name", "company_email"]),
    scanTable(client, "provider_contacts", ["name", "email"]),
    scanTable(client, "quotation_options", ["option_label"]),
    scanTable(client, "quotation_costs", ["option_label", "notes", "service_name"]),
    scanTable(client, "quotation_cargo_lines", ["commodities", "load_type"]),
    scanTable(client, "sales_accounting_concepts", ["concept", "sat_code"]),
    scanTable(client, "quotation_rejection_reasons", ["reason"]),
    scanTable(client, "exchange_rates", ["source_series_code"]),
  ])

  const residue = scans.filter((item) => item.ok && (item.count ?? 0) > 0)
  const payload = {
    generatedAt: isoTimestamp(),
    target: {
      kind: context.target.kind,
      projectRef: context.target.projectRef,
      protected: context.target.isProtectedRef,
    },
    prefixes: stressPrefixes,
    scans,
    clean: residue.length === 0,
  }

  await writeJson(
    path.join(context.paths.generatedDocsDir, "live-local-clean-state.json"),
    payload
  )
  await writeText(
    path.join(context.paths.docsValidationDir, "live-local-clean-state.md"),
    [
      "# Live/Local Clean State Validation",
      "",
      `Generated at: \`${payload.generatedAt}\``,
      `Target kind: \`${context.target.kind}\``,
      `Target project ref: \`${context.target.projectRef ?? "not-configured"}\``,
      `Clean: \`${payload.clean}\``,
      "",
      ...scans.map((item) =>
        item.ok
          ? `- \`${item.table}\`: ${item.count} prefixed rows`
          : `- \`${item.table}\`: error - ${item.error}`
      ),
      "",
      residue.length > 0
        ? "Residual prefixed rows were found and should be cleaned before treating the environment as stable."
        : "No prefixed validation rows were found in the scanned live/local tables.",
      "",
    ].join("\n")
  )

  if (!payload.clean) {
    process.exitCode = 1
  }

  console.log(`Clean-state validation completed. Residue tables: ${residue.length}.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
