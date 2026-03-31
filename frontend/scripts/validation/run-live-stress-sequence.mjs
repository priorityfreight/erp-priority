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
const loadLevels = ["light", "medium", "heavy", "stress"]
const executionResults = []
const retryableRateLimitPattern = /request rate limit reached|rate limit/i

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function normalizeLoadLevelCooldown(loadLevel, baseCooldownMs) {
  const multiplier =
    {
      light: 1,
      medium: 2,
      heavy: 3,
      stress: 5,
    }[loadLevel] ?? 1

  const floor =
    {
      light: baseCooldownMs,
      medium: 8_000,
      heavy: 12_000,
      stress: 20_000,
    }[loadLevel] ?? baseCooldownMs

  return Math.max(baseCooldownMs * multiplier, floor)
}

function buildResultText(result) {
  return [result.stdout, result.stderr, result.message].filter(Boolean).join("\n")
}

function shouldRetryForRateLimit(result) {
  return retryableRateLimitPattern.test(buildResultText(result))
}

async function runNodeScript(cwd, scriptPath, extraEnv = {}) {
  const startedAt = isoTimestamp()

  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath], {
      cwd,
      env: {
        ...process.env,
        ...extraEnv,
      },
    })

    return {
      ok: true,
      startedAt,
      finishedAt: isoTimestamp(),
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    }
  } catch (error) {
    return {
      ok: false,
      startedAt,
      finishedAt: isoTimestamp(),
      stdout: error.stdout?.trim?.() ?? "",
      stderr: error.stderr?.trim?.() ?? "",
      message: error.message,
      code: error.code ?? null,
    }
  }
}

async function cleanupAndAssertCleanState(cwd, suffix = null) {
  const cleanupStep = suffix ? `validation:cleanup:${suffix}` : "validation:cleanup"
  const cleanup = await runNodeScript(cwd, "scripts/validation/cleanup-live-local-test-data.mjs")
  executionResults.push({ step: cleanupStep, ...cleanup })

  if (!cleanup.ok) {
    throw new Error(`Cleanup failed${suffix ? ` (${suffix})` : ""}.`)
  }

  const cleanStateStep = suffix
    ? `validation:clean-state:${suffix}`
    : "validation:clean-state"
  const cleanState = await runNodeScript(cwd, "scripts/validation/validate-clean-state.mjs")
  executionResults.push({ step: cleanStateStep, ...cleanState })

  if (!cleanState.ok) {
    throw new Error(`Residual data detected${suffix ? ` (${suffix})` : ""}.`)
  }
}

async function runStressTier(cwd, loadLevel, baseCooldownMs, maxAttempts) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const bootstrap = await runNodeScript(cwd, "scripts/validation/bootstrap-train-session-users.mjs", {
      VALIDATION_LOAD_LEVEL: loadLevel,
    })
    executionResults.push({
      step: `validation:bootstrap-sessions:${loadLevel}:attempt-${attempt}`,
      ...bootstrap,
    })

    if (!bootstrap.ok) {
      throw new Error(`Session bootstrap failed at ${loadLevel} (attempt ${attempt}).`)
    }

    await wait(normalizeLoadLevelCooldown(loadLevel, baseCooldownMs) * attempt)

    const stressResult = await runNodeScript(cwd, "scripts/validation/run-live-stress.mjs", {
      VALIDATION_LOAD_LEVEL: loadLevel,
    })
    executionResults.push({
      step: `validation:stress:${loadLevel}:attempt-${attempt}`,
      ...stressResult,
    })

    if (stressResult.ok) {
      await cleanupAndAssertCleanState(cwd, `${loadLevel}:attempt-${attempt}`)
      return
    }

    const retryableRateLimit = shouldRetryForRateLimit(stressResult) && attempt < maxAttempts
    await cleanupAndAssertCleanState(
      cwd,
      retryableRateLimit ? `${loadLevel}:retry-${attempt}` : `${loadLevel}:failure-${attempt}`
    )

    if (!retryableRateLimit) {
      throw new Error(`Stress run failed at ${loadLevel} (attempt ${attempt}).`)
    }

    await wait(normalizeLoadLevelCooldown(loadLevel, baseCooldownMs) * (attempt + 1))
  }
}

async function writeSequenceArtifacts(context, payload) {
  await writeJson(
    path.join(context.paths.generatedDocsDir, "live-local-stress-sequence.json"),
    payload
  )
  await writeText(
    path.join(context.paths.docsValidationDir, "live-local-stress-sequence.md"),
    [
      "# Live/Local Stress Sequence",
      "",
      `Generated at: \`${payload.generatedAt}\``,
      `Target kind: \`${context.target.kind}\``,
      `Target project ref: \`${context.target.projectRef ?? "not-configured"}\``,
      ...(payload.error ? [`Error: \`${payload.error}\``, ""] : []),
      ...executionResults.map((result) => {
        const lines = [`- \`${result.step}\`: ${result.ok ? "ok" : "failed"}`]

        if (result.stdout) {
          lines.push(`  stdout: ${result.stdout}`)
        }

        if (result.stderr) {
          lines.push(`  stderr: ${result.stderr}`)
        }

        if (result.message) {
          lines.push(`  message: ${result.message}`)
        }

        return lines.join("\n")
      }),
      "",
    ].join("\n")
  )
}

async function main() {
  const context = await getValidationContext()
  await ensureValidationDirectories()

  const cwd = path.join(context.paths.repoRoot, "frontend")
  const cooldownMs = Number.parseInt(context.env.VALIDATION_SEQUENCE_COOLDOWN_MS || "5000", 10)
  const maxTierAttempts = Number.parseInt(context.env.VALIDATION_SEQUENCE_MAX_TIER_ATTEMPTS || "2", 10)

  const rollback = await runNodeScript(cwd, "scripts/validation/verify-rollback.mjs")
  executionResults.push({ step: "validation:rollback", ...rollback })

  if (!rollback.ok) {
    throw new Error("Rollback verification failed. Refusing to continue.")
  }

  const baseline = await runNodeScript(cwd, "scripts/validation/row-count-baseline.mjs")
  executionResults.push({ step: "validation:baseline", ...baseline })

  if (!baseline.ok) {
    throw new Error("Baseline capture failed. Refusing to continue.")
  }

  const smoke = await runNodeScript(cwd, "scripts/validation/run-live-readonly-smoke.mjs")
  executionResults.push({ step: "validation:smoke", ...smoke })

  if (!smoke.ok) {
    throw new Error("Readonly smoke failed. Refusing to continue.")
  }

  const breakBootstrap = await runNodeScript(cwd, "scripts/validation/bootstrap-train-session-users.mjs", {
    VALIDATION_LOAD_LEVEL: "stress",
  })
  executionResults.push({ step: "validation:bootstrap-sessions:break", ...breakBootstrap })

  if (!breakBootstrap.ok) {
    throw new Error("Session bootstrap failed before break scenarios.")
  }

  await wait(cooldownMs)

  const accessMatrix = await runNodeScript(cwd, "scripts/validation/run-live-access-matrix.mjs")
  executionResults.push({ step: "validation:access-matrix", ...accessMatrix })

  if (!accessMatrix.ok) {
    throw new Error("Access-matrix validation failed before break scenarios.")
  }

  await wait(cooldownMs)

  const fieldMasking = await runNodeScript(cwd, "scripts/validation/run-live-field-masking.mjs")
  executionResults.push({ step: "validation:field-masking", ...fieldMasking })

  if (!fieldMasking.ok) {
    throw new Error("Field-masking validation failed before break scenarios.")
  }

  await wait(cooldownMs)

  const breakScenarios = await runNodeScript(cwd, "scripts/validation/run-live-break-scenarios.mjs")
  executionResults.push({ step: "validation:break", ...breakScenarios })

  if (!breakScenarios.ok) {
    throw new Error("Break scenarios failed before stress tiers.")
  }

  await cleanupAndAssertCleanState(cwd, "post-break")

  for (const loadLevel of loadLevels) {
    await runStressTier(cwd, loadLevel, cooldownMs, maxTierAttempts)
  }

  const payload = {
    generatedAt: isoTimestamp(),
    target: {
      kind: context.target.kind,
      projectRef: context.target.projectRef,
      protected: context.target.isProtectedRef,
    },
    results: executionResults,
    completed: false,
  }

  await writeSequenceArtifacts(context, payload)

  const report = await runNodeScript(cwd, "scripts/validation/generate-final-report.mjs")
  executionResults.push({ step: "validation:report", ...report })

  payload.completed = report.ok
  await writeSequenceArtifacts(context, payload)

  if (!report.ok) {
    process.exitCode = 1
  }
}

main().catch(async (error) => {
  const context = await getValidationContext()
  await ensureValidationDirectories()
  const cwd = path.join(context.paths.repoRoot, "frontend")

  if (
    executionResults.some(
      (result) =>
        result.step.startsWith("validation:bootstrap-sessions") ||
        result.step.startsWith("validation:access-matrix") ||
        result.step.startsWith("validation:field-masking") ||
        result.step.startsWith("validation:break") ||
        result.step.startsWith("validation:stress")
    )
  ) {
    const cleanup = await runNodeScript(cwd, "scripts/validation/cleanup-live-local-test-data.mjs")
    executionResults.push({ step: "validation:cleanup:failure-path", ...cleanup })

    const postCleanup = await runNodeScript(cwd, "scripts/validation/validate-clean-state.mjs")
    executionResults.push({ step: "validation:clean-state:failure-path", ...postCleanup })
  }

  const payload = {
    generatedAt: isoTimestamp(),
    target: {
      kind: context.target.kind,
      projectRef: context.target.projectRef,
      protected: context.target.isProtectedRef,
    },
    results: executionResults,
    error: error instanceof Error ? error.message : String(error),
  }

  await writeSequenceArtifacts(context, payload)

  console.error(payload.error)
  process.exit(1)
})
