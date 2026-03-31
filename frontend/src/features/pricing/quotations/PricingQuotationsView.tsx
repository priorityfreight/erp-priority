"use client"

import { type ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { useMemo } from "react"
import { Modal } from "@/components/data/Modal"
import { StatusBadge } from "@/components/data/StatusBadge"
import { QuotationChargeLineForm } from "@/components/forms/QuotationChargeLineForm"
import { PriorityDataTable } from "@/components/priority/PriorityDataTable"
import { PriorityInput, PrioritySelectField } from "@/components/priority/PriorityForm"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  buildProviderEmailLink,
  buildProviderWhatsAppLink,
  createEmptyChargeForm,
  formatCurrency,
  formatDate,
  formatStatusLabel,
  getPrimaryProviderContact,
  getStatusDescription,
  pricingStatusOptions,
} from "@/features/pricing/quotations/helpers"
import { usePricingQuotationsController } from "@/features/pricing/quotations/usePricingQuotationsController"

type PricingQuotationsController = ReturnType<typeof usePricingQuotationsController>

export function PricingQuotationsView({
  controller,
}: {
  controller: PricingQuotationsController
}) {
  const {
    items,
    totalCount,
    loading,
    takingId,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    selectedQuotation,
    setSelectedQuotation,
    showProvidersModal,
    setShowProvidersModal,
    showChargesModal,
    setShowChargesModal,
    providerCandidates,
    setProviderCandidates,
    providerCargoLines,
    setAllProviders,
    chargeLines,
    setChargeLines,
    concepts,
    setConcepts,
    loadingProviders,
    loadingCharges,
    savingCharge,
    deletingChargeId,
    movingToReadyId,
    showChargeEditor,
    editingChargeOptionId,
    chargeFormRows,
    setChargeFormRows,
    handleTakeQuotation,
    handleOpenProviders,
    handleOpenCharges,
    handleSaveChargeLine,
    handleDeleteChargeLine,
    handleMoveToReadyForSend,
    providersForChargeForm,
    pricingChargeDisabledReason,
    canCaptureCharges,
    totalPages,
    showingFrom,
    showingTo,
    chargeOptionSummaries,
    confirmDialog,
    resetChargeForm,
    openNewChargeOptionEditor,
    openExistingChargeOptionEditor,
  } = controller

  const statusOptions = useMemo(
    () => [{ value: "all", label: "Todos los estatus" }].concat(
      pricingStatusOptions.map((status) => ({
        value: status,
        label: formatStatusLabel(status),
      }))
    ),
    []
  )

  const quotationColumns = useMemo<ColumnDef<(typeof items)[number]>[]>(
    () => [
      {
        accessorKey: "reference_number",
        header: "Referencia",
        cell: ({ row }) => row.original.reference_number || "Pendiente",
      },
      {
        accessorKey: "client_name",
        header: "Cliente",
        cell: ({ row }) => row.original.client_name || "No client",
      },
      {
        id: "service",
        header: "Servicio",
        cell: ({ row }) =>
          [row.original.service_type, row.original.transport_type].filter(Boolean).join(" / ") ||
          "No definido",
      },
      {
        id: "lane",
        header: "Lane",
        cell: ({ row }) =>
          row.original.origin && row.original.destination
            ? `${row.original.origin} -> ${row.original.destination}`
            : "No definido",
      },
      {
        accessorKey: "pricing_owner_name",
        header: "Pricing owner",
        cell: ({ row }) => row.original.pricing_owner_name || "Sin asignar",
      },
      {
        accessorKey: "status",
        header: "Estatus",
        cell: ({ row }) => (
          <div className="space-y-2">
            <StatusBadge status={row.original.status} />
            {getStatusDescription(row.original.status) ? (
              <div className="max-w-[220px] text-xs text-[#6B7280]">
                {getStatusDescription(row.original.status)}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        id: "cost",
        header: "Costo",
        cell: ({ row }) =>
          row.original.can_view_cost ? formatCurrency(row.original.estimated_cost) : "Sin permiso",
      },
      {
        id: "target",
        header: "Target / comentarios",
        cell: ({ row }) =>
          row.original.status === "renegociar_tarifa" ? (
            <div className="space-y-1">
              <div>Target: {formatCurrency(row.original.target_rate)}</div>
              <div className="max-w-[220px] text-xs text-[#6B7280]">
                {row.original.rejection_notes || "Sin comentario de ventas"}
              </div>
            </div>
          ) : (
            "—"
          ),
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {row.original.status === "pendiente" ? (
              <Button
                type="button"
                size="sm"
                onClick={() => void handleTakeQuotation(row.original.id)}
                disabled={takingId === row.original.id}
              >
                {takingId === row.original.id ? "Tomando..." : "Tomar"}
              </Button>
            ) : null}

            {["cotizando", "lista_para_enviar", "renegociar_tarifa"].includes(row.original.status) ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleOpenProviders(row.original)}
              >
                Proveedores
              </Button>
            ) : null}

            {["cotizando", "lista_para_enviar", "renegociar_tarifa"].includes(row.original.status) ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleOpenCharges(row.original)}
              >
                Cargos
              </Button>
            ) : null}

            <Button asChild type="button" variant="outline" size="sm">
              <Link href={`/quotations/${row.original.id}`}>Ver</Link>
            </Button>
          </div>
        ),
      },
    ],
    [handleOpenCharges, handleOpenProviders, handleTakeQuotation, takingId]
  )

  return (
    <>
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Cotizaciones activas
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">{totalCount}</div>
          </div>
          <div className="rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#1D4ED8]">
              Pendientes
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {items.filter((item) => item.status === "pendiente").length}
            </div>
          </div>
          <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#B45309]">
              Cotizando
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {items.filter((item) => item.status === "cotizando").length}
            </div>
          </div>
          <div className="rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#6D28D9]">
              Listas para enviar
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {items.filter((item) => item.status === "lista_para_enviar").length}
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">Trabajo de pricing</h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                Toma la cotizacion, consulta proveedores compatibles y consolida opciones de compra
                antes de regresarlas al equipo comercial.
              </p>
            </div>
            <div className="grid w-full gap-3 xl:max-w-3xl xl:grid-cols-[minmax(0,1.6fr)_minmax(220px,1fr)_auto]">
              <PriorityInput
                placeholder="Buscar cotizacion"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <PrioritySelectField
                value={statusFilter}
                onValueChange={setStatusFilter}
                placeholder="Estatus"
                options={statusOptions}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setQuery("")
                  setStatusFilter("all")
                }}
              >
                Limpiar
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 rounded-[18px]" />
              <Skeleton className="h-12 rounded-[18px]" />
              <Skeleton className="h-12 rounded-[18px]" />
            </div>
          ) : (
            <PriorityDataTable
              columns={quotationColumns}
              data={items}
              emptyTitle="No hay cotizaciones para pricing con los filtros actuales"
              emptyDescription="Ajusta la búsqueda o espera nuevas cotizaciones pendientes para trabajar en este tablero."
            />
          )}

          {totalCount > 0 ? (
            <div className="flex flex-col gap-3 border-t border-[#E5E7EB] pt-4 text-sm text-[#6B7280] sm:flex-row sm:items-center sm:justify-between">
              <div>
                Mostrando {showingFrom} a {showingTo} de {totalCount} cotizaciones
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  disabled={page === 1 || loading}
                >
                  Anterior
                </Button>
                <div className="min-w-[96px] text-center">
                  Pagina {page} de {totalPages}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
                  disabled={page >= totalPages || loading}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {showProvidersModal && selectedQuotation ? (
        <Modal
          title={`Sourcing de proveedores · ${selectedQuotation.reference_number || "Cotizacion"}`}
          description="Consulta proveedores compatibles, abre la solicitud interna para proveedor y lanza correo o WhatsApp con la informacion ya redactada."
          onClose={() => {
            setShowProvidersModal(false)
            setSelectedQuotation(null)
            setProviderCandidates([])
          }}
        >
          <div className="space-y-4">
            {selectedQuotation.status === "renegociar_tarifa" ? (
              <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
                <div className="font-semibold">Renegociacion solicitada por ventas</div>
                <div className="mt-1">
                  Tarifa target: {formatCurrency(selectedQuotation.target_rate)}
                </div>
                <div className="mt-1">
                  Comentario: {selectedQuotation.rejection_notes || "Sin comentario"}
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4 text-sm text-[#475569]">
              <div className="font-semibold text-[#111827]">Solicitud interna de pricing</div>
              <div className="mt-1">
                {[selectedQuotation.service_type, selectedQuotation.transport_type]
                  .filter(Boolean)
                  .join(" / ") || "Servicio no definido"}
              </div>
              <div className="mt-1">
                {selectedQuotation.origin || "Origen"} → {selectedQuotation.destination || "Destino"}
              </div>
              <div className="mt-1">
                Fecha requerida para cotizar: {formatDate(selectedQuotation.required_quote_date)}
              </div>
            </div>

            {loadingProviders ? (
              <p className="text-sm text-[#6B7280]">Cargando proveedores sugeridos...</p>
            ) : providerCandidates.length === 0 ? (
              <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
                No hay proveedores activos configurados para este servicio y transporte. Pricing no
                podra capturar compra hasta que exista al menos un proveedor compatible.
              </div>
            ) : (
              <div className="space-y-3">
                {providerCandidates.map((candidate) => {
                  const primaryContact = getPrimaryProviderContact(candidate)
                  const mailToLinkEs = buildProviderEmailLink(
                    candidate,
                    selectedQuotation,
                    providerCargoLines,
                    "es"
                  )
                  const mailToLinkEn = buildProviderEmailLink(
                    candidate,
                    selectedQuotation,
                    providerCargoLines,
                    "en"
                  )
                  const whatsAppLinkEs = buildProviderWhatsAppLink(
                    candidate,
                    selectedQuotation,
                    providerCargoLines,
                    "es"
                  )
                  const whatsAppLinkEn = buildProviderWhatsAppLink(
                    candidate,
                    selectedQuotation,
                    providerCargoLines,
                    "en"
                  )

                  return (
                    <section
                      key={candidate.service_offering.id}
                      className="rounded-xl border border-[#E5E7EB] bg-white p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-[#111827]">
                            {candidate.provider.name}
                          </h3>
                          <div className="mt-1 text-sm text-[#475569]">
                            {candidate.service_offering.service_type} /{" "}
                            {candidate.service_offering.transport_type}
                          </div>
                          <div className="mt-1 text-sm text-[#475569]">
                            Contacto: {primaryContact?.name || "Sin contacto activo"}
                          </div>
                          <div className="mt-1 text-sm text-[#475569]">
                            Correo:{" "}
                            {primaryContact?.email ||
                              candidate.provider.company_email ||
                              "No disponible"}
                          </div>
                          <div className="mt-1 text-sm text-[#475569]">
                            WhatsApp / telefono:{" "}
                            {primaryContact?.phone ||
                              candidate.provider.corporate_phone ||
                              "No disponible"}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {mailToLinkEs ? (
                            <a
                              href={mailToLinkEs}
                              className="rounded-md bg-[#2563EB] px-3 py-2 text-sm font-medium text-white hover:bg-[#1D4ED8]"
                            >
                              Correo ES
                            </a>
                          ) : null}
                          {mailToLinkEn ? (
                            <a
                              href={mailToLinkEn}
                              className="rounded-md border border-[#93C5FD] bg-[#EFF6FF] px-3 py-2 text-sm font-medium text-[#1D4ED8] hover:bg-[#DBEAFE]"
                            >
                              Email EN
                            </a>
                          ) : null}
                          {whatsAppLinkEs ? (
                            <a
                              href={whatsAppLinkEs}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md border border-[#86EFAC] bg-[#F0FDF4] px-3 py-2 text-sm font-medium text-[#166534] hover:bg-[#DCFCE7]"
                            >
                              WhatsApp ES
                            </a>
                          ) : null}
                          {whatsAppLinkEn ? (
                            <a
                              href={whatsAppLinkEn}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md border border-[#BBF7D0] bg-[#F7FEE7] px-3 py-2 text-sm font-medium text-[#166534] hover:bg-[#ECFCCB]"
                            >
                              WhatsApp EN
                            </a>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-3 text-sm text-[#475569]">
                        <div className="font-medium text-[#111827]">Terminos y condiciones</div>
                        <div className="mt-1">
                          {candidate.service_offering.terms_and_conditions || "No disponible"}
                        </div>
                      </div>
                    </section>
                  )
                })}
              </div>
            )}
          </div>
        </Modal>
      ) : null}

      {showChargesModal && selectedQuotation ? (
        <Modal
          title={`Cargos de pricing · ${selectedQuotation.reference_number || "Cotizacion"}`}
          description="Pricing captura una o varias opciones de compra por proveedor. Guarda avances y al final envia la propuesta a ventas."
          headerActions={
            ["cotizando", "renegociar_tarifa"].includes(selectedQuotation.status) ? (
              <button
                type="button"
                onClick={() => void handleMoveToReadyForSend()}
                disabled={
                  movingToReadyId === selectedQuotation.id ||
                  !canCaptureCharges ||
                  chargeLines.length === 0
                }
                className="rounded-md bg-[#0F766E] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {movingToReadyId === selectedQuotation.id ? "Actualizando..." : "Enviar propuesta"}
              </button>
            ) : null
          }
          onClose={() => {
            setShowChargesModal(false)
            setSelectedQuotation(null)
            setChargeLines([])
            setProviderCandidates([])
            setAllProviders([])
            setConcepts([])
            resetChargeForm()
          }}
        >
          <div className="space-y-5">
            {selectedQuotation.status === "renegociar_tarifa" ? (
              <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
                <div className="font-semibold">Ventas solicita renegociacion</div>
                <div className="mt-1">
                  Tarifa target: {formatCurrency(selectedQuotation.target_rate)}
                </div>
                <div className="mt-1">
                  Comentario: {selectedQuotation.rejection_notes || "Sin comentario"}
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Servicio
                </div>
                <div className="mt-1 text-sm font-medium text-[#111827]">
                  {[selectedQuotation.service_type, selectedQuotation.transport_type]
                    .filter(Boolean)
                    .join(" / ") || "No definido"}
                </div>
              </div>
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Fecha requerida
                </div>
                <div className="mt-1 text-sm font-medium text-[#111827]">
                  {formatDate(selectedQuotation.required_quote_date)}
                </div>
              </div>
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Opciones capturadas
                </div>
                <div className="mt-1 text-sm font-medium text-[#111827]">
                  {chargeOptionSummaries.length}
                </div>
              </div>
            </div>

            {["cotizando", "renegociar_tarifa"].includes(selectedQuotation.status) ? (
              <div className="rounded-xl border border-[#CCFBF1] bg-[#F0FDFA] px-4 py-3 text-sm text-[#134E4A]">
                Cuando las opciones esten completas, usa{" "}
                <span className="font-semibold">Enviar propuesta</span> en la cabecera del modal
                para regresarla a ventas.
              </div>
            ) : null}

            {loadingCharges ? (
              <p className="text-sm text-[#6B7280]">Cargando cargos...</p>
            ) : (
              <>
                <section className="space-y-4 rounded-xl border border-[#E5E7EB] bg-white p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-[#111827]">Compra consolidada</h3>
                      <p className="mt-1 text-sm text-[#6B7280]">
                        Las compras deben organizarse por opcion. Cada opcion puede contener varios
                        conceptos de proveedor.
                      </p>
                    </div>
                    {canCaptureCharges ? (
                      <button
                        type="button"
                        onClick={() => openNewChargeOptionEditor()}
                        className="rounded-md border border-[#CBD5E1] bg-white px-4 py-2 text-sm font-medium text-[#1E3A8A] shadow-sm hover:bg-[#F8FAFC]"
                      >
                        Anadir opcion
                      </button>
                    ) : null}
                  </div>

                  {chargeOptionSummaries.length > 0 ? (
                    <div className="space-y-4">
                      {chargeOptionSummaries.map((summary) => (
                        <div
                          key={summary.optionId}
                          className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4"
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                                {summary.optionLabel}
                              </div>
                              <div className="mt-2 text-lg font-semibold text-[#111827]">
                                {selectedQuotation.can_view_cost
                                  ? formatCurrency(summary.totalPurchaseMxn)
                                  : "Sin permiso"}
                              </div>
                              <div className="mt-1 text-sm text-[#6B7280]">
                                Total c/IVA MXN: {formatCurrency(summary.totalWithVatMxn)}
                              </div>
                              <div className="mt-1 text-sm text-[#6B7280]">
                                {summary.lineCount} cargo(s)
                              </div>
                              <div className="mt-1 text-sm text-[#6B7280]">
                                Vigencia compra: {formatDate(summary.purchaseValidUntil)}
                              </div>
                              <div className="mt-1 text-sm text-[#6B7280]">
                                Vigencia venta: {formatDate(summary.salesValidUntil)}
                              </div>
                              <div className="mt-1 text-sm text-[#6B7280]">
                                {summary.providers.size > 0
                                  ? Array.from(summary.providers).join(", ")
                                  : "Sin proveedor"}
                              </div>
                              <div className="mt-1 text-xs text-[#94A3B8]">
                                {summary.includeInCustomerQuote
                                  ? "Visible para propuesta comercial"
                                  : "Oculta para propuesta comercial"}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => openExistingChargeOptionEditor(summary)}
                                disabled={!selectedQuotation.can_edit_purchase_amount}
                                className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm font-medium text-[#111827] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Editar opcion
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white">
                            <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                              <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                                <tr>
                                  <th className="px-4 py-3">Proveedor</th>
                                  <th className="px-4 py-3">Concepto</th>
                                  <th className="px-4 py-3">Compra</th>
                                  <th className="px-4 py-3">Compra MXN</th>
                                  <th className="px-4 py-3">Vigencia compra</th>
                                  <th className="px-4 py-3">IVA</th>
                                  <th className="px-4 py-3">Notas</th>
                                  <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E5E7EB] bg-white">
                                {summary.lines.map((line) => (
                                  <tr key={line.id}>
                                    <td className="px-4 py-3 text-[#475569]">
                                      {line.provider_name || "No asignado"}
                                    </td>
                                    <td className="px-4 py-3 text-[#475569]">
                                      {line.accounting_concept || line.service_name}
                                    </td>
                                    <td className="px-4 py-3 text-[#475569]">
                                      {selectedQuotation.can_view_cost
                                        ? formatCurrency(line.purchase_amount, line.purchase_currency)
                                        : "Sin permiso"}
                                    </td>
                                    <td className="px-4 py-3 text-[#475569]">
                                      {selectedQuotation.can_view_cost
                                        ? formatCurrency(line.purchase_amount_mxn)
                                        : "Sin permiso"}
                                    </td>
                                    <td className="px-4 py-3 text-[#475569]">
                                      {formatDate(line.option_purchase_valid_until)}
                                    </td>
                                    <td className="px-4 py-3 text-[#475569]">{line.vat_rate}%</td>
                                    <td className="px-4 py-3 text-[#475569]">
                                      {line.notes || "No disponible"}
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => void handleDeleteChargeLine(line.id)}
                                          disabled={
                                            deletingChargeId === line.id ||
                                            !selectedQuotation.can_edit_purchase_amount
                                          }
                                          className="rounded-md border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-1.5 font-medium text-[#B91C1C] hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          {deletingChargeId === line.id ? "Eliminando..." : "Eliminar"}
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {showChargeEditor && editingChargeOptionId === summary.optionId ? (
                            <div className="mt-4">
                              <QuotationChargeLineForm
                                title={`Editar ${summary.optionLabel}`}
                                description="Modifica todos los conceptos de la opcion en conjunto. Los cambios se guardan sobre la misma opcion."
                                rows={chargeFormRows}
                                providers={providersForChargeForm}
                                concepts={concepts}
                                serviceType={selectedQuotation.service_type}
                                operationType={selectedQuotation.operation_type}
                                disabled={!canCaptureCharges}
                                disabledReason={pricingChargeDisabledReason}
                                onChangeRow={(draftId, field, value) => {
                                  setChargeFormRows((current) =>
                                    current.map((row) =>
                                      row.draftId === draftId ? { ...row, [field]: value } : row
                                    )
                                  )
                                }}
                                onAddRow={() => {
                                  setChargeFormRows((current) => [
                                    ...current,
                                    createEmptyChargeForm({
                                      purchaseCurrency: current[0]?.purchaseCurrency || "MXN",
                                      purchaseValidUntil: current[0]?.purchaseValidUntil || "",
                                      vatRate: "",
                                    }),
                                  ])
                                }}
                                onRemoveRow={(draftId) => {
                                  setChargeFormRows((current) =>
                                    current.filter((row) => row.draftId !== draftId)
                                  )
                                }}
                                onCancel={() => resetChargeForm()}
                                onSubmit={handleSaveChargeLine}
                                submitLabel="Guardar opcion"
                                loading={savingCharge}
                              />
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {chargeLines.length === 0 ? (
                    <p className="text-sm text-[#6B7280]">
                      Todavia no hay compras capturadas para esta cotizacion.
                    </p>
                  ) : null}
                </section>

                {showChargeEditor && !editingChargeOptionId ? (
                  <QuotationChargeLineForm
                    title="Agregar compra de proveedor"
                    description="Captura uno o varios conceptos de compra para construir una nueva opcion."
                    rows={chargeFormRows}
                    providers={providersForChargeForm}
                    concepts={concepts}
                    serviceType={selectedQuotation.service_type}
                    operationType={selectedQuotation.operation_type}
                    disabled={!canCaptureCharges}
                    disabledReason={pricingChargeDisabledReason}
                    onChangeRow={(draftId, field, value) => {
                      setChargeFormRows((current) =>
                        current.map((row) =>
                          row.draftId === draftId ? { ...row, [field]: value } : row
                        )
                      )
                    }}
                    onAddRow={() => {
                      setChargeFormRows((current) => [
                        ...current,
                        createEmptyChargeForm({
                          purchaseCurrency: current[0]?.purchaseCurrency || "MXN",
                          purchaseValidUntil: current[0]?.purchaseValidUntil || "",
                          vatRate: "",
                        }),
                      ])
                    }}
                    onRemoveRow={(draftId) => {
                      setChargeFormRows((current) =>
                        current.filter((row) => row.draftId !== draftId)
                      )
                    }}
                    onCancel={() => resetChargeForm()}
                    onSubmit={handleSaveChargeLine}
                    submitLabel="Guardar"
                    loading={savingCharge}
                  />
                ) : null}
              </>
            )}
          </div>
        </Modal>
      ) : null}

      {confirmDialog}
    </>
  )
}
