import fsp from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { spawn } from "node:child_process"

const frontendRoot = process.cwd()
const metadataPath = path.join(frontendRoot, ".playwright", "browser-server.json")
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm"
const headed = String(process.env.VALIDATION_REPO_GATE_HEADED || "").toLowerCase() === "true"

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function pathExists(targetPath) {
  try {
    await fsp.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function readMetadata() {
  if (!(await pathExists(metadataPath))) {
    return null
  }

  try {
    const raw = await fsp.readFile(metadataPath, "utf8")
    const parsed = JSON.parse(raw)
    return typeof parsed.wsEndpoint === "string" && parsed.wsEndpoint.length > 0 ? parsed : null
  } catch {
    return null
  }
}

function isProcessAlive(pid) {
  if (!pid || typeof pid !== "number") {
    return false
  }

  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

async function waitForBrowserServer(timeoutMs) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    const metadata = await readMetadata()
    if (metadata?.wsEndpoint) {
      return metadata
    }

    await delay(500)
  }

  return null
}

async function removeMetadata() {
  try {
    await fsp.rm(metadataPath, { force: true })
  } catch {
    // ignore cleanup errors
  }
}

function runCommand(command, args, extraEnv = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: frontendRoot,
      env: {
        ...process.env,
        ...extraEnv,
      },
      stdio: "inherit",
    })

    child.on("exit", (code, signal) => {
      resolve({
        code: code ?? 1,
        signal: signal ?? null,
      })
    })
  })
}

async function main() {
  const existingMetadata = await readMetadata()
  const canReuseServer = existingMetadata?.pid ? isProcessAlive(existingMetadata.pid) : false

  let startedServer = false
  let serverProcess = null
  let serverMetadata = existingMetadata

  if (!canReuseServer) {
    await removeMetadata()

    serverProcess = spawn(
      npmCommand,
      ["run", headed ? "test:e2e:server" : "test:e2e:server:headless"],
      {
        cwd: frontendRoot,
        env: process.env,
        stdio: "inherit",
      }
    )

    startedServer = true
    serverMetadata = await waitForBrowserServer(30_000)

    if (!serverMetadata?.wsEndpoint) {
      console.error("[validation:repo-gate:auto] browser server did not become ready in time.")

      if (serverProcess && !serverProcess.killed) {
        serverProcess.kill("SIGTERM")
      }

      process.exit(1)
    }
  }

  console.log(
    `[validation:repo-gate:auto] using browser server ${serverMetadata.wsEndpoint}`
  )

  const gateResult = await runCommand(
    npmCommand,
    ["run", headed ? "validation:repo-gate:headed" : "validation:repo-gate"]
  )

  if (startedServer) {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill("SIGTERM")
    }

    await delay(1000)
    await removeMetadata()
  }

  process.exit(gateResult.code)
}

await main().catch(async (error) => {
  console.error("[validation:repo-gate:auto] fatal error", error)
  await removeMetadata()
  process.exit(1)
})
