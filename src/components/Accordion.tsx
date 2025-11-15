import React, { useState, useRef } from 'react'
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
  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({})

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
              <div
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggle(item.id)
                  }
                  if (e.key === 'ArrowDown') {
                    // move focus to next
                    const idx = items.findIndex(it => it.id === item.id)
                    const next = items[idx + 1]?.id
                    if (next && containerRefs.current[`head-${next}`]) {
                      containerRefs.current[`head-${next}`]?.focus()
                    }
                  }
                }}
                ref={el => (containerRefs.current[`head-${item.id}`] = el)}
                aria-expanded={isOpen}
                aria-controls={`acc-${item.id}`}
                style={{
                  outline: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Text variant="large">{item.title}</Text>
              </div>
              <IconButton
                iconProps={{ iconName: isOpen ? 'ChevronUp' : 'ChevronDown' }}
                ariaLabel={isOpen ? 'Collapse' : 'Expand'}
                onClick={() => toggle(item.id)}
              />
            </div>
            <div
              id={`acc-${item.id}`}
              role="region"
              aria-hidden={!isOpen}
              ref={el => (containerRefs.current[`panel-${item.id}`] = el)}
              style={{
                display: isOpen ? 'block' : 'none',
                paddingLeft: 8,
                marginTop: 8,
                transition: 'max-height 220ms ease',
                overflow: 'hidden',
              }}
            >
              {item.content}
            </div>
          </div>
        )
      })}
    </Stack>
  )
}

export default Accordion
