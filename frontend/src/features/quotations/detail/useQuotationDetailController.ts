import { useEffect, useMemo, useState } from "react"
import {
  createBookingFromQuotation,
  createQuotationCargoLine,
  deleteQuotationCargoLine,
  getContactsByClientId,
  getQuotationById,
  getQuotationCargoLines,
  getQuotationChargeLines,
  getQuotationRejectionReasons,
  requestQuotationPricing,
  setQuotationOptionCustomerVisibility,
  updateQuotation,
  updateQuotationCargoLine,
  updateQuotationOptionSalesAmounts,
  updateQuotationOptionValidity,
  updateQuotationStatus,
  type Shipment,
} from "@/lib/db"
import { getCurrentErpUser } from "@/lib/auth"
import { notifyError, notifySuccess, notifyWarning } from "@/lib/feedback"
import { usePriorityConfirm } from "@/components/priority/usePriorityConfirm"
import type {
  QuotationCargoLineFormValues,
} from "@/components/forms/QuotationCargoLineForm"
import type { QuotationFormValues } from "@/components/forms/QuotationForm"
import {
  buildCargoPayload,
  buildQuotationFormValues,
  buildSalesDraft,
  buildStatusFormValues,
  createEmptyCargoForm,
  isCargoDraftEmpty,
  nextCargoSortOrder,
  summarizeSalesOptions,
  syncSalesValidityDrafts,
  type QuotationDetailState,
  type QuotationStatusFormValues,
  type SalesDraftValue,
  type SalesOptionSummary,
} from "@/features/quotations/detail/helpers"

export function useQuotationDetailController(quotationId: string | undefined) {
  const [details, setDetails] = useState<QuotationDetailState | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCargoModal, setShowCargoModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [savingQuote, setSavingQuote] = useState(false)
  const [savingCargo, setSavingCargo] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [requestingPricing, setRequestingPricing] = useState(false)
  const [creatingBooking, setCreatingBooking] = useState(false)
  const [sendingQuotation, setSendingQuotation] = useState(false)
  const [markingAccepted, setMarkingAccepted] = useState(false)
  const [deletingCargoId, setDeletingCargoId] = useState<string | null>(null)
  const [editingCargoId, setEditingCargoId] = useState<string | null>(null)
  const [showSalesModal, setShowSalesModal] = useState(false)
  const [savingSales, setSavingSales] = useState(false)
  const [savingOptionValidityId, setSavingOptionValidityId] = useState<string | null>(null)
  const [selectedSalesOption, setSelectedSalesOption] = useState<string | null>(null)
  const [updatingVisibleOptionId, setUpdatingVisibleOptionId] = useState<string | null>(null)
  const [salesDraft, setSalesDraft] = useState<Record<string, SalesDraftValue>>({})
  const [salesValidityDrafts, setSalesValidityDrafts] = useState<Record<string, string>>({})
  const [currentUserRoleName, setCurrentUserRoleName] = useState<string | null>(null)
  const [createdShipment, setCreatedShipment] = useState<Shipment | null>(null)
  const [quoteFormValues, setQuoteFormValues] = useState<QuotationFormValues>({
    pickupAddress: "",
    deliveryAddress: "",
    requiredQuoteDate: "",
  })
  const [cargoFormRows, setCargoFormRows] = useState<QuotationCargoLineFormValues[]>([
    createEmptyCargoForm(),
  ])
  const [statusFormValues, setStatusFormValues] = useState<QuotationStatusFormValues>({
    status: "pendiente",
    rejectionReasonId: "",
    rejectionNotes: "",
    cancellationNotes: "",
    targetRate: "",
  })
  const { confirm, confirmDialog } = usePriorityConfirm()

  const chargeOptionSummaries = useMemo(
    () => summarizeSalesOptions(details?.chargeLines ?? []),
    [details?.chargeLines]
  )
  const selectedSalesOptionSummary = useMemo(
    () => chargeOptionSummaries.find((summary) => summary.optionId === selectedSalesOption) ?? null,
    [chargeOptionSummaries, selectedSalesOption]
  )
  const cargoLines = details?.cargoLines ?? []

  async function refreshQuotation(id: string) {
    const quotation = await getQuotationById(id)

    if (!quotation) {
      setDetails(null)
      return null
    }

    setDetails((current) => {
      if (!current) {
        return null
      }

      return {
        ...current,
        quotation,
      }
    })
    setQuoteFormValues(buildQuotationFormValues(quotation))
    setStatusFormValues(buildStatusFormValues(quotation))

    return quotation
  }

  async function refreshChargeLines(id: string) {
    const chargeLines = await getQuotationChargeLines(id)
    setDetails((current) => {
      if (!current) {
        return null
      }

      return {
        ...current,
        chargeLines,
      }
    })
    return chargeLines
  }

  async function refreshCargoLines(id: string) {
    const latestCargoLines = await getQuotationCargoLines(id)
    setDetails((current) => {
      if (!current) {
        return null
      }

      return {
        ...current,
        cargoLines: latestCargoLines,
      }
    })
    return latestCargoLines
  }

  async function loadDetails(id: string) {
    try {
      setLoading(true)
      const quotation = await getQuotationById(id)

      if (!quotation) {
        setDetails(null)
        return
      }

      const [chargeLines, latestCargoLines, rejectionReasons, clientContacts] = await Promise.all([
        getQuotationChargeLines(id),
        getQuotationCargoLines(id),
        getQuotationRejectionReasons(),
        getContactsByClientId(quotation.client_id),
      ])

      setDetails({
        quotation,
        chargeLines,
        cargoLines: latestCargoLines,
        clientContacts,
        rejectionReasons,
      })
      setQuoteFormValues(buildQuotationFormValues(quotation))
      setStatusFormValues(buildStatusFormValues(quotation))
    } catch (error) {
      console.error(error)
      setDetails(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!quotationId) {
      return
    }

    void loadDetails(quotationId)
  }, [quotationId])

  useEffect(() => {
    let cancelled = false

    async function loadCurrentUser() {
      try {
        const currentUser = await getCurrentErpUser()
        if (!cancelled) {
          setCurrentUserRoleName(currentUser?.role_name ?? null)
        }
      } catch (error) {
        console.error(error)
      }
    }

    void loadCurrentUser()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setSalesValidityDrafts((current) => syncSalesValidityDrafts(current, chargeOptionSummaries))
  }, [chargeOptionSummaries])

  function resetCargoForm() {
    setEditingCargoId(null)
    setCargoFormRows([createEmptyCargoForm()])
  }

  function openSalesOption(summary: SalesOptionSummary) {
    setSelectedSalesOption(summary.optionId)
    setSalesDraft(buildSalesDraft(summary))
    setShowSalesModal(true)
  }

  async function handleRequestPricing() {
    if (!details) {
      return
    }

    try {
      setRequestingPricing(true)
      await requestQuotationPricing(details.quotation.id)
      await refreshQuotation(details.quotation.id)
    } catch (error) {
      console.error(error)
      notifyError("No se pudo solicitar la cotizacion a pricing")
    } finally {
      setRequestingPricing(false)
    }
  }

  async function handleSaveQuotation() {
    if (!details) {
      return
    }

    try {
      setSavingQuote(true)
      await updateQuotation(details.quotation.id, {
        pickup_address: quoteFormValues.pickupAddress.trim() || null,
        delivery_address: quoteFormValues.deliveryAddress.trim() || null,
        required_quote_date: quoteFormValues.requiredQuoteDate || null,
      })
      setShowEditModal(false)
      await refreshQuotation(details.quotation.id)
    } catch (error) {
      console.error(error)
      notifyError("No se pudo guardar la cotizacion")
    } finally {
      setSavingQuote(false)
    }
  }

  async function handleSaveCargoLine() {
    if (!details) {
      return
    }

    const rowsToSave = cargoFormRows.filter((row) => !isCargoDraftEmpty(row))

    if (rowsToSave.length === 0) {
      notifyWarning("Agrega al menos un tipo de carga")
      return
    }

    try {
      setSavingCargo(true)
      let sortOrderCursor = nextCargoSortOrder(cargoLines)

      for (const row of rowsToSave) {
        if (!row.loadType.trim()) {
          throw new Error("Cada renglon debe incluir un tipo de carga")
        }

        const payload = buildCargoPayload(row)

        if (row.existingCargoId) {
          const existingCargoLine = cargoLines.find((line) => line.id === row.existingCargoId)
          await updateQuotationCargoLine(row.existingCargoId, {
            ...payload,
            sort_order: existingCargoLine?.sort_order ?? 1,
          })
          continue
        }

        await createQuotationCargoLine({
          quotation_id: details.quotation.id,
          ...payload,
          sort_order: sortOrderCursor,
        })
        sortOrderCursor += 1
      }

      setShowCargoModal(false)
      resetCargoForm()
      await refreshCargoLines(details.quotation.id)
    } catch (error) {
      console.error(error)
      notifyError("No se pudo guardar el detalle de carga")
    } finally {
      setSavingCargo(false)
    }
  }

  async function handleDeleteCargoLine(id: string) {
    const confirmed = await confirm({
      title: "Eliminar detalle de carga",
      description: "El renglon de carga se eliminara de la cotizacion actual.",
      actionLabel: "Eliminar renglon",
      variant: "destructive",
    })
    if (!confirmed || !details) {
      return
    }

    try {
      setDeletingCargoId(id)
      await deleteQuotationCargoLine(id)
      await refreshCargoLines(details.quotation.id)
    } catch (error) {
      console.error(error)
      notifyError("No se pudo eliminar el detalle de carga")
    } finally {
      setDeletingCargoId(null)
    }
  }

  async function handleSaveStatus() {
    if (!details) {
      return
    }

    try {
      setSavingStatus(true)
      await updateQuotationStatus(details.quotation.id, statusFormValues.status, {
        rejectionReasonId: statusFormValues.rejectionReasonId || null,
        rejectionNotes: statusFormValues.rejectionNotes.trim() || null,
        cancellationNotes: statusFormValues.cancellationNotes.trim() || null,
        targetRate: statusFormValues.targetRate ? Number(statusFormValues.targetRate) : null,
      })
      setShowStatusModal(false)
      await refreshQuotation(details.quotation.id)
    } catch (error) {
      console.error(error)
      notifyError("No se pudo actualizar el estatus")
    } finally {
      setSavingStatus(false)
    }
  }

  async function handleSaveSalesOption() {
    if (!details || !selectedSalesOptionSummary) {
      return
    }

    if (!details.quotation.can_edit_sale_price) {
      notifyWarning("Tu rol no tiene permiso para editar la venta de esta cotizacion")
      return
    }

    try {
      setSavingSales(true)
      await updateQuotationOptionSalesAmounts(
        details.quotation.id,
        selectedSalesOptionSummary.optionId,
        salesDraft
      )

      setShowSalesModal(false)
      setSelectedSalesOption(null)
      setSalesDraft({})
      await Promise.all([
        refreshQuotation(details.quotation.id),
        refreshChargeLines(details.quotation.id),
      ])
    } catch (error) {
      console.error(error)
      notifyError("No se pudo guardar la venta de la opcion")
    } finally {
      setSavingSales(false)
    }
  }

  async function handleSendQuotation(documentHref: string) {
    if (!details) {
      return
    }

    if (!details.quotation.can_edit_sale_price) {
      notifyWarning("Tu rol no tiene permiso para preparar la salida comercial de esta cotizacion")
      return
    }

    const hasSendableOption = chargeOptionSummaries.some(
      (summary) => summary.includeInCustomerQuote && summary.hasCompleteSale
    )
    if (!hasSendableOption) {
      notifyWarning("Primero selecciona al menos una opcion visible al cliente con venta completa")
      return
    }

    try {
      setSendingQuotation(true)
      await updateQuotationStatus(details.quotation.id, "enviada")
      if (typeof window !== "undefined") {
        window.open(documentHref, "_blank", "noopener,noreferrer")
      }
      await refreshQuotation(details.quotation.id)
    } catch (error) {
      console.error(error)
      notifyError("No se pudo enviar la cotizacion")
    } finally {
      setSendingQuotation(false)
    }
  }

  async function handleMarkAccepted() {
    if (!details) {
      return
    }

    try {
      setMarkingAccepted(true)
      await updateQuotationStatus(details.quotation.id, "aceptada")
      await refreshQuotation(details.quotation.id)
    } catch (error) {
      console.error(error)
      notifyError("No se pudo marcar la cotizacion como aceptada")
    } finally {
      setMarkingAccepted(false)
    }
  }

  async function handleToggleCustomerOption(summary: SalesOptionSummary) {
    if (!details) {
      return
    }

    try {
      setUpdatingVisibleOptionId(summary.optionId)
      await setQuotationOptionCustomerVisibility(summary.optionId, !summary.includeInCustomerQuote)
      await Promise.all([
        refreshQuotation(details.quotation.id),
        refreshChargeLines(details.quotation.id),
      ])
    } catch (error) {
      console.error(error)
      notifyError("No se pudo actualizar la visibilidad comercial de la opcion")
    } finally {
      setUpdatingVisibleOptionId(null)
    }
  }

  async function handleSaveSalesValidity(summary: SalesOptionSummary) {
    if (!details || currentUserRoleName !== "Admin") {
      return
    }

    if (!salesValidityDrafts[summary.optionId]) {
      notifyWarning("Captura la nueva vigencia de venta antes de guardar el override")
      return
    }

    try {
      setSavingOptionValidityId(summary.optionId)
      await updateQuotationOptionValidity(summary.optionId, {
        sales_valid_until: salesValidityDrafts[summary.optionId] || null,
        override_sales_valid_until: true,
      })
      await refreshChargeLines(details.quotation.id)
    } catch (error) {
      console.error(error)
      notifyError("No se pudo actualizar la vigencia de venta de esta opcion")
    } finally {
      setSavingOptionValidityId(null)
    }
  }

  async function handleCreateBooking() {
    if (!details) {
      return
    }

    try {
      setCreatingBooking(true)
      const shipment = await createBookingFromQuotation(details.quotation.id)
      setCreatedShipment(shipment)
      notifySuccess(
        shipment.shipment_reference
          ? `Booking creado: ${shipment.shipment_reference}`
          : "Booking creado correctamente"
      )
    } catch (error) {
      console.error(error)
      notifyError("No se pudo crear el booking")
    } finally {
      setCreatingBooking(false)
    }
  }

  return {
    details,
    loading,
    showEditModal,
    setShowEditModal,
    showCargoModal,
    setShowCargoModal,
    showStatusModal,
    setShowStatusModal,
    savingQuote,
    savingCargo,
    savingStatus,
    requestingPricing,
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
    selectedSalesOption,
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
    refreshQuotation,
    refreshChargeLines,
    refreshCargoLines,
    loadDetails,
    resetCargoForm,
    openSalesOption,
    handleRequestPricing,
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
  }
}
