import { expect, test } from "@playwright/test"

import { captureEvidence, hasUiCredentials, loginThroughUi } from "./support/erp"

test.describe("frontend authenticated smoke", () => {
  test.skip(!hasUiCredentials(), "UI_TEST_LOGIN y UI_TEST_PASSWORD no estan configurados.")

  test("authenticated user can reach dashboard shell", async ({ page }, testInfo) => {
    await loginThroughUi(page)

    await expect(page).toHaveURL(/\/($|dashboard|clients|master-data|pricing|quotations|contacts|opportunities)/)
    await expect(page.getByText(/Module/i)).toBeVisible()

    await captureEvidence(page, testInfo, "dashboard-shell.png")
  })

  test("authenticated user can open clients list", async ({ page }, testInfo) => {
    await loginThroughUi(page)
    await page.goto("/clients")

    await expect(page).toHaveURL(/\/clients/)
    await expect(page.getByText(/Clients/i).first()).toBeVisible()

    await captureEvidence(page, testInfo, "clients-list.png")
  })
})
