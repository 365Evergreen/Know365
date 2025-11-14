import React, { useEffect, useState } from 'react';
import Hero from '../components/Hero';
import { Stack, Spinner, SpinnerSize, Text } from '@fluentui/react';
import GridCards from '../components/GridCards';
import RecentDocuments from '../components/RecentDocuments';
import { getEntityRecords } from '../services/dataverseClient';
import { useNavigate } from 'react-router-dom';

const SUBJECT_ENTITY = 'e365_knowledgearticlesubject';

const Home: React.FC = () => {
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
        const items = await getEntityRecords(SUBJECT_ENTITY, 100);
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
      // Prefer the e365 schema fields discovered in your org
      const id = s.e365_knowledgearticlesubjectid || s.id || (s['@odata.id'] ? (() => {
        const m = (s['@odata.id'] as string).match(/\(([0-9a-fA-F\-]{36})\)/);
        return m ? m[1] : '';
      })() : '');
      const title = s.e365_name || s.name || s.title || s.subject || s.displayname || 'Untitled';
      const description = s.e365_knowledgearticlesubjectdescription || s.description || s.notes || '';

      const safeId = id || (Math.random() + '');
      return {
        id: safeId,
        title,
        description,
        onClick: () => navigate(`/articles/${encodeURIComponent(safeId)}`, { state: { title } }),
      };
  });

  return (
    <main aria-labelledby="home-heading">
      <Hero />
      <Stack tokens={{ childrenGap: 12 }} styles={{ root: { padding: '24px' } }}>
        <h2>Quick links</h2>
        <p>Use the search box above or navigate to the Knowledge page to explore documents and sources.</p>
        <section aria-labelledby="discover-heading">
          <h3 id="discover-heading">Discover</h3>
          {loading ? (
            <Spinner label="Loading categories…" size={SpinnerSize.medium} />
          ) : error ? (
            <Text variant="small" styles={{ root: { color: 'var(--ms-color-red-10)' } }}>Error loading categories: {error}</Text>
          ) : !cards || cards.length === 0 ? (
            <GridCards />
          ) : (
            <GridCards items={cards} />
          )}
        </section>
        <section aria-labelledby="recent-heading">
          <h3 id="recent-heading">Recent documents</h3>
          <RecentDocuments />
        </section>
      </Stack>
    </main>
  );
};

export default Home;
