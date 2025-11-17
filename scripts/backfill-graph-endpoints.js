/**
 * Backfill GraphEndpoint values for e365_knowledgesource records in Dataverse.
 *
 * Usage (local):
 *   setx GRAPH_TOKEN "<token>" && setx DATAVERSE_TOKEN "<token>"
 *   node scripts/backfill-graph-endpoints.js
 *
 * Environment variables (preferred):
 *   GRAPH_TOKEN          - Microsoft Graph access token (Sites.Read.All)
 *   DATAVERSE_API        - Dataverse API root (e.g. https://<org>.crm.dynamics.com/api/data/v9.2)
 *   DATAVERSE_TOKEN      - Dataverse access token (user_impersonation for the org)
 *   DATAVERSE_GRAPH_FIELD - Optional Dataverse field name to write (default: GraphEndpoint)
 *
 * The script will skip records that already have a non-empty GraphEndpoint field.
 */

const fetch = global.fetch || require('node-fetch');
const DATAVERSE_API = process.env.DATAVERSE_API || process.env.VITE_DATAVERSE_API;
const GRAPH_TOKEN = process.env.GRAPH_TOKEN;
const DATAVERSE_TOKEN = process.env.DATAVERSE_TOKEN;
const DATAVERSE_GRAPH_FIELD = process.env.DATAVERSE_GRAPH_FIELD || 'GraphEndpoint';

if (!DATAVERSE_API) {
  console.error('DATAVERSE_API env var is required (e.g. https://<org>.crm.dynamics.com/api/data/v9.2)');
  process.exit(1);
}
if (!GRAPH_TOKEN) {
  console.error('GRAPH_TOKEN env var is required (Microsoft Graph access token)');
  process.exit(1);
}
if (!DATAVERSE_TOKEN) {
  console.error('DATAVERSE_TOKEN env var is required (Dataverse access token)');
  process.exit(1);
}

function findField(obj, candidates) {
  const keys = Object.keys(obj || {});
  const lower = keys.map((k) => k.toLowerCase());
  for (const c of candidates) {
    const idx = lower.indexOf(c.toLowerCase());
    if (idx >= 0) return keys[idx];
  }
  // fallback: find a key that contains any of the candidate tokens
  for (const key of keys) {
    for (const c of candidates) {
      if (key.toLowerCase().includes(c.toLowerCase())) return key;
    }
  }
  return null;
}

function extractRecordId(rec) {
  // try common patterns
  // 1) explicit primary key field e.g. e365_knowledgesourceid
  const idKey = Object.keys(rec).find((k) => k.toLowerCase().endsWith('id') && !k.startsWith('_'));
  if (idKey && rec[idKey]) return rec[idKey];
  // 2) @odata.id contains URL with (GUID)
  if (rec['@odata.id']) {
    const m = rec['@odata.id'].match(/\(([0-9a-fA-F\-]{36})\)/);
    if (m) return m[1];
  }
  // 3) id field
  if (rec.id) return rec.id;
  return null;
}

function stripSitePath(fullUrl) {
  try {
    const u = new URL(fullUrl);
    const path = u.pathname; // e.g. /sites/BusinessServices/Lists/KnowledgeBase/AllItems.aspx
    // find '/Lists' or '/_layouts' or '/Shared%20Documents' or '/SitePages'
    const cutIdx = ['/_layouts', '/Lists/', '/Lists', '/_api/', '/SitePages', '/_catalogs', '/Shared%20Documents', '/Documents'].reduce((acc, token) => {
      if (acc >= 0) return acc;
      const i = path.indexOf(token);
      return i >= 0 ? i : acc;
    }, -1);
    let sitePath = path;
    if (cutIdx >= 0) sitePath = path.substring(0, cutIdx);
    // Keep leading slash
    return { hostname: u.hostname, sitePath: sitePath };
  } catch (e) {
    return null;
  }
}

async function fetchDataverseEntities(url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${DATAVERSE_TOKEN}` } });
  if (!res.ok) {
    throw new Error(`Dataverse request failed: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

async function fetchGraph(url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${GRAPH_TOKEN}` } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Graph request failed: ${res.status} ${res.statusText} - ${body}`);
  }
  return await res.json();
}

async function patchDataverse(entitySet, id, payload) {
  const path = `${DATAVERSE_API}/${entitySet}(${id})`;
  const res = await fetch(path, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${DATAVERSE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Dataverse PATCH failed: ${res.status} ${res.statusText} - ${body}`);
  }
  return true;
}

async function resolveSiteId(siteUrl) {
  const info = stripSitePath(siteUrl);
  if (!info) throw new Error(`Invalid site URL: ${siteUrl}`);
  const hostname = info.hostname;
  const sitePath = info.sitePath; // starts with '/'
  // Graph expects /sites/{hostname}:{sitePath}
  const encodedPath = encodeURIComponent(sitePath);
  const url = `https://graph.microsoft.com/v1.0/sites/${hostname}:${sitePath}`;
  // Use client.api style replacement: but we call raw
  const data = await fetchGraph(url);
  return data.id;
}

async function findDriveId(siteId, libraryName) {
  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`;
  const data = await fetchGraph(url);
  const found = (data.value || []).find((d) => (d.name || '').toLowerCase() === (libraryName || '').toLowerCase());
  return found ? found.id : null;
}

async function findListId(siteId, listName) {
  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists`;
  const data = await fetchGraph(url);
  const found = (data.value || []).find((l) => (l.displayName || '').toLowerCase() === (listName || '').toLowerCase());
  return found ? found.id : null;
}

async function main() {
  console.log('Starting backfill using Dataverse API:', DATAVERSE_API);
  const entitySet = 'e365_knowledgesources';
  let url = `${DATAVERSE_API}/${entitySet}?$top=5000`;
  let processed = 0;
  let updated = 0;
  const failures = [];

  while (url) {
    console.log('Fetching', url);
    const page = await fetchDataverseEntities(url);
    const items = page.value || [];
    for (const rec of items) {
      processed++;
      try {
        // detect graph field already present
        const graphKey = findField(rec, [DATAVERSE_GRAPH_FIELD]) || DATAVERSE_GRAPH_FIELD;
        if (rec[graphKey]) {
          console.log(`Skipping ${processed}: already has GraphEndpoint`);
          continue;
        }

        // find site url and library/list name and source type
        const siteKey = findField(rec, ['SharePointSiteUrl', 'siteurl', 'sharepointsiteurl', 'e365_sharepointsiteurl']);
        const nameKey = findField(rec, ['LibraryName', 'ListName', 'Title', 'libraryname', 'listname']);
        const typeKey = findField(rec, ['e365_sourcetype', 'sourcetype', 'SourceType']);

        const siteUrl = siteKey ? rec[siteKey] : null;
        const nameVal = nameKey ? rec[nameKey] : null;
        const sourceType = typeKey ? (rec[typeKey] || '').toString() : '';

        if (!siteUrl || !nameVal) {
          console.warn(`Skipping record ${processed}: missing siteUrl or library/list name`, { siteUrl, nameVal });
          failures.push({ rec, reason: 'missing siteUrl or name' });
          continue;
        }

        let siteId;
        try {
          siteId = await resolveSiteId(siteUrl);
        } catch (e) {
          console.warn('Failed to resolve siteId for', siteUrl, e.message);
          failures.push({ rec, reason: 'site resolve failed', error: e.message });
          continue;
        }

        let ep = null;
        if ((sourceType || '').toLowerCase().includes('list')) {
          const listId = await findListId(siteId, nameVal);
          if (listId) ep = { type: 'list', siteId, listId };
          else {
            console.warn('List not found for', nameVal, 'in site', siteId);
            failures.push({ rec, reason: 'list not found' });
            continue;
          }
        } else {
          // default to library/drive
          const driveId = await findDriveId(siteId, nameVal);
          if (driveId) ep = { type: 'drive', siteId, driveId };
          else {
            console.warn('Drive/library not found for', nameVal, 'in site', siteId);
            failures.push({ rec, reason: 'drive not found' });
            continue;
          }
        }

        // determine record id
        const recId = extractRecordId(rec);
        if (!recId) {
          console.warn('Could not determine record id for', rec);
          failures.push({ rec, reason: 'no id' });
          continue;
        }

        // PATCH the dataverse record with the GraphEndpoint field as JSON string
        const payload = {};
        payload[DATAVERSE_GRAPH_FIELD] = JSON.stringify(ep);
        await patchDataverse(entitySet, recId, payload);
        console.log(`Updated record ${recId} with GraphEndpoint`, ep);
        updated++;
      } catch (e) {
        console.error('Error processing record', e);
        failures.push({ rec, reason: 'exception', error: e.message });
      }
    }

    // handle paging
    url = page['@odata.nextLink'] || null;
  }

  console.log('Done.', { processed, updated, failures: failures.length });
  if (failures.length > 0) console.log('Failures sample:', failures.slice(0, 10));
}

main().catch((e) => {
  console.error('Fatal error', e);
  process.exit(1);
});
