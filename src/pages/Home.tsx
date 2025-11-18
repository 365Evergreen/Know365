import React, { useEffect, useState } from 'react';
import Hero from '../components/Hero';
import { Stack, Spinner, SpinnerSize, Text, DetailsList, IColumn } from '@fluentui/react';
import GridCards from '../components/GridCards';
import RecentDocuments from '../components/RecentDocuments';
import { getEntityRecords, getRecentKnowledgeArticles, getListBackedArticles, getKnowledgeSources } from '../services/dataverseClient';
import { useNavigate } from 'react-router-dom';
import ConfigurableCarousel from '../components/ConfigurableCarousel';
import DocumentsDisplay from '../components/DocumentsDisplay';

const BUSINESS_FUNCTION_ENTITY = 'e365_businessfunction';

const Home: React.FC = () => {
  const [functions, setFunctions] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // No longer fetching subjects here; keep loading state for functions below
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

  // Load business functions for the Discover cards
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const items = await getEntityRecords(BUSINESS_FUNCTION_ENTITY, 200);
        if (!mounted) return;
        setFunctions(items || []);
      } catch (err: any) {
        console.error('Failed to load business functions', err);
        if (mounted) setFunctions([]);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  

  const cards = (functions || []).map((s: any) => {
      // Prefer the e365 schema fields discovered in your org
      const bfId = s.e365_businessfunctionid || s.id || (s['@odata.id'] ? (() => {
        const m = (s['@odata.id'] as string).match(/\(([0-9a-fA-F\-]{36})\)/);
        return m ? m[1] : '';
      })() : '');
      const title = s.e365_name || s.name || s.title || s.displayname || s.subject || 'Untitled';
      const description = s.e365_businessfunctiondescription || s.description || s.notes || '';

      // create a slug from the title for routing to /functions/:slug
      const slug = (title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const safeId = bfId || (Math.random() + '');
      return {
        id: safeId,
        title,
        description,
        count: s._count || 0,
        // navigate to Functions page which will filter by function slug
        onClick: () => navigate(`/functions/${encodeURIComponent(slug)}`, { state: { title, id: safeId } }),
      };
  });

  // sort alphabetically by title
  cards.sort((a: any, b: any) => (a.title || '').localeCompare(b.title || ''));

  // Recent articles datagrid
  const [recent, setRecent] = useState<any[] | null>(null);
  const [recentLoading, setRecentLoading] = useState(false);

  // list-backed articles
  const [listArticles, setListArticles] = useState<any[] | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [ksDebug, setKsDebug] = useState<any[] | null>(null);

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

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setListLoading(true);
      setListError(null);
      try {
        const items = await getListBackedArticles();
        if (!mounted) return;
        setListArticles(items || []);
      } catch (err: any) {
        console.error('Failed to load list-backed articles', err);
        if (mounted) setListError(err?.message || String(err));
      } finally {
        if (mounted) setListLoading(false);
      }
    };
    load();
    // also fetch KnowledgeSources for debug/inspection
    (async () => {
      try {
        const ks = await getKnowledgeSources();
        setKsDebug(ks || []);
      } catch (e) {
        setKsDebug([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Compute counts for functions based only on list-backed articles
  useEffect(() => {
    // Only run when we have functions and listArticles available
    if (!functions || !Array.isArray(functions)) return;
    // We'll fetch KnowledgeSources (cached) to map SourceName -> businessFunction
    let mounted = true;
    const compute = async () => {
      try {
        const ks = await getKnowledgeSources();
        if (!mounted) return;
        // Build a mapping from SourceName -> businessFunction
        const sourceToFunction: Record<string, string> = {};
        for (const s of ks || []) {
          if (!s || !s.SourceName) continue;
          const bf = ((s as any).businessFunction || '').toString().trim();
          sourceToFunction[s.SourceName] = bf;
        }

        // Count list-backed articles grouped by businessFunction
        const countsByFunction: Record<string, number> = {};
        for (const a of listArticles || []) {
          const src = a.source || a.SourceName || '';
          const funcName = sourceToFunction[src] || '';
          if (!funcName) continue;
          const slug = (funcName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          countsByFunction[slug] = (countsByFunction[slug] || 0) + 1;
        }

        // Update functions state with _count computed from list-backed articles
        setFunctions((prev: any[] | null) => {
          if (!prev) return prev;
          return prev.map((f: any) => {
            const title = f.e365_name || f.name || f.title || f.displayname || f.subject || '';
            const slug = (title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            return { ...f, _count: countsByFunction[slug] || 0 };
          });
        });
      } catch (e) {
        console.warn('Failed to compute list-backed counts for functions', e);
      }
    };
    compute();
    return () => { mounted = false; };
  }, [functions, listArticles]);

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
        <section aria-labelledby="list-articles-heading">
          <h3 id="list-articles-heading">All List-backed Articles</h3>
          {listLoading ? (
            <Spinner label="Loading list articles…" size={SpinnerSize.small} />
          ) : listError ? (
            <Text variant="small" styles={{ root: { color: 'var(--ms-color-red-10)' } }}>Error loading list articles: {listError}</Text>
          ) : !listArticles || listArticles.length === 0 ? (
            <Text variant="small">No list-backed articles found.</Text>
          ) : (
            <DocumentsDisplay
              items={(listArticles || []).map((a: any) => ({ id: a.id, title: a.title || a.name || '', webUrl: a.webUrl, excerpt: a._raw?.excerpt || a._raw?.summary || a._raw?.description || (a._raw?.body?.content ? String(a._raw.body.content).slice(0, 400) : ''), _raw: a._raw }))}
              view="list"
              onItemClick={(item) => { if (item.webUrl) window.open(item.webUrl, '_blank', 'noopener'); }}
            />
          )}
        </section>
        {/* Debug: show KnowledgeSources count and preview to diagnose missing list articles */}
        {ksDebug !== null && (
          <div style={{ marginTop: 18, padding: 12, border: '1px dashed #ddd', borderRadius: 6 }}>
            <Text variant="small">KnowledgeSources found: {ksDebug.length}</Text>
            <pre style={{ marginTop: 8, maxHeight: 160, overflow: 'auto', fontSize: 12 }}>
              {JSON.stringify((ksDebug || []).slice(0, 8).map((s: any) => ({ SourceName: s.SourceName, SharePointSiteUrl: s.SharePointSiteUrl, LibraryName: s.LibraryName, businessFunction: s.businessFunction || s.raw?.e365_businessfunctionname || s.raw?._e365_businessfunction_value || '' })), null, 2)}
            </pre>
          </div>
        )}
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
