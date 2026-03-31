export const readOnlyBudgets = {
  defaultMaxDurationMs: 2000,
  perCheck: {
    "quotation_cost_line_secure_view": 2500,
    "role_resource_permission_matrix_view": 2500,
    "search_unlocodes()": 1500,
  },
}

export const loadProfiles = {
  light: { sales: 2, pricing: 1, admin: 1, authenticated: 1 },
  medium: { sales: 6, pricing: 4, admin: 3, authenticated: 2 },
  heavy: { sales: 12, pricing: 8, admin: 6, authenticated: 4 },
  stress: { sales: 20, pricing: 15, admin: 10, authenticated: 5 },
}

export const maxSessionPoolUsers = 30

export function buildSessionPoolCounts(loadProfile) {
  const rawCounts = {
    sales: Math.max((loadProfile?.sales ?? 0) + (loadProfile?.pricing ?? 0), 1),
    pricing: Math.max(loadProfile?.pricing ?? 0, 1),
    admin: Math.max(loadProfile?.admin ?? 0, 1),
    authenticated: Math.max(loadProfile?.authenticated ?? 0, 1),
  }

  const personaCounts = {
    sales: rawCounts.sales,
    pricing: rawCounts.pricing,
    admin: rawCounts.admin,
  }
  const total = personaCounts.sales + personaCounts.pricing + personaCounts.admin

  if (total <= maxSessionPoolUsers) {
    return rawCounts
  }

  const personas = ["sales", "pricing", "admin"]
  const scale = maxSessionPoolUsers / total
  const scaled = Object.fromEntries(
    personas.map((persona) => [persona, Math.max(1, Math.floor(personaCounts[persona] * scale))])
  )

  let assigned = scaled.sales + scaled.pricing + scaled.admin
  const remainders = personas
    .map((persona) => ({
      persona,
      remainder: personaCounts[persona] * scale - scaled[persona],
    }))
    .sort((left, right) => right.remainder - left.remainder)

  let remainderIndex = 0
  while (assigned < maxSessionPoolUsers) {
    const target = remainders[remainderIndex % remainders.length]?.persona
    if (!target) {
      break
    }
    scaled[target] += 1
    assigned += 1
    remainderIndex += 1
  }

  return {
    sales: scaled.sales,
    pricing: scaled.pricing,
    admin: scaled.admin,
    authenticated: rawCounts.authenticated,
  }
}

export const stressThresholds = {
  light: { maxErrorCount: 0, maxAverageDurationMs: 6000, maxP95DurationMs: 9000 },
  medium: { maxErrorCount: 0, maxAverageDurationMs: 8000, maxP95DurationMs: 12000 },
  heavy: { maxErrorCount: 0, maxAverageDurationMs: 10000, maxP95DurationMs: 15000 },
  stress: { maxErrorCount: 0, maxAverageDurationMs: 12000, maxP95DurationMs: 18000 },
}

export const breakScenarioThresholds = {
  maxFailedScenarios: 0,
  requiredScenarioCount: 8,
}

export const accessMatrixThresholds = {
  maxFailedChecks: 0,
  requiredPersonaChecks: 3,
}

export const fieldMaskingThresholds = {
  maxFailedChecks: 0,
  requiredPersonaChecks: 3,
}

export function percentile(values, fraction) {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))
  return sorted[index]
}

export function summarizeDurations(values) {
  if (values.length === 0) {
    return {
      averageMs: 0,
      p95Ms: 0,
      maxMs: 0,
      minMs: 0,
    }
  }

  const total = values.reduce((sum, value) => sum + value, 0)

  return {
    averageMs: Math.round(total / values.length),
    p95Ms: Math.round(percentile(values, 0.95)),
    maxMs: Math.max(...values),
    minMs: Math.min(...values),
  }
}

export function evaluateReadOnlyChecks(checks) {
  return checks.flatMap((check) => {
    const budget = readOnlyBudgets.perCheck[check.label] ?? readOnlyBudgets.defaultMaxDurationMs

    if (!check.ok) {
      return [
        {
          severity: "high",
          category: "readonly-smoke",
          label: check.label,
          message: `Read-only smoke failed: ${check.error}`,
        },
      ]
    }

    if (check.durationMs > budget) {
      return [
        {
          severity: "medium",
          category: "readonly-smoke",
          label: check.label,
          message: `Read-only smoke exceeded budget (${check.durationMs}ms > ${budget}ms).`,
        },
      ]
    }

    return []
  })
}

export function evaluateStressSummary(summary) {
  const threshold = stressThresholds[summary.loadLevel] ?? stressThresholds.light
  const findings = []

  if ((summary.errors?.length ?? 0) > threshold.maxErrorCount) {
    findings.push({
      severity: "high",
      category: "stress",
      label: `stress:${summary.loadLevel}`,
      message: `Stress run produced ${summary.errors.length} errors; threshold is ${threshold.maxErrorCount}.`,
    })
  }

  if ((summary.metrics?.averageMs ?? 0) > threshold.maxAverageDurationMs) {
    findings.push({
      severity: "medium",
      category: "stress",
      label: `stress:${summary.loadLevel}`,
      message: `Average scenario duration exceeded budget (${summary.metrics.averageMs}ms > ${threshold.maxAverageDurationMs}ms).`,
    })
  }

  if ((summary.metrics?.p95Ms ?? 0) > threshold.maxP95DurationMs) {
    findings.push({
      severity: "medium",
      category: "stress",
      label: `stress:${summary.loadLevel}`,
      message: `P95 scenario duration exceeded budget (${summary.metrics.p95Ms}ms > ${threshold.maxP95DurationMs}ms).`,
    })
  }

  return findings
}

export function evaluateBreakScenarioSummary(summary) {
  const findings = []
  const scenarioCount = summary.scenarios?.length ?? 0
  const failedCount = summary.scenarios?.filter((scenario) => !scenario.ok).length ?? 0

  if (scenarioCount < breakScenarioThresholds.requiredScenarioCount) {
    findings.push({
      severity: "medium",
      category: "break-scenarios",
      label: "break-scenario-coverage",
      message: `Break-scenario coverage is below target (${scenarioCount}/${breakScenarioThresholds.requiredScenarioCount}).`,
    })
  }

  if (failedCount > breakScenarioThresholds.maxFailedScenarios) {
    findings.push({
      severity: "high",
      category: "break-scenarios",
      label: "break-scenario-failures",
      message: `Break scenarios produced ${failedCount} failures; threshold is ${breakScenarioThresholds.maxFailedScenarios}.`,
    })
  }

  return findings
}

export function evaluateAccessMatrixSummary(summary) {
  const findings = []
  const checks = summary.checks ?? []
  const failedCount = checks.filter((check) => !check.ok).length

  if (checks.length < accessMatrixThresholds.requiredPersonaChecks) {
    findings.push({
      severity: "medium",
      category: "access-matrix",
      label: "access-matrix-coverage",
      message: `Authenticated access-matrix coverage is below target (${checks.length}/${accessMatrixThresholds.requiredPersonaChecks}).`,
    })
  }

  if (failedCount > accessMatrixThresholds.maxFailedChecks) {
    findings.push({
      severity: "high",
      category: "access-matrix",
      label: "access-matrix-failures",
      message: `Authenticated access-matrix checks produced ${failedCount} failures; threshold is ${accessMatrixThresholds.maxFailedChecks}.`,
    })
  }

  return findings
}

export function evaluateFieldMaskingSummary(summary) {
  const findings = []
  const checks = summary.checks ?? []
  const failedCount = checks.filter((check) => !check.ok).length

  if (checks.length < fieldMaskingThresholds.requiredPersonaChecks) {
    findings.push({
      severity: "medium",
      category: "field-masking",
      label: "field-masking-coverage",
      message: `Field-masking coverage is below target (${checks.length}/${fieldMaskingThresholds.requiredPersonaChecks}).`,
    })
  }

  if (failedCount > fieldMaskingThresholds.maxFailedChecks) {
    findings.push({
      severity: "high",
      category: "field-masking",
      label: "field-masking-failures",
      message: `Field-masking checks produced ${failedCount} failures; threshold is ${fieldMaskingThresholds.maxFailedChecks}.`,
    })
  }

  return findings
}
