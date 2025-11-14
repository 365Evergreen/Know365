import React, { useState } from 'react';
import { Pivot, PivotItem, DetailsList, IColumn, SelectionMode, Text, Stack } from '@fluentui/react';

interface Document {
  title: string;
  category: string;
  author: string;
  modified: string;
}

const mockDocuments: Document[] = [
  { title: 'Getting Started Guide', category: 'Onboarding', author: 'John Doe', modified: '2 days ago' },
  { title: 'Security Best Practices', category: 'Security', author: 'Jane Smith', modified: '1 week ago' },
  { title: 'Power Platform Overview', category: 'Technology', author: 'Mike Johnson', modified: '3 days ago' },
  { title: 'Azure Resources Guide', category: 'Cloud', author: 'Sarah Williams', modified: '5 days ago' },
];

const columns: IColumn[] = [
  {
    key: 'title',
    name: 'Title',
    fieldName: 'title',
    minWidth: 200,
    maxWidth: 300,
    isResizable: true,
  },
  {
    key: 'category',
    name: 'Category',
    fieldName: 'category',
    minWidth: 100,
    maxWidth: 150,
    isResizable: true,
  },
  {
    key: 'author',
    name: 'Author',
    fieldName: 'author',
    minWidth: 100,
    maxWidth: 150,
    isResizable: true,
  },
  {
    key: 'modified',
    name: 'Modified',
    fieldName: 'modified',
    minWidth: 100,
    maxWidth: 120,
    isResizable: true,
  },
];

interface ContentTabsProps {
  query?: string;
}

const ContentTabs: React.FC<ContentTabsProps> = ({ query = '' }) => {
  const [selectedKey, setSelectedKey] = useState<string>('recent');

  const filterDocuments = (items: Document[]) => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((d) =>
      d.title.toLowerCase().includes(q) || d.category.toLowerCase().includes(q) || d.author.toLowerCase().includes(q)
    );
  };

  return (
    <Stack styles={{ root: { padding: '2rem', minHeight: '400px' } }}>
      <Text variant="xLarge" block styles={{ root: { marginBottom: '1rem' } }}>
        Knowledge Base
      </Text>
      <Pivot
        aria-label="Content categories"
        selectedKey={selectedKey}
        onLinkClick={(item) => setSelectedKey(item?.props.itemKey || 'recent')}
      >
        <PivotItem headerText="Recent" itemKey="recent">
          <DetailsList
            items={filterDocuments(mockDocuments)}
            columns={columns}
            selectionMode={SelectionMode.none}
            isHeaderVisible={true}
          />
        </PivotItem>
        <PivotItem headerText="Popular" itemKey="popular">
          <DetailsList
            items={filterDocuments(mockDocuments.slice(0, 2))}
            columns={columns}
            selectionMode={SelectionMode.none}
            isHeaderVisible={true}
          />
        </PivotItem>
        <PivotItem headerText="Categories" itemKey="categories">
          <Text>Browse by category - coming soon</Text>
        </PivotItem>
      </Pivot>
    </Stack>
  );
};

export default ContentTabs;
