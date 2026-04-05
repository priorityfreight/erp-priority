import type { ReactNode } from "react"
import type { ColDef, GridOptions, RowClassParams, ValueFormatterParams } from "ag-grid-community"

export type PriorityGridMode =
  | "read-only-operational"
  | "inline-editable"
  | "hybrid"
  | "master-detail"
  | "bulk-edit-matrix"

export type PriorityGridMobileFallbackMode = "cards" | "drawer-editor" | "step-editor" | "detail-sheet"

export type PriorityGridToolbarAction = {
  label: string
  onClick: () => void
  disabled?: boolean
}

export type PriorityGridColumnConfig<TData> = ColDef<TData> & {
  mobileLabel?: string
}

export type PriorityGridProps<TData> = {
  rowData: TData[]
  columnDefs: Array<PriorityGridColumnConfig<TData>>
  emptyTitle: string
  emptyDescription: string
  mode?: PriorityGridMode
  className?: string
  height?: number
  rowHeight?: number
  toolbar?: ReactNode
  renderMobileCard?: (row: TData, index: number) => ReactNode
  mobileBreakpoint?: number
  defaultColDef?: ColDef<TData>
  gridOptions?: GridOptions<TData>
  getRowId?: GridOptions<TData>["getRowId"]
  mobileFallback?: PriorityGridMobileFallbackMode
  rowClassRules?: GridOptions<TData>["rowClassRules"]
  getRowClass?: ((params: RowClassParams<TData>) => string | string[] | undefined) | undefined
  valueFormatter?: ((params: ValueFormatterParams<TData>) => string) | undefined
}
