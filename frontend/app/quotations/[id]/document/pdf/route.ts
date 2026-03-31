import { createElement, type ReactElement } from "react"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer"
import { CustomerQuotationPdf } from "@/components/quotations/CustomerQuotationPdf"
import { brandAssets, normalizePublicAssetPath } from "@/lib/brand"
import {
  mapContact,
  mapQuotationCargoLine,
  mapQuotationChargeLine,
  mapQuotationSummary,
} from "@/lib/db/mappers"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

async function getLogoDataUri() {
  const assetPath = path.join(
    process.cwd(),
    "public",
    normalizePublicAssetPath(brandAssets.documents.customerQuotation)
  )
  const file = await readFile(assetPath)
  return `data:image/png;base64,${file.toString("base64")}`
}

function sanitizeFilename(value: string | null | undefined) {
  return String(value || "cotizacion")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createSupabaseServerClient()

  const [quotationResult, chargeLinesResult, cargoLinesResult] = await Promise.all([
    supabase.from("quotation_summary_view").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("quotation_cost_line_secure_view")
      .select("*")
      .eq("quotation_id", id)
      .order("option_sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("quotation_cargo_lines")
      .select("*")
      .eq("quotation_id", id)
      .order("sort_order", { ascending: true }),
  ])

  if (quotationResult.error) {
    return NextResponse.json({ error: quotationResult.error.message }, { status: 400 })
  }

  const quotationRow = quotationResult.data as Record<string, unknown> | null
  if (!quotationRow) {
    return NextResponse.json({ error: "Quotation not found" }, { status: 404 })
  }

  if (chargeLinesResult.error) {
    return NextResponse.json({ error: chargeLinesResult.error.message }, { status: 400 })
  }

  if (cargoLinesResult.error) {
    return NextResponse.json({ error: cargoLinesResult.error.message }, { status: 400 })
  }

  const quotation = mapQuotationSummary(quotationRow)

  const contactsResult = await supabase
    .from("contacts")
    .select("id,client_id,name,email,phone,linkedin_url,position,status,is_primary,created_at,updated_at")
    .eq("client_id", quotation.client_id)
    .order("created_at", { ascending: false })

  if (contactsResult.error) {
    return NextResponse.json({ error: contactsResult.error.message }, { status: 400 })
  }

  const chargeLines = ((chargeLinesResult.data ?? []) as Record<string, unknown>[]).map(
    mapQuotationChargeLine
  )
  const cargoLines = ((cargoLinesResult.data ?? []) as Record<string, unknown>[]).map(
    mapQuotationCargoLine
  )
  const clientContacts = ((contactsResult.data ?? []) as Record<string, unknown>[]).map(
    mapContact
  )
  const logoDataUri = await getLogoDataUri()

  const pdfDocument = createElement(CustomerQuotationPdf, {
    quotation,
    chargeLines,
    cargoLines,
    clientContacts,
    logoDataUri,
  }) as ReactElement<DocumentProps>

  const pdfBuffer = await renderToBuffer(pdfDocument)

  const fileName = `${sanitizeFilename(quotation.reference_number)}.pdf`

  return new NextResponse(pdfBuffer as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  })
}
