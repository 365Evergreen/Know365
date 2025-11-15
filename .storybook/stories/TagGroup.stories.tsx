import React from 'react'
import { Meta, Story } from '@storybook/react'
import { TagGroup } from '../../../src/components/TagGroup'

export default {
  title: 'Components/TagGroup',
  component: TagGroup,
} as Meta

const Template: Story = (args) => <TagGroup {...args} />

const tags = [
  { id: 't1', label: 'Design' },
  { id: 't2', label: 'Engineering' },
  { id: 't3', label: 'Policies' },
]

export const Default = Template.bind({})
Default.args = { tags }

export const Removable = Template.bind({})
Removable.args = { tags, onRemove: (id: string) => alert(`remove ${id}`) }
