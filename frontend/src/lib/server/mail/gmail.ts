import type { MailAddress } from "@/lib/mail/types"
import { normalizeSignatureImageUrl } from "@/lib/mail/signatures"

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
] as const

type GmailHeader = {
  name?: string
  value?: string
}

type GmailMessagePayload = {
  mimeType?: string
  filename?: string
  body?: {
    data?: string
    attachmentId?: string
  }
  headers?: GmailHeader[]
  parts?: GmailMessagePayload[]
}

type GmailMessage = {
  id: string
  threadId: string
  labelIds?: string[]
  snippet?: string
  internalDate?: string
  payload?: GmailMessagePayload
}

type GmailThread = {
  id: string
  messages?: GmailMessage[]
}

type GmailTokenResponse = {
  access_token: string
  expires_in?: number
  refresh_token?: string
  scope?: string
  token_type?: string
}

function getGoogleClientCredentials() {
  const clientId = process.env.GMAIL_CLIENT_ID?.trim()
  const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim()

  if (!clientId || !clientSecret) {
    throw new Error("Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET.")
  }

  return {
    clientId,
    clientSecret,
  }
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url")
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8")
}

function encodeMimeHeader(value: string) {
  return /^[\x00-\x7F]*$/.test(value)
    ? value
    : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function buildHtmlBodyWithSignature(body: string, signatureImageUrl: string) {
  const escapedBody = escapeHtml(body.trim()).replace(/\r?\n/g, "<br />")
  const escapedSignatureUrl = escapeHtml(signatureImageUrl)

  return [
    '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#111827;">',
    `<div>${escapedBody}</div>`,
    '<br />',
    '<div>',
    `<img src="${escapedSignatureUrl}" alt="Firma" style="display:block;max-width:520px;width:100%;height:auto;border:0;" />`,
    '</div>',
    '</div>',
  ].join("")
}

function buildOutgoingMailLines(input: {
  to: string[]
  cc?: string[]
  subject: string
  body: string
  signatureImageUrl?: string | null
  extraHeaders?: Array<string | null>
}) {
  const signatureImageUrl = normalizeSignatureImageUrl(input.signatureImageUrl)
  const body = input.body.trim()
  const contentType = signatureImageUrl
    ? "Content-Type: text/html; charset=UTF-8"
    : "Content-Type: text/plain; charset=UTF-8"
  const renderedBody = signatureImageUrl
    ? buildHtmlBodyWithSignature(body, signatureImageUrl)
    : body

  return [
    `To: ${input.to.join(", ")}`,
    input.cc && input.cc.length > 0 ? `Cc: ${input.cc.join(", ")}` : null,
    `Subject: ${encodeMimeHeader(input.subject)}`,
    contentType,
    "MIME-Version: 1.0",
    ...(input.extraHeaders ?? []),
    "",
    renderedBody,
  ].filter((line): line is string => line !== null)
}

function stripHtmlToText(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
}

function stripQuotedReplyText(value: string) {
  const lines = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
  const quoteStartIndex = lines.findIndex((line) => {
    const trimmed = line.trim()

    return (
      /^>/.test(trimmed) ||
      /^-{2,}\s*Original Message\s*-{2,}$/i.test(trimmed) ||
      /^On .+ wrote:$/i.test(trimmed) ||
      /^El\s+.+\sescribi[oó]:$/i.test(trimmed)
    )
  })

  if (quoteStartIndex <= 0) {
    return value.trim()
  }

  return lines.slice(0, quoteStartIndex).join("\n").trim()
}

function findPayloadByMimeType(payload: GmailMessagePayload | undefined, mimeType: string): GmailMessagePayload | null {
  if (!payload) {
    return null
  }

  if (payload.mimeType?.toLowerCase() === mimeType.toLowerCase()) {
    return payload
  }

  for (const child of payload.parts ?? []) {
    const candidate = findPayloadByMimeType(child, mimeType)
    if (candidate) {
      return candidate
    }
  }

  return null
}

function hasAttachment(payload: GmailMessagePayload | undefined): boolean {
  if (!payload) {
    return false
  }

  if (payload.filename && payload.filename.trim().length > 0) {
    return true
  }

  return (payload.parts ?? []).some((child) => hasAttachment(child))
}

function getHeaderValue(headers: GmailHeader[] | undefined, name: string) {
  const normalizedName = name.toLowerCase()
  return (
    headers?.find((header) => header.name?.toLowerCase() === normalizedName)?.value?.trim() ??
    null
  )
}

export function normalizeMailSubject(subject: string | null | undefined) {
  return (subject ?? "").replace(/\s+/g, " ").trim()
}

export function parseMailAddressList(value: string | null | undefined): MailAddress[] {
  const source = value?.trim()

  if (!source) {
    return []
  }

  return source
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const match = entry.match(/^(?:"?([^"]*)"?\s)?<?([^<>\s]+@[^<>\s]+)>?$/)
      if (!match) {
        return {
          name: null,
          address: entry.toLowerCase(),
        }
      }

      const [, name, address] = match
      return {
        name: name?.trim() ? name.trim() : null,
        address: address.toLowerCase(),
      }
    })
}

function getMessageBodyText(payload: GmailMessagePayload | undefined) {
  const plain = findPayloadByMimeType(payload, "text/plain")
  if (plain?.body?.data) {
    return stripQuotedReplyText(decodeBase64Url(plain.body.data))
  }

  const html = findPayloadByMimeType(payload, "text/html")
  if (html?.body?.data) {
    return stripQuotedReplyText(stripHtmlToText(decodeBase64Url(html.body.data)))
  }

  if (payload?.body?.data) {
    return stripQuotedReplyText(stripHtmlToText(decodeBase64Url(payload.body.data)))
  }

  return null
}

async function googleTokenRequest(params: URLSearchParams) {
  const { clientId, clientSecret } = getGoogleClientCredentials()

  params.set("client_id", clientId)
  params.set("client_secret", clientSecret)

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const payload = await response.text()
    throw new Error(`Google OAuth token request failed: ${payload}`)
  }

  return (await response.json()) as GmailTokenResponse
}

export function buildGmailOAuthUrl(input: {
  redirectUri: string
  state: string
  loginHint?: string | null
}) {
  const { clientId } = getGoogleClientCredentials()
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")

  url.searchParams.set("client_id", clientId)
  url.searchParams.set("redirect_uri", input.redirectUri)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", GMAIL_SCOPES.join(" "))
  url.searchParams.set("access_type", "offline")
  url.searchParams.set("prompt", "consent")
  url.searchParams.set("include_granted_scopes", "true")
  url.searchParams.set("state", input.state)
  if (input.loginHint?.trim()) {
    url.searchParams.set("login_hint", input.loginHint.trim())
  }

  return url.toString()
}

export async function exchangeGmailOAuthCode(input: {
  code: string
  redirectUri: string
}) {
  return googleTokenRequest(
    new URLSearchParams({
      code: input.code,
      redirect_uri: input.redirectUri,
      grant_type: "authorization_code",
    })
  )
}

export async function refreshGmailAccessToken(refreshToken: string) {
  const token = await googleTokenRequest(
    new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    })
  )

  return token.access_token
}

async function gmailRequest<T>(path: string, accessToken: string, searchParams?: URLSearchParams, init?: RequestInit) {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/${path}`)
  searchParams?.forEach((value, key) => url.searchParams.append(key, value))

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const payload = await response.text()
    throw new Error(`Gmail request failed: ${payload}`)
  }

  return (await response.json()) as T
}

export async function listRecentInboxMessages(accessToken: string, maxResults = 50) {
  const payload = await gmailRequest<{ messages?: Array<{ id: string; threadId: string }> }>(
    "users/me/messages",
    accessToken,
    new URLSearchParams({
      labelIds: "INBOX",
      maxResults: String(maxResults),
      includeSpamTrash: "false",
    })
  )

  return payload.messages ?? []
}

export async function getGmailMessageMetadata(accessToken: string, messageId: string) {
  const searchParams = new URLSearchParams({
    format: "metadata",
  })
  ;[
    "From",
    "To",
    "Cc",
    "Bcc",
    "Reply-To",
    "Subject",
    "Date",
    "Message-ID",
    "In-Reply-To",
    "References",
  ].forEach((headerName) => searchParams.append("metadataHeaders", headerName))

  const message = await gmailRequest<GmailMessage>(
    `users/me/messages/${messageId}`,
    accessToken,
    searchParams
  )

  const headers = message.payload?.headers
  const subject = normalizeMailSubject(getHeaderValue(headers, "Subject"))
  const from = parseMailAddressList(getHeaderValue(headers, "From"))[0] ?? null
  const to = parseMailAddressList(getHeaderValue(headers, "To"))
  const cc = parseMailAddressList(getHeaderValue(headers, "Cc"))
  const bcc = parseMailAddressList(getHeaderValue(headers, "Bcc"))
  const replyTo = parseMailAddressList(getHeaderValue(headers, "Reply-To"))
  const internalDate = message.internalDate ? new Date(Number(message.internalDate)).toISOString() : null

  return {
    gmailMessageId: message.id,
    gmailThreadId: message.threadId,
    subject,
    snippet: message.snippet?.trim() || null,
    from,
    to,
    cc,
    bcc,
    replyTo,
    internetMessageId: getHeaderValue(headers, "Message-ID"),
    references: getHeaderValue(headers, "References"),
    inReplyTo: getHeaderValue(headers, "In-Reply-To"),
    sentAt: internalDate,
    receivedAt: internalDate,
    labelIds: message.labelIds ?? [],
    hasAttachments: hasAttachment(message.payload),
  }
}

export async function getGmailThread(accessToken: string, gmailThreadId: string) {
  const thread = await gmailRequest<GmailThread>(
    `users/me/threads/${gmailThreadId}`,
    accessToken,
    new URLSearchParams({
      format: "full",
    })
  )

  return {
    id: thread.id,
    messages: (thread.messages ?? []).map((message) => {
      const headers = message.payload?.headers
      const subject = normalizeMailSubject(getHeaderValue(headers, "Subject"))
      const from = parseMailAddressList(getHeaderValue(headers, "From"))[0] ?? null
      const to = parseMailAddressList(getHeaderValue(headers, "To"))
      const cc = parseMailAddressList(getHeaderValue(headers, "Cc"))
      const internalDate = message.internalDate ? new Date(Number(message.internalDate)).toISOString() : null

      return {
        gmailMessageId: message.id,
        gmailThreadId: message.threadId,
        internetMessageId: getHeaderValue(headers, "Message-ID"),
        inReplyTo: getHeaderValue(headers, "In-Reply-To"),
        references: getHeaderValue(headers, "References"),
        subject,
        from,
        to,
        cc,
        sentAt: internalDate,
        receivedAt: internalDate,
        labelIds: message.labelIds ?? [],
        snippet: message.snippet?.trim() || null,
        bodyText: getMessageBodyText(message.payload),
        hasAttachments: hasAttachment(message.payload),
      }
    }),
  }
}

export async function getConnectedGmailAddress(accessToken: string) {
  const profile = await gmailRequest<{ emailAddress?: string }>("users/me/profile", accessToken)
  return profile.emailAddress?.trim().toLowerCase() ?? null
}

export async function sendGmailReply(input: {
  accessToken: string
  gmailThreadId: string
  subject: string
  to: string[]
  cc?: string[]
  inReplyTo?: string | null
  references?: string | null
  body: string
  signatureImageUrl?: string | null
}) {
  const subject = normalizeMailSubject(input.subject) || "Sin asunto"
  const normalizedSubject = /^re:/i.test(subject) ? subject : `Re: ${subject}`
  const lines = buildOutgoingMailLines({
    to: input.to,
    cc: input.cc,
    subject: normalizedSubject,
    body: input.body,
    signatureImageUrl: input.signatureImageUrl,
    extraHeaders: [
      input.inReplyTo ? `In-Reply-To: ${input.inReplyTo}` : null,
      input.references ? `References: ${input.references}` : null,
    ],
  })

  const raw = toBase64Url(lines.join("\r\n"))

  const response = await gmailRequest<GmailMessage>(
    "users/me/messages/send",
    input.accessToken,
    undefined,
    {
      method: "POST",
      body: JSON.stringify({
        raw,
        threadId: input.gmailThreadId,
      }),
    }
  )

  return {
    gmailMessageId: response.id,
    gmailThreadId: response.threadId,
  }
}

export async function sendGmailMessage(input: {
  accessToken: string
  subject: string
  to: string[]
  cc?: string[]
  body: string
  signatureImageUrl?: string | null
}) {
  const lines = buildOutgoingMailLines({
    to: input.to,
    cc: input.cc,
    subject: normalizeMailSubject(input.subject),
    body: input.body,
    signatureImageUrl: input.signatureImageUrl,
  })

  const raw = toBase64Url(lines.join("\r\n"))

  const response = await gmailRequest<GmailMessage>(
    "users/me/messages/send",
    input.accessToken,
    undefined,
    {
      method: "POST",
      body: JSON.stringify({
        raw,
      }),
    }
  )

  return {
    gmailMessageId: response.id,
    gmailThreadId: response.threadId,
  }
}
