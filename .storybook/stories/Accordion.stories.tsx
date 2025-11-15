import React from 'react'
import { Meta, Story } from '@storybook/react'
import { Accordion, AccordionItem } from '../../../src/components/Accordion'

export default {
  title: 'Components/Accordion',
  component: Accordion,
} as Meta

const Template: Story = (args) => <Accordion {...args} />

const items: AccordionItem[] = [
  { id: 'one', title: 'First item', content: <div>Content for first item</div> },
  { id: 'two', title: 'Second item', content: <div>Content for second item</div> },
  { id: 'three', title: 'Third item', content: <div>Content for third item</div> },
]

export const Default = Template.bind({})
Default.args = { items }

export const AllowMultiple = Template.bind({})
AllowMultiple.args = { items, allowMultiple: true }
