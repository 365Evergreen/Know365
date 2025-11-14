import React, { Suspense } from 'react';
import { Stack } from '@fluentui/react';
import ContentTabs from '../components/ContentTabs';
import { useSearchParams } from 'react-router-dom';

const Knowledge: React.FC = () => {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';

  return (
    <main aria-labelledby="knowledge-heading">
      <Stack tokens={{ childrenGap: 12 }} styles={{ root: { padding: '24px' } }}>
        <h1 id="knowledge-heading">Knowledge</h1>
        {q ? (
          <p>
            Search results for <strong>{q}</strong>
          </p>
        ) : (
          <p>Browse and search organizational knowledge. This page uses the existing <code>ContentTabs</code> component.</p>
        )}
        <Suspense fallback={<div>Loading content tabs…</div>}>
          <ContentTabs query={q} />
        </Suspense>
      </Stack>
    </main>
  );
};

export default Knowledge;
