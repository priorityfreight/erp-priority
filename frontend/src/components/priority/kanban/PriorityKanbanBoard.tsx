"use client"

import { useMemo, useState, type ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { PriorityEmptyState } from "@/components/priority/PriorityEmptyState"
import { cn } from "@/lib/utils"

export type PriorityKanbanLane = {
  key: string
  label: string
  helper?: ReactNode
  count?: number
  tone?: "neutral" | "info" | "warning" | "success" | "danger" | "spotlight"
}

type PriorityKanbanRenderHelpers = {
  laneKey: string
  moveToPrevLane?: (() => void) | undefined
  moveToNextLane?: (() => void) | undefined
  isDragging: boolean
}

const laneToneClasses: Record<NonNullable<PriorityKanbanLane["tone"]>, string> = {
  neutral: "border-[rgba(144,158,174,0.18)] bg-[rgba(248,250,252,0.86)]",
  info: "border-[rgba(34,117,204,0.18)] bg-[rgba(236,245,255,0.88)]",
  warning: "border-[rgba(190,129,36,0.18)] bg-[rgba(255,248,236,0.88)]",
  success: "border-[rgba(24,125,76,0.18)] bg-[rgba(238,251,244,0.9)]",
  danger: "border-[rgba(179,58,91,0.18)] bg-[rgba(255,241,245,0.9)]",
  spotlight: "border-[rgba(99,102,241,0.18)] bg-[rgba(241,242,255,0.9)]",
}

export function PriorityKanbanBoard<TItem>({
  lanes,
  itemsByLane,
  getItemId,
  renderCard,
  onMoveItem,
  highlightedLaneKey,
  loading = false,
  emptyTitle,
  emptyDescription,
  emptyAction,
  className,
}: {
  lanes: PriorityKanbanLane[]
  itemsByLane: Record<string, TItem[]>
  getItemId: (item: TItem) => string
  renderCard: (item: TItem, helpers: PriorityKanbanRenderHelpers) => ReactNode
  onMoveItem?: ((itemId: string, sourceLaneKey: string, targetLaneKey: string) => void | Promise<void>) | undefined
  highlightedLaneKey?: string | null
  loading?: boolean
  emptyTitle: string
  emptyDescription: ReactNode
  emptyAction?: ReactNode
  className?: string
}) {
  const [dragState, setDragState] = useState<{ itemId: string; laneKey: string } | null>(null)

  const totalCount = useMemo(
    () => lanes.reduce((sum, lane) => sum + (itemsByLane[lane.key]?.length ?? 0), 0),
    [itemsByLane, lanes]
  )

  if (loading) {
    return (
      <div className={cn("grid gap-4 xl:grid-cols-3", className)}>
        {lanes.map((lane) => (
          <div
            key={lane.key}
            className="space-y-3 rounded-[24px] border border-[rgba(144,158,174,0.16)] bg-[rgba(255,255,255,0.94)] p-4"
          >
            <Skeleton className="h-16 rounded-[18px]" />
            <Skeleton className="h-28 rounded-[18px]" />
            <Skeleton className="h-28 rounded-[18px]" />
          </div>
        ))}
      </div>
    )
  }

  if (totalCount === 0) {
    return (
      <PriorityEmptyState
        density="compact"
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    )
  }

  return (
    <div
      className={cn(
        "grid gap-4 xl:auto-cols-fr xl:grid-flow-col xl:grid-cols-none xl:overflow-x-auto xl:pb-2",
        className
      )}
    >
      {lanes.map((lane, laneIndex) => {
        const laneItems = itemsByLane[lane.key] ?? []
        const toneClass = lane.tone ? laneToneClasses[lane.tone] : laneToneClasses.neutral

        return (
          <section
            key={lane.key}
            className={cn(
              "min-w-[290px] space-y-3 rounded-[24px] border p-4 shadow-[0_18px_40px_-34px_rgba(3,10,24,0.28)]",
              toneClass,
              highlightedLaneKey === lane.key ? "ring-2 ring-[rgba(11,31,59,0.12)]" : ""
            )}
            onDragOver={(event) => {
              if (onMoveItem) {
                event.preventDefault()
              }
            }}
            onDrop={(event) => {
              if (!onMoveItem) {
                return
              }

              event.preventDefault()
              const payload = event.dataTransfer.getData("text/plain")
              const [itemId, sourceLane] = payload.split("::")

              if (!itemId || !sourceLane || sourceLane === lane.key) {
                return
              }

              void onMoveItem(itemId, sourceLane, lane.key)
              setDragState(null)
            }}
          >
            <header className="space-y-2 rounded-[18px] border border-[rgba(255,255,255,0.56)] bg-white/75 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[0.98rem] font-semibold tracking-[-0.02em] text-[var(--brand-navy)]">
                  {lane.label}
                </div>
                <div className="rounded-full bg-[rgba(11,31,59,0.08)] px-2.5 py-1 text-xs font-semibold text-[var(--brand-navy)]">
                  {lane.count ?? laneItems.length}
                </div>
              </div>
              {lane.helper ? <div className="text-xs leading-6 text-[#607187]">{lane.helper}</div> : null}
            </header>

            <div className="space-y-3">
              {laneItems.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-[rgba(144,158,174,0.24)] bg-white/55 px-4 py-6 text-sm leading-6 text-[#607187]">
                  No hay registros en esta etapa.
                </div>
              ) : (
                laneItems.map((item) => {
                  const itemId = getItemId(item)
                  const isDragging = dragState?.itemId === itemId
                  const previousLane = lanes[laneIndex - 1]?.key
                  const nextLane = lanes[laneIndex + 1]?.key

                  return (
                    <div
                      key={itemId}
                      draggable={Boolean(onMoveItem)}
                      onDragStart={(event) => {
                        if (!onMoveItem) {
                          return
                        }
                        event.dataTransfer.setData("text/plain", `${itemId}::${lane.key}`)
                        setDragState({ itemId, laneKey: lane.key })
                      }}
                      onDragEnd={() => setDragState(null)}
                    >
                      {renderCard(item, {
                        laneKey: lane.key,
                        moveToPrevLane:
                          onMoveItem && previousLane
                            ? () => void onMoveItem(itemId, lane.key, previousLane)
                            : undefined,
                        moveToNextLane:
                          onMoveItem && nextLane
                            ? () => void onMoveItem(itemId, lane.key, nextLane)
                            : undefined,
                        isDragging,
                      })}
                    </div>
                  )
                })
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
