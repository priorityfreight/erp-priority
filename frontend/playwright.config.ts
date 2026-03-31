import fs from "node:fs"
import path from "node:path"

import { defineConfig, devices } from "@playwright/test"

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000"
const browserServerMetadataPath = path.join(__dirname, ".playwright", "browser-server.json")
const browserRuntimeHome = path.join(__dirname, ".playwright", "runtime-home")
const browserLaunchArgs = [
  "--disable-crashpad-for-testing",
  "--disable-crash-reporter",
]

function resolveBrowserEnv() {
  const home = process.env.PLAYWRIGHT_BROWSER_HOME || browserRuntimeHome

  return {
    ...process.env,
    HOME: home,
  }
}

function resolveWsEndpoint() {
  if (process.env.PLAYWRIGHT_WS_ENDPOINT) {
    return process.env.PLAYWRIGHT_WS_ENDPOINT
  }

  if (!fs.existsSync(browserServerMetadataPath)) {
    return undefined
  }

  try {
    const metadata = JSON.parse(fs.readFileSync(browserServerMetadataPath, "utf8"))
    return typeof metadata.wsEndpoint === "string" ? metadata.wsEndpoint : undefined
  } catch {
    return undefined
  }
}

function resolveChromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  }

  const browsersRoot = path.join(__dirname, "node_modules", "playwright-core", ".local-browsers")

  if (fs.existsSync(browsersRoot)) {
    const chromiumDir = fs
      .readdirSync(browsersRoot)
      .find((entry) => entry.startsWith("chromium-") && !entry.includes("headless"))

    if (chromiumDir) {
      const executablePath = path.join(
        browsersRoot,
        chromiumDir,
        "chrome-mac-arm64",
        "Google Chrome for Testing.app",
        "Contents",
        "MacOS",
        "Google Chrome for Testing",
      )

      if (fs.existsSync(executablePath)) {
        return executablePath
      }
    }
  }

  if (process.platform !== "darwin") {
    return undefined
  }

  const systemChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  return fs.existsSync(systemChrome) ? systemChrome : undefined
}

const chromiumExecutablePath = resolveChromiumExecutable()
const playwrightWsEndpoint = resolveWsEndpoint()
const browserEnv = resolveBrowserEnv()

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  outputDir: ".playwright/test-results",
  reporter: [
    ["line"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL,
    viewport: { width: 1440, height: 960 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    headless: true,
    connectOptions: playwrightWsEndpoint
      ? {
          wsEndpoint: playwrightWsEndpoint,
        }
      : undefined,
    launchOptions: playwrightWsEndpoint
      ? undefined
      : chromiumExecutablePath
      ? {
          args: browserLaunchArgs,
          env: browserEnv,
          executablePath: chromiumExecutablePath,
        }
      : undefined,
  },
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
})
