import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Stack, Text, DefaultButton, Spinner, SpinnerSize } from '@fluentui/react';
import DataGrid, { GridColumn } from '../components/DataGrid';
import { getKnowledgeArticlesByFunction } from '../services/dataverseClient';

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
        if (!mounted) return;
        setArticles(items || []);
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
          <DataGrid
            items={articles}
            columns={([
              {
                key: 'title',
                name: 'Title',
                fieldName: 'displayName',
                minWidth: 220,
                isResizable: true,
                onRender: (item: any) => {
                  return <Text style={{ fontWeight: 600 }}>{item.displayName || item.title || item.name}</Text>;
                },
              },
              {
                key: 'excerpt',
                name: 'Summary',
                fieldName: 'excerpt',
                minWidth: 240,
                isResizable: true,
                onRender: (item: any) => {
                  const excerpt = item.excerpt || item.preview || item.Excerpt || '';
                  return <Text>{excerpt}</Text>;
                },
              },
              {
                key: 'subject',
                name: 'Subject',
                fieldName: 'e365_knowledgearticlesubject',
                minWidth: 160,
                onRender: (item: any) => {
                  return <Text>{item.e365_knowledgearticlesubject?.Name || ''}</Text>;
                },
              },
              {
                key: 'source',
                name: 'Source',
                fieldName: 'siteUrl',
                minWidth: 160,
                onRender: (item: any) => {
                  const site = item.siteUrl || item.site || item.SiteUrl || item.graphUrl || '';
                  return site ? <a href={site} target="_blank" rel="noreferrer">Source</a> : <span />;
                },
              },
            ] as GridColumn[])}
            onItemInvoked={(item: any) => {
              // prefer an article web url if present, otherwise open the source site
              const url = item.webUrl || item.url || item.siteUrl || item.site || item.SiteUrl;
              if (url) {
                window.open(url, '_blank', 'noopener');
                return;
              }
              // fallback: navigate to a local detail route if available
              if (item.id || item.KnowledgeArticleId || item.knowledgearticleid) {
                navigate(`/knowledge/article/${item.id || item.KnowledgeArticleId || item.knowledgearticleid}`);
              } else {
                console.log('Item invoked, no url available', item);
              }
            }}
          />
        )}
      </div>
    </Stack>
  );
};

export default FunctionsPage;
