import { Accordion, AccordionItem } from './Accordion'

export default {
  title: 'Components/Accordion',
  component: Accordion,
}

const items: AccordionItem[] = [
  { id: 'one', title: 'First item', content: <div>Content for first item</div> },
  { id: 'two', title: 'Second item', content: <div>Content for second item</div> },
  { id: 'three', title: 'Third item', content: <div>Content for third item</div> },
]

export const Default = () => <Accordion items={items} />

export const AllowMultiple = () => <Accordion items={items} allowMultiple />
