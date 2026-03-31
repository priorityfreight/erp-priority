import { execFile } from "node:child_process"
import { promisify } from "node:util"
import path from "node:path"
import {
  ensureValidationDirectories,
  getValidationContext,
  isoTimestamp,
  writeJson,
  writeText,
} from "./shared/config.mjs"

const execFileAsync = promisify(execFile)

async function runNodeScript(scriptPath) {
  const { stdout, stderr } = await execFileAsync("node", [scriptPath], {
    cwd: process.cwd(),
    env: process.env,
  })

  return {
    ok: true,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
  }
}

async function runNpmScript(scriptName) {
  const { stdout, stderr } = await execFileAsync("npm", ["run", scriptName], {
    cwd: process.cwd(),
    env: process.env,
    maxBuffer: 1024 * 1024 * 8,
  })

  return {
    ok: true,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
  }
}

async function safely(label, work) {
  try {
    return {
      label,
      ...(await work()),
    }
  } catch (error) {
    return {
      label,
      ok: false,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
    }
  }
}

function renderSummaryMarkdown(payload) {
  const lines = [
    "# Live/Local Current State Audit",
    "",
    `Generated at: \`${payload.generatedAt}\``,
    `Target kind: \`${payload.target.kind}\``,
    `Target project ref: \`${payload.target.projectRef ?? "not-configured"}\``,
    `Protected target: \`${payload.target.protected}\``,
    "",
    "## Executed Checks",
    "",
    ...payload.checks.map((check) => `- \`${check.label}\`: ${check.ok ? "ok" : "failed"}${check.stderr ? ` — ${check.stderr}` : ""}`),
    "",
    "## Current State Summary",
    "",
    "- Scope is limited to live/local frontend modules and their connected query modules.",
    "- Static inventory and current-state docs were regenerated from the repo.",
    "- `lint` and `build` are executed as release-readiness smoke checks.",
    "- Row-count baseline is read-only and safe even against the protected linked backend.",
    "- Stress and cleanup are implemented with hard guards and require a staging clone target.",
    "",
    "## Known Static Risk Signals",
    "",
    "- Very large live route files remain concentrated in quotation detail, pricing quotations, client detail, and provider detail.",
    "- Several live query modules still mix canonical RPC writes with direct table mutations.",
    "- Rollback-safety fallback branches remain present in live data-access paths.",
    "",
    "## Next Safe Step",
    "",
    "- Point `VALIDATION_SUPABASE_URL`, `VALIDATION_SUPABASE_SERVICE_ROLE_KEY`, and `VALIDATION_TARGET_KIND=staging-clone` to a disposable clone and then run `npm run validation:stress` followed by `npm run validation:cleanup` or destroy the clone.",
    "",
  ]

  return lines.join("\n")
}

async function main() {
  const context = await getValidationContext()
  await ensureValidationDirectories()

  const checks = []
  checks.push(
    await safely("validation:rollback", () =>
      runNodeScript(path.join(process.cwd(), "scripts/validation/verify-rollback.mjs"))
    )
  )
  checks.push(
    await safely("validation:inventory", () =>
      runNodeScript(path.join(process.cwd(), "scripts/validation/discover-live-surface.mjs"))
    )
  )
  checks.push(
    await safely("validation:baseline", () =>
      runNodeScript(path.join(process.cwd(), "scripts/validation/row-count-baseline.mjs"))
    )
  )
  checks.push(await safely("lint", () => runNpmScript("lint")))
  checks.push(await safely("build", () => runNpmScript("build")))

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
    path.join(context.paths.generatedDocsDir, "live-local-current-state-audit.json"),
    payload
  )
  await writeText(
    path.join(context.paths.docsValidationDir, "live-local-current-state.md"),
    renderSummaryMarkdown(payload)
  )

  const failed = checks.filter((item) => !item.ok)

  if (failed.length > 0) {
    process.exitCode = 1
  }

  console.log(`Live/local audit finished with ${failed.length} failed checks.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
