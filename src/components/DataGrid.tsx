// React not required directly; keep this file lean
import { IColumn, DetailsList, SelectionMode } from '@fluentui/react'

export type GridColumn = IColumn

type Props<T> = {
  items: T[]
  columns: GridColumn[]
  compact?: boolean
  onItemInvoked?: (item: T) => void
}

export function DataGrid<T extends Record<string, any>>({ items, columns, compact = false, onItemInvoked }: Props<T>) {
  return (
    <DetailsList
      items={items}
      columns={columns}
      selectionMode={SelectionMode.none}
      compact={compact}
      onItemInvoked={onItemInvoked as any}
    />
  )
}

export default DataGrid
