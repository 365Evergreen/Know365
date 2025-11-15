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
  showIndicators?: boolean
  pauseOnHover?: boolean
  pauseOnFocus?: boolean
  ariaLabel?: string
  showPlayPause?: boolean
}

export const Carousel: React.FC<Props> = ({
  slides,
  intervalMs = 5000,
  showNav = true,
  showIndicators = true,
  pauseOnHover = true,
  pauseOnFocus = true,
  ariaLabel = 'Carousel',
  showPlayPause = true,
}) => {
  const [index, setIndex] = useState(0)
  const timer = useRef<number | null>(null)
  const [playing, setPlaying] = useState(intervalMs > 0)

  // start/stop timer based on playing and interval
  useEffect(() => {
    if (timer.current) {
      window.clearInterval(timer.current)
      timer.current = null
    }
    if (playing && intervalMs > 0 && slides.length > 0) {
      timer.current = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), intervalMs)
    }
    return () => {
      if (timer.current) {
        window.clearInterval(timer.current)
        timer.current = null
      }
    }
  }, [playing, intervalMs, slides.length])

  // refs and pause-on-hover
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = wrapperRef.current
    if (!el || !pauseOnHover) return
    const onEnter = () => { if (timer.current) { window.clearInterval(timer.current); timer.current = null } }
    const onLeave = () => { if (!timer.current && playing && intervalMs > 0) timer.current = window.setInterval(() => setIndex(i => (i + 1) % slides.length), intervalMs) }
    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [pauseOnHover, playing, intervalMs, slides.length])

  // pause/resume on focus for keyboard users
  useEffect(() => {
    const el = wrapperRef.current
    if (!el || !pauseOnFocus) return
    const onFocusIn = () => { if (timer.current) { window.clearInterval(timer.current); timer.current = null } }
    const onFocusOut = () => { if (!timer.current && playing && intervalMs > 0) timer.current = window.setInterval(() => setIndex(i => (i + 1) % slides.length), intervalMs) }
    el.addEventListener('focusin', onFocusIn)
    el.addEventListener('focusout', onFocusOut)
    return () => {
      el.removeEventListener('focusin', onFocusIn)
      el.removeEventListener('focusout', onFocusOut)
    }
  }, [pauseOnFocus, playing, intervalMs, slides.length])

  // simple touch/swipe handling
  const touchStartX = useRef<number | null>(null)
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const onTouchStart = (e: TouchEvent) => { touchStartX.current = e.touches[0].clientX }
    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null) return
      const dx = (e.changedTouches[0].clientX || 0) - touchStartX.current
      const threshold = 40
      if (dx > threshold) setIndex(i => (i - 1 + slides.length) % slides.length)
      else if (dx < -threshold) setIndex(i => (i + 1) % slides.length)
      touchStartX.current = null
    }
    el.addEventListener('touchstart', onTouchStart)
    el.addEventListener('touchend', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [slides.length])

  const prev = () => setIndex(i => (i - 1 + slides.length) % slides.length)
  const next = () => setIndex(i => (i + 1) % slides.length)

  if (!slides || slides.length === 0) return null

  return (
    <div
      ref={wrapperRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      style={{ position: 'relative', overflow: 'hidden' }}
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'ArrowLeft') prev()
        if (e.key === 'ArrowRight') next()
        if (e.key === ' ' && showPlayPause) { e.preventDefault(); setPlaying(p => !p) }
      }}
    >
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
            <IconButton iconProps={{ iconName: 'ChevronLeft' }} ariaLabel="Previous" onClick={() => { prev(); if (playing) { setPlaying(false) } }} />
          </div>
          <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
            <IconButton iconProps={{ iconName: 'ChevronRight' }} ariaLabel="Next" onClick={() => { next(); if (playing) { setPlaying(false) } }} />
          </div>
        </>
      )}

      {showIndicators && (
        <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
          {slides.map((s, i) => (
            <button
              key={s.key}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              onClick={() => { setIndex(i); if (playing) setPlaying(false) }}
              style={{ width: 10, height: 10, borderRadius: '50%', background: i === index ? '#1270c9' : '#ddd', border: 'none' }}
            />
          ))}
        </div>
      )}

      {showPlayPause && (
        <div style={{ position: 'absolute', right: 8, bottom: 8 }}>
          <IconButton iconProps={{ iconName: playing ? 'Pause' : 'Play' }} ariaLabel={playing ? 'Pause autoplay' : 'Start autoplay'} onClick={() => setPlaying(p => !p)} />
        </div>
      )}
    </div>
  )
}

export default Carousel
