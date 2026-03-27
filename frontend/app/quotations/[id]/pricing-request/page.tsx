"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import {
  getQuotationById,
  getQuotationCargoLines,
  type QuotationCargoLine,
  type QuotationSummary,
} from "@/lib/db"

type PricingRequestState = {
  quotation: QuotationSummary
  cargoLines: QuotationCargoLine[]
}

const priorityPalette = {
  navy: "#0B1F3B",
  burgundy: "#800020",
  lightText: "#E5E5E5",
}

export default function QuotationPricingRequestPage() {
  const params = useParams()
  const quotationId = typeof params?.id === "string" ? params.id : undefined

  const [details, setDetails] = useState<PricingRequestState | null>(null)
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

        const cargoLines = await getQuotationCargoLines(id)
        if (cancelled) {
          return
        }

        setDetails({ quotation, cargoLines })
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

  if (!quotationId) {
    return <div className="p-8 text-sm text-[#6B7280]">Quotation id no valido.</div>
  }

  if (loading && !details) {
    return <div className="p-8 text-sm text-[#6B7280]">Cargando solicitud a proveedor...</div>
  }

  if (!details) {
    return <div className="p-8 text-sm text-[#6B7280]">No se encontro la cotizacion.</div>
  }

  const { quotation, cargoLines } = details
  const pdfHref = `/quotations/${quotation.id}/pricing-request/pdf`

  return (
    <main
      className="min-h-screen px-4 py-8 text-[#0F172A] print:bg-white print:px-0 print:py-0"
      style={{
        background: `linear-gradient(180deg, ${priorityPalette.navy} 0%, #10294d 30%, #F6F8FB 30%, #F6F8FB 100%)`,
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
          className="rounded-[1.75rem] border px-7 py-7"
          style={{
            borderColor: "#D7DEE8",
            background: `linear-gradient(135deg, ${priorityPalette.navy} 0%, #15315d 65%, ${priorityPalette.burgundy} 100%)`,
          }}
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-5">
              <div className="rounded-2xl bg-white/8 p-3 ring-1 ring-white/10">
                <Image
                  src="/assets/logo-horizontal-dark-transparent.png"
                  alt="Priority Freight Intelligence"
                  width={520}
                  height={150}
                  className="h-auto w-full max-w-[20rem] object-contain"
                  unoptimized
                  priority
                />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">
                  Documento interno de pricing
                </div>
                <h1 className="mt-3 text-3xl font-semibold text-white">
                  Solicitud de Cotizacion a Proveedor
                </h1>
                <div className="mt-3 max-w-2xl text-sm leading-6" style={{ color: priorityPalette.lightText }}>
                  Solicitud interna para recopilacion de costos. Este documento no contiene el nombre del cliente ni importes comerciales.
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-white/8 px-4 py-3 ring-1 ring-white/10">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                Referencia interna
              </div>
              <div className="mt-1 text-sm font-semibold text-white">
                {quotation.reference_number || "Pendiente"}
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-3">
          <div className="rounded-xl border border-[#E7EAF0] bg-[#FBFCFE] p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
              Servicio
            </div>
            <div className="mt-1 text-sm font-medium text-[#111827]">
              {[quotation.service_type, quotation.transport_type].filter(Boolean).join(" / ") ||
                "No disponible"}
            </div>
          </div>
          <div className="rounded-xl border border-[#E7EAF0] bg-[#FBFCFE] p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
              Tipo de operacion
            </div>
            <div className="mt-1 text-sm font-medium text-[#111827]">
              {quotation.operation_type || "No disponible"}
            </div>
          </div>
          <div className="rounded-xl border border-[#E7EAF0] bg-[#FBFCFE] p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
              Incoterm
            </div>
            <div className="mt-1 text-sm font-medium text-[#111827]">
              {quotation.incoterm_code || "No disponible"}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#E7EAF0] p-5 shadow-sm">
          <h2 className="text-lg font-semibold" style={{ color: priorityPalette.navy }}>
            Informacion de la Cotizacion
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
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
                Fecha requerida para la cotizacion
              </div>
              <div className="mt-1 text-sm text-[#111827]">
                {quotation.required_quote_date || "No disponible"}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#E7EAF0] p-5 shadow-sm">
          <h2 className="text-lg font-semibold" style={{ color: priorityPalette.navy }}>
            Ruta
          </h2>
          <div className="mt-4 grid gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                Direccion de recoleccion
              </div>
              <div className="mt-1 text-sm text-[#111827]">
                {quotation.pickup_address || "No disponible"}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                Direccion de entrega
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
                      No hay informacion de carga capturada todavia.
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
                      <td className="px-4 py-3 text-[#475569]">
                        {line.commodities || "No disponible"}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {line.cbm != null ? line.cbm.toFixed(3) : "No disponible"}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {line.volumetric_weight_kg != null
                          ? line.volumetric_weight_kg.toFixed(2)
                          : "No disponible"}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {line.freight_class || "No disponible"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
