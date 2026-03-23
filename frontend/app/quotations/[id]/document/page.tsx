"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import {
  getContactsByClientId,
  getQuotationById,
  getQuotationChargeLines,
  type Contact,
  type QuotationChargeLine,
  type QuotationSummary,
} from "@/lib/db"

type DocumentState = {
  quotation: QuotationSummary
  chargeLines: QuotationChargeLine[]
  clientContacts: Contact[]
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) {
    return "No disponible"
  }

  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function getPrimaryContact(contacts: Contact[]) {
  return (
    contacts.find((contact) => contact.status === "activo" && contact.is_primary) ||
    contacts.find((contact) => contact.status === "activo") ||
    null
  )
}

export default function QuotationDocumentPage() {
  const params = useParams()
  const quotationId = typeof params?.id === "string" ? params.id : undefined

  const [details, setDetails] = useState<DocumentState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!quotationId) {
      return
    }

    let cancelled = false

    async function load(id: string) {
      try {
        setLoading(true)
        const quotation = await getQuotationById(id)
        if (!quotation || cancelled) {
          setDetails(null)
          return
        }

        const [chargeLines, clientContacts] = await Promise.all([
          getQuotationChargeLines(id),
          getContactsByClientId(quotation.client_id),
        ])

        if (cancelled) {
          return
        }

        setDetails({
          quotation,
          chargeLines,
          clientContacts,
        })
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          setDetails(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load(quotationId)

    return () => {
      cancelled = true
    }
  }, [quotationId])

  const totals = useMemo(() => {
    if (!details) {
      return { sale: 0, vat: 0, grandTotal: 0 }
    }

    return details.chargeLines.reduce(
      (accumulator, line) => {
        const sale = line.sale_amount ?? 0
        const vat = sale * ((line.vat_rate ?? 0) / 100)

        return {
          sale: accumulator.sale + sale,
          vat: accumulator.vat + vat,
          grandTotal: accumulator.grandTotal + sale + vat,
        }
      },
      { sale: 0, vat: 0, grandTotal: 0 }
    )
  }, [details])

  if (!quotationId) {
    return <div className="p-8 text-sm text-[#6B7280]">Quotation id no valido.</div>
  }

  if (loading && !details) {
    return <div className="p-8 text-sm text-[#6B7280]">Cargando documento de cotizacion...</div>
  }

  if (!details) {
    return <div className="p-8 text-sm text-[#6B7280]">No se encontro la cotizacion.</div>
  }

  const { quotation, chargeLines, clientContacts } = details
  const primaryContact = getPrimaryContact(clientContacts)

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8 text-[#0F172A] print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-5xl space-y-6 rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <div className="flex flex-col gap-3 print:hidden md:flex-row md:items-center md:justify-between">
          <Link
            href={`/quotations/${quotation.id}`}
            className="rounded-md border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-medium text-[#111827] hover:bg-[#F9FAFB]"
          >
            Regresar a cotizacion
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8]"
          >
            Imprimir / Guardar PDF
          </button>
        </div>

        <header className="flex flex-col gap-4 border-b border-[#E5E7EB] pb-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#64748B]">
              Priority Logistics ERP
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-[#111827]">Cotizacion comercial</h1>
            <div className="mt-2 text-sm text-[#475569]">
              Referencia: {quotation.reference_number || "Pendiente"}
            </div>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-5 py-4 text-sm">
            <div className="font-semibold text-[#111827]">{quotation.client_name || "Cliente"}</div>
            <div className="mt-1 text-[#475569]">{primaryContact?.name || "Sin contacto principal"}</div>
            <div className="mt-1 text-[#475569]">{primaryContact?.email || "Sin correo"}</div>
            <div className="mt-1 text-[#475569]">{primaryContact?.phone || "Sin telefono"}</div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
              Servicio
            </div>
            <div className="mt-1 text-sm font-medium text-[#111827]">{quotation.service_type || "—"}</div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
              Transporte
            </div>
            <div className="mt-1 text-sm font-medium text-[#111827]">
              {quotation.transport_type || "—"}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
              Tipo de operacion
            </div>
            <div className="mt-1 text-sm font-medium text-[#111827]">
              {quotation.operation_type || "—"}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
              Incoterm
            </div>
            <div className="mt-1 text-sm font-medium text-[#111827]">
              {quotation.incoterm_code || "—"}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-4 rounded-2xl border border-[#E5E7EB] p-5">
            <h2 className="text-lg font-semibold text-[#111827]">Informacion de la ruta</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Origen
                </div>
                <div className="mt-1 text-sm text-[#111827]">{quotation.origin || "No disponible"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Destino
                </div>
                <div className="mt-1 text-sm text-[#111827]">
                  {quotation.destination || "No disponible"}
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Pickup
                </div>
                <div className="mt-1 text-sm text-[#111827]">
                  {quotation.pickup_address || "No disponible"}
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Entrega
                </div>
                <div className="mt-1 text-sm text-[#111827]">
                  {quotation.delivery_address || "No disponible"}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-[#E5E7EB] p-5">
            <h2 className="text-lg font-semibold text-[#111827]">Carga</h2>
            <div className="grid gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Commodities
                </div>
                <div className="mt-1 text-sm text-[#111827]">
                  {quotation.commodities || "No disponible"}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Cantidad
                </div>
                <div className="mt-1 text-sm text-[#111827]">
                  {quotation.quantity != null ? quotation.quantity : "No disponible"}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Peso
                </div>
                <div className="mt-1 text-sm text-[#111827]">
                  {quotation.weight != null ? `${quotation.weight} kg` : "No disponible"}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Validez de tarifa
                </div>
                <div className="mt-1 text-sm text-[#111827]">
                  Compra: {quotation.purchase_valid_until || "No disponible"}
                </div>
                <div className="mt-1 text-sm text-[#111827]">
                  Venta: {quotation.sales_valid_until || "No disponible"}
                </div>
              </div>
            </div>
          </section>
        </section>

        <section className="rounded-2xl border border-[#E5E7EB] p-5">
          <h2 className="text-lg font-semibold text-[#111827]">Cargos de la cotizacion</h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            Vista comercial para cliente. No incluye proveedor ni costo de compra.
          </p>

          <div className="mt-5 overflow-x-auto rounded-xl border border-[#E5E7EB]">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
              <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                <tr>
                  <th className="px-4 py-3">Concepto</th>
                  <th className="px-4 py-3">Venta</th>
                  <th className="px-4 py-3">IVA</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] bg-white">
                {chargeLines.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-[#6B7280]">
                      Todavia no hay cargos listos para compartir.
                    </td>
                  </tr>
                ) : (
                  chargeLines.map((line) => {
                    const sale = line.sale_amount ?? 0
                    const vat = sale * ((line.vat_rate ?? 0) / 100)
                    const total = sale + vat

                    return (
                      <tr key={line.id}>
                        <td className="px-4 py-3 text-[#475569]">
                          {line.accounting_concept || line.service_name}
                        </td>
                        <td className="px-4 py-3 text-[#475569]">{formatCurrency(sale)}</td>
                        <td className="px-4 py-3 text-[#475569]">{formatCurrency(vat)}</td>
                        <td className="px-4 py-3 font-medium text-[#111827]">
                          {formatCurrency(total)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 ml-auto grid max-w-sm gap-3">
            <div className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3">
              <span className="text-sm font-medium text-[#475569]">Subtotal</span>
              <span className="text-sm font-semibold text-[#111827]">{formatCurrency(totals.sale)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3">
              <span className="text-sm font-medium text-[#475569]">IVA</span>
              <span className="text-sm font-semibold text-[#111827]">{formatCurrency(totals.vat)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3">
              <span className="text-sm font-semibold text-[#1D4ED8]">Total</span>
              <span className="text-base font-semibold text-[#1E3A8A]">
                {formatCurrency(totals.grandTotal)}
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
