"use client"

import {
  PriorityCollectionTable,
  type PriorityCollectionTableProps,
} from "@/components/priority/collection/PriorityCollectionTable"

/**
 * @deprecated Use PriorityCollectionTable for browse/list surfaces.
 * This wrapper remains only for legacy compatibility while older modules migrate.
 */
export function PriorityDataTable<TData, TValue>(props: PriorityCollectionTableProps<TData, TValue>) {
  return <PriorityCollectionTable {...props} />
}

export type PriorityDataTableProps<TData, TValue> = PriorityCollectionTableProps<TData, TValue>
