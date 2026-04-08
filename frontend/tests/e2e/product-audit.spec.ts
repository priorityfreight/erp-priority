import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test"

import {
  captureEvidence,
  hasUiCredentials,
  loginThroughUi,
  openFirstTableRecord,
  waitForWorkspaceReady,
} from "./support/erp"

async function closeDialog(page: Page) {
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
}

async function selectDialogOptionByIndex(dialog: Locator, index: number) {
  const trigger = dialog.getByRole("combobox").nth(index)
  await expect(trigger).toBeVisible()
  await trigger.click()

  const option = dialog
    .page()
    .getByRole("option")
    .filter({ hasNotText: /^Selecciona/i })
    .first()

  await expect(option).toBeVisible()
  await option.click()
}

async function seedProviderThroughUi(page: Page) {
  const seedName = `Proveedor QA ${Date.now()}`
  await page.getByRole("button", { name: /Añadir proveedor/i }).first().click()

  const dialog = page.getByRole("dialog", { name: /Añadir proveedor/i })
  await expect(dialog).toBeVisible()

  await dialog.getByPlaceholder(/Nombre comercial/i).fill(seedName)
  await selectDialogOptionByIndex(dialog, 0)
  await dialog.getByPlaceholder(/Correo de la empresa/i).scrollIntoViewIfNeeded()
  await dialog.getByPlaceholder(/Correo de la empresa/i).fill(`qa+${Date.now()}@priority.test`)
  await dialog.getByRole("button", { name: /Guardar proveedor/i }).click()

  await expect(dialog).not.toBeVisible()
  await waitForWorkspaceReady(page)
  return seedName
}

async function seedProviderOfferingThroughUi(page: Page) {
  await page.getByRole("button", { name: /Añadir servicio/i }).click()

  const dialog = page.getByRole("dialog", { name: /Añadir servicio ofrecido/i })
  await expect(dialog).toBeVisible()

  await selectDialogOptionByIndex(dialog, 0)
  await selectDialogOptionByIndex(dialog, 1)
  await dialog.getByPlaceholder(/Términos y condiciones/i).fill("Servicio seed para auditoría final de producto.")
  await dialog.getByRole("button", { name: /Guardar servicio/i }).click()

  await expect(dialog).not.toBeVisible()
}

async function openProviderWithOfferings(page: Page, testInfo: TestInfo) {
  await page.goto("/pricing/providers")
  await waitForWorkspaceReady(page)

  let rowCount = await page.locator("tbody tr").count()
  if (rowCount === 0) {
    await seedProviderThroughUi(page)
    rowCount = await page.locator("tbody tr").count()
  }

  if (rowCount === 0) {
    await captureEvidence(page, testInfo, "product-providers-empty.png")
    return false
  }

  for (let index = 0; index < rowCount; index += 1) {
    await page.locator("tbody tr").nth(index).locator("button").first().click()
    await waitForWorkspaceReady(page)

    await page.getByRole("tab", { name: /Servicios ofertados/i }).click()
    await waitForWorkspaceReady(page)

    const grid = page.locator(".priority-ag-grid .ag-root-wrapper").first()
    const rows = page.locator(".priority-ag-grid .ag-center-cols-container .ag-row")
    if ((await rows.count()) > 0 && (await grid.isVisible().catch(() => false))) {
      return true
    }

    if (await page.getByText(/No hay servicios configurados/i).isVisible().catch(() => false)) {
      await seedProviderOfferingThroughUi(page)
      await waitForWorkspaceReady(page)
      if ((await rows.count()) > 0 && (await grid.isVisible().catch(() => false))) {
        return true
      }
    }

    await page.goto("/pricing/providers")
    await waitForWorkspaceReady(page)
  }

  await captureEvidence(page, testInfo, "product-provider-offerings-empty.png")
  return false
}

async function waitForRolesWorkspace(page: Page) {
  await page.goto("/master-data/users/roles")
  await waitForWorkspaceReady(page)
  await expect(page.getByRole("tab", { name: /Acceso por recurso/i })).toBeVisible()

  const loadingLabel = page.getByText(/Cargando catálogo/i)
  if (await loadingLabel.isVisible().catch(() => false)) {
    await expect(loadingLabel).not.toBeVisible({ timeout: 15000 })
  }

  await expect
    .poll(async () => await page.locator("aside button").count(), {
      timeout: 15000,
    })
    .toBeGreaterThan(0)
}

async function ensureRolesGridHasData(page: Page) {
  const rows = page.locator(".priority-ag-grid .ag-center-cols-container .ag-row")
  if ((await rows.count()) > 0) {
    return true
  }

  const submoduleButtons = page.locator("aside button")
  const buttonCount = await submoduleButtons.count()

  for (let index = 0; index < buttonCount; index += 1) {
    await submoduleButtons.nth(index).click()
    await page.waitForTimeout(240)
    if ((await rows.count()) > 0) {
      return true
    }
  }

  return false
}

async function openFirstQuotationDetail(page: Page, testInfo: TestInfo) {
  await page.goto("/quotations")
  await expect(page.getByRole("heading", { level: 1, name: "Cotizaciones" })).toBeVisible()

  return openFirstTableRecord({
    page,
    action: async () => {
      await page.getByRole("button", { name: /Acciones de/i }).first().click()
      await page.getByRole("menuitem", { name: /Ver detalle/i }).click()
    },
    emptyEvidence: {
      testInfo,
      filename: "product-quotations-empty.png",
    },
    emptyStateMatchers: [/Sin cotizaciones/i, /Sin resultados/i],
  })
}

async function openPricingChargesWorkspace(page: Page, testInfo: TestInfo) {
  await page.goto("/pricing/quotations")
  await waitForWorkspaceReady(page)
  await captureEvidence(page, testInfo, "product-pricing-workspace-v2.png")

  const rows = page.locator("tbody tr")
  const rowCount = await rows.count()

  if (rowCount === 0) {
    await captureEvidence(page, testInfo, "product-pricing-quotations-empty.png")
    return false
  }

  for (let index = 0; index < rowCount; index += 1) {
    const chargesButton = rows.nth(index).getByRole("button", { name: /^Cargos$/i })
    if (!(await chargesButton.isVisible().catch(() => false))) {
      continue
    }

    await chargesButton.click()
    return true
  }

  await captureEvidence(page, testInfo, "product-pricing-charges-missing.png")
  return false
}

test.describe("frontend product audit", () => {
  test("unauthenticated user can inspect login shell", async ({ page }, testInfo) => {
    await page.goto("/login")
    await expect(page.getByRole("heading", { name: /Inicia sesión/i })).toBeVisible()
    await captureEvidence(page, testInfo, "product-login.png")
  })

  test.skip(!hasUiCredentials(), "UI_TEST_LOGIN y UI_TEST_PASSWORD no estan configurados.")

  test("authenticated user can inspect dashboard shell", async ({ page }, testInfo) => {
    await loginThroughUi(page)
    await expect(page.getByRole("heading", { name: /Dashboard/i })).toBeVisible()
    await captureEvidence(page, testInfo, "product-dashboard-shell.png")
  })

  test("authenticated user can inspect representative create form", async ({ page }, testInfo) => {
    await loginThroughUi(page)
    await page.goto("/opportunities")
    await page.getByRole("button", { name: /Añadir oportunidad/i }).click()
    await expect(page.getByRole("dialog").getByText(/Nueva oportunidad/i)).toBeVisible()
    await captureEvidence(page, testInfo, "product-opportunity-form.png")
    await closeDialog(page)
  })

  test("authenticated user can inspect dense admin and provider grids", async ({ page }, testInfo) => {
    await loginThroughUi(page)

    await waitForRolesWorkspace(page)
    const hasRolesData = await ensureRolesGridHasData(page)
    if (hasRolesData) {
      await captureEvidence(page, testInfo, "product-roles-grid.png")
    } else {
      await captureEvidence(page, testInfo, "product-roles-empty.png")
    }

    const openedProvider = await openProviderWithOfferings(page, testInfo)
    if (!openedProvider) {
      return
    }

    await expect(page.locator(".priority-ag-grid .ag-root-wrapper").first()).toBeVisible()
    await captureEvidence(page, testInfo, "product-provider-offerings-grid.png")
  })

  test("authenticated user can inspect quotation cargo and pricing charge grids", async ({ page }, testInfo) => {
    await loginThroughUi(page)

    const openedQuotation = await openFirstQuotationDetail(page, testInfo)
    if (openedQuotation) {
      await page.getByRole("button", { name: /Añadir detalle de carga/i }).click()
      const cargoDialog = page.getByRole("dialog", { name: /Añadir detalle de carga/i })
      await expect(cargoDialog.locator(".priority-ag-grid .ag-root-wrapper").first()).toBeVisible()
      await captureEvidence(page, testInfo, "product-cargo-grid.png")
      await closeDialog(page)
    }

    const openedPricing = await openPricingChargesWorkspace(page, testInfo)
    if (!openedPricing) {
      return
    }

    const chargesDialog = page.getByRole("dialog", { name: /Cargos de pricing/i })
    const chargeGrid = chargesDialog.locator(".priority-ag-grid .ag-root-wrapper").first()
    if (!(await chargeGrid.isVisible().catch(() => false))) {
      const activator = chargesDialog
        .locator('button:has-text("Añadir opción"), button:has-text("Editar opción"), button:has-text("Editar opcion")')
        .first()
      await expect(activator).toBeVisible()
      await activator.click()
    }

    await expect(chargesDialog.getByRole("heading", { name: /Agregar compra de proveedor/i })).toBeVisible()
    await expect(chargeGrid).toBeVisible()
    await captureEvidence(page, testInfo, "product-pricing-charge-grid.png")
  })
})
