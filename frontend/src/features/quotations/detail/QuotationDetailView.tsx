"use client"

import { type ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { type ReactNode } from "react"
import { Modal } from "@/components/data/Modal"
import { StatusBadge } from "@/components/data/StatusBadge"
import { QuotationCargoLineForm } from "@/components/forms/QuotationCargoLineForm"
import { QuotationForm } from "@/components/forms/QuotationForm"
import { PriorityCollectionTable } from "@/components/priority/collection/PriorityCollectionTable"
import { PriorityDateField } from "@/components/priority/PriorityDateField"
import { PriorityEmptyState } from "@/components/priority/PriorityEmptyState"
import {
  PriorityFormField,
  PriorityFormSection,
  PriorityInput,
  PrioritySelectField,
  PrioritySubmitBar,
} from "@/components/priority/PriorityForm"
import { PriorityHoverPreview } from "@/components/priority/PriorityHoverPreview"
import { PriorityRowActions } from "@/components/priority/PriorityRowActions"
import { PrioritySectionAlert } from "@/components/priority/PrioritySectionAlert"
import { PriorityTypography } from "@/components/priority/PriorityTypography"
import { PriorityMetricCard, PriorityMetricStrip, PrioritySummaryRail } from "@/components/priority/PriorityWorkspace"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  buildCargoFormFromLine,
  buildMailToLink,
  buildQuotationFormValues,
  buildQuoteWhatsAppLink,
  buildStatusFormValues,
  canEditSalesOption,
  canPrepareCommercialProposal,
  canShowCommercialActions,
  canShowCommercialPricing,
  createEmptyCargoForm,
  formatCurrency,
  getPrimaryContact,
  quotationStatusOptions,
  type QuotationStatusFormValues,
} from "@/features/quotations/detail/helpers"
import { useQuotationDetailController } from "@/features/quotations/detail/useQuotationDetailController"

type QuotationDetailController = ReturnType<typeof useQuotationDetailController>

function InfoCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <PriorityTypography variant="eyebrow" className="mb-4">
        {title}
      </PriorityTypography>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
    </section>
  )
}

function InfoField({
  label,
  value,
  wide = false,
}: {
  label: string
  value: string | null | undefined
  wide?: boolean
}) {
  return (
    <div className={wide ? "sm:col-span-2 xl:col-span-4" : ""}>
      <PriorityTypography variant="fieldLabel">{label}</PriorityTypography>
      <PriorityTypography variant="body" className="mt-1 font-medium">
        {value || "No disponible"}
      </PriorityTypography>
    </div>
  )
}

export function QuotationDetailView({
  controller,
}: {
  controller: QuotationDetailController
}) {
  const {
    details,
    showEditModal,
    setShowEditModal,
    showCargoModal,
    setShowCargoModal,
    showStatusModal,
    setShowStatusModal,
    savingQuote,
    savingCargo,
    savingStatus,
    creatingBooking,
    sendingQuotation,
    markingAccepted,
    deletingCargoId,
    editingCargoId,
    setEditingCargoId,
    showSalesModal,
    setShowSalesModal,
    savingSales,
    savingOptionValidityId,
    setSelectedSalesOption,
    updatingVisibleOptionId,
    salesDraft,
    setSalesDraft,
    salesValidityDrafts,
    setSalesValidityDrafts,
    currentUserRoleName,
    createdShipment,
    confirmDialog,
    quoteFormValues,
    setQuoteFormValues,
    cargoFormRows,
    setCargoFormRows,
    statusFormValues,
    setStatusFormValues,
    chargeOptionSummaries,
    selectedSalesOptionSummary,
    resetCargoForm,
    openSalesOption,
    handleSaveQuotation,
    handleSaveCargoLine,
    handleDeleteCargoLine,
    handleSaveStatus,
    handleSaveSalesOption,
    handleSendQuotation,
    handleMarkAccepted,
    handleToggleCustomerOption,
    handleSaveSalesValidity,
    handleCreateBooking,
  } = controller

  if (!details) {
    return null
  }

  const { quotation, cargoLines, clientContacts, rejectionReasons } = details
  const canViewCost = quotation.can_view_cost ?? false
  const canViewSalePrice = quotation.can_view_sale_price ?? false
  const canEditSalePrice = quotation.can_edit_sale_price ?? false
  const canViewExpectedProfit = quotation.can_view_expected_profit ?? false
  const canSeePricingOutcome = canShowCommercialPricing(quotation.status)
  const canSeeCommercialActions = canShowCommercialActions(quotation.status)
  const canPrepareCommercial = canPrepareCommercialProposal(quotation.status)
  const canEditCommercialSale =
    canEditSalesOption(quotation.status) && canEditSalePrice
  const hasSendableOption = chargeOptionSummaries.some(
    (summary) => summary.includeInCustomerQuote && summary.hasCompleteSale
  )
  const primaryContact = getPrimaryContact(clientContacts)
  const documentHref = `/quotations/${quotation.id}/document/pdf`
  const documentUrl =
    typeof window === "undefined" ? documentHref : `${window.location.origin}${documentHref}`
  const mailToLink = buildMailToLink(quotation, primaryContact, documentUrl)
  const whatsAppLink = buildQuoteWhatsAppLink(quotation, primaryContact, documentUrl)
  const cargoColumns: ColumnDef<(typeof cargoLines)[number]>[] = [
    {
      accessorKey: "load_type",
      header: "Tipo",
      cell: ({ row }) => row.original.load_type,
    },
    {
      accessorKey: "piece_count",
      header: "Cantidad",
      cell: ({ row }) => row.original.piece_count ?? "—",
    },
    {
      id: "dimensions",
      header: "Dimensiones",
      cell: ({ row }) =>
        [row.original.width, row.original.length, row.original.height].every((value) => value != null)
          ? `${row.original.width} x ${row.original.length} x ${row.original.height} cm`
          : "No disponible",
    },
    {
      accessorKey: "weight",
      header: "Peso",
      cell: ({ row }) => (row.original.weight != null ? `${row.original.weight} kg` : "No disponible"),
    },
    {
      accessorKey: "commodities",
      header: "Commodities",
      cell: ({ row }) => row.original.commodities || "No disponible",
    },
    {
      accessorKey: "cbm",
      header: "CBM",
      cell: ({ row }) => (row.original.cbm != null ? row.original.cbm.toFixed(3) : "No disponible"),
    },
    {
      accessorKey: "volumetric_weight_kg",
      header: "KG / VOL",
      cell: ({ row }) =>
        row.original.volumetric_weight_kg != null ? row.original.volumetric_weight_kg.toFixed(2) : "No disponible",
    },
    {
      accessorKey: "freight_class",
      header: "Clase",
      cell: ({ row }) => row.original.freight_class || "No disponible",
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <PriorityRowActions
            label={`Acciones de carga ${row.original.load_type}`}
            actions={[
              {
                label: "Editar",
                onSelect: () => {
                  setEditingCargoId(row.original.id)
                  setCargoFormRows([buildCargoFormFromLine(row.original)])
                  setShowCargoModal(true)
                },
              },
              {
                label: deletingCargoId === row.original.id ? "Eliminando..." : "Eliminar",
                onSelect: () => void handleDeleteCargoLine(row.original.id),
                disabled: deletingCargoId === row.original.id,
                destructive: true,
              },
            ]}
          />
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="space-y-8">
        <PrioritySummaryRail className="xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
          <div>
            <PriorityTypography variant="eyebrow">Cotización</PriorityTypography>
            <PriorityTypography as="h2" variant="sectionTitle" className="mt-2">
              Una sola superficie para revisar ruta, carga, pricing y documento comercial.
            </PriorityTypography>
            <PriorityTypography variant="bodyMuted" className="mt-2">
              La pantalla debe responder rápido: qué se está cotizando, en qué estado está y cuál es la siguiente acción útil.
            </PriorityTypography>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[20px] border border-[rgba(11,31,59,0.08)] bg-[rgba(11,31,59,0.03)] p-4">
              <PriorityTypography variant="eyebrow">Contacto principal</PriorityTypography>
              <PriorityTypography variant="body" className="mt-2 font-medium">
                {primaryContact?.name || "Sin contacto definido"}
              </PriorityTypography>
              <PriorityTypography variant="caption" className="mt-1">
                {primaryContact?.email || "Sin correo"}
              </PriorityTypography>
            </div>
          </div>
        </PrioritySummaryRail>

        <PriorityMetricStrip className={canViewCost || canViewExpectedProfit ? "" : "xl:grid-cols-2"}>
          <PriorityMetricCard label="Cliente" value={quotation.client_name || "Sin asignar"} helper="Cuenta comercial ligada a la cotización." tone="default" className="[&_div:nth-child(2)]:text-[1.25rem] [&_div:nth-child(2)]:leading-tight" />
          <PriorityMetricCard label="Servicio" value={quotation.service_type || "No definido"} helper={quotation.transport_type || "Sin transporte definido"} tone="info" className="[&_div:nth-child(2)]:text-[1.25rem] [&_div:nth-child(2)]:leading-tight" />
          {canViewCost && quotation.status === "aceptada" ? (
            <PriorityMetricCard label="Costo estimado" value={formatCurrency(quotation.estimated_cost)} helper="Visible según permisos del rol." tone="warning" />
          ) : null}
          {canViewExpectedProfit && quotation.status === "aceptada" ? (
            <PriorityMetricCard label="Profit estimado" value={formatCurrency(quotation.expected_profit)} helper="Resultado esperado visible para el rol." tone="success" />
          ) : null}
        </PriorityMetricStrip>

        <Tabs defaultValue="overview" className="gap-5">
          <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.86)] px-4 py-3 shadow-[0_20px_40px_-34px_rgba(3,10,24,0.26)]">
            <TabsList variant="line" className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="overview">Resumen</TabsTrigger>
              <TabsTrigger value="cargo">Ruta y carga</TabsTrigger>
              <TabsTrigger value="pricing">Pricing / Sales</TabsTrigger>
              <TabsTrigger value="commercial">Documento comercial</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-8">
            <InfoCard title="Información de la cotización">
              <InfoField label="Referencia" value={quotation.reference_number} />
              <InfoField label="Cliente" value={quotation.client_name} />
              <InfoField label="Oportunidad" value={quotation.opportunity_title} />
              <InfoField label="Responsable de pricing" value={quotation.pricing_owner_name} />
              <InfoField label="Tipo de servicio" value={quotation.service_type} />
              <InfoField label="Tipo de transporte" value={quotation.transport_type} />
              <InfoField label="Tipo de operación" value={quotation.operation_type} />
              <InfoField label="Incoterm" value={quotation.incoterm_code} />
              <InfoField label="Origen" value={quotation.origin} />
              <InfoField label="Destino" value={quotation.destination} />
              <InfoField label="UN/LOCODE origen" value={quotation.origin_unlocode} />
              <InfoField label="UN/LOCODE destino" value={quotation.destination_unlocode} />
            </InfoCard>

            <InfoCard title="Ruta">
              <InfoField label="Dirección de recolección" value={quotation.pickup_address} wide />
              <InfoField label="Dirección de entrega" value={quotation.delivery_address} wide />
            </InfoCard>

            <InfoCard title="Detalles de cotización">
              <InfoField label="Fecha creada" value={quotation.created_at} />
              <InfoField label="Requerida para cotizar" value={quotation.required_quote_date} />
              <InfoField
                label="Tarifa objetivo"
                value={quotation.target_rate != null ? formatCurrency(quotation.target_rate) : null}
              />
              <InfoField label="Motivo de rechazo" value={quotation.rejection_reason} />
              <InfoField label="Notas de rechazo" value={quotation.rejection_notes} wide />
              <InfoField label="Notas de cancelación" value={quotation.cancellation_notes} wide />
            </InfoCard>
          </TabsContent>

          <TabsContent value="cargo" className="space-y-8">
            <section className="workspace-panel space-y-4 rounded-2xl p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <PriorityTypography as="h2" variant="cardTitle">
                    Información de carga
                  </PriorityTypography>
                  <PriorityTypography variant="bodyMuted" className="mt-1">
                    Captura piezas y dimensiones por renglón para copiar o registrar la información de
                    carga.
                  </PriorityTypography>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    resetCargoForm()
                    setShowCargoModal(true)
                  }}
                >
                  Añadir detalle
                </Button>
              </div>

              {cargoLines.length === 0 ? (
                <PriorityEmptyState
                  title="Sin detalles de carga"
                  description="Todavía no hay detalles de carga registrados para esta cotización."
                />
              ) : (
                <PriorityCollectionTable
                  columns={cargoColumns}
                  data={cargoLines}
                  emptyTitle="Sin detalles de carga"
                  emptyDescription="Todavía no hay detalles de carga registrados para esta cotización."
                />
              )}
            </section>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-8">
            <section className="workspace-panel space-y-4 rounded-2xl p-5">
          <div>
            <PriorityTypography as="h2" variant="cardTitle">
              Costos
            </PriorityTypography>
            <PriorityTypography variant="bodyMuted" className="mt-1">
              Opciones de costo preparadas para esta cotización.
            </PriorityTypography>
          </div>

          {canSeePricingOutcome ? (
            <div>
              <section className="space-y-4 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-5">
                <div>
                  <PriorityTypography as="h3" variant="cardTitle">
                    Opciones de costo
                  </PriorityTypography>
                  <PriorityTypography variant="bodyMuted" className="mt-1">
                    Pricing captura una o varias opciones de compra y CRM decide cuales se
                    presentan al cliente.
                  </PriorityTypography>
                </div>

                {chargeOptionSummaries.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {chargeOptionSummaries.map((summary) => (
                      <div
                        key={summary.optionId}
                        className="rounded-xl border border-[#E5E7EB] bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                              {summary.optionLabel}
                            </div>
                            <div className="mt-1 text-xs text-[#64748B]">
                              {summary.lines.length} concepto(s)
                            </div>
                          </div>
                          {canEditCommercialSale ? (
                            <div className="flex items-center gap-3 rounded-2xl border border-[rgba(11,31,59,0.08)] bg-[rgba(11,31,59,0.03)] px-3 py-2">
                              <div className="text-right">
                                <div className="text-xs font-semibold text-[#334155]">
                                  Mostrar al cliente
                                </div>
                                <div className="text-[11px] text-[#64748B]">
                                  {summary.includeInCustomerQuote ? "Visible en propuesta" : "Solo uso interno"}
                                </div>
                              </div>
                              <Switch
                                checked={summary.includeInCustomerQuote}
                                disabled={updatingVisibleOptionId === summary.optionId}
                                onCheckedChange={() => void handleToggleCustomerOption(summary)}
                                aria-label="Mostrar opción al cliente"
                              />
                            </div>
                          ) : (
                            <div className="text-xs text-[#64748B]">
                              {summary.includeInCustomerQuote
                                ? "Visible al cliente"
                                : "Oculta al cliente"}
                            </div>
                          )}
                        </div>
                        {canViewCost ? (
                          <div className="mt-2 text-lg font-semibold text-[#111827]">
                            {formatCurrency(summary.totalPurchaseMxn)}
                          </div>
                        ) : null}
                        <div className="mt-1 text-sm text-[#6B7280]">
                          Vigencia compra: {summary.purchaseValidUntil || "No disponible"}
                        </div>
                        <div className="mt-1 text-sm text-[#6B7280]">
                          Vigencia venta: {summary.salesValidUntil || "No disponible"}
                        </div>
                        {summary.salesValidityOverridden ? (
                          <div className="mt-1 text-xs font-medium text-[#7C2D12]">
                            Vigencia de venta ajustada manualmente por Admin
                          </div>
                        ) : null}
                        <div className="mt-1 text-sm text-[#6B7280]">
                          Proveedores:{" "}
                          {summary.providers.size > 0
                            ? Array.from(summary.providers).join(", ")
                            : "Sin proveedor"}
                        </div>
                        {canViewSalePrice ? (
                          <div className="mt-1 text-sm text-[#6B7280]">
                            Subtotal venta MXN: {formatCurrency(summary.totalSaleMxn)}
                          </div>
                        ) : null}
                        {canViewExpectedProfit ? (
                          <div className="mt-1 text-sm text-[#6B7280]">
                            Profit MXN: {formatCurrency(summary.totalProfitMxn)}
                          </div>
                        ) : null}
                        {canViewSalePrice ? (
                          <div className="mt-1 text-sm text-[#6B7280]">
                            Total con IVA MXN:{" "}
                            {formatCurrency(
                              summary.lines.reduce(
                                (sum, line) =>
                                  sum +
                                  ((line.sale_amount_mxn ?? line.sale_amount ?? 0) *
                                    (1 + (line.vat_rate ?? 0) / 100)),
                                0
                              )
                            )}
                          </div>
                        ) : null}
                        {currentUserRoleName === "Admin" ? (
                          <div className="mt-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                              Override de vigencia de venta
                            </div>
                            <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                              <PriorityDateField
                                value={salesValidityDrafts[summary.optionId] ?? ""}
                                onChange={(value) =>
                                  setSalesValidityDrafts((current) => ({
                                    ...current,
                                    [summary.optionId]: value,
                                  }))
                                }
                              />
                              <Button
                                type="button"
                                onClick={() => void handleSaveSalesValidity(summary)}
                                disabled={savingOptionValidityId === summary.optionId}
                              >
                                {savingOptionValidityId === summary.optionId
                                  ? "Guardando…"
                                  : "Guardar vigencia"}
                              </Button>
                            </div>
                            <div className="mt-2 text-xs text-[#64748B]">
                              Si no se ajusta manualmente, la vigencia de venta replica la vigencia
                              de compra.
                            </div>
                          </div>
                        ) : null}
                        {canEditCommercialSale ? (
                          <div className="mt-3">
                            <Button type="button" variant="outline" onClick={() => openSalesOption(summary)}>
                              {summary.hasCompleteSale ? "Editar venta" : "Añadir venta"}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#6B7280]">
                    Pricing todavía no ha cargado opciones de costo para esta cotización.
                  </p>
                )}
              </section>
            </div>
          ) : (
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-4 text-sm text-[#475569]">
              Los costos aparecerán aquí cuando Pricing tome la cotización y capture sus opciones.
            </div>
          )}
            </section>
          </TabsContent>

          <TabsContent value="commercial" className="space-y-8">
            <section className="workspace-panel rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <PriorityTypography as="h2" variant="cardTitle">
                  Seguimiento comercial
                </PriorityTypography>
                <PriorityTypography variant="bodyMuted" className="mt-1">
                  {canSeeCommercialActions
                    ? "Genera el documento comercial y compártelo con el contacto principal del cliente."
                    : canPrepareCommercial
                      ? "Pricing ya devolvió opciones. Agrega la venta por opción y luego envía la cotización al cliente."
                      : "Esta cotización sigue en captura interna o en pricing. Las acciones comerciales se habilitan cuando pricing devuelve la propuesta."}
                </PriorityTypography>
              </div>
              <StatusBadge status={quotation.status} />
            </div>

            {canSeeCommercialActions ? (
              <ResizablePanelGroup orientation="horizontal" className="mt-5 hidden gap-4 md:flex">
                <ResizablePanel defaultSize={40} minSize={30}>
                  <div className="h-full rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                    <PriorityTypography variant="eyebrow">Contacto principal</PriorityTypography>
                    <div className="mt-2">
                      <PriorityHoverPreview
                        eyebrow="Contacto comercial"
                        title={primaryContact?.name || "No disponible"}
                        description="Destino principal para el envio de la propuesta."
                        lines={[
                          { label: "Correo", value: primaryContact?.email || "Sin correo" },
                          { label: "Teléfono", value: primaryContact?.phone || "Sin teléfono" },
                        ]}
                        trigger={
                          <div className="cursor-default">
                            <PriorityTypography variant="body" className="font-semibold">
                              {primaryContact?.name || "No disponible"}
                            </PriorityTypography>
                            <PriorityTypography variant="bodyMuted" className="mt-1">
                              {primaryContact?.email || "Sin correo"}
                            </PriorityTypography>
                            <PriorityTypography variant="bodyMuted">
                              {primaryContact?.phone || "Sin teléfono"}
                            </PriorityTypography>
                          </div>
                        }
                      />
                    </div>
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle className="bg-transparent" />
                <ResizablePanel defaultSize={60} minSize={40}>
                  <div className="h-full rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                    <PriorityTypography variant="eyebrow">Documento comercial</PriorityTypography>
                    <PriorityTypography variant="bodyMuted" className="mt-2">
                      El documento excluye proveedor y monto compra para vista cliente.
                    </PriorityTypography>
                    <ButtonGroup className="mt-4 flex flex-wrap items-center gap-2 bg-transparent p-0">
                      <Button asChild type="button">
                        <Link href={documentHref} target="_blank">
                          Abrir documento
                        </Link>
                      </Button>
                      {mailToLink ? (
                        <Button asChild type="button" variant="outline">
                          <a href={mailToLink}>Enviar por correo</a>
                        </Button>
                      ) : null}
                      {whatsAppLink ? (
                        <Button asChild type="button" variant="secondary">
                          <a href={whatsAppLink} target="_blank" rel="noreferrer">
                            Enviar por WhatsApp
                          </a>
                        </Button>
                      ) : null}
                    </ButtonGroup>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            ) : canPrepareCommercial ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                    Contacto principal
                  </div>
                  <div className="mt-2 text-sm font-medium text-[#111827]">
                    {primaryContact?.name || "No disponible"}
                  </div>
                  <div className="mt-1 text-sm text-[#475569]">
                    {primaryContact?.email || "Sin correo"}
                  </div>
                  <div className="mt-1 text-sm text-[#475569]">
                    {primaryContact?.phone || "Sin teléfono"}
                  </div>
                </div>

                <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                    Salida comercial
                  </div>
                  <div className="mt-2 text-sm text-[#475569]">
                    La cotización puede enviarse cuando al menos una opción tenga venta completa.
                  </div>
                  <ButtonGroup className="mt-4 flex flex-wrap gap-2 bg-transparent p-0">
                    <Button
                      type="button"
                      onClick={() => void handleSendQuotation(documentHref)}
                      disabled={sendingQuotation || !hasSendableOption || !canEditSalePrice}
                    >
                      {sendingQuotation ? "Enviando…" : "Enviar cotización"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setStatusFormValues({
                          ...buildStatusFormValues(quotation),
                          status: "renegociar_tarifa",
                          rejectionReasonId: "",
                          cancellationNotes: "",
                        })
                        setShowStatusModal(true)
                      }}
                      variant="outline"
                    >
                      Preparar renegociación
                    </Button>
                  </ButtonGroup>
                  {!canEditSalePrice ? (
                    <div className="mt-3 text-sm text-[#92400E]">
                      Tu rol no tiene permiso para capturar venta o enviar esta cotización al
                      cliente.
                    </div>
                  ) : !hasSendableOption ? (
                    <div className="mt-3 text-sm text-[#92400E]">
                      Aún no hay una opción con venta capturada para enviar al cliente.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-4 text-sm text-[#475569]">
                Cuando la cotización quede{" "}
                <span className="font-medium text-[#111827]">lista para enviar</span>, aqui podras
                revisar las opciones preparadas por pricing y continuar con la salida comercial.
              </div>
            )}

            {createdShipment ? (
              <div className="mt-4 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3 text-sm text-[#065F46]">
                Booking generado correctamente: {createdShipment.shipment_reference || createdShipment.id}
              </div>
            ) : null}

            <ButtonGroup className="mt-4 flex flex-wrap gap-2 bg-transparent p-0">
              {quotation.status === "enviada" ? (
                <Button
                  type="button"
                  onClick={() => void handleMarkAccepted()}
                  disabled={markingAccepted}
                >
                  {markingAccepted ? "Actualizando…" : "Marcar aceptada"}
                </Button>
              ) : null}
              <Button
                type="button"
                onClick={() => void handleCreateBooking()}
                disabled={creatingBooking || quotation.status !== "aceptada"}
              >
                {creatingBooking ? "Creando booking…" : "Convertir a booking"}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setStatusFormValues({
                    ...buildStatusFormValues(quotation),
                    status: "renegociar_tarifa",
                    rejectionReasonId: "",
                    cancellationNotes: "",
                  })
                  setShowStatusModal(true)
                }}
                variant="outline"
              >
                Renegociar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setStatusFormValues({
                    ...buildStatusFormValues(quotation),
                    status: "rechazada",
                    cancellationNotes: "",
                  })
                  setShowStatusModal(true)
                }}
                variant="destructive"
              >
                Rechazada
              </Button>
            </ButtonGroup>
            </section>
          </TabsContent>
        </Tabs>
      </div>

      {showSalesModal && selectedSalesOptionSummary && canEditSalePrice ? (
        <Modal
          title={`Venta comercial · ${selectedSalesOptionSummary.optionLabel}`}
          description="Ventas define la propuesta comercial por opcion sin modificar la compra capturada por pricing."
          size="workspace"
          onClose={() => {
            setShowSalesModal(false)
            setSelectedSalesOption(null)
            setSalesDraft({})
          }}
        >
          <div className="space-y-5">
            <PrioritySectionAlert title="Objetivo del bloque" variant="info">
              Define la venta por concepto sin alterar la compra ya capturada por pricing. Guarda primero la opción y luego continúa con el envío al cliente.
            </PrioritySectionAlert>

            <PriorityFormSection
              title="Resumen de la opción"
              description="Verifica proveedor, vigencias y base de compra antes de capturar la venta."
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Proveedor / opción
                </div>
                <div className="mt-1 text-sm font-medium text-[#111827]">
                  {selectedSalesOptionSummary.optionLabel}
                </div>
                <div className="mt-1 text-xs text-[#64748B]">
                  {selectedSalesOptionSummary.includeInCustomerQuote
                    ? "Visible al cliente"
                    : "Oculta al cliente"}
                </div>
              </div>
              {canViewCost ? (
                <div className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                    Compra total MXN
                  </div>
                  <div className="mt-1 text-sm font-medium text-[#111827]">
                    {formatCurrency(selectedSalesOptionSummary.totalPurchaseMxn)}
                  </div>
                </div>
              ) : null}
              <div className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Proveedores
                </div>
                <div className="mt-1 text-sm font-medium text-[#111827]">
                  {selectedSalesOptionSummary.providers.size > 0
                    ? Array.from(selectedSalesOptionSummary.providers).join(", ")
                    : "Sin proveedor"}
                </div>
              </div>
              <div className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Vigencia compra
                </div>
                <div className="mt-1 text-sm font-medium text-[#111827]">
                  {selectedSalesOptionSummary.purchaseValidUntil || "No disponible"}
                </div>
              </div>
              <div className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Vigencia venta
                </div>
                <div className="mt-1 text-sm font-medium text-[#111827]">
                  {selectedSalesOptionSummary.salesValidUntil || "No disponible"}
                </div>
              </div>
              </div>
            </PriorityFormSection>

            <PriorityFormSection
              title="Captura de venta por concepto"
              description="Completa importes y moneda de venta por cada concepto incluido en esta opción."
            >
            <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
              <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                <thead className="bg-white text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  <tr>
                    <th className="px-4 py-3">Proveedor</th>
                    <th className="px-4 py-3">Concepto</th>
                    {canViewCost ? <th className="px-4 py-3">Compra</th> : null}
                    <th className="px-4 py-3">Venta</th>
                    {canViewExpectedProfit ? <th className="px-4 py-3">Profit estimado</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] bg-white">
                  {selectedSalesOptionSummary.lines.map((line) => {
                    const saleValue = salesDraft[line.id]?.sale_amount
                      ? Number(salesDraft[line.id]?.sale_amount)
                      : null
                    const saleCurrency =
                      salesDraft[line.id]?.sale_currency || line.sale_currency || "USD"
                    const profitValue =
                      saleValue != null && line.purchase_amount != null
                        ? saleValue - line.purchase_amount
                        : null

                    return (
                      <tr key={line.id}>
                        <td className="px-4 py-3 text-[#475569]">
                          {line.provider_name || "No asignado"}
                        </td>
                        <td className="px-4 py-3 text-[#475569]">
                          {line.accounting_concept || line.service_name}
                        </td>
                        {canViewCost ? (
                          <td className="px-4 py-3 text-[#475569]">
                            {formatCurrency(line.purchase_amount, line.purchase_currency)}
                            <div className="text-xs text-[#94A3B8]">
                              {formatCurrency(line.purchase_amount_mxn)}
                            </div>
                          </td>
                        ) : null}
                        <td className="px-4 py-3">
                          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_108px]">
                            <input
                              className="w-full rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                              placeholder="Venta"
                              inputMode="decimal"
                              value={salesDraft[line.id]?.sale_amount ?? ""}
                              onChange={(event) =>
                                setSalesDraft((current) => ({
                                  ...current,
                                  [line.id]: {
                                    sale_amount: event.target.value,
                                    sale_currency:
                                      current[line.id]?.sale_currency ||
                                      line.sale_currency ||
                                      "USD",
                                  },
                                }))
                              }
                            />
                            <select
                              className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                              value={saleCurrency}
                              onChange={(event) =>
                                setSalesDraft((current) => ({
                                  ...current,
                                  [line.id]: {
                                    sale_amount: current[line.id]?.sale_amount ?? "",
                                    sale_currency: event.target.value,
                                  },
                                }))
                              }
                            >
                              <option value="MXN">MXN</option>
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                            </select>
                          </div>
                        </td>
                        {canViewExpectedProfit ? (
                          <td className="px-4 py-3 text-[#475569]">
                            {profitValue != null
                              ? `${formatCurrency(profitValue, saleCurrency)} · MXN pendiente`
                              : "No disponible"}
                          </td>
                        ) : null}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            </PriorityFormSection>

            <PrioritySubmitBar>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowSalesModal(false)
                  setSelectedSalesOption(null)
                  setSalesDraft({})
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => void handleSaveSalesOption()}
                disabled={savingSales}
              >
                {savingSales ? "Guardando…" : "Guardar venta"}
              </Button>
            </PrioritySubmitBar>
          </div>
        </Modal>
      ) : null}

      {showEditModal ? (
        <Modal
          title="Editar cotización"
          description="Actualiza los detalles de carga y las fechas comerciales sin duplicar la ficha principal."
          size="workspace"
          onClose={() => {
            setShowEditModal(false)
            setQuoteFormValues(buildQuotationFormValues(quotation))
          }}
        >
          <QuotationForm
            title="Perfil de cotización"
            description="Mantiene una sola ficha limpia con edición puntual desde este modal."
            values={quoteFormValues}
            clientName={quotation.client_name}
            origin={quotation.origin}
            destination={quotation.destination}
            serviceType={quotation.service_type}
            transportType={quotation.transport_type}
            operationType={quotation.operation_type}
            incotermCode={quotation.incoterm_code || null}
            createdAt={quotation.created_at}
            onChange={(field, value) => {
              setQuoteFormValues((current) => ({
                ...current,
                [field]: value,
              }))
            }}
            onSubmit={handleSaveQuotation}
            submitLabel="Guardar cotización"
            loading={savingQuote}
          />
        </Modal>
      ) : null}

      {showStatusModal ? (
        <Modal
          title="Actualizar estatus"
          description="Mueve la cotización entre CRM y Pricing usando las reglas comerciales definidas."
          size="standard"
          onClose={() => {
            setShowStatusModal(false)
            setStatusFormValues(buildStatusFormValues(quotation))
          }}
        >
          <div className="space-y-5">
            <PrioritySectionAlert title="Qué cambia" variant="info">
              Este cambio mueve la cotización entre comercial y pricing. Captura el motivo completo cuando rechaces, canceles o solicites renegociación.
            </PrioritySectionAlert>

            <PriorityFormSection
              title="Nuevo estatus"
              description="Selecciona el siguiente estado operativo de la cotización."
            >
              <PriorityFormField label="Estatus" required>
                <PrioritySelectField
                  value={statusFormValues.status}
                  onValueChange={(value) =>
                    setStatusFormValues((current) => ({
                      ...current,
                      status: value as QuotationStatusFormValues["status"],
                    }))
                  }
                  placeholder="Selecciona un estatus"
                  options={quotationStatusOptions.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                />
              </PriorityFormField>
            </PriorityFormSection>

            {statusFormValues.status === "rechazada" ? (
              <PriorityFormSection
                title="Motivo de rechazo"
                description="Explica el motivo para que comercial y pricing puedan dar seguimiento sin texto ambiguo."
              >
                <div className="grid gap-4">
                  <PriorityFormField label="Motivo de rechazo" required>
                    <PrioritySelectField
                      value={statusFormValues.rejectionReasonId}
                      onValueChange={(value) =>
                        setStatusFormValues((current) => ({
                          ...current,
                          rejectionReasonId: value,
                        }))
                      }
                      placeholder="Selecciona un motivo"
                      options={rejectionReasons.map((reason) => ({
                        value: reason.id,
                        label: reason.reason,
                      }))}
                    />
                  </PriorityFormField>
                  <PriorityFormField label="Notas de rechazo">
                    <textarea
                      className="min-h-[120px] w-full rounded-[18px] border border-[#D1D6DF] bg-white px-4 py-3 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-burgundy-light)] focus:ring-2 focus:ring-[rgba(179,58,91,0.12)]"
                      placeholder="Agrega el contexto comercial del rechazo"
                      value={statusFormValues.rejectionNotes}
                      onChange={(event) =>
                        setStatusFormValues((current) => ({
                          ...current,
                          rejectionNotes: event.target.value,
                        }))
                      }
                    />
                  </PriorityFormField>
                </div>
              </PriorityFormSection>
            ) : null}

            {statusFormValues.status === "cancelada" ? (
              <PriorityFormSection
                title="Motivo de cancelación"
                description="Deja claro por qué se detuvo esta oportunidad para auditoría y seguimiento futuro."
              >
                <PriorityFormField label="Notas de cancelación" required>
                  <textarea
                    className="min-h-[120px] w-full rounded-[18px] border border-[#D1D6DF] bg-white px-4 py-3 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-burgundy-light)] focus:ring-2 focus:ring-[rgba(179,58,91,0.12)]"
                    placeholder="Explica por qué se cancela la cotización"
                    value={statusFormValues.cancellationNotes}
                    onChange={(event) =>
                      setStatusFormValues((current) => ({
                        ...current,
                        cancellationNotes: event.target.value,
                      }))
                    }
                  />
                </PriorityFormField>
              </PriorityFormSection>
            ) : null}

            {statusFormValues.status === "renegociar_tarifa" ? (
              <PriorityFormSection
                title="Solicitud de renegociación"
                description="Define la tarifa objetivo y explica qué necesita ajustar pricing."
              >
                <div className="grid gap-4">
                  <PriorityFormField label="Tarifa objetivo" required>
                    <PriorityInput
                      placeholder="Tarifa objetivo"
                      inputMode="decimal"
                      value={statusFormValues.targetRate}
                      onChange={(event) =>
                        setStatusFormValues((current) => ({
                          ...current,
                          targetRate: event.target.value,
                        }))
                      }
                    />
                  </PriorityFormField>
                  <PriorityFormField label="Comentario para pricing" required>
                    <textarea
                      className="min-h-[120px] w-full rounded-[18px] border border-[#D1D6DF] bg-white px-4 py-3 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-burgundy-light)] focus:ring-2 focus:ring-[rgba(179,58,91,0.12)]"
                      placeholder="Explica el contexto comercial y el ajuste esperado"
                      value={statusFormValues.rejectionNotes}
                      onChange={(event) =>
                        setStatusFormValues((current) => ({
                          ...current,
                          rejectionNotes: event.target.value,
                        }))
                      }
                    />
                  </PriorityFormField>
                </div>
              </PriorityFormSection>
            ) : null}

            <PrioritySubmitBar>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowStatusModal(false)
                  setStatusFormValues(buildStatusFormValues(quotation))
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => void handleSaveStatus()}
                disabled={savingStatus}
              >
                {savingStatus ? "Guardando…" : "Guardar estatus"}
              </Button>
            </PrioritySubmitBar>
          </div>
        </Modal>
      ) : null}

      {showCargoModal ? (
        <Modal
          title={editingCargoId ? "Editar detalle de carga" : "Añadir detalle de carga"}
          description="Captura pallets, cajas y dimensiones según el tipo de servicio para la cotización."
          size="workspace"
          onClose={() => {
            setShowCargoModal(false)
            resetCargoForm()
          }}
        >
          <QuotationCargoLineForm
            title={editingCargoId ? "Editar consolidación de carga" : "Nueva consolidación de carga"}
            description="Usa dimensiones en cm y peso en kg para estandarizar los cálculos."
            serviceType={quotation.service_type}
            rows={cargoFormRows}
            existingLines={cargoLines}
            onChangeRow={(draftId, field, value) => {
              setCargoFormRows((current) =>
                current.map((row) => (row.draftId === draftId ? { ...row, [field]: value } : row))
              )
            }}
            onAddRow={() => {
              setCargoFormRows((current) => [...current, createEmptyCargoForm()])
            }}
            onRemoveRow={(draftId) => {
              setCargoFormRows((current) => current.filter((row) => row.draftId !== draftId))
            }}
            onSubmit={handleSaveCargoLine}
            submitLabel={editingCargoId ? "Guardar cambios" : "Guardar detalle"}
            loading={savingCargo}
          />
        </Modal>
      ) : null}
      {confirmDialog}
    </>
  )
}
