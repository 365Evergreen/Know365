import React from 'react'
import { Stack, DefaultButton, IconButton } from '@fluentui/react'

type Tag = {
  id: string
  label: string
}

type Props = {
  tags: Tag[]
  onRemove?: (id: string) => void
  onClick?: (id: string) => void
}

export const TagGroup: React.FC<Props> = ({ tags, onRemove, onClick }) => {
  return (
    <Stack horizontal wrap tokens={{ childrenGap: 8 }}>
      {tags.map(t => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', background: '#f3f2f1', padding: '6px 8px', borderRadius: 16 }}>
          <DefaultButton onClick={() => onClick?.(t.id)} styles={{ root: { minWidth: 0, padding: '0 8px', height: 28 } }}>{t.label}</DefaultButton>
          {onRemove && <IconButton iconProps={{ iconName: 'Cancel' }} ariaLabel={`Remove ${t.label}`} onClick={() => onRemove(t.id)} />}
        </div>
      ))}
    </Stack>
  )
}

export default TagGroup
