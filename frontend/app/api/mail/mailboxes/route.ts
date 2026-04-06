import { NextResponse } from "next/server"
import { toMailRouteError } from "@/lib/server/mail/http"
import { listMailboxes, upsertMailbox } from "@/lib/server/mail/service"

export const runtime = "nodejs"

export async function GET() {
  try {
    return NextResponse.json(await listMailboxes())
  } catch (error) {
    return toMailRouteError(error)
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    return NextResponse.json(await upsertMailbox(payload))
  } catch (error) {
    return toMailRouteError(error)
  }
}
