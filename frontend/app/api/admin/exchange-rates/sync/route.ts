import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { fetchBanxicoExchangeRates } from "@/lib/server/exchangeRates/banxico"

function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("Missing Supabase server credentials for exchange rate sync.")
  }

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function ensureAdminSession() {
  const sessionClient = await createSupabaseServerClient()
  const { data, error } = await sessionClient.rpc("get_current_erp_user")
  const currentUser = Array.isArray(data) ? data[0] : data

  if (error || !currentUser || currentUser.role_name !== "Admin") {
    throw new Error("forbidden")
  }
}

async function syncExchangeRates(days: number) {
  const adminClient = createAdminClient()
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - Math.max(days, 1))
  const rows = await fetchBanxicoExchangeRates({
    startDate,
    endDate: now,
  })

  const payload = rows.map((row) => ({
    rate_date: row.rateDate,
    base_currency: row.baseCurrency,
    quote_currency: row.quoteCurrency,
    rate_value: row.rateValue,
    source: row.source,
    source_series_code: row.sourceSeriesCode,
  }))

  if (payload.length > 0) {
    const { error } = await adminClient
      .from("exchange_rates")
      .upsert(payload, { onConflict: "rate_date,base_currency,quote_currency,source" })

    if (error) {
      throw error
    }
  }

  const { data: refreshedCount, error: refreshError } = await adminClient.rpc(
    "refresh_open_quotation_exchange_rates",
    {
      p_reference_date: now.toISOString().slice(0, 10),
    } as never
  )

  if (refreshError) {
    throw refreshError
  }

  return {
    syncedRows: payload.length,
    refreshedOpenQuotations: Number(refreshedCount ?? 0),
    windowStart: startDate.toISOString().slice(0, 10),
    windowEnd: now.toISOString().slice(0, 10),
  }
}

export async function POST(request: Request) {
  try {
    await ensureAdminSession()
    const url = new URL(request.url)
    const days = Number(url.searchParams.get("days") ?? "7")
    const result = await syncExchangeRates(days)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error."

    if (message === "forbidden") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
