import { createElement, type ReactElement } from "react"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer"
import { ProviderPricingRequestPdf } from "@/components/quotations/ProviderPricingRequestPdf"
import { mapQuotationCargoLine, mapQuotationSummary } from "@/lib/db/mappers"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

async function getLogoDataUri() {
  const assetPath = path.join(
    process.cwd(),
    "public",
    "assets",
    "logo-horizontal-dark-transparent.png"
  )
  const file = await readFile(assetPath)
  return `data:image/png;base64,${file.toString("base64")}`
}

function sanitizeFilename(value: string | null | undefined) {
  return String(value || "solicitud")
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

  const [quotationResult, cargoLinesResult] = await Promise.all([
    supabase.from("quotation_summary_view").select("*").eq("id", id).maybeSingle(),
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

  if (cargoLinesResult.error) {
    return NextResponse.json({ error: cargoLinesResult.error.message }, { status: 400 })
  }

  const quotation = mapQuotationSummary(quotationRow)
  const cargoLines = ((cargoLinesResult.data ?? []) as Record<string, unknown>[]).map(
    mapQuotationCargoLine
  )
  const logoDataUri = await getLogoDataUri()

  const pdfDocument = createElement(ProviderPricingRequestPdf, {
    quotation,
    cargoLines,
    logoDataUri,
  }) as ReactElement<DocumentProps>

  const pdfBuffer = await renderToBuffer(pdfDocument)
  const fileName = `${sanitizeFilename(quotation.reference_number)}_pricing_request.pdf`

  return new NextResponse(pdfBuffer as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  })
}
