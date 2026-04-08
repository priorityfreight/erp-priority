import { NextResponse } from "next/server"

export function toMailRouteError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected mail error."

  if (message === "forbidden") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  return NextResponse.json({ error: message }, { status: 400 })
}
