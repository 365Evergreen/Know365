import React from 'react'
import Carousel from './Carousel'
import { Text, PrimaryButton } from '@fluentui/react'

export type CarouselItem = {
  id: string
  title?: string
  summary?: string
  image?: string
  url?: string
  metadata?: any
}

export type CarouselLayout = 'card' | 'gallery' | 'banner'

type Props = {
  items: CarouselItem[]
  layout?: CarouselLayout
  intervalMs?: number
  showNav?: boolean
  renderItem?: (item: CarouselItem, layout: CarouselLayout) => React.ReactNode
  // admin config schema: optional override object coming from admin settings per page
  config?: {
    enabled?: boolean
    layout?: CarouselLayout
    itemLimit?: number
    intervalMs?: number
    autoplay?: boolean
    pauseOnHover?: boolean
    pauseOnFocus?: boolean
    showNav?: boolean
    showIndicators?: boolean
    renderMode?: string
  }
}

const imgStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
}

const CardSlide: React.FC<{ item: CarouselItem }> = ({ item }) => (
  <div style={{ padding: 12, boxSizing: 'border-box', display: 'flex', alignItems: 'stretch', height: '100%' }}>
    <div style={{ flex: '0 0 160px', marginRight: 12 }}>
      {item.image ? <img src={item.image} alt={item.title} style={{ width: 160, height: 100, objectFit: 'cover', borderRadius: 6 }} /> : <div style={{ width: 160, height: 100, background: '#eee', borderRadius: 6 }} />}
    </div>
    <div style={{ flex: '1 1 auto' }}>
      <Text variant="large">{item.title}</Text>
      {item.summary && <Text styles={{ root: { color: '#666' } }}>{item.summary}</Text>}
      {item.url && <PrimaryButton styles={{ root: { marginTop: 8 } }} onClick={() => { if (item.url) window.location.href = item.url }}>Open</PrimaryButton>}
    </div>
  </div>
)

const BannerSlide: React.FC<{ item: CarouselItem }> = ({ item }) => (
  <div style={{ position: 'relative', minHeight: 220, width: '100%' }}>
    {item.image ? <img src={item.image} alt={item.title} style={{ ...imgStyle, height: 220 }} /> : <div style={{ height: 220, background: '#ddd' }} />}
    <div style={{ position: 'absolute', left: 16, bottom: 16, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
      <Text variant="xLarge">{item.title}</Text>
      {item.summary && <Text styles={{ root: { color: 'rgba(255,255,255,0.9)' } }}>{item.summary}</Text>}
    </div>
  </div>
)

const GallerySlide: React.FC<{ item: CarouselItem }> = ({ item }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220 }}>
    {item.image ? <img src={item.image} alt={item.title} style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 6 }} /> : <div style={{ width: '100%', height: 180, background: '#eee', borderRadius: 6 }} />}
  </div>
)

const ConfigurableCarousel: React.FC<Props> = ({ items, layout = 'card', intervalMs = 5000, showNav = true, renderItem, config }) => {
  // merge config values if provided
  const cfg = {
    layout,
    intervalMs,
    showNav,
    autoplay: true,
    pauseOnHover: true,
    pauseOnFocus: true,
    showIndicators: true,
    ...config,
  }
  const useLayout = cfg.layout as CarouselLayout
  const useItems = cfg.itemLimit ? items.slice(0, cfg.itemLimit) : items
  const slides = useItems.map((it) => {
    let content: React.ReactNode
    if (renderItem) content = renderItem(it, layout)
    else {
      switch (layout) {
        case 'banner':
          content = <BannerSlide item={it} />
          break
        case 'gallery':
          content = <GallerySlide item={it} />
          break
        default:
          content = <CardSlide item={it} />
      }
    }

    return { key: it.id, content }
  })

  // Responsive wrapper: allow the carousel to be embedded in different contexts
  return (
    <div style={{ width: '100%' }}>
      <Carousel
        slides={slides}
        intervalMs={cfg.autoplay ? cfg.intervalMs : 0}
        showNav={!!cfg.showNav}
        showIndicators={!!cfg.showIndicators}
        pauseOnHover={!!cfg.pauseOnHover}
        pauseOnFocus={!!cfg.pauseOnFocus}
        ariaLabel={`Carousel (${useLayout})`}
        showPlayPause={true}
      />
    </div>
  )
}

export default ConfigurableCarousel
