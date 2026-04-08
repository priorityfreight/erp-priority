import { expect, test } from "@playwright/test"

import { captureEvidence } from "./support/erp"

test.describe("frontend unauth visual validation", () => {
  test("login screen renders correctly", async ({ page }, testInfo) => {
    await page.goto("/login")

    await expect(page.getByRole("heading", { name: /Inicia sesión/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /Entrar al ERP/i })).toBeVisible()
    await expect(page.getByText(/Acceso seguro al ERP/i)).toBeVisible()

    await captureEvidence(page, testInfo, "login-screen.png")
  })

  test("protected route redirects to login", async ({ page }, testInfo) => {
    await page.goto("/clients")

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole("heading", { name: /Inicia sesión/i })).toBeVisible()

    await captureEvidence(page, testInfo, "protected-route-redirect.png")
  })

  test("invalid login shows user-facing error", async ({ page }, testInfo) => {
    await page.goto("/login")

    await page.getByLabel(/Usuario o correo/i).fill("usuario-invalido")
    await page.getByLabel(/Contraseña/i).fill("password-invalido")
    await page.getByRole("button", { name: /Entrar al ERP/i }).click()

    await expect(page.getByText(/Usuario o contraseña incorrectos\./i)).toBeVisible()

    await captureEvidence(page, testInfo, "invalid-login-error.png")
  })
})
