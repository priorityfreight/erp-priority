"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Edit3Icon, SaveIcon, StarIcon, Trash2Icon } from "lucide-react"
import type { SavedWorkspaceView } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { PriorityInput } from "@/components/priority/PriorityForm"
import { getErrorMessage, notifyError, notifySuccess } from "@/lib/feedback"
import { PriorityModalShell } from "./PriorityModalShell"

type PrioritySavedViewsProps = {
  views: SavedWorkspaceView[]
  selectedViewId: string | null
  openSaveComposerSignal?: number
  quickViews?: Array<{
    key: string
    label: string
    active?: boolean
    onSelect: () => void
  }>
  onSelectView: (viewId: string) => void
  onSaveCurrentView: (payload: { name: string; isDefault: boolean }) => Promise<void> | void
  onRenameView: (viewId: string, name: string) => Promise<void> | void
  onUpdateCurrentView: (viewId: string) => Promise<void> | void
  onDeleteView: (viewId: string) => Promise<void> | void
  onSetDefaultView: (viewId: string) => Promise<void> | void
}

export function PrioritySavedViews({
  views,
  selectedViewId,
  openSaveComposerSignal,
  quickViews = [],
  onSelectView,
  onSaveCurrentView,
  onRenameView,
  onUpdateCurrentView,
  onDeleteView,
  onSetDefaultView,
}: PrioritySavedViewsProps) {
  const [showViewsModal, setShowViewsModal] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [draftName, setDraftName] = useState("")
  const [renameName, setRenameName] = useState("")
  const [saveAsDefault, setSaveAsDefault] = useState(false)
  const [editingViewId, setEditingViewId] = useState<string | null>(null)
  const [busyViewId, setBusyViewId] = useState<string | null>(null)
  const [savingCurrentView, setSavingCurrentView] = useState(false)
  const [hiddenViewIds, setHiddenViewIds] = useState<string[]>([])
  const lastSaveComposerSignal = useRef<number | undefined>(undefined)

  useEffect(() => {
    setHiddenViewIds((currentHiddenIds) =>
      currentHiddenIds.filter((viewId) => views.some((view) => view.id === viewId))
    )
  }, [views])

  const selectedView = useMemo(
    () => views.find((view) => view.id === selectedViewId) ?? null,
    [selectedViewId, views]
  )

  const visibleViews = useMemo(
    () => views.filter((view) => !hiddenViewIds.includes(view.id)),
    [hiddenViewIds, views]
  )

  const openRenameModal = (view: SavedWorkspaceView) => {
    setEditingViewId(view.id)
    setRenameName(view.name)
    setShowRenameModal(true)
  }

  useEffect(() => {
    if (openSaveComposerSignal === undefined) {
      return
    }

    if (lastSaveComposerSignal.current === openSaveComposerSignal) {
      return
    }

    lastSaveComposerSignal.current = openSaveComposerSignal

    setDraftName(selectedView?.name || "")
    setSaveAsDefault(false)
    setShowSaveModal(true)
  }, [openSaveComposerSignal, selectedView])

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="min-w-[166px] justify-between"
        onClick={() => setShowViewsModal(true)}
      >
        <span className="inline-flex items-center gap-2">
          <SaveIcon className="size-4" />
          Vistas
        </span>
        <span className="rounded-full bg-[rgba(11,31,59,0.08)] px-2 py-0.5 text-xs font-semibold text-[var(--brand-navy)]">
          {views.length}
        </span>
      </Button>

      <PriorityModalShell
        isOpen={showViewsModal}
        onOpenChange={setShowViewsModal}
        title="Vistas guardadas"
        description="Reaplica presets y guarda configuraciones personales del workspace."
      >
        <div className="space-y-4">
          {quickViews.length > 0 ? (
            <div className="space-y-2">
              <div className="text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-[#607187]">
                Presets del sistema
              </div>
              <div className="flex flex-wrap gap-2">
                {quickViews.map((view) => (
                  <Button
                    key={view.key}
                    type="button"
                    size="sm"
                    variant={view.active ? "default" : "outline"}
                    onClick={() => {
                      view.onSelect()
                      setShowViewsModal(false)
                    }}
                  >
                    {view.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-[#607187]">
                Mis vistas
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setDraftName(selectedView?.name || "")
                  setSaveAsDefault(false)
                  setShowSaveModal(true)
                }}
              >
                Guardar actual
              </Button>
            </div>

          {visibleViews.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-[var(--border-subtle)] bg-[rgba(248,250,252,0.72)] px-4 py-4 text-sm text-[#607187]">
              Todavía no tienes vistas guardadas en este workspace.
            </div>
          ) : (
            <div className="space-y-2">
                {visibleViews.map((view) => (
                  <div
                    key={view.id}
                    className="rounded-[18px] border border-[rgba(144,158,174,0.16)] bg-[rgba(248,250,252,0.82)] px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <button
                          type="button"
                          className="text-left text-sm font-semibold text-[var(--brand-navy)] hover:text-[var(--brand-burgundy)]"
                          onClick={() => {
                            onSelectView(view.id)
                            setShowViewsModal(false)
                          }}
                        >
                          {view.name}
                        </button>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#607187]">
                          {view.is_default ? (
                            <span className="rounded-full bg-[rgba(179,58,91,0.08)] px-2 py-0.5 font-semibold text-[var(--brand-burgundy)]">
                              Default
                            </span>
                          ) : null}
                          {selectedViewId === view.id ? (
                            <span className="rounded-full bg-[rgba(11,31,59,0.08)] px-2 py-0.5 font-semibold text-[var(--brand-navy)]">
                              Activa
                            </span>
                          ) : null}
                          <span>{view.workspace_key}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Marcar ${view.name} como vista default`}
                          disabled={busyViewId === view.id}
                          onClick={async () => {
                            try {
                              setBusyViewId(view.id)
                              await onSetDefaultView(view.id)
                            } finally {
                              setBusyViewId(null)
                            }
                          }}
                        >
                          <StarIcon className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Renombrar ${view.name}`}
                          onClick={() => openRenameModal(view)}
                        >
                          <Edit3Icon className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Eliminar ${view.name}`}
                          disabled={busyViewId === view.id}
                          onClick={async () => {
                            setHiddenViewIds((currentHiddenIds) =>
                              currentHiddenIds.includes(view.id)
                                ? currentHiddenIds
                                : [...currentHiddenIds, view.id]
                            )
                            try {
                              setBusyViewId(view.id)
                              await onDeleteView(view.id)
                              notifySuccess("Vista eliminada", "La vista guardada ya no aparece en este workspace.")
                            } catch (error) {
                              setHiddenViewIds((currentHiddenIds) =>
                                currentHiddenIds.filter((hiddenId) => hiddenId !== view.id)
                              )
                              notifyError(
                                "No se pudo eliminar la vista",
                                getErrorMessage(error, "Intenta nuevamente.")
                              )
                            } finally {
                              setBusyViewId(null)
                            }
                          }}
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={selectedViewId === view.id ? "default" : "outline"}
                        onClick={() => {
                          onSelectView(view.id)
                          setShowViewsModal(false)
                        }}
                      >
                        Aplicar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyViewId === view.id}
                        onClick={async () => {
                          try {
                            setBusyViewId(view.id)
                            await onUpdateCurrentView(view.id)
                          } finally {
                            setBusyViewId(null)
                          }
                        }}
                      >
                        Actualizar desde estado actual
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PriorityModalShell>

      <PriorityModalShell
        isOpen={showSaveModal}
        onOpenChange={setShowSaveModal}
        title="Guardar vista actual"
        description="Guarda la búsqueda, lane y filtros activos para volver a abrir este workspace tal como lo dejaste."
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-[#607187]">
              <input
                type="checkbox"
                checked={saveAsDefault}
                onChange={(event) => setSaveAsDefault(event.target.checked)}
              />
              Marcar como vista default
            </label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowSaveModal(false)}>
                Cancelar
              </Button>
            <Button
              type="button"
              onClick={async () => {
                const nextName = draftName.trim()

                if (!nextName) {
                  return
                }

                setSavingCurrentView(true)
                setShowSaveModal(false)
                setDraftName("")
                setSaveAsDefault(false)

                try {
                  await onSaveCurrentView({
                    name: nextName,
                    isDefault: saveAsDefault,
                  })
                  notifySuccess("Vista guardada", "La configuración actual quedó registrada en este workspace.")
                } catch (error) {
                  notifyError(
                    "No se pudo guardar la vista",
                    getErrorMessage(error, "Intenta nuevamente.")
                  )
                } finally {
                  setSavingCurrentView(false)
                }
              }}
              disabled={!draftName.trim() || savingCurrentView}
            >
              {savingCurrentView ? "Guardando..." : "Guardar vista"}
            </Button>
            </div>
          </div>
        }
      >
        <PriorityInput
          placeholder="Ej. Mis pendientes del día"
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
        />
      </PriorityModalShell>

      <PriorityModalShell
        isOpen={showRenameModal}
        onOpenChange={setShowRenameModal}
        title="Renombrar vista"
        description="Actualiza el nombre de la vista guardada sin cambiar sus filtros."
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowRenameModal(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!editingViewId) {
                  return
                }
                await onRenameView(editingViewId, renameName)
                setEditingViewId(null)
                setRenameName("")
                setShowRenameModal(false)
              }}
              disabled={!editingViewId || !renameName.trim()}
            >
              Guardar nombre
            </Button>
          </div>
        }
      >
        <PriorityInput
          placeholder="Nuevo nombre de la vista"
          value={renameName}
          onChange={(event) => setRenameName(event.target.value)}
        />
      </PriorityModalShell>
    </>
  )
}
