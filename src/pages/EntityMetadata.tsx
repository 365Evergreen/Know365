import React, { useEffect, useState } from 'react';
import { Stack, Text, PrimaryButton, DefaultButton } from '@fluentui/react';
import { listEntitySets, getEntityMetadata, getEntitySetMappings, clearEntitySetMappings } from '../services/dataverseClient';

const EntityMetadata: React.FC = () => {
  const [entitySets, setEntitySets] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<string>('');
  const [meta, setMeta] = useState<any | null>(null);
  const [mappings, setMappings] = useState<Array<[string, string]>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const sets = await listEntitySets();
        if (!mounted) return;
        setEntitySets(sets || []);
        if (sets && sets.length > 0) setSelected(sets[0]);
      } catch (err: any) {
        console.error(err);
        if (mounted) setError(err.message || String(err));
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    try {
      const map = getEntitySetMappings();
      setMappings(map || []);
    } catch (e) {
      // ignore
    }
  }, []);

  const loadMetadata = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    setMeta(null);
    try {
      const m = await getEntityMetadata(selected);
      setMeta(m);
    } catch (err: any) {
      console.error(err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main aria-labelledby="entity-metadata-heading">
      <Stack tokens={{ childrenGap: 12 }} styles={{ root: { padding: 24 } }}>
        <h1 id="entity-metadata-heading">Dataverse Entity Metadata</h1>
        <p>Use this page to discover entity set logical names and properties from your Dataverse org. You must be signed in for calls to succeed.</p>

        {error && <Text styles={{ root: { color: 'var(--ms-color-red-10)' } }}>{error}</Text>}

        <div>
          <label htmlFor="entity-select">Entity set:</label>{' '}
          <select id="entity-select" value={selected} onChange={(e) => setSelected(e.target.value)} style={{ minWidth: 360 }}>
            {entitySets ? entitySets.map((s) => <option key={s} value={s}>{s}</option>) : <option>Loading…</option>}
          </select>{' '}
          <PrimaryButton text="Load metadata" onClick={loadMetadata} disabled={!selected || loading} />
        </div>

        {loading && <div>Loading metadata…</div>}

        <div style={{ marginTop: 12 }}>
          <h3>Cached mappings</h3>
          {mappings && mappings.length > 0 ? (
            <div>
              <ul>
                {mappings.map(([req, actual]) => (
                  <li key={req}><strong>{req}</strong> → {actual} <DefaultButton text="Clear" onClick={() => { clearEntitySetMappings(req); setMappings(getEntitySetMappings()); }} /></li>
                ))}
              </ul>
              <PrimaryButton text="Clear all mappings" onClick={() => { clearEntitySetMappings(); setMappings(getEntitySetMappings()); }} />
            </div>
          ) : (
            <div><em>No cached mappings</em></div>
          )}
        </div>

        {meta && (
          <section aria-labelledby="metadata-result">
            <h2 id="metadata-result">Metadata result</h2>
            <div>
              <strong>Key name:</strong> {meta.keyName || '(none)'}
            </div>
            <div>
              <strong>Display name candidate:</strong> {meta.displayName || '(none)'}
            </div>
            <div>
              <strong>Value name candidate:</strong> {meta.valueName || '(none)'}
            </div>

            <h3>Raw metadata (object)</h3>
            <pre style={{ maxHeight: 400, overflow: 'auto', background: '#f5f5f5', padding: 12 }}>{JSON.stringify(meta, null, 2)}</pre>
          </section>
        )}
      </Stack>
    </main>
  );
};

export default EntityMetadata;
