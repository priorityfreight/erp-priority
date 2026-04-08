import { expect, test, type Page } from "@playwright/test"

import {
  captureEvidence,
  hasUiCredentials,
  loginThroughUi,
  waitForWorkspaceReady,
} from "./support/erp"

async function openPricingWorkspace(page: Page) {
  await page.goto("/pricing/quotations")
  await waitForWorkspaceReady(page)
  await expect(page.getByRole("heading", { level: 1, name: /Cotizaciones para pricing/i })).toBeVisible()
  await expect(page.getByRole("button", { name: /Vistas/i })).toBeVisible()
}

async function closeTopDialog(page: Page) {
  const dialog = page.getByRole("dialog").last()
  await expect(dialog).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
}

async function findFirstVisibleRowButton(page: Page, buttonName: RegExp) {
  const rows = page.locator("tbody tr")
  const rowCount = await rows.count()

  for (let index = 0; index < rowCount; index += 1) {
    const button = rows.nth(index).getByRole("button", { name: buttonName })
    if (await button.isVisible().catch(() => false)) {
      return button
    }
  }

  return null
}

function laneButton(page: Page, pattern: RegExp) {
  return page.locator("button").filter({ hasText: pattern }).first()
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

async function openSavedViewsPanel(page: Page) {
  await page.getByRole("button", { name: /Vistas/i }).click()
  const panel = page.getByRole("dialog", { name: /Vistas guardadas/i })
  await expect(panel).toBeVisible()
  await expect(panel.getByRole("button", { name: /Guardar actual/i })).toBeVisible()
  return panel
}

test.describe("frontend pricing workspaces", () => {
  test.skip(!hasUiCredentials(), "UI_TEST_LOGIN y UI_TEST_PASSWORD no estan configurados.")

  test("authenticated user can inspect pricing lanes and visible CTAs", async ({ page }, testInfo) => {
    await loginThroughUi(page)
    await openPricingWorkspace(page)

    await expect(laneButton(page, /Pendientes/i)).toBeVisible()
    await expect(laneButton(page, /Cotizando/i)).toBeVisible()
    await expect(laneButton(page, /Lista para enviar/i)).toBeVisible()
    await expect(laneButton(page, /Renegociaci[óo]n/i)).toBeVisible()

    await laneButton(page, /Cotizando/i).click()
    await waitForWorkspaceReady(page)
    await captureEvidence(page, testInfo, "workspace-pricing-cotizando.png")

    const takeButton = await findFirstVisibleRowButton(page, /^Tomar$/i)
    const providersButton = await findFirstVisibleRowButton(page, /^Proveedores$/i)
    const chargesButton = await findFirstVisibleRowButton(page, /^Cargos$/i)

    if (!takeButton && !providersButton && !chargesButton) {
      await captureEvidence(page, testInfo, "workspace-pricing-no-row-ctas.png")
      await expect(page.locator("tbody tr")).toHaveCount(0)
      return
    }

    expect(takeButton || providersButton || chargesButton).toBeTruthy()
  })

  test("authenticated user can open provider and charges modals from visible row actions", async ({ page }, testInfo) => {
    await loginThroughUi(page)
    await openPricingWorkspace(page)

    let providersButton = await findFirstVisibleRowButton(page, /^Proveedores$/i)
    let chargesButton = await findFirstVisibleRowButton(page, /^Cargos$/i)

    if (!providersButton || !chargesButton) {
      await laneButton(page, /Cotizando/i).click()
      await waitForWorkspaceReady(page)
      providersButton = await findFirstVisibleRowButton(page, /^Proveedores$/i)
      chargesButton = await findFirstVisibleRowButton(page, /^Cargos$/i)
    }

    if (providersButton) {
      await providersButton.click()
      await expect(page.getByRole("dialog", { name: /Sourcing de proveedores/i })).toBeVisible()
      await captureEvidence(page, testInfo, "workspace-pricing-providers-modal.png")
      await closeTopDialog(page)
    }

    if (chargesButton) {
      await chargesButton.click()
      await expect(page.getByRole("dialog", { name: /Cargos de pricing/i })).toBeVisible()
      await captureEvidence(page, testInfo, "workspace-pricing-charges-modal.png")
      await closeTopDialog(page)
    }

    if (!providersButton && !chargesButton) {
      await captureEvidence(page, testInfo, "workspace-pricing-empty.png")
    }
  })

  test("authenticated user can save, restore and delete a pricing workspace view", async ({ page }, testInfo) => {
    await loginThroughUi(page)
    await openPricingWorkspace(page)

    const viewName = `Vista QA Pricing ${Date.now()}`

    await laneButton(page, /Renegociaci[óo]n/i).click()
    await waitForWorkspaceReady(page)

    const searchField = page.getByRole("searchbox", { name: /Buscar cotizaciones para pricing/i })
    await expect(searchField).toBeVisible()
    await searchField.fill("QA")

    const savedViewsPanel = await openSavedViewsPanel(page)
    await savedViewsPanel.getByRole("button", { name: /Guardar actual/i }).click()

    const saveDialog = page.getByRole("dialog", { name: /Guardar vista actual/i })
    await expect(saveDialog).toBeVisible()
    await saveDialog.getByPlaceholder(/Mis pendientes del d[ií]a/i).fill(viewName)
    await saveDialog.getByLabel(/Marcar como vista default/i).check()
    await saveDialog.getByRole("button", { name: /Guardar vista/i }).click()
    await expect(saveDialog).toBeHidden()

    await expect(savedViewsPanel.getByRole("button", { name: viewName, exact: true })).toBeVisible()
    await captureEvidence(page, testInfo, "workspace-pricing-saved-views.png")

    await page.reload()
    await openPricingWorkspace(page)
    await expect(page.getByText(/Vista default aplicada/i)).toBeVisible()

    const reloadedSavedViewsPanel = await openSavedViewsPanel(page)
    await expect(reloadedSavedViewsPanel.getByRole("button", { name: viewName, exact: true })).toBeVisible()
    await reloadedSavedViewsPanel
      .getByRole("button", { name: new RegExp(`^Eliminar ${escapeRegExp(viewName)}$`) })
      .click()
    await expect(
      reloadedSavedViewsPanel.getByRole("button", { name: viewName, exact: true })
    ).toHaveCount(0)
  })
})
