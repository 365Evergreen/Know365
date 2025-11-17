import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Stack, Text, DefaultButton, Spinner, SpinnerSize } from '@fluentui/react';
import { getKnowledgeArticlesByFunction } from '../services/dataverseClient';
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

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!fn) {
        setArticles([]);
        return;
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
            items={(articles || []).map((a: any) => ({ id: a.id, title: a.title || a.displayName || a.name, webUrl: a.webUrl, lastModifiedDateTime: a.lastModifiedDateTime, source: a.source }))}
            view="list"
            onItemClick={(item) => {
              if (item.webUrl) window.open(item.webUrl, '_blank', 'noopener');
              else if (item.id) navigate(`/knowledge/article/${item.id}`);
            }}
          />
        )}
      </div>
    </Stack>
  );
};

export default FunctionsPage;
