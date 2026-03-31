import fsp from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { chromium } from "playwright"

const frontendRoot = process.cwd()
const runtimeDir = path.join(frontendRoot, ".playwright")
const metadataPath = path.join(runtimeDir, "browser-server.json")
const runtimeHome = process.env.PLAYWRIGHT_BROWSER_HOME || path.join(runtimeDir, "runtime-home")
const browserLaunchArgs = [
  "--disable-crashpad-for-testing",
  "--disable-crash-reporter",
]

const headless = String(process.env.PLAYWRIGHT_BROWSER_SERVER_HEADLESS || "").toLowerCase() === "true"

let browserServer

async function writeMetadata() {
  const payload = {
    wsEndpoint: browserServer.wsEndpoint(),
    pid: browserServer.process()?.pid ?? null,
    launchedAt: new Date().toISOString(),
    headed: !headless,
    browser: "chromium",
  }

  await fsp.mkdir(runtimeDir, { recursive: true })
  await fsp.writeFile(metadataPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8")
}

async function cleanup(exitCode = 0) {
  try {
    await fsp.rm(metadataPath, { force: true })
  } catch {
    // ignore cleanup errors
  }

  try {
    await browserServer?.close()
  } catch {
    // ignore shutdown errors
  }

  process.exit(exitCode)
}

async function main() {
  await fsp.mkdir(runtimeHome, { recursive: true })

  browserServer = await chromium.launchServer({
    args: browserLaunchArgs,
    headless,
    env: {
      ...process.env,
      HOME: runtimeHome,
    },
  })

  await writeMetadata()

  console.log("[playwright-browser-server] ready")
  console.log(`wsEndpoint=${browserServer.wsEndpoint()}`)
  console.log(`metadata=${metadataPath}`)
  console.log(
    headless
      ? "[playwright-browser-server] running headless; keep this process open while validation runs."
      : "[playwright-browser-server] running headed; keep this process open while validation runs."
  )
}

process.on("SIGINT", () => {
  void cleanup(0)
})

process.on("SIGTERM", () => {
  void cleanup(0)
})

await main().catch(async (error) => {
  console.error("[playwright-browser-server] fatal error", error)
  await cleanup(1)
})
