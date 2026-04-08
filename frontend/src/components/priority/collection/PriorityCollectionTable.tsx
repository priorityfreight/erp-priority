"use client"

import {
  type ColumnDef,
  type ColumnFiltersState,
  type RowSelectionState,
  getFilteredRowModel,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  type VisibilityState,
  useReactTable,
} from "@tanstack/react-table"
import { useMemo, useState, type ReactNode } from "react"

import { PriorityEmptyState } from "@/components/priority/PriorityEmptyState"
import { PriorityTypography } from "@/components/priority/PriorityTypography"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTablePagination, DataTableView } from "@/components/ui/data-table"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type PriorityCollectionTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  emptyTitle: string
  emptyDescription: string
  paginationMode?: "client" | "none"
  toolbar?: React.ReactNode
  footerContent?: ReactNode
  emptyVariant?: "default" | "search" | "blocked" | "error"
  getRowId?: (originalRow: TData, index: number) => string
  enableRowSelection?: boolean
  showColumnVisibilityMenu?: boolean
  className?: string
}

export function PriorityCollectionTable<TData, TValue>({
  columns,
  data,
  emptyTitle,
  emptyDescription,
  paginationMode = "client",
  toolbar,
  footerContent,
  emptyVariant = "default",
  getRowId,
  enableRowSelection = false,
  showColumnVisibilityMenu = false,
  className,
}: PriorityCollectionTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const priorityColumns = useMemo<ColumnDef<TData, TValue>[]>(
    () =>
      columns.map((column) => {
        if (typeof column.header !== "string") {
          return column as ColumnDef<TData, TValue>
        }

        const headerLabel = column.header

        return {
          ...column,
          header: () => <PriorityTypography variant="tableHeader">{headerLabel}</PriorityTypography>,
        } as ColumnDef<TData, TValue>
      }),
    [columns]
  )

  const selectionColumn = useMemo<ColumnDef<TData, TValue> | null>(() => {
    if (!enableRowSelection) {
      return null
    }

    return {
      id: "__select__",
      header: ({ table }) => (
        <div className="flex items-center">
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
            aria-label="Seleccionar filas"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
            aria-label="Seleccionar fila"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    } as ColumnDef<TData, TValue>
  }, [enableRowSelection])

  const tableColumns = useMemo(
    () => (selectionColumn ? [selectionColumn, ...priorityColumns] : priorityColumns),
    [priorityColumns, selectionColumn]
  )

  // TanStack Table is safe here and intentionally powers browse/list surfaces.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: tableColumns,
    ...(getRowId ? { getRowId: (originalRow: TData, index: number) => getRowId(originalRow, index) } : {}),
    enableRowSelection,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(paginationMode === "client" ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    getSortedRowModel: getSortedRowModel(),
  })

  const rowCount = useMemo(() => table.getRowModel().rows.length, [table])
  const selectableColumns = useMemo(
    () => table.getAllLeafColumns().filter((column) => column.getCanHide()),
    [table]
  )

  if (!data.length) {
    return <PriorityEmptyState title={emptyTitle} description={emptyDescription} variant={emptyVariant} />
  }

  return (
    <div className={cn("space-y-4", className)}>
      {toolbar ? <div>{toolbar}</div> : null}
      {showColumnVisibilityMenu && selectableColumns.length > 0 ? (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                Columnas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Visibilidad de columnas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {selectableColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
                >
                  {typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
      <DataTableView
        table={table}
        headClassName="h-11 px-4"
        headerClassName="border-b border-[rgba(144,158,174,0.16)] bg-[linear-gradient(180deg,_rgba(11,31,59,0.04),_rgba(11,31,59,0.02))]"
        rowClassName="border-b border-[rgba(144,158,174,0.12)] last:border-b-0"
        cellClassName="px-4 py-3 text-sm text-[var(--brand-navy)]"
      />
      {paginationMode === "client" ? (
        <DataTablePagination
          table={table}
          summary={
            <div className="flex items-center gap-4">
              <PriorityTypography variant="bodyMuted">{rowCount} registros visibles</PriorityTypography>
              {enableRowSelection && Object.keys(rowSelection).length > 0 ? (
                <PriorityTypography variant="caption">
                  {table.getFilteredSelectedRowModel().rows.length} seleccionados
                </PriorityTypography>
              ) : null}
            </div>
          }
          footerContent={footerContent}
        />
      ) : (
        <div className="flex items-center justify-between rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.75)] px-4 py-3 text-sm text-[#526175]">
          <div className="flex items-center gap-4">
            <PriorityTypography variant="bodyMuted">{rowCount} registros visibles</PriorityTypography>
            {footerContent ? <div>{footerContent}</div> : null}
          </div>
        </div>
      )}
    </div>
  )
}
