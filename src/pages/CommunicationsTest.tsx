import React, { useEffect, useState } from 'react';
import { Stack, Text, Link, Spinner, SpinnerSize } from '@fluentui/react';
import { getAccessToken, getGraphClient } from '../services/graphClient';

const CommunicationsTest = (): JSX.Element => {
  const [itemsState, setItemsState] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagMessages, setDiagMessages] = useState<string[]>([]);

  useEffect(() => {
    // capture unhandled promise rejections to help diagnose the 'message channel closed' error
    const onUnhandled = (ev: PromiseRejectionEvent) => {
      try {
        const msg = typeof ev.reason === 'string' ? ev.reason : (ev.reason && ev.reason.message) ? ev.reason.message : JSON.stringify(ev.reason || 'unknown');
        const stack = ev.reason && ev.reason.stack ? `\n${ev.reason.stack}` : '';
        const text = `[unhandledrejection] ${msg}${stack}`;
        console.warn(text);
        setDiagMessages((s) => [text, ...s].slice(0, 20));
      } catch (e) {
        console.warn('Error formatting unhandled rejection', e);
      }
    };
    window.addEventListener('unhandledrejection', onUnhandled as EventListener);

    // also capture window messages for extra context (no-op handler)
    const onMessage = (ev: MessageEvent) => {
      try {
        const src = ev?.origin || 'unknown-origin';
        const payload = typeof ev.data === 'string' ? ev.data : JSON.stringify(ev.data || {});
        setDiagMessages((s) => [`[message] from ${src}: ${payload}`, ...s].slice(0, 20));
      } catch { /* ignore */ }
    };
    window.addEventListener('message', onMessage as EventListener);
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // allow overriding which list endpoint to call via query param `?endpoint=` (path or full graph url)
        const qs = new URLSearchParams(window.location.search || '');
        let graphListPath = qs.get('endpoint') || '/sites/365evergreen.sharepoint.com,7b7973e8-f444-4b2f-9e53-2a7a291d6228,162f408a-43a4-40bd-a962-607e5a08dc12/lists/b182d225-4418-45b6-b6e4-596edf748041/items?expand=fields';

        // Accept a full Graph URL (starting with https://graph.microsoft.com) and convert to path
        if (graphListPath.startsWith('https://graph.microsoft.com')) {
          graphListPath = graphListPath.replace('https://graph.microsoft.com/v1.0', '');
        }

        const token = await getAccessToken();
        const client = getGraphClient(token);
        const res: any = await client.api(graphListPath).get();
        const rows: any[] = res?.value || [];

        const getField = (fields: any, ...keys: string[]) => {
          if (!fields) return undefined;
          for (const k of keys) {
            if (k in fields && fields[k] !== null && fields[k] !== undefined) return fields[k];
            const lk = k.toLowerCase();
            for (const fkey of Object.keys(fields)) {
              if (fkey.toLowerCase() === lk && fields[fkey] !== null && fields[fkey] !== undefined) return fields[fkey];
            }
          }
          return undefined;
        };

        const display = rows.map((r: any) => {
          const fields = r.fields || {};
          const title = getField(fields, 'Title', 'title', 'Name', 'name') || 'Untitled';
          const excerpt = getField(fields, 'Description', 'description', 'Body', 'body') || JSON.stringify(fields).slice(0, 300);

          // metadata fields that may exist in list-driven content or be mapped later
          const knowledgeSource = getField(fields, 'e365_knowledgesourcetext', 'KnowledgeSource', 'KnowledgeSourceText', 'Source') || null;
          const sourceType = getField(fields, 'e365_sourcetype', 'SourceType') || null;
          const businessFunction = getField(fields, 'e365_businessfunction', 'BusinessFunction') || null;

          let webUrl: string | null = r.webUrl || null;
          if (!webUrl && fields.FileRef) {
            try {
              const host = 'https://365evergreen.sharepoint.com';
              webUrl = host + (fields.FileRef.startsWith('/') ? fields.FileRef : ('/' + fields.FileRef));
            } catch { webUrl = null; }
          }

          return {
            id: r.id || r.fields?.Id || Math.random().toString(36).slice(2),
            title,
            excerpt,
            webUrl,
            metadata: { knowledgeSource, sourceType, businessFunction },
            raw: r,
          };
        });

        if (!mounted) return;

        // If any rows include a knowledgeSource value, prefer filtering to that source (case-insensitive)
        const anyHaveKS = display.some((d) => d.metadata && d.metadata.knowledgeSource);
        let final = display;
        if (anyHaveKS) {
          final = display.filter((d) => {
            const ks = (d.metadata?.knowledgeSource || '').toString().toLowerCase();
            return ks === 'communications' || ks === 'communication' || ks.includes('communications');
          });
        }

        setItemsState(final);
      } catch (e: any) {
        console.error('CommunicationsTest load failed', e);
        if (mounted) setError(String(e?.message || e));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
      window.removeEventListener('unhandledrejection', onUnhandled as EventListener);
      window.removeEventListener('message', onMessage as EventListener);
    };
  }, []);

  return (
    <Stack tokens={{ childrenGap: 12 }} styles={{ root: { padding: 24 } }}>
      <Text variant="xLarge">Communications — Test</Text>
      <Text>
        {'This page shows all items whose KnowledgeSource '}
        <span style={{ fontFamily: 'monospace', background: '#f3f2f1', padding: '0 6px', borderRadius: 4 }}>e365_knowledgesourcetext</span>
        {' = '}
        <strong>Communications</strong>
        {'.'}
      </Text>

      {loading ? (
        <Spinner label="Loading…" size={SpinnerSize.small} />
      ) : error ? (
        <Text style={{ color: 'var(--ms-color-red-10)' }}>{error}</Text>
      ) : !itemsState || itemsState.length === 0 ? (
        <Text>No items found for Communications.</Text>
      ) : (
        <Stack tokens={{ childrenGap: 16 }}>
          {itemsState.map((it) => (
            <Stack key={it.id} styles={{ root: { padding: 12, border: '1px solid #eee', borderRadius: 6 } }}>
              <Stack horizontal horizontalAlign="space-between" styles={{ root: { marginBottom: 8 } }}>
                <Text variant="large" styles={{ root: { fontWeight: 600 } }}>{it.title}</Text>
                {it.webUrl ? (
                  <Link href={it.webUrl} target="_blank" rel="noopener">Open</Link>
                ) : null}
              </Stack>

              {/* metadata line */}
              {(it.metadata && (it.metadata.knowledgeSource || it.metadata.sourceType || it.metadata.businessFunction)) ? (
                <Text variant="small" styles={{ root: { color: '#666', marginBottom: 8 } }}>
                  {it.metadata.knowledgeSource ? <>KnowledgeSource: {it.metadata.knowledgeSource}</> : null}
                  {it.metadata.sourceType ? <> {' '}• SourceType: {it.metadata.sourceType}</> : null}
                  {it.metadata.businessFunction ? <> {' '}• BusinessFunction: {it.metadata.businessFunction}</> : null}
                </Text>
              ) : null}

              <Text variant="small">{it.excerpt || <i>No excerpt available</i>}</Text>
            </Stack>
          ))}
        </Stack>
      )}

      {diagMessages.length > 0 && (
        <Stack styles={{ root: { marginTop: 20, padding: 12, border: '1px dashed #ddd', background: '#fafafa' } }}>
          <Text variant="mediumPlus">Diagnostics</Text>
          {diagMessages.map((m, i) => (
            <Text key={i} styles={{ root: { whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12 } }}>{m}</Text>
          ))}
        </Stack>
      )}
    </Stack>
  );
};

export default CommunicationsTest;
