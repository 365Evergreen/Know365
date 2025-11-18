/*
Backfill GraphEndpoint for KnowledgeSource records in Dataverse.

Requirements:
- Node 18+ (uses global fetch)
- Environment variables:
  - DATAVERSE_API: Dataverse API root, e.g. https://<org>.crm.dynamics.com/api/data/v9.2
  - DATAVERSE_TOKEN: a bearer token with permissions to PATCH the KnowledgeSource records
  - GRAPH_TOKEN: a Microsoft Graph bearer token to resolve site/list/drive ids
  - ENTITY_SET_NAME (optional): default 'e365_knowledgesources'
  - GRAPH_ENDPOINT_FIELD (optional): Dataverse attribute name to write endpoint to (default 'e365_graphendpoint')
  - APPLY=true to actually PATCH Dataverse; otherwise the script runs in dry-run mode and prints suggested updates.

Usage (dry-run):
  node scripts/backfill-graphendpoint.js

Usage (apply):
  GRAPH_TOKEN="<token>" DATAVERSE_API="https://.../api/data/v9.2" DATAVERSE_TOKEN="<token>" APPLY=true node scripts/backfill-graphendpoint.js
*/

const API = process.env.DATAVERSE_API;
const DATAVERSE_TOKEN = process.env.DATAVERSE_TOKEN;
const GRAPH_TOKEN = process.env.GRAPH_TOKEN;
const ENTITY_SET = process.env.ENTITY_SET_NAME || 'e365_knowledgesources';
const GRAPH_FIELD = process.env.GRAPH_ENDPOINT_FIELD || 'e365_graphendpoint';
const APPLY = String(process.env.APPLY || '').toLowerCase() === 'true';

if (!API) {
  console.error('ERROR: DATAVERSE_API environment variable is required.');
  process.exit(1);
}
if (!DATAVERSE_TOKEN) {
  console.error('ERROR: DATAVERSE_TOKEN environment variable is required.');
  process.exit(1);
}
if (!GRAPH_TOKEN) {
  console.error('ERROR: GRAPH_TOKEN environment variable is required.');
  process.exit(1);
}

const apiRoot = API.replace(/\/+$/, '');

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function getRawField(obj, ...names) {
  for (const n of names) {
    if (obj[n] !== undefined && obj[n] !== null) return obj[n];
  }
  return null;
}

function deriveSiteAndLibrary(record) {
  // Ported simplified deriveSiteAndLibrary logic — look for common fields
  const raw = record.raw || record;
  let siteUrl = getRawField(record, 'SharePointSiteUrl', 'sharepointsiteurl', 'e365_sharepointsiteurl', 'siteurl', 'SiteUrl', 'WebUrl', 'webUrl') || '';
  try {
    if (siteUrl && String(siteUrl).toLowerCase().includes('/lists/')) {
      const u = new URL(String(siteUrl));
      const idx = u.pathname.toLowerCase().indexOf('/lists/');
      if (idx > -1) {
        u.pathname = u.pathname.substring(0, idx);
        siteUrl = u.toString().replace(/\/+$/, '');
      }
    }
  } catch (e) {
    // ignore
  }

  let libraryName = getRawField(record, 'LibraryName', 'libraryname', 'e365_libraryname', 'listname', 'SourceName', 'e365_sourceinternalname') || '';
  siteUrl = siteUrl ? String(siteUrl).trim() : '';
  libraryName = libraryName ? String(libraryName).trim() : '';

  // GraphEndpoint hints (JSON or CSV) may already exist on the record
  const graphRaw = getRawField(record, 'GraphEndpoint', 'graphendpoint', 'e365_graphendpoint') || null;
  let parsedEp = null;
  if (graphRaw) {
    if (typeof graphRaw === 'string') {
      try { parsedEp = JSON.parse(graphRaw); } catch (e) {
        // try CSV
        const parts = graphRaw.split(',').map(p => p && p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          parsedEp = { host: parts[0], siteId: parts[1], driveId: parts[2] || null };
        }
      }
    } else if (typeof graphRaw === 'object') parsedEp = graphRaw;
  }

  // Prefer explicit GUID columns if present (new columns: e365_siteid, e365_listid)
  try {
    const guidRx = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const siteIdCandidate = getRawField(record, 'e365_siteid', 'siteid', '_e365_siteid_value');
    const listIdCandidate = getRawField(record, 'e365_listid', 'listid', '_e365_listid_value');
    const siteId = siteIdCandidate ? String(siteIdCandidate).trim() : null;
    const listId = listIdCandidate ? String(listIdCandidate).trim() : null;
    if (siteId && guidRx.test(siteId)) {
      parsedEp = parsedEp || {};
      parsedEp.siteId = siteId;
      if (listId && guidRx.test(listId)) {
        parsedEp.listId = listId;
        parsedEp.type = parsedEp.type || 'list';
      }
    }
  } catch (e) {
    // ignore
  }

  return { siteUrl: siteUrl || null, libraryName: libraryName || null, graphEndpoint: parsedEp || undefined };
}

async function resolveSiteIdFromUrl(siteUrl) {
  try {
    const u = new URL(siteUrl);
    const host = u.hostname;
    const path = u.pathname.replace(/\/+$/, '');
    const endpoint = `https://graph.microsoft.com/v1.0/sites/${host}:${path}`;
    const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${GRAPH_TOKEN}` } });
    if (!res.ok) {
      console.warn('Graph site lookup failed', endpoint, res.status);
      return null;
    }
    const j = await res.json();
    return j.id || null;
  } catch (e) {
    console.warn('resolveSiteIdFromUrl error', e);
    return null;
  }
}

async function findListId(siteId, libraryName) {
  try {
    // Try list by id if libraryName looks like GUID
    const guidRx = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (guidRx.test(String(libraryName))) {
      // Verify it exists
      const endpoint = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${libraryName}`;
      const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${GRAPH_TOKEN}` } });
      if (res.ok) return libraryName;
    }

    // List all lists and match by displayName / name
    const listsResp = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/lists`, { headers: { Authorization: `Bearer ${GRAPH_TOKEN}` } });
    if (!listsResp.ok) return null;
    const data = await listsResp.json();
    const lists = data.value || [];
    const desired = String(libraryName || '').toLowerCase();
    if (!desired) return null;

    let match = lists.find(l => String(l.displayName || l.name || '').toLowerCase() === desired);
    if (!match) {
      // normalized match
      const normalize = s => String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
      const nd = normalize(desired);
      match = lists.find(l => normalize(l.displayName || l.name || '').startsWith(nd) || normalize(l.displayName || l.name || '').includes(nd));
    }
    if (match) return match.id;

    return null;
  } catch (e) {
    console.warn('findListId error', e);
    return null;
  }
}

async function findDriveId(siteId, libraryName) {
  try {
    const guidRx = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (guidRx.test(String(libraryName))) return libraryName;

    const resp = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/drives`, { headers: { Authorization: `Bearer ${GRAPH_TOKEN}` } });
    if (!resp.ok) return null;
    const data = await resp.json();
    const drives = data.value || [];
    const desired = String(libraryName || '').toLowerCase();
    if (!desired) return null;
    let match = drives.find(d => String(d.name||'').toLowerCase() === desired);
    if (!match) {
      const normalize = s => String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
      const nd = normalize(desired);
      match = drives.find(d => normalize(d.name||'').startsWith(nd) || normalize(d.name||'').includes(nd));
      if (!match && nd === 'documents') match = drives.find(d => normalize(d.name||'').includes('shareddoc'));
    }
    if (match) return match.id;
    return null;
  } catch (e) {
    console.warn('findDriveId error', e);
    return null;
  }
}

async function fetchDataverseRecords() {
  const url = `${apiRoot}/${ENTITY_SET}?$top=5000`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${DATAVERSE_TOKEN}`, 'Content-Type': 'application/json' } });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${ENTITY_SET}: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.value || [];
}

async function patchDataverseRecord(entityId, payload) {
  const url = `${apiRoot}/${ENTITY_SET}(${entityId})`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${DATAVERSE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.ok;
}

async function main() {
  console.log('Fetching records from', ENTITY_SET);
  const records = await fetchDataverseRecords();
  console.log(`Found ${records.length} records`);

  const results = [];
  for (const r of records) {
    // Determine id (Dataverse may return @odata.id or a GUID field)
    let id = null;
    if (r['@odata.id']) {
      const m = String(r['@odata.id']).match(/\(([0-9a-fA-F\-]{36})\)/);
      if (m) id = m[1];
    }
    if (!id) {
      id = r[Object.keys(r).find(k => /id$/i.test(k))] || r.id || null;
    }
    if (!id) {
      console.warn('Skipping record without id', r);
      continue;
    }

    const rec = { ...r, raw: r };
    const derived = deriveSiteAndLibrary(rec);
    const existingGraph = derived.graphEndpoint || getRawField(r, 'GraphEndpoint', 'graphendpoint', 'e365_graphendpoint') || null;

    // If the new GUID columns are populated, prefer them and avoid site URL resolution
    const guidRx = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const explicitSiteId = getRawField(r, 'e365_siteid', 'siteid', '_e365_siteid_value');
    const explicitListId = getRawField(r, 'e365_listid', 'listid', '_e365_listid_value');
    let finalEp = null;
    if (explicitSiteId && String(explicitSiteId).trim() && guidRx.test(String(explicitSiteId).trim())) {
      const siteId = String(explicitSiteId).trim();
      if (explicitListId && String(explicitListId).trim() && guidRx.test(String(explicitListId).trim())) {
        finalEp = { type: 'list', siteId, listId: String(explicitListId).trim() };
      } else {
        // we have siteId but no listId — set siteId and let subsequent logic try to find list/drive by name
        finalEp = { siteId };
      }
    }

    // If we don't already have a finalEp from explicit GUIDs, continue with URL/name resolution
    if (!finalEp) {
      if (!derived.siteUrl || !derived.libraryName) {
        results.push({ id, status: 'skipped', reason: 'missing siteUrl/libraryName', source: r.SourceName || r.sourcename || null });
        continue;
      }

      // Resolve siteId via Graph
      const siteId = await resolveSiteIdFromUrl(derived.siteUrl);
      if (!siteId) {
        results.push({ id, status: 'skipped', reason: 'siteId not resolved', siteUrl: derived.siteUrl });
        continue;
      }

      // Try list first
      let listId = await findListId(siteId, derived.libraryName);
      let driveId = null;
      if (listId) {
        finalEp = { type: 'list', siteId, listId };
      } else {
        // try drive
        driveId = await findDriveId(siteId, derived.libraryName);
        if (driveId) finalEp = { type: 'drive', siteId, driveId };
      }
    }

    if (!finalEp) {
      results.push({ id, status: 'no-match', siteId, libraryName: derived.libraryName });
      continue;
    }

    const currentJson = existingGraph && typeof existingGraph === 'object' ? existingGraph : (existingGraph && typeof existingGraph === 'string' ? (() => { try { return JSON.parse(existingGraph); } catch { return existingGraph; } })() : null);

    const suggested = finalEp;
    const same = JSON.stringify(currentJson) === JSON.stringify(suggested);

    if (same) {
      results.push({ id, status: 'unchanged', graphEndpoint: suggested });
      continue;
    }

    results.push({ id, status: 'suggested', graphEndpoint: suggested, current: currentJson });

    if (APPLY) {
      // build payload using the configured field name
      const payload = {};
      payload[GRAPH_FIELD] = JSON.stringify(suggested);
      const ok = await patchDataverseRecord(id, payload);
      results[results.length - 1].applied = !!ok;
      // small delay to avoid throttling
      await sleep(200);
    }
  }

  // summary
  const summary = results.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
  console.log('Summary:', summary);
  console.log('Details (first 50):', results.slice(0,50));
  if (!APPLY) console.log('\nDry-run complete. To apply changes set APPLY=true and rerun with correct tokens.');
}

main().catch(err => { console.error('Fatal error', err); process.exit(1); });
