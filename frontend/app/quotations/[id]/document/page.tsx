"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import {
  getContactsByClientId,
  getQuotationCargoLines,
  getQuotationById,
  getQuotationChargeLines,
  type Contact,
  type QuotationCargoLine,
  type QuotationChargeLine,
  type QuotationSummary,
} from "@/lib/db"
import {
  formatCurrency,
  getCustomerOptionRemarks,
  getPrimaryContact,
  getVisibleCustomerOptionSummaries,
  priorityPalette,
} from "@/lib/quotations/customerDocument"

type DocumentState = {
  quotation: QuotationSummary
  chargeLines: QuotationChargeLine[]
  cargoLines: QuotationCargoLine[]
  clientContacts: Contact[]
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

        const [chargeLines, cargoLines, clientContacts] = await Promise.all([
          getQuotationChargeLines(id),
          getQuotationCargoLines(id),
          getContactsByClientId(quotation.client_id),
        ])

        if (cancelled) {
          return
        }

        setDetails({
          quotation,
          chargeLines,
          cargoLines,
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

  const visibleOptionSummaries = useMemo(() => {
    if (!details) {
      return []
    }

    return getVisibleCustomerOptionSummaries(details.chargeLines)
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

  const { quotation, cargoLines, clientContacts } = details
  const primaryContact = getPrimaryContact(clientContacts)
  const pdfHref = `/quotations/${quotation.id}/document/pdf`

  return (
    <main
      className="min-h-screen px-4 py-8 text-[#0F172A] print:bg-white print:px-0 print:py-0"
      style={{
        background: `linear-gradient(180deg, ${priorityPalette.navy} 0%, #10294d 34%, #F6F8FB 34%, #F6F8FB 100%)`,
      }}
    >
      <div className="mx-auto max-w-5xl space-y-6 rounded-[2rem] border border-[#D7DEE8] bg-white p-8 shadow-[0_30px_80px_rgba(11,31,59,0.16)] print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <div className="flex flex-col gap-3 print:hidden md:flex-row md:items-center md:justify-between">
          <Link
            href={`/quotations/${quotation.id}`}
            className="rounded-md border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-medium text-[#111827] hover:bg-[#F9FAFB]"
          >
            Regresar a cotizacion
          </Link>
          <Link
            href={pdfHref}
            target="_blank"
            className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8]"
          >
            Descargar PDF
          </Link>
        </div>

        <header
          className="overflow-hidden rounded-[1.75rem] border pb-0"
          style={{
            borderColor: "#D7DEE8",
            background: `linear-gradient(135deg, ${priorityPalette.navy} 0%, #122B52 60%, ${priorityPalette.burgundy} 100%)`,
          }}
        >
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.45fr)_20rem]">
            <div className="px-7 py-7">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <div className="rounded-2xl bg-white/95 p-4 shadow-[0_18px_40px_rgba(11,31,59,0.18)]">
                  <Image
                    src="/assets/logo-horizontal-transparent.png"
                    alt="Priority Freight Intelligence"
                    width={520}
                    height={150}
                    className="h-auto w-full object-contain"
                    unoptimized
                    priority
                  />
                </div>
                <div className="mt-6 max-w-3xl space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
                    Priority Freight Intelligence
                  </div>
                  <h1 className="text-4xl font-semibold tracking-tight text-white">
                    Cotizacion Comercial
                  </h1>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/8 px-4 py-3 ring-1 ring-white/10">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                    Referencia
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white">
                    {quotation.reference_number || "Pendiente"}
                  </div>
                </div>
                <div className="rounded-2xl bg-white/8 px-4 py-3 ring-1 ring-white/10">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                    Fecha de emision
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white">
                    {new Date().toLocaleDateString("es-MX")}
                  </div>
                </div>
                <div className="rounded-2xl bg-white/8 px-4 py-3 ring-1 ring-white/10">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                    Fecha requerida
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white">
                    {quotation.required_quote_date || "No disponible"}
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-white/10 bg-white/5 px-7 py-7 lg:border-l lg:border-t-0">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/60">
                  Dirigido a
                </div>
                <div className="mt-4 text-3xl font-semibold leading-tight text-white">
                  {quotation.client_name || "Cliente"}
                </div>
                <div className="mt-6 space-y-3 text-base text-[#E5E5E5]">
                  <div>{primaryContact?.name || "Sin contacto principal"}</div>
                  <div>{primaryContact?.email || "Sin correo"}</div>
                  <div>{primaryContact?.phone || "Sin telefono"}</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-[#E7EAF0] bg-[#FBFCFE] p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
              Servicio
            </div>
            <div className="mt-1 text-sm font-medium text-[#111827]">{quotation.service_type || "—"}</div>
          </div>
          <div className="rounded-xl border border-[#E7EAF0] bg-[#FBFCFE] p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
              Transporte
            </div>
            <div className="mt-1 text-sm font-medium text-[#111827]">
              {quotation.transport_type || "—"}
            </div>
          </div>
          <div className="rounded-xl border border-[#E7EAF0] bg-[#FBFCFE] p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
              Tipo de operacion
            </div>
            <div className="mt-1 text-sm font-medium text-[#111827]">
              {quotation.operation_type || "—"}
            </div>
          </div>
          <div className="rounded-xl border border-[#E7EAF0] bg-[#FBFCFE] p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
              Incoterm
            </div>
            <div className="mt-1 text-sm font-medium text-[#111827]">
              {quotation.incoterm_code || "—"}
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-[#E7EAF0] p-5 shadow-sm">
          <h2 className="text-lg font-semibold" style={{ color: priorityPalette.navy }}>
            Informacion de la Ruta
          </h2>
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

        <section className="rounded-2xl border border-[#E7EAF0] p-5 shadow-sm">
          <h2 className="text-lg font-semibold" style={{ color: priorityPalette.navy }}>
            Informacion de Carga
          </h2>
          <div className="mt-5 overflow-x-auto rounded-xl border border-[#E7EAF0]">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
              <thead className="text-left text-xs font-semibold uppercase tracking-wide text-white" style={{ backgroundColor: priorityPalette.navy }}>
                <tr>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Cantidad</th>
                  <th className="px-4 py-3">Dimensiones</th>
                  <th className="px-4 py-3">Peso</th>
                  <th className="px-4 py-3">Commodities</th>
                  <th className="px-4 py-3">CBM</th>
                  <th className="px-4 py-3">KG / VOL</th>
                  <th className="px-4 py-3">Clase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] bg-white">
                {cargoLines.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-[#6B7280]">
                      No hay detalles de carga capturados todavia.
                    </td>
                  </tr>
                ) : (
                  cargoLines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-3 text-[#475569]">{line.load_type}</td>
                      <td className="px-4 py-3 text-[#475569]">{line.piece_count ?? "—"}</td>
                      <td className="px-4 py-3 text-[#475569]">
                        {[line.width, line.length, line.height].every((value) => value != null)
                          ? `${line.width} x ${line.length} x ${line.height} cm`
                          : "No disponible"}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {line.weight != null ? `${line.weight} kg` : "No disponible"}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">{line.commodities || "No disponible"}</td>
                      <td className="px-4 py-3 text-[#475569]">
                        {line.cbm != null ? line.cbm.toFixed(3) : "No disponible"}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {line.volumetric_weight_kg != null
                          ? line.volumetric_weight_kg.toFixed(2)
                          : "No disponible"}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">{line.freight_class || "No disponible"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-[#E7EAF0] p-5 shadow-sm">
          <h2 className="text-lg font-semibold" style={{ color: priorityPalette.navy }}>
            Opciones de la Cotizacion
          </h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            Vista comercial para cliente. No incluye proveedor ni costo de compra.
          </p>

          {visibleOptionSummaries.length === 0 ? (
            <div className="mt-5 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-6 text-center text-sm text-[#6B7280]">
              Todavia no hay opciones comerciales listas para compartir.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {visibleOptionSummaries.map((option) => (
                <section key={option.optionId} className="overflow-hidden rounded-xl border border-[#E7EAF0]">
                  <div
                    className="flex flex-col gap-3 border-b px-4 py-4 md:flex-row md:items-center md:justify-between"
                    style={{
                      borderColor: "#E7EAF0",
                      background: `linear-gradient(90deg, ${priorityPalette.navy} 0%, #15315d 70%, ${priorityPalette.burgundy} 100%)`,
                    }}
                  >
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-white/70">
                        {option.optionLabel}
                      </div>
                      <div className="mt-1 text-sm text-[#E5E5E5]">
                        {option.lines.length} cargo(s) comerciales
                      </div>
                      <div className="mt-1 text-sm text-[#E5E5E5]">
                        Vigencia de la propuesta: {option.salesValidUntil || "No disponible"}
                      </div>
                    </div>
                    <div className="grid gap-1 text-sm text-white md:text-right">
                      <div>Subtotal MXN: {formatCurrency(option.subtotalMxn)}</div>
                      <div className="font-semibold">Total MXN: {formatCurrency(option.totalMxn)}</div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                      <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                        <tr>
                          <th className="px-4 py-3">Concepto</th>
                          <th className="px-4 py-3">Venta</th>
                          <th className="px-4 py-3">IVA</th>
                          <th className="px-4 py-3">Total MXN</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB] bg-white">
                        {option.lines.map((line) => {
                          const saleMxn = line.sale_amount_mxn ?? line.sale_amount ?? 0
                          const totalMxn = saleMxn * (1 + (line.vat_rate ?? 0) / 100)

                          return (
                            <tr key={line.id}>
                              <td className="px-4 py-3 text-[#475569]">
                                {line.accounting_concept || line.service_name}
                              </td>
                              <td className="px-4 py-3 text-[#475569]">
                                {formatCurrency(line.sale_amount, line.sale_currency)}
                              </td>
                              <td className="px-4 py-3 text-[#475569]">{line.vat_rate}%</td>
                              <td className="px-4 py-3 font-medium text-[#111827]">
                                {formatCurrency(totalMxn)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {getCustomerOptionRemarks(option.lines).length > 0 ? (
                    <div className="border-t border-[#E5E7EB] bg-[#FBFCFE] px-4 py-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-[#800020]">
                        Remarks:
                      </div>
                      <div className="mt-3 space-y-3">
                        {getCustomerOptionRemarks(option.lines).map((remark, index) => (
                          <div key={`${remark.heading}-${index}`}>
                            <div className="text-xs font-semibold uppercase tracking-wide text-[#111827]">
                              {remark.heading}:
                            </div>
                            <div className="mt-1 text-sm leading-6 text-[#475569]">{remark.note}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#E7EAF0] bg-[#FBFCFE] p-6 text-center shadow-sm">
          <p className="mx-auto max-w-3xl text-base leading-8 text-[#475569]">
            Propuesta formal de servicio logístico preparada para evaluación comercial.
            Los importes mostrados corresponden únicamente a la versión dirigida al cliente
          </p>
        </section>
      </div>
    </main>
  )
}
