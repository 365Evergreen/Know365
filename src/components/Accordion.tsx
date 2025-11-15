import React, { useState } from 'react'
import { IconButton, Stack, Text } from '@fluentui/react'

export type AccordionItem = {
  id: string
  title: string
  content: React.ReactNode
}

type Props = {
  items: AccordionItem[]
  allowMultiple?: boolean
}

export const Accordion: React.FC<Props> = ({ items, allowMultiple = false }) => {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setOpenIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else {
        if (!allowMultiple) next.clear()
        next.add(id)
      }
      return next
    })
  }

  return (
    <Stack tokens={{ childrenGap: 8 }}>
      {items.map(item => {
        const isOpen = openIds.has(item.id)
        return (
          <div key={item.id}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                aria-expanded={isOpen}
                aria-controls={`acc-${item.id}`}
                onClick={() => toggle(item.id)}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Text variant="large">{item.title}</Text>
              </button>
              <IconButton
                iconProps={{ iconName: isOpen ? 'ChevronUp' : 'ChevronDown' }}
                ariaLabel={isOpen ? 'Collapse' : 'Expand'}
                onClick={() => toggle(item.id)}
              />
            </div>
            <div id={`acc-${item.id}`} role="region" aria-hidden={!isOpen} style={{ display: isOpen ? 'block' : 'none', paddingLeft: 8, marginTop: 8 }}>
              {item.content}
            </div>
          </div>
        )
      })}
    </Stack>
  )
}

export default Accordion
