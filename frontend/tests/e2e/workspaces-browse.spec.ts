import { expect, test, type Page } from "@playwright/test"

import {
  captureEvidence,
  hasUiCredentials,
  loginThroughUi,
  waitForWorkspaceReady,
} from "./support/erp"

async function openWorkspace(page: Page, url: string, heading: RegExp) {
  await page.goto(url)
  await waitForWorkspaceReady(page)
  const pageHeading = page.getByRole("heading", { level: 1, name: heading })

  if (!(await pageHeading.isVisible().catch(() => false))) {
    const fallbackLink = page.locator(`a[href="${url}"]`).first()
    if (await fallbackLink.isVisible().catch(() => false)) {
      await fallbackLink.click()
      await waitForWorkspaceReady(page)
    }
  }

  await expect(pageHeading).toBeVisible()
  await expect(page.getByRole("button", { name: /Vistas/i })).toBeVisible()
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

test.describe("frontend browse workspaces", () => {
  test.skip(!hasUiCredentials(), "UI_TEST_LOGIN y UI_TEST_PASSWORD no estan configurados.")

  test("authenticated user can inspect quotations workspace lanes and visible row actions", async ({ page }, testInfo) => {
    await loginThroughUi(page)
    await openWorkspace(page, "/quotations", /Cotizaciones/i)

    await expect(laneButton(page, /Pendientes pricing/i)).toBeVisible()
    await expect(laneButton(page, /Cotizando/i)).toBeVisible()
    await expect(laneButton(page, /Lista para enviar/i)).toBeVisible()
    await expect(laneButton(page, /Renegociaci[óo]n/i)).toBeVisible()

    await laneButton(page, /Lista para enviar/i).click()
    await waitForWorkspaceReady(page)
    await captureEvidence(page, testInfo, "workspace-quotations-lista-para-enviar.png")

    const detailButton = await findFirstVisibleRowButton(page, /^Ver detalle$/i)
    const pdfButton = await findFirstVisibleRowButton(page, /^PDF$/i)

    if (!detailButton && !pdfButton) {
      await expect(page.locator("tbody tr")).toHaveCount(0)
      return
    }

    expect(detailButton || pdfButton).toBeTruthy()
  })

  test("authenticated user can inspect opportunities workspace and open create modal", async ({ page }, testInfo) => {
    await loginThroughUi(page)
    await openWorkspace(page, "/opportunities", /Oportunidades/i)

    await expect(laneButton(page, /Investigando/i)).toBeVisible()
    await expect(laneButton(page, /Cotizando/i)).toBeVisible()
    await expect(laneButton(page, /Ganadas/i)).toBeVisible()

    await laneButton(page, /Cotizando/i).click()
    await waitForWorkspaceReady(page)
    await captureEvidence(page, testInfo, "workspace-opportunities-cotizando.png")

    const detailButton = await findFirstVisibleRowButton(page, /^Ver detalle$/i)
    const quoteButton = await findFirstVisibleRowButton(page, /^Cotizar$/i)
    expect(detailButton || quoteButton).toBeTruthy()

    await page.getByRole("button", { name: /Añadir oportunidad/i }).first().click()
    await expect(page.getByRole("dialog", { name: /Añadir oportunidad/i })).toBeVisible()
    await captureEvidence(page, testInfo, "workspace-opportunities-create-modal.png")
  })

  test("authenticated user can inspect clients workspace lanes and visible row actions", async ({ page }, testInfo) => {
    await loginThroughUi(page)
    await openWorkspace(page, "/clients", /Clientes/i)

    await expect(laneButton(page, /Prospectos/i)).toBeVisible()
    await expect(laneButton(page, /Cotizando/i)).toBeVisible()
    await expect(laneButton(page, /Clientes activos/i)).toBeVisible()

    await laneButton(page, /Clientes activos/i).click()
    await waitForWorkspaceReady(page)
    await captureEvidence(page, testInfo, "workspace-clients-activos.png")

    const detailButton = await findFirstVisibleRowButton(page, /^Ver detalle$/i)
    const opportunityButton = await findFirstVisibleRowButton(page, /^Nueva oportunidad$/i)

    if (!detailButton && !opportunityButton) {
      await expect(page.locator("tbody tr")).toHaveCount(0)
      return
    }

    expect(detailButton || opportunityButton).toBeTruthy()
  })

  test("authenticated user can inspect providers workspace lanes and visible row actions", async ({ page }, testInfo) => {
    await loginThroughUi(page)
    await openWorkspace(page, "/pricing/providers", /Proveedores/i)

    await expect(laneButton(page, /En alta/i)).toBeVisible()
    await expect(laneButton(page, /^Activos/i)).toBeVisible()
    await expect(laneButton(page, /^Inactivos/i)).toBeVisible()

    await laneButton(page, /^Activos/i).click()
    await waitForWorkspaceReady(page)
    await captureEvidence(page, testInfo, "workspace-providers-activos.png")

    const detailButton = await findFirstVisibleRowButton(page, /^Ver detalle$/i)

    if (!detailButton) {
      await expect(page.locator("tbody tr")).toHaveCount(0)
      return
    }

    expect(detailButton).toBeTruthy()
  })
})
