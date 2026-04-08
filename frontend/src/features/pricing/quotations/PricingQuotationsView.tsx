"use client"

import { useMemo } from "react"
import { Modal } from "@/components/data/Modal"
import { StatusBadge } from "@/components/data/StatusBadge"
import { QuotationChargeLineForm } from "@/components/forms/QuotationChargeLineForm"
import {
  PriorityActionMenu,
  PriorityActionRail,
  PriorityCollectionWorkspace,
  PriorityFilterPopover,
  PrioritySavedViews,
  PrioritySearchField,
  PriorityStatusLanes,
  type PriorityCollectionColumn,
  type PriorityStatusLaneItem,
} from "@/components/priority"
import { PrioritySelectField } from "@/components/priority/PriorityForm"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EntityMailTab } from "@/features/mail/EntityMailTab"
import type { PricingQuotationLane } from "@/lib/db"
import {
  buildProviderEmailDraft,
  buildProviderWhatsAppLink,
  createEmptyChargeForm,
  formatCurrency,
  formatDate,
  getPrimaryProviderContact,
} from "@/features/pricing/quotations/helpers"
import { usePricingQuotationsController } from "@/features/pricing/quotations/usePricingQuotationsController"

type PricingQuotationsController = ReturnType<typeof usePricingQuotationsController>

const allFilterValue = "__all__"

const pricingLaneMeta: Record<
  PricingQuotationLane,
  { label: string; helper: string; tone: PriorityStatusLaneItem["tone"] }
> = {
  pendiente: {
    label: "Pendientes",
    helper: "Lista operativa lista para ser tomada por pricing.",
    tone: "info",
  },
  cotizando: {
    label: "Cotizando",
    helper: "Cotizaciones ya trabajadas con sourcing y costeo activo.",
    tone: "warning",
  },
  lista_para_enviar: {
    label: "Lista para enviar",
    helper: "Opciones listas para regresar al equipo comercial.",
    tone: "spotlight",
  },
  renegociar_tarifa: {
    label: "Renegociacion",
    helper: "Ventas devolvio la cotizacion para nueva tarifa objetivo.",
    tone: "danger",
  },
}

export function PricingQuotationsView({
  controller,
}: {
  controller: PricingQuotationsController
}) {
  const {
    items,
    totalCount,
    loading,
    laneCounts,
    takingId,
    query,
    setQuery,
    activeLane,
    setActiveLane,
    filterState,
    setFilterState,
    resetWorkspaceState,
    activeFilterCount,
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
    providerMailboxes,
    selectedProviderMailboxId,
    setSelectedProviderMailboxId,
    sendingProviderEmailKey,
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
    handleSendProviderEmail,
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
    currentUser,
    pricingOwnerOptions,
    serviceTypeOptions,
    transportTypeOptions,
    savedViews,
    selectedViewId,
    isDefaultViewApplied,
    handleApplyWorkspaceView,
    handleApplyQuickView,
    handleSaveWorkspaceView,
    handleRenameWorkspaceView,
    handleUpdateCurrentWorkspaceView,
    handleDeleteWorkspaceView,
    handleSetDefaultWorkspaceView,
  } = controller

  const hasSearch = Boolean(query.trim())
  const hasActiveFilters = hasSearch || activeFilterCount > 0
  const providerParticipantEmails = useMemo(
    () =>
      Array.from(
        new Set(
          providerCandidates
            .flatMap((candidate) => [
              getPrimaryProviderContact(candidate)?.email,
              candidate.provider.company_email,
            ])
            .map((email) => email?.trim().toLowerCase())
            .filter((email): email is string => Boolean(email))
        )
      ),
    [providerCandidates]
  )

  const lanes = useMemo<PriorityStatusLaneItem[]>(
    () =>
      (Object.keys(pricingLaneMeta) as PricingQuotationLane[]).map((lane) => ({
        key: lane,
        label: pricingLaneMeta[lane].label,
        helper: pricingLaneMeta[lane].helper,
        count: laneCounts[lane],
        tone: pricingLaneMeta[lane].tone,
      })),
    [laneCounts]
  )

  const quickViews = useMemo(() => {
    const views = [
      currentUser
        ? {
            key: "mis-pendientes",
            label: "Mis pendientes",
            active: !selectedViewId && activeLane === "pendiente" && filterState.mineOnly,
            onSelect: () => handleApplyQuickView("pendiente", { mineOnly: true }),
          }
        : null,
      {
        key: "cotizando",
        label: "Cotizando",
        active:
          !selectedViewId &&
          activeLane === "cotizando" &&
          !filterState.mineOnly &&
          !filterState.pricingOwnerId &&
          !filterState.serviceType &&
          !filterState.transportType &&
          !hasSearch,
        onSelect: () => handleApplyQuickView("cotizando"),
      },
      {
        key: "renegociacion",
        label: "Renegociacion",
        active:
          !selectedViewId &&
          activeLane === "renegociar_tarifa" &&
          !filterState.mineOnly &&
          !filterState.pricingOwnerId &&
          !filterState.serviceType &&
          !filterState.transportType &&
          !hasSearch,
        onSelect: () => handleApplyQuickView("renegociar_tarifa"),
      },
      {
        key: "listas-comercial",
        label: "Listas para comercial",
        active:
          !selectedViewId &&
          activeLane === "lista_para_enviar" &&
          !filterState.mineOnly &&
          !filterState.pricingOwnerId &&
          !filterState.serviceType &&
          !filterState.transportType &&
          !hasSearch,
        onSelect: () => handleApplyQuickView("lista_para_enviar"),
      },
    ]

    return views.filter(Boolean) as NonNullable<(typeof views)[number]>[]
  }, [
    activeLane,
    currentUser,
    filterState.mineOnly,
    filterState.pricingOwnerId,
    filterState.serviceType,
    filterState.transportType,
    handleApplyQuickView,
    hasSearch,
    selectedViewId,
  ])

  const quotationColumns = useMemo<PriorityCollectionColumn<(typeof items)[number]>[]>(
    () => [
      {
        id: "quickActions",
        header: "Flujo",
        className: "min-w-[252px]",
        headClassName: "min-w-[252px]",
        cell: (item) => {
          const actions = []

          if (item.status === "pendiente") {
            actions.push({
              label: takingId === item.id ? "Tomando..." : "Tomar",
              onPress: () => void handleTakeQuotation(item.id),
              disabled: takingId === item.id,
              variant: "default" as const,
            })
          }

          if (["cotizando", "lista_para_enviar", "renegociar_tarifa"].includes(item.status)) {
            actions.push(
              {
                label: "Proveedores",
                onPress: () => void handleOpenProviders(item),
                variant: "outline" as const,
              },
              {
                label: "Cargos",
                onPress: () => void handleOpenCharges(item),
                variant: "outline" as const,
              }
            )
          }

          return <PriorityActionRail actions={actions} />
        },
      },
      {
        id: "reference_number",
        header: "Referencia",
        className: "min-w-[172px]",
        cell: (item) => (
          <div className="space-y-1">
            <div className="font-semibold text-[var(--brand-navy)]">
              {item.reference_number || "Pendiente"}
            </div>
            <div className="text-xs text-[#607187]">
              {item.created_at ? formatDate(item.created_at) : "Sin fecha"}
            </div>
          </div>
        ),
      },
      {
        id: "client_name",
        header: "Cliente",
        className: "min-w-[220px]",
        cell: (item) => (
          <div className="space-y-1">
            <div className="font-medium text-[var(--brand-navy)]">
              {item.client_name || "Sin cliente"}
            </div>
            <div className="text-xs text-[#607187]">{item.incoterm_code || "Sin incoterm"}</div>
          </div>
        ),
      },
      {
        id: "service",
        header: "Servicio",
        className: "min-w-[190px]",
        cell: (item) =>
          [item.service_type, item.transport_type].filter(Boolean).join(" / ") || "No definido",
      },
      {
        id: "lane",
        header: "Ruta",
        className: "min-w-[240px]",
        cell: (item) =>
          item.origin && item.destination
            ? `${item.origin} -> ${item.destination}`
            : "No definido",
      },
      {
        id: "pricing_owner_name",
        header: "Responsable",
        className: "min-w-[180px]",
        cell: (item) => item.pricing_owner_name || "Sin asignar",
      },
      {
        id: "status",
        header: "Estatus",
        className: "min-w-[160px]",
        cell: (item) => <StatusBadge status={item.status} />,
      },
      {
        id: "cost",
        header: "Costo",
        className: "min-w-[150px]",
        cell: (item) =>
          item.can_view_cost ? formatCurrency(item.estimated_cost) : "Sin permiso",
      },
      {
        id: "target",
        header: "Objetivo / comentarios",
        className: "min-w-[240px]",
        cell: (item) =>
          item.status === "renegociar_tarifa" ? (
            <div className="space-y-1">
              <div className="font-medium text-[var(--brand-navy)]">
                Objetivo: {formatCurrency(item.target_rate)}
              </div>
              <div className="max-w-[28ch] text-xs leading-5 text-[#607187]">
                {item.rejection_notes || "Sin comentario de ventas"}
              </div>
            </div>
          ) : (
            <span className="text-[#90A0B3]">Sin observaciones</span>
          ),
      },
      {
        id: "actions",
        header: "Mas",
        className: "w-[72px] text-right",
        headClassName: "w-[72px] text-right",
        cell: (item) => (
          <div className="flex justify-end">
            <PriorityActionMenu
              label={`Mas acciones para ${item.reference_number || "cotizacion"}`}
              actions={[
                {
                  label: "Ver detalle",
                  href: `/quotations/${item.id}`,
                },
              ]}
            />
          </div>
        ),
      },
    ],
    [handleOpenCharges, handleOpenProviders, handleTakeQuotation, takingId]
  )

  const emptyTitle = hasActiveFilters
    ? "No hay cotizaciones con la vista actual"
    : "Sin cotizaciones para pricing"

  const emptyDescription = hasActiveFilters
    ? "Prueba otra combinacion de lane, busqueda o filtros guardados para volver a poblar la mesa de trabajo."
    : "Cuando ventas libere nuevas cotizaciones para pricing, apareceran aqui listas para tomar y trabajar."

  const filterToolbar = (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_auto_auto_auto] xl:items-center">
      <PrioritySearchField
        value={query}
        onChange={setQuery}
        placeholder="Buscar cotización por referencia, cliente, origen o destino"
        ariaLabel="Buscar cotizaciones para pricing"
      />

      <PriorityFilterPopover
        title="Filtros del workspace"
        description="Filtra por responsable, servicio, transporte y carga personal antes de guardar la vista."
        activeCount={activeFilterCount}
        onApply={() => undefined}
        onClear={() =>
          setFilterState({
            pricingOwnerId: null,
            serviceType: null,
            transportType: null,
            mineOnly: false,
          })
        }
        saveAction={
          <div className="text-xs leading-5 text-[#607187]">
            Los filtros activos se guardan junto con la vista seleccionada.
          </div>
        }
      >
        <PrioritySelectField
          value={filterState.pricingOwnerId ?? allFilterValue}
          onValueChange={(value) =>
            setFilterState({
              pricingOwnerId: value === allFilterValue ? null : value,
            })
          }
          placeholder="Responsable pricing"
          ariaLabel="Filtrar por responsable pricing"
          options={[
            { value: allFilterValue, label: "Todos los responsables" },
            ...pricingOwnerOptions,
          ]}
        />
        <PrioritySelectField
          value={filterState.serviceType ?? allFilterValue}
          onValueChange={(value) =>
            setFilterState({
              serviceType: value === allFilterValue ? null : value,
            })
          }
          placeholder="Servicio"
          ariaLabel="Filtrar por servicio"
          options={[
            { value: allFilterValue, label: "Todos los servicios" },
            ...serviceTypeOptions,
          ]}
        />
        <PrioritySelectField
          value={filterState.transportType ?? allFilterValue}
          onValueChange={(value) =>
            setFilterState({
              transportType: value === allFilterValue ? null : value,
            })
          }
          placeholder="Transporte"
          ariaLabel="Filtrar por transporte"
          options={[
            { value: allFilterValue, label: "Todos los transportes" },
            ...transportTypeOptions,
          ]}
        />

        {currentUser ? (
          <label className="flex items-center gap-3 rounded-[18px] border border-[rgba(144,158,174,0.16)] bg-[rgba(248,250,252,0.82)] px-4 py-3 text-sm text-[var(--brand-navy)]">
            <input
              type="checkbox"
              checked={filterState.mineOnly}
              onChange={(event) => setFilterState({ mineOnly: event.target.checked })}
              className="size-4 rounded border-[#CBD5E1] text-[var(--brand-burgundy)] focus:ring-[rgba(179,58,91,0.2)]"
            />
            Ver solo cotizaciones asignadas a mi usuario
          </label>
        ) : null}
      </PriorityFilterPopover>

      <PrioritySavedViews
        views={savedViews}
        selectedViewId={selectedViewId}
        quickViews={quickViews}
        onSelectView={handleApplyWorkspaceView}
        onSaveCurrentView={handleSaveWorkspaceView}
        onRenameView={handleRenameWorkspaceView}
        onUpdateCurrentView={handleUpdateCurrentWorkspaceView}
        onDeleteView={handleDeleteWorkspaceView}
        onSetDefaultView={handleSetDefaultWorkspaceView}
      />

      <Button type="button" variant="outline" onClick={resetWorkspaceState}>
        Limpiar
      </Button>
    </div>
  )

  const footer = totalCount > 0 ? (
    <div className="flex flex-col gap-3 border-t border-[rgba(144,158,174,0.16)] pt-4 text-sm text-[#607187] sm:flex-row sm:items-center sm:justify-between">
      <div>
        Mostrando {showingFrom} a {showingTo} de {totalCount} cotizaciones en{" "}
        <span className="font-semibold text-[var(--brand-navy)]">
          {pricingLaneMeta[activeLane].label.toLowerCase()}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setPage(Math.max(page - 1, 1))}
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
          onClick={() => setPage(Math.min(page + 1, totalPages))}
          disabled={page >= totalPages || loading}
        >
          Siguiente
        </Button>
      </div>
    </div>
  ) : null

  return (
    <>
      <div className="space-y-4">
        <section className="workspace-panel space-y-4 rounded-[24px] p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#607187]">
                Pricing quotations workspace
                {isDefaultViewApplied && selectedViewId ? (
                  <span className="rounded-full bg-[rgba(179,58,91,0.08)] px-2 py-0.5 text-[10px] tracking-[0.14em] text-[var(--brand-burgundy)]">
                    Vista default aplicada
                  </span>
                ) : null}
              </div>
              <h2 className="text-[1.24rem] font-semibold tracking-[-0.02em] text-[var(--brand-navy)]">
                Trabajo de pricing por estatus
              </h2>
              <p className="max-w-4xl text-[0.95rem] leading-7 text-[#607187]">
                Toma cotizaciones, concentra proveedores y captura costos desde una misma mesa de
                trabajo. Las lanes marcan el estado operativo sin obligarte a leer la columna de
                estatus en cada fila.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[420px]">
              <div className="rounded-[18px] border border-[rgba(144,158,174,0.16)] bg-[rgba(248,250,252,0.82)] px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#607187]">
                  Lane activa
                </div>
                <div className="mt-1 text-[0.98rem] font-semibold text-[var(--brand-navy)]">
                  {pricingLaneMeta[activeLane].label}
                </div>
              </div>
              <div className="rounded-[18px] border border-[rgba(144,158,174,0.16)] bg-[rgba(248,250,252,0.82)] px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#607187]">
                  Visibles
                </div>
                <div className="mt-1 text-[0.98rem] font-semibold text-[var(--brand-navy)]">
                  {totalCount}
                </div>
              </div>
              <div className="rounded-[18px] border border-[rgba(144,158,174,0.16)] bg-[rgba(248,250,252,0.82)] px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#607187]">
                  Filtros activos
                </div>
                <div className="mt-1 text-[0.98rem] font-semibold text-[var(--brand-navy)]">
                  {activeFilterCount + (hasSearch ? 1 : 0)}
                </div>
              </div>
            </div>
          </div>

          <PriorityCollectionWorkspace
            toolbar={filterToolbar}
            lanes={
              <PriorityStatusLanes
                lanes={lanes}
                activeKey={activeLane}
                onChange={(key) => setActiveLane(key as PricingQuotationLane)}
                showHelpers={false}
              />
            }
            columns={quotationColumns}
            items={items}
            getRowId={(item) => item.id}
            loading={loading}
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
            footer={footer}
          />
        </section>
      </div>

      {showProvidersModal && selectedQuotation ? (
        <Modal
          title={`Sourcing de proveedores · ${selectedQuotation.reference_number || "Cotización"}`}
          description="Consulta proveedores compatibles, abre la solicitud interna para proveedor y lanza correo o WhatsApp con la informacion ya redactada."
          size="workspace"
          onClose={() => {
            setShowProvidersModal(false)
            setSelectedQuotation(null)
            setProviderCandidates([])
          }}
        >
          <div className="space-y-3">
            {selectedQuotation.status === "renegociar_tarifa" ? (
              <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
                <div className="font-semibold">Renegociacion solicitada por ventas</div>
                <div className="mt-1">
                  Tarifa objetivo: {formatCurrency(selectedQuotation.target_rate)}
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

            <Tabs defaultValue="sourcing" className="gap-4">
              <TabsList className="h-auto w-full flex-wrap justify-start rounded-[22px] border border-[rgba(144,158,174,0.16)] bg-[rgba(11,31,59,0.04)] p-1.5">
                <TabsTrigger value="sourcing" className="rounded-[16px] px-4 py-2.5 text-sm font-medium">
                  Proveedores
                </TabsTrigger>
                <TabsTrigger value="emails" className="rounded-[16px] px-4 py-2.5 text-sm font-medium">
                  Correos proveedores
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sourcing" className="space-y-3">
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
              <div className="text-sm font-semibold text-[#111827]">Buzón interno para enviar</div>
              <div className="mt-1 text-sm text-[#6B7280]">
                El correo saldrá desde Gmail interno y quedará ligado a la cotización dentro del ERP.
              </div>
              {providerMailboxes.filter((mailbox) => mailbox.status === "active" && mailbox.hasRefreshToken).length > 0 ? (
                <div className="mt-3 max-w-[420px]">
                  <PrioritySelectField
                    value={selectedProviderMailboxId ?? ""}
                    onValueChange={(value) => setSelectedProviderMailboxId(value || null)}
                    options={providerMailboxes
                      .filter((mailbox) => mailbox.status === "active" && mailbox.hasRefreshToken)
                      .map((mailbox) => ({
                        value: mailbox.id,
                        label: `${mailbox.displayName} · ${mailbox.email}`,
                      }))}
                    placeholder="Selecciona un buzón"
                  />
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-3 text-sm text-[#92400E]">
                  No hay un buzón interno conectado y disponible para pricing. Configúralo en Master Data / Mail antes de enviar solicitudes a proveedores.
                </div>
              )}
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
                  const providerEmailDraftEs = buildProviderEmailDraft(
                    candidate,
                    selectedQuotation,
                    providerCargoLines,
                    "es"
                  )
                  const providerEmailDraftEn = buildProviderEmailDraft(
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
                          {providerEmailDraftEs ? (
                            <Button
                              type="button"
                              onClick={() => void handleSendProviderEmail(candidate, "es")}
                              disabled={!selectedProviderMailboxId || sendingProviderEmailKey === `${candidate.service_offering.id}:es`}
                              className="bg-[#2563EB] hover:bg-[#1D4ED8]"
                            >
                              {sendingProviderEmailKey === `${candidate.service_offering.id}:es`
                                ? "Enviando ES…"
                                : "Correo interno ES"}
                            </Button>
                          ) : null}
                          {providerEmailDraftEn ? (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void handleSendProviderEmail(candidate, "en")}
                              disabled={!selectedProviderMailboxId || sendingProviderEmailKey === `${candidate.service_offering.id}:en`}
                              className="border-[#93C5FD] bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE]"
                            >
                              {sendingProviderEmailKey === `${candidate.service_offering.id}:en`
                                ? "Enviando EN…"
                                : "Correo interno EN"}
                            </Button>
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
              </TabsContent>

              <TabsContent value="emails" className="space-y-3">
                <EntityMailTab
                  entityType="quotation"
                  entityId={selectedQuotation.id}
                  participantEmailFilter={providerParticipantEmails}
                  title={`Correos proveedores · ${selectedQuotation.reference_number || "Cotización"}`}
                  description="Seguimiento interno de correos con proveedores vinculados a esta cotización. Visible solo para roles con acceso al buzón de sourcing."
                  emptyTitle="Sin correos de proveedores"
                  emptyDescription="Cuando envíes solicitudes desde correo interno o recibas respuestas de proveedores, aparecerán aquí."
                />
              </TabsContent>
            </Tabs>
          </div>
        </Modal>
      ) : null}

      {showChargesModal && selectedQuotation ? (
        <Modal
          title={`Cargos de pricing · ${selectedQuotation.reference_number || "Cotización"}`}
          description="Pricing captura una o varias opciones de compra por proveedor. Guarda avances y al final envia la propuesta a ventas."
          size="workspace"
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
          <div className="space-y-4">
            {selectedQuotation.status === "renegociar_tarifa" ? (
              <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
                <div className="font-semibold">Ventas solicita renegociacion</div>
                <div className="mt-1">
                  Tarifa objetivo: {formatCurrency(selectedQuotation.target_rate)}
                </div>
                <div className="mt-1">
                  Comentario: {selectedQuotation.rejection_notes || "Sin comentario"}
                </div>
              </div>
            ) : null}

            <div className="grid gap-2 md:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)_minmax(0,0.75fr)]">
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2.5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
                  Servicio
                </div>
                <div className="mt-1 text-[0.95rem] font-medium text-[#111827]">
                  {[selectedQuotation.service_type, selectedQuotation.transport_type]
                    .filter(Boolean)
                    .join(" / ") || "No definido"}
                </div>
              </div>
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2.5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
                  Fecha requerida
                </div>
                <div className="mt-1 text-[0.95rem] font-medium text-[#111827]">
                  {formatDate(selectedQuotation.required_quote_date)}
                </div>
              </div>
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2.5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
                  Opciones
                </div>
                <div className="mt-1 text-[0.95rem] font-medium text-[#111827]">
                  {chargeOptionSummaries.length}
                </div>
              </div>
            </div>

            {["cotizando", "renegociar_tarifa"].includes(selectedQuotation.status) ? (
              <div className="rounded-xl border border-[#CCFBF1] bg-[#F0FDFA] px-3 py-1.5 text-[0.92rem] text-[#134E4A]">
                Cuando las opciones esten completas, usa{" "}
                <span className="font-semibold">Enviar propuesta</span> en la cabecera del modal
                para regresarla a ventas.
              </div>
            ) : null}

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

            {loadingCharges ? (
              <p className="text-sm text-[#6B7280]">Cargando cargos...</p>
            ) : (
              <section className="space-y-2 rounded-xl border border-[#E5E7EB] bg-white p-2.5">
                <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-[0.95rem] font-semibold text-[#111827]">
                      Compra consolidada
                    </h3>
                    <p className="mt-0.5 text-[0.84rem] text-[#6B7280]">
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
                      Añadir opcion
                    </button>
                  ) : null}
                </div>

                {chargeOptionSummaries.length > 0 ? (
                  <div className="space-y-3">
                    {chargeOptionSummaries.map((summary) => (
                      <div
                        key={summary.optionId}
                        className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-3"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                              {summary.optionLabel}
                            </div>
                            <div className="mt-1.5 text-[1.05rem] font-semibold text-[#111827]">
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
                                        {deletingChargeId === line.id
                                          ? "Eliminando..."
                                          : "Eliminar"}
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
            )}
          </div>
        </Modal>
      ) : null}

      {confirmDialog}
    </>
  )
}
