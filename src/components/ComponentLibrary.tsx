import React from 'react';
import { Stack, Text, DefaultButton } from '@fluentui/react';

export type LibraryItem = { id: string; title: string; description?: string };

const DEFAULT_COMPONENTS: LibraryItem[] = [
  { id: 'hero', title: 'Hero' },
  { id: 'card', title: 'Card' },
  { id: 'carousel', title: 'Carousel' },
  { id: 'text', title: 'Rich text' },
  { id: 'search', title: 'Search box' },
  { id: 'recent', title: 'Recent documents' },
];

type Props = {
  items?: LibraryItem[];
};

const ComponentLibrary: React.FC<Props> = ({ items }) => {
  const list = items || DEFAULT_COMPONENTS;

  const onDragStart = (ev: React.DragEvent, item: LibraryItem) => {
    ev.dataTransfer.setData('application/json', JSON.stringify(item));
    ev.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div>
      <Stack tokens={{ childrenGap: 8 }}>
        {list.map((it) => (
          <div
            key={it.id}
            draggable
            onDragStart={(e) => onDragStart(e, it)}
            style={{ padding: 8, border: '1px solid #ddd', borderRadius: 4, background: '#fff', cursor: 'grab' }}
          >
            <Text variant="smallPlus" styles={{ root: { fontWeight: 600 } }}>{it.title}</Text>
            {it.description && <Text variant="small">{it.description}</Text>}
          </div>
        ))}
      </Stack>
      <div style={{ marginTop: 8 }}>
        <DefaultButton text="Add custom component" onClick={() => alert('To implement: custom component creation')} />
      </div>
    </div>
  );
};

export default ComponentLibrary;
