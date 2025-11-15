import { DataGrid } from './DataGrid'
import { IColumn } from '@fluentui/react'

export default {
  title: 'Components/DataGrid',
  component: DataGrid,
}

type Item = { id: string; name: string; description: string }

const items: Item[] = [
  { id: '1', name: 'Alpha', description: 'First' },
  { id: '2', name: 'Beta', description: 'Second' },
  { id: '3', name: 'Gamma', description: 'Third' },
]

const columns: IColumn[] = [
  { key: 'col1', name: 'Name', fieldName: 'name', minWidth: 100, isResizable: true },
  { key: 'col2', name: 'Description', fieldName: 'description', minWidth: 150, isResizable: true },
]

export const Default = () => <DataGrid items={items} columns={columns} />
