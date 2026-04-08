"use client"

import { Suspense, useDeferredValue, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Settings2Icon } from "lucide-react"
import { PageContainer } from "@/components/layout/PageContainer"
import { Button } from "@/components/ui/button"
import { getCurrentErpUser } from "@/lib/auth"
import {
  getInboxThreads,
  getMailThread,
  getMailboxes,
  replyToMailThread,
  syncMailbox,
} from "@/lib/mail/api"
import type { MailThreadDetail, MailThreadSummary, MailboxSummary } from "@/lib/mail/types"
import { notifyError, notifySuccess } from "@/lib/feedback"
import { MailWorkbench } from "@/features/mail/MailWorkbench"

function MailPageContent() {
  const searchParams = useSearchParams()
  const mailConnected = searchParams.get("mail_connected")
  const mailOAuthError = searchParams.get("mail_oauth_error")
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [mailboxes, setMailboxes] = useState<MailboxSummary[]>([])
  const [selectedMailboxId, setSelectedMailboxId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const deferredQuery = useDeferredValue(searchQuery)
  const [threads, setThreads] = useState<MailThreadSummary[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [threadDetail, setThreadDetail] = useState<MailThreadDetail | null>(null)
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [replying, setReplying] = useState(false)

  const selectedMailbox = useMemo(
    () => mailboxes.find((entry) => entry.id === selectedMailboxId) ?? null,
    [mailboxes, selectedMailboxId]
  )
  const isAdmin = currentUserRole === "Admin"

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        const currentUser = await getCurrentErpUser()
        const mailboxResponse = await getMailboxes()

        if (cancelled) {
          return
        }

        setCurrentUserRole(currentUser?.role_name ?? null)
        setMailboxes(mailboxResponse.items)
        setSelectedMailboxId((current) => current ?? mailboxResponse.items[0]?.id ?? null)
      } catch (error) {
        if (!cancelled) {
          console.error(error)
          notifyError("No se pudo cargar la configuración de correo.")
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (mailConnected === "1") {
      notifySuccess("Buzón conectado a Gmail.")
      void refreshMailboxes()
    }

    if (mailOAuthError) {
      notifyError("No se pudo completar la conexión Gmail.", mailOAuthError)
    }
  }, [mailConnected, mailOAuthError])

  useEffect(() => {
    if (!selectedMailboxId) {
      setThreads([])
      setThreadDetail(null)
      return
    }

    let cancelled = false

    async function loadThreads() {
      try {
        setLoadingThreads(true)
        const response = await getInboxThreads({
          mailboxId: selectedMailboxId,
          query: deferredQuery,
        })

        if (cancelled) {
          return
        }

        setThreads(response.items)
        setSelectedThreadId((current) => {
          if (current && response.items.some((thread) => thread.id === current)) {
            return current
          }

          return response.items[0]?.id ?? null
        })
      } catch (error) {
        if (!cancelled) {
          console.error(error)
          notifyError("No se pudo cargar el inbox.")
        }
      } finally {
        if (!cancelled) {
          setLoadingThreads(false)
        }
      }
    }

    void loadThreads()

    return () => {
      cancelled = true
    }
  }, [deferredQuery, selectedMailboxId])

  useEffect(() => {
    if (!selectedThreadId) {
      setThreadDetail(null)
      return
    }

    const threadId = selectedThreadId
    let cancelled = false

    async function loadThread() {
      try {
        setLoadingThread(true)
        const response = await getMailThread(threadId)
        if (!cancelled) {
          setThreadDetail(response)
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error)
          notifyError("No se pudo abrir el thread seleccionado.")
        }
      } finally {
        if (!cancelled) {
          setLoadingThread(false)
        }
      }
    }

    void loadThread()

    return () => {
      cancelled = true
    }
  }, [selectedThreadId])

  async function refreshMailboxes() {
    const mailboxResponse = await getMailboxes()
    setMailboxes(mailboxResponse.items)
    setSelectedMailboxId((current) => {
      if (current && mailboxResponse.items.some((mailbox) => mailbox.id === current)) {
        return current
      }

      return mailboxResponse.items[0]?.id ?? null
    })
  }

  async function handleRefresh() {
    if (!selectedMailboxId) {
      return
    }

    try {
      setRefreshing(true)
      await syncMailbox(selectedMailboxId)
      const [mailboxResponse, inboxResponse] = await Promise.all([
        getMailboxes(),
        getInboxThreads({
          mailboxId: selectedMailboxId,
          query: deferredQuery,
        }),
      ])
      setMailboxes(mailboxResponse.items)
      setThreads(inboxResponse.items)
      notifySuccess("Inbox actualizado.")
    } catch (error) {
      console.error(error)
      notifyError("No se pudo sincronizar el buzón.")
    } finally {
      setRefreshing(false)
    }
  }

  async function handleReply(payload: { body: string; to: string[]; cc?: string[] }) {
    if (!selectedThreadId || !selectedMailboxId) {
      return
    }

    const threadId = selectedThreadId
    const mailboxId = selectedMailboxId

    try {
      setReplying(true)
      await replyToMailThread(threadId, payload)
      const [inboxResponse, detailResponse] = await Promise.all([
        getInboxThreads({
          mailboxId,
          query: deferredQuery,
        }),
        getMailThread(threadId),
      ])
      setThreads(inboxResponse.items)
      setThreadDetail(detailResponse)
      notifySuccess("Respuesta enviada.")
    } catch (error) {
      console.error(error)
      notifyError("No se pudo responder el correo.")
    } finally {
      setReplying(false)
    }
  }

  return (
    <PageContainer
      title="Correo"
      description="Inbox operativo estilo Outlook para buzones compartidos del ERP, con linking por entidad y separación de contexto entre ventas y pricing."
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedMailboxId ?? ""}
            onChange={(event) => setSelectedMailboxId(event.target.value || null)}
            className="rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.08)] px-3 py-2 text-sm text-white outline-none"
          >
            <option value="" className="text-[#111827]">
              Selecciona un buzón
            </option>
            {mailboxes.map((mailbox) => (
              <option key={mailbox.id} value={mailbox.id} className="text-[#111827]">
                {mailbox.displayName} · {mailbox.email}
              </option>
            ))}
          </select>

          {isAdmin ? (
            <Button asChild type="button" variant="outline">
              <Link href="/master-data/mail">
                <Settings2Icon className="mr-2 size-4" />
                Configurar buzones
              </Link>
            </Button>
          ) : null}
        </div>
      }
    >
      <MailWorkbench
        title={selectedMailbox ? `${selectedMailbox.displayName} · ${selectedMailbox.email}` : "Inbox compartido"}
        description={
          selectedMailbox
            ? selectedMailbox.hasRefreshToken
              ? "Lee y responde conversaciones desde el ERP usando cache liviano y fetch completo bajo demanda."
              : isAdmin
                ? "Este buzón aún no está conectado a Gmail. Conéctalo desde Master Data / Mail para empezar a sincronizar."
                : "Este buzón aún no está conectado a Gmail. Solicita a un admin que lo conecte desde Master Data / Mail."
            : "Selecciona un buzón disponible para ver el inbox."
        }
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        threads={threads}
        selectedThreadId={selectedThreadId}
        onSelectThread={setSelectedThreadId}
        threadDetail={threadDetail}
        loadingThreads={loadingThreads}
        loadingThread={loadingThread}
        refreshing={refreshing}
        onRefresh={selectedMailbox?.hasRefreshToken ? handleRefresh : undefined}
        replying={replying}
        onReply={selectedMailbox?.hasRefreshToken ? handleReply : undefined}
        emptyTitle="Sin conversaciones sincronizadas"
        emptyDescription={
          selectedMailbox
            ? isAdmin
              ? "Sincroniza el buzón o termínalo de configurar en Master Data / Mail para traer sus threads recientes al ERP."
              : "Este buzón aún no está listo. Solicita a un admin que lo configure en Master Data / Mail."
            : "No hay un buzón seleccionado todavía."
        }
      />
    </PageContainer>
  )
}

export default function MailPage() {
  return (
    <Suspense
      fallback={
        <PageContainer
          title="Correo"
          description="Inbox operativo estilo Outlook, sin duplicar el storage completo de Gmail."
        >
          <div className="rounded-[26px] border border-[rgba(144,158,174,0.16)] bg-white p-6 text-sm text-[#64748B]">
            Cargando inbox…
          </div>
        </PageContainer>
      }
    >
      <MailPageContent />
    </Suspense>
  )
}
