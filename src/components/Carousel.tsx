import React, { useEffect, useRef, useState } from 'react'
import { IconButton } from '@fluentui/react'

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

  // pause on hover
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const onEnter = () => { if (timer.current) { window.clearInterval(timer.current); timer.current = null } }
    const onLeave = () => { if (!timer.current && intervalMs > 0) timer.current = window.setInterval(() => setIndex(i => (i + 1) % slides.length), intervalMs) }
    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [intervalMs, slides.length])

  const prev = () => setIndex(i => (i - 1 + slides.length) % slides.length)
  const next = () => setIndex(i => (i + 1) % slides.length)

  if (!slides || slides.length === 0) return null

  return (
    <div ref={wrapperRef} style={{ position: 'relative', overflow: 'hidden' }} tabIndex={0} onKeyDown={e => {
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }}>
      <div style={{ display: 'flex', transition: 'transform 300ms ease', transform: `translateX(-${index * 100}%)` }}>
        {slides.map(s => (
          <div key={s.key} style={{ minWidth: '100%', boxSizing: 'border-box' }}>
            {s.content}
          </div>
        ))}
      </div>

      {showNav && (
        <>
          <div style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }}>
            <IconButton iconProps={{ iconName: 'ChevronLeft' }} ariaLabel="Previous" onClick={prev} />
          </div>
          <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
            <IconButton iconProps={{ iconName: 'ChevronRight' }} ariaLabel="Next" onClick={next} />
          </div>
        </>
      )}

      <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
        {slides.map((s, i) => (
          <button key={s.key} aria-label={`Go to slide ${i + 1}`} onClick={() => setIndex(i)} style={{ width: 10, height: 10, borderRadius: '50%', background: i === index ? '#1270c9' : '#ddd', border: 'none' }} />
        ))}
      </div>
    </div>
  )
}

export default Carousel
