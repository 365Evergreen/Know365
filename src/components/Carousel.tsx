import React, { useEffect, useRef, useState } from 'react'
import { IconButton, Stack } from '@fluentui/react'

type Slide = {
  key: string
  content: React.ReactNode
}

type Props = {
  slides: Slide[]
  intervalMs?: number
  showNav?: boolean
}

export const Carousel: React.FC<Props> = ({ slides, intervalMs = 5000, showNav = true }) => {
  const [index, setIndex] = useState(0)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (intervalMs > 0) {
      timer.current = window.setInterval(() => setIndex(i => (i + 1) % slides.length), intervalMs)
      return () => {
        if (timer.current) window.clearInterval(timer.current)
      }
    }
  }, [intervalMs, slides.length])

  const prev = () => setIndex(i => (i - 1 + slides.length) % slides.length)
  const next = () => setIndex(i => (i + 1) % slides.length)

  if (!slides || slides.length === 0) return null

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', transition: 'transform 300ms ease', transform: `translateX(-${index * 100}%)` }}>
        {slides.map(s => (
          <div key={s.key} style={{ minWidth: '100%', boxSizing: 'border-box' }}>
            {s.content}
          </div>
        ))}
      </div>

      {showNav && (
        <Stack horizontal horizontalAlign="space-between" verticalAlign="center" styles={{ root: { position: 'absolute', inset: 0, pointerEvents: 'none' } }}>
          <div style={{ pointerEvents: 'auto' }}>
            <IconButton iconProps={{ iconName: 'ChevronLeft' }} ariaLabel="Previous" onClick={prev} />
          </div>
          <div style={{ pointerEvents: 'auto' }}>
            <IconButton iconProps={{ iconName: 'ChevronRight' }} ariaLabel="Next" onClick={next} />
          </div>
        </Stack>
      )}
    </div>
  )
}

export default Carousel
