import React from 'react'
import { Meta, Story } from '@storybook/react'
import { Carousel } from '../../../src/components/Carousel'

export default {
  title: 'Components/Carousel',
  component: Carousel,
} as Meta

const Template: Story = (args) => <div style={{ width: 600, height: 300 }}><Carousel {...args} /></div>

const slides = [
  { key: '1', content: <div style={{ background: '#eee', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Slide 1</div> },
  { key: '2', content: <div style={{ background: '#ddd', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Slide 2</div> },
  { key: '3', content: <div style={{ background: '#ccc', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Slide 3</div> },
]

export const Default = Template.bind({})
Default.args = { slides, intervalMs: 3000 }
