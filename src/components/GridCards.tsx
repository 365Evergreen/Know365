import React from 'react';
import { Stack, Card, Text, Link, IStackStyles } from '@fluentui/react';

interface CardItem {
  id: string;
  title: string;
  description?: string;
  href?: string;
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
        <Card key={c.id} styles={{ root: { width: 280, padding: 12, boxSizing: 'border-box' } }}>
          <Stack tokens={{ childrenGap: 8 }}>
            <Text variant="large" styles={{ root: { fontWeight: 600 } }}>{c.title}</Text>
            <Text variant="small" styles={{ root: { color: 'rgba(0,0,0,0.6)' } }}>{c.description}</Text>
            <div style={{ marginTop: 8 }}>
              <Link href={c.href} underline>
                View
              </Link>
            </div>
          </Stack>
        </Card>
      ))}
    </Stack>
  );
};

export default GridCards;
