"use client"

import { useEffect, useMemo, useState } from "react"
import { AgGridReact } from "ag-grid-react"
import { AllCommunityModule, ModuleRegistry, type ColDef } from "ag-grid-community"
import { PriorityEmptyState } from "@/components/priority/PriorityEmptyState"
import { cn } from "@/lib/utils"
import { PriorityGridMobileFallback } from "@/components/priority/grid/PriorityGridMobileFallback"
import type { PriorityGridProps } from "@/lib/grid/types"

let communityModulesRegistered = false

if (!communityModulesRegistered) {
  ModuleRegistry.registerModules([AllCommunityModule])
  communityModulesRegistered = true
}

const sharedDefaultColDef: ColDef = {
  sortable: true,
  filter: false,
  resizable: true,
  suppressMovable: true,
}

export function PriorityGrid<TData>({
  rowData,
  columnDefs,
  emptyTitle,
  emptyDescription,
  className,
  height = 440,
  rowHeight = 72,
  toolbar,
  renderMobileCard,
  mobileBreakpoint = 1023,
  defaultColDef,
  gridOptions,
  getRowId,
  rowClassRules,
  getRowClass,
}: PriorityGridProps<TData>) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${mobileBreakpoint}px)`)
    const sync = () => setIsMobile(mediaQuery.matches)

    sync()
    mediaQuery.addEventListener("change", sync)

    return () => mediaQuery.removeEventListener("change", sync)
  }, [mobileBreakpoint])

  const mergedDefaultColDef = useMemo(
    () => ({
      ...sharedDefaultColDef,
      ...defaultColDef,
    }),
    [defaultColDef]
  )

  if (isMobile) {
    return (
      <div className={cn("space-y-4", className)}>
        {toolbar ? <div>{toolbar}</div> : null}
        <PriorityGridMobileFallback
          rows={rowData}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          renderMobileCard={renderMobileCard}
        />
      </div>
    )
  }

  if (!rowData.length) {
    return (
      <div className={cn("space-y-4", className)}>
        {toolbar ? <div>{toolbar}</div> : null}
        <PriorityEmptyState title={emptyTitle} description={emptyDescription} variant="default" />
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {toolbar ? <div>{toolbar}</div> : null}
      <div className="overflow-hidden rounded-[26px] border border-[rgba(144,158,174,0.16)] bg-white shadow-[0_24px_48px_-42px_rgba(3,10,24,0.28)]">
        <div className="priority-ag-grid ag-theme-quartz" style={{ height }}>
          <AgGridReact<TData>
            rowData={rowData}
            columnDefs={columnDefs as never}
            defaultColDef={mergedDefaultColDef as never}
            rowHeight={rowHeight}
            headerHeight={52}
            animateRows
            suppressCellFocus={false}
            suppressRowClickSelection
            getRowId={getRowId}
            rowClassRules={rowClassRules}
            getRowClass={getRowClass}
            {...gridOptions}
          />
        </div>
      </div>
    </div>
  )
}
