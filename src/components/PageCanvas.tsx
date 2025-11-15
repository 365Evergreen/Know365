import React from 'react';
import { Stack, DefaultButton, Text } from '@fluentui/react';

export type PageComponent = { id: string; type: string; props?: any };

type Props = {
  components: PageComponent[];
  onAdd: (c: PageComponent) => void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
};

const PageCanvas: React.FC<Props> = ({ components, onAdd, onRemove, onMoveUp, onMoveDown }) => {
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const item = JSON.parse(raw);
      const comp = { id: `${item.id}-${Date.now()}`, type: item.id, props: {} };
      onAdd(comp);
    } catch (err) {
      console.error('drop parse failed', err);
    }
  };

  return (
    <div onDragOver={onDragOver} onDrop={onDrop} style={{ minHeight: 240, border: '1px dashed #ccc', padding: 12, borderRadius: 6, background: '#fafafa' }}>
      <Text variant="mediumPlus" styles={{ root: { marginBottom: 8 } }}>Page canvas (drop components here)</Text>
      <Stack tokens={{ childrenGap: 8 }}>
        {components.length === 0 && <Text variant="small">No components added yet — drag from the library.</Text>}
        {components.map((c, i) => (
          <div key={c.id} style={{ padding: 8, border: '1px solid #eee', borderRadius: 4, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text variant="smallPlus" styles={{ root: { fontWeight: 600 } }}>{c.type}</Text>
              <div style={{ fontSize: 12, color: '#666' }}>{JSON.stringify(c.props || {})}</div>
            </div>
            <Stack horizontal tokens={{ childrenGap: 8 }}>
              <DefaultButton text="Up" onClick={() => onMoveUp(i)} disabled={i === 0} />
              <DefaultButton text="Down" onClick={() => onMoveDown(i)} disabled={i === components.length - 1} />
              <DefaultButton text="Remove" onClick={() => onRemove(i)} />
            </Stack>
          </div>
        ))}
      </Stack>
    </div>
  );
};

export default PageCanvas;
