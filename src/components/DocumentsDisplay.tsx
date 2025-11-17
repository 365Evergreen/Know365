import React from 'react';
import { Stack, Text, DefaultButton, DocumentCard, DocumentCardTitle, DocumentCardDetails } from '@fluentui/react';

export type DocumentItem = {
  id: string;
  title: string;
  webUrl?: string;
  lastModifiedDateTime?: string;
  source?: string;
  excerpt?: string;
  _raw?: any;
};

type Props = {
  items: DocumentItem[];
  view?: 'list' | 'card' | 'grid';
  onItemClick?: (item: DocumentItem) => void;
};

const DocumentsDisplay: React.FC<Props> = ({ items = [], view = 'list', onItemClick }) => {
  if (!items || items.length === 0) return <Text>No documents to display.</Text>;

  if (view === 'grid' || view === 'card') {
    return (
      <Stack horizontal wrap tokens={{ childrenGap: 12 }}>
        {items.map((it) => (
          <div key={it.id} style={{ width: 320 }}>
            <DocumentCard onClick={() => onItemClick && onItemClick(it)}>
              <DocumentCardDetails>
                <DocumentCardTitle title={it.title} shouldTruncate />
                <div style={{ marginTop: 8 }}>
                  <Text variant="small">{it.source}</Text>
                </div>
              </DocumentCardDetails>
            </DocumentCard>
          </div>
        ))}
      </Stack>
    );
  }

  // default: list view
  return (
    <Stack tokens={{ childrenGap: 8 }}>
          {items.map((it) => (
            <div key={it.id} style={{ padding: 12, border: '1px solid #eee', borderRadius: 6 }}>
              <Stack tokens={{ childrenGap: 8 }}>
                <div>
                  <Text variant="large" styles={{ root: { fontWeight: 600 } }}>{it.title}</Text>
                </div>
                <div>
                  <Text variant="medium" styles={{ root: { color: 'var(--ms-color-neutralPrimary)', lineHeight: 1.5 } }}>{it.excerpt || it._raw?.excerpt || it._raw?.summary || it._raw?.description || it._raw?.fields?.Description || ''}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <DefaultButton onClick={() => onItemClick && onItemClick(it)}>Open</DefaultButton>
                </div>
              </Stack>
            </div>
          ))}
    </Stack>
  );
};

export default DocumentsDisplay;
