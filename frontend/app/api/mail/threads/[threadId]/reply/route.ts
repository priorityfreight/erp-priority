import { NextResponse } from "next/server"
import { toMailRouteError } from "@/lib/server/mail/http"
import { replyToThread } from "@/lib/server/mail/service"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  context: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await context.params
    const payload = await request.json()
    await replyToThread(threadId, payload)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return toMailRouteError(error)
  }
}
