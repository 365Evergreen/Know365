import React, { Suspense, useEffect, useState } from 'react';
import { Stack, Text, Link, Spinner, SpinnerSize } from '@fluentui/react';
import ContentTabs from '../components/ContentTabs';
import { useSearchParams } from 'react-router-dom';
import { getKnowledgeSources, getKnowledgeArticles } from '../services/dataverseClient';

interface KnowledgeSource {
  SourceName: string;
  SharePointSiteUrl?: string;
  LibraryName?: string;
  GraphEndpoint?: string;
}

const Knowledge: React.FC = () => {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';

  const [sources, setSources] = useState<KnowledgeSource[] | null>(null);
  const [loadingSources, setLoadingSources] = useState(false);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [articles, setArticles] = useState<any[] | null>(null);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [articlesError, setArticlesError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingSources(true);
      setSourcesError(null);
      try {
        const items = await getKnowledgeSources();
        if (!mounted) return;
        setSources(items.map((i: any) => ({
          SourceName: i.SourceName || i.sourceName || i.name || 'Unnamed',
          SharePointSiteUrl: i.SharePointSiteUrl || i.sharePointSiteUrl || i.siteUrl,
          LibraryName: i.LibraryName || i.libraryName || i.library,
          GraphEndpoint: i.GraphEndpoint || i.graphEndpoint || i.graphEndpoint,
        })));
      } catch (err: any) {
        console.error(err);
        if (mounted) setSourcesError(err.message || String(err));
      } finally {
        if (mounted) setLoadingSources(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadArticles = async () => {
      setLoadingArticles(true);
      setArticlesError(null);
        try {
        const items = await getKnowledgeArticles(q ?? undefined);
        if (!mounted) return;
        // dedupe articles by id or title to avoid duplicate renderings
        const seen = new Set<string>();
        const deduped = (items || []).filter((a: any) => {
          const key = (a.id || a.KnowledgeArticleId || a.articleid || a.displayName || a.title || '').toString();
          if (!key) return false;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setArticles(deduped || []);
      } catch (err: any) {
        console.error(err);
        if (mounted) setArticlesError(err.message || String(err));
      } finally {
        if (mounted) setLoadingArticles(false);
      }
    };
    loadArticles();
    return () => { mounted = false; };
  }, [q]);

  return (
    <main aria-labelledby="knowledge-heading">
      <Stack tokens={{ childrenGap: 12 }} styles={{ root: { padding: '24px' } }}>
        <h1 id="knowledge-heading">Knowledge</h1>
        {q ? (
          <p>
            Search results for <strong>{q}</strong>
          </p>
        ) : (
          <>
            <p>Browse and search organizational knowledge. This page uses the existing <code>ContentTabs</code> component.</p>

            <section aria-labelledby="sources-heading">
              <h2 id="sources-heading">Registered Sources</h2>
              {loadingSources ? (
                <Spinner label="Loading sources…" size={SpinnerSize.medium} />
              ) : sourcesError ? (
                <Text variant="small" style={{ color: 'var(--ms-color-red-10)' }}>Error loading sources: {sourcesError}</Text>
              ) : !sources || sources.length === 0 ? (
                <Text variant="small">No knowledge sources registered yet.</Text>
              ) : (
                <Stack tokens={{ childrenGap: 8 }}>
                  {sources.map((s, idx) => (
                    <Stack horizontal tokens={{ childrenGap: 12 }} key={idx} styles={{ root: { alignItems: 'center' } }}>
                      <Stack.Item grow>
                        <Text variant="mediumPlus">{s.SourceName}</Text>
                        <div>
                          {s.SharePointSiteUrl && (
                            <Text variant="small">Site: <Link href={s.SharePointSiteUrl} target="_blank" rel="noreferrer">{s.SharePointSiteUrl}</Link></Text>
                          )}
                        </div>
                        {s.LibraryName && <Text variant="small">Library: {s.LibraryName}</Text>}
                        {s.GraphEndpoint && <Text variant="small">Graph: {s.GraphEndpoint}</Text>}
                      </Stack.Item>
                    </Stack>
                  ))}
                </Stack>
              )}
              <div style={{ marginTop: 16 }}>
                <h3>Articles</h3>
                {loadingArticles ? (
                  <Spinner label="Loading articles…" size={SpinnerSize.small} />
                ) : articlesError ? (
                  <Text variant="small" style={{ color: 'var(--ms-color-red-10)' }}>Error loading articles: {articlesError}</Text>
                ) : !articles || articles.length === 0 ? (
                  <Text variant="small">No articles found.</Text>
                ) : (
                  <Stack tokens={{ childrenGap: 8 }}>
                    {articles.map((a, i) => {
                      const title = a.displayName || a.title || a.Title || a.name || a.subject || 'Untitled';
                      const excerpt = a.excerpt || a.preview || a.Excerpt || a.previewText || '';
                      const site = a.siteUrl || a.site || a.SiteUrl || a.siteUrl;
                      return (
                        <Stack key={i} tokens={{ childrenGap: 4 }}>
                          <Text variant="medium">{title}</Text>
                          {excerpt && <Text variant="small">{excerpt}</Text>}
                          {site && (
                            <Text variant="small">Source: <Link href={site} target="_blank" rel="noreferrer">{site}</Link></Text>
                          )}
                        </Stack>
                      );
                    })}
                  </Stack>
                )}
              </div>
            </section>
          </>
        )}
        <Suspense fallback={<div>Loading content tabs…</div>}>
          <ContentTabs query={q} />
        </Suspense>
      </Stack>
    </main>
  );
};

export default Knowledge;
