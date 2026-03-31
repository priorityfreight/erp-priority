import path from "node:path"
import {
  assertWritableClone,
  createSupabaseAdminClient,
  ensureValidationDirectories,
  getValidationContext,
  writeJson,
  writeText,
} from "./shared/config.mjs"
import { evaluateBreakScenarioSummary } from "./shared/hardeningThresholds.mjs"
import {
  createEmptyLedger,
  createProviderBundle,
  createSalesFlow,
  assertDestructiveSessionCoverage,
  executeAdminSmoke,
  executeReadBurst,
  loadLookups,
  loadSessionUsers,
  organizeSessionUsers,
  pickSessionUser,
  signInSessionUser,
} from "./shared/stressFlows.mjs"

function formatError(error) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (error && typeof error === "object") {
    const normalized = {
      code: error.code ?? null,
      message: error.message ?? null,
      details: error.details ?? null,
      hint: error.hint ?? null,
    }

    try {
      return JSON.stringify(normalized.message || normalized.code ? normalized : error)
    } catch {
      return Object.prototype.toString.call(error)
    }
  }

  return String(error)
}

async function runScenario(label, work) {
  const startedAt = performance.now()

  try {
    const details = await work()
    return {
      label,
      ok: true,
      durationMs: Math.round(performance.now() - startedAt),
      details: details ?? null,
    }
  } catch (error) {
    return {
      label,
      ok: false,
      durationMs: Math.round(performance.now() - startedAt),
      error: formatError(error),
    }
  }
}

async function writeFailureArtifacts(context, summary, ledgerPath) {
  const summaryPath = path.join(context.paths.generatedDocsDir, "live-local-break-scenarios.json")
  const summaryMdPath = path.join(context.paths.docsValidationDir, "live-local-break-scenarios.md")

  await writeJson(summaryPath, summary)
  await writeText(
    summaryMdPath,
    [
      "# Live/Local Break Scenarios",
      "",
      `Generated at: \`${summary.generatedAt}\``,
      `Target kind: \`${summary.target.kind}\``,
      `Target project ref: \`${summary.target.projectRef}\``,
      `Error: \`${summary.error}\``,
      "",
      "## Scenario Results",
      "",
      ...(summary.scenarios.length > 0
        ? summary.scenarios.map((scenario) =>
            scenario.ok
              ? `- \`${scenario.label}\`: ok in ${scenario.durationMs}ms`
              : `- \`${scenario.label}\`: failed in ${scenario.durationMs}ms — ${scenario.error}`
          )
        : ["- No scenarios completed before failure."]),
      "",
      `Ledger: \`${ledgerPath}\``,
      "",
    ].join("\n")
  )
}

async function main() {
  const context = await getValidationContext()
  await ensureValidationDirectories()
  assertWritableClone(context)

  const adminClient = createSupabaseAdminClient(context, { requireWritableClone: true })
  const lookups = await loadLookups(adminClient)
  const sessionUsers = await loadSessionUsers(context)
  const groupedSessionUsers = organizeSessionUsers(sessionUsers)
  assertDestructiveSessionCoverage(groupedSessionUsers)
  const runPrefix = `${(context.env.VALIDATION_PREFIX || "STRESS_").toUpperCase()}BREAK_${Date.now()}_`
  const ledger = createEmptyLedger(runPrefix, context)
  const ledgerPath = path.join(context.paths.runtimeValidationDir, "live-local-break-ledger.json")
  await writeJson(ledgerPath, ledger)

  const scenarios = []
  const summary = {
    generatedAt: ledger.generatedAt,
    runPrefix,
    target: {
      kind: context.target.kind,
      projectRef: context.target.projectRef,
    },
    scenarios,
    findings: [],
    error: null,
  }
  let baseQuotationId
  let baseProviderId
  try {
    const salesSession = await signInSessionUser(context, pickSessionUser(groupedSessionUsers, "sales"))
    const pricingSession = await signInSessionUser(context, pickSessionUser(groupedSessionUsers, "pricing"))
    const adminSession = await signInSessionUser(context, pickSessionUser(groupedSessionUsers, "admin"))

    baseQuotationId = await createSalesFlow(salesSession.client, lookups, runPrefix, ledger, {
      ownerUserId: salesSession.erpUser?.id ?? null,
    })
    baseProviderId = await createProviderBundle(pricingSession.client, lookups, runPrefix, ledger)
    await writeJson(ledgerPath, ledger)
    try {
      scenarios.push(
        await runScenario("double-request-pricing", async () => {
          const [first, second] = await Promise.all([
            salesSession.client.rpc("request_quotation_pricing", { p_quotation_id: baseQuotationId }),
            salesSession.client.rpc("request_quotation_pricing", { p_quotation_id: baseQuotationId }),
          ])

          const { data: quotation, error: quotationError } = await salesSession.client
            .from("quotation_summary_view")
            .select("id,status")
            .eq("id", baseQuotationId)
            .single()

          if (quotationError) throw quotationError

          return {
            rpcErrors: [first.error, second.error].filter(Boolean).length,
            status: quotation.status,
          }
        })
      )

      scenarios.push(
        await runScenario("double-take-pricing", async () => {
          const [first, second] = await Promise.all([
            pricingSession.client.rpc("take_quotation_for_pricing", { p_quotation_id: baseQuotationId }),
            pricingSession.client.rpc("take_quotation_for_pricing", { p_quotation_id: baseQuotationId }),
          ])

          const { data: quotation, error: quotationError } = await pricingSession.client
            .from("quotation_summary_view")
            .select("id,status")
            .eq("id", baseQuotationId)
            .single()

          if (quotationError) throw quotationError

          return {
            rpcErrors: [first.error, second.error].filter(Boolean).length,
            status: quotation.status,
          }
        })
      )

      scenarios.push(
        await runScenario("concurrent-purchase-option-save", async () => {
          const accountingConceptId = lookups.accountingConcepts[0]?.id ?? null
          const savePayload = {
            p_quotation_id: baseQuotationId,
            p_quotation_option_id: null,
            p_option_label: `${runPrefix}OPTION_${crypto.randomUUID().slice(0, 6)}`,
            p_purchase_valid_until: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
            p_lines: [
              {
                provider_id: baseProviderId,
                sales_accounting_concept_id: accountingConceptId,
                purchase_amount: 1000,
                purchase_currency: "USD",
                vat_rate: 16,
                notes: `${runPrefix} concurrent option`,
              },
            ],
          }

          const [left, right] = await Promise.all([
            pricingSession.client.rpc("save_quotation_purchase_option", savePayload),
            pricingSession.client.rpc("save_quotation_purchase_option", {
              ...savePayload,
              p_option_label: `${savePayload.p_option_label}_B`,
            }),
          ])

          if (left.error) throw left.error
          if (right.error) throw right.error
          const optionIds = [left.data, right.data].filter(Boolean).map((value) => String(value))
          ledger.quotation_options.push(...optionIds)

          const { data: costRows, error: costError } = await pricingSession.client
            .from("quotation_costs")
            .select("id")
            .in("quotation_option_id", optionIds)

          if (costError) throw costError

          for (const row of costRows ?? []) {
            ledger.quotation_costs.push(String(row.id))
          }

          return { createdOptions: [left.data, right.data].filter(Boolean).length }
        })
      )

      scenarios.push(
        await runScenario("concurrent-sales-amount-update", async () => {
          const { data: optionRows, error: optionError } = await salesSession.client
            .from("quotation_options")
            .select("id")
            .eq("quotation_id", baseQuotationId)
            .limit(1)

          if (optionError) throw optionError
          const optionId = optionRows?.[0]?.id
          if (!optionId) {
            throw new Error("No purchase option available for concurrent sales test.")
          }

          const { data: costRows, error: costError } = await salesSession.client
            .from("quotation_costs")
            .select("id")
            .eq("quotation_option_id", optionId)

          if (costError) throw costError

          for (const row of costRows ?? []) {
            ledger.quotation_costs.push(String(row.id))
          }

          const payloadA = Object.fromEntries(
            (costRows ?? []).map((row) => [row.id, { sale_amount: "1400", sale_currency: "USD" }])
          )
          const payloadB = Object.fromEntries(
            (costRows ?? []).map((row) => [row.id, { sale_amount: "1425", sale_currency: "USD" }])
          )

          const [first, second] = await Promise.all([
            salesSession.client.rpc("update_quotation_option_sales_amounts", {
              p_quotation_id: baseQuotationId,
              p_quotation_option_id: optionId,
              p_sales_amounts: payloadA,
            }),
            salesSession.client.rpc("update_quotation_option_sales_amounts", {
              p_quotation_id: baseQuotationId,
              p_quotation_option_id: optionId,
              p_sales_amounts: payloadB,
            }),
          ])

          if (first.error) throw first.error
          if (second.error) throw second.error
          return { updatedLines: costRows?.length ?? 0 }
        })
      )

      scenarios.push(
        await runScenario("delete-client-with-relations", async () => {
          const relationQuotationId = await createSalesFlow(
            salesSession.client,
            lookups,
            `${runPrefix}DELETE_`,
            ledger,
            {
              ownerUserId: salesSession.erpUser?.id ?? null,
            }
          )
          const { data: quotation, error: quotationError } = await salesSession.client
            .from("quotations")
            .select("client_id")
            .eq("id", relationQuotationId)
            .single()

          if (quotationError) throw quotationError
          const { error } = await salesSession.client.rpc("delete_client_record", {
            p_client_id: quotation.client_id,
          })

          if (error) throw error
          return { clientId: quotation.client_id }
        })
      )

      scenarios.push(
        await runScenario("refresh-during-mutation", async () => {
          const [cargoResult, quoteResult] = await Promise.all([
            salesSession.client.rpc("create_quotation_cargo_line", {
              p_quotation_id: baseQuotationId,
              p_load_type: "Boxes",
              p_commodities: `${runPrefix} refresh`,
              p_piece_count: 5,
              p_width: 1,
              p_length: 1,
              p_height: 1,
              p_weight: 100,
              p_freight_class: null,
              p_cbm: 1,
              p_volumetric_weight_kg: null,
              p_sort_order: 99,
            }),
            salesSession.client
              .from("quotation_summary_view")
              .select("id,status")
              .eq("id", baseQuotationId)
              .single(),
          ])

          if (cargoResult.error) throw cargoResult.error
          if (quoteResult.error) throw quoteResult.error
          ledger.quotation_cargo_lines.push(String(cargoResult.data))
          return { status: quoteResult.data.status }
        })
      )

      scenarios.push(
        await runScenario("read-burst-during-exchange-rate-writes", async () => {
          await Promise.all([
            executeAdminSmoke(adminSession.client, `${runPrefix}FX_`, ledger, {
              flowIndex: 0,
            }),
            executeReadBurst(pricingSession.client),
          ])
          return { ok: true }
        })
      )

      scenarios.push(
        await runScenario("pagination-and-search-burst", async () => {
          const requests = Array.from({ length: 12 }, (_, index) =>
            pricingSession.client.rpc("search_quotations", {
              p_scope: "pricing",
              p_query: runPrefix.slice(0, 6),
              p_status: index % 2 === 0 ? "all" : "cotizando",
              p_limit: 25,
              p_offset: (index % 3) * 25,
            })
          )

          const results = await Promise.all(requests)
          const failed = results.find((result) => result.error)
          if (failed?.error) throw failed.error
          return { burstRequests: results.length }
        })
      )

      scenarios.push(
        await runScenario("authenticated-route-checks", async () => {
          if (sessionUsers.length === 0) {
            return { skipped: true }
          }

          const authCheckUsers = [
            ...groupedSessionUsers.sales.slice(0, 2),
            ...groupedSessionUsers.pricing.slice(0, 2),
            ...groupedSessionUsers.admin.slice(0, 2),
          ]

          const results = []

          for (const user of authCheckUsers) {
            const session = await signInSessionUser(context, user)

            try {
              const { data, error } = await session.client.rpc("erp_can_access_route", {
                p_route_path: user.routePath ?? "/master-data/users/roles",
                p_action_code: "view",
              })

              if (error) throw error
              results.push({
                email: user.email,
                allowed: Boolean(data),
              })
            } finally {
              await session.client.auth.signOut()
            }
          }

          return {
            checkedUsers: results.length,
            configuredUsers: sessionUsers.length,
          }
        })
      )
    } finally {
      await Promise.allSettled([
        salesSession.client.auth.signOut(),
        pricingSession.client.auth.signOut(),
        adminSession.client.auth.signOut(),
      ])
    }

    summary.findings = evaluateBreakScenarioSummary(summary)

    const summaryPath = path.join(context.paths.generatedDocsDir, "live-local-break-scenarios.json")
    const summaryMdPath = path.join(context.paths.docsValidationDir, "live-local-break-scenarios.md")

    await writeJson(ledgerPath, ledger)
    await writeJson(summaryPath, summary)
    await writeText(
      summaryMdPath,
      [
        "# Live/Local Break Scenarios",
        "",
        `Generated at: \`${summary.generatedAt}\``,
        `Target kind: \`${summary.target.kind}\``,
        `Target project ref: \`${summary.target.projectRef}\``,
        "",
        "## Findings",
        "",
        ...(summary.findings.length > 0
          ? summary.findings.map((item) => `- [${item.severity.toUpperCase()}] ${item.message}`)
          : ["- None"]),
        "",
        "## Scenario Results",
        "",
        ...scenarios.map((scenario) =>
          scenario.ok
            ? `- \`${scenario.label}\`: ok in ${scenario.durationMs}ms`
            : `- \`${scenario.label}\`: failed in ${scenario.durationMs}ms — ${scenario.error}`
        ),
        "",
        `Ledger: \`${ledgerPath}\``,
        "",
      ].join("\n")
    )

    if (summary.findings.length > 0 || scenarios.some((scenario) => !scenario.ok)) {
      process.exitCode = 1
    }
  } catch (error) {
    await writeJson(ledgerPath, ledger)
    summary.error =
      formatError(error)
    await writeFailureArtifacts(context, summary, ledgerPath)
    throw error
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
