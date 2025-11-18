import React, { useEffect, useState } from 'react';
import { Stack, Text, Spinner, SpinnerSize } from '@fluentui/react';
import { useSearchParams } from 'react-router-dom';
import DocumentsDisplay from '../components/DocumentsDisplay';
import { getListBackedArticles } from '../services/dataverseClient';

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setError(null);
      setLoading(true);
      try {
        if (!q || q.trim() === '') {
          setResults([]);
          return;
        }
        const items = await getListBackedArticles(q, 200);
        if (!mounted) return;
        setResults(items || []);
      } catch (e: any) {
        console.error('Search failed', e);
        if (mounted) setError(e?.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [q]);

  return (
    <Stack styles={{ root: { padding: 24 } }}>
      <Text variant="xLarge">Search results</Text>
      <Text style={{ marginBottom: 12 }}>{q ? `Results for "${q}"` : 'Enter a search term in the header'}</Text>
      {loading ? (
        <Spinner label="Searching…" size={SpinnerSize.medium} />
      ) : error ? (
        <Text variant="small" styles={{ root: { color: 'var(--ms-color-red-10)' } }}>Error: {error}</Text>
      ) : (
        <DocumentsDisplay items={(results || []).map((a: any) => ({ id: a.id || a.name || Math.random().toString(36).slice(2), title: a.title || a.name || '', webUrl: a.webUrl, excerpt: a._raw?.excerpt || a._raw?.summary || a._raw?.description || '', _raw: a }))} view="list" onItemClick={(it) => { if (it.webUrl) window.open(it.webUrl, '_blank', 'noopener'); }} />
      )}
    </Stack>
  );
};

export default SearchPage;
