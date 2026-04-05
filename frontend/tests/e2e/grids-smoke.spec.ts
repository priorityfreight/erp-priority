import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test"

import {
  captureEvidence,
  hasUiCredentials,
  loginThroughUi,
  openFirstTableRecord,
  waitForWorkspaceReady,
} from "./support/erp"

async function expectTableOrEmpty(page: Page) {
  await waitForWorkspaceReady(page)

  const grid = page.locator(".priority-ag-grid .ag-root-wrapper").first()
  if (await grid.isVisible().catch(() => false)) {
    return "grid"
  }

  const firstRow = page.locator("tbody tr").first()
  if (await firstRow.isVisible().catch(() => false)) {
    return "table"
  }

  const emptyState = page.locator('[data-slot="empty"]').first()
  if (await emptyState.isVisible().catch(() => false)) {
    return "empty"
  }

  throw new Error("No se encontro ni tabla, ni grid, ni empty state visible en el workspace.")
}

async function openProviderWithOfferings(page: Page, testInfo: TestInfo) {
  await page.goto("/pricing/providers")
  await waitForWorkspaceReady(page)

  const state = await expectTableOrEmpty(page)
  if (state === "empty") {
    const seeded = await seedProviderThroughUi(page)
    if (!seeded) {
      await captureEvidence(page, testInfo, "grids-providers-list-empty.png")
      return false
    }
  }

  const rows = page.locator("tbody tr")
  const rowCount = await rows.count()

  for (let index = 0; index < rowCount; index += 1) {
    await rows.nth(index).locator("button").first().click()
    await waitForWorkspaceReady(page)
    await page.getByRole("tab", { name: /Servicios ofertados/i }).click()
    await waitForWorkspaceReady(page)

    const offeringsGrid = page.locator(".priority-ag-grid .ag-root-wrapper").first()
    const offeringRows = page.locator(".priority-ag-grid .ag-center-cols-container .ag-row")
    const emptyOfferingsState = page.getByText(/No hay servicios configurados/i)

    if ((await offeringsGrid.isVisible().catch(() => false)) && (await offeringRows.count()) > 0) {
      return true
    }

    if (
      (await emptyOfferingsState.isVisible().catch(() => false)) ||
      ((await offeringsGrid.isVisible().catch(() => false)) && (await offeringRows.count()) === 0)
    ) {
      const seededOffering = await seedProviderOfferingThroughUi(page)
      if (seededOffering) {
        await waitForWorkspaceReady(page)
        if ((await offeringsGrid.isVisible().catch(() => false)) && (await offeringRows.count()) > 0) {
          return true
        }
      }
    }

    await page.goto("/pricing/providers")
    await waitForWorkspaceReady(page)
  }

  await captureEvidence(page, testInfo, "grids-provider-offerings-empty.png")
  return false
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
  await expect(page.getByRole("button", { name: seedName, exact: true })).toBeVisible()

  return true
}

async function seedProviderOfferingThroughUi(page: Page) {
  await page.getByRole("button", { name: /Añadir servicio/i }).click()

  const dialog = page.getByRole("dialog", { name: /Añadir servicio ofrecido/i })
  await expect(dialog).toBeVisible()

  await selectDialogOptionByIndex(dialog, 0)
  await selectDialogOptionByIndex(dialog, 1)
  await dialog.getByPlaceholder(/Términos y condiciones/i).fill("Servicio seed para auditoría visual de grids.")
  await dialog.getByRole("button", { name: /Guardar servicio/i }).click()

  await expect(dialog).not.toBeVisible()
  return true
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

async function waitForRolesWorkspace(page: Page) {
  await waitForWorkspaceReady(page)
  await expect(page.getByRole("tab", { name: /Acceso por recurso/i })).toBeVisible()

  const loadingLabel = page.getByText(/Cargando catálogo/i)
  if (await loadingLabel.isVisible().catch(() => false)) {
    await expect(loadingLabel).not.toBeVisible({ timeout: 15000 })
  }

  await expect
    .poll(async () => await page.locator("aside button").count(), {
      timeout: 15000,
      message: "Se esperaba al menos un submódulo visible en la matriz de roles.",
    })
    .toBeGreaterThan(0)
}

async function openFirstQuotationDetail(page: Page, testInfo: TestInfo) {
  await page.goto("/quotations")
  await waitForWorkspaceReady(page)

  return openFirstTableRecord({
    page,
    action: async () => {
      await page.getByRole("button", { name: /Acciones de/i }).first().click()
      await page.getByRole("menuitem", { name: /Ver detalle/i }).click()
    },
    emptyEvidence: {
      testInfo,
      filename: "grids-quotations-list-empty.png",
    },
    emptyStateMatchers: [/Sin cotizaciones/i, /Sin resultados/i],
  })
}

async function openPricingChargesWorkspace(page: Page, testInfo: TestInfo) {
  await page.goto("/pricing/quotations")
  await waitForWorkspaceReady(page)

  const state = await expectTableOrEmpty(page)
  if (state === "empty") {
    await captureEvidence(page, testInfo, "grids-pricing-quotations-empty.png")
    return false
  }

  const rows = page.locator("tbody tr")
  const rowCount = await rows.count()

  for (let index = 0; index < rowCount; index += 1) {
    const chargesButton = rows.nth(index).getByRole("button", { name: /^Cargos$/i })
    if (!(await chargesButton.isVisible().catch(() => false))) {
      continue
    }

    await chargesButton.click()
    return true
  }

  await captureEvidence(page, testInfo, "grids-pricing-quotations-no-charges-action.png")
  return false
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

test.describe("frontend grids smoke", () => {
  test.skip(!hasUiCredentials(), "UI_TEST_LOGIN y UI_TEST_PASSWORD no estan configurados.")

  test("authenticated user can inspect operational list tables", async ({ page }, testInfo) => {
    await loginThroughUi(page)

    for (const route of [
      "/clients",
      "/contacts",
      "/opportunities",
      "/quotations",
      "/pricing/providers",
      "/pricing/quotations",
    ]) {
      await page.goto(route)
      await expectTableOrEmpty(page)
    }

    await captureEvidence(page, testInfo, "grids-operational-lists.png")
  })

  test("authenticated user can inspect admin list tables", async ({ page }, testInfo) => {
    await loginThroughUi(page)

    for (const route of [
      "/master-data/users",
      "/master-data/accounting/exchange-rates",
      "/master-data/sales/accounting-concepts",
      "/master-data/sales/quotation-rejection-reasons",
      "/master-data/sales/service-types",
    ]) {
      await page.goto(route)
      await expectTableOrEmpty(page)
    }

    await captureEvidence(page, testInfo, "grids-admin-lists.png")
  })

  test("authenticated user can inspect roles and provider dense grids", async ({ page }, testInfo) => {
    await loginThroughUi(page)

    await page.goto("/master-data/users/roles")
    await waitForRolesWorkspace(page)
    const hasRolesData = await ensureRolesGridHasData(page)
    if (hasRolesData) {
      await expect(page.locator(".priority-ag-grid .ag-root-wrapper").first()).toBeVisible()
      await captureEvidence(page, testInfo, "grids-roles-route-access.png")
    } else {
      await captureEvidence(page, testInfo, "grids-roles-empty.png")
    }

    const openedProviderWithOfferings = await openProviderWithOfferings(page, testInfo)
    if (!openedProviderWithOfferings) {
      return
    }

    await expect(page.locator(".priority-ag-grid .ag-root-wrapper").first()).toBeVisible()
    await captureEvidence(page, testInfo, "grids-provider-offerings.png")
  })

  test("authenticated user can inspect quotation cargo grid", async ({ page }, testInfo) => {
    await loginThroughUi(page)

    const opened = await openFirstQuotationDetail(page, testInfo)
    if (!opened) {
      return
    }

    await page.getByRole("button", { name: /Añadir detalle de carga/i }).click()
    await expect(page.getByRole("dialog").getByText(/Detalle tabular de carga/i)).toBeVisible()
    await expect(page.getByRole("dialog").locator(".priority-ag-grid .ag-root-wrapper").first()).toBeVisible()

    await captureEvidence(page, testInfo, "grids-quotation-cargo-grid.png")
  })

  test("authenticated user can inspect pricing charge grid", async ({ page }, testInfo) => {
    await loginThroughUi(page)

    const opened = await openPricingChargesWorkspace(page, testInfo)
    if (!opened) {
      return
    }

    const chargesDialog = page.getByRole("dialog", { name: /Cargos de pricing/i })
    await expect(chargesDialog).toBeVisible()

    const chargeEditorHeading = chargesDialog.getByRole("heading", { name: /Agregar compra de proveedor/i })
    const chargeGridLabel = chargesDialog.getByText(/Captura de cargos de compra/i)
    const chargeGrid = chargesDialog.locator(".priority-ag-grid .ag-root-wrapper").first()

    if (!(await chargeGrid.isVisible().catch(() => false))) {
      const editorActivator = chargesDialog
        .locator('button:has-text("Añadir opción"), button:has-text("Editar opción"), button:has-text("Editar opcion")')
        .first()

      await expect(editorActivator).toBeVisible()
      await editorActivator.click()
    }

    await expect(chargeEditorHeading).toBeVisible()
    await expect(chargeGridLabel).toBeVisible()
    await expect(chargeGrid).toBeVisible()

    await captureEvidence(page, testInfo, "grids-pricing-charge-grid.png")
  })
})
