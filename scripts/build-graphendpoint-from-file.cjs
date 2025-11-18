const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '..', 'docs', 'dataverse', 'table-data.json');
const outPath = path.join(__dirname, '..', 'docs', 'dataverse', 'suggestions.json');

function safeRead(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch (e) {
    console.error('Could not read', p, e.message);
    process.exit(1);
  }
}

function parseGraphRaw(graphRaw) {
  if (!graphRaw) return null;
  if (typeof graphRaw === 'object') return graphRaw;
  if (typeof graphRaw === 'string') {
    try { return JSON.parse(graphRaw); } catch (e) {
      // csv-style host,siteId,driveId or host,siteId,listId
      const parts = graphRaw.split(',').map(p=>p && p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const host = parts[0];
        const siteId = parts[1];
        const id = parts[2] || null;
        const parsed = { host, siteId };
        if (id) parsed.driveId = id;
        return parsed;
      }
    }
  }
  return null;
}

function getId(rec) {
  if (!rec) return null;
  if (rec['e365_knowledgesourceid']) return rec['e365_knowledgesourceid'];
  if (rec['@odata.id']) {
    const m = String(rec['@odata.id']).match(/\(([0-9a-fA-F\-]{36})\)/);
    if (m) return m[1];
  }
  // try any field that ends with id
  const k = Object.keys(rec).find(k=>/id$/i.test(k) && rec[k]);
  return k ? rec[k] : null;
}

function buildSuggestion(r) {
  const raw = r || {};
  const siteId = raw.e365_siteid || raw.siteid || raw._e365_siteid_value || null;
  const listId = raw.e365_listid || raw.listid || raw._e365_listid_value || null;
  const graphRaw = raw.e365_graphapiendpoint || raw.e365_graphendpoint || raw.GraphEndpoint || raw.graphendpoint || null;
  const graphParsed = parseGraphRaw(graphRaw);

  // Prefer explicit GUIDs
  const guidRx = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const suggestion = {};
  if (graphParsed && graphParsed.siteId && (graphParsed.listId || graphParsed.driveId)) {
    suggestion.type = graphParsed.listId ? 'list' : 'drive';
    suggestion.siteId = graphParsed.siteId;
    if (graphParsed.listId) suggestion.listId = graphParsed.listId;
    if (graphParsed.driveId) suggestion.driveId = graphParsed.driveId;
    return suggestion;
  }

  if (siteId && guidRx.test(String(siteId))) {
    suggestion.siteId = String(siteId).trim();
    if (listId && guidRx.test(String(listId))) {
      suggestion.type = 'list';
      suggestion.listId = String(listId).trim();
      return suggestion;
    }
    // have siteId only
    return suggestion;
  }

  // If no GUIDs, but GraphEndpoint parsed (maybe host + siteId), return that
  if (graphParsed) return graphParsed;

  // Last resort: try to include host from SharePointSiteUrl
  const siteUrl = raw.e365_sharepointsiteurl || raw.SharePointSiteUrl || raw.sharepointsiteurl || raw.siteurl || null;
  if (siteUrl) {
    try {
      const u = new URL(siteUrl);
      return { host: u.hostname, siteUrl: u.origin + u.pathname.replace(/\/+$/, '') };
    } catch (e) {
      return { siteUrl };
    }
  }

  return null;
}

function main() {
  const txt = safeRead(inputPath);
  let json;
  try { json = JSON.parse(txt); } catch (e) { console.error('Invalid JSON in input file', e.message); process.exit(1); }
  const recs = json.value || [];
  const results = [];
  let have = 0, missing = 0;
  for (const r of recs) {
    const id = getId(r) || r.e365_name || ('unknown-' + Math.random().toString(36).slice(2,8));
    const suggestion = buildSuggestion(r);
    if (suggestion) have++; else missing++;
    results.push({ id, sourceName: r.e365_name || r.SourceName || null, suggestion, raw: r });
  }

  const out = { generatedOn: new Date().toISOString(), total: recs.length, have, missing, results };
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log(`Wrote ${outPath} — total:${recs.length} suggestions:${have} missing:${missing}`);
}

main();
