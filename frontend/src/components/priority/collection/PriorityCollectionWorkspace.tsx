"use client"

import type { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { PriorityEmptyState } from "@/components/priority/PriorityEmptyState"
import { cn } from "@/lib/utils"

export type PriorityCollectionColumn<TItem> = {
  id: string
  header: ReactNode
  cell: (item: TItem, index: number) => ReactNode
  className?: string
  headClassName?: string
}

export function PriorityCollectionWorkspace<TItem>({
  toolbar,
  lanes,
  columns,
  items,
  getRowId,
  getRowClassName,
  loading = false,
  emptyTitle,
  emptyDescription,
  emptyAction,
  footer,
  className,
  stickyLeadingColumn = true,
}: {
  toolbar?: ReactNode
  lanes?: ReactNode
  columns: PriorityCollectionColumn<TItem>[]
  items: TItem[]
  getRowId?: (item: TItem, index: number) => string
  getRowClassName?: (item: TItem, index: number) => string
  loading?: boolean
  emptyTitle: string
  emptyDescription: ReactNode
  emptyAction?: ReactNode
  footer?: ReactNode
  className?: string
  stickyLeadingColumn?: boolean
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {toolbar ? <div>{toolbar}</div> : null}
      {lanes ? <div>{lanes}</div> : null}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-[20px]" />
          <Skeleton className="h-16 rounded-[20px]" />
          <Skeleton className="h-16 rounded-[20px]" />
        </div>
      ) : items.length === 0 ? (
        <PriorityEmptyState
          density="compact"
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      ) : (
        <div className="overflow-hidden rounded-[26px] border border-[rgba(144,158,174,0.16)] bg-white shadow-[0_24px_48px_-42px_rgba(3,10,24,0.28)]">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="border-b border-[rgba(144,158,174,0.16)] bg-[linear-gradient(180deg,_rgba(11,31,59,0.04),_rgba(11,31,59,0.02))]">
                <tr>
                  {columns.map((column, index) => (
                    <th
                      key={column.id}
                      className={cn(
                        "h-12 px-4 text-left align-middle text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-[#607187]",
                        stickyLeadingColumn && index === 0
                          ? "sticky left-0 z-10 bg-[linear-gradient(180deg,_rgba(248,250,252,1),_rgba(244,247,250,1))]"
                          : "",
                        column.headClassName
                      )}
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr
                    key={getRowId ? getRowId(item, index) : `row-${index}`}
                    className={cn(
                      "border-b border-[rgba(144,158,174,0.12)] transition-colors hover:bg-[rgba(11,31,59,0.032)] last:border-b-0",
                      getRowClassName?.(item, index)
                    )}
                  >
                    {columns.map((column, columnIndex) => (
                      <td
                        key={column.id}
                        className={cn(
                          "px-4 py-3 align-top text-sm text-[var(--brand-navy)]",
                          stickyLeadingColumn && columnIndex === 0 ? "sticky left-0 z-[1] bg-inherit" : "",
                          column.className
                        )}
                      >
                        {column.cell(item, index)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {footer ? <div>{footer}</div> : null}
    </div>
  )
}
