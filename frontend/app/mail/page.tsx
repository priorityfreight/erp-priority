"use client"

import { Suspense, useDeferredValue, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Link2Icon, MailPlusIcon } from "lucide-react"
import { PageContainer } from "@/components/layout/PageContainer"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getCurrentErpUser } from "@/lib/auth"
import {
  getInboxThreads,
  getMailThread,
  getMailboxRoleOptions,
  getMailboxes,
  replyToMailThread,
  saveMailbox,
  syncMailbox,
} from "@/lib/mail/api"
import type { MailThreadDetail, MailThreadSummary, MailboxRoleOption, MailboxSummary } from "@/lib/mail/types"
import { notifyError, notifySuccess } from "@/lib/feedback"
import { MailWorkbench } from "@/features/mail/MailWorkbench"

type MailboxFormState = {
  id?: string
  email: string
  displayName: string
  syncMode: "manual" | "polling"
  roleIds: string[]
}

const emptyMailboxForm: MailboxFormState = {
  email: "",
  displayName: "",
  syncMode: "manual",
  roleIds: [],
}

function MailPageContent() {
  const searchParams = useSearchParams()
  const mailConnected = searchParams.get("mail_connected")
  const mailOAuthError = searchParams.get("mail_oauth_error")
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [mailboxes, setMailboxes] = useState<MailboxSummary[]>([])
  const [roleOptions, setRoleOptions] = useState<MailboxRoleOption[]>([])
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
  const [mailboxDialogOpen, setMailboxDialogOpen] = useState(false)
  const [mailboxForm, setMailboxForm] = useState<MailboxFormState>(emptyMailboxForm)
  const [savingMailbox, setSavingMailbox] = useState(false)

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
        const [mailboxResponse, roleResponse] = await Promise.all([
          getMailboxes(),
          currentUser?.role_name === "Admin"
            ? getMailboxRoleOptions()
            : Promise.resolve({ items: [] as MailboxRoleOption[] }),
        ])

        if (cancelled) {
          return
        }

        setCurrentUserRole(currentUser?.role_name ?? null)
        setMailboxes(mailboxResponse.items)
        setRoleOptions(roleResponse.items)
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

  async function handleSaveMailbox() {
    try {
      setSavingMailbox(true)
      const response = await saveMailbox(mailboxForm)
      await refreshMailboxes()
      setSelectedMailboxId(response.mailbox.id)
      setMailboxDialogOpen(false)
      setMailboxForm(emptyMailboxForm)
      notifySuccess("Buzón guardado.")
    } catch (error) {
      console.error(error)
      notifyError("No se pudo guardar el buzón.")
    } finally {
      setSavingMailbox(false)
    }
  }

  return (
    <PageContainer
      title="Correo"
      description="Inbox operativo estilo Outlook, sin duplicar el storage completo de Gmail."
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

          {selectedMailbox ? (
            <Button asChild type="button" variant="outline">
              <Link href={`/api/mail/mailboxes/${selectedMailbox.id}/oauth/start`}>
                <Link2Icon className="mr-2 size-4" />
                {selectedMailbox.hasRefreshToken ? "Reconectar Gmail" : "Conectar Gmail"}
              </Link>
            </Button>
          ) : null}

          {isAdmin ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMailboxForm(
                  selectedMailbox
                    ? {
                        id: selectedMailbox.id,
                        email: selectedMailbox.email,
                        displayName: selectedMailbox.displayName,
                        syncMode: selectedMailbox.syncMode,
                        roleIds: selectedMailbox.roleIds,
                      }
                    : emptyMailboxForm
                )
                setMailboxDialogOpen(true)
              }}
            >
              <MailPlusIcon className="mr-2 size-4" />
              {selectedMailbox ? "Editar buzón" : "Añadir buzón"}
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
              : "Este buzón aún no está conectado a Gmail. Conéctalo para empezar a sincronizar."
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
            ? "Sincroniza el buzón o conéctalo primero para traer sus threads recientes al ERP."
            : "No hay un buzón seleccionado todavía."
        }
      />

      <Dialog open={mailboxDialogOpen} onOpenChange={setMailboxDialogOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{mailboxForm.id ? "Editar buzón" : "Añadir buzón"}</DialogTitle>
            <DialogDescription>
              Configura un buzón compartido, define qué roles pueden verlo y elige si se sincroniza manualmente o por cron.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="mailbox-email">Correo</Label>
              <Input
                id="mailbox-email"
                value={mailboxForm.email}
                onChange={(event) => setMailboxForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="ventas@tuempresa.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mailbox-display-name">Nombre visible</Label>
              <Input
                id="mailbox-display-name"
                value={mailboxForm.displayName}
                onChange={(event) =>
                  setMailboxForm((current) => ({ ...current, displayName: event.target.value }))
                }
                placeholder="Ventas"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mailbox-sync-mode">Modo de sync</Label>
              <select
                id="mailbox-sync-mode"
                value={mailboxForm.syncMode}
                onChange={(event) =>
                  setMailboxForm((current) => ({
                    ...current,
                    syncMode: event.target.value === "polling" ? "polling" : "manual",
                  }))
                }
                className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] outline-none"
              >
                <option value="manual">Manual</option>
                <option value="polling">Polling</option>
              </select>
            </div>
            <div className="grid gap-3">
              <Label>Roles con acceso</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {roleOptions.map((role) => {
                  const checked = mailboxForm.roleIds.includes(role.id)
                  return (
                    <label
                      key={role.id}
                      className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] px-3 py-3 text-sm text-[#334155]"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(nextChecked) =>
                          setMailboxForm((current) => ({
                            ...current,
                            roleIds: nextChecked
                              ? [...current.roleIds, role.id]
                              : current.roleIds.filter((entry) => entry !== role.id),
                          }))
                        }
                      />
                      <span>{role.name}</span>
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setMailboxDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => void handleSaveMailbox()} disabled={savingMailbox}>
                {savingMailbox ? "Guardando…" : "Guardar buzón"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
