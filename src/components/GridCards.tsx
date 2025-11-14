import React from 'react';
import { Stack, Text, Link, IStackStyles } from '@fluentui/react';

interface CardItem {
  id: string;
  title: string;
  description?: string;
  href?: string;
  onClick?: () => void;
}

const stackStyles: IStackStyles = { root: { width: '100%' } };

const GridCards: React.FC<{ items?: CardItem[] }> = ({ items }) => {
  const cards = items ?? Array.from({ length: 6 }).map((_, i) => ({
    id: `placeholder-${i}`,
    title: `Placeholder ${i + 1}`,
    description: 'This is placeholder text. Replace with Dataverse content later.',
    href: '#',
  }));

  return (
    <Stack horizontal wrap tokens={{ childrenGap: 16 }} styles={stackStyles}>
      {cards.map((c) => (
        <div
          key={c.id}
          role="article"
          aria-labelledby={`${c.id}-title`}
          style={{ width: 280, padding: 12, boxSizing: 'border-box', border: '1px solid #e1e1e1', borderRadius: 6, background: '#fff' }}
        >
          <Stack tokens={{ childrenGap: 8 }}>
            <Text id={`${c.id}-title`} variant="large" styles={{ root: { fontWeight: 600 } }}>{c.title}</Text>
            <Text variant="small" styles={{ root: { color: 'rgba(0,0,0,0.6)' } }}>{c.description}</Text>
            <div style={{ marginTop: 8 }}>
              {c.onClick ? (
                <button onClick={c.onClick} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--ms-color-themePrimary)', cursor: 'pointer' }}>
                  View
                </button>
              ) : (
                <Link href={c.href} underline>
                  View
                </Link>
              )}
            </div>
          </Stack>
        </div>
      ))}
    </Stack>
  );
};

export default GridCards;
