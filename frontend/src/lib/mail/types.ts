export type MailAddress = {
  name: string | null
  address: string
}

export type MailEntityType = "client" | "contact" | "quotation" | "shipment"

export type MailboxSummary = {
  id: string
  email: string
  displayName: string
  provider: "gmail"
  status: "draft" | "active" | "disabled" | "error"
  syncMode: "manual" | "polling"
  connectedEmail: string | null
  lastSyncedAt: string | null
  lastSyncStatus: string | null
  lastSyncError: string | null
  signatureImageUrl: string | null
  roleIds: string[]
  roleNames: string[]
  hasRefreshToken: boolean
}

export type MailThreadLink = {
  id: string
  entityType: MailEntityType
  entityId: string
  linkSource: "subject_reference" | "participant_email" | "manual"
  confidence: number
  isPrimary: boolean
  label: string
  href: string | null
}

export type MailThreadSummary = {
  id: string
  mailboxId: string
  mailboxEmail: string
  gmailThreadId: string
  subject: string
  snippet: string | null
  participants: MailAddress[]
  latestMessageAt: string | null
  oldestMessageAt: string | null
  unreadCount: number
  messageCount: number
  hasAttachments: boolean
  links: MailThreadLink[]
}

export type MailThreadMessage = {
  id: string
  gmailMessageId: string
  subject: string
  direction: "inbound" | "outbound"
  from: MailAddress | null
  to: MailAddress[]
  cc: MailAddress[]
  sentAt: string | null
  receivedAt: string | null
  snippet: string | null
  bodyText: string | null
  hasAttachments: boolean
}

export type MailThreadDetail = {
  thread: MailThreadSummary
  messages: MailThreadMessage[]
}

export type MailboxRoleOption = {
  id: string
  name: string
}

export type MailboxUpsertPayload = {
  id?: string
  email: string
  displayName: string
  syncMode: "manual" | "polling"
  signatureImageUrl?: string | null
  roleIds: string[]
  status?: "draft" | "active" | "disabled" | "error"
}

export type MailReplyPayload = {
  body: string
  to: string[]
  cc?: string[]
}

export type MailSendEntityLink = {
  entityType: MailEntityType
  entityId: string
  isPrimary?: boolean
}

export type MailSendPayload = {
  mailboxId?: string | null
  subject: string
  body: string
  to: string[]
  cc?: string[]
  entityLinks?: MailSendEntityLink[]
}

export type MailSendResult = {
  mailboxId: string
  mailboxEmail: string
  threadId: string
  gmailThreadId: string
}

export type MailSyncResult = {
  mailboxId: string
  mailboxEmail: string
  messagesScanned: number
  messagesUpserted: number
  threadsUpserted: number
  linksCreated: number
  status: "success" | "error"
  errorMessage?: string | null
}
