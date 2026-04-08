import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test"

import {
  captureEvidence,
  hasUiCredentials,
  loginThroughUi,
  waitForWorkspaceReady,
} from "./support/erp"

type ProcessContext = {
  clientName: string
  providerName: string
  serviceType: string
  transportType: string
  quotationId: string
}

function buildSeedContext(): ProcessContext {
  const stamp = Date.now()

  return {
    clientName: `Cliente QA Proceso ${stamp}`,
    providerName: `Proveedor QA Proceso ${stamp}`,
    serviceType: "",
    transportType: "",
    quotationId: "",
  }
}

async function closeDialog(page: Page) {
  const dialog = page.getByRole("dialog")
  if (await dialog.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
  }
}

async function searchWorkspace(page: Page, placeholder: RegExp, value: string) {
  const input = page.getByPlaceholder(placeholder).first()
  await expect(input).toBeVisible()
  await input.fill(value)
  await waitForWorkspaceReady(page)
}

async function selectComboboxOption(
  scope: Locator,
  name: RegExp,
  optionMatcher?: RegExp | string,
  fallbackIndex?: number
) {
  const namedTrigger = scope.getByRole("combobox", { name }).first()
  const indexedCombobox = fallbackIndex != null ? scope.getByRole("combobox").nth(fallbackIndex) : null
  const indexedSelectTrigger = fallbackIndex != null ? scope.locator('[data-slot="select-trigger"]').nth(fallbackIndex) : null

  let trigger = namedTrigger
  if (!(await namedTrigger.isVisible().catch(() => false))) {
    if (indexedCombobox && (await indexedCombobox.isVisible().catch(() => false))) {
      trigger = indexedCombobox
    } else if (indexedSelectTrigger) {
      trigger = indexedSelectTrigger
    }
  }

  await expect(trigger).toBeVisible()
  await trigger.scrollIntoViewIfNeeded()
  await trigger.click()

  const listbox = scope.page().getByRole("listbox").last()
  const options = (await listbox.isVisible().catch(() => false))
    ? listbox.getByRole("option")
    : scope.page().getByRole("option")
  const option = optionMatcher
    ? options.filter(typeof optionMatcher === "string" ? { hasText: optionMatcher } : { hasText: optionMatcher }).first()
    : options.filter({ hasNotText: /^Selecciona/i }).first()

  await expect(option).toBeVisible()
  const label = (await option.innerText()).trim()
  await option.click()
  return label
}

async function chooseUnlocode(scope: Locator, placeholder: RegExp, query: string) {
  const input = scope.getByPlaceholder(placeholder).first()
  await expect(input).toBeVisible()
  await input.scrollIntoViewIfNeeded()
  await input.fill(query)
  const option = scope.page().getByRole("option").first()
  await expect(option).toBeVisible({ timeout: 15000 })
  const labelText = (await option.innerText()).trim()
  await option.click()
  return labelText
}

async function chooseAnyCalendarDay(page: Page, trigger: Locator) {
  await expect(trigger).toBeVisible()
  await trigger.click()
  const calendar = page.locator('[data-slot="calendar"]').last()
  await expect(calendar).toBeVisible()
  const dayButton = calendar.locator("button[data-day]:not([disabled])").nth(14)
  await expect(dayButton).toBeVisible()
  await dayButton.click()
}

async function createClientThroughUi(page: Page, process: ProcessContext, testInfo: TestInfo) {
  await page.goto("/clients")
  await waitForWorkspaceReady(page)
  await page.getByRole("button", { name: /Añadir cliente/i }).first().click()

  const dialog = page.getByRole("dialog", { name: /Añadir cliente/i })
  await expect(dialog).toBeVisible()

  await dialog.getByPlaceholder(/Nombre de la empresa/i).fill(process.clientName)
  await dialog.getByPlaceholder(/Página web/i).fill(`https://${process.clientName.toLowerCase().replace(/\s+/g, "-")}.example.com`)
  await dialog.getByPlaceholder(/Teléfono corporativo/i).fill("8181818181")

  const ownerCombobox = dialog.getByRole("combobox", { name: /Dueño de cuenta/i }).first()
  if (await ownerCombobox.isVisible().catch(() => false)) {
    await selectComboboxOption(dialog, /Dueño de cuenta/i)
  }

  await captureEvidence(page, testInfo, "process-client-create.png")
  const saveButton = page.getByRole("button", { name: /Guardar cliente/i }).last()
  await expect(saveButton).toBeVisible()
  await saveButton.scrollIntoViewIfNeeded()
  await saveButton.click()
  await expect(dialog).toBeHidden({ timeout: 15000 }).catch(() => undefined)
  await waitForWorkspaceReady(page)

  await searchWorkspace(page, /Buscar por empresa/i, process.clientName)
  await expect(page.getByRole("link", { name: process.clientName }).first()).toBeVisible()
  await captureEvidence(page, testInfo, "process-client-created.png")
}

async function createOpportunityThroughUi(page: Page, process: ProcessContext, testInfo: TestInfo) {
  await page.goto("/opportunities")
  await waitForWorkspaceReady(page)
  await page.getByRole("button", { name: /Añadir oportunidad/i }).click()

  const dialog = page.getByRole("dialog", { name: /Añadir oportunidad/i })
  await expect(dialog).toBeVisible()

  await selectComboboxOption(dialog, /Cliente/i, process.clientName, 0)
  await selectComboboxOption(dialog, /Usuario responsable/i, undefined, 1)
  process.serviceType = await selectComboboxOption(dialog, /Tipo de servicio/i, undefined, 2)
  process.transportType = await selectComboboxOption(dialog, /Tipo de transporte/i, undefined, 3)
  await dialog.getByRole("radio", { name: /Importación/i }).click()
  await selectComboboxOption(dialog, /Incoterm/i, undefined, 4)
  await chooseUnlocode(dialog, /Buscar Origen/i, "Monterrey")
  await chooseUnlocode(dialog, /Buscar Destino/i, "Laredo")
  await dialog.getByPlaceholder(/Profit esperado/i).fill("250")
  await dialog.getByPlaceholder(/Cantidad mensual aproximada/i).fill("4")
  await dialog.getByPlaceholder(/Notas internas de la oportunidad/i).fill(
    "Workflow completo QA: oportunidad creada desde el flujo CRM para pasar a pricing."
  )

  await captureEvidence(page, testInfo, "process-opportunity-form.png")
  await dialog.getByRole("button", { name: /Guardar oportunidad/i }).click()
  await expect(dialog).toBeHidden()

  await searchWorkspace(page, /Buscar oportunidad/i, process.clientName)
  const row = page.locator("tbody tr").filter({ hasText: process.clientName }).first()
  await expect(row).toBeVisible()
  await row.getByRole("link").first().click()
  await expect(page).toHaveURL(/\/opportunities\//)
  await captureEvidence(page, testInfo, "process-opportunity-detail.png")
}

async function createQuotationAndCargo(page: Page, process: ProcessContext, testInfo: TestInfo) {
  await page.getByRole("button", { name: /^Cotizar$/i }).click()

  const dialog = page.getByRole("dialog", { name: /Crear cotizacion|Crear cotización/i })
  await expect(dialog).toBeVisible()
  await dialog.getByPlaceholder(/Dirección completa de pickup/i).fill("Bodega origen Monterrey, Nuevo León")
  await dialog.getByPlaceholder(/Dirección completa de entrega/i).fill("Warehouse destino Laredo, Texas")

  await captureEvidence(page, testInfo, "process-quotation-form.png")
  await dialog.getByRole("button", { name: /Crear cotizacion|Crear cotización/i }).click()

  await page.waitForURL(/\/quotations\//)
  process.quotationId = page.url().split("/").pop() || ""
  expect(process.quotationId).toBeTruthy()

  await page.getByRole("tab", { name: /Ruta y carga/i }).click()
  await page.getByRole("button", { name: /^Añadir detalle de carga$/i }).click()

  const cargoDialog = page.getByRole("dialog", { name: /Añadir detalle de carga/i })
  await expect(cargoDialog).toBeVisible()

  const fillCargoRow = async (
    index: number,
    values: {
      type: string
      qty: string
      length: string
      width: string
      height: string
      weight: string
      goods: string
    }
  ) => {
    await cargoDialog.locator(".priority-ag-grid select").nth(index).selectOption({ label: values.type })
    await cargoDialog.locator('input[placeholder="Cantidad"]').nth(index).fill(values.qty)
    await cargoDialog.locator('input[placeholder="Largo"]').nth(index).fill(values.length)
    await cargoDialog.locator('input[placeholder="Ancho"]').nth(index).fill(values.width)
    await cargoDialog.locator('input[placeholder="Alto"]').nth(index).fill(values.height)
    await cargoDialog.locator('input[placeholder="Peso"]').nth(index).fill(values.weight)
    await cargoDialog.locator('input[placeholder="Describe la mercancía"]').nth(index).fill(values.goods)
  }

  await fillCargoRow(0, {
    type: "Pallet",
    qty: "2",
    length: "120",
    width: "100",
    height: "150",
    weight: "450",
    goods: "Refacciones industriales paletizadas",
  })
  await cargoDialog.getByRole("button", { name: /Añadir otro tipo de carga/i }).click()
  await fillCargoRow(1, {
    type: "Box",
    qty: "8",
    length: "60",
    width: "40",
    height: "35",
    weight: "120",
    goods: "Cajas con accesorios y refacciones menores",
  })
  await cargoDialog.getByRole("button", { name: /Añadir otro tipo de carga/i }).click()
  await fillCargoRow(2, {
    type: "Crate",
    qty: "1",
    length: "180",
    width: "140",
    height: "160",
    weight: "680",
    goods: "Maquinaria embalada en crate",
  })

  await captureEvidence(page, testInfo, "process-cargo-grid.png")
  await cargoDialog.getByRole("button", { name: /Guardar detalle/i }).click()
  await expect(cargoDialog).toBeHidden()
}

async function createProviderWithOffering(page: Page, process: ProcessContext, testInfo: TestInfo) {
  await page.goto("/pricing/providers")
  await waitForWorkspaceReady(page)
  await page.getByRole("button", { name: /Añadir proveedor/i }).first().click()

  const dialog = page.getByRole("dialog", { name: /Añadir proveedor/i })
  await expect(dialog).toBeVisible()
  await dialog.getByPlaceholder(/Nombre comercial/i).fill(process.providerName)
  await selectComboboxOption(dialog, /Tipo de proveedor/i, undefined, 0)
  const activeStatusRadio = dialog.getByRole("radio", { name: /^Activo$/i }).first()
  if (await activeStatusRadio.count()) {
    await activeStatusRadio.click()
  } else {
    const activeStatusButton = dialog.getByRole("button", { name: /^Activo$/i }).first()
    if (await activeStatusButton.count()) {
      await activeStatusButton.click()
    }
  }
  await dialog.getByPlaceholder(/Teléfono corporativo/i).fill("8111111111")
  await dialog.getByPlaceholder(/Correo de la empresa/i).fill(`qa+${Date.now()}@priority.test`)
  await dialog.getByPlaceholder(/Página web/i).fill(`https://${process.providerName.toLowerCase().replace(/\s+/g, "-")}.example.com`)

  await captureEvidence(page, testInfo, "process-provider-form.png")
  await dialog.getByRole("button", { name: /Guardar proveedor/i }).click()
  await expect(dialog).toBeHidden()

  await searchWorkspace(page, /Buscar proveedor/i, process.providerName)
  const row = page.locator("tbody tr").filter({ hasText: process.providerName }).first()
  await expect(row).toBeVisible()
  await row.getByRole("button", { name: new RegExp(process.providerName, "i") }).click()
  await expect(page).toHaveURL(/\/pricing\/providers\//)

  await page.getByRole("tab", { name: /Servicios ofertados/i }).click()
  await page.getByRole("button", { name: /Añadir servicio/i }).click()

  const offeringDialog = page.getByRole("dialog", { name: /Añadir servicio ofrecido/i })
  await expect(offeringDialog).toBeVisible()
  await selectComboboxOption(offeringDialog, /Tipo de servicio/i, process.serviceType, 0)
  await selectComboboxOption(offeringDialog, /Tipo de transporte/i, process.transportType, 1)
  await offeringDialog
    .getByPlaceholder(/Términos y condiciones/i)
    .fill("QA workflow: proveedor habilitado para cotizar esta lane con respuesta por correo y WhatsApp.")

  await offeringDialog.getByRole("button", { name: /Guardar servicio/i }).click()
  await expect(offeringDialog).toBeHidden()
  await expect(page.locator(".priority-ag-grid .ag-root-wrapper").first()).toBeVisible()
  await captureEvidence(page, testInfo, "process-provider-offerings-grid.png")
}

async function takeQuotationAndBuildPricingOptions(page: Page, process: ProcessContext, testInfo: TestInfo) {
  await page.goto("/pricing/quotations")
  await waitForWorkspaceReady(page)
  await searchWorkspace(page, /Buscar cotización/i, process.clientName)

  const row = page.locator("tbody tr").filter({ hasText: process.clientName }).first()
  await expect(row).toBeVisible({ timeout: 20000 })

  const takeButton = row.getByRole("button", { name: /^Tomar$/i })
  if (await takeButton.count()) {
    await takeButton.click()
    await waitForWorkspaceReady(page)
  }

  await row.getByRole("button", { name: /^Proveedores$/i }).click()

  const providersDialog = page.getByRole("dialog", { name: /Sourcing de proveedores/i })
  await expect(providersDialog).toBeVisible()
  const providerMail = providersDialog.locator(`a[href^="mailto:"]`).first()
  await expect(providerMail).toBeVisible()
  await captureEvidence(page, testInfo, "process-provider-email-request.png")
  await closeDialog(page)

  await row.getByRole("button", { name: /^Cargos$/i }).click()

  const chargesDialog = page.getByRole("dialog", { name: /Cargos de pricing/i })
  await expect(chargesDialog).toBeVisible()

  const buildOption = async (amount: string, note: string) => {
    await chargesDialog.getByRole("button", { name: /Añadir opción/i }).click()
    await expect(chargesDialog.getByRole("heading", { name: /Agregar compra de proveedor/i })).toBeVisible()

    const gridScope = chargesDialog.locator(".priority-ag-grid").first()
    await gridScope.locator("select").nth(0).selectOption({ label: process.providerName })
    await gridScope.locator("select").nth(1).selectOption({ index: 1 })
    await gridScope.locator('input[placeholder="Compra"]').fill(amount)
    await chooseAnyCalendarDay(page, gridScope.getByRole("button", { name: /Vigencia/i }).first())
    await gridScope.locator('input[placeholder="Notas del cargo"]').fill(note)
    await chargesDialog.getByRole("button", { name: /^Guardar$/i }).click()
    await expect(chargesDialog.getByRole("heading", { name: /Agregar compra de proveedor/i })).toBeHidden()
  }

  await buildOption("1000", "Opción 1 · tarifa base de proveedor")
  await buildOption("1125", "Opción 2 · incluye ajuste por urgencia")
  await buildOption("1240", "Opción 3 · servicio premium con seguimiento")

  await captureEvidence(page, testInfo, "process-pricing-options.png")
  await chargesDialog.getByRole("button", { name: /Enviar propuesta/i }).click()
  await waitForWorkspaceReady(page)
  await closeDialog(page)
}

async function sendCommercialProposalAndRenegotiate(page: Page, process: ProcessContext, testInfo: TestInfo) {
  await page.goto(`/quotations/${process.quotationId}`)
  await waitForWorkspaceReady(page)

  await page.getByRole("tab", { name: /Pricing \/ Sales/i }).click()
  const visibilitySwitch = page.getByRole("switch", { name: /Mostrar opción al cliente/i }).first()
  await expect(visibilitySwitch).toBeVisible()
  if (!(await visibilitySwitch.isChecked())) {
    await visibilitySwitch.click()
  }

  await page.getByRole("button", { name: /Añadir venta|Editar venta/i }).first().click()
  const salesDialog = page.getByRole("dialog", { name: /Venta comercial/i })
  await expect(salesDialog).toBeVisible()
  await salesDialog.locator('input[placeholder="Venta"]').first().fill("1785")
  await captureEvidence(page, testInfo, "process-sales-modal.png")
  await salesDialog.getByRole("button", { name: /Guardar venta/i }).click()
  await expect(salesDialog).toBeHidden()

  await page.getByRole("tab", { name: /Documento comercial/i }).click()
  await captureEvidence(page, testInfo, "process-commercial-ready.png")
  await page.getByRole("button", { name: /Enviar cotización/i }).click()
  await waitForWorkspaceReady(page)
  await expect(page.getByRole("link", { name: /Abrir documento/i })).toBeVisible()

  const popupPromise = page.waitForEvent("popup")
  await page.getByRole("link", { name: /Abrir documento/i }).click()
  const pdfPage = await popupPromise
  await pdfPage.waitForLoadState("domcontentloaded")
  await expect(pdfPage).toHaveURL(/\/document\/pdf/)
  await captureEvidence(pdfPage, testInfo, "process-commercial-pdf.png")
  await pdfPage.close()

  await page.getByRole("button", { name: /^Renegociar$/i }).click()
  const statusDialog = page.getByRole("dialog", { name: /Actualizar estatus/i })
  await expect(statusDialog).toBeVisible()
  await statusDialog.getByPlaceholder(/Tarifa objetivo/i).fill("1650")
  await statusDialog
    .getByPlaceholder(/Explica el contexto comercial y el ajuste esperado/i)
    .fill("Cliente pide ajuste para cerrar hoy. Regresar con una opción más agresiva.")
  await captureEvidence(page, testInfo, "process-renegotiation-request.png")
  await statusDialog.getByRole("button", { name: /Guardar estatus/i }).click()
  await expect(statusDialog).toBeHidden()
}

async function returnRenegotiationToSales(page: Page, process: ProcessContext, testInfo: TestInfo) {
  await page.goto("/pricing/quotations")
  await waitForWorkspaceReady(page)
  await searchWorkspace(page, /Buscar cotización/i, process.clientName)

  const row = page.locator("tbody tr").filter({ hasText: process.clientName }).first()
  await expect(row).toBeVisible({ timeout: 20000 })
  await row.getByRole("button", { name: /^Cargos$/i }).click()

  const chargesDialog = page.getByRole("dialog", { name: /Cargos de pricing/i })
  await expect(chargesDialog).toBeVisible()
  await expect(chargesDialog.getByText(/Ventas solicita renegociación/i)).toBeVisible()
  await chargesDialog.getByRole("button", { name: /Editar opción/i }).first().click()
  await expect(chargesDialog.getByRole("heading", { name: /Agregar compra de proveedor/i })).toBeVisible()

  const gridScope = chargesDialog.locator(".priority-ag-grid").first()
  await gridScope.locator('input[placeholder="Compra"]').first().fill("930")
  await gridScope.locator('input[placeholder="Notas del cargo"]').first().fill(
    "Renegociación QA: proveedor ajusta tarifa para cierre comercial."
  )
  await captureEvidence(page, testInfo, "process-pricing-renegotiated.png")
  await chargesDialog.getByRole("button", { name: /^Guardar$/i }).click()
  await chargesDialog.getByRole("button", { name: /Enviar propuesta/i }).click()
  await waitForWorkspaceReady(page)
  await closeDialog(page)

  await page.goto(`/quotations/${process.quotationId}`)
  await waitForWorkspaceReady(page)
  await expect(page.getByText(/Lista para enviar/i).first()).toBeVisible()
  await captureEvidence(page, testInfo, "process-returned-to-sales.png")
}

test.describe.serial("frontend end-to-end operational process", () => {
  test.skip(!hasUiCredentials(), "UI_TEST_LOGIN y UI_TEST_PASSWORD no estan configurados.")
  test.setTimeout(300000)

  test("authenticated user can run a complete crm-pricing-sales-renegotiation process", async ({
    page,
  }, testInfo) => {
    const process = buildSeedContext()

    await loginThroughUi(page)
    await createClientThroughUi(page, process, testInfo)
    await createOpportunityThroughUi(page, process, testInfo)
    await createQuotationAndCargo(page, process, testInfo)
    await createProviderWithOffering(page, process, testInfo)
    await takeQuotationAndBuildPricingOptions(page, process, testInfo)
    await sendCommercialProposalAndRenegotiate(page, process, testInfo)
    await returnRenegotiationToSales(page, process, testInfo)
  })

  test("authenticated user can inspect the master data menu grouped by process", async ({
    page,
  }, testInfo) => {
    await loginThroughUi(page)
    await page.goto("/master-data")
    await waitForWorkspaceReady(page)

    await expect(page.getByRole("heading", { level: 2, name: /Acceso y seguridad/i })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: /Ventas y pricing/i })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: /Finanzas y referencias/i })).toBeVisible()
    await captureEvidence(page, testInfo, "process-master-data-menu.png")
  })
})
