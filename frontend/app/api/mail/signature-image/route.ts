import { NextResponse } from "next/server"
import {
  isProxyableSignatureImageUrl,
  normalizeSignatureImageUrl,
} from "@/lib/mail/signatures"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const sourceUrl = normalizeSignatureImageUrl(requestUrl.searchParams.get("src"))

  if (!sourceUrl || !isProxyableSignatureImageUrl(sourceUrl)) {
    return NextResponse.json({ error: "Invalid signature image URL." }, { status: 400 })
  }

  const upstreamResponse = await fetch(sourceUrl, {
    headers: {
      "User-Agent": "Priority ERP Signature Proxy",
    },
    cache: "force-cache",
  })

  if (!upstreamResponse.ok) {
    return NextResponse.json({ error: "Could not fetch signature image." }, { status: 502 })
  }

  const contentType = upstreamResponse.headers.get("content-type")?.trim() || ""
  if (!contentType.toLowerCase().startsWith("image/")) {
    return NextResponse.json({ error: "Signature source is not an image." }, { status: 415 })
  }

  const buffer = await upstreamResponse.arrayBuffer()

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  })
}
