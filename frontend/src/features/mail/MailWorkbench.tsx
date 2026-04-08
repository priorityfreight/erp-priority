"use client"

import { useMemo, useState, type ReactNode } from "react"
import { MailIcon, PaperclipIcon, RefreshCcwIcon, ReplyIcon, SearchIcon, XIcon } from "lucide-react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { PriorityEmptyState } from "@/components/priority/PriorityEmptyState"
import { PriorityTypography } from "@/components/priority/PriorityTypography"
import type { MailAddress, MailReplyPayload, MailThreadDetail, MailThreadSummary } from "@/lib/mail/types"

function formatMailDate(value: string | null) {
  if (!value) {
    return "Sin fecha"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "Sin fecha"
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

type MailWorkbenchProps = {
  title: string
  description: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  toolbar?: ReactNode
  threads: MailThreadSummary[]
  selectedThreadId: string | null
  onSelectThread: (threadId: string) => void
  threadDetail: MailThreadDetail | null
  loadingThreads?: boolean
  loadingThread?: boolean
  refreshing?: boolean
  onRefresh?: () => void
  onReply?: (payload: MailReplyPayload) => Promise<void> | void
  replying?: boolean
  emptyTitle: string
  emptyDescription: string
}

function normalizeRecipientAddress(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ""
}

function dedupeRecipients(recipients: MailAddress[]) {
  const seen = new Set<string>()
  return recipients.filter((recipient) => {
    const address = normalizeRecipientAddress(recipient.address)
    if (!address || seen.has(address)) {
      return false
    }

    seen.add(address)
    return true
  })
}

function formatRecipientLabel(recipient: MailAddress) {
  return recipient.name ? `${recipient.name} <${recipient.address}>` : recipient.address
}

function buildReplyDefaults(threadDetail: MailThreadDetail) {
  const mailboxEmail = normalizeRecipientAddress(threadDetail.thread.mailboxEmail)
  const latestInbound = [...threadDetail.messages]
    .reverse()
    .find((message) => message.direction === "inbound" && message.from?.address)
  const sourceMessage =
    latestInbound ??
    [...threadDetail.messages].reverse().find((message) => message.from?.address) ??
    null
  const toRecipients = dedupeRecipients(
    latestInbound?.from && normalizeRecipientAddress(latestInbound.from.address) !== mailboxEmail
      ? [latestInbound.from]
      : []
  )
  const toAddresses = new Set(toRecipients.map((recipient) => normalizeRecipientAddress(recipient.address)))
  const chainRecipients = threadDetail.messages.flatMap((message) =>
    ([message.from].filter(Boolean) as MailAddress[]).concat(message.to, message.cc)
  )
  const ccRecipients = dedupeRecipients(
    chainRecipients.filter((recipient) => {
      const address = normalizeRecipientAddress(recipient.address)
      return address && address !== mailboxEmail && !toAddresses.has(address)
    })
  )

  return {
    sourceMessage,
    to: toRecipients,
    cc: ccRecipients,
  }
}

function RecipientPicker({
  label,
  recipients,
  placeholder,
  draftValue,
  onDraftChange,
  onAdd,
  onRemove,
}: {
  label: string
  recipients: MailAddress[]
  placeholder: string
  draftValue: string
  onDraftChange: (value: string) => void
  onAdd: (value: string) => void
  onRemove: (address: string) => void
}) {
  function commitDraft() {
    if (!draftValue.trim()) {
      return
    }

    onAdd(draftValue)
    onDraftChange("")
  }

  return (
    <div className="grid gap-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">
        {label}
      </div>
      <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-[22px] border border-[#E5E7EB] bg-white px-3 py-2 focus-within:border-[rgba(179,58,91,0.45)] focus-within:ring-4 focus-within:ring-[rgba(179,58,91,0.14)]">
        {recipients.map((recipient) => (
          <span
            key={recipient.address}
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-[#334155]"
          >
            <span className="truncate">{formatRecipientLabel(recipient)}</span>
            <button
              type="button"
              onClick={() => onRemove(recipient.address)}
              className="rounded-full text-[#64748B] hover:text-[var(--brand-navy)]"
              aria-label={`Quitar ${recipient.address}`}
            >
              <XIcon className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={draftValue}
          onChange={(event) => onDraftChange(event.target.value)}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault()
              commitDraft()
            }
          }}
          placeholder={recipients.length === 0 ? placeholder : "Agregar otro correo"}
          className="min-w-[220px] flex-1 bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#94A3B8]"
        />
      </div>
    </div>
  )
}

function ReplyComposer({
  threadDetail,
  onReply,
  replying,
}: {
  threadDetail: MailThreadDetail
  onReply: (payload: MailReplyPayload) => Promise<void> | void
  replying: boolean
}) {
  const defaults = buildReplyDefaults(threadDetail)
  const [replyBody, setReplyBody] = useState("")
  const [replyTo, setReplyTo] = useState<MailAddress[]>(defaults.to)
  const [replyCc, setReplyCc] = useState<MailAddress[]>(defaults.cc)
  const [replyToDraft, setReplyToDraft] = useState("")
  const [replyCcDraft, setReplyCcDraft] = useState("")

  function addRecipients(target: "to" | "cc", value: string) {
    const parsed = value
      .split(",")
      .map((entry) => normalizeRecipientAddress(entry))
      .filter(Boolean)
      .map((address) => ({ name: null, address }))

    if (parsed.length === 0) {
      return
    }

    if (target === "to") {
      const parsedAddresses = new Set(parsed.map((recipient) => normalizeRecipientAddress(recipient.address)))
      setReplyTo((current) => dedupeRecipients(current.concat(parsed)))
      setReplyCc((current) =>
        current.filter((recipient) => !parsedAddresses.has(normalizeRecipientAddress(recipient.address)))
      )
      return
    }

    setReplyCc((current) => {
      const toAddresses = new Set(replyTo.map((recipient) => normalizeRecipientAddress(recipient.address)))
      return dedupeRecipients(current.concat(parsed)).filter(
        (recipient) => !toAddresses.has(normalizeRecipientAddress(recipient.address))
      )
    })
  }

  function removeRecipient(target: "to" | "cc", address: string) {
    const normalizedAddress = normalizeRecipientAddress(address)
    const updater = (current: MailAddress[]) =>
      current.filter((recipient) => normalizeRecipientAddress(recipient.address) !== normalizedAddress)

    if (target === "to") {
      setReplyTo(updater)
      return
    }

    setReplyCc(updater)
  }

  async function handleReplySubmit() {
    const to = replyTo.map((recipient) => recipient.address)
    const cc = replyCc.map((recipient) => recipient.address)

    await onReply({
      body: replyBody,
      to,
      cc,
    })

    setReplyBody("")
  }

  return (
    <div className="border-t border-[rgba(144,158,174,0.16)] px-5 py-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <PriorityTypography variant="eyebrow">Responder a todos</PriorityTypography>
          <div className="mt-2 text-sm text-[#475569]">
            Viene de:{" "}
            <span className="font-semibold text-[var(--brand-navy)]">
              {defaults.sourceMessage?.from ? formatRecipientLabel(defaults.sourceMessage.from) : "Sin remitente detectado"}
            </span>
          </div>
        </div>
        <div className="rounded-full border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#64748B]">
          {replyTo.length + replyCc.length} destinatarios
        </div>
      </div>
      <div className="mt-3 grid gap-3">
        <RecipientPicker
          label="Para"
          recipients={replyTo}
          placeholder="Destinatarios separados por coma"
          draftValue={replyToDraft}
          onDraftChange={setReplyToDraft}
          onAdd={(value) => addRecipients("to", value)}
          onRemove={(address) => removeRecipient("to", address)}
        />
        <RecipientPicker
          label="CC"
          recipients={replyCc}
          placeholder="Correos en copia separados por coma"
          draftValue={replyCcDraft}
          onDraftChange={setReplyCcDraft}
          onAdd={(value) => addRecipients("cc", value)}
          onRemove={(address) => removeRecipient("cc", address)}
        />
        <Textarea
          value={replyBody}
          onChange={(event) => setReplyBody(event.target.value)}
          placeholder="Escribe la respuesta…"
          className="min-h-[132px]"
        />
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => void handleReplySubmit()}
            disabled={replying || !replyBody.trim() || replyTo.length === 0}
          >
            <ReplyIcon className="mr-2 size-4" />
            {replying ? "Enviando…" : "Responder a todos"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function MailWorkbench({
  title,
  description,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Buscar por asunto o snippet",
  toolbar,
  threads,
  selectedThreadId,
  onSelectThread,
  threadDetail,
  loadingThreads = false,
  loadingThread = false,
  refreshing = false,
  onRefresh,
  onReply,
  replying = false,
  emptyTitle,
  emptyDescription,
}: MailWorkbenchProps) {
  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [selectedThreadId, threads]
  )

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <PriorityTypography variant="eyebrow">Correo</PriorityTypography>
          <PriorityTypography as="h2" variant="cardTitle" className="mt-2">
            {title}
          </PriorityTypography>
          <PriorityTypography variant="bodyMuted" className="mt-1">
            {description}
          </PriorityTypography>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {onSearchChange ? (
            <div className="relative min-w-[260px] flex-1 xl:w-[320px] xl:flex-none">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6B7280]" />
              <Input
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9"
              />
            </div>
          ) : null}
          {onRefresh ? (
            <Button type="button" variant="outline" onClick={onRefresh} disabled={refreshing}>
              <RefreshCcwIcon className="mr-2 size-4" />
              {refreshing ? "Actualizando…" : "Actualizar"}
            </Button>
          ) : null}
          {toolbar}
        </div>
      </div>

      {loadingThreads ? (
        <div className="rounded-[26px] border border-[rgba(144,158,174,0.16)] bg-white p-6 text-sm text-[#64748B]">
          Cargando conversaciones…
        </div>
      ) : threads.length === 0 ? (
        <PriorityEmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <ResizablePanelGroup orientation="horizontal" className="hidden min-h-[38rem] gap-4 lg:flex">
          <ResizablePanel defaultSize={38} minSize={28}>
            <div className="h-full overflow-hidden rounded-[26px] border border-[rgba(144,158,174,0.16)] bg-white shadow-[0_24px_48px_-42px_rgba(3,10,24,0.28)]">
              <div className="border-b border-[rgba(144,158,174,0.16)] px-4 py-3">
                <PriorityTypography variant="eyebrow">Threads</PriorityTypography>
                <PriorityTypography variant="bodyMuted" className="mt-1">
                  Nuevos arriba, con vínculo ERP visible.
                </PriorityTypography>
              </div>
              <div className="max-h-[34rem] overflow-y-auto">
                {threads.map((thread) => {
                  const isActive = thread.id === selectedThreadId
                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => onSelectThread(thread.id)}
                      className={`w-full border-b border-[rgba(144,158,174,0.12)] px-4 py-3 text-left transition hover:bg-[rgba(11,31,59,0.03)] ${
                        isActive ? "bg-[rgba(11,31,59,0.05)]" : "bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[var(--brand-navy)]">
                            {thread.subject}
                          </div>
                          <div className="mt-1 truncate text-xs text-[#64748B]">
                            {thread.participants.map((entry) => entry.address).join(", ") || thread.mailboxEmail}
                          </div>
                        </div>
                        <div className="text-right text-[11px] text-[#64748B]">
                          {formatMailDate(thread.latestMessageAt)}
                        </div>
                      </div>
                      <div className="mt-2 line-clamp-2 text-sm text-[#475569]">
                        {thread.snippet || "Sin vista previa."}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {thread.unreadCount > 0 ? (
                          <Badge variant="secondary">{thread.unreadCount} sin leer</Badge>
                        ) : null}
                        {thread.hasAttachments ? (
                          <Badge variant="outline">
                            <PaperclipIcon className="mr-1 size-3" />
                            Adjuntos
                          </Badge>
                        ) : null}
                        {thread.links.slice(0, 3).map((link) => (
                          <Badge key={link.id} variant={link.isPrimary ? "default" : "outline"}>
                            {link.label}
                          </Badge>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-transparent" />

          <ResizablePanel defaultSize={62} minSize={36}>
            <div className="h-full overflow-hidden rounded-[26px] border border-[rgba(144,158,174,0.16)] bg-white shadow-[0_24px_48px_-42px_rgba(3,10,24,0.28)]">
              {!selectedThread || !threadDetail ? (
                <div className="flex h-full items-center justify-center p-8">
                  <PriorityEmptyState
                    title="Selecciona un thread"
                    description="Abre una conversación de la lista para leerla y responderla desde el ERP."
                    icon={<MailIcon className="size-6" />}
                  />
                </div>
              ) : loadingThread ? (
                <div className="p-6 text-sm text-[#64748B]">Cargando conversación…</div>
              ) : (
                <div className="flex h-full flex-col">
                  <div className="border-b border-[rgba(144,158,174,0.16)] px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <PriorityTypography as="h3" variant="cardTitle">
                          {threadDetail.thread.subject}
                        </PriorityTypography>
                        <PriorityTypography variant="bodyMuted" className="mt-1">
                          Buzón: {threadDetail.thread.mailboxEmail}
                        </PriorityTypography>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {threadDetail.thread.links.map((link) => (
                          <Badge key={link.id} variant={link.isPrimary ? "default" : "outline"}>
                            {link.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                    {threadDetail.messages.map((message) => (
                      <article
                        key={message.gmailMessageId}
                        className={`rounded-2xl border px-4 py-4 ${
                          message.direction === "outbound"
                            ? "ml-auto max-w-[88%] border-[rgba(179,58,91,0.18)] bg-[rgba(179,58,91,0.06)]"
                            : "mr-auto max-w-[88%] border-[rgba(144,158,174,0.16)] bg-[rgba(248,250,252,0.9)]"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-[var(--brand-navy)]">
                              {message.from?.name || message.from?.address || "Mensaje"}
                            </div>
                            <div className="mt-1 text-xs text-[#64748B]">
                              Para: {message.to.map((entry) => entry.address).join(", ") || "Sin destinatarios"}
                            </div>
                            {message.cc.length > 0 ? (
                              <div className="mt-1 text-xs text-[#64748B]">
                                CC: {message.cc.map((entry) => entry.address).join(", ")}
                              </div>
                            ) : null}
                          </div>
                          <div className="text-xs text-[#64748B]">{formatMailDate(message.sentAt || message.receivedAt)}</div>
                        </div>
                        <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#334155]">
                          {message.bodyText || message.snippet || "Sin contenido disponible."}
                        </div>
                      </article>
                    ))}
                  </div>

                  {onReply ? (
                    <ReplyComposer
                      key={`${threadDetail.thread.id}:${threadDetail.messages.length}`}
                      threadDetail={threadDetail}
                      onReply={onReply}
                      replying={replying}
                    />
                  ) : null}
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      {!loadingThreads && threads.length > 0 ? (
        <div className="space-y-4 lg:hidden">
          {threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => onSelectThread(thread.id)}
              className="w-full rounded-[22px] border border-[rgba(144,158,174,0.16)] bg-white px-4 py-4 text-left"
            >
              <div className="text-sm font-semibold text-[var(--brand-navy)]">{thread.subject}</div>
              <div className="mt-2 text-sm text-[#475569]">{thread.snippet || "Sin vista previa."}</div>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
