"use client"

import type { ReactNode } from "react"
import type { Table as TanstackTable } from "@tanstack/react-table"
import { flexRender } from "@tanstack/react-table"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

type DataTableViewProps<TData> = {
  table: TanstackTable<TData>
  className?: string
  headerClassName?: string
  headClassName?: string
  rowClassName?: string
  cellClassName?: string
}

function DataTableView<TData>({
  table,
  className,
  headerClassName,
  headClassName,
  rowClassName,
  cellClassName,
}: DataTableViewProps<TData>) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[24px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.95)] shadow-[0_24px_48px_-40px_rgba(3,10,24,0.4)]",
        className
      )}
    >
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className={cn(
                "border-b border-[rgba(144,158,174,0.18)] bg-[rgba(11,31,59,0.04)]",
                headerClassName
              )}
            >
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className={cn("h-12 px-4", headClassName)}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() ? "selected" : undefined}
              className={cn("border-b border-[rgba(144,158,174,0.12)] last:border-b-0", rowClassName)}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className={cn("px-4 py-3 text-sm text-[var(--brand-navy)]", cellClassName)}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

type DataTablePaginationProps<TData> = {
  table: TanstackTable<TData>
  summary: ReactNode
  footerContent?: ReactNode
  className?: string
}

function DataTablePagination<TData>({
  table,
  summary,
  footerContent,
  className,
}: DataTablePaginationProps<TData>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.75)] px-4 py-3 text-sm text-[#526175]",
        className
      )}
    >
      <div className="flex items-center gap-4">
        {summary}
        {footerContent ? <div>{footerContent}</div> : null}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          <ChevronLeftIcon data-icon="inline-start" />
          Anterior
        </Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Siguiente
          <ChevronRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </div>
  )
}

export { DataTablePagination, DataTableView }
