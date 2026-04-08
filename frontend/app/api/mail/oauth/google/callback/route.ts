import { NextResponse } from "next/server"
import { completeMailboxOAuth } from "@/lib/server/mail/service"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const error = url.searchParams.get("error")

  if (error) {
    return NextResponse.redirect(new URL(`/mail?mail_oauth_error=${encodeURIComponent(error)}`, request.url))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/mail?mail_oauth_error=missing_code", request.url))
  }

  try {
    const redirectUri =
      process.env.GMAIL_OAUTH_REDIRECT_URI?.trim() ||
      new URL("/api/mail/oauth/google/callback", request.url).toString()
    await completeMailboxOAuth({
      code,
      state,
      redirectUri,
    })
    return NextResponse.redirect(new URL("/mail?mail_connected=1", request.url))
  } catch (callbackError) {
    const message = callbackError instanceof Error ? callbackError.message : "oauth_failed"
    return NextResponse.redirect(
      new URL(`/mail?mail_oauth_error=${encodeURIComponent(message)}`, request.url)
    )
  }
}
