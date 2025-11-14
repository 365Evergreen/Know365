import React, { useEffect, useState } from 'react';
import { Stack, Text, Spinner, SpinnerSize } from '@fluentui/react';
import GridCards from '../components/GridCards';
import { getEntityRecords } from '../services/dataverseClient';
import { useNavigate } from 'react-router-dom';

const SUBJECT_ENTITY = 'e365_knowledgearticlesubject';

const ArticleCategories: React.FC = () => {
  const [subjects, setSubjects] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const items = await getEntityRecords(SUBJECT_ENTITY, 200);
        if (!mounted) return;
        setSubjects(items || []);
      } catch (err: any) {
        console.error(err);
        if (mounted) setError(err.message || String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const cards = (subjects || []).map((s: any) => {
    // attempt to locate id and title fields using common Dataverse patterns
    const id = s.e365_knowledgearticlesubjectid || s.id || (s['@odata.id'] ? (() => {
      const m = (s['@odata.id'] as string).match(/\(([0-9a-fA-F\-]{36})\)/);
      return m ? m[1] : '';
    })() : '');
    const title = s.name || s.title || s.subject || s.displayname || s.e365_name || 'Untitled';
    return {
      id: id || (Math.random() + ''),
      title,
      description: s.description || s.notes || '',
      onClick: () => navigate(`/articles/${encodeURIComponent(id)}`, { state: { title } }),
    };
  });

  return (
    <main aria-labelledby="article-categories-heading">
      <Stack tokens={{ childrenGap: 12 }} styles={{ root: { padding: 24 } }}>
        <h1 id="article-categories-heading">Article Categories</h1>
        <p>Browse knowledge article subjects pulled from Dataverse.</p>
        {loading ? (
          <Spinner label="Loading categories…" size={SpinnerSize.large} />
        ) : error ? (
          <Text variant="small" styles={{ root: { color: 'var(--ms-color-red-10)' } }}>Error loading categories: {error}</Text>
        ) : !subjects || subjects.length === 0 ? (
          <Text variant="small">No categories found.</Text>
        ) : (
          <GridCards items={cards} />
        )}
      </Stack>
    </main>
  );
};

export default ArticleCategories;
