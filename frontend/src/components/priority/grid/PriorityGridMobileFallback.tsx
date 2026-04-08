import type { ReactNode } from "react"
import { PriorityEmptyState } from "@/components/priority/PriorityEmptyState"

type PriorityGridMobileFallbackProps<TData> = {
  rows: TData[]
  emptyTitle: string
  emptyDescription: string
  renderMobileCard?: (row: TData, index: number) => ReactNode
}

export function PriorityGridMobileFallback<TData>({
  rows,
  emptyTitle,
  emptyDescription,
  renderMobileCard,
}: PriorityGridMobileFallbackProps<TData>) {
  if (!rows.length) {
    return <PriorityEmptyState title={emptyTitle} description={emptyDescription} variant="default" />
  }

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={index}>{renderMobileCard ? renderMobileCard(row, index) : null}</div>
      ))}
    </div>
  )
}

