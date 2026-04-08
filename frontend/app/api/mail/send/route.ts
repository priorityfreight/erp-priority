import { NextResponse } from "next/server"
import { toMailRouteError } from "@/lib/server/mail/http"
import { sendMail } from "@/lib/server/mail/service"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    return NextResponse.json(await sendMail(payload))
  } catch (error) {
    return toMailRouteError(error)
  }
}
