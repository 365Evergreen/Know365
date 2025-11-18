import React, { useEffect, useState } from 'react';
import { Stack, Text, Link, Spinner, SpinnerSize } from '@fluentui/react';
import { getKnowledgeSources, getArticlesFromKnowledgeSources } from '../services/dataverseClient';

const normalize = (s?: string) => (s || '').toString().trim().toLowerCase();

const CommunicationsTest: React.FC = () => {
  const [items, setItems] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const sources = (await getKnowledgeSources()) as any[] || [];
        const mapFn: Record<string, string> = {};
        for (const s of sources) {
          // prefer normalized businessFunction field added by server-side mapping
          const bf = s.businessFunction || s.raw?.e365_knowledgesourcetext || s.raw?.e365_businessfunctionname || '';
          mapFn[(s.SourceName || s.SourceName || '').toString()] = normalize(bf) as string;
        }

        const all = await getArticlesFromKnowledgeSources();
        const filtered = (all || []).filter((a: any) => {
          try {
            const src = a.source || '';
            return mapFn[src] === 'communications';
          } catch {
            return false;
          }
        });

        // Map to simple display model
        const display = filtered.map((a: any) => ({
          id: a.id || a._raw?.id || a._raw?.Name || a._raw?.name || Math.random().toString(36).slice(2),
          title: a.title || a._raw?.title || a._raw?.name || a._raw?.displayName || a.name || 'Untitled',
          excerpt:
            a.excerpt || a._raw?.excerpt || a._raw?.summary || a._raw?.description || a._raw?.fields?.Description || (a._raw?.body?.content ? String(a._raw.body.content).slice(0, 400) : ''),
          webUrl: a.webUrl || a._raw?.webUrl || a._raw?.SiteUrl || null,
        }));

        if (!mounted) return;
        setItems(display);
      } catch (e: any) {
        console.error('CommunicationsTest load failed', e);
        if (mounted) setError(String(e?.message || e));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  return (
    <Stack tokens={{ childrenGap: 12 }} styles={{ root: { padding: 24 } }}>
      <Text variant="xLarge">Communications — Test</Text>
      <Text>This page shows all items whose KnowledgeSource `e365_knowledgesourcetext` = <b>Communications</b>.</Text>

      {loading ? (
        <Spinner label="Loading…" size={SpinnerSize.small} />
      ) : error ? (
        <Text style={{ color: 'var(--ms-color-red-10)' }}>{error}</Text>
      ) : !items || items.length === 0 ? (
        <Text>No items found for Communications.</Text>
      ) : (
        <Stack tokens={{ childrenGap: 16 }}>
          {items.map((it) => (
            <Stack key={it.id} styles={{ root: { padding: 12, border: '1px solid #eee', borderRadius: 6 } }}>
              <Stack horizontal horizontalAlign="space-between" styles={{ root: { marginBottom: 8 } }}>
                <Text variant="large" styles={{ root: { fontWeight: 600 } }}>{it.title}</Text>
                {it.webUrl ? (
                  <Link href={it.webUrl} target="_blank" rel="noopener">Open</Link>
                ) : null}
              </Stack>
              <Text variant="small">{it.excerpt || <i>No excerpt available</i>}</Text>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
};

export default CommunicationsTest;
