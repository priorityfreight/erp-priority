"use client"

/* eslint-disable @next/next/no-img-element -- signature previews use arbitrary public URLs configured per mailbox. */

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Link2Icon, MailPlusIcon, Settings2Icon } from "lucide-react"
import { PageContainer } from "@/components/layout/PageContainer"
import { PriorityMetricCard, PriorityMetricStrip } from "@/components/priority/PriorityWorkspace"
import { PriorityCardTitle, PriorityTypography } from "@/components/priority/PriorityTypography"
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
import { getMailboxRoleOptions, getMailboxes, saveMailbox } from "@/lib/mail/api"
import { buildSignatureImageRenderUrl } from "@/lib/mail/signatures"
import type { MailboxRoleOption, MailboxSummary } from "@/lib/mail/types"
import { notifyError, notifySuccess } from "@/lib/feedback"

type MailboxFormState = {
  id?: string
  email: string
  displayName: string
  syncMode: "manual" | "polling"
  signatureImageUrl: string
  roleIds: string[]
}

const emptyMailboxForm: MailboxFormState = {
  email: "",
  displayName: "",
  syncMode: "manual",
  signatureImageUrl: "",
  roleIds: [],
}

export function MailboxesManager() {
  const [mailboxes, setMailboxes] = useState<MailboxSummary[]>([])
  const [roleOptions, setRoleOptions] = useState<MailboxRoleOption[]>([])
  const [loading, setLoading] = useState(true)
  const [mailboxDialogOpen, setMailboxDialogOpen] = useState(false)
  const [mailboxForm, setMailboxForm] = useState<MailboxFormState>(emptyMailboxForm)
  const [savingMailbox, setSavingMailbox] = useState(false)

  async function loadData() {
    try {
      setLoading(true)
      const [mailboxResponse, roleResponse] = await Promise.all([
        getMailboxes(),
        getMailboxRoleOptions(),
      ])
      setMailboxes(mailboxResponse.items)
      setRoleOptions(roleResponse.items)
    } catch (error) {
      console.error(error)
      notifyError("No se pudo cargar la configuración de buzones.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const stats = useMemo(() => {
    const active = mailboxes.filter((mailbox) => mailbox.status === "active").length
    const connected = mailboxes.filter((mailbox) => mailbox.hasRefreshToken).length
    const polling = mailboxes.filter((mailbox) => mailbox.syncMode === "polling").length

    return { active, connected, polling }
  }, [mailboxes])

  async function handleSaveMailbox() {
    try {
      setSavingMailbox(true)
      await saveMailbox(mailboxForm)
      await loadData()
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

  const previewSignatureImageUrl = buildSignatureImageRenderUrl(mailboxForm.signatureImageUrl)

  return (
    <PageContainer
      title="Mail"
      description="Configura los buzones internos del ERP, su acceso por rol y la conexión OAuth con Gmail."
      actions={
        <Button
          type="button"
          onClick={() => {
            setMailboxForm(emptyMailboxForm)
            setMailboxDialogOpen(true)
          }}
        >
          <MailPlusIcon className="mr-2 size-4" />
          Añadir buzón
        </Button>
      }
    >
      <div className="space-y-8">
        <PriorityMetricStrip className="xl:grid-cols-3">
          <PriorityMetricCard label="Buzones" value={String(mailboxes.length)} helper="Total dados de alta en el ERP." tone="info" />
          <PriorityMetricCard label="Conectados" value={String(stats.connected)} helper="Con refresh token válido para Gmail." tone="success" />
          <PriorityMetricCard label="Polling" value={String(stats.polling)} helper="Buzones marcados para sync programado." tone="warning" />
        </PriorityMetricStrip>

        <section className="rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <PriorityCardTitle>Configuración de buzones</PriorityCardTitle>
              <PriorityTypography variant="bodyMuted" className="mt-1">
                Desde aquí defines qué buzones existen, qué roles los pueden usar y conectas Gmail con OAuth.
              </PriorityTypography>
            </div>
            <div className="rounded-full border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
              {stats.active} activos
            </div>
          </div>

          {loading ? (
            <div className="mt-6 rounded-2xl border border-[rgba(144,158,174,0.16)] bg-[#F8FAFC] p-5 text-sm text-[#64748B]">
              Cargando buzones...
            </div>
          ) : mailboxes.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-[rgba(144,158,174,0.16)] bg-[#F8FAFC] p-5 text-sm text-[#64748B]">
              Todavía no hay buzones configurados. Crea el primero para habilitar el correo interno en pricing, ventas y seguimiento.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {mailboxes.map((mailbox) => (
                <section
                  key={mailbox.id}
                  className="rounded-[24px] border border-[#E5E7EB] bg-gradient-to-br from-[#F8FAFC] via-white to-[#EFF6FF] p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                        {mailbox.status}
                      </div>
                      <PriorityCardTitle className="mt-2 text-[1.05rem]">
                        {mailbox.displayName}
                      </PriorityCardTitle>
                      <PriorityTypography variant="bodyMuted" className="mt-1 break-all">
                        {mailbox.email}
                      </PriorityTypography>
                      <div className="mt-3 text-sm text-[#475569]">
                        {mailbox.hasRefreshToken
                          ? `Conectado como ${mailbox.connectedEmail || mailbox.email}`
                          : "Aún no conectado a Gmail"}
                      </div>
                      <div className="mt-2 text-sm text-[#475569]">
                        Roles: {mailbox.roleNames.length > 0 ? mailbox.roleNames.join(", ") : "Sin roles"}
                      </div>
                      <div className="mt-2 text-sm text-[#475569]">
                        Sync: {mailbox.syncMode === "polling" ? "Polling" : "Manual"}
                      </div>
                      <div className="mt-3">
                        {buildSignatureImageRenderUrl(mailbox.signatureImageUrl) ? (
                          <div className="inline-flex max-w-full items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-3 py-2">
                            <img
                              src={buildSignatureImageRenderUrl(mailbox.signatureImageUrl) ?? ""}
                              alt={`Firma de ${mailbox.displayName}`}
                              className="h-10 max-w-[220px] rounded-lg object-contain"
                            />
                            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                              Firma activa
                            </span>
                          </div>
                        ) : (
                          <div className="text-sm text-[#94A3B8]">Sin firma configurada.</div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setMailboxForm({
                            id: mailbox.id,
                            email: mailbox.email,
                            displayName: mailbox.displayName,
                            syncMode: mailbox.syncMode,
                            signatureImageUrl: mailbox.signatureImageUrl ?? "",
                            roleIds: mailbox.roleIds,
                          })
                          setMailboxDialogOpen(true)
                        }}
                      >
                        <Settings2Icon className="mr-2 size-4" />
                        Editar
                      </Button>
                      <Button asChild type="button">
                        <Link href={`/api/mail/mailboxes/${mailbox.id}/oauth/start`}>
                          <Link2Icon className="mr-2 size-4" />
                          {mailbox.hasRefreshToken ? "Reconectar Gmail" : "Conectar Gmail"}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>
      </div>

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
                placeholder="pricing@tuempresa.com"
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
                placeholder="Pricing"
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
            <div className="grid gap-2">
              <Label htmlFor="mailbox-signature-image-url">Firma de correo</Label>
              <Input
                id="mailbox-signature-image-url"
                value={mailboxForm.signatureImageUrl}
                onChange={(event) =>
                  setMailboxForm((current) => ({
                    ...current,
                    signatureImageUrl: event.target.value,
                  }))
                }
                placeholder="https://cdn.tuempresa.com/firmas/ventas.png"
              />
              <p className="text-xs text-[#64748B]">
                Usa una URL pública de imagen. Se agrega automáticamente al final de cada correo enviado desde este buzón.
              </p>
              {previewSignatureImageUrl ? (
                <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                  <img
                    src={previewSignatureImageUrl}
                    alt="Vista previa de firma"
                    className="h-14 max-w-full rounded-lg object-contain"
                  />
                </div>
              ) : null}
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
