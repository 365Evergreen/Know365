import React from 'react';
import { Stack, Checkbox } from '@fluentui/react';

interface IconCardProps {
  id: string;
  name?: string;
  e365_Icontitle?: string;
  url?: string;
  selected?: boolean;
  onToggle: (id: string) => void;
}

const IconCard: React.FC<IconCardProps> = ({ id, name, e365_Icontitle, url, selected, onToggle }) => {
  return (
    <div style={{ width: 160, padding: 8, border: '1px solid var(--neutral-light, #e1e1e1)', borderRadius: 6 }}>
      <Stack tokens={{ childrenGap: 8 }} horizontalAlign="center">
        <div style={{ width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {url ? (
            // allow SVG or image previews
            // use object/img fallback so SVGs render correctly
            <img src={url} alt={e365_Icontitle || name || id} style={{ maxWidth: '100%', maxHeight: '100%' }} />
          ) : (
            <div style={{ width: 64, height: 64, background: '#f3f3f3', borderRadius: 6 }} />
          )}
        </div>

        <div style={{ textAlign: 'center', minHeight: 36 }}>
          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e365_Icontitle || name || id}</div>
        </div>

        <Checkbox label="Select" checked={!!selected} onChange={() => onToggle(id)} />
      </Stack>
    </div>
  );
};

export default IconCard;
