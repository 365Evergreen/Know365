import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Stack, Text, DefaultButton, Spinner, SpinnerSize } from '@fluentui/react';
import { getKnowledgeArticlesByFunction, getKnowledgeSources } from '../services/dataverseClient';
import { mapSharePointDocsToDisplayItems, listLibraryItems } from '../services/sharePointGraph';
import DocumentsDisplay from '../components/DocumentsDisplay';

const readable = (s?: string) => (s || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const FunctionsPage: React.FC = () => {
  const params = useParams<{ fn?: string }>();
  const navigate = useNavigate();
  const fn = params.fn; // e.g. 'finance' or 'hr'

  const title = fn ? readable(fn) : 'Functions';
  const [articles, setArticles] = useState<any[] | null>(null);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [articlesError, setArticlesError] = useState<string | null>(null);
  const [ksDebug, setKsDebug] = useState<any[] | null>(null);
  const [sourceDebug, setSourceDebug] = useState<any[] | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!fn) {
        setArticles([]);
        return;
      }
      // fetch KnowledgeSources for debugging/inspection
      let debugKs: any[] = [];
      try {
        debugKs = (await getKnowledgeSources()) || [];
        setKsDebug(debugKs);
      } catch (e) {
        debugKs = [];
        setKsDebug([]);
      }
      setLoadingArticles(true);
      setArticlesError(null);
      try {
        const items = await getKnowledgeArticlesByFunction(fn);
        // If no items returned, attempt a broader fallback: fetch articles from all KnowledgeSources
        // and filter by site/list name matching the function slug. This helps when Dataverse
        // KnowledgeSource records don't have a matching businessFunction field but point
        // to the right SharePoint list.
        let finalItems = items || [];
        if ((!finalItems || finalItems.length === 0)) {
          try {
            const { getArticlesFromKnowledgeSources } = await import('../services/dataverseClient');
            const all = await getArticlesFromKnowledgeSources();
            const slug = (fn || '').toLowerCase();
            finalItems = (all || []).filter((a: any) => {
              try {
                const url = (a.webUrl || a._raw?.webUrl || a._raw?.SiteUrl || '').toLowerCase();
                const source = (a.source || '').toLowerCase();
                return url.includes(slug) || source.includes(slug) || url.includes('/sites/' + slug);
              } catch {
                return false;
              }
            });
          } catch (e) {
            // ignore fallback errors
          }
        }
        if (!mounted) return;
        setArticles(finalItems || []);

        // Per-source diagnostics: for each KnowledgeSource matching this function,
        // attempt to list items directly and report counts/sample items.
        try {
          const fnName = (fn || '')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase())
            .replace(/'/g, "''");
          const matchingSources = (debugKs || []).filter((s: any) => (s.businessFunction || '').toLowerCase() === fnName.toLowerCase());
          const perSource: any[] = [];
          for (const s of matchingSources) {
            try {
              let itemsForSource: any[] = [];
              // Prefer GraphEndpoint when present — listLibraryItems will also handle drive/list fallback
              try {
                if (s.GraphEndpoint) {
                  // let listLibraryItems handle endpoints too for consistency
                }
                if (s.SharePointSiteUrl && s.LibraryName) {
                  itemsForSource = await listLibraryItems(s.SharePointSiteUrl, s.LibraryName, 50);
                }
              } catch (srcErr) {
                itemsForSource = [];
              }
              perSource.push({ source: s, count: Array.isArray(itemsForSource) ? itemsForSource.length : 0, sample: (itemsForSource || []).slice(0, 5) });
            } catch (e) {
              perSource.push({ source: s, error: String(e) });
            }
          }
          if (mounted) setSourceDebug(perSource);
        } catch (diagErr) {
          // ignore diagnostics errors
          if (mounted) setSourceDebug([]);
        }
      } catch (err: any) {
        console.error(err);
        if (mounted) setArticlesError(err.message || String(err));
      } finally {
        if (mounted) setLoadingArticles(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [fn]);

  return (
    <Stack styles={{ root: { padding: 24 } }} tokens={{ childrenGap: 12 }}>
      <Text variant="xLarge">{title}</Text>
      <Text>
        {fn
          ? `This page shows knowledge for the ${title} function. Use the filters or cards below to browse ${title} content.`
          : 'Select a function to view knowledge for that area.'}
      </Text>

      {/* Example quick links to switch functions using the same page */}
      <Stack horizontal tokens={{ childrenGap: 8 }} styles={{ root: { marginTop: 12 } }}>
        <DefaultButton onClick={() => navigate('/functions/operations')}>Operations</DefaultButton>
        <DefaultButton onClick={() => navigate('/functions/customer-service')}>Customer Service</DefaultButton>
        <DefaultButton onClick={() => navigate('/functions/finance')}>Finance</DefaultButton>
        <DefaultButton onClick={() => navigate('/functions/hr')}>Human Resources</DefaultButton>
      </Stack>

      <div style={{ marginTop: 20 }}>
        <h2>{title} Articles</h2>
        {loadingArticles ? (
          <Spinner label="Loading articles…" size={SpinnerSize.small} />
        ) : articlesError ? (
          <Text variant="small" style={{ color: 'var(--ms-color-red-10)' }}>Error loading articles: {articlesError}</Text>
        ) : !articles || articles.length === 0 ? (
          <Text variant="small">No articles found for {title}.</Text>
        ) : (
          <DocumentsDisplay
            items={(() => {
              // If items look like raw SharePoint list/drive items, map them to the UI shape
              const arr = (articles || []);
              if (arr.length > 0) {
                const looksLikeSharePoint = !!(arr[0].webUrl || arr[0].name || arr[0].sharepointIds || arr[0].fields);
                if (looksLikeSharePoint) {
                  return mapSharePointDocsToDisplayItems(arr as any[]);
                }
              }
              return (arr || []).map((a: any) => ({
                id: a.id,
                title: a.title || a.displayName || a.name,
                webUrl: a.webUrl,
                lastModifiedDateTime: a.lastModifiedDateTime,
                source: a.source,
                excerpt: a.excerpt || a._raw?.excerpt || a._raw?.summary || a._raw?.description || a._raw?.fields?.Description || (a._raw?.body?.content ? String(a._raw.body.content).slice(0, 400) : ''),
                _raw: a._raw,
              }));
            })()}
            view="list"
            onItemClick={(item) => {
              if (item.webUrl) window.open(item.webUrl, '_blank', 'noopener');
              else if (item.id) navigate(`/knowledge/article/${item.id}`);
            }}
          />
        )}
      </div>
      {/* Debug: show KnowledgeSources count and a small preview when available */}
      {ksDebug !== null && (
        <div style={{ marginTop: 18, padding: 12, border: '1px dashed #ddd', borderRadius: 6 }}>
          <Text variant="small">KnowledgeSources found: {ksDebug.length}</Text>
          <pre style={{ marginTop: 8, maxHeight: 160, overflow: 'auto', fontSize: 12 }}>
            {JSON.stringify((ksDebug || []).slice(0, 5).map((s: any) => ({ SourceName: s.SourceName || s.SourceName, SharePointSiteUrl: s.SharePointSiteUrl, LibraryName: s.LibraryName, businessFunction: s.businessFunction || s.raw?.e365_businessfunctionname || '' })), null, 2)}
          </pre>
        </div>
      )}
      {sourceDebug !== null && (
        <div style={{ marginTop: 18, padding: 12, border: '1px dashed #f0a', borderRadius: 6 }}>
          <Text variant="small">Per-Source Diagnostics (matching this function):</Text>
          <pre style={{ marginTop: 8, maxHeight: 260, overflow: 'auto', fontSize: 12 }}>
            {JSON.stringify((sourceDebug || []).map((p: any) => ({ SourceName: p.source?.SourceName || p.source?.raw?.SourceName, count: p.count, sample: p.sample && p.sample.map((it: any) => ({ id: it.id, name: it.name, webUrl: it.webUrl })) , error: p.error })), null, 2)}
          </pre>
        </div>
      )}
    </Stack>
  );
};

export default FunctionsPage;
