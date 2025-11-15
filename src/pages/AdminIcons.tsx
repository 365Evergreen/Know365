import React, { useEffect, useMemo, useState } from 'react';
import { getEntityRecords, createAppConfigItem } from '../services/dataverseClient';
import { TextField, PrimaryButton, DefaultButton, Stack, Spinner, Label } from '@fluentui/react';
import IconCard from '../components/IconCard';

// Entity set name from user's instruction
const ICONS_ENTITY_SET = 'e365_knowledgecentresiteassetses';

function findBestUrl(record: any): string | undefined {
  if (!record) return undefined;
  // Common fields that might contain the file URL
  const candidates = [
    'fileurl',
    'url',
    'e365_fileurl',
    'e365_asseturl',
    'iconurl',
    'webresource',
    'content',
    'ms_mediaurl',
  ];

  for (const c of candidates) {
    if (record[c]) return record[c];
  }

  // fallback: pick the first string property that looks like a URL
  for (const k of Object.keys(record)) {
    const v = record[k];
    if (typeof v === 'string' && /^https?:\/\/.+\.(svg|png|jpg|jpeg|gif)(\?.*)?$/.test(v)) return v;
  }

  return undefined;
}

const AdminIcons: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    loadIcons();
  }, []);

  const loadIcons = async () => {
    setLoading(true);
    try {
      const data = await getEntityRecords(ICONS_ENTITY_SET, 500);
      // normalize: ensure each item has id, name, url
      const normalized = (data || []).map((r: any) => {
        let id = r['@odata.id'] || r['id'] || r['e365_knowledgecentresiteassetsid'] || r['e365_knowledgecentreassetid'] || '';
        if (!id && r['@odata.etag']) id = r['@odata.etag'];
        const name = r.name || r.title || r.e365_name || r['ms_name'] || '';
        const url = findBestUrl(r) || r['fileurl'] || r['url'];
        return { raw: r, id, name, url };
      });
      setItems(normalized);
    } catch (e) {
      console.error('Failed to load icons:', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((it) => (it.name || '').toLowerCase().includes(q) || (it.url || '').toLowerCase().includes(q));
  }, [items, query]);

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const copy = { ...s };
      if (copy[id]) delete copy[id];
      else {
        const it = items.find((x) => x.id === id) || items.find((x) => x.raw && (x.raw['@odata.id'] === id || x.raw.id === id));
        if (it) copy[id] = { id: it.id, name: it.name, url: it.url };
      }
      return copy;
    });
  };

  const handleSelectAll = () => {
    const all: Record<string, any> = {};
    for (const it of filtered) {
      if (it.id) all[it.id] = { id: it.id, name: it.name, url: it.url };
    }
    setSelected(all);
  };

  const handleClearSelection = () => setSelected({});

  const handleSave = async () => {
    // Save selection into app config if APP config entity exists; otherwise export to console
    setSaving(true);
    setStatus(null);
    try {
      const payload = { name: 'SiteIconConfig', value: JSON.stringify(Object.values(selected)) };
      // createAppConfigItem is a generic helper that posts to the configured APP_CONFIG_ENTITY_SET
      await createAppConfigItem(payload);
      setStatus('Saved selection to Dataverse app config.');
    } catch (e) {
      console.warn('Failed to save to Dataverse; copying to console instead', e);
      // fallback: copy to clipboard and log
      try {
        await navigator.clipboard.writeText(JSON.stringify(Object.values(selected), null, 2));
        setStatus('Could not save to Dataverse. Selection copied to clipboard.');
      } catch {
        setStatus('Could not save to Dataverse and failed to copy to clipboard. See console for selection JSON.');
        console.log('Selected icons:', Object.values(selected));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Admin: Icon Library</h2>

      <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign="end">
        <div style={{ minWidth: 360 }}>
          <TextField placeholder="Search icons by name or url" value={query} onChange={(_, v) => setQuery(v || '')} />
        </div>

        <PrimaryButton text="Select All Visible" onClick={handleSelectAll} />
        <DefaultButton text="Clear Selection" onClick={handleClearSelection} />
        <PrimaryButton text={saving ? 'Saving…' : 'Save Selection'} onClick={handleSave} disabled={saving || Object.keys(selected).length === 0} />
      </Stack>

      <div style={{ marginTop: 12 }}>{loading ? <Spinner label="Loading icons…" /> : <Label>{filtered.length} icons</Label>}</div>

      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {filtered.map((it) => (
          <IconCard key={it.id || it.url || Math.random()} id={it.id || it.url} name={it.name || it.raw?.name || ''} url={it.url} selected={!!selected[it.id || it.url]} onToggle={toggleSelect} />
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ marginBottom: 8 }}><strong>Selected:</strong> {Object.keys(selected).length}</div>
        {status && <div style={{ marginTop: 8 }}>{status}</div>}
      </div>
    </div>
  );
};

export default AdminIcons;
