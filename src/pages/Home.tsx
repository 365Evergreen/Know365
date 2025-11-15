import React, { useEffect, useState } from 'react';
import Hero from '../components/Hero';
import { Stack, Spinner, SpinnerSize, Text, DetailsList, IColumn } from '@fluentui/react';
import GridCards from '../components/GridCards';
import RecentDocuments from '../components/RecentDocuments';
import { getEntityRecords, getRecentKnowledgeArticles } from '../services/dataverseClient';
import { useNavigate } from 'react-router-dom';
import ConfigurableCarousel from '../components/ConfigurableCarousel';

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

  // Recent articles datagrid
  const [recent, setRecent] = useState<any[] | null>(null);
  const [recentLoading, setRecentLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadRecent = async () => {
      setRecentLoading(true);
      try {
        const items = await getRecentKnowledgeArticles(10);
        if (!mounted) return;
        setRecent(items || []);
      } catch (err: any) {
        console.error('Failed to load recent articles', err);
        if (mounted) setRecent([]);
      } finally {
        if (mounted) setRecentLoading(false);
      }
    };
    loadRecent();
    return () => { mounted = false; };
  }, []);

  const columns: IColumn[] = [
    { key: 'col1', name: 'Title', fieldName: 'title', minWidth: 200, isResizable: true },
    { key: 'col2', name: 'Subject', fieldName: 'subject', minWidth: 150, isResizable: true },
    { key: 'col3', name: 'Source', fieldName: 'source', minWidth: 150, isResizable: true },
    { key: 'col4', name: 'Created', fieldName: 'createdon', minWidth: 140 },
    { key: 'col5', name: 'Link', fieldName: 'link', minWidth: 80 },
  ];

  const rows = (recent || []).map((r: any) => {
    const id = r.e365_knowledgearticleid || r.id || (r['@odata.id'] ? (() => {
      const m = (r['@odata.id'] as string).match(/\(([0-9a-fA-F\-]{36})\)/);
      return m ? m[1] : '';
    })() : '') || '';
    const title = r.displayName || r.title || r.e365_name || r.name || 'Untitled';
    // try common lookup/name fields for subject
    const subject = r._e365_subject_value || r.e365_subject || r.subject || r.e365_subjectname || r['e365_subjectname'] || '';
    const source = r.e365_source || r.source || r._e365_source_value || '';
    const created = r.createdon ? new Date(r.createdon).toLocaleString() : '';
    const link = `/articles/${encodeURIComponent(id)}`;
    return { key: id || Math.random().toString(36).slice(2), title, subject, source, createdon: created, link };
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
          {recentLoading ? (
            <Spinner label="Loading recent items…" size={SpinnerSize.medium} />
          ) : !rows || rows.length === 0 ? (
            <RecentDocuments />
          ) : (
            <DetailsList items={rows} columns={columns} selectionMode={0} onItemInvoked={(item) => {
              if (item && item.link) navigate(item.link);
            }} />
          )}
        </section>
      </Stack>
      <ConfigurableCarousel items={demoItems} config={{ layout: 'card', autoplay: true, intervalMs: 4000 }} />
    </main>
  );
};

export default Home;

const demoItems = [
  { id: '1', title: 'Card 1', summary: 'Summary 1', image: '/path/to/img1.jpg', url: '/about' },
  { id: '2', title: 'Card 2', summary: 'Summary 2', image: '/path/to/img2.jpg' },
];
