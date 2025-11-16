import React from 'react';
import { Text, Icon } from '@fluentui/react';

interface CardItem {
  id: string;
  title: string;
  description?: string;
  href?: string;
  onClick?: () => void;
  count?: number; // optional article count to display like "(11 Articles)"
}


const GridCards: React.FC<{ items?: CardItem[] }> = ({ items }) => {
  const cards = items ?? Array.from({ length: 6 }).map((_, i) => ({
    id: `placeholder-${i}`,
    title: `Placeholder ${i + 1}`,
    description: 'This is placeholder text. Replace with Dataverse content later.',
    href: '#',
    onClick: undefined,
    count: undefined,
  }));
  

  // split into two columns for the layout similar to the provided design
  const mid = Math.ceil(cards.length / 2);
  const left = cards.slice(0, mid);
  const right = cards.slice(mid);

  const iconForTitle = (title?: string) => {
    if (!title) return 'Page';
    const t = title.toLowerCase();
    if (t.includes('account')) return 'Contact';
    if (t.includes('getting') || t.includes('start')) return 'Rocket';
    if (t.includes('billing') || t.includes('payment') || t.includes('invoice')) return 'Money';
    if (t.includes('copyright') || t.includes('legal')) return 'Gavel';
    if (t.includes('mobile') || t.includes('app')) return 'Phone';
    if (t.includes('developer') || t.includes('dev')) return 'Code';
    if (t.includes('help') || t.includes('support')) return 'Help';
    return 'Page';
  };

  const itemRow = (c: CardItem) => {
    const desc = c.description && c.description.trim() ? c.description : `Guides and articles for ${c.title}.`;
    return (
      <div key={c.id} role="article" aria-labelledby={`${c.id}-title`} style={{ padding: '12px 0' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 56, height: 56, borderRadius: 8, border: '1px solid var(--ms-color-neutralTertiaryAlt)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
            <Icon iconName={iconForTitle(c.title)} styles={{ root: { fontSize: 28, color: 'var(--ms-color-themePrimary)' } }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'space-between' }}>
              {c.onClick ? (
                <button
                  onClick={c.onClick}
                  aria-label={`Open ${c.title}`}
                  style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}
                >
                  <Text id={`${c.id}-title`} variant="large" styles={{ root: { fontWeight: 700, color: 'var(--ms-color-themePrimary)' } }}>{c.title}</Text>
                </button>
              ) : (
                <Text id={`${c.id}-title`} variant="large" styles={{ root: { fontWeight: 700 } }}>{c.title}</Text>
              )}
              {typeof c.count === 'number' ? (
                <Text variant="small" styles={{ root: { color: 'rgba(0,0,0,0.5)' } }}>({c.count} Articles)</Text>
              ) : null}
            </div>
            <Text variant="small" styles={{ root: { color: 'rgba(0,0,0,0.6)', marginTop: 6, display: 'block' } }}>{desc}</Text>
          </div>
        </div>
        <div style={{ height: 1, background: '#efefef', marginTop: 12 }} />
      </div>
    );
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px', minWidth: 320 }}>
          {left.map(itemRow)}
        </div>
        <div style={{ flex: '1 1 320px', minWidth: 320 }}>
          {right.map(itemRow)}
        </div>
      </div>
    </div>
  );
};

export default GridCards;
