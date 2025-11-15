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

export const Removable = () => <TagGroup tags={tags} onRemove={(id: string) => { try { const useMessage = require('../hooks/useMessage').useMessage as typeof import('../hooks/useMessage').useMessage; useMessage().showMessage(`remove ${id}`, 2 as any); } catch { alert(`remove ${id}`); } }} />
