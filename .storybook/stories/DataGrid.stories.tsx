import React from 'react'
import { Meta, Story } from '@storybook/react'
import { DataGrid } from '../../../src/components/DataGrid'
import { IColumn } from '@fluentui/react'

export default {
  title: 'Components/DataGrid',
  component: DataGrid,
} as Meta

const Template: Story = (args) => <DataGrid {...args} />

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

export const Default = Template.bind({})
Default.args = { items, columns }
