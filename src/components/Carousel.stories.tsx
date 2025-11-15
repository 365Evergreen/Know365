import { Carousel } from './Carousel'

export default {
  title: 'Components/Carousel',
  component: Carousel,
}

const slides = [
  { key: '1', content: <div style={{ background: '#eee', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Slide 1</div> },
  { key: '2', content: <div style={{ background: '#ddd', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Slide 2</div> },
  { key: '3', content: <div style={{ background: '#ccc', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Slide 3</div> },
]

export const Default = () => <div style={{ width: 600, height: 300 }}><Carousel slides={slides} intervalMs={3000} /></div>
