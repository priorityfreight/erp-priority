import { NextResponse } from "next/server"
import { syncPollingMailboxesFromCron } from "@/lib/server/mail/service"

export const runtime = "nodejs"

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

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    return NextResponse.json(await syncPollingMailboxesFromCron())
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected cron mail sync error."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
