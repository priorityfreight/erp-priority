import path from "node:path"
import {
  assertWritableClone,
  createSupabaseAdminClient,
  ensureValidationDirectories,
  getValidationContext,
  writeJson,
  writeText,
} from "./shared/config.mjs"
import {
  evaluateStressSummary,
  maxSessionPoolUsers,
  summarizeDurations,
} from "./shared/hardeningThresholds.mjs"
import {
  assertDestructiveSessionCoverage,
  createStressSessionPool,
  createEmptyLedger,
  createSalesFlow,
  executeAdminSmoke,
  executeAuthenticatedChecksWithPool,
  executePricingFlow,
  executeSalesFollowUp,
  executeReadBurst,
  loadLookups,
  loadProfiles,
  loadSessionUsers,
  organizeSessionUsers,
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
    await work()
    return {
      label,
      ok: true,
      durationMs: Math.round(performance.now() - startedAt),
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

async function executeWithRetry(label, attempts, work) {
  let lastResult = null

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = await runScenario(`${label}:attempt-${attempt}`, work)
    lastResult = result

    if (result.ok) {
      return {
        ...result,
        label,
        attemptsUsed: attempt,
      }
    }
  }

  return {
    ...lastResult,
    label,
    attemptsUsed: attempts,
  }
}

async function main() {
  const context = await getValidationContext()
  await ensureValidationDirectories()
  assertWritableClone(context)

  const loadLevel = context.env.VALIDATION_LOAD_LEVEL || "light"
  const loadProfile = loadProfiles[loadLevel]

  if (!loadProfile) {
    throw new Error(`Unsupported VALIDATION_LOAD_LEVEL: ${loadLevel}`)
  }

  const adminClient = createSupabaseAdminClient(context, { requireWritableClone: true })
  const lookups = await loadLookups(adminClient)
  const sessionUsers = await loadSessionUsers(context)
  const groupedSessionUsers = organizeSessionUsers(sessionUsers)
  assertDestructiveSessionCoverage(groupedSessionUsers)
  const sessionPool = await createStressSessionPool(context, groupedSessionUsers, loadProfile)
  const runPrefix = `${(context.env.VALIDATION_PREFIX || "LOADTEST_").toUpperCase()}${Date.now()}_`
  const ledger = createEmptyLedger(runPrefix, context)
  const scenarioResults = []
  const ledgerPath = path.join(context.paths.runtimeValidationDir, "live-local-run-ledger.json")
  await writeJson(ledgerPath, ledger)

  const summary = {
    generatedAt: ledger.generatedAt,
    loadLevel,
    runPrefix,
    completed: 0,
    skipped: [],
    errors: [],
    scenarios: scenarioResults,
    metrics: {
      averageMs: 0,
      p95Ms: 0,
      maxMs: 0,
      minMs: 0,
    },
    sessionPool: {
      maxUsers: maxSessionPoolUsers,
      configuredLoadProfile: loadProfile,
      requiredCounts: sessionPool.requiredCounts,
      signedInCounts: Object.fromEntries(
        Object.entries(sessionPool.sessions).map(([persona, sessions]) => [persona, sessions.length])
      ),
    },
    authenticatedChecks: {
      mode: "post-peak-pooled-subset",
      desiredCount: Math.max(Math.min(loadProfile?.authenticated ?? 1, 3), 1),
      executedCount: 0,
      personasChecked: [],
      skipped: false,
      reason: null,
    },
    findings: [],
  }

  try {
    const salesJobs = Array.from({ length: loadProfile.sales }, (_, index) =>
      executeWithRetry(`sales-flow-${index + 1}`, 2, async () => {
        const salesSession = sessionPool.pick("sales", index)
        await createSalesFlow(salesSession.client, lookups, runPrefix, ledger, {
          ownerUserId: salesSession.erpUser?.id ?? null,
        })
        await executeReadBurst(salesSession.client)
      })
    )

    const pricingJobs = Array.from({ length: loadProfile.pricing }, (_, index) =>
      executeWithRetry(`pricing-flow-${index + 1}`, 2, async () => {
        const salesSession = sessionPool.pick("sales", loadProfile.sales + index)
        const pricingSession = sessionPool.pick("pricing", index)

        const quotationId = await createSalesFlow(salesSession.client, lookups, runPrefix, ledger, {
          ownerUserId: salesSession.erpUser?.id ?? null,
        })
        const { error: requestError } = await salesSession.client.rpc("request_quotation_pricing", {
          p_quotation_id: quotationId,
        })

        if (requestError) {
          throw requestError
        }

        const pricingResult = await executePricingFlow(pricingSession.client, lookups, runPrefix, ledger, {
          quotationId,
          requestPricing: false,
        })

        await executeSalesFollowUp(
          salesSession.client,
          pricingResult.quotationId,
          pricingResult.optionId,
          pricingResult.costLineIds
        )
        await executeReadBurst(salesSession.client)
      })
    )

    const adminJobs = Array.from({ length: loadProfile.admin }, (_, index) =>
      executeWithRetry(`admin-flow-${index + 1}`, 2, async () => {
        const adminSession = sessionPool.pick("admin", index)
        await executeAdminSmoke(adminSession.client, runPrefix, ledger, {
          flowIndex: index,
        })
      })
    )

    const concurrentResults = await Promise.all([...salesJobs, ...pricingJobs, ...adminJobs])

    for (const result of concurrentResults) {
      scenarioResults.push(result)

      if (result.ok) {
        summary.completed += 1
      } else {
        summary.errors.push({
          persona: "authenticated-persona",
          detail: `${result.label}: ${result.error}`,
        })
      }
    }

    summary.authenticatedChecks = await executeAuthenticatedChecksWithPool(
      sessionPool,
      loadProfile,
      summary
    )
  } finally {
    await sessionPool.close()
  }

  const durationSummary = summarizeDurations(scenarioResults.map((scenario) => scenario.durationMs))
  summary.metrics = durationSummary
  summary.findings = evaluateStressSummary(summary)

  const summaryPath = path.join(context.paths.generatedDocsDir, "live-local-stress-summary.json")
  const summaryMdPath = path.join(context.paths.docsValidationDir, "live-local-stress-summary.md")

  await writeJson(ledgerPath, ledger)
  await writeJson(summaryPath, summary)
  await writeText(
    summaryMdPath,
    [
      "# Live/Local Stress Summary",
      "",
      `- Generated at: \`${summary.generatedAt}\``,
      `- Load level: \`${loadLevel}\``,
      `- Target project ref: \`${context.target.projectRef}\``,
      `- Completed jobs: \`${summary.completed}\``,
      `- Errors: \`${summary.errors.length}\``,
      `- Average duration: \`${summary.metrics.averageMs}ms\``,
      `- P95 duration: \`${summary.metrics.p95Ms}ms\``,
      `- Max duration: \`${summary.metrics.maxMs}ms\``,
      `- Session pool max users: \`${summary.sessionPool.maxUsers}\``,
      `- Session pool required counts: \`${JSON.stringify(summary.sessionPool.requiredCounts)}\``,
      `- Session pool signed-in counts: \`${JSON.stringify(summary.sessionPool.signedInCounts)}\``,
      `- Authenticated checks mode: \`${summary.authenticatedChecks.mode}\``,
      `- Authenticated checks executed: \`${summary.authenticatedChecks.executedCount}/${summary.authenticatedChecks.desiredCount}\``,
      `- Authenticated check personas: \`${
        summary.authenticatedChecks.personasChecked.length > 0
          ? summary.authenticatedChecks.personasChecked.join(", ")
          : "none"
      }\``,
      `- Skipped checks: ${
        summary.skipped.length > 0 ? summary.skipped.map((item) => `\`${item}\``).join(", ") : "None"
      }`,
      "",
      "## Findings",
      "",
      ...(summary.findings.length > 0
        ? summary.findings.map((item) => `- [${item.severity.toUpperCase()}] ${item.message}`)
        : ["- None"]),
      "",
      "## Scenario Results",
      "",
      ...scenarioResults.map((scenario) =>
        scenario.ok
          ? `- \`${scenario.label}\`: ok in ${scenario.durationMs}ms (attempts: ${scenario.attemptsUsed})`
          : `- \`${scenario.label}\`: failed in ${scenario.durationMs}ms (attempts: ${scenario.attemptsUsed}) — ${scenario.error}`
      ),
      "",
      ...summary.errors.map((item) => `- ${item.persona}: ${item.detail}`),
      "",
      `Ledger: \`${ledgerPath}\``,
      "",
    ].join("\n")
  )

  if (summary.errors.length > 0 || summary.findings.length > 0) {
    process.exitCode = 1
  }

  console.log(`Stress summary written to ${summaryMdPath}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
