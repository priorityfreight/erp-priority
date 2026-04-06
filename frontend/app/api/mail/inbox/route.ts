import { NextResponse } from "next/server"
import { toMailRouteError } from "@/lib/server/mail/http"
import { listInboxThreads } from "@/lib/server/mail/service"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    return NextResponse.json(
      await listInboxThreads({
        mailboxId: url.searchParams.get("mailboxId"),
        query: url.searchParams.get("query") ?? "",
        entityType:
          (url.searchParams.get("entityType") as "client" | "contact" | "quotation" | "shipment" | null) ??
          undefined,
        entityId: url.searchParams.get("entityId") ?? undefined,
      })
    )
  } catch (error) {
    return toMailRouteError(error)
  }
}
