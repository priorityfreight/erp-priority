import { NextResponse } from "next/server"
import { toMailRouteError } from "@/lib/server/mail/http"
import { syncMailboxes } from "@/lib/server/mail/service"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as { mailboxId?: string }
    return NextResponse.json(await syncMailboxes(payload.mailboxId))
  } catch (error) {
    return toMailRouteError(error)
  }
}
