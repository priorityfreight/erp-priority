import { NextResponse } from "next/server"
import { toMailRouteError } from "@/lib/server/mail/http"
import { getMailboxOAuthStartUrl } from "@/lib/server/mail/service"

export const runtime = "nodejs"

export async function GET(
  request: Request,
  context: { params: Promise<{ mailboxId: string }> }
) {
  try {
    const { mailboxId } = await context.params
    const redirectUri = new URL("/api/mail/oauth/google/callback", request.url).toString()
    const url = await getMailboxOAuthStartUrl(mailboxId, redirectUri)
    return NextResponse.redirect(url)
  } catch (error) {
    return toMailRouteError(error)
  }
}
