import type {
  MailboxRoleOption,
  MailboxSummary,
  MailboxUpsertPayload,
  MailEntityType,
  MailReplyPayload,
  MailSyncResult,
  MailThreadDetail,
  MailThreadSummary,
} from "./types"

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error || "Unexpected mail API error.")
  }

  return (await response.json()) as T
}

export async function getMailboxes() {
  return parseJson<{ items: MailboxSummary[] }>(await fetch("/api/mail/mailboxes", { cache: "no-store" }))
}

export async function getMailboxRoleOptions() {
  return parseJson<{ items: MailboxRoleOption[] }>(await fetch("/api/mail/roles", { cache: "no-store" }))
}

export async function saveMailbox(payload: MailboxUpsertPayload) {
  return parseJson<{ mailbox: MailboxSummary }>(
    await fetch("/api/mail/mailboxes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
  )
}

export async function getInboxThreads(params?: {
  mailboxId?: string | null
  query?: string
  entityType?: MailEntityType
  entityId?: string
}) {
  const searchParams = new URLSearchParams()

  if (params?.mailboxId) searchParams.set("mailboxId", params.mailboxId)
  if (params?.query?.trim()) searchParams.set("query", params.query.trim())
  if (params?.entityType) searchParams.set("entityType", params.entityType)
  if (params?.entityId) searchParams.set("entityId", params.entityId)

  const suffix = searchParams.size > 0 ? `?${searchParams.toString()}` : ""
  return parseJson<{ items: MailThreadSummary[] }>(await fetch(`/api/mail/inbox${suffix}`, { cache: "no-store" }))
}

export async function getMailThread(threadId: string) {
  return parseJson<MailThreadDetail>(await fetch(`/api/mail/threads/${threadId}`, { cache: "no-store" }))
}

export async function replyToMailThread(threadId: string, payload: MailReplyPayload) {
  return parseJson<{ ok: true }>(
    await fetch(`/api/mail/threads/${threadId}/reply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
  )
}

export async function syncMailbox(mailboxId?: string) {
  return parseJson<{ items: MailSyncResult[] }>(
    await fetch("/api/mail/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mailboxId ? { mailboxId } : {}),
    })
  )
}
