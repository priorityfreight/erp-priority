import { NextResponse } from "next/server"
import { queryUnlocodeSnapshot } from "@/lib/masterData/unlocodeSnapshot"

export async function GET(request: Request) {
  // Temporary rollback safety only. The canonical UN/LOCODE path is the
  // Supabase-backed unlocode_lookup_view plus search_unlocodes().
  const { searchParams } = new URL(request.url)

  const result = await queryUnlocodeSnapshot({
    query: searchParams.get("query") ?? "",
    countryCode: searchParams.get("country") ?? "all",
    page: Number(searchParams.get("page") ?? "1"),
    pageSize: Number(searchParams.get("pageSize") ?? "25"),
  })

  return NextResponse.json(result)
}
