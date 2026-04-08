import fs from "node:fs/promises"
import path from "node:path"
import {
  createSupabaseAdminClient,
  ensureValidationDirectories,
  getValidationContext,
  isoTimestamp,
  writeJson,
  writeText,
} from "./shared/config.mjs"

const requiredEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GMAIL_CLIENT_ID",
  "GMAIL_CLIENT_SECRET",
  "GMAIL_OAUTH_REDIRECT_URI",
  "MAIL_ENCRYPTION_KEY",
  "CRON_SECRET",
  "NEXT_PUBLIC_APP_URL",
]

function formatError(error) {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === "object" && error) {
    return JSON.stringify(error)
  }

  return String(error)
}

async function runCheck(name, work) {
  const startedAt = performance.now()

  try {
    const details = await work()
    return {
      name,
      ok: true,
      durationMs: Math.round(performance.now() - startedAt),
      details: details ?? null,
    }
  } catch (error) {
    return {
      name,
      ok: false,
      durationMs: Math.round(performance.now() - startedAt),
      error: formatError(error),
    }
  }
}

function getOrigin(value) {
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8")
  return JSON.parse(raw)
}

async function main() {
  const context = await getValidationContext()
  await ensureValidationDirectories()
  const client = createSupabaseAdminClient(context)
  const frontendRoot = context.paths.frontendRoot
  const env = context.env

  const envChecks = await Promise.all([
    ...requiredEnvKeys.map((key) =>
      runCheck(`env:${key}`, async () => {
        const value = env[key]?.trim()
        if (!value) {
          throw new Error(`Missing required environment variable ${key}.`)
        }

        return {
          present: true,
          maskedValue:
            key.startsWith("NEXT_PUBLIC_") || key === "GMAIL_OAUTH_REDIRECT_URI"
              ? value
              : `${value.slice(0, 4)}…${value.slice(-4)}`,
        }
      })
    ),
    runCheck("env:NEXT_PUBLIC_APP_URL format", async () => {
      const value = env.NEXT_PUBLIC_APP_URL?.trim()
      const parsed = new URL(value)
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("NEXT_PUBLIC_APP_URL must use http or https.")
      }

      if (parsed.protocol !== "https:" && parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
        throw new Error("NEXT_PUBLIC_APP_URL must use https outside local development.")
      }

      return { origin: parsed.origin }
    }),
    runCheck("env:GMAIL_OAUTH_REDIRECT_URI shape", async () => {
      const value = env.GMAIL_OAUTH_REDIRECT_URI?.trim()
      const parsed = new URL(value)
      const expectedPath = "/api/mail/oauth/google/callback"
      if (parsed.pathname !== expectedPath) {
        throw new Error(`GMAIL_OAUTH_REDIRECT_URI must end with ${expectedPath}.`)
      }

      const appOrigin = getOrigin(env.NEXT_PUBLIC_APP_URL?.trim())
      if (appOrigin && parsed.origin !== appOrigin) {
        throw new Error(
          `GMAIL_OAUTH_REDIRECT_URI origin (${parsed.origin}) does not match NEXT_PUBLIC_APP_URL origin (${appOrigin}).`
        )
      }

      return { redirectUri: value }
    }),
    runCheck("env:MAIL_ENCRYPTION_KEY length", async () => {
      const value = env.MAIL_ENCRYPTION_KEY?.trim() || ""
      if (value.length < 32) {
        throw new Error("MAIL_ENCRYPTION_KEY must be at least 32 characters.")
      }

      return { length: value.length }
    }),
    runCheck("env:CRON_SECRET length", async () => {
      const value = env.CRON_SECRET?.trim() || ""
      if (value.length < 24) {
        throw new Error("CRON_SECRET should be at least 24 characters.")
      }

      return { length: value.length }
    }),
  ])

  const fileChecks = await Promise.all([
    runCheck("file:vercel.json cron", async () => {
      const vercelConfigPath = path.join(frontendRoot, "vercel.json")
      const vercelConfig = await readJson(vercelConfigPath)
      const cronPaths = Array.isArray(vercelConfig.crons)
        ? vercelConfig.crons.map((entry) => entry.path).filter(Boolean)
        : []

      if (!cronPaths.includes("/api/cron/exchange-rates?days=7")) {
        throw new Error("frontend/vercel.json is missing the exchange-rates cron path.")
      }

      return { cronPaths }
    }),
    runCheck("file:signature proxy route", async () => {
      const routePath = path.join(frontendRoot, "app", "api", "mail", "signature-image", "route.ts")
      await fs.access(routePath)
      return { routePath }
    }),
  ])

  const dbChecks = await Promise.all([
    runCheck("db:workspace_saved_views", async () => {
      const { data, error } = await client.from("workspace_saved_views").select("id").limit(1)
      if (error) throw error
      return { rows: data?.length ?? 0 }
    }),
    runCheck("db:mailboxes signature_image_url", async () => {
      const { data, error } = await client
        .from("mailboxes")
        .select("id, signature_image_url")
        .limit(1)
      if (error) throw error
      return { rows: data?.length ?? 0 }
    }),
    runCheck("db:search_quotations extended signature", async () => {
      const { data, error } = await client.rpc("search_quotations", {
        p_scope: "crm",
        p_query: null,
        p_status: null,
        p_limit: 5,
        p_offset: 0,
        p_pricing_owner_id: null,
        p_service_type: null,
        p_transport_type: null,
        p_only_mine: false,
        p_filters: {
          columnFilters: [
            {
              id: "release-status-filter",
              column: "status",
              value: "ganadas",
            },
          ],
        },
        p_sort: {
          columnId: "created_at",
          direction: "desc",
        },
      })

      if (error) {
        throw error
      }

      return {
        rows: Array.isArray(data) ? data.length : 0,
      }
    }),
  ])

  const checks = [...envChecks, ...fileChecks, ...dbChecks]
  const failures = checks.filter((item) => !item.ok)

  const payload = {
    generatedAt: isoTimestamp(),
    target: {
      kind: context.target.kind,
      projectRef: context.target.projectRef,
      protected: context.target.isProtectedRef,
    },
    failures: failures.length,
    checks,
  }

  await writeJson(
    path.join(context.paths.generatedDocsDir, "production-release-readiness.json"),
    payload
  )

  await writeText(
    path.join(context.paths.docsValidationDir, "production-release-readiness.md"),
    [
      "# Production Release Readiness",
      "",
      `Generated at: \`${payload.generatedAt}\``,
      `Target kind: \`${context.target.kind}\``,
      `Target project ref: \`${context.target.projectRef ?? "not-configured"}\``,
      `Failures: \`${failures.length}\``,
      "",
      ...checks.map((item) =>
        item.ok
          ? `- \`${item.name}\`: ok in ${item.durationMs}ms`
          : `- \`${item.name}\`: failed in ${item.durationMs}ms — ${item.error}`
      ),
      "",
    ].join("\n")
  )

  console.log(`Production release readiness completed with ${failures.length} failures.`)

  if (failures.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
