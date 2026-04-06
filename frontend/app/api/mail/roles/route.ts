import { NextResponse } from "next/server"
import { toMailRouteError } from "@/lib/server/mail/http"
import { listMailboxRoleOptions } from "@/lib/server/mail/service"

export const runtime = "nodejs"

export async function GET() {
  try {
    return NextResponse.json(await listMailboxRoleOptions())
  } catch (error) {
    return toMailRouteError(error)
  }
}
