import { expect, test, type Page } from "@playwright/test"

import {
  captureEvidence,
  hasUiCredentials,
  loginThroughUi,
  waitForWorkspaceReady,
} from "./support/erp"

function laneButton(page: Page, pattern: RegExp) {
  return page.locator("button").filter({ hasText: pattern }).first()
}

async function openSavedViewsPanel(page: Page) {
  await page.getByRole("button", { name: /Vistas/i }).click()
  const panel = page.getByRole("dialog", { name: /Vistas guardadas/i })
  await expect(panel).toBeVisible()
  await expect(panel.getByRole("button", { name: /Guardar actual/i })).toBeVisible()
  return panel
}

test.describe("frontend kanban workspaces", () => {
  test.skip(!hasUiCredentials(), "UI_TEST_LOGIN y UI_TEST_PASSWORD no estan configurados.")

  test("authenticated user can inspect opportunities board mode", async ({ page }, testInfo) => {
    await loginThroughUi(page)
    await page.goto("/opportunities")
    await waitForWorkspaceReady(page)
    await expect(page.getByRole("heading", { level: 1, name: /Oportunidades/i })).toBeVisible()

    await page.getByRole("button", { name: /^Board$/i }).click()
    await expect(laneButton(page, /Investigando/i)).toBeVisible()
    await expect(laneButton(page, /Cotizando/i)).toBeVisible()
    await expect(laneButton(page, /Ganadas/i)).toBeVisible()

    await captureEvidence(page, testInfo, "kanban-opportunities-board.png")

    const cards = page.locator("article").filter({ has: page.getByRole("button", { name: /Abrir/i }) })
    const cardCount = await cards.count()

    if (cardCount > 0) {
      await expect(cards.first()).toBeVisible()
    } else {
      await expect(page.getByText(/No hay registros en esta etapa/i).first()).toBeVisible()
    }
  })

  test("authenticated user can persist a saved board view for opportunities", async ({ page }, testInfo) => {
    await loginThroughUi(page)
    await page.goto("/opportunities")
    await waitForWorkspaceReady(page)

    const viewName = `Vista QA Board ${Date.now()}`

    await page.getByRole("button", { name: /^Board$/i }).click()
    await laneButton(page, /Cotizando/i).click()
    await waitForWorkspaceReady(page)

    const savedViewsPanel = await openSavedViewsPanel(page)
    await savedViewsPanel.getByRole("button", { name: /Guardar actual/i }).click()

    const saveDialog = page.getByRole("dialog", { name: /Guardar vista actual/i })
    await expect(saveDialog).toBeVisible()
    await saveDialog.getByPlaceholder(/Mis pendientes del d[ií]a/i).fill(viewName)
    await saveDialog.getByRole("button", { name: /Guardar vista/i }).click()
    await expect(saveDialog).toBeHidden()

    await captureEvidence(page, testInfo, "kanban-opportunities-saved-view.png")

    await page.reload()
    await waitForWorkspaceReady(page)
    const reloadedSavedViewsPanel = await openSavedViewsPanel(page)
    await expect(reloadedSavedViewsPanel.getByRole("button", { name: viewName, exact: true })).toBeVisible()
  })

  test("authenticated user can inspect clients pipeline board mode", async ({ page }, testInfo) => {
    await loginThroughUi(page)
    await page.goto("/clients")
    await waitForWorkspaceReady(page)
    await expect(page.getByRole("heading", { level: 1, name: /Clientes/i })).toBeVisible()

    await page.getByRole("button", { name: /^Board$/i }).click()
    await expect(laneButton(page, /Prospectos/i)).toBeVisible()
    await expect(laneButton(page, /Cotizando/i)).toBeVisible()
    await expect(laneButton(page, /Clientes activos/i)).toBeVisible()

    await captureEvidence(page, testInfo, "kanban-clients-board.png")

    const cards = page.locator("article").filter({ has: page.getByRole("button", { name: /Abrir/i }) })
    const cardCount = await cards.count()

    if (cardCount > 0) {
      await expect(cards.first()).toBeVisible()
    } else {
      await expect(page.getByText(/No hay registros en esta etapa/i).first()).toBeVisible()
    }
  })
})
