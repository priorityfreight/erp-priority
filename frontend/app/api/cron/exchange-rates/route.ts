import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import { fetchBanxicoExchangeRates } from "@/lib/server/exchangeRates/banxico"

function isAuthorized(request: Request) {
  const cronHeader = request.headers.get("x-vercel-cron")
  if (cronHeader) {
    return true
  }

  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get("authorization")

  if (!secret || !authHeader) {
    return false
  }

  return authHeader === `Bearer ${secret}`
}

function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("Missing Supabase server credentials for exchange rate cron.")
  }

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const days = Math.max(Number(url.searchParams.get("days") ?? "7"), 1)
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days)
    const rows = await fetchBanxicoExchangeRates({
      startDate,
      endDate: now,
    })

    const adminClient = createAdminClient()
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

    return NextResponse.json({
      syncedRows: payload.length,
      refreshedOpenQuotations: Number(refreshedCount ?? 0),
      windowStart: startDate.toISOString().slice(0, 10),
      windowEnd: now.toISOString().slice(0, 10),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 400 }
    )
  }
}
