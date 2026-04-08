import { expect, test } from "@playwright/test"

import {
  captureEvidence,
  hasUiCredentials,
  loginThroughUi,
  openFirstTableRecord,
} from "./support/erp"

test.describe("frontend critical authenticated workspaces", () => {
  test.skip(!hasUiCredentials(), "UI_TEST_LOGIN y UI_TEST_PASSWORD no estan configurados.")

  test("authenticated user can inspect roles and permissions workspace", async ({ page }, testInfo) => {
    await loginThroughUi(page)
    await page.goto("/master-data/users/roles")

    await expect(page).toHaveURL(/\/master-data\/users\/roles/)
    await expect(page.getByRole("heading", { name: /Roles y permisos/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /Acceso por recurso/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /Campos sensibles/i })).toBeVisible()

    await captureEvidence(page, testInfo, "roles-permissions-workspace.png")
  })

  test("authenticated user can open client detail from clients list", async ({ page }, testInfo) => {
    await loginThroughUi(page)
    await page.goto("/clients")

    await expect(page).toHaveURL(/\/clients/)
    await expect(page.getByRole("heading", { level: 1, name: "Clientes" })).toBeVisible()

    const opened = await openFirstTableRecord({
      page,
      action: async () => {
        await page.locator('a[href^="/clients/"]').first().click()
      },
      emptyEvidence: {
        testInfo,
        filename: "clients-list-empty.png",
      },
      emptyStateMatchers: [/Sin clientes/i, /Sin resultados/i],
    })

    if (!opened) {
      return
    }

    await expect(page).toHaveURL(/\/clients\/[^/]+/)
    await expect(page.getByRole("tab", { name: /Contactos/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /Consignee y Shippers/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /Oportunidades/i })).toBeVisible()

    await captureEvidence(page, testInfo, "client-detail-workspace.png")
  })

  test("authenticated user can open provider detail from providers list", async ({ page }, testInfo) => {
    await loginThroughUi(page)
    await page.goto("/pricing/providers")

    await expect(page).toHaveURL(/\/pricing\/providers/)
    await expect(page.getByRole("heading", { level: 1, name: "Proveedores" })).toBeVisible()

    const opened = await openFirstTableRecord({
      page,
      action: async () => {
        await page.locator("tbody tr").first().locator("button").first().click()
      },
      emptyEvidence: {
        testInfo,
        filename: "providers-list-empty.png",
      },
      emptyStateMatchers: [/Sin proveedores/i, /Sin resultados/i],
    })

    if (!opened) {
      return
    }

    await expect(page).toHaveURL(/\/pricing\/providers\/[^/]+/)
    await expect(page.getByRole("tab", { name: /Perfil/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /Contactos/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /Servicios ofertados/i })).toBeVisible()

    await captureEvidence(page, testInfo, "provider-detail-workspace.png")
  })

  test("authenticated user can open quotation detail from quotations list", async ({ page }, testInfo) => {
    await loginThroughUi(page)
    await page.goto("/quotations")

    await expect(page).toHaveURL(/\/quotations/)
    await expect(page.getByRole("heading", { level: 1, name: "Cotizaciones" })).toBeVisible()

    const opened = await openFirstTableRecord({
      page,
      action: async () => {
        await page.getByRole("button", { name: /Acciones de/i }).first().click()
        await page.getByRole("menuitem", { name: /Ver detalle/i }).click()
      },
      emptyEvidence: {
        testInfo,
        filename: "quotations-list-empty.png",
      },
      emptyStateMatchers: [/Sin cotizaciones/i, /Sin resultados/i],
    })

    if (!opened) {
      return
    }

    await expect(page).toHaveURL(/\/quotations\/[^/]+$/)
    await expect(page.getByRole("tab", { name: /Resumen/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /Ruta y carga/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /Pricing \/ Sales/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /Documento comercial/i })).toBeVisible()

    await captureEvidence(page, testInfo, "quotation-detail-workspace.png")
  })
})
