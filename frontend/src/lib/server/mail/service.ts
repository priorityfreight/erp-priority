import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type {
  MailAddress,
  MailboxRoleOption,
  MailSendPayload,
  MailSendResult,
  MailboxSummary,
  MailboxUpsertPayload,
  MailEntityType,
  MailReplyPayload,
  MailSyncResult,
  MailThreadDetail,
  MailThreadLink,
  MailThreadMessage,
  MailThreadSummary,
} from "@/lib/mail/types"
import {
  buildSignatureImageRenderUrl,
  getMailAppBaseUrl,
  normalizeSignatureImageUrl,
} from "@/lib/mail/signatures"
import { decryptMailSecret, encryptMailSecret, signMailOAuthState, verifyMailOAuthState } from "./crypto"
import {
  buildGmailOAuthUrl,
  exchangeGmailOAuthCode,
  getConnectedGmailAddress,
  getGmailMessageMetadata,
  getGmailThread,
  listRecentInboxMessages,
  normalizeMailSubject,
  refreshGmailAccessToken,
  sendGmailMessage,
  sendGmailReply,
} from "./gmail"

type CurrentSessionUser = {
  id: string
  roleName: string | null
}

type MailboxRow = {
  id: string
  email: string
  display_name: string
  provider: "gmail"
  status: "draft" | "active" | "disabled" | "error"
  sync_mode: "manual" | "polling"
  gmail_refresh_token_encrypted: string | null
  connected_email: string | null
  last_synced_at: string | null
  last_sync_status: string | null
  last_sync_error: string | null
  signature_image_url: string | null
}

type MailThreadRow = {
  id: string
  mailbox_id: string
  gmail_thread_id: string
  subject: string | null
  snippet: string | null
  participants_json: MailAddress[]
  latest_message_at: string | null
  oldest_message_at: string | null
  unread_count: number
  message_count: number
  has_attachments: boolean
}

type MailMessageRow = {
  id: string
  gmail_message_id: string
  subject: string | null
  direction: "inbound" | "outbound"
  from_name: string | null
  from_address: string | null
  to_json: MailAddress[]
  cc_json: MailAddress[]
  snippet: string | null
  sent_at: string | null
  received_at: string | null
  has_attachments: boolean
  internet_message_id: string | null
  thread_id: string
}

type MailLinkRow = {
  id: string
  thread_id: string
  entity_type: MailEntityType
  entity_id: string
  link_source: "subject_reference" | "participant_email" | "manual"
  confidence: number
  is_primary: boolean
}

function mapMailboxSummary(
  row: MailboxRow,
  roleIds: string[] = [],
  roleNames: string[] = []
): MailboxSummary {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    provider: row.provider,
    status: row.status,
    syncMode: row.sync_mode,
    connectedEmail: row.connected_email,
    lastSyncedAt: row.last_synced_at,
    lastSyncStatus: row.last_sync_status,
    lastSyncError: row.last_sync_error,
    signatureImageUrl: row.signature_image_url,
    roleIds,
    roleNames,
    hasRefreshToken: Boolean(row.gmail_refresh_token_encrypted),
  }
}

function formatEntityHref(entityType: MailEntityType, entityId: string) {
  if (entityType === "client") return `/clients/${entityId}`
  if (entityType === "quotation") return `/quotations/${entityId}`
  if (entityType === "shipment") return `/shipments/${entityId}`
  if (entityType === "contact") return `/contacts`
  return null
}

function dedupeAddresses(addresses: MailAddress[]) {
  const seen = new Set<string>()
  return addresses.filter((address) => {
    const normalized = address.address.trim().toLowerCase()
    if (!normalized || seen.has(normalized)) {
      return false
    }
    seen.add(normalized)
    return true
  })
}

function extractSubjectCandidates(subject: string) {
  const candidates = new Set<string>()
  const quotationMatches = subject.match(/\bQPRI[A-Z]{3}-\d{6}\b/gi) ?? []
  const shipmentMatches = subject.match(/\bSHP-\d{8}-[A-F0-9]{6}\b/gi) ?? []

  quotationMatches.forEach((value) => candidates.add(value.toUpperCase()))
  shipmentMatches.forEach((value) => candidates.add(value.toUpperCase()))

  return Array.from(candidates)
}

function asMailAddressArray(value: unknown): MailAddress[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null
      }

      const address = String((entry as { address?: string }).address ?? "").trim().toLowerCase()
      if (!address) {
        return null
      }

      return {
        name:
          typeof (entry as { name?: unknown }).name === "string" &&
          String((entry as { name?: string }).name).trim()
            ? String((entry as { name?: string }).name).trim()
            : null,
        address,
      }
    })
    .filter((entry): entry is MailAddress => Boolean(entry))
}

function normalizeInboxThread(row: Record<string, unknown>): MailThreadRow {
  return {
    id: String(row.id),
    mailbox_id: String(row.mailbox_id),
    gmail_thread_id: String(row.gmail_thread_id),
    subject: (row.subject as string | null | undefined) ?? null,
    snippet: (row.snippet as string | null | undefined) ?? null,
    participants_json: asMailAddressArray(row.participants_json),
    latest_message_at: (row.latest_message_at as string | null | undefined) ?? null,
    oldest_message_at: (row.oldest_message_at as string | null | undefined) ?? null,
    unread_count: Number(row.unread_count ?? 0),
    message_count: Number(row.message_count ?? 0),
    has_attachments: Boolean(row.has_attachments ?? false),
  }
}

function normalizeMessageRow(row: Record<string, unknown>): MailMessageRow {
  return {
    id: String(row.id),
    gmail_message_id: String(row.gmail_message_id),
    subject: (row.subject as string | null | undefined) ?? null,
    direction: String(row.direction ?? "inbound") === "outbound" ? "outbound" : "inbound",
    from_name: (row.from_name as string | null | undefined) ?? null,
    from_address: (row.from_address as string | null | undefined) ?? null,
    to_json: asMailAddressArray(row.to_json),
    cc_json: asMailAddressArray(row.cc_json),
    snippet: (row.snippet as string | null | undefined) ?? null,
    sent_at: (row.sent_at as string | null | undefined) ?? null,
    received_at: (row.received_at as string | null | undefined) ?? null,
    has_attachments: Boolean(row.has_attachments ?? false),
    internet_message_id: (row.internet_message_id as string | null | undefined) ?? null,
    thread_id: String(row.thread_id),
  }
}

function normalizeMailboxRow(row: Record<string, unknown>): MailboxRow {
  return {
    id: String(row.id),
    email: String(row.email ?? "").trim().toLowerCase(),
    display_name: String(row.display_name ?? ""),
    provider: "gmail",
    status: (row.status as MailboxRow["status"]) ?? "draft",
    sync_mode: (row.sync_mode as MailboxRow["sync_mode"]) ?? "manual",
    gmail_refresh_token_encrypted:
      (row.gmail_refresh_token_encrypted as string | null | undefined) ?? null,
    connected_email: (row.connected_email as string | null | undefined) ?? null,
    last_synced_at: (row.last_synced_at as string | null | undefined) ?? null,
    last_sync_status: (row.last_sync_status as string | null | undefined) ?? null,
    last_sync_error: (row.last_sync_error as string | null | undefined) ?? null,
    signature_image_url: (row.signature_image_url as string | null | undefined) ?? null,
  }
}

async function getCurrentSessionUser() {
  const sessionClient = await createSupabaseServerClient()
  const { data, error } = await sessionClient.rpc("get_current_erp_user")
  const currentUser = Array.isArray(data) ? data[0] : data

  if (error || !currentUser) {
    throw new Error("forbidden")
  }

  return {
    sessionClient,
    currentUser: {
      id: String(currentUser.id),
      roleName:
        typeof currentUser.role_name === "string" && currentUser.role_name.trim()
          ? currentUser.role_name
          : null,
    } satisfies CurrentSessionUser,
  }
}

async function requireAdminSession() {
  const { sessionClient, currentUser } = await getCurrentSessionUser()
  if (currentUser.roleName !== "Admin") {
    throw new Error("forbidden")
  }

  return {
    sessionClient,
    currentUser,
    adminClient: createSupabaseAdminClient(),
  }
}

async function getAccessibleMailboxes(sessionClient: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data, error } = await sessionClient
    .from("mailboxes" as never)
    .select(
      "id,email,display_name,provider,status,sync_mode,gmail_refresh_token_encrypted,connected_email,last_synced_at,last_sync_status,last_sync_error,signature_image_url"
    )
    .order("display_name", { ascending: true })

  if (error) {
    throw error
  }

  return ((data ?? []) as Record<string, unknown>[]).map(normalizeMailboxRow)
}

async function getMailboxRoles(adminClient: ReturnType<typeof createSupabaseAdminClient>, mailboxIds: string[]) {
  if (mailboxIds.length === 0) {
    return new Map<string, { roleIds: string[]; roleNames: string[] }>()
  }

  const { data, error } = await adminClient
    .from("mailbox_role_access" as never)
    .select("mailbox_id, role_id, roles(name)")
    .in("mailbox_id", mailboxIds)

  if (error) {
    throw error
  }

  const map = new Map<string, { roleIds: string[]; roleNames: string[] }>()

  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const mailboxId = String(row.mailbox_id)
    const existing = map.get(mailboxId) ?? { roleIds: [], roleNames: [] }
    existing.roleIds.push(String(row.role_id))

    const role = row.roles as { name?: string } | null | undefined
    if (role?.name) {
      existing.roleNames.push(String(role.name))
    }

    map.set(mailboxId, existing)
  }

  return map
}

async function hydrateLinkLabels(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  linkRows: MailLinkRow[]
) {
  const byType = new Map<MailEntityType, Set<string>>()
  linkRows.forEach((link) => {
    const current = byType.get(link.entity_type) ?? new Set<string>()
    current.add(link.entity_id)
    byType.set(link.entity_type, current)
  })

  const labels = new Map<string, string>()

  const clientIds = Array.from(byType.get("client") ?? [])
  if (clientIds.length > 0) {
    const { data } = await adminClient
      .from("clients")
      .select("id, company_name")
      .in("id", clientIds)
    ;((data ?? []) as Record<string, unknown>[]).forEach((row) => {
      labels.set(`client:${row.id}`, String(row.company_name ?? "Cliente"))
    })
  }

  const contactIds = Array.from(byType.get("contact") ?? [])
  if (contactIds.length > 0) {
    const { data } = await adminClient
      .from("contacts")
      .select("id, name")
      .in("id", contactIds)
    ;((data ?? []) as Record<string, unknown>[]).forEach((row) => {
      labels.set(`contact:${row.id}`, String(row.name ?? "Contacto"))
    })
  }

  const quotationIds = Array.from(byType.get("quotation") ?? [])
  if (quotationIds.length > 0) {
    const { data } = await adminClient
      .from("quotation_summary_view")
      .select("id, reference_number")
      .in("id", quotationIds)
    ;((data ?? []) as Record<string, unknown>[]).forEach((row) => {
      labels.set(`quotation:${row.id}`, String(row.reference_number ?? "Cotización"))
    })
  }

  const shipmentIds = Array.from(byType.get("shipment") ?? [])
  if (shipmentIds.length > 0) {
    const { data } = await adminClient
      .from("shipments")
      .select("id, shipment_reference")
      .in("id", shipmentIds)
    ;((data ?? []) as Record<string, unknown>[]).forEach((row) => {
      labels.set(`shipment:${row.id}`, String(row.shipment_reference ?? "Shipment"))
    })
  }

  return labels
}

async function loadThreadLinks(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  threadIds: string[]
) {
  if (threadIds.length === 0) {
    return new Map<string, MailThreadLink[]>()
  }

  const { data, error } = await adminClient
    .from("mail_entity_links" as never)
    .select("id, thread_id, entity_type, entity_id, link_source, confidence, is_primary")
    .in("thread_id", threadIds)
    .is("message_id", null)
    .order("is_primary", { ascending: false })
    .order("confidence", { ascending: false })

  if (error) {
    throw error
  }

  const rows = ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    thread_id: String(row.thread_id),
    entity_type: String(row.entity_type) as MailEntityType,
    entity_id: String(row.entity_id),
    link_source: String(row.link_source) as MailLinkRow["link_source"],
    confidence: Number(row.confidence ?? 0),
    is_primary: Boolean(row.is_primary ?? false),
  }))

  const labels = await hydrateLinkLabels(adminClient, rows)
  const grouped = new Map<string, MailThreadLink[]>()

  rows.forEach((row) => {
    const current = grouped.get(row.thread_id) ?? []
    current.push({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      linkSource: row.link_source,
      confidence: row.confidence,
      isPrimary: row.is_primary,
      label: labels.get(`${row.entity_type}:${row.entity_id}`) ?? row.entity_id,
      href: formatEntityHref(row.entity_type, row.entity_id),
    })
    grouped.set(row.thread_id, current)
  })

  return grouped
}

function mapThreadSummary(
  row: MailThreadRow,
  mailboxEmail: string,
  links: MailThreadLink[]
): MailThreadSummary {
  return {
    id: row.id,
    mailboxId: row.mailbox_id,
    mailboxEmail,
    gmailThreadId: row.gmail_thread_id,
    subject: row.subject || "Sin asunto",
    snippet: row.snippet,
    participants: row.participants_json,
    latestMessageAt: row.latest_message_at,
    oldestMessageAt: row.oldest_message_at,
    unreadCount: row.unread_count,
    messageCount: row.message_count,
    hasAttachments: row.has_attachments,
    links,
  }
}

async function getMailboxByIdForAdmin(adminClient: ReturnType<typeof createSupabaseAdminClient>, mailboxId: string) {
  const { data, error } = await adminClient
    .from("mailboxes" as never)
    .select("*")
    .eq("id", mailboxId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ? normalizeMailboxRow(data as Record<string, unknown>) : null
}

async function ensureMailboxAccess(mailboxId: string) {
  const { sessionClient } = await getCurrentSessionUser()
  const mailboxes = await getAccessibleMailboxes(sessionClient)
  const mailbox = mailboxes.find((entry) => entry.id === mailboxId)

  if (!mailbox) {
    throw new Error("forbidden")
  }

  return mailbox
}

async function getMailboxAccessToken(mailbox: MailboxRow) {
  if (!mailbox.gmail_refresh_token_encrypted) {
    throw new Error(`Mailbox ${mailbox.email} is not connected to Gmail.`)
  }

  return refreshGmailAccessToken(decryptMailSecret(mailbox.gmail_refresh_token_encrypted))
}

function buildParticipantsFromMessage(message: {
  from: MailAddress | null
  to: MailAddress[]
  cc: MailAddress[]
  bcc?: MailAddress[]
}) {
  return dedupeAddresses(
    ([message.from].filter(Boolean) as MailAddress[]).concat(message.to, message.cc, message.bcc ?? [])
  )
}

async function upsertThreadAndMessageFromMetadata(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  mailbox: MailboxRow,
  message: Awaited<ReturnType<typeof getGmailMessageMetadata>>
) {
  const participants = buildParticipantsFromMessage(message)
  const { data: existingThreadData } = await adminClient
    .from("mail_threads" as never)
    .select("id, mailbox_id, gmail_thread_id, subject, snippet, participants_json, latest_message_at, oldest_message_at, unread_count, message_count, has_attachments")
    .eq("mailbox_id", mailbox.id)
    .eq("gmail_thread_id", message.gmailThreadId)
    .maybeSingle()

  const existingThread = existingThreadData
    ? normalizeInboxThread(existingThreadData as Record<string, unknown>)
    : null
  const { data: existingMessageData } = await adminClient
    .from("mail_messages" as never)
    .select("id")
    .eq("mailbox_id", mailbox.id)
    .eq("gmail_message_id", message.gmailMessageId)
    .maybeSingle()
  const alreadyIndexed = Boolean(existingMessageData)
  const latestMessageAt =
    existingThread?.latest_message_at && message.receivedAt
      ? existingThread.latest_message_at > message.receivedAt
        ? existingThread.latest_message_at
        : message.receivedAt
      : existingThread?.latest_message_at ?? message.receivedAt
  const oldestMessageAt =
    existingThread?.oldest_message_at && message.receivedAt
      ? existingThread.oldest_message_at < message.receivedAt
        ? existingThread.oldest_message_at
        : message.receivedAt
      : existingThread?.oldest_message_at ?? message.receivedAt
  const unreadCount = existingThread
    ? Math.max(existingThread.unread_count, message.labelIds.includes("UNREAD") ? 1 : 0)
    : message.labelIds.includes("UNREAD")
      ? 1
      : 0
  const messageCount = existingThread
    ? existingThread.message_count + (alreadyIndexed ? 0 : 1)
    : 1

  const { error: threadUpsertError } = await adminClient.from("mail_threads" as never).upsert(
    {
      mailbox_id: mailbox.id,
      gmail_thread_id: message.gmailThreadId,
      subject: message.subject,
      subject_normalized: normalizeMailSubject(message.subject).toLowerCase(),
      snippet: message.snippet,
      participants_json: dedupeAddresses((existingThread?.participants_json ?? []).concat(participants)),
      latest_message_at: latestMessageAt,
      oldest_message_at: oldestMessageAt,
      unread_count: unreadCount,
      message_count: messageCount,
      has_attachments: Boolean(existingThread?.has_attachments) || message.hasAttachments,
      last_synced_at: new Date().toISOString(),
    } as never,
    {
      onConflict: "mailbox_id,gmail_thread_id",
    }
  )

  if (threadUpsertError) {
    throw threadUpsertError
  }

  const { data: threadData, error: threadError } = await adminClient
    .from("mail_threads" as never)
    .select("id, mailbox_id, gmail_thread_id, subject, snippet, participants_json, latest_message_at, oldest_message_at, unread_count, message_count, has_attachments")
    .eq("mailbox_id", mailbox.id)
    .eq("gmail_thread_id", message.gmailThreadId)
    .single()

  if (threadError) {
    throw threadError
  }

  const thread = normalizeInboxThread(threadData as Record<string, unknown>)
  const direction =
    message.from?.address && message.from.address.toLowerCase() === mailbox.email.toLowerCase()
      ? "outbound"
      : "inbound"

  const { error: messageError } = await adminClient.from("mail_messages" as never).upsert(
    {
      mailbox_id: mailbox.id,
      thread_id: thread.id,
      gmail_message_id: message.gmailMessageId,
      gmail_thread_id: message.gmailThreadId,
      internet_message_id: message.internetMessageId,
      direction,
      from_name: message.from?.name ?? null,
      from_address: message.from?.address ?? null,
      to_json: message.to,
      cc_json: message.cc,
      bcc_json: message.bcc,
      reply_to_json: message.replyTo,
      subject: message.subject,
      snippet: message.snippet,
      sent_at: message.sentAt,
      received_at: message.receivedAt,
      label_ids: message.labelIds,
      has_attachments: message.hasAttachments,
    } as never,
    {
      onConflict: "mailbox_id,gmail_message_id",
    }
  )

  if (messageError) {
    throw messageError
  }

  await rebuildAutomaticLinks(adminClient, {
    mailboxId: mailbox.id,
    threadId: thread.id,
    subject: thread.subject || "",
    participants: thread.participants_json,
  })

  return thread
}

async function upsertManualThreadLinks(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  input: {
    mailboxId: string
    threadId: string
    links: Array<{ entityType: MailEntityType; entityId: string; isPrimary?: boolean }>
  }
) {
  if (input.links.length === 0) {
    return
  }

  const { data: existingRows, error: existingError } = await adminClient
    .from("mail_entity_links" as never)
    .select("entity_type, entity_id, link_source")
    .eq("thread_id", input.threadId)
    .is("message_id", null)
    .eq("link_source", "manual")

  if (existingError) {
    throw existingError
  }

  const existingKeys = new Set(
    ((existingRows ?? []) as Record<string, unknown>[]).map(
      (row) => `${String(row.entity_type)}:${String(row.entity_id)}:${String(row.link_source)}`
    )
  )
  const inserts = input.links
    .filter((link) => link.entityId.trim())
    .filter((link) => !existingKeys.has(`${link.entityType}:${link.entityId}:manual`))
    .map((link) => ({
      mailbox_id: input.mailboxId,
      thread_id: input.threadId,
      entity_type: link.entityType,
      entity_id: link.entityId,
      link_source: "manual",
      confidence: 1,
      is_primary: Boolean(link.isPrimary),
    }))

  if (inserts.length === 0) {
    return
  }

  const { error } = await adminClient.from("mail_entity_links" as never).insert(inserts as never)
  if (error) {
    throw error
  }
}

function chooseDefaultOutgoingMailbox(mailboxes: MailboxRow[]) {
  const connected = mailboxes.filter(
    (mailbox) => mailbox.status === "active" && Boolean(mailbox.gmail_refresh_token_encrypted)
  )

  if (connected.length === 0) {
    return null
  }

  const preferredKeywords = ["pricing", "quote", "cotiza", "rates", "procurement"]
  return (
    connected.find((mailbox) => {
      const haystack = `${mailbox.display_name} ${mailbox.email}`.toLowerCase()
      return preferredKeywords.some((keyword) => haystack.includes(keyword))
    }) ?? connected[0]
  )
}

async function rebuildAutomaticLinks(adminClient: ReturnType<typeof createSupabaseAdminClient>, input: {
  mailboxId: string
  threadId: string
  subject: string
  participants: MailAddress[]
}) {
  await adminClient
    .from("mail_entity_links" as never)
    .delete()
    .eq("thread_id", input.threadId)
    .in("link_source", ["subject_reference", "participant_email"])

  const candidateRefs = extractSubjectCandidates(input.subject)
  let linksCreated = 0
  const createdClientIds = new Set<string>()
  const pendingLinks: Array<{
    mailbox_id: string
    thread_id: string
    entity_type: MailEntityType
    entity_id: string
    link_source: "subject_reference" | "participant_email"
    confidence: number
    is_primary: boolean
  }> = []
  const pendingLinkKeys = new Set<string>()

  function queueLink(link: {
    entityType: MailEntityType
    entityId: string
    linkSource: "subject_reference" | "participant_email"
    confidence: number
    isPrimary: boolean
  }) {
    const normalizedEntityId = link.entityId.trim()
    if (!normalizedEntityId) {
      return
    }

    const key = `${link.entityType}:${normalizedEntityId}:${link.linkSource}`
    if (pendingLinkKeys.has(key)) {
      return
    }

    pendingLinkKeys.add(key)
    pendingLinks.push({
      mailbox_id: input.mailboxId,
      thread_id: input.threadId,
      entity_type: link.entityType,
      entity_id: normalizedEntityId,
      link_source: link.linkSource,
      confidence: link.confidence,
      is_primary: link.isPrimary,
    })
  }

  if (candidateRefs.length > 0) {
    const { data: quotations } = await adminClient
      .from("quotations")
      .select("id, client_id, reference_number")
      .in("reference_number", candidateRefs)

    const { data: shipments } = await adminClient
      .from("shipments")
      .select("id, client_id, shipment_reference")
      .in("shipment_reference", candidateRefs)

    for (const [index, row] of ((quotations ?? []) as Record<string, unknown>[]).entries()) {
      queueLink({
        entityType: "quotation",
        entityId: String(row.id),
        linkSource: "subject_reference",
        confidence: 1,
        isPrimary: index === 0,
      })

      const clientId = String(row.client_id ?? "")
      if (clientId && !createdClientIds.has(clientId)) {
        queueLink({
          entityType: "client",
          entityId: clientId,
          linkSource: "subject_reference",
          confidence: 0.98,
          isPrimary: index === 0,
        })
        createdClientIds.add(clientId)
      }
    }

    for (const row of (shipments ?? []) as Record<string, unknown>[]) {
      queueLink({
        entityType: "shipment",
        entityId: String(row.id),
        linkSource: "subject_reference",
        confidence: 1,
        isPrimary: false,
      })

      const clientId = String(row.client_id ?? "")
      if (clientId && !createdClientIds.has(clientId)) {
        queueLink({
          entityType: "client",
          entityId: clientId,
          linkSource: "subject_reference",
          confidence: 0.98,
          isPrimary: false,
        })
        createdClientIds.add(clientId)
      }
    }
  }

  const participantEmails = Array.from(
    new Set(input.participants.map((entry) => entry.address.trim().toLowerCase()).filter(Boolean))
  )

  if (participantEmails.length > 0) {
    const { data: contacts } = await adminClient
      .from("contacts")
      .select("id, client_id, email")
      .in("email", participantEmails)

    for (const row of (contacts ?? []) as Record<string, unknown>[]) {
      queueLink({
        entityType: "contact",
        entityId: String(row.id),
        linkSource: "participant_email",
        confidence: 0.8,
        isPrimary: false,
      })

      const clientId = String(row.client_id ?? "")
      if (clientId && !createdClientIds.has(clientId)) {
        queueLink({
          entityType: "client",
          entityId: clientId,
          linkSource: "participant_email",
          confidence: 0.75,
          isPrimary: false,
        })
        createdClientIds.add(clientId)
      }
    }
  }

  if (pendingLinks.length > 0) {
    const { error } = await adminClient.from("mail_entity_links" as never).insert(pendingLinks as never)
    if (error) {
      throw error
    }
    linksCreated = pendingLinks.length
  }

  return linksCreated
}

async function syncMailboxInternal(adminClient: ReturnType<typeof createSupabaseAdminClient>, mailbox: MailboxRow, triggerSource: "manual" | "cron"): Promise<MailSyncResult> {
  const { data: syncRun, error: syncRunError } = await adminClient
    .from("mail_sync_runs" as never)
    .insert({
      mailbox_id: mailbox.id,
      trigger_source: triggerSource,
      status: "running",
    } as never)
    .select("id")
    .single()

  if (syncRunError) {
    throw syncRunError
  }

  const syncRunId = String((syncRun as { id?: string }).id ?? "")

  try {
    const accessToken = await getMailboxAccessToken(mailbox)
    const recentInboxItems = await listRecentInboxMessages(accessToken)
    const chunkSize = 10
    const recentMessages: Awaited<ReturnType<typeof getGmailMessageMetadata>>[] = []

    for (let index = 0; index < recentInboxItems.length; index += chunkSize) {
      const chunk = recentInboxItems.slice(index, index + chunkSize)
      const metadataRows = await Promise.all(
        chunk.map((message) => getGmailMessageMetadata(accessToken, message.id))
      )
      recentMessages.push(...metadataRows)
    }

    const groupedThreads = new Map<
      string,
      {
        subject: string
        snippet: string | null
        participants: MailAddress[]
        latestMessageAt: string | null
        oldestMessageAt: string | null
        unreadCount: number
        messageCount: number
        hasAttachments: boolean
      }
    >()

    for (const message of recentMessages) {
      const current = groupedThreads.get(message.gmailThreadId) ?? {
        subject: message.subject || "Sin asunto",
        snippet: message.snippet,
        participants: [],
        latestMessageAt: message.receivedAt,
        oldestMessageAt: message.receivedAt,
        unreadCount: 0,
        messageCount: 0,
        hasAttachments: false,
      }

      current.subject = message.subject || current.subject
      current.snippet = message.snippet || current.snippet
      current.participants = dedupeAddresses(
        current.participants.concat(
          [message.from].filter(Boolean) as MailAddress[],
          message.to,
          message.cc,
          message.bcc
        )
      )
      current.messageCount += 1
      current.hasAttachments = current.hasAttachments || message.hasAttachments
      current.unreadCount += message.labelIds.includes("UNREAD") ? 1 : 0

      if (!current.latestMessageAt || (message.receivedAt && message.receivedAt > current.latestMessageAt)) {
        current.latestMessageAt = message.receivedAt
      }

      if (!current.oldestMessageAt || (message.receivedAt && message.receivedAt < current.oldestMessageAt)) {
        current.oldestMessageAt = message.receivedAt
      }

      groupedThreads.set(message.gmailThreadId, current)
    }

    if (groupedThreads.size === 0) {
      await adminClient
        .from("mailboxes" as never)
        .update({
          status: "active",
          last_synced_at: new Date().toISOString(),
          last_sync_status: "success",
          last_sync_error: null,
        } as never)
        .eq("id", mailbox.id)

      await adminClient
        .from("mail_sync_runs" as never)
        .update({
          status: "success",
          messages_scanned: 0,
          messages_upserted: 0,
          threads_upserted: 0,
          links_created: 0,
          finished_at: new Date().toISOString(),
        } as never)
        .eq("id", syncRunId)

      return {
        mailboxId: mailbox.id,
        mailboxEmail: mailbox.email,
        messagesScanned: 0,
        messagesUpserted: 0,
        threadsUpserted: 0,
        linksCreated: 0,
        status: "success",
      }
    }

    let threadsUpserted = 0
    for (const [gmailThreadId, aggregate] of groupedThreads) {
      const { error } = await adminClient.from("mail_threads" as never).upsert(
        {
          mailbox_id: mailbox.id,
          gmail_thread_id: gmailThreadId,
          subject: aggregate.subject,
          subject_normalized: normalizeMailSubject(aggregate.subject).toLowerCase(),
          snippet: aggregate.snippet,
          participants_json: aggregate.participants,
          latest_message_at: aggregate.latestMessageAt,
          oldest_message_at: aggregate.oldestMessageAt,
          unread_count: aggregate.unreadCount,
          message_count: aggregate.messageCount,
          has_attachments: aggregate.hasAttachments,
          last_synced_at: new Date().toISOString(),
        } as never,
        {
          onConflict: "mailbox_id,gmail_thread_id",
        }
      )

      if (error) {
        throw error
      }

      threadsUpserted += 1
    }

    const { data: threadRows, error: threadRowsError } = await adminClient
      .from("mail_threads" as never)
      .select("id, mailbox_id, gmail_thread_id, subject, snippet, participants_json, latest_message_at, oldest_message_at, unread_count, message_count, has_attachments")
      .eq("mailbox_id", mailbox.id)
      .in("gmail_thread_id", Array.from(groupedThreads.keys()))

    if (threadRowsError) {
      throw threadRowsError
    }

    const threadMap = new Map<string, MailThreadRow>()
    ;((threadRows ?? []) as Record<string, unknown>[]).forEach((row) => {
      const normalized = normalizeInboxThread(row)
      threadMap.set(normalized.gmail_thread_id, normalized)
    })

    let messagesUpserted = 0
    let linksCreated = 0

    for (const message of recentMessages) {
      const thread = threadMap.get(message.gmailThreadId)
      if (!thread) {
        continue
      }

      const direction =
        message.from?.address && message.from.address.toLowerCase() === mailbox.email.toLowerCase()
          ? "outbound"
          : "inbound"

      const { error } = await adminClient.from("mail_messages" as never).upsert(
        {
          mailbox_id: mailbox.id,
          thread_id: thread.id,
          gmail_message_id: message.gmailMessageId,
          gmail_thread_id: message.gmailThreadId,
          internet_message_id: message.internetMessageId,
          direction,
          from_name: message.from?.name ?? null,
          from_address: message.from?.address ?? null,
          to_json: message.to,
          cc_json: message.cc,
          bcc_json: message.bcc,
          reply_to_json: message.replyTo,
          subject: message.subject,
          snippet: message.snippet,
          sent_at: message.sentAt,
          received_at: message.receivedAt,
          label_ids: message.labelIds,
          has_attachments: message.hasAttachments,
        } as never,
        {
          onConflict: "mailbox_id,gmail_message_id",
        }
      )

      if (error) {
        throw error
      }

      messagesUpserted += 1
    }

    for (const thread of threadMap.values()) {
      linksCreated += await rebuildAutomaticLinks(adminClient, {
        mailboxId: mailbox.id,
        threadId: thread.id,
        subject: thread.subject || "",
        participants: thread.participants_json,
      })
    }

    await adminClient
      .from("mailboxes" as never)
      .update({
        status: "active",
        last_synced_at: new Date().toISOString(),
        last_sync_status: "success",
        last_sync_error: null,
      } as never)
      .eq("id", mailbox.id)

    await adminClient
      .from("mail_sync_runs" as never)
      .update({
        status: "success",
        messages_scanned: recentMessages.length,
        messages_upserted: messagesUpserted,
        threads_upserted: threadsUpserted,
        links_created: linksCreated,
        finished_at: new Date().toISOString(),
      } as never)
      .eq("id", syncRunId)

    return {
      mailboxId: mailbox.id,
      mailboxEmail: mailbox.email,
      messagesScanned: recentMessages.length,
      messagesUpserted: messagesUpserted,
      threadsUpserted,
      linksCreated,
      status: "success",
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected sync error."
    await adminClient
      .from("mailboxes" as never)
      .update({
        last_sync_status: "error",
        last_sync_error: message,
      } as never)
      .eq("id", mailbox.id)

    await adminClient
      .from("mail_sync_runs" as never)
      .update({
        status: "error",
        error_message: message,
        finished_at: new Date().toISOString(),
      } as never)
      .eq("id", syncRunId)

    return {
      mailboxId: mailbox.id,
      mailboxEmail: mailbox.email,
      messagesScanned: 0,
      messagesUpserted: 0,
      threadsUpserted: 0,
      linksCreated: 0,
      status: "error",
      errorMessage: message,
    }
  }
}

export async function listMailboxes() {
  const { sessionClient, currentUser } = await getCurrentSessionUser()
  const mailboxes = await getAccessibleMailboxes(sessionClient)

  if (currentUser.roleName !== "Admin") {
    return {
      items: mailboxes.map((row) => mapMailboxSummary(row)),
    }
  }

  const adminClient = createSupabaseAdminClient()
  const rolesByMailbox = await getMailboxRoles(
    adminClient,
    mailboxes.map((entry) => entry.id)
  )

  return {
    items: mailboxes.map((row) => {
      const roles = rolesByMailbox.get(row.id)
      return mapMailboxSummary(row, roles?.roleIds ?? [], roles?.roleNames ?? [])
    }),
  }
}

export async function listMailboxRoleOptions() {
  const { adminClient } = await requireAdminSession()
  const { data, error } = await adminClient.from("roles").select("id, name").order("name", { ascending: true })

  if (error) {
    throw error
  }

  return {
    items: ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      name: String(row.name ?? ""),
    })) satisfies MailboxRoleOption[],
  }
}

export async function upsertMailbox(payload: MailboxUpsertPayload) {
  const { adminClient, currentUser } = await requireAdminSession()
  const normalizedEmail = payload.email.trim().toLowerCase()
  if (!normalizedEmail) {
    throw new Error("Mailbox email is required.")
  }

  const normalizedRoleIds = Array.from(new Set(payload.roleIds.filter(Boolean)))
  if (normalizedRoleIds.length === 0) {
    throw new Error("Select at least one role for mailbox access.")
  }

  const signatureImageUrl = normalizeSignatureImageUrl(payload.signatureImageUrl)
  if (signatureImageUrl) {
    try {
      const parsedUrl = new URL(signatureImageUrl)
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Signature image URL must be http or https.")
      }
    } catch {
      throw new Error("Signature image URL must be a valid public URL.")
    }
  } else if (payload.signatureImageUrl?.trim()) {
    throw new Error("Signature image URL must be a valid public URL.")
  }

  const mailboxRecord = {
    email: normalizedEmail,
    display_name: payload.displayName.trim() || normalizedEmail,
    sync_mode: payload.syncMode,
    status: payload.status ?? "draft",
    signature_image_url: signatureImageUrl,
    connected_by_user_id: currentUser.id,
  }

  let mailboxId = payload.id ?? null
  if (mailboxId) {
    const { error } = await adminClient.from("mailboxes" as never).update(mailboxRecord as never).eq("id", mailboxId)
    if (error) {
      throw error
    }
  } else {
    const { data, error } = await adminClient
      .from("mailboxes" as never)
      .insert(mailboxRecord as never)
      .select("id")
      .single()

    if (error) {
      throw error
    }

    mailboxId = String((data as { id?: string }).id ?? "")
  }

  await adminClient.from("mailbox_role_access" as never).delete().eq("mailbox_id", mailboxId)

  const { error: rolesError } = await adminClient.from("mailbox_role_access" as never).insert(
    normalizedRoleIds.map((roleId) => ({
      mailbox_id: mailboxId,
      role_id: roleId,
    })) as never
  )

  if (rolesError) {
    throw rolesError
  }

  const mailbox = await getMailboxByIdForAdmin(adminClient, mailboxId)
  if (!mailbox) {
    throw new Error("Mailbox was not saved.")
  }

  const roles = await getMailboxRoles(adminClient, [mailboxId])
  const mailboxRoles = roles.get(mailboxId)

  return {
    mailbox: mapMailboxSummary(mailbox, mailboxRoles?.roleIds ?? [], mailboxRoles?.roleNames ?? []),
  }
}

export async function getMailboxOAuthStartUrl(mailboxId: string, redirectUri: string) {
  const { adminClient } = await requireAdminSession()
  const mailbox = await getMailboxByIdForAdmin(adminClient, mailboxId)

  if (!mailbox) {
    throw new Error("Mailbox not found.")
  }

  return buildGmailOAuthUrl({
    redirectUri,
    state: signMailOAuthState(mailboxId),
    loginHint: mailbox.email,
  })
}

export async function completeMailboxOAuth(input: {
  code: string
  state: string
  redirectUri: string
}) {
  const { adminClient, currentUser } = await requireAdminSession()
  const verifiedState = verifyMailOAuthState(input.state)
  const mailbox = await getMailboxByIdForAdmin(adminClient, verifiedState.mailboxId)

  if (!mailbox) {
    throw new Error("Mailbox not found.")
  }

  const token = await exchangeGmailOAuthCode({
    code: input.code,
    redirectUri: input.redirectUri,
  })

  const refreshToken = token.refresh_token
    ? token.refresh_token
    : mailbox.gmail_refresh_token_encrypted
      ? decryptMailSecret(mailbox.gmail_refresh_token_encrypted)
      : null

  if (!refreshToken) {
    throw new Error("Google did not return a refresh token. Retry consent with offline access.")
  }

  const connectedEmail = await getConnectedGmailAddress(token.access_token)

  await adminClient
    .from("mailboxes" as never)
    .update({
      gmail_refresh_token_encrypted: encryptMailSecret(refreshToken),
      gmail_scope: token.scope ?? null,
      connected_email: connectedEmail,
      status: "active",
      connected_by_user_id: currentUser.id,
      last_sync_status: null,
      last_sync_error: null,
    } as never)
    .eq("id", mailbox.id)

  return {
    mailboxId: mailbox.id,
  }
}

export async function listInboxThreads(filters?: {
  mailboxId?: string | null
  query?: string
  entityType?: MailEntityType
  entityId?: string
}) {
  const { sessionClient } = await getCurrentSessionUser()
  const accessibleMailboxes = await getAccessibleMailboxes(sessionClient)
  const mailboxMap = new Map(accessibleMailboxes.map((mailbox) => [mailbox.id, mailbox]))

  let mailboxIds = accessibleMailboxes.map((mailbox) => mailbox.id)
  if (filters?.mailboxId) {
    if (!mailboxMap.has(filters.mailboxId)) {
      throw new Error("forbidden")
    }
    mailboxIds = [filters.mailboxId]
  }

  if (mailboxIds.length === 0) {
    return { items: [] as MailThreadSummary[] }
  }

  const adminClient = createSupabaseAdminClient()
  let threadIdsFilter: string[] | null = null

  if (filters?.entityType && filters.entityId) {
    const { data: linkRows, error: linkError } = await adminClient
      .from("mail_entity_links" as never)
      .select("thread_id")
      .eq("entity_type", filters.entityType)
      .eq("entity_id", filters.entityId)
      .in("mailbox_id", mailboxIds)
      .is("message_id", null)

    if (linkError) {
      throw linkError
    }

    threadIdsFilter = ((linkRows ?? []) as Record<string, unknown>[]).map((row) => String(row.thread_id))
    if (threadIdsFilter.length === 0) {
      return { items: [] as MailThreadSummary[] }
    }
  }

  let query = adminClient
    .from("mail_threads" as never)
    .select("id, mailbox_id, gmail_thread_id, subject, snippet, participants_json, latest_message_at, oldest_message_at, unread_count, message_count, has_attachments")
    .in("mailbox_id", mailboxIds)
    .order("latest_message_at", { ascending: false, nullsFirst: false })
    .limit(100)

  if (threadIdsFilter) {
    query = query.in("id", threadIdsFilter)
  }

  if (filters?.query?.trim()) {
    const normalizedQuery = filters.query.trim().toLowerCase()
    query = query.or(`subject_normalized.ilike.%${normalizedQuery}%,snippet.ilike.%${normalizedQuery}%`)
  }

  const { data, error } = await query
  if (error) {
    throw error
  }

  const threadRows = ((data ?? []) as Record<string, unknown>[]).map(normalizeInboxThread)
  const linksByThread = await loadThreadLinks(
    adminClient,
    threadRows.map((row) => row.id)
  )

  return {
    items: threadRows.map((row) =>
      mapThreadSummary(row, mailboxMap.get(row.mailbox_id)?.email ?? "", linksByThread.get(row.id) ?? [])
    ),
  }
}

export async function getMailThreadDetail(threadId: string) {
  const { sessionClient } = await getCurrentSessionUser()
  const adminClient = createSupabaseAdminClient()
  const { data: threadData, error: threadError } = await adminClient
    .from("mail_threads" as never)
    .select("id, mailbox_id, gmail_thread_id, subject, snippet, participants_json, latest_message_at, oldest_message_at, unread_count, message_count, has_attachments")
    .eq("id", threadId)
    .maybeSingle()

  if (threadError) {
    throw threadError
  }

  if (!threadData) {
    throw new Error("Mail thread not found.")
  }

  const threadRow = normalizeInboxThread(threadData as Record<string, unknown>)
  const accessibleMailboxes = await getAccessibleMailboxes(sessionClient)
  const mailbox = accessibleMailboxes.find((entry) => entry.id === threadRow.mailbox_id)

  if (!mailbox) {
    throw new Error("forbidden")
  }

  const linksByThread = await loadThreadLinks(adminClient, [threadRow.id])
  const summary = mapThreadSummary(threadRow, mailbox.email, linksByThread.get(threadRow.id) ?? [])

  const { data: cachedMessages, error: cachedMessagesError } = await adminClient
    .from("mail_messages" as never)
    .select("id, gmail_message_id, subject, direction, from_name, from_address, to_json, cc_json, snippet, sent_at, received_at, has_attachments, internet_message_id, thread_id")
    .eq("thread_id", threadId)
    .order("sent_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true })

  if (cachedMessagesError) {
    throw cachedMessagesError
  }

  const cachedRows = ((cachedMessages ?? []) as Record<string, unknown>[]).map(normalizeMessageRow)
  const cachedMap = new Map(cachedRows.map((row) => [row.gmail_message_id, row]))

  let liveMessages: MailThreadMessage[] = []
  try {
    const fullMailbox = await getMailboxByIdForAdmin(adminClient, mailbox.id)
    if (fullMailbox?.gmail_refresh_token_encrypted) {
      const accessToken = await getMailboxAccessToken(fullMailbox)
      const liveThread = await getGmailThread(accessToken, summary.gmailThreadId)
      liveMessages = liveThread.messages.map((message, index) => {
        const cached = cachedMap.get(message.gmailMessageId)
        return {
          id: cached?.id ?? `live-${index}`,
          gmailMessageId: message.gmailMessageId,
          subject: message.subject || summary.subject,
          direction:
            message.from?.address && message.from.address.toLowerCase() === mailbox.email.toLowerCase()
              ? "outbound"
              : cached?.direction ?? "inbound",
          from: message.from,
          to: message.to,
          cc: message.cc,
          sentAt: message.sentAt,
          receivedAt: message.receivedAt,
          snippet: message.snippet,
          bodyText: message.bodyText,
          hasAttachments: message.hasAttachments,
        }
      })
    }
  } catch {
    liveMessages = []
  }

  const messages = liveMessages.length > 0
    ? liveMessages
    : cachedRows.map((row) => ({
        id: row.id,
        gmailMessageId: row.gmail_message_id,
        subject: row.subject || summary.subject,
        direction: row.direction,
        from: row.from_address
          ? {
              name: row.from_name,
              address: row.from_address,
            }
          : null,
        to: row.to_json,
        cc: row.cc_json,
        sentAt: row.sent_at,
        receivedAt: row.received_at,
        snippet: row.snippet,
        bodyText: null,
        hasAttachments: row.has_attachments,
      }))

  return {
    thread: summary,
    messages,
  } satisfies MailThreadDetail
}

export async function replyToThread(threadId: string, payload: MailReplyPayload) {
  if (!payload.body.trim()) {
    throw new Error("Reply body is required.")
  }

  if (!payload.to || payload.to.length === 0) {
    throw new Error("Reply recipients are required.")
  }

  const detail = await getMailThreadDetail(threadId)
  const mailbox = await ensureMailboxAccess(detail.thread.mailboxId)
  const adminClient = createSupabaseAdminClient()
  const fullMailbox = await getMailboxByIdForAdmin(adminClient, mailbox.id)

  if (!fullMailbox) {
    throw new Error("Mailbox not found.")
  }

  const accessToken = await getMailboxAccessToken(fullMailbox)
  const { data: latestMessageRow } = await adminClient
    .from("mail_messages" as never)
    .select("internet_message_id, subject")
    .eq("thread_id", threadId)
    .order("received_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const latestInternetMessageId =
    latestMessageRow && typeof latestMessageRow === "object"
      ? ((latestMessageRow as { internet_message_id?: string | null }).internet_message_id ?? null)
      : null
  let replySubject = detail.thread.subject
  let replyInReplyTo = latestInternetMessageId
  let replyReferences = latestInternetMessageId

  try {
    const liveThread = await getGmailThread(accessToken, detail.thread.gmailThreadId)
    const messagesWithDates = liveThread.messages.map((message) => ({
      message,
      date: message.sentAt || message.receivedAt || "",
    }))
    const latestInboundLiveMessage = messagesWithDates
      .filter(({ message }) => {
        const fromAddress = message.from?.address?.trim().toLowerCase()
        return Boolean(message.internetMessageId) && fromAddress !== fullMailbox.email
      })
      .sort((left, right) => right.date.localeCompare(left.date))[0]?.message ?? null
    const latestReferencedLiveMessage =
      latestInboundLiveMessage ??
      liveThread.messages.reduce<
      (typeof liveThread.messages)[number] | null
      >((latest, message) => {
        if (!message.internetMessageId) {
          return latest
        }
        const latestDate = latest?.sentAt || latest?.receivedAt || ""
        const messageDate = message.sentAt || message.receivedAt || ""
        return !latest || messageDate > latestDate ? message : latest
      }, null)

    replySubject =
      liveThread.messages.find((message) => message.subject?.trim())?.subject ||
      detail.thread.subject
    replyInReplyTo = latestReferencedLiveMessage?.internetMessageId ?? replyInReplyTo
    replyReferences = [latestReferencedLiveMessage?.references, replyInReplyTo]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value))
      .join(" ") || replyReferences
  } catch {
    replySubject =
      latestMessageRow && typeof latestMessageRow === "object"
        ? ((latestMessageRow as { subject?: string | null }).subject ?? detail.thread.subject)
        : detail.thread.subject
  }

  const sentMessage = await sendGmailReply({
    accessToken,
    gmailThreadId: detail.thread.gmailThreadId,
    subject: replySubject,
    to: payload.to,
    cc: payload.cc,
    inReplyTo: replyInReplyTo,
    references: replyReferences,
    body: payload.body,
    signatureImageUrl: buildSignatureImageRenderUrl(fullMailbox.signature_image_url, {
      appBaseUrl: getMailAppBaseUrl(),
      forEmail: true,
    }),
  })

  const sentMetadata = await getGmailMessageMetadata(accessToken, sentMessage.gmailMessageId)
  await upsertThreadAndMessageFromMetadata(adminClient, fullMailbox, sentMetadata)
  await syncMailboxInternal(adminClient, fullMailbox, "manual")
}

export async function sendMail(payload: MailSendPayload) {
  const normalizedSubject = normalizeMailSubject(payload.subject)
  const normalizedBody = payload.body.trim()
  const normalizedTo = Array.from(
    new Set(payload.to.map((entry) => entry.trim().toLowerCase()).filter(Boolean))
  )
  const normalizedCc = Array.from(
    new Set((payload.cc ?? []).map((entry) => entry.trim().toLowerCase()).filter(Boolean))
  )

  if (!normalizedSubject) {
    throw new Error("Mail subject is required.")
  }

  if (!normalizedBody) {
    throw new Error("Mail body is required.")
  }

  if (normalizedTo.length === 0) {
    throw new Error("At least one recipient is required.")
  }

  const { sessionClient } = await getCurrentSessionUser()
  const accessibleMailboxes = await getAccessibleMailboxes(sessionClient)
  const selectedMailbox = payload.mailboxId
    ? accessibleMailboxes.find((mailbox) => mailbox.id === payload.mailboxId)
    : chooseDefaultOutgoingMailbox(accessibleMailboxes)

  if (!selectedMailbox) {
    throw new Error("No connected mailbox is available for sending.")
  }

  const adminClient = createSupabaseAdminClient()
  const fullMailbox = await getMailboxByIdForAdmin(adminClient, selectedMailbox.id)

  if (!fullMailbox) {
    throw new Error("Mailbox not found.")
  }

  const accessToken = await getMailboxAccessToken(fullMailbox)
  const sentMessage = await sendGmailMessage({
    accessToken,
    subject: normalizedSubject,
    body: normalizedBody,
    to: normalizedTo,
    cc: normalizedCc,
    signatureImageUrl: buildSignatureImageRenderUrl(fullMailbox.signature_image_url, {
      appBaseUrl: getMailAppBaseUrl(),
      forEmail: true,
    }),
  })
  const metadata = await getGmailMessageMetadata(accessToken, sentMessage.gmailMessageId)
  const thread = await upsertThreadAndMessageFromMetadata(adminClient, fullMailbox, metadata)

  await upsertManualThreadLinks(adminClient, {
    mailboxId: fullMailbox.id,
    threadId: thread.id,
    links: (payload.entityLinks ?? []).map((link) => ({
      entityType: link.entityType,
      entityId: link.entityId,
      isPrimary: link.isPrimary,
    })),
  })

  return {
    mailboxId: fullMailbox.id,
    mailboxEmail: fullMailbox.email,
    threadId: thread.id,
    gmailThreadId: thread.gmail_thread_id,
  } satisfies MailSendResult
}

export async function syncMailboxes(mailboxId?: string) {
  const { sessionClient } = await getCurrentSessionUser()
  const accessibleMailboxes = await getAccessibleMailboxes(sessionClient)
  const adminClient = createSupabaseAdminClient()

  const targets = mailboxId
    ? accessibleMailboxes.filter((mailbox) => mailbox.id === mailboxId)
    : accessibleMailboxes.filter((mailbox) => mailbox.status !== "disabled")

  if (targets.length === 0) {
    throw new Error("No accessible mailbox available for sync.")
  }

  const results: MailSyncResult[] = []
  for (const mailbox of targets) {
    const fullMailbox = await getMailboxByIdForAdmin(adminClient, mailbox.id)
    if (!fullMailbox) {
      continue
    }
    results.push(await syncMailboxInternal(adminClient, fullMailbox, "manual"))
  }

  return {
    items: results,
  }
}

export async function syncPollingMailboxesFromCron() {
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from("mailboxes" as never)
    .select("*")
    .eq("status", "active")
    .eq("sync_mode", "polling")

  if (error) {
    throw error
  }

  const results: MailSyncResult[] = []
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    results.push(await syncMailboxInternal(adminClient, normalizeMailboxRow(row), "cron"))
  }

  return {
    items: results,
  }
}
