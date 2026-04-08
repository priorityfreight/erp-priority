import { NextResponse } from "next/server"
import { toMailRouteError } from "@/lib/server/mail/http"
import { getMailThreadDetail } from "@/lib/server/mail/service"

export const runtime = "nodejs"

export async function GET(
  _request: Request,
  context: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await context.params
    return NextResponse.json(await getMailThreadDetail(threadId))
  } catch (error) {
    return toMailRouteError(error)
  }
}
