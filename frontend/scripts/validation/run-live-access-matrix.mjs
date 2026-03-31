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

function normalizeRoute(routePath) {
  if (!routePath || routePath === "/") {
    return "/"
  }

  return String(routePath).replace(/\/+$/, "")
}

async function evaluatePersonaAccess(context, sessionUser) {
  const session = await signInSessionUser(context, sessionUser)

  try {
    const { client, erpUser } = session
    const { data: navigationItems, error: navigationError } = await client.rpc(
      "get_current_navigation_items"
    )

    if (navigationError) {
      throw navigationError
    }

    const currentUser = Array.isArray(erpUser) ? erpUser[0] ?? null : erpUser ?? null

    if (!currentUser?.active) {
      throw new Error(`Persona ${sessionUser.persona} did not resolve to an active ERP user.`)
    }

    if (
      sessionUser.roleName &&
      typeof currentUser.role_name === "string" &&
      currentUser.role_name !== sessionUser.roleName
    ) {
      throw new Error(
        `Persona ${sessionUser.persona} resolved to role ${currentUser.role_name} instead of ${sessionUser.roleName}.`
      )
    }

    const visibleRoutes = (Array.isArray(navigationItems) ? navigationItems : [])
      .map((item) => normalizeRoute(item.route_path))
      .filter(Boolean)

    const allowedRoute = normalizeRoute(sessionUser.routePath)
    const { data: ownRouteAllowed, error: ownRouteError } = await client.rpc("erp_can_access_route", {
      p_route_path: allowedRoute,
      p_action_code: "view",
    })

    if (ownRouteError) {
      throw ownRouteError
    }

    if (!ownRouteAllowed) {
      throw new Error(`Expected route ${allowedRoute} to be accessible for ${sessionUser.persona}.`)
    }

    if (!visibleRoutes.includes(allowedRoute)) {
      throw new Error(
        `Expected route ${allowedRoute} to appear in navigation for ${sessionUser.persona}.`
      )
    }

    const deniedResults = []
    for (const deniedRoutePath of sessionUser.deniedRoutePaths ?? []) {
      const deniedRoute = normalizeRoute(deniedRoutePath)
      const { data: deniedAllowed, error: deniedError } = await client.rpc("erp_can_access_route", {
        p_route_path: deniedRoute,
        p_action_code: "view",
      })

      if (deniedError) {
        throw deniedError
      }

      const presentInNavigation = visibleRoutes.includes(deniedRoute)
      if (deniedAllowed || presentInNavigation) {
        throw new Error(
          `Denied route ${deniedRoute} is still exposed for ${sessionUser.persona}.`
        )
      }

      deniedResults.push({
        routePath: deniedRoute,
        accessAllowed: Boolean(deniedAllowed),
        presentInNavigation,
      })
    }

    return {
      persona: sessionUser.persona,
      roleName: currentUser.role_name ?? null,
      active: Boolean(currentUser.active),
      allowedRoute,
      deniedRoutesChecked: deniedResults,
      navigationCount: visibleRoutes.length,
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
      const sessionUser = pickSessionUser(groupedSessionUsers, persona)
      const details = await evaluatePersonaAccess(context, sessionUser)
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
    path.join(context.paths.generatedDocsDir, "live-local-access-matrix.json"),
    payload
  )
  await writeText(
    path.join(context.paths.docsValidationDir, "live-local-access-matrix.md"),
    [
      "# Live/Local Access Matrix",
      "",
      `Generated at: \`${payload.generatedAt}\``,
      `Target kind: \`${payload.target.kind}\``,
      `Target project ref: \`${payload.target.projectRef ?? "not-configured"}\``,
      "",
      ...checks.map((check) =>
        check.ok
          ? `- \`${check.persona}\`: ok in ${check.durationMs}ms -> allow \`${check.details.allowedRoute}\`, denied checks \`${check.details.deniedRoutesChecked.length}\``
          : `- \`${check.persona}\`: failed in ${check.durationMs}ms — ${check.error}`
      ),
      "",
    ].join("\n")
  )

  if (checks.some((check) => !check.ok)) {
    process.exitCode = 1
  }

  console.log(`Access matrix completed with ${checks.filter((check) => !check.ok).length} failures.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
