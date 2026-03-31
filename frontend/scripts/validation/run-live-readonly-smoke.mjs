import path from "node:path"
import {
  createSupabaseAdminClient,
  ensureValidationDirectories,
  getValidationContext,
  isoTimestamp,
  writeJson,
  writeText,
} from "./shared/config.mjs"

async function runCheck(label, work) {
  const startedAt = performance.now()

  try {
    const result = await work()
    return {
      label,
      ok: true,
      durationMs: Math.round(performance.now() - startedAt),
      details: result ?? null,
    }
  } catch (error) {
    return {
      label,
      ok: false,
      durationMs: Math.round(performance.now() - startedAt),
      error:
        error instanceof Error
          ? error.message
          : typeof error === "object"
            ? JSON.stringify(error)
            : String(error),
    }
  }
}

async function main() {
  const context = await getValidationContext()
  await ensureValidationDirectories()
  const client = createSupabaseAdminClient(context)

  const checks = await Promise.all([
    runCheck("client_overview_view", async () => {
      const { data, error } = await client.from("client_overview_view").select("id").limit(5)
      if (error) throw error
      return { rows: data?.length ?? 0 }
    }),
    runCheck("client_contacts_view", async () => {
      const { data, error } = await client.from("client_contacts_view").select("id").limit(5)
      if (error) throw error
      return { rows: data?.length ?? 0 }
    }),
    runCheck("open_opportunities_view", async () => {
      const { data, error } = await client.from("open_opportunities_view").select("id").limit(5)
      if (error) throw error
      return { rows: data?.length ?? 0 }
    }),
    runCheck("quotation_summary_view", async () => {
      const { data, error } = await client.from("quotation_summary_view").select("id").limit(5)
      if (error) throw error
      return { rows: data?.length ?? 0 }
    }),
    runCheck("quotation_cost_line_secure_view", async () => {
      const { data, error } = await client
        .from("quotation_cost_line_secure_view")
        .select("id")
        .limit(5)
      if (error) throw error
      return { rows: data?.length ?? 0 }
    }),
    runCheck("provider_overview_view", async () => {
      const { data, error } = await client.from("provider_overview_view").select("id").limit(5)
      if (error) throw error
      return { rows: data?.length ?? 0 }
    }),
    runCheck("provider_contacts_view", async () => {
      const { data, error } = await client.from("provider_contacts_view").select("id").limit(5)
      if (error) throw error
      return { rows: data?.length ?? 0 }
    }),
    runCheck("provider_service_offering_view", async () => {
      const { data, error } = await client
        .from("provider_service_offering_view")
        .select("id")
        .limit(5)
      if (error) throw error
      return { rows: data?.length ?? 0 }
    }),
    runCheck("service_transport_type_lookup_view", async () => {
      const { data, error } = await client
        .from("service_transport_type_lookup_view")
        .select("id")
        .limit(5)
      if (error) throw error
      return { rows: data?.length ?? 0 }
    }),
    runCheck("sales_accounting_concept_lookup_view", async () => {
      const { data, error } = await client
        .from("sales_accounting_concept_lookup_view")
        .select("id")
        .limit(5)
      if (error) throw error
      return { rows: data?.length ?? 0 }
    }),
    runCheck("quotation_rejection_reason_lookup_view", async () => {
      const { data, error } = await client
        .from("quotation_rejection_reason_lookup_view")
        .select("id")
        .limit(5)
      if (error) throw error
      return { rows: data?.length ?? 0 }
    }),
    runCheck("exchange_rates", async () => {
      const { data, error } = await client.from("exchange_rates").select("id").limit(5)
      if (error) throw error
      return { rows: data?.length ?? 0 }
    }),
    runCheck("unlocode_lookup_view", async () => {
      const { data, error } = await client.from("unlocode_lookup_view").select("id").limit(5)
      if (error) throw error
      return { rows: data?.length ?? 0 }
    }),
    runCheck("permission_resource_catalog_view", async () => {
      const { data, error } = await client
        .from("permission_resource_catalog_view")
        .select("*")
        .limit(5)
      if (error) throw error
      return { rows: data?.length ?? 0 }
    }),
    runCheck("role_resource_permission_matrix_view", async () => {
      const { data, error } = await client
        .from("role_resource_permission_matrix_view")
        .select("role_id")
        .limit(5)
      if (error) throw error
      return { rows: data?.length ?? 0 }
    }),
    runCheck("search_unlocodes()", async () => {
      const { data, error } = await client.rpc("search_unlocodes", {
        p_query: "mon",
        p_limit: 5,
      })
      if (error) throw error
      return { rows: Array.isArray(data) ? data.length : 0 }
    }),
  ])

  const payload = {
    generatedAt: isoTimestamp(),
    target: {
      kind: context.target.kind,
      projectRef: context.target.projectRef,
      protected: context.target.isProtectedRef,
    },
    checks,
  }

  await writeJson(
    path.join(context.paths.generatedDocsDir, "live-local-readonly-smoke.json"),
    payload
  )
  await writeText(
    path.join(context.paths.docsValidationDir, "live-local-readonly-smoke.md"),
    [
      "# Live/Local Read-Only Smoke",
      "",
      `Generated at: \`${payload.generatedAt}\``,
      `Target kind: \`${context.target.kind}\``,
      `Target project ref: \`${context.target.projectRef ?? "not-configured"}\``,
      "",
      ...checks.map((item) =>
        item.ok
          ? `- \`${item.label}\`: ok in ${item.durationMs}ms`
          : `- \`${item.label}\`: failed in ${item.durationMs}ms — ${item.error}`
      ),
      "",
    ].join("\n")
  )

  if (checks.some((item) => !item.ok)) {
    process.exitCode = 1
  }

  console.log(`Read-only smoke completed with ${checks.filter((item) => !item.ok).length} failures.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
