import fs from "node:fs"
import fsp from "node:fs/promises"
import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import {
  ensureValidationDirectories,
  getValidationContext,
  isoTimestamp,
  writeJson,
  writeText,
} from "./shared/config.mjs"

const execFileAsync = promisify(execFile)
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm"
const FRONTEND_CWD = process.cwd()
const repoValidationMarkdown = "repo-gate-latest.md"
const repoValidationJson = "repo-gate-latest.json"
const requiredStoryTitles = [
  "Priority/Foundations",
  "Priority/Data Entry",
  "Priority/Tables And States",
]
const browserServerMetadataFile = path.join(FRONTEND_CWD, ".playwright", "browser-server.json")

function renderLocalTimestamp() {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Monterrey",
  }).format(new Date())
}

async function pathExists(targetPath) {
  try {
    await fsp.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function safeReadJson(filePath, fallback) {
  try {
    const raw = await fsp.readFile(filePath, "utf8")
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

async function resolveBrowserServerMetadata(env) {
  if (typeof env.PLAYWRIGHT_WS_ENDPOINT === "string" && env.PLAYWRIGHT_WS_ENDPOINT.length > 0) {
    return {
      wsEndpoint: env.PLAYWRIGHT_WS_ENDPOINT,
      launchedAt: null,
      headed: false,
      browser: "chromium",
      pid: null,
    }
  }

  const metadata = await safeReadJson(browserServerMetadataFile, null)

  if (!metadata || typeof metadata.wsEndpoint !== "string" || metadata.wsEndpoint.length === 0) {
    return null
  }

  return {
    wsEndpoint: metadata.wsEndpoint,
    launchedAt: metadata.launchedAt ?? null,
    headed: Boolean(metadata.headed),
    browser: metadata.browser ?? "chromium",
    pid: typeof metadata.pid === "number" ? metadata.pid : null,
  }
}

async function countFiles(targetPath) {
  if (!(await pathExists(targetPath))) {
    return 0
  }

  const entries = await fsp.readdir(targetPath, { recursive: true })
  return entries.length
}

async function getGitMetadata(repoRoot) {
  try {
    const [{ stdout: commitStdout }, { stdout: branchStdout }] = await Promise.all([
      execFileAsync("git", ["rev-parse", "--short", "HEAD"], { cwd: repoRoot }),
      execFileAsync("git", ["branch", "--show-current"], { cwd: repoRoot }),
    ])

    return {
      commit: commitStdout.trim() || "unknown",
      branch: branchStdout.trim() || "detached",
    }
  } catch {
    return {
      commit: "unknown",
      branch: "unknown",
    }
  }
}

function resolveChromiumExecutable(frontendRoot, env) {
  if (env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    return env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  }

  const browsersRoot = path.join(frontendRoot, "node_modules", "playwright-core", ".local-browsers")

  if (!fs.existsSync(browsersRoot)) {
    return null
  }

  const chromiumDir = fs
    .readdirSync(browsersRoot)
    .find((entry) => entry.startsWith("chromium-") && !entry.includes("headless"))

  if (!chromiumDir) {
    return null
  }

  const candidatePaths = [
    path.join(
      browsersRoot,
      chromiumDir,
      "chrome-mac-arm64",
      "Google Chrome for Testing.app",
      "Contents",
      "MacOS",
      "Google Chrome for Testing",
    ),
    path.join(
      browsersRoot,
      chromiumDir,
      "chrome-linux",
      "chrome",
    ),
    path.join(
      browsersRoot,
      chromiumDir,
      "chrome-win",
      "chrome.exe",
    ),
  ]

  const bundledChromium = candidatePaths.find((candidate) => fs.existsSync(candidate))

  if (bundledChromium) {
    return bundledChromium
  }

  if (process.platform === "darwin") {
    const systemChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    if (fs.existsSync(systemChrome)) {
      return systemChrome
    }
  }

  return null
}

function buildArtifacts(frontendRoot) {
  return {
    playwrightReport: path.join(frontendRoot, "playwright-report"),
    playwrightResults: path.join(frontendRoot, ".playwright", "test-results"),
    storybookStatic: path.join(frontendRoot, "storybook-static"),
    storybookIndex: path.join(frontendRoot, "storybook-static", "index.json"),
  }
}

async function runNpmScript(script, args = [], extraEnv = {}) {
  const startedAt = isoTimestamp()

  try {
    const npmArgs = ["run", script]
    if (args.length > 0) {
      npmArgs.push("--", ...args)
    }

    const { stdout, stderr } = await execFileAsync(npmCommand, npmArgs, {
      cwd: FRONTEND_CWD,
      env: {
        ...process.env,
        ...extraEnv,
      },
      maxBuffer: 1024 * 1024 * 20,
    })

    return {
      ok: true,
      startedAt,
      finishedAt: isoTimestamp(),
      command: `${npmCommand} ${npmArgs.join(" ")}`,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    }
  } catch (error) {
    return {
      ok: false,
      startedAt,
      finishedAt: isoTimestamp(),
      command: `${npmCommand} run ${script}${args.length ? ` -- ${args.join(" ")}` : ""}`,
      stdout: error.stdout?.trim?.() ?? "",
      stderr: error.stderr?.trim?.() ?? "",
      message: error.message,
      code: error.code ?? null,
    }
  }
}

async function verifyStorybookStories(artifacts) {
  const indexExists = await pathExists(artifacts.storybookIndex)

  if (!indexExists) {
    return {
      ok: false,
      message: "storybook-static/index.json was not generated.",
      foundTitles: [],
    }
  }

  const manifest = await safeReadJson(artifacts.storybookIndex, { entries: {} })
  const titles = Array.from(
    new Set(
      Object.values(manifest.entries || {})
        .map((entry) => entry?.title)
        .filter(Boolean)
    )
  )

  const missingTitles = requiredStoryTitles.filter((title) => !titles.includes(title))

  return {
    ok: missingTitles.length === 0,
    message:
      missingTitles.length === 0
        ? "Required Storybook review stories are present."
        : `Missing Storybook stories: ${missingTitles.join(", ")}`,
    foundTitles: titles,
    missingTitles,
  }
}

function summarizeArtifacts(artifactChecks) {
  return {
    playwrightReport: artifactChecks.playwrightReport.exists
      ? `${artifactChecks.playwrightReport.path} (${artifactChecks.playwrightReport.count} files)`
      : `${artifactChecks.playwrightReport.path} (not found)`,
    playwrightResults: artifactChecks.playwrightResults.exists
      ? `${artifactChecks.playwrightResults.path} (${artifactChecks.playwrightResults.count} files)`
      : `${artifactChecks.playwrightResults.path} (not found)`,
    storybookStatic: artifactChecks.storybookStatic.exists
      ? `${artifactChecks.storybookStatic.path} (${artifactChecks.storybookStatic.count} files)`
      : `${artifactChecks.storybookStatic.path} (not found)`,
  }
}

async function collectArtifactChecks(artifacts) {
  const [playwrightReportExists, playwrightResultsExists, storybookStaticExists] =
    await Promise.all([
      pathExists(artifacts.playwrightReport),
      pathExists(artifacts.playwrightResults),
      pathExists(artifacts.storybookStatic),
    ])

  return {
    playwrightReport: {
      path: artifacts.playwrightReport,
      exists: playwrightReportExists,
      count: playwrightReportExists ? await countFiles(artifacts.playwrightReport) : 0,
    },
    playwrightResults: {
      path: artifacts.playwrightResults,
      exists: playwrightResultsExists,
      count: playwrightResultsExists ? await countFiles(artifacts.playwrightResults) : 0,
    },
    storybookStatic: {
      path: artifacts.storybookStatic,
      exists: storybookStaticExists,
      count: storybookStaticExists ? await countFiles(artifacts.storybookStatic) : 0,
    },
  }
}

function buildMarkdownReport(payload) {
  const lines = [
    "# Repo Gate Report",
    "",
    `Generated at: \`${payload.generatedAt}\``,
    `Local time (America/Monterrey): \`${payload.generatedAtLocal}\``,
    `Decision: \`${payload.decision}\``,
    `Branch: \`${payload.git.branch}\``,
    `Commit: \`${payload.git.commit}\``,
    "",
    "## Results",
    "",
    "| Step | Status | Notes |",
    "| --- | --- | --- |",
    ...payload.steps.map((step) => {
      const note = [step.message, step.command].filter(Boolean).join(" · ")
      return `| ${step.step} | ${step.ok ? "PASS" : "FAIL"} | ${note || "—"} |`
    }),
    "",
    "## Browser Preconditions",
    "",
    `- UI credentials: \`${payload.preconditions.uiCredentials ? "configured" : "missing"}\``,
    ...(payload.preconditions.externalBrowserServer?.wsEndpoint
      ? [
          `- External browser server: \`${payload.preconditions.externalBrowserServer.wsEndpoint}\``,
          `- External browser mode: \`${payload.preconditions.externalBrowserServer.browser}\``,
        ]
      : []),
    `- Chrome executable: \`${payload.preconditions.chromeExecutable ?? "not found"}\``,
    `- Headed mode: \`${payload.preconditions.headed ? "true" : "false"}\``,
    "",
    "## Storybook Review Stories",
    "",
    ...payload.storybookReview.foundTitles.map((title) => `- ${title}`),
    ...(payload.storybookReview.missingTitles?.length
      ? ["", "Missing:", ...payload.storybookReview.missingTitles.map((title) => `- ${title}`)]
      : []),
    "",
    "## Artifacts",
    "",
    `- Playwright report: ${payload.artifacts.playwrightReport}`,
    `- Playwright results: ${payload.artifacts.playwrightResults}`,
    `- Storybook static: ${payload.artifacts.storybookStatic}`,
    "",
    "## Findings",
    "",
    ...(payload.findings.length > 0 ? payload.findings.map((finding) => `- ${finding}`) : ["- No blocking findings recorded."]),
    "",
  ]

  return lines.join("\n")
}

async function main() {
  const context = await getValidationContext()
  await ensureValidationDirectories()

  const artifacts = buildArtifacts(context.paths.frontendRoot)
  const git = await getGitMetadata(context.paths.repoRoot)
  const steps = []
  const findings = []
  const headed = String(context.env.VALIDATION_REPO_GATE_HEADED || "").toLowerCase() === "true"
  const externalBrowserServer = await resolveBrowserServerMetadata(context.env)
  const chromeExecutable = resolveChromiumExecutable(context.paths.frontendRoot, context.env)
  const uiCredentials = Boolean(context.env.UI_TEST_LOGIN && context.env.UI_TEST_PASSWORD)

  const pushStep = (step, result) => {
    steps.push({
      step,
      ok: result.ok,
      command: result.command ?? null,
      message: result.message ?? null,
      startedAt: result.startedAt ?? null,
      finishedAt: result.finishedAt ?? null,
    })

    if (!result.ok) {
      findings.push(`${step}: ${result.message || result.stderr || result.stdout || "failed"}`)
    }
  }

  const lint = await runNpmScript("lint")
  lint.message = lint.ok ? "Frontend lint passed." : "Frontend lint failed."
  pushStep("lint", lint)
  if (!lint.ok) {
    return await finalize({
      context,
      git,
      steps,
      findings,
      artifacts,
      chromeExecutable,
      externalBrowserServer,
      uiCredentials,
      headed,
      storybookReview: { ok: false, foundTitles: [], missingTitles: [], message: "Storybook was not evaluated." },
    })
  }

  const build = await runNpmScript("build")
  build.message = build.ok ? "Next.js production build passed." : "Next.js production build failed."
  pushStep("build", build)
  if (!build.ok) {
    return await finalize({
      context,
      git,
      steps,
      findings,
      artifacts,
      chromeExecutable,
      externalBrowserServer,
      uiCredentials,
      headed,
      storybookReview: { ok: false, foundTitles: [], missingTitles: [], message: "Storybook was not evaluated." },
    })
  }

  const storybookBuild = await runNpmScript("build-storybook")
  storybookBuild.message = storybookBuild.ok ? "Storybook static build passed." : "Storybook static build failed."
  pushStep("build-storybook", storybookBuild)
  let storybookReview = { ok: false, foundTitles: [], missingTitles: [], message: "Storybook build failed." }

  if (!storybookBuild.ok) {
    return await finalize({
      context,
      git,
      steps,
      findings,
      artifacts,
      chromeExecutable,
      externalBrowserServer,
      uiCredentials,
      headed,
      storybookReview,
    })
  }

  storybookReview = await verifyStorybookStories(artifacts)
  pushStep("storybook-review", {
    ok: storybookReview.ok,
    message: storybookReview.message,
  })
  if (!storybookReview.ok) {
    return await finalize({
      context,
      git,
      steps,
      findings,
      artifacts,
      chromeExecutable,
      externalBrowserServer,
      uiCredentials,
      headed,
      storybookReview,
    })
  }

  const preconditionResult = {
    ok: Boolean(uiCredentials && (externalBrowserServer?.wsEndpoint || chromeExecutable)),
    message: uiCredentials
      ? externalBrowserServer?.wsEndpoint
        ? "Browser preconditions satisfied via external Playwright browser server."
        : chromeExecutable
        ? "Browser preconditions satisfied."
        : "Chrome executable is missing."
      : "UI_TEST_LOGIN/UI_TEST_PASSWORD are missing.",
  }
  pushStep("browser-preconditions", preconditionResult)

  if (!preconditionResult.ok) {
    return await finalize({
      context,
      git,
      steps,
      findings,
      artifacts,
      chromeExecutable,
      externalBrowserServer,
      uiCredentials,
      headed,
      storybookReview,
    })
  }

  const e2eArgs = headed ? ["--headed"] : []

  const e2eCritical = await runNpmScript("test:e2e:critical", e2eArgs, {
    ...(externalBrowserServer?.wsEndpoint
      ? {
          PLAYWRIGHT_WS_ENDPOINT: externalBrowserServer.wsEndpoint,
        }
      : {
          PLAYWRIGHT_CHROMIUM_EXECUTABLE: chromeExecutable,
        }),
  })
  e2eCritical.message = e2eCritical.ok
    ? "Critical authenticated workspace suite passed."
    : "Critical authenticated workspace suite failed."
  pushStep("e2e-critical", e2eCritical)

  if (!e2eCritical.ok) {
    return await finalize({
      context,
      git,
      steps,
      findings,
      artifacts,
      chromeExecutable,
      externalBrowserServer,
      uiCredentials,
      headed,
      storybookReview,
    })
  }

  const e2eFull = await runNpmScript("test:e2e", e2eArgs, {
    ...(externalBrowserServer?.wsEndpoint
      ? {
          PLAYWRIGHT_WS_ENDPOINT: externalBrowserServer.wsEndpoint,
        }
      : {
          PLAYWRIGHT_CHROMIUM_EXECUTABLE: chromeExecutable,
        }),
  })
  e2eFull.message = e2eFull.ok
    ? "Full browser suite passed."
    : "Full browser suite failed."
  pushStep("e2e-full", e2eFull)

  return await finalize({
    context,
    git,
    steps,
    findings,
    artifacts,
    chromeExecutable,
    externalBrowserServer,
    uiCredentials,
    headed,
    storybookReview,
  })
}

async function finalize({
  context,
  git,
  steps,
  findings,
  artifacts,
  chromeExecutable,
  externalBrowserServer,
  uiCredentials,
  headed,
  storybookReview,
}) {
  const artifactChecks = await collectArtifactChecks(artifacts)
  const decision = steps.every((step) => step.ok) ? "READY_FOR_REPO" : "NOT_READY_FOR_REPO"

  if (!uiCredentials) {
    findings.push("Browser gate requires UI_TEST_LOGIN and UI_TEST_PASSWORD.")
  }

  if (!chromeExecutable && !externalBrowserServer?.wsEndpoint) {
    findings.push("Browser gate requires Chrome or PLAYWRIGHT_CHROMIUM_EXECUTABLE.")
  }

  if (!storybookReview.ok && storybookReview.message) {
    findings.push(storybookReview.message)
  }

  const payload = {
    generatedAt: isoTimestamp(),
    generatedAtLocal: renderLocalTimestamp(),
    target: {
      kind: context.target.kind,
      projectRef: context.target.projectRef,
      protected: context.target.isProtectedRef,
    },
    git,
    decision,
    preconditions: {
      uiCredentials,
      chromeExecutable,
      externalBrowserServer,
      headed,
    },
    storybookReview,
    artifacts: summarizeArtifacts(artifactChecks),
    steps,
    findings,
  }

  await writeJson(path.join(context.paths.generatedDocsDir, repoValidationJson), payload)
  await writeJson(path.join(context.paths.runtimeValidationDir, repoValidationJson), payload)
  await writeText(path.join(context.paths.docsValidationDir, repoValidationMarkdown), buildMarkdownReport(payload))

  if (decision !== "READY_FOR_REPO") {
    process.exitCode = 1
  }
}

await main().catch(async (error) => {
  console.error("[validation:repo-gate] fatal error", error)
  process.exitCode = 1
})
