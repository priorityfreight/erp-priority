import { expect, test, type Page, type TestInfo } from "@playwright/test"

import {
  captureEvidence,
  hasUiCredentials,
  loginThroughUi,
  openFirstTableRecord,
} from "./support/erp"

async function expectDialogTitle(page: Page, title: string | RegExp) {
  await expect(page.getByRole("dialog").getByText(title, { exact: typeof title === "string" })).toBeVisible()
}

async function closeDialog(page: Page) {
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
}

async function expectDialogGridVisible(page: Page) {
  const dialog = page.getByRole("dialog")
  await expect(dialog.locator(".priority-ag-grid .ag-root-wrapper").first()).toBeVisible()
}

async function openFirstClientDetail(page: Page, testInfo: TestInfo) {
  await page.goto("/clients")
  await expect(page.getByRole("heading", { level: 1, name: "Clientes" })).toBeVisible()

  return openFirstTableRecord({
    page,
    action: async () => {
      await page.locator('a[href^="/clients/"]').first().click()
    },
    emptyEvidence: {
      testInfo,
      filename: "forms-clients-list-empty.png",
    },
    emptyStateMatchers: [/Sin clientes/i, /Sin resultados/i],
  })
}

async function openFirstProviderDetail(page: Page, testInfo: TestInfo) {
  await page.goto("/pricing/providers")
  await expect(page.getByRole("heading", { level: 1, name: "Proveedores" })).toBeVisible()

  return openFirstTableRecord({
    page,
    action: async () => {
      await page.locator("tbody tr").first().locator("button").first().click()
    },
    emptyEvidence: {
      testInfo,
      filename: "forms-providers-list-empty.png",
    },
    emptyStateMatchers: [/Sin proveedores/i, /Sin resultados/i],
  })
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
      filename: "forms-quotations-list-empty.png",
    },
    emptyStateMatchers: [/Sin cotizaciones/i, /Sin resultados/i],
  })
}

async function openPricingChargesWorkspace(page: Page, testInfo: TestInfo) {
  await page.goto("/pricing/quotations")
  await expect(page.getByRole("heading", { level: 1, name: /Cotizaciones para pricing/i })).toBeVisible()

  const rows = page.locator("tbody tr")
  const rowCount = await rows.count()

  if (rowCount === 0) {
    await captureEvidence(page, testInfo, "forms-pricing-quotations-empty.png")
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

  await captureEvidence(page, testInfo, "forms-pricing-quotations-no-charges-action.png")
  return false
}

async function openFirstTab(page: Page, name: string | RegExp) {
  const tab = page.getByRole("tab", { name })
  await expect(tab).toBeVisible()
  await tab.click()
}

test.describe("frontend forms smoke", () => {
  test.skip(!hasUiCredentials(), "UI_TEST_LOGIN y UI_TEST_PASSWORD no estan configurados.")

  test("authenticated user can open CRM create forms", async ({ page }, testInfo) => {
    await loginThroughUi(page)

    await page.goto("/clients")
    await page.getByRole("button", { name: /Añadir cliente/i }).click()
    await expectDialogTitle(page, "Añadir cliente")
    await expect(page.getByRole("dialog").getByText(/Nuevo cliente/i)).toBeVisible()
    await closeDialog(page)

    await page.goto("/contacts")
    await page.getByRole("button", { name: /Añadir contacto/i }).click()
    await expectDialogTitle(page, "Añadir contacto")
    await expect(page.getByRole("dialog").getByText(/Nuevo contacto/i)).toBeVisible()
    await closeDialog(page)

    await page.goto("/opportunities")
    await page.getByRole("button", { name: /Añadir oportunidad/i }).click()
    await expectDialogTitle(page, "Añadir oportunidad")
    await expect(page.getByRole("dialog").getByText(/Nueva oportunidad/i)).toBeVisible()

    await captureEvidence(page, testInfo, "forms-crm-create.png")
  })

  test("authenticated user can open client detail forms", async ({ page }, testInfo) => {
    await loginThroughUi(page)

    const opened = await openFirstClientDetail(page, testInfo)
    if (!opened) {
      return
    }

    await openFirstTab(page, /Contactos/i)
    await page.getByRole("button", { name: /Añadir contacto/i }).click()
    await expectDialogTitle(page, "Añadir contacto")
    await expect(page.getByRole("dialog").getByText(/Nuevo contacto/i)).toBeVisible()
    await closeDialog(page)

    await openFirstTab(page, /Consignee y Shippers/i)
    await page.getByRole("button", { name: /Añadir registro/i }).click()
    await expectDialogTitle(page, /Añadir registro consignee \/ shipper/i)
    await expect(page.getByRole("dialog").getByText(/Nuevo registro logistico/i)).toBeVisible()
    await closeDialog(page)

    await openFirstTab(page, /Oportunidades/i)
    await page.getByRole("button", { name: /Añadir oportunidad/i }).click()
    await expectDialogTitle(page, "Añadir oportunidad")
    await expect(page.getByRole("dialog").getByText(/Nueva oportunidad/i)).toBeVisible()

    await captureEvidence(page, testInfo, "forms-client-detail.png")
  })

  test("authenticated user can open provider forms", async ({ page }, testInfo) => {
    await loginThroughUi(page)

    await page.goto("/pricing/providers")
    await page.getByRole("button", { name: /Añadir proveedor/i }).first().click()
    await expectDialogTitle(page, "Añadir proveedor")
    await expect(page.getByRole("dialog").getByText(/Nuevo proveedor/i)).toBeVisible()
    await closeDialog(page)

    const opened = await openFirstProviderDetail(page, testInfo)
    if (!opened) {
      return
    }

    await openFirstTab(page, /Contactos/i)
    await page.getByRole("button", { name: /Añadir contacto/i }).click()
    await expectDialogTitle(page, /Añadir contacto de proveedor/i)
    await expect(page.getByRole("dialog").getByText(/Nuevo contacto/i)).toBeVisible()
    await closeDialog(page)

    await openFirstTab(page, /Servicios ofertados/i)
    await page.getByRole("button", { name: /Añadir servicio/i }).click()
    await expectDialogTitle(page, /Añadir servicio ofrecido/i)
    await expect(page.getByRole("dialog").getByText(/Nuevo servicio/i)).toBeVisible()

    await captureEvidence(page, testInfo, "forms-provider-detail.png")
  })

  test("authenticated user can open quotation detail forms", async ({ page }, testInfo) => {
    await loginThroughUi(page)

    const opened = await openFirstQuotationDetail(page, testInfo)
    if (!opened) {
      return
    }

    await page.getByRole("button", { name: /Editar información/i }).click()
    await expectDialogTitle(page, "Editar cotización")
    await expect(page.getByRole("dialog").getByText(/Perfil de cotización/i)).toBeVisible()
    await closeDialog(page)

    const statusButton = page.getByRole("button", { name: /Actualizar estatus/i })
    if (await statusButton.isVisible().catch(() => false)) {
      await statusButton.click()
      await expectDialogTitle(page, "Actualizar estatus")
      await expect(page.getByRole("dialog").getByText(/Nuevo estatus/i)).toBeVisible()
      await closeDialog(page)
    }

    await page.getByRole("button", { name: /Añadir detalle de carga/i }).click()
    await expectDialogTitle(page, /Añadir detalle de carga/i)
    await expect(page.getByRole("dialog").getByText(/Nueva consolidación de carga/i)).toBeVisible()
    await expect(page.getByRole("dialog").getByText(/Detalle tabular de carga/i)).toBeVisible()
    await expectDialogGridVisible(page)

    await captureEvidence(page, testInfo, "forms-quotation-detail-cargo-grid.png")
  })

  test("authenticated user can open pricing charge capture form", async ({ page }, testInfo) => {
    await loginThroughUi(page)

    const opened = await openPricingChargesWorkspace(page, testInfo)
    if (!opened) {
      return
    }

    await expectDialogTitle(page, /Cargos de pricing/i)

    const addOptionButton = page.getByRole("button", { name: /Añadir opción/i })
    if (await addOptionButton.isVisible().catch(() => false)) {
      await addOptionButton.click()
      await expect(page.getByRole("dialog").getByText(/Agregar compra de proveedor/i)).toBeVisible()
    } else {
      const editOptionButton = page.getByRole("button", { name: /Editar opcion/i }).first()
      if (await editOptionButton.isVisible().catch(() => false)) {
        await editOptionButton.click()
        await expect(page.getByRole("dialog").getByText(/Editar Opcion|Editar opción|Editar Opción/i)).toBeVisible()
      }
    }

    await expect(page.getByRole("dialog").getByText(/Captura de cargos de compra/i)).toBeVisible()
    await expectDialogGridVisible(page)

    await captureEvidence(page, testInfo, "forms-pricing-charges-grid.png")
  })

  test("authenticated user can open admin and catalog forms", async ({ page }, testInfo) => {
    await loginThroughUi(page)

    await page.goto("/master-data/users")
    await page.getByRole("button", { name: /Añadir usuario/i }).click()
    await expectDialogTitle(page, "Añadir usuario")
    await expect(page.getByRole("dialog").getByRole("heading", { level: 2, name: "Perfil del usuario" })).toBeVisible()
    await closeDialog(page)

    await page.goto("/master-data/users/roles")
    await page.getByRole("button", { name: /Duplicar permisos desde/i }).click()
    await expectDialogTitle(page, /Duplicar permisos desde otro rol/i)
    await closeDialog(page)

    await page.goto("/master-data/accounting/exchange-rates")
    await page.getByRole("button", { name: /Añadir tipo de cambio/i }).click()
    await expectDialogTitle(page, /Añadir tipo de cambio/i)
    await expect(page.getByRole("dialog").getByText(/Identidad de la tasa/i)).toBeVisible()
    await closeDialog(page)

    await page.goto("/master-data/sales/accounting-concepts")
    await page.getByRole("button", { name: /Añadir concepto/i }).click()
    await expectDialogTitle(page, /Añadir concepto contable/i)
    await expect(page.getByRole("dialog").getByText(/Identidad contable/i)).toBeVisible()
    await closeDialog(page)

    await page.goto("/master-data/sales/quotation-rejection-reasons")
    await page.getByRole("button", { name: /Añadir motivo/i }).click()
    await expectDialogTitle(page, /Añadir motivo/i)
    await expect(page.getByRole("dialog").getByText(/Motivo comercial/i)).toBeVisible()

    await captureEvidence(page, testInfo, "forms-admin-catalogs.png")
  })
})
