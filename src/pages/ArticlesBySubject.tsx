import React, { useEffect, useState } from 'react';
import { Stack, Text, Link, Spinner, SpinnerSize } from '@fluentui/react';
import { useParams, useLocation } from 'react-router-dom';
import { getKnowledgeArticlesBySubject } from '../services/dataverseClient';

const ArticlesBySubject: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const location = useLocation();
  const subjectTitle = (location.state as any)?.title;

  const [articles, setArticles] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subjectId) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const id = decodeURIComponent(subjectId);
        const items = await getKnowledgeArticlesBySubject(id, 200);
        if (!mounted) return;
        setArticles(items || []);
      } catch (err: any) {
        console.error(err);
        if (mounted) setError(err.message || String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [subjectId]);

  return (
    <main aria-labelledby="articles-by-subject-heading">
      <Stack tokens={{ childrenGap: 12 }} styles={{ root: { padding: 24 } }}>
        <h1 id="articles-by-subject-heading">Articles{subjectTitle ? ` — ${subjectTitle}` : ''}</h1>
        {loading ? (
          <Spinner label="Loading articles…" size={SpinnerSize.large} />
        ) : error ? (
          <Text variant="small" styles={{ root: { color: 'var(--ms-color-red-10)' } }}>Error loading articles: {error}</Text>
        ) : !articles || articles.length === 0 ? (
          <Text variant="small">No articles found for this subject.</Text>
        ) : (
          <Stack tokens={{ childrenGap: 12 }}>
            {articles.map((a, i) => {
              const title = a.title || a.Title || a.name || 'Untitled';
              const excerpt = a.excerpt || a.preview || a.Excerpt || a.previewText || '';
              const site = a.siteUrl || a.site || a.SiteUrl || '';
              const webUrl = a.webUrl || a.url || a.siteUrl || '';
              return (
                <Stack key={i} tokens={{ childrenGap: 4 }}>
                  <Text variant="medium">{title}</Text>
                  {excerpt && <Text variant="small">{excerpt}</Text>}
                  {webUrl && (
                    <Text variant="small">Source: <Link href={webUrl} target="_blank" rel="noreferrer">Open</Link></Text>
                  )}
                </Stack>
              );
            })}
          </Stack>
        )}
      </Stack>
    </main>
  );
};

export default ArticlesBySubject;
