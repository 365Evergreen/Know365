import { TagGroup } from './TagGroup'

export default {
  title: 'Components/TagGroup',
  component: TagGroup,
}

const tags = [
  { id: 't1', label: 'Design' },
  { id: 't2', label: 'Engineering' },
  { id: 't3', label: 'Policies' },
]

export const Default = () => <TagGroup tags={tags} />

export const Removable = () => <TagGroup tags={tags} onRemove={(id: string) => alert(`remove ${id}`)} />
