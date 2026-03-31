import type { Page, TestInfo } from "@playwright/test"
import { expect } from "@playwright/test"

export async function captureEvidence(page: Page, testInfo: TestInfo, filename: string) {
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
  await page.getByLabel("Usuario").fill(login)
  await page.getByLabel("Contrasena").fill(password)
  await page.getByRole("button", { name: /Entrar al ERP/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith("/login"))
  await expect(page).not.toHaveURL(/\/login/)
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
