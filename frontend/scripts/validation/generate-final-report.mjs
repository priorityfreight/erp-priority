import fs from "node:fs/promises"
import path from "node:path"
import {
  ensureValidationDirectories,
  getValidationContext,
  isoTimestamp,
  writeJson,
  writeText,
} from "./shared/config.mjs"
import {
  evaluateAccessMatrixSummary,
  evaluateBreakScenarioSummary,
  evaluateFieldMaskingSummary,
  evaluateReadOnlyChecks,
  evaluateStressSummary,
} from "./shared/hardeningThresholds.mjs"

async function readJsonSafe(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8")
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

async function readTextSafe(filePath, fallback = null) {
  try {
    return await fs.readFile(filePath, "utf8")
  } catch {
    return fallback
  }
}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function normalizeSeverity(item) {
  return item.priority || item.severity || "low"
}

function countLines(content) {
  return content.split(/\r?\n/).length
}

const routeTargets = [
  {
    path: "frontend/app/quotations/[id]/page.tsx",
    label: "Quotation detail route",
    highThreshold: 1000,
    mediumThreshold: 700,
  },
  {
    path: "frontend/app/pricing/quotations/page.tsx",
    label: "Pricing quotations route",
    highThreshold: 900,
    mediumThreshold: 650,
  },
  {
    path: "frontend/app/clients/[id]/page.tsx",
    label: "Client detail route",
    highThreshold: 900,
    mediumThreshold: 650,
  },
  {
    path: "frontend/app/pricing/providers/[id]/page.tsx",
    label: "Provider detail route",
    highThreshold: 800,
    mediumThreshold: 600,
  },
]

const controllerTargets = [
  {
    path: "frontend/src/features/quotations/detail/useQuotationDetailController.ts",
    label: "Quotation detail controller",
    highThreshold: 700,
    mediumThreshold: 500,
  },
  {
    path: "frontend/src/features/pricing/quotations/usePricingQuotationsController.ts",
    label: "Pricing quotations controller",
    highThreshold: 600,
    mediumThreshold: 400,
  },
  {
    path: "frontend/src/components/master-data/RolesPermissionsManager.tsx",
    label: "Roles permissions workspace",
    highThreshold: 650,
    mediumThreshold: 450,
  },
]

const queryLayerTargets = [
  "frontend/src/lib/db/clients.ts",
  "frontend/src/lib/db/contacts.ts",
  "frontend/src/lib/db/opportunities.ts",
  "frontend/src/lib/db/providers.ts",
  "frontend/src/lib/db/quotations.ts",
  "frontend/src/lib/db/permissions.ts",
]

const fallbackGuardTargets = [
  "frontend/src/lib/db/backendMode.ts",
  "frontend/src/lib/db/masterData.ts",
  "frontend/src/lib/db/clients.ts",
  "frontend/src/lib/db/contacts.ts",
  "frontend/src/lib/db/opportunities.ts",
  "frontend/src/lib/db/providers.ts",
  "frontend/src/lib/db/quotations.ts",
  "frontend/src/lib/db/permissions.ts",
]

const directMutationPattern = /\.from\([\s\S]{0,120}?\)\s*\.(insert|update|delete|upsert)\s*\(/g
const fallbackMarkerPattern = /\b(snapshot|fallback|legacy)\b/gi
const rateLimitPattern = /request rate limit reached|rate limit/i

function computeScores(findings) {
  const high = findings.filter((item) => normalizeSeverity(item) === "high").length
  const medium = findings.filter((item) => normalizeSeverity(item) === "medium").length
  const low = findings.filter((item) => normalizeSeverity(item) === "low").length

  const maturity = clamp(84 - high * 8 - medium * 2 - low)
  const stability = clamp(80 - high * 10 - medium * 2)
  const performance = clamp(76 - high * 8 - medium * 3)
  const scalability = clamp(74 - high * 7 - medium * 3)

  return { maturity, stability, performance, scalability }
}

function highestSeverity(items) {
  const order = { high: 3, medium: 2, low: 1 }
  return items.reduce((current, item) => {
    const severity = normalizeSeverity(item)
    return (order[severity] ?? 0) > (order[current] ?? 0) ? severity : current
  }, "low")
}

function rootCauseSections(architecture) {
  const grouped = []
  const routeFindings = architecture.findings.filter((item) =>
    item.title?.includes("live route component")
  )

  if (routeFindings.length > 0) {
    const oversizedRoutes = architecture.routeMetrics
      .filter((item) => {
        const target = routeTargets.find((candidate) => candidate.path === item.path)
        return target ? item.lines >= target.mediumThreshold : false
      })
      .map((item) => `${item.path} (${item.lines} lines)`)

    grouped.push({
      title: "Oversized live route modules remain",
      severity: highestSeverity(routeFindings),
      rootCause:
        oversizedRoutes.length > 0
          ? `Some live workflows are still concentrated in large route files: ${oversizedRoutes.join(", ")}.`
          : "Some live workflows remain concentrated in large route files.",
      businessImpact:
        "These routes are harder to stabilize under active development and more likely to regress when fields, status transitions, or role-specific behavior change.",
      technicalImpact:
        "State orchestration, fetch timing, and rerender cost are concentrated in a few files, which raises complexity for concurrency validation and UI correctness.",
    })
  }

  if (architecture.findings.some((item) => item.title.includes("Mixed RPC workflows and direct table mutations"))) {
    grouped.push({
      title: "Mixed canonical RPC paths and direct table writes",
      severity: "high",
      rootCause:
        "Several live query modules still combine business RPCs with direct inserts, updates, or deletes against base tables.",
      businessImpact:
        "Workflow rules can diverge between screens, especially in CRM, quotations, pricing, and provider management.",
      technicalImpact:
        "Data integrity logic becomes harder to centralize, and concurrent writes become more fragile because not all write paths share the same backend rules.",
    })
  }

  if (
    architecture.findings.some((item) =>
      item.title.includes("Fallback or legacy branches remain in live data access")
    )
  ) {
    grouped.push({
      title: "Fallback branches remain in live/local data access",
      severity: "medium",
      rootCause:
        "Rollback-safety compatibility logic is still present in backend mode detection, master data access, and UN/LOCODE fallback paths.",
      businessImpact:
        "Future changes may accidentally preserve compatibility code longer than intended and make real production paths harder to reason about.",
      technicalImpact:
        "Validation must cover canonical and fallback behavior explicitly until the rollback branches are retired.",
    })
  }

  return grouped
}

async function collectArchitectureSignals(context) {
  const findings = []
  const routeMetrics = []
  const controllerMetrics = []
  const directWriteFiles = []
  const fallbackFiles = []
  const resolvedSignals = []

  for (const target of routeTargets) {
    const filePath = path.join(context.paths.repoRoot, target.path)
    const content = await readTextSafe(filePath)

    if (!content) {
      continue
    }

    const lines = countLines(content)
    routeMetrics.push({ path: target.path, lines })

    if (lines >= target.highThreshold) {
      findings.push({
        severity: "high",
        title: "Very large live route component persists",
        message: `${target.label} remains oversized at ${lines} lines (${target.path}).`,
      })
    } else if (lines >= target.mediumThreshold) {
      findings.push({
        severity: "medium",
        title: "Large live route component persists",
        message: `${target.label} remains large at ${lines} lines (${target.path}).`,
      })
    }
  }

  for (const target of controllerTargets) {
    const filePath = path.join(context.paths.repoRoot, target.path)
    const content = await readTextSafe(filePath)

    if (!content) {
      continue
    }

    const lines = countLines(content)
    controllerMetrics.push({ path: target.path, lines })

    if (lines >= target.highThreshold) {
      findings.push({
        severity: "medium",
        title: "Large workflow controller persists",
        message: `${target.label} still carries dense orchestration at ${lines} lines (${target.path}).`,
      })
    } else if (lines >= target.mediumThreshold) {
      findings.push({
        severity: "low",
        title: "Workflow controller still dense",
        message: `${target.label} is still moderately dense at ${lines} lines (${target.path}).`,
      })
    }
  }

  for (const target of queryLayerTargets) {
    const filePath = path.join(context.paths.repoRoot, target)
    const content = await readTextSafe(filePath, "")
    const matches = [...content.matchAll(directMutationPattern)]

    if (matches.length > 0) {
      directWriteFiles.push({
        path: target,
        count: matches.length,
      })
    }
  }

  if (directWriteFiles.length > 0) {
    findings.push({
      severity: "high",
      title: "Mixed RPC workflows and direct table mutations remain",
      message: `${directWriteFiles.length} live query modules still contain direct base-table mutations.`,
    })
  } else {
    resolvedSignals.push(
      "Audited live CRM, quotation, provider, and permission query modules currently avoid direct base-table writes."
    )
  }

  for (const target of fallbackGuardTargets) {
    const filePath = path.join(context.paths.repoRoot, target)
    const content = await readTextSafe(filePath, "")
    const matches = [...content.matchAll(fallbackMarkerPattern)]

    if (matches.length > 0) {
      fallbackFiles.push({
        path: target,
        count: matches.length,
      })
    }
  }

  if (fallbackFiles.length > 0) {
    findings.push({
      severity: "medium",
      title: "Fallback or legacy branches remain in live data access",
      message: `${fallbackFiles.length} audited live data-access files still contain fallback or legacy markers.`,
    })
  } else {
    resolvedSignals.push(
      "Audited live CRM and master-data query paths are operating in canonical-only mode without fallback markers."
    )
  }

  return {
    findings,
    routeMetrics,
    controllerMetrics,
    directWriteFiles,
    fallbackFiles,
    resolvedSignals,
  }
}

function evaluateSequenceSummary(summary) {
  const results = summary.results ?? []
  const failedStep = results.find((item) => item?.ok === false)

  if (!failedStep) {
    return []
  }

  const detail = [failedStep.stderr, failedStep.stdout, failedStep.message, summary.error]
    .filter(Boolean)
    .join("\n")

  if (rateLimitPattern.test(detail)) {
    return [
      {
        severity: "medium",
        category: "stress-sequence",
        label: failedStep.step ?? "stress-sequence",
        message:
          "Integrated break+stress sequencing still depends on extra Auth cooldown between tiers; the last failed run hit a transient rate limit.",
      },
    ]
  }

  return [
    {
      severity: "high",
      category: "stress-sequence",
      label: failedStep.step ?? "stress-sequence",
      message: `Integrated break+stress sequencing failed at ${failedStep.step ?? "unknown step"}.`,
    },
  ]
}

function buildQuickWins(payload) {
  const oversizedRoutes = payload.architecture.routeMetrics.filter((item) => {
    const target = routeTargets.find((candidate) => candidate.path === item.path)
    return target ? item.lines >= target.mediumThreshold : false
  })
  const hasLargeRoutes = oversizedRoutes.length > 0
  const hasDirectWrites = payload.architecture.findings.some((item) =>
    item.title?.includes("direct table mutations")
  )
  const hasFallback = payload.architecture.findings.some((item) =>
    item.title?.includes("Fallback or legacy branches")
  )
  const hasSequenceRateLimit = payload.dynamicFindings.some(
    (item) => item.category === "stress-sequence"
  )
  const hasAccessMatrixFinding = payload.dynamicFindings.some(
    (item) => item.category === "access-matrix"
  )
  const hasFieldMaskingFinding = payload.dynamicFindings.some(
    (item) => item.category === "field-masking"
  )

  const quickWins = []

  if (hasLargeRoutes) {
    quickWins.push(
      `Keep splitting the remaining large route modules: ${oversizedRoutes.map((item) => item.path).join(", ")}.`
    )
  }
  if (hasDirectWrites) {
    quickWins.push("Normalize the remaining direct writes behind canonical RPCs in the audited query layer.")
  }
  if (hasFallback) {
    quickWins.push("Retire the remaining fallback markers in live data access once TRAIN coverage stays green.")
  }
  if (hasSequenceRateLimit) {
    quickWins.push(
      "Increase integrated sequence cooldown/retry spacing so back-to-back stress tiers do not depend on manual Auth cooldown."
    )
  }
  if (hasAccessMatrixFinding) {
    quickWins.push(
      "Repair the failing persona allow/deny rules so TRAIN access-matrix checks pass before opening PROD."
    )
  }
  if (hasFieldMaskingFinding) {
    quickWins.push(
      "Repair the failing field-level permission rules so sensitive economic fields stay masked for the wrong personas."
    )
  }

  quickWins.push(
    "Re-run rollback, baseline, smoke, break scenarios, stress, cleanup, and clean-state on every hardening batch touching live workflows."
  )

  return quickWins
}

function buildRoadmap(payload) {
  const roadmap = []

  if (payload.architecture.findings.some((item) => item.title?.includes("live route component"))) {
    roadmap.push("Reduce the remaining oversized live route modules and move more UI composition into feature views.")
  }
  if (payload.architecture.findings.some((item) => item.title?.includes("direct table mutations"))) {
    roadmap.push("Normalize mixed write paths in CRM, quotations, and providers.")
  }
  if (payload.dynamicFindings.some((item) => item.category === "stress-sequence")) {
    roadmap.push("Harden integrated destructive validation so all tiers complete in one unattended TRAIN run.")
  }

  if (payload.dynamicFindings.some((item) => item.category === "access-matrix")) {
    roadmap.push("Close the remaining authenticated route and masking failures surfaced by the named-persona access matrix.")
  }
  if (payload.dynamicFindings.some((item) => item.category === "field-masking")) {
    roadmap.push("Close the remaining field-level masking failures surfaced by the named-persona field-masking gate.")
  }
  roadmap.push("Keep authenticated route and masking coverage in the unattended TRAIN gate with named personas and expected denials.")
  roadmap.push("Keep repeating break scenarios and stress validation before opening PROD.")

  return roadmap
}

function renderReport(payload) {
  const cleanStateKnown = typeof payload.cleanState.clean === "boolean"
  const residueTables = payload.cleanState.scans.filter(
    (item) => item.ok && (item.count ?? 0) > 0
  ).length
  const sessionPool = payload.stressSummary.sessionPool ?? null
  const authenticatedChecks = payload.stressSummary.authenticatedChecks ?? null
  const quickWins = buildQuickWins(payload)
  const roadmap = buildRoadmap(payload)
  const topIssues = [
    ...payload.rootCauses.map((item) => `- [${item.severity.toUpperCase()}] ${item.title}`),
    ...payload.dynamicFindings.map((item) => `- [${item.severity.toUpperCase()}] ${item.message}`),
  ]
  const lines = [
    "# Live/Local Validation Final Report",
    "",
    `Generated at: \`${payload.generatedAt}\``,
    `Target kind: \`${payload.target.kind}\``,
    `Target project ref: \`${payload.target.projectRef ?? "not-configured"}\``,
    `Protected target: \`${payload.target.protected}\``,
    "",
    "## Scores",
    "",
    `- Maturity: ${payload.scores.maturity}/100`,
    `- Stability: ${payload.scores.stability}/100`,
    `- Performance: ${payload.scores.performance}/100`,
    `- Scalability: ${payload.scores.scalability}/100`,
    "",
    ...(payload.architecture.resolvedSignals.length > 0
      ? [
          "## Resolved Hardening Signals",
          "",
          ...payload.architecture.resolvedSignals.map((item) => `- ${item}`),
          "",
        ]
      : []),
    "## Top Critical Issues",
    "",
    ...(topIssues.length > 0 ? topIssues : ["- No critical or high issues were detected in this reporting cycle."]),
    "",
    "## Root Cause Analysis",
    "",
    ...payload.rootCauses.flatMap((item) => [
      `### ${item.title}`,
      "",
      `- Severity: \`${item.severity}\``,
      `- Root cause: ${item.rootCause}`,
      `- Business impact: ${item.businessImpact}`,
      `- Technical impact: ${item.technicalImpact}`,
      "",
    ]),
    "## Quick Wins",
    "",
    ...quickWins.map((item) => `- ${item}`),
    "",
    "## Long-Term Improvements",
    "",
    "- Keep moving screen-level orchestration into narrower workflow modules to reduce page state density.",
    "- Introduce a fuller authenticated route/masking suite with named personas and expected denials.",
    "- Keep TRAIN under repeated destructive validation until operations/accounting can be added without opening new critical findings.",
    "",
    "## Recommended Next Step Before New Modules",
    "",
    "- Continue the TRAIN hardening program and close critical/high findings before creating PROD or adding any new live module.",
    "",
    "## Bulletproofing Checklist",
    "",
    "- Rollback branch verified before every hardening pass.",
    "- Row-count baseline captured before any write validation.",
    "- Read-only smoke passes.",
    "- Named-persona access matrix passes.",
    "- Named-persona field-masking checks pass.",
    "- Break-scenario suite passes.",
    "- Clean-state scan reports zero prefixed rows.",
    "- Lint and build pass.",
    "- Large-route regressions reviewed in quotation detail, pricing quotations, client detail, and provider detail.",
    "- Mixed write-path modules reviewed for RPC normalization.",
    "",
    "## Prioritized Optimization Roadmap",
    "",
    ...roadmap.map((item, index) => `${index + 1}. ${item}`),
    "",
    "## Tests To Repeat After Every Major Change",
    "",
    "- login and route access",
    "- named-persona navigation visibility and expected route denials",
    "- named-persona field masking for quotation economics and pricing costs",
    "- clients list and client detail",
    "- opportunity creation and opportunity -> quotation",
    "- quotation detail cargo workflow",
    "- pricing quotation purchase-option batch save",
    "- customer document preview/PDF alignment",
    "- pricing request preview/PDF alignment",
    "- roles/permissions masking and navigation visibility",
    "- exchange-rate reads and admin sync path",
    "- UN/LOCODE lookup",
    "- rollback, baseline, lint, build, read-only smoke, break scenarios, and clean-state validation",
    "",
    "## Cleanup Validation Report",
    "",
    `- Clean state: \`${cleanStateKnown ? payload.cleanState.clean : "unknown"}\``,
    `- Residue scan tables with prefixed rows: \`${residueTables}\``,
    `- Stress executed on TRAIN: \`${payload.target.kind === "train" && (payload.stressSummary.scenarios?.length ?? 0) > 0}\``,
    ...(sessionPool
      ? [
          `- Stress session pool required counts: \`${JSON.stringify(sessionPool.requiredCounts ?? {})}\``,
          `- Stress session pool signed-in counts: \`${JSON.stringify(sessionPool.signedInCounts ?? {})}\``,
          `- Stress session pool cap: \`${sessionPool.maxUsers ?? "unknown"}\``,
        ]
      : []),
    ...(authenticatedChecks
      ? [
          `- Authenticated checks mode: \`${authenticatedChecks.mode ?? "unknown"}\``,
          `- Authenticated checks executed: \`${authenticatedChecks.executedCount ?? 0}/${authenticatedChecks.desiredCount ?? 0}\``,
        ]
      : []),
    "",
    "## Final Stability Statement",
    "",
    !cleanStateKnown
      ? "The environment has not yet produced a clean-state validation artifact in this reporting cycle, so cleanup status is still pending confirmation."
      : payload.cleanState.clean
      ? "The current environment was left clean and stable. No prefixed validation residue was detected in the scanned live/local tables."
      : "The current environment still shows prefixed validation residue in at least one scanned table and should not be treated as clean until those rows are removed.",
    "",
  ]

  return lines.join("\n")
}

async function main() {
  const context = await getValidationContext()
  await ensureValidationDirectories()

  const cleanState = await readJsonSafe(
    path.join(context.paths.generatedDocsDir, "live-local-clean-state.json"),
    { clean: false, scans: [] }
  )
  const readonlySmoke = await readJsonSafe(
    path.join(context.paths.generatedDocsDir, "live-local-readonly-smoke.json"),
    { checks: [] }
  )
  const stressSummary = await readJsonSafe(
    path.join(context.paths.generatedDocsDir, "live-local-stress-summary.json"),
    { errors: [], findings: [], scenarios: [], metrics: {} }
  )
  const stressSequence = await readJsonSafe(
    path.join(context.paths.generatedDocsDir, "live-local-stress-sequence.json"),
    { results: [] }
  )
  const accessMatrix = await readJsonSafe(
    path.join(context.paths.generatedDocsDir, "live-local-access-matrix.json"),
    { checks: [] }
  )
  const fieldMasking = await readJsonSafe(
    path.join(context.paths.generatedDocsDir, "live-local-field-masking.json"),
    { checks: [] }
  )
  const breakSummary = await readJsonSafe(
    path.join(context.paths.generatedDocsDir, "live-local-break-scenarios.json"),
    { findings: [], scenarios: [] }
  )
  const architecture = await collectArchitectureSignals(context)

  const dynamicFindings = [
    ...evaluateReadOnlyChecks(readonlySmoke.checks ?? []),
    ...evaluateAccessMatrixSummary(accessMatrix),
    ...evaluateFieldMaskingSummary(fieldMasking),
    ...evaluateStressSummary(stressSummary),
    ...evaluateBreakScenarioSummary(breakSummary),
    ...evaluateSequenceSummary(stressSequence),
    ...(breakSummary.error
      ? [
          {
            severity: "high",
            category: "break-scenarios",
            label: "break-scenario-bootstrap",
            message: `Break scenarios failed before completing their first scenario: ${breakSummary.error}`,
          },
        ]
      : []),
  ]
  const scores = computeScores([...(architecture.findings ?? []), ...dynamicFindings])
  const payload = {
    generatedAt: isoTimestamp(),
    target: {
      kind: context.target.kind,
      projectRef: context.target.projectRef,
      protected: context.target.isProtectedRef,
    },
    scores,
    rootCauses: rootCauseSections(architecture),
    dynamicFindings,
    cleanState,
    readonlySmoke,
    accessMatrix,
    fieldMasking,
    stressSummary,
    stressSequence,
    breakSummary,
    findings: architecture.findings ?? [],
    architecture,
  }

  await writeJson(
    path.join(context.paths.generatedDocsDir, "live-local-final-report.json"),
    payload
  )
  await writeText(
    path.join(context.paths.docsValidationDir, "live-local-final-report.md"),
    renderReport(payload)
  )

  console.log("Final report generated.")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
