import type { Page, TestInfo } from "@playwright/test"
import { expect } from "@playwright/test"

async function hideDevelopmentOverlays(page: Page) {
  await page
    .addStyleTag({
      content: `
        nextjs-portal,
        [data-next-badge-root],
        [data-nextjs-dialog-overlay],
        [data-nextjs-toast],
        [data-nextjs-dev-tools-button],
        button[aria-label*="Next.js Dev Tools"],
        button[aria-label*="issues overlay"],
        button[aria-label*="issues badge"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `,
    })
    .catch(() => undefined)
}

export async function captureEvidence(page: Page, testInfo: TestInfo, filename: string) {
  await hideDevelopmentOverlays(page)
  await page.screenshot({
    path: testInfo.outputPath(filename),
    fullPage: true,
  })
}

export function hasUiCredentials() {
  return Boolean(process.env.UI_TEST_LOGIN && process.env.UI_TEST_PASSWORD)
}

export async function loginThroughUi(page: Page) {
  const login = process.env.UI_TEST_LOGIN
  const password = process.env.UI_TEST_PASSWORD

  if (!login || !password) {
    throw new Error("UI_TEST_LOGIN y UI_TEST_PASSWORD son requeridos para pruebas autenticadas.")
  }

  await page.goto("/login")
  await page.getByLabel(/Usuario o correo|Usuario/i).fill(login)
  await page.getByLabel(/Contraseña|Contrasena/i).fill(password)
  await page.getByRole("button", { name: /Entrar al ERP/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith("/login"))
  await expect(page).not.toHaveURL(/\/login/)
}

export async function waitForWorkspaceReady(page: Page) {
  await page.waitForFunction(
    () => !document.querySelector('[data-slot="skeleton"]'),
    undefined,
    { timeout: 10000 }
  ).catch(() => undefined)
}

export async function openFirstTableRecord(options: {
  page: Page
  rowSelector?: string
  action: () => Promise<void>
  emptyEvidence: {
    testInfo: TestInfo
    filename: string
  }
  emptyStateMatchers?: RegExp[]
}) {
  const {
    page,
    rowSelector = "tbody tr",
    action,
    emptyEvidence,
    emptyStateMatchers = [/Sin resultados/i, /Sin .* registrados/i, /Sin .*todavia/i, /Sin cotizaciones/i],
  } = options

  await waitForWorkspaceReady(page)
  const rowCount = await page.locator(rowSelector).count()

  if (rowCount === 0) {
    for (const matcher of emptyStateMatchers) {
      const emptyState = page.getByText(matcher).first()
      if (await emptyState.isVisible().catch(() => false)) {
        await captureEvidence(page, emptyEvidence.testInfo, emptyEvidence.filename)
        return false
      }
    }

    await captureEvidence(page, emptyEvidence.testInfo, emptyEvidence.filename)
    return false
  }

  await action()
  return true
}
