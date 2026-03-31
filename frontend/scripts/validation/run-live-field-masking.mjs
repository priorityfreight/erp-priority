import path from "node:path"
import {
  ensureValidationDirectories,
  getValidationContext,
  isoTimestamp,
  writeJson,
  writeText,
} from "./shared/config.mjs"
import {
  assertDestructiveSessionCoverage,
  loadSessionUsers,
  organizeSessionUsers,
  pickSessionUser,
  signInSessionUser,
} from "./shared/stressFlows.mjs"

const personaExpectations = {
  sales: [
    { resourceKey: "crm.quotations.record", fieldKey: "sale_price", actionCode: "view", allowed: true },
    { resourceKey: "crm.quotations.record", fieldKey: "sale_price", actionCode: "edit", allowed: true },
    { resourceKey: "pricing.quotations.cost_section", fieldKey: "purchase_amount", actionCode: "view", allowed: false },
    { resourceKey: "pricing.quotations.cost_section", fieldKey: "purchase_amount", actionCode: "edit", allowed: false },
    { resourceKey: "pricing.quotations.cost_section", fieldKey: "profit_amount", actionCode: "view", allowed: false },
    { resourceKey: "pricing.quotations.workspace", fieldKey: "incoterm", actionCode: "view", allowed: false },
  ],
  pricing: [
    { resourceKey: "pricing.quotations.cost_section", fieldKey: "purchase_amount", actionCode: "view", allowed: true },
    { resourceKey: "pricing.quotations.cost_section", fieldKey: "purchase_amount", actionCode: "edit", allowed: true },
    { resourceKey: "pricing.quotations.cost_section", fieldKey: "sale_amount", actionCode: "view", allowed: false },
    { resourceKey: "pricing.quotations.cost_section", fieldKey: "profit_amount", actionCode: "view", allowed: false },
    { resourceKey: "crm.quotations.record", fieldKey: "sale_price", actionCode: "view", allowed: false },
    { resourceKey: "pricing.quotations.workspace", fieldKey: "incoterm", actionCode: "view", allowed: true },
  ],
  admin: [
    { resourceKey: "crm.quotations.record", fieldKey: "sale_price", actionCode: "view", allowed: true },
    { resourceKey: "crm.quotations.record", fieldKey: "cost", actionCode: "view", allowed: true },
    { resourceKey: "pricing.quotations.cost_section", fieldKey: "purchase_amount", actionCode: "view", allowed: true },
    { resourceKey: "pricing.quotations.cost_section", fieldKey: "sale_amount", actionCode: "edit", allowed: true },
    { resourceKey: "pricing.quotations.cost_section", fieldKey: "profit_amount", actionCode: "view", allowed: true },
    { resourceKey: "pricing.quotations.workspace", fieldKey: "incoterm", actionCode: "edit", allowed: true },
  ],
}

async function evaluatePersonaMasking(context, sessionUser) {
  const session = await signInSessionUser(context, sessionUser)

  try {
    const expectations = personaExpectations[sessionUser.persona] ?? []
    const cases = []

    for (const expectation of expectations) {
      const { data, error } = await session.client.rpc("erp_has_field_access", {
        p_resource_key: expectation.resourceKey,
        p_field_key: expectation.fieldKey,
        p_action_code: expectation.actionCode,
        p_owner_user_id: null,
        p_branch_id: null,
      })

      if (error) {
        throw error
      }

      const actual = Boolean(data)
      if (actual !== expectation.allowed) {
        throw new Error(
          `Persona ${sessionUser.persona} expected ${expectation.allowed ? "allow" : "deny"} for ${expectation.resourceKey}.${expectation.fieldKey}:${expectation.actionCode} but received ${actual}.`
        )
      }

      cases.push({
        resourceKey: expectation.resourceKey,
        fieldKey: expectation.fieldKey,
        actionCode: expectation.actionCode,
        allowed: actual,
      })
    }

    return {
      persona: sessionUser.persona,
      roleName: sessionUser.roleName ?? null,
      checkedCases: cases.length,
      deniedCases: cases.filter((item) => !item.allowed).length,
      cases,
    }
  } finally {
    await session.client.auth.signOut()
  }
}

async function main() {
  const context = await getValidationContext()
  await ensureValidationDirectories()

  const sessionUsers = await loadSessionUsers(context)
  const groupedSessionUsers = organizeSessionUsers(sessionUsers)
  assertDestructiveSessionCoverage(groupedSessionUsers)

  const personas = ["sales", "pricing", "admin"]
  const checks = []

  for (const persona of personas) {
    const startedAt = performance.now()

    try {
      const details = await evaluatePersonaMasking(context, pickSessionUser(groupedSessionUsers, persona))
      checks.push({
        persona,
        ok: true,
        durationMs: Math.round(performance.now() - startedAt),
        details,
      })
    } catch (error) {
      checks.push({
        persona,
        ok: false,
        durationMs: Math.round(performance.now() - startedAt),
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

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
    path.join(context.paths.generatedDocsDir, "live-local-field-masking.json"),
    payload
  )
  await writeText(
    path.join(context.paths.docsValidationDir, "live-local-field-masking.md"),
    [
      "# Live/Local Field Masking",
      "",
      `Generated at: \`${payload.generatedAt}\``,
      `Target kind: \`${payload.target.kind}\``,
      `Target project ref: \`${payload.target.projectRef ?? "not-configured"}\``,
      "",
      ...checks.map((check) =>
        check.ok
          ? `- \`${check.persona}\`: ok in ${check.durationMs}ms -> cases \`${check.details.checkedCases}\`, denied \`${check.details.deniedCases}\``
          : `- \`${check.persona}\`: failed in ${check.durationMs}ms — ${check.error}`
      ),
      "",
    ].join("\n")
  )

  if (checks.some((check) => !check.ok)) {
    process.exitCode = 1
  }

  console.log(`Field masking completed with ${checks.filter((check) => !check.ok).length} failures.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
