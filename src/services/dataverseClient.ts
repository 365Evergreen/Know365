import { msalInstance } from './authConfig';
import schemaOverrides from '../config/dataverse-schema-overrides';
import { listLibraryItems, getDocuments, getListItems } from './sharePointGraph';
import { getAccessToken } from './graphClient';

interface KnowledgeSource {
  SourceName: string;
  SharePointSiteUrl: string;
  LibraryName: string;
  GraphEndpoint?: string;
}

const DATAVERSE_API = import.meta.env.VITE_DATAVERSE_API;

function buildDataverseApiRoot(): string {
  if (!DATAVERSE_API) throw new Error('VITE_DATAVERSE_API is not set. Please set it to your Dataverse org URL (e.g. https://<org>.crm.dynamics.com or https://<org>.crmX.dynamics.com/api/data/v9.2).');

  // strip trailing slash
  let base = DATAVERSE_API.replace(/\/+$/, '');

  // If the configured value already includes the api/data path, use it as-is
  if (base.toLowerCase().includes('/api/data')) {
    return base;
  }

  // Otherwise append the recommended API root
  return `${base}/api/data/v9.2`;
}

async function fetchDataverseResource(resourcePath: string, options: RequestInit): Promise<any> {
  const apiRoot = buildDataverseApiRoot();
  const url = `${apiRoot}/${resourcePath}`;

  const resp = await fetch(url, options);

  if (resp.ok) {
    // try parse JSON; if none, return raw text
    const text = await resp.text();
    try {
      return JSON.parse(text || '{}');
    } catch {
      return text;
    }
  }

  // if 404 try a lowercase resource fallback once (helps when resource set name differs in casing)
  if (resp.status === 404) {
    const lowerUrl = `${apiRoot}/${resourcePath.toLowerCase()}`;
    try {
      const resp2 = await fetch(lowerUrl, options);
      if (resp2.ok) {
        const text2 = await resp2.text();
        try {
          return JSON.parse(text2 || '{}');
        } catch {
          return text2;
        }
      }
    } catch (e) {
      // ignore and fall through to throw below
    }
  }

  // include response body (if available) for diagnostics
  let bodyText = '';
  try {
    bodyText = await resp.text();
  } catch (e) {
    bodyText = '<unable to read response body>';
  }

  throw new Error(`Dataverse request failed: ${resp.status} ${resp.statusText} \nURL: ${url}\nResponse body: ${bodyText}`);
}

// Metadata cache to avoid repeated $metadata parsing
const metadataCache: Map<string, { keyName: string; displayName?: string; valueName?: string }> = new Map();

// Entity set name mapping cache (requested -> resolved actual entity set)
// Persisted in localStorage to survive page reloads.
const ENTITY_SET_MAP_KEY = 'dataverse_entitySet_map_v1';
const entitySetMap: Map<string, string> = new Map();

// Initialize map from localStorage if available
try {
  const raw = typeof window !== 'undefined' ? window.localStorage.getItem(ENTITY_SET_MAP_KEY) : null;
  if (raw) {
    const entries: Array<[string, string]> = JSON.parse(raw);
    for (const [k, v] of entries) entitySetMap.set(k, v);
  }
} catch (e) {
  // ignore storage errors
}

function persistEntitySetMap() {
  try {
    if (typeof window === 'undefined') return;
    const entries = Array.from(entitySetMap.entries());
    window.localStorage.setItem(ENTITY_SET_MAP_KEY, JSON.stringify(entries));
  } catch (e) {
    // ignore storage errors
  }
}

// Simple URL validation helper used before calling SharePoint helpers that
// construct `URL` objects. Prevents runtime "Invalid URL" TypeErrors when
// a KnowledgeSource record has a malformed or missing `SharePointSiteUrl`.
export function isValidUrl(u?: string): boolean {
  if (!u || typeof u !== 'string') return false;
  try {
    // allow relative paths? we require absolute site URLs here
    const parsed = new URL(u);
    return !!parsed.protocol && !!parsed.hostname;
  } catch {
    return false;
  }
}

// Try to derive a usable SharePoint site URL and library/list name from a
// KnowledgeSource record by inspecting common fields and raw payloads.
export function deriveSiteAndLibrary(s: any): { siteUrl: string | null; libraryName: string | null; graphEndpoint?: any } {
  try {
    const raw = s && s.raw ? s.raw : {};

    // Candidate site/url fields (many orgs use slightly different attribute names)
    let siteUrl = s.SharePointSiteUrl || raw.SharePointSiteUrl || raw.sharepointsiteurl || raw.e365_sharepointsiteurl || raw.siteurl || raw.SiteUrl || raw.WebUrl || raw.webUrl || '';

    // If we received an item/webUrl that contains a Lists segment, try to trim to the site root.
    try {
      if (siteUrl && typeof siteUrl === 'string' && siteUrl.toLowerCase().includes('/lists/')) {
        const u = new URL(siteUrl);
        const idx = u.pathname.toLowerCase().indexOf('/lists/');
        if (idx > -1) {
          u.pathname = u.pathname.substring(0, idx);
          siteUrl = u.toString().replace(/\/+$/, '');
        }
      }
    } catch (e) {
      // ignore URL parsing errors and keep original value
    }

    // Candidate library/list name fields. Fall back to internal/source name when explicit name missing.
    let libraryName = s.LibraryName || raw.LibraryName || raw.libraryname || raw.e365_libraryname || raw.listname || s.SourceName || raw.e365_sourceinternalname || raw.e365_sourceinternalname || '';

    siteUrl = siteUrl ? String(siteUrl).trim() : '';
    libraryName = libraryName ? String(libraryName).trim() : '';

    // Try to find GraphEndpoint in a variety of places and parse it. Dataverse values sometimes
    // contain JSON, or a CSV-style hint like `host,siteId,driveId`. Also prefer explicit
    // GUID columns when available (new columns: e365_siteid, e365_listid) to produce a
    // canonical parsed endpoint object used elsewhere in the app.
    let graphEndpointRaw = s.GraphEndpoint || raw.GraphEndpoint || raw.graphendpoint || raw.e365_graphendpoint || s.graphendpoint || null;
    let parsedEp: any = null;
    if (graphEndpointRaw) {
      if (typeof graphEndpointRaw === 'string') {
        // first try JSON
        try {
          parsedEp = JSON.parse(graphEndpointRaw);
        } catch (e) {
          // attempt CSV-style parse: host,siteId,driveId or host,siteId,listId
          const parts = graphEndpointRaw.split(',').map((p) => p && p.trim()).filter(Boolean);
          if (parts.length >= 2) {
            // parts[0] may be host; parts[1] siteId; parts[2] driveId/listId
            const host = parts[0];
            const siteId = parts[1];
            const id = parts[2] || null;
            parsedEp = { host, siteId };
            if (id) {
              // heuristics: if id looks like a GUID, assume it's a drive/list id. Default to drive.
              const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              if (guidRegex.test(id)) parsedEp.driveId = id; else parsedEp.driveId = id;
            }
          }
        }
      } else if (typeof graphEndpointRaw === 'object') {
        parsedEp = graphEndpointRaw;
      }

      // If explicit e365_siteid / e365_listid (GUID) values exist on the record, prefer
      // constructing a parsed endpoint using those IDs. These may be present either on
      // the top-level object `s` or inside the `raw` payload depending on how records
      // were normalized by callers.
      try {
        const siteIdCandidate = (s && (s.e365_siteid || s.e365_siteid_value || s.siteid)) || (raw && (raw.e365_siteid || raw.siteid || raw._e365_siteid_value));
        const listIdCandidate = (s && (s.e365_listid || s.e365_listid_value || s.listid)) || (raw && (raw.e365_listid || raw.listid || raw._e365_listid_value));
        const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const siteId = siteIdCandidate && String(siteIdCandidate).trim();
        const listId = listIdCandidate && String(listIdCandidate).trim();
        if (siteId && guidRegex.test(siteId)) {
          parsedEp = parsedEp || {};
          parsedEp.siteId = siteId;
          // If a list GUID is present, assume it's a list endpoint; otherwise leave drive/list unset
          if (listId && guidRegex.test(listId)) {
            parsedEp.listId = listId;
            parsedEp.type = parsedEp.type || 'list';
          }
        }
      } catch (e) {
        // ignore and continue
      }
    }

    return { siteUrl: siteUrl || null, libraryName: libraryName || null, graphEndpoint: parsedEp || undefined };
  } catch (e) {
    return { siteUrl: null, libraryName: null };
  }
}

// Expose helpers to read/clear the persisted mapping for UI/debug purposes
export const getEntitySetMappings = (): Array<[string, string]> => {
  return Array.from(entitySetMap.entries());
};

export const clearEntitySetMappings = (key?: string) => {
  if (key) {
    entitySetMap.delete(key.toLowerCase());
  } else {
    entitySetMap.clear();
  }
  persistEntitySetMap();
};

async function getEntitySetMetadata(entitySetName: string) {
  if (metadataCache.has(entitySetName)) return metadataCache.get(entitySetName)!;

  const apiRoot = buildDataverseApiRoot();
  const url = `${apiRoot}/$metadata`;
  // fetch $metadata with an Authorization header using a Dataverse-scoped token
  const accessToken = await getDataverseAccessToken();
  const resp = await fetch(url, { headers: { Accept: 'application/xml', Authorization: `Bearer ${accessToken}` } });
  if (!resp.ok) throw new Error(`Failed to fetch $metadata: ${resp.status} ${resp.statusText}`);
  const xml = await resp.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');

  const entitySets = Array.from(doc.getElementsByTagName('EntitySet'));
  // Try to find exact match first (EntitySet Name attribute)
  let matched: Element | undefined = entitySets.find((e) => e.getAttribute('Name') === entitySetName);
  if (!matched) {
    // case-insensitive match
    matched = entitySets.find((e) => (e.getAttribute('Name') || '').toLowerCase() === entitySetName.toLowerCase());
  }

  if (!matched) {
    // fallback: try endsWith
    matched = entitySets.find((e) => (e.getAttribute('Name') || '').toLowerCase().endsWith(entitySetName.toLowerCase()));
  }

  if (!matched) {
    throw new Error(`EntitySet '${entitySetName}' not found in $metadata`);
  }

  // EntityType attribute is like 'Microsoft.Dynamics.CRM.appconfig'
  const entityTypeFull = matched.getAttribute('EntityType') || '';
  const entityTypeLocal = entityTypeFull.split('.').pop() || entityTypeFull;

  // find the EntityType element
  const entityTypes = Array.from(doc.getElementsByTagName('EntityType'));
  const entityTypeEl = entityTypes.find((et) => et.getAttribute('Name') === entityTypeLocal);

  let keyName = '';
  if (entityTypeEl) {
    const keyEl = entityTypeEl.getElementsByTagName('Key')[0];
    if (keyEl) {
      const propRef = keyEl.getElementsByTagName('PropertyRef')[0];
      if (propRef) keyName = propRef.getAttribute('Name') || '';
    }
  }

  // fallback key heuristics
  if (!keyName) {
    // common primary name patterns
    const candidates = ['id', `${entityTypeLocal}id`, `${entityTypeLocal}Id`, 'appconfigid', 'configid'];
    for (const c of candidates) {
      if (entityTypeEl && Array.from(entityTypeEl.getElementsByTagName('Property')).some((p) => p.getAttribute('Name') === c)) {
        keyName = c;
        break;
      }
    }
  }

  // find a reasonable display and value property
  let displayName: string | undefined;
  let valueName: string | undefined;
  const displayCandidates = ['name', 'title', `${entityTypeLocal}name`, 'configkey', 'key'];
  const valueCandidates = ['value', 'description', 'configvalue', 'ms_value'];

  if (entityTypeEl) {
    const propertyNames = Array.from(entityTypeEl.getElementsByTagName('Property')).map((p) => p.getAttribute('Name') || '');
    for (const c of displayCandidates) {
      if (propertyNames.includes(c)) {
        displayName = c;
        break;
      }
    }
    for (const c of valueCandidates) {
      if (propertyNames.includes(c)) {
        valueName = c;
        break;
      }
    }

    // if not found, pick first string property that's not the key
    if (!displayName) {
      const propEls = Array.from(entityTypeEl.getElementsByTagName('Property'));
      for (const p of propEls) {
        const type = p.getAttribute('Type') || '';
        const name = p.getAttribute('Name') || '';
        if (type.toLowerCase().includes('string') && name !== keyName) {
          displayName = name;
          break;
        }
      }
    }
  }

  const meta = { keyName, displayName, valueName };
  metadataCache.set(entitySetName, meta);
  return meta;
}

// Public helpers for admin UI
export const listEntitySets = async (): Promise<string[]> => {
  const apiRoot = buildDataverseApiRoot();
  const url = `${apiRoot}/$metadata`;
  const accessToken = await getDataverseAccessToken();
  const resp = await fetch(url, { headers: { Accept: 'application/xml', Authorization: `Bearer ${accessToken}` } });
  if (!resp.ok) throw new Error(`Failed to fetch $metadata: ${resp.status} ${resp.statusText}`);
  const xml = await resp.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const entitySets = Array.from(doc.getElementsByTagName('EntitySet')).map((e) => e.getAttribute('Name') || '').filter(Boolean);
  return entitySets;
};

export const getEntityMetadata = async (entitySetName: string) => {
  return await getEntitySetMetadata(entitySetName);
};

async function getDataverseAccessToken(): Promise<string> {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) throw new Error('No accounts found. Please sign in.');

  // Dataverse expects a resource-specific scope like https://{org}.crmX.dynamics.com/user_impersonation
  const origin = new URL(DATAVERSE_API).origin;
  const scope = `${origin}/user_impersonation`;

  try {
    const resp = await msalInstance.acquireTokenSilent({ scopes: [scope], account: accounts[0] });
    return resp.accessToken;
  } catch (err) {
    try {
      const resp2 = await msalInstance.acquireTokenPopup({ scopes: [scope] });
      return resp2.accessToken;
    } catch (err2) {
      // final fallback: redirect (will navigate away)
      await msalInstance.acquireTokenRedirect({ scopes: [scope] });
      return '';
    }
  }
}

// schema overrides are read directly where needed from the imported `schemaOverrides`.
// The dedicated helper was removed to avoid unused-local errors after Dataverse article
// removal. Access `schemaOverrides[logicalName]` directly when required.

// Resolve an EntitySetName from a logical entity name (LogicalName). This helps avoid
// hardcoded OData paths like 'KnowledgeSources' which may not match the target org's
// EntitySetName (publisher prefixes / pluralization differ). The resolved mapping is
// cached in `entitySetMap` and persisted to localStorage.
async function resolveEntitySetForLogicalName(logicalName: string): Promise<string> {
  const key = logicalName.toLowerCase();
  if (entitySetMap.has(key)) return entitySetMap.get(key)!;

  // Check local overrides first
  try {
    const override = (schemaOverrides as any)[logicalName];
    if (override && override.entitySetName) {
      entitySetMap.set(key, override.entitySetName);
      try { persistEntitySetMap(); } catch {}
      return override.entitySetName;
    }
  } catch (e) {
    // ignore if overrides not present
  }

  try {
    const accessToken = await getDataverseAccessToken();

    // Special-case e365_knowledgesource: use the provided org-specific EntityDefinitions URL first
    if (logicalName === 'e365_knowledgesource') {
      try {
        const fixedUrl = "https://orgefecd8a9.crm6.dynamics.com/api/data/v9.2/EntityDefinitions(LogicalName='e365_knowledgesource')?$select=EntitySetName,LogicalName";
        const resp = await fetch(fixedUrl, { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } });
        if (resp.ok) {
          const fixedData = await resp.json();
          const fixedEntitySet = fixedData && fixedData.EntitySetName;
          if (fixedEntitySet && typeof fixedEntitySet === 'string') {
            try { entitySetMap.set(key, fixedEntitySet); persistEntitySetMap(); } catch (e) { /* ignore */ }
            return fixedEntitySet;
          }
        } else {
          console.warn(`Fixed e365_knowledgesource lookup returned ${resp.status} ${resp.statusText}`);
        }
      } catch (err) {
        console.warn('Fixed e365_knowledgesource lookup failed', err);
      }
    }

    // Query the EntityDefinitions for the logical name
    const resourcePath = `EntityDefinitions(LogicalName='${logicalName}')?$select=EntitySetName,LogicalName`;
    const data = await fetchDataverseResource(resourcePath, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });

    const entitySetName = data && data.EntitySetName;
    if (entitySetName && typeof entitySetName === 'string') {
      try {
        entitySetMap.set(key, entitySetName);
        persistEntitySetMap();
      } catch (e) {
        /* ignore persistence errors */
      }
      return entitySetName;
    }
  } catch (err) {
    // ignore and try fallback heuristics below
    console.warn(`resolveEntitySetForLogicalName: failed to query EntityDefinitions for ${logicalName}`, err);
  }

  // Fallback: scan available EntitySets for a likely match
  try {
    const sets = await listEntitySets();
    const target = logicalName.toLowerCase();
    // Try simple heuristics: exact, contains, tokens
    let match = sets.find((s) => s.toLowerCase() === target || s.toLowerCase().endsWith(target));
    if (!match) {
      const tokens = target.split(/[^a-z0-9]+/).filter(Boolean);
      match = sets.find((s) => tokens.every((t) => s.toLowerCase().includes(t)));
      if (!match) match = sets.find((s) => tokens.some((t) => s.toLowerCase().includes(t)));
    }
    if (match) {
      try {
        entitySetMap.set(key, match);
        persistEntitySetMap();
      } catch (e) { /* ignore */ }
      return match;
    }
  } catch (e) {
    console.warn('resolveEntitySetForLogicalName: metadata fallback failed', e);
  }

  throw new Error(`Could not resolve EntitySetName for logical name '${logicalName}'`);
}

// a 'subject'-like target or whose name contains 'subject'. Returns attribute logical
// names (e.g. 'e365_subjectid' or 'regardingobjectid') ordered by likelihood.
// Attribute discovery helper removed - not needed when only using SharePoint KnowledgeSources.

export const getKnowledgeSources = async (): Promise<KnowledgeSource[]> => {
  try {
    // Prefer resolving the actual entity set name for the known logical name
    const logical = 'e365_knowledgesource';
    let entitySetName: string | null = null;
    try {
      entitySetName = await resolveEntitySetForLogicalName(logical);
    } catch (e) {
      // ignore and fallback to legacy name
      entitySetName = 'KnowledgeSources';
    }

    const raw = await getEntityRecords(entitySetName, 200) as any[];

    // Normalize business function values so callers can group reliably.
    const mapped = raw.map((r) => {
      let businessFunction: string | undefined;

      // Prefer a dedicated text field when present (new column: e365_knowledgesourcetext)
      if (r['e365_knowledgesourcetext']) businessFunction = r['e365_knowledgesourcetext'];
      // Common patterns in Dataverse responses:
      // - explicit name field: e365_businessfunctionname
      // - formatted value: e365_businessfunction@OData.Community.Display.V1.FormattedValue
      // - navigation object: e365_businessfunction { name, value, ... }
      // - lookup id: _e365_businessfunction_value (GUID) or numeric codes
      else if (r['e365_businessfunctionname']) businessFunction = r['e365_businessfunctionname'];
      else if (r['e365_businessfunction@OData.Community.Display.V1.FormattedValue']) businessFunction = r['e365_businessfunction@OData.Community.Display.V1.FormattedValue'];
      else if (r['e365_businessfunction']) {
        const v = r['e365_businessfunction'];
        if (typeof v === 'string') businessFunction = v;
        else if (v && typeof v === 'object') businessFunction = v.name || v.Name || v.displayname || v.value;
      } else if (r['_e365_businessfunction_value']) businessFunction = String(r['_e365_businessfunction_value']);

      return {
        ...r,
        businessFunction: businessFunction || '',
      };
    });

    // If businessFunction values are GUID lookups (common when the lookup
    // navigation property isn't expanded), resolve them to readable names by
    // fetching the business function entity records and mapping ids -> names.
    try {
      const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const guids = Array.from(new Set(mapped.map((m) => m.businessFunction).filter(Boolean))).filter((v) => guidRegex.test(String(v)));
      if (guids.length > 0) {
        // Attempt to fetch business function records from Dataverse
        try {
          const bfRecords = await getEntityRecords('e365_businessfunction', 200);
          const idToName: Record<string, string> = {};
          for (const b of bfRecords || []) {
            const id = (b.e365_businessfunctionid || b.id || (b['@odata.id'] ? (() => {
              const m = String(b['@odata.id']).match(/\(([0-9a-fA-F\-]{36})\)/);
              return m ? m[1] : null;
            })() : null) || '').toLowerCase();
            const name = b.e365_name || b.name || b.title || b.displayname || b.subject || '';
            if (id) idToName[id] = name;
          }

          // Replace GUID businessFunction values with resolved names when possible
          for (const m of mapped) {
            if (m.businessFunction && guidRegex.test(String(m.businessFunction))) {
              const resolved = idToName[String(m.businessFunction).toLowerCase()];
              if (resolved) m.businessFunction = resolved;
            }
          }
        } catch (e) {
          // ignore resolution errors — we still return GUIDs if unresolved
          console.warn('Could not resolve businessFunction lookups to names', e);
        }
      }
    } catch (e) {
      /* ignore */
    }

    return mapped as unknown as KnowledgeSource[];
  } catch (error) {
    console.error('Error fetching knowledge sources:', error);
    return [];
  }
};

// Force-read the org-specific e365_knowledgesources entity set (used by admin UI)
export const getKnowledgeSourcesFromOrg = async (top = 10): Promise<any[]> => {
  try {
    // Resolve the org-specific entity set name for the logical e365_knowledgesource
    const logical = 'e365_knowledgesource';
    const entitySet = await resolveEntitySetForLogicalName(logical).catch(() => 'e365_knowledgesources');
    const accessToken = await getDataverseAccessToken();
    const resourcePath = `${entitySet}?$top=${top}`;
    const data = await fetchDataverseResource(resourcePath, { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } });

    const rawList = data?.value || [];
    // Normalize to a consistent shape expected by the admin UI
    const normalized = rawList.map((r: any) => {
      const id = (() => {
        if (r['@odata.id']) {
          const m = String(r['@odata.id']).match(/\(([0-9a-fA-F\-]{36})\)/);
          if (m) return m[1];
        }
        if (r[Object.keys(r).find((k) => /id$/i.test(k)) || 'id']) return r[Object.keys(r).find((k) => /id$/i.test(k)) || 'id'];
        return r.id || null;
      })();

      const sourceName = r.SourceName || r.sourcename || r.e365_sourcename || r.name || r.displayname || r['e365_name'] || '';
      const siteUrl = r.SharePointSiteUrl || r.sharepointsiteurl || r.e365_sharepointsiteurl || r.siteurl || '';
      const libName = r.LibraryName || r.libraryname || r.e365_libraryname || r.listname || '';
      const graph = r.GraphEndpoint || r.graphendpoint || r.e365_graphendpoint || null;

      return {
        id,
        SourceName: sourceName,
        SharePointSiteUrl: siteUrl,
        LibraryName: libName,
        GraphEndpoint: graph,
        businessFunction: r.e365_knowledgesourcetext || r.e365_businessfunctionname || r['e365_businessfunction@OData.Community.Display.V1.FormattedValue'] || null,
        raw: r,
      };
    });

    return normalized;
  } catch (e) {
    console.error('Error fetching fixed e365_knowledgesources:', e);
    return [];
  }
};

// Fetch articles from configured KnowledgeSources (SharePoint libraries). Returns
// an array of normalized items with at least `id`, `title`, `webUrl`, and `source`.
export const getArticlesFromKnowledgeSources = async (q?: string): Promise<any[]> => {
  try {
    const sources = await getKnowledgeSources();
    if (!sources || sources.length === 0) return [];

    const results: any[] = [];
    for (const s of sources) {
      try {
        // Prefer a canonical GraphEndpoint (siteId/driveId or siteId/listId) when present.
        // GraphEndpoint is expected to be JSON (or an object) with a { type, siteId, driveId|listId } shape.
        let items: any[] = [];

        // deriveSiteAndLibrary also attempts to parse CSV-style GraphEndpoint hints and return a parsed object
        const derived = deriveSiteAndLibrary(s) as any;
        const candidateEp = derived.graphEndpoint || (s.GraphEndpoint ? (typeof s.GraphEndpoint === 'string' ? (() => {
          try { return JSON.parse(s.GraphEndpoint); } catch { return null; }
        })() : s.GraphEndpoint) : null);

        if (candidateEp) {
          try {
            if (candidateEp.type === 'drive' && candidateEp.siteId && candidateEp.driveId) {
              const token = await getAccessToken();
              items = await getDocuments(token, candidateEp.siteId, candidateEp.driveId, 50);
            } else if (candidateEp.type === 'list' && candidateEp.siteId && candidateEp.listId) {
              const token = await getAccessToken();
              items = await getListItems(token, candidateEp.siteId, candidateEp.listId, 50);
            } else if (candidateEp.siteId && (candidateEp.driveId || candidateEp.listId)) {
              const token = await getAccessToken();
              if (candidateEp.driveId) items = await getDocuments(token, candidateEp.siteId, candidateEp.driveId, 50);
              else items = await getListItems(token, candidateEp.siteId, candidateEp.listId, 50);
            }
          } catch (err) {
            console.warn('GraphEndpoint parse/use failed, falling back to SharePointSiteUrl', s, err);
            items = [];
          }
        }

        // If GraphEndpoint didn't produce items, fall back to the editable site+library fields.
        if (!items || items.length === 0) {
          // Try to derive site + library values from common raw fields before skipping.
          const { siteUrl, libraryName } = derived;
          if (!isValidUrl(siteUrl || undefined) || !libraryName) {
            console.warn('Skipping KnowledgeSource with invalid SharePointSiteUrl or LibraryName', s);
            continue;
          }

          // listLibraryItems resolves site & drive and returns documents
          items = await listLibraryItems(siteUrl!, libraryName!, 50);
        }
        for (const it of items) {
          // simple text match if query provided
          if (q && q.trim()) {
            const ql = q.toLowerCase();
            const name = (it.name || '').toLowerCase();
            if (!name.includes(ql)) continue;
          }

          results.push({
            id: it.id || it.name,
            title: it.name || '',
            webUrl: it.webUrl,
            lastModifiedDateTime: it.lastModifiedDateTime,
            source: s.SourceName,
            _raw: it,
          });
        }
      } catch (e) {
        console.warn('Failed to list library items for KnowledgeSource', s, e);
        continue;
      }
    }

    return results;
  } catch (e) {
    console.error('getArticlesFromKnowledgeSources failed', e);
    return [];
  }
};

// Fetch articles only from KnowledgeSources which are SharePoint lists (not drives)
export const getListBackedArticles = async (q?: string, topPerSource = 50): Promise<any[]> => {
  try {
    const sources = await getKnowledgeSources();
    if (!sources || sources.length === 0) return [];

    // Helper to detect list-backed source (reuse heuristic used elsewhere)
    const isListSource = (s: any) => {
      try {
        const raw = s && s.raw ? s.raw : {};
        const candidates: string[] = [];
        if (raw.e365_sourcetype) candidates.push(String(raw.e365_sourcetype));
        if (raw.SourceType) candidates.push(String(raw.SourceType));
        if (raw['e365_sourcetype@OData.Community.Display.V1.FormattedValue']) candidates.push(String(raw['e365_sourcetype@OData.Community.Display.V1.FormattedValue']));
        if (s.e365_sourcetype) candidates.push(String(s.e365_sourcetype));
        if (s.SourceType) candidates.push(String(s.SourceType));
        if (raw._e365_sourcetype_value) candidates.push(String(raw._e365_sourcetype_value));

        const graphEp = raw.GraphEndpoint || raw.graphendpoint || s.GraphEndpoint || s.graphendpoint || null;
        if (graphEp) {
          try {
            const ep = typeof graphEp === 'string' ? JSON.parse(graphEp) : graphEp;
            if (ep && ep.type) candidates.push(String(ep.type));
          } catch { /* ignore */ }
        }

        if (raw.SharePointSiteUrl && String(raw.SharePointSiteUrl).toLowerCase().includes('/lists/')) candidates.push('list');
        if (raw.LibraryName && /list/i.test(String(raw.LibraryName))) candidates.push('list');

        return !!candidates.find((c) => !!c && String(c).toLowerCase() === 'list');
      } catch (e) {
        return false;
      }
    };

    const results: any[] = [];
    for (const s of (sources || [])) {
      if (!isListSource(s)) continue;
      try {
        let items: any[] = [];

        const derived = deriveSiteAndLibrary(s) as any;
        const candidateEp = derived.graphEndpoint || (s.GraphEndpoint ? (typeof s.GraphEndpoint === 'string' ? (() => {
          try { return JSON.parse(s.GraphEndpoint); } catch { return null; }
        })() : s.GraphEndpoint) : null);

        if (candidateEp) {
          try {
            if (candidateEp.type === 'list' && candidateEp.siteId && candidateEp.listId) {
              const token = await getAccessToken();
              items = await getListItems(token, candidateEp.siteId, candidateEp.listId, topPerSource);
            } else if (candidateEp.siteId && candidateEp.listId) {
              const token = await getAccessToken();
              items = await getListItems(token, candidateEp.siteId, candidateEp.listId, topPerSource);
            }
          } catch (err) {
            items = [];
          }
        }

        if (!items || items.length === 0) {
          const { siteUrl, libraryName } = derived;
          if (!isValidUrl(siteUrl || undefined) || !libraryName) continue;
          items = await listLibraryItems(siteUrl!, libraryName!, topPerSource);
        }

        for (const it of (items || [])) {
          if (q && q.trim()) {
            const ql = q.toLowerCase();
            const name = (it.name || '').toLowerCase();
            if (!name.includes(ql)) continue;
          }
          results.push({ id: it.id || it.name, title: it.name || '', webUrl: it.webUrl, lastModifiedDateTime: it.lastModifiedDateTime, source: s.SourceName, _raw: it });
        }
      } catch (e) {
        console.warn('getListBackedArticles: failed for source', s, e);
      }
    }

    return results;
  } catch (e) {
    console.error('getListBackedArticles failed', e);
    return [];
  }
};

// Generic helper to fetch records from any entity set by name
export const getEntityRecords = async (entitySetName: string, top = 200): Promise<any[]> => {
  try {
    // If we previously resolved a metadata match for this requested name, use it
    const key = entitySetName.toLowerCase();
    const mapped = entitySetMap.get(key);
    const useEntitySet = mapped || entitySetName;

    const accessToken = await getDataverseAccessToken();
    const resourcePath = `${useEntitySet}?$top=${top}`;
    const data = await fetchDataverseResource(resourcePath, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // If we used a mapped name, keep the mapping (already present). If we didn't but the
    // server returned OK, and the useEntitySet differs from requested, store the mapping.
    if (!mapped && useEntitySet && useEntitySet.toLowerCase() !== key) {
      try {
        entitySetMap.set(key, useEntitySet);
        persistEntitySetMap();
      } catch (e) {
        /* ignore */
      }
    }

    return data?.value || [];
  } catch (error) {
    console.error(`Error fetching records for ${entitySetName}:`, error);

    // If the resource wasn't found (404), try a metadata-driven fallback
    // by listing available EntitySets and finding a close match.
    try {
      const sets = await listEntitySets();
      const target = entitySetName.toLowerCase();

      // Candidate matching strategies in order of preference
      const candidates = sets.filter((s) => s && typeof s === 'string').map((s) => s as string);

      // 1) exact match (case-insensitive)
      let match = candidates.find((s) => s.toLowerCase() === target);
      // 2) plural/singular normalization (simple heuristic)
      if (!match) {
        const alt = target.endsWith('s') ? target.slice(0, -1) : `${target}s`;
        match = candidates.find((s) => s.toLowerCase() === alt);
      }
      // 3) contains tokens (e.g., 'knowledgearticle' and 'subject')
      if (!match) {
        const tokens = target.split(/[^a-z0-9]+/).filter(Boolean);
        match = candidates.find((s) => tokens.every((t) => s.toLowerCase().includes(t)));
      }
      // 4) contains any token
      if (!match) {
        const tokens = target.split(/[^a-z0-9]+/).filter(Boolean);
        match = candidates.find((s) => tokens.some((t) => s.toLowerCase().includes(t)));
      }

      if (match) {
        console.info(`Dataverse: falling back to entity set '${match}' for requested '${entitySetName}'`);
        try {
          const accessToken2 = await getDataverseAccessToken();
          const resourcePath2 = `${match}?$top=${top}`;
          const data2 = await fetchDataverseResource(resourcePath2, {
            headers: {
              Authorization: `Bearer ${accessToken2}`,
              'Content-Type': 'application/json',
            },
          });

          // Persist the discovered mapping for future use
          try {
            entitySetMap.set(entitySetName.toLowerCase(), match);
            persistEntitySetMap();
          } catch (e) { /* ignore */ }

          return data2?.value || [];
        } catch (e2) {
          console.error(`Fallback fetch for entity set '${match}' failed:`, e2);
        }
      } else {
        console.warn(`No close match found in $metadata for requested entity set '${entitySetName}'.`);
      }
    } catch (metaErr) {
      console.error('Error while attempting metadata fallback for entity sets:', metaErr);
    }

    return [];
  }
};

export const createKnowledgeSource = async (source: KnowledgeSource): Promise<void> => {
  try {
    const logical = 'e365_knowledgesource';
    const entitySet = await resolveEntitySetForLogicalName(logical).catch(() => 'e365_knowledgesources');
    // Reuse generic create helper so entitySet mapping logic is centralized
    await createEntityRecord(entitySet, source as any);
  } catch (e) {
    console.error('Error creating KnowledgeSource', e);
    throw e;
  }
};

export const getKnowledgeArticles = async (q?: string): Promise<any[]> => {
  try {
    // Only use KnowledgeSources (SharePoint libraries) for articles. Dataverse
    // `e365_knowledgearticle` is deprecated/removed in this deployment.
    try {
      const ks = await getArticlesFromKnowledgeSources(q);
      if (Array.isArray(ks) && ks.length > 0) return ks;
      return [];
    } catch (e) {
      console.warn('getKnowledgeArticles: KnowledgeSources lookup failed and Dataverse fallback disabled', e);
      return [];
    }
  } catch (error) {
    console.error('Error fetching knowledge articles:', error);
    return [];
  }
};

// Fetch knowledge articles filtered by a function name (uses tagsText as a heuristic filter).
export const getKnowledgeArticlesByFunction = async (fn: string, q?: string): Promise<any[]> => {
  try {
    // Prefer KnowledgeSources (SharePoint libraries) as the primary source of articles.
    // This avoids querying Dataverse `e365_knowledgearticle` when the org stores
    // content in SharePoint. We normalized `businessFunction` on KnowledgeSource
    // records in `getKnowledgeSources` so comparison is reliable.
    try {
      const ksAll = await getKnowledgeSources();
      // Do not strictly filter KnowledgeSources by a stored 'SourceType' value.
      // Some orgs don't populate that field but still point to a SharePoint list
      // via `LibraryName`. We'll match by businessFunction and then attempt
      // to list the items (the SharePoint helpers handle drive vs list fallback).
      const ks = ksAll || [];
      if (!ks || ks.length === 0) return [];
      if (Array.isArray(ks) && ks.length > 0) {
        const fnName = (fn || '')
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .replace(/'/g, "''");

        const matching = ks.filter((s: any) => (s.businessFunction || '').toLowerCase() === fnName.toLowerCase());
        if (matching.length > 0) {
          const results: any[] = [];
          for (const s of matching) {
            try {
              // Prefer GraphEndpoint when present for performance and stability
              let items: any[] = [];
              if (s.GraphEndpoint) {
                try {
                  const ep = typeof s.GraphEndpoint === 'string' ? JSON.parse(s.GraphEndpoint) : s.GraphEndpoint;
                  if (ep && ep.type === 'drive' && ep.siteId && ep.driveId) {
                    const token = await getAccessToken();
                    items = await getDocuments(token, ep.siteId, ep.driveId, 50);
                  } else if (ep && ep.type === 'list' && ep.siteId && ep.listId) {
                    const token = await getAccessToken();
                    items = await getListItems(token, ep.siteId, ep.listId, 50);
                  }
                } catch (err) {
                  console.warn('GraphEndpoint parse/use failed (by function), falling back to SharePointSiteUrl', s, err);
                  items = [];
                }
              }

              if (!items || items.length === 0) {
                const { siteUrl, libraryName } = deriveSiteAndLibrary(s);
                if (!isValidUrl(siteUrl || undefined) || !libraryName) {
                  console.warn('Skipping KnowledgeSource with invalid SharePointSiteUrl or LibraryName (by function)', s);
                  continue;
                }
                items = await listLibraryItems(siteUrl!, libraryName!, 50);
              }
              for (const it of items) {
                if (q && q.trim()) {
                  const ql = q.toLowerCase();
                  const name = (it.name || '').toLowerCase();
                  if (!name.includes(ql)) continue;
                }
                results.push({ id: it.id || it.name, title: it.name || '', webUrl: it.webUrl, lastModifiedDateTime: it.lastModifiedDateTime, source: s.SourceName, _raw: it });
              }
            } catch (e) {
              console.warn('Failed to list library items for KnowledgeSource (by function)', s, e);
            }
          }
          if (results.length > 0) return results;
        }
      }
    } catch (e) {
      // non-fatal — fall through to Dataverse fallback below
      console.warn('getKnowledgeArticlesByFunction: KnowledgeSources lookup failed, falling back to Dataverse', e);
    }

    // Dataverse article table removed; function should only return
    // SharePoint-backed items already handled above. If none found, return empty.
    console.warn('getKnowledgeArticlesByFunction: Dataverse fallback disabled - returning empty if no KnowledgeSources match');
    return [];
  } catch (error) {
    console.error('Error fetching knowledge articles by function:', error);
    return [];
  }
};

// Get a count of knowledge articles for a given function (by name/slug).
export const getKnowledgeArticlesCountByFunction = async (fn: string): Promise<number> => {
  try {
    // Prefer counting articles sourced from KnowledgeSources (SharePoint).
    try {
      const ks = await getKnowledgeSources();
      if (Array.isArray(ks) && ks.length > 0) {
        const fnName = (fn || '')
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .replace(/'/g, "''");

        const matching = ks.filter((s: any) => (s.businessFunction || '').toLowerCase() === fnName.toLowerCase());
        if (matching.length > 0) {
          let total = 0;
          for (const s of matching) {
            try {
                // Prefer GraphEndpoint when present
                let items: any[] = [];
                if (s.GraphEndpoint) {
                  try {
                    const ep = typeof s.GraphEndpoint === 'string' ? JSON.parse(s.GraphEndpoint) : s.GraphEndpoint;
                    if (ep && ep.type === 'drive' && ep.siteId && ep.driveId) {
                      const token = await getAccessToken();
                      items = await getDocuments(token, ep.siteId, ep.driveId, 1000);
                    } else if (ep && ep.type === 'list' && ep.siteId && ep.listId) {
                      const token = await getAccessToken();
                      items = await getListItems(token, ep.siteId, ep.listId, 1000);
                    }
                  } catch (err) {
                    console.warn('GraphEndpoint parse/use failed (count), falling back to SharePointSiteUrl', s, err);
                    items = [];
                  }
                }

                if (!items || items.length === 0) {
                  const { siteUrl, libraryName } = deriveSiteAndLibrary(s);
                  if (!isValidUrl(siteUrl || undefined) || !libraryName) {
                    console.warn('Skipping KnowledgeSource with invalid SharePointSiteUrl or LibraryName (count)', s);
                    continue;
                  }
                  items = await listLibraryItems(siteUrl!, libraryName!, 1000);
                }

                total += Array.isArray(items) ? items.length : 0;
            } catch (e) {
              console.warn('Failed to list library items for KnowledgeSource (count)', s, e);
            }
          }
          return total;
        }
      }
    } catch (e) {
      console.warn('getKnowledgeArticlesCountByFunction: KnowledgeSources lookup failed, falling back to Dataverse', e);
    }
    // Dataverse fallback disabled; return 0 when no KnowledgeSources match
    return 0;
  } catch (error) {
    console.error('Error fetching article count by function:', error);
    return 0;
  }
};

// Fetch the most recently created knowledge articles (ordered by createdon desc)
export const getRecentKnowledgeArticles = async (top = 10): Promise<any[]> => {
  try {
    // Use KnowledgeSources (SharePoint) for recent articles. Aggregate recent
    // files across all configured KnowledgeSources and return the top N by
    // last modified date.
    const sources = await getKnowledgeSources();
    if (!sources || sources.length === 0) return [];

    const allItems: any[] = [];
    for (const s of sources) {
      try {
        // Try to derive site+library first (handles records missing explicit fields)
        const { siteUrl: derivedSiteUrl, libraryName: derivedLibraryName } = deriveSiteAndLibrary(s);
        if (!isValidUrl(derivedSiteUrl || undefined) || !derivedLibraryName) {
          console.warn('Skipping KnowledgeSource with invalid SharePointSiteUrl or LibraryName (recent)', s);
          continue;
        }

        // Prefer GraphEndpoint when present for recent aggregation
        let items: any[] = [];
        if (s.GraphEndpoint) {
          try {
            const ep = typeof s.GraphEndpoint === 'string' ? JSON.parse(s.GraphEndpoint) : s.GraphEndpoint;
            if (ep && ep.type === 'drive' && ep.siteId && ep.driveId) {
              const token = await getAccessToken();
              items = await getDocuments(token, ep.siteId, ep.driveId, Math.max(top, 50));
            } else if (ep && ep.type === 'list' && ep.siteId && ep.listId) {
              const token = await getAccessToken();
              items = await getListItems(token, ep.siteId, ep.listId, Math.max(top, 50));
            }
          } catch (err) {
            console.warn('GraphEndpoint parse/use failed (recent), falling back to SharePointSiteUrl', s, err);
            items = [];
          }
        }

        if (!items || items.length === 0) {
          const itemsFallback = await listLibraryItems(derivedSiteUrl!, derivedLibraryName!, Math.max(top, 50));
          items = itemsFallback;
        }

        if (Array.isArray(items)) {
          for (const it of items) {
            const created = (it as any).createdDateTime || (it as any).created || null;
            allItems.push({ id: it.id || it.name, title: it.name || '', webUrl: it.webUrl, lastModifiedDateTime: it.lastModifiedDateTime || created || null, source: s.SourceName, _raw: it });
          }
        }
      } catch (e) {
        console.warn('Failed to list library items for KnowledgeSource (recent)', s, e);
      }
    }

    // sort by lastModifiedDateTime (desc) and return top N
    allItems.sort((a, b) => {
      const ta = a.lastModifiedDateTime ? new Date(a.lastModifiedDateTime).getTime() : 0;
      const tb = b.lastModifiedDateTime ? new Date(b.lastModifiedDateTime).getTime() : 0;
      return tb - ta;
    });

    return allItems.slice(0, top).map((it: any) => ({ ...it, displayName: it.title || it.name || '' }));
  } catch (error) {
    console.error('Error fetching recent knowledge articles:', error);
    return [];
  }
};

// Attempt to fetch knowledge articles filtered by a subject id.
export const getKnowledgeArticlesBySubject = async (subjectId: string, top = 50): Promise<any[]> => {
  try {
    // Subject filtering against Dataverse removed. Try matching subject via
    // SharePoint item metadata (best-effort by checking title/file name).
    const sources = await getKnowledgeSources();
    if (!sources || sources.length === 0) return [];

    const results: any[] = [];
    for (const s of sources) {
      try {
        // Try to derive site+library first (handles records missing explicit fields)
        const { siteUrl: derivedSiteUrl, libraryName: derivedLibraryName } = deriveSiteAndLibrary(s);
        if (!isValidUrl(derivedSiteUrl || undefined) || !derivedLibraryName) {
          console.warn('Skipping KnowledgeSource with invalid SharePointSiteUrl or LibraryName (subject search)', s);
          continue;
        }

        // Prefer GraphEndpoint when present for subject searches
        let items: any[] = [];
        if (s.GraphEndpoint) {
          try {
            const ep = typeof s.GraphEndpoint === 'string' ? JSON.parse(s.GraphEndpoint) : s.GraphEndpoint;
            if (ep && ep.type === 'drive' && ep.siteId && ep.driveId) {
              const token = await getAccessToken();
              items = await getDocuments(token, ep.siteId, ep.driveId, top);
            } else if (ep && ep.type === 'list' && ep.siteId && ep.listId) {
              const token = await getAccessToken();
              items = await getListItems(token, ep.siteId, ep.listId, top);
            }
          } catch (err) {
            console.warn('GraphEndpoint parse/use failed (subject search), falling back to SharePointSiteUrl', s, err);
            items = [];
          }
        }

        if (!items || items.length === 0) {
          items = await listLibraryItems(derivedSiteUrl!, derivedLibraryName!, top);
        }

        for (const it of items) {
          const name = (it.name || '').toLowerCase();
          if (name.includes(subjectId.toLowerCase())) {
            results.push({ id: it.id || it.name, title: it.name || '', webUrl: it.webUrl, lastModifiedDateTime: it.lastModifiedDateTime, source: s.SourceName, _raw: it });
          }
        }
      } catch (e) {
        console.warn('Failed to list library items for KnowledgeSource (subject search)', s, e);
      }
    }

    return results.slice(0, top);
  } catch (error) {
    console.error('Error fetching articles by subject:', error);
    return [];
  }
};

// App configuration entity set (name of the Dataverse table's entity set)
const APP_CONFIG_ENTITY_SET = import.meta.env.VITE_APP_CONFIG_ENTITY_SET || 'appconfigs';

export const getAppConfigItems = async (): Promise<any[]> => {
  try {
    const accessToken = await getDataverseAccessToken();

    // discover metadata to determine key and display/value attributes
    let meta: { keyName: string; displayName?: string; valueName?: string } | null = null;
    try {
      meta = await getEntitySetMetadata(APP_CONFIG_ENTITY_SET);
    } catch (e) {
      console.warn('Could not load metadata for app config entity set, falling back to heuristics', e);
    }

    const data = await fetchDataverseResource(`${APP_CONFIG_ENTITY_SET}?$top=200`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const list = data?.value || [];

    // normalize items using metadata when available
    return list.map((r: any) => {
      let id = '';
      if (meta && meta.keyName && r[meta.keyName]) id = r[meta.keyName];
      if (!id && r['@odata.id']) {
        const m = r['@odata.id'].match(/\(([0-9a-fA-F\-]{36})\)/);
        if (m) id = m[1];
      }
      if (!id && r['id']) id = r['id'];

      const key = (meta && meta.displayName && r[meta.displayName]) || r.name || r.configkey || r.key || '';
      const value = (meta && meta.valueName && r[meta.valueName]) || r.value || r.configvalue || r.description || '';

      return { id, key, value, raw: r };
    });
  } catch (e) {
    console.error('Error fetching app config items:', e);
    return [];
  }
};

// Helper to build an entity path for CRUD operations. Accepts either a raw GUID
// (will be wrapped in parentheses) or a pre-built OData id/path which will be used as-is.
function buildEntityPath(entitySet: string, id: string) {
  if (!id) return entitySet;
  // if id already looks like an OData path (contains '(' or '/'), return as-is
  if (id.includes('(') || id.includes('/')) return `${entitySet}${id.startsWith('/') ? '' : '/'}${id}`;
  // sanitize GUID-like values
  const guidMatch = id.match(/[0-9a-fA-F\-]{36}/);
  if (guidMatch) return `${entitySet}(${guidMatch[0]})`;
  // fallback: append as-is
  return `${entitySet}(${id})`;
}

export const createAppConfigItem = async (payload: any): Promise<any> => {
  try {
    const accessToken = await getDataverseAccessToken();
    const data = await fetchDataverseResource(`${APP_CONFIG_ENTITY_SET}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return data;
  } catch (e) {
    console.error('Error creating app config item:', e);
    throw e;
  }
};

// Generic create record for any entity set
export const createEntityRecord = async (entitySetName: string, payload: any): Promise<any> => {
  try {
    const accessToken = await getDataverseAccessToken();
    const data = await fetchDataverseResource(entitySetName, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return data;
  } catch (e) {
    console.error(`Error creating record in ${entitySetName}:`, e);
    throw e;
  }
};

// Generic update record for any entity set and id (GUID or OData path)
export const updateEntityRecord = async (entitySetName: string, id: string, payload: any): Promise<void> => {
  try {
    const accessToken = await getDataverseAccessToken();
    const path = buildEntityPath(entitySetName, id);
    await fetchDataverseResource(path, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error(`Error updating record ${id} in ${entitySetName}:`, e);
    throw e;
  }
};

// Generic delete record for any entity set and id (GUID or OData path)
export const deleteEntityRecord = async (entitySetName: string, id: string): Promise<void> => {
  try {
    const accessToken = await getDataverseAccessToken();
    const path = buildEntityPath(entitySetName, id);
    await fetchDataverseResource(path, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(`Error deleting record ${id} in ${entitySetName}:`, e);
    throw e;
  }
};

// Convenience wrappers for KnowledgeSource operations that resolve the org-specific
// entity set name then perform the CRUD operation. These are used by admin UI flows.
export const updateKnowledgeSource = async (id: string, payload: any): Promise<void> => {
  try {
    const logical = 'e365_knowledgesource';
    const entitySet = await resolveEntitySetForLogicalName(logical).catch(() => 'KnowledgeSources');
    await updateEntityRecord(entitySet, id, payload);
  } catch (e) {
    console.error('Error updating KnowledgeSource', e);
    throw e;
  }
};

export const deleteKnowledgeSource = async (id: string): Promise<void> => {
  try {
    const logical = 'e365_knowledgesource';
    const entitySet = await resolveEntitySetForLogicalName(logical).catch(() => 'KnowledgeSources');
    await deleteEntityRecord(entitySet, id);
  } catch (e) {
    console.error('Error deleting KnowledgeSource', e);
    throw e;
  }
};

// List available fields (properties) for an entity set by resolving metadata
export const listEntityFields = async (entitySetNameOrLogical: string): Promise<Array<{ name: string; type?: string }>> => {
  try {
    // Try resolving logical name to entity set if necessary
    let entitySetName = entitySetNameOrLogical;
    try {
      entitySetName = await resolveEntitySetForLogicalName(entitySetNameOrLogical).catch(() => entitySetNameOrLogical);
    } catch { /* ignore */ }

    // fetch $metadata and parse EntityType for property list
    const apiRoot = buildDataverseApiRoot();
    const url = `${apiRoot}/$metadata`;
    const accessToken = await getDataverseAccessToken();
    const resp = await fetch(url, { headers: { Accept: 'application/xml', Authorization: `Bearer ${accessToken}` } });
    if (!resp.ok) throw new Error('Failed to fetch $metadata for fields');
    const xml = await resp.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const entitySets = Array.from(doc.getElementsByTagName('EntitySet'));
    const matched = entitySets.find((e) => (e.getAttribute('Name') || '').toLowerCase() === entitySetName.toLowerCase() || (e.getAttribute('Name') || '').toLowerCase().endsWith(entitySetName.toLowerCase()));
    if (!matched) return [];
    const entityTypeFull = matched.getAttribute('EntityType') || '';
    const entityTypeLocal = entityTypeFull.split('.').pop() || entityTypeFull;
    const entityTypes = Array.from(doc.getElementsByTagName('EntityType'));
    const entityTypeEl = entityTypes.find((et) => et.getAttribute('Name') === entityTypeLocal);
    if (!entityTypeEl) return [];
    const props = Array.from(entityTypeEl.getElementsByTagName('Property')).map((p) => ({ name: p.getAttribute('Name') || '', type: p.getAttribute('Type') || '' }));
    return props.filter((p) => p.name);
  } catch (e) {
    console.error('Error listing entity fields', e);
    return [];
  }
};

// Form mapping helpers: try to persist form mappings to a dedicated logical table
const FORM_MAPPING_LOGICAL = 'e365_formconfiguration';

export const getFormMapping = async (formKey: string): Promise<any | null> => {
  try {
    const logical = FORM_MAPPING_LOGICAL;
    const entitySet = await resolveEntitySetForLogicalName(logical).catch(() => logical);
    const accessToken = await getDataverseAccessToken();

    // try to find by name/display field
    // discover display/value attributes
    let meta = null;
    try {
      meta = await getEntitySetMetadata(entitySet);
    } catch { meta = null; }
    const displayField = (meta && meta.displayName) || 'name';
    const valueField = (meta && meta.valueName) || 'value';

    const filter = `${displayField} eq '${formKey.replace(/'/g, "''")}'`;
    const resourcePath = `${entitySet}?$filter=${encodeURIComponent(filter)}&$top=1`;
    try {
      const data = await fetchDataverseResource(resourcePath, { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } });
      const rec = (data?.value || [])[0];
      if (!rec) return null;
      const rawValue = rec[valueField] || rec.value || rec.configvalue || rec.description || null;
      let parsed = rawValue;
      try { parsed = rawValue ? JSON.parse(rawValue) : null; } catch { parsed = rawValue; }
      return { id: (() => { if (meta && meta.keyName && rec[meta.keyName]) return rec[meta.keyName]; if (rec['@odata.id']) { const m = rec['@odata.id'].match(/\(([0-9a-fA-F\-]{36})\)/); if (m) return m[1]; } return rec.id || null; })(), key: formKey, mapping: parsed, raw: rec };
    } catch (e) {
      // fallback: try app config table
      return null;
    }
  } catch (e) {
    console.error('Error getting form mapping', e);
    return null;
  }
};

export const saveFormMapping = async (formKey: string, mappingObj: any): Promise<any> => {
  try {
    // Try to save in dedicated table, but fall back to app config
    const logical = FORM_MAPPING_LOGICAL;
    const entitySet = await resolveEntitySetForLogicalName(logical).catch(() => null);
    if (!entitySet) {
      // fallback to app config
      return await createAppConfigItem({ name: formKey, value: JSON.stringify(mappingObj) });
    }

    const accessToken = await getDataverseAccessToken();
    // discover metadata names
    let meta = null;
    try { meta = await getEntitySetMetadata(entitySet); } catch { meta = null; }
    const displayField = (meta && meta.displayName) || 'name';
    const valueField = (meta && meta.valueName) || 'value';

    // find existing
    const existing = await getFormMapping(formKey);
    const payload: any = {};
    payload[displayField] = formKey;
    payload[valueField] = JSON.stringify(mappingObj || {});
    if (existing && existing.id) {
      const path = buildEntityPath(entitySet, existing.id);
      await fetchDataverseResource(path, { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      return { id: existing.id, key: formKey };
    }
    const data = await fetchDataverseResource(entitySet, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return data;
  } catch (e) {
    console.error('Error saving form mapping', e);
    throw e;
  }
};

export const createFormMapping = async (formKey: string, mappingObj: any): Promise<any> => {
  try {
    const logical = FORM_MAPPING_LOGICAL;
    const entitySet = await resolveEntitySetForLogicalName(logical).catch(() => null);
    if (!entitySet) {
      // fallback to app config
      return await createAppConfigItem({ name: formKey, value: JSON.stringify(mappingObj) });
    }
    const accessToken = await getDataverseAccessToken();
    let meta = null;
    try { meta = await getEntitySetMetadata(entitySet); } catch { meta = null; }
    const displayField = (meta && meta.displayName) || 'name';
    const valueField = (meta && meta.valueName) || 'value';
    const payload: any = {};
    payload[displayField] = formKey;
    payload[valueField] = JSON.stringify(mappingObj || {});
    const data = await fetchDataverseResource(entitySet, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return data;
  } catch (e) {
    console.error('Error creating form mapping', e);
    throw e;
  }
};

export const updateAppConfigItem = async (id: string, payload: any): Promise<void> => {
  try {
    const accessToken = await getDataverseAccessToken();
    const path = buildEntityPath(APP_CONFIG_ENTITY_SET, id);
    await fetchDataverseResource(path, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error('Error updating app config item:', e);
    throw e;
  }
};

export const deleteAppConfigItem = async (id: string): Promise<void> => {
  try {
    const accessToken = await getDataverseAccessToken();
    const path = buildEntityPath(APP_CONFIG_ENTITY_SET, id);
    await fetchDataverseResource(path, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (e) {
    console.error('Error deleting app config item:', e);
    throw e;
  }
};

// Carousel configuration helpers stored in the e365_knowledgecentreconfiguration table
export const getCarouselConfig = async (pageKey: string): Promise<any | null> => {
  try {
    const logical = 'e365_knowledgecentreconfiguration';
    const entitySet = await resolveEntitySetForLogicalName(logical).catch(() => logical);
    const accessToken = await getDataverseAccessToken();

    // try to discover display/value attribute names
    let meta: { keyName: string; displayName?: string; valueName?: string } | null = null;
    try {
      meta = await getEntitySetMetadata(entitySet);
    } catch {
      meta = null;
    }

    // build a set of candidate filters to find the record for the page
    const displayField = (meta && meta.displayName) || 'name';
    const candidates = [`${displayField} eq '${pageKey.replace(/'/g, "''")}'`];

    for (const f of candidates) {
      try {
        const resourcePath = `${entitySet}?$filter=${encodeURIComponent(f)}&$top=1`;
        const data = await fetchDataverseResource(resourcePath, {
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        });
        const rec = (data?.value || [])[0];
        if (rec) {
          // return parsed JSON if valueName exists
          const valueField = (meta && meta.valueName) || 'value';
          const rawValue = rec[valueField] || rec.value || rec.configvalue || rec.description || null;
          let parsed = rawValue;
          try {
            parsed = rawValue ? JSON.parse(rawValue) : null;
          } catch { /* ignore JSON parse errors */ }
          return { id: (() => {
            if (meta && meta.keyName && rec[meta.keyName]) return rec[meta.keyName];
            if (rec['@odata.id']) {
              const m = rec['@odata.id'].match(/\(([0-9a-fA-F\-]{36})\)/);
              if (m) return m[1];
            }
            return rec.id || null;
          })(), key: pageKey, config: parsed, raw: rec };
        }
      } catch (e) {
        // try next candidate
      }
    }

    return null;
  } catch (e) {
    console.error('Error loading carousel config', e);
    return null;
  }
};

export const saveCarouselConfig = async (pageKey: string, configObj: any): Promise<any> => {
  try {
    const logical = 'e365_knowledgecentreconfiguration';
    const entitySet = await resolveEntitySetForLogicalName(logical).catch(() => logical);
    const accessToken = await getDataverseAccessToken();

    // discover metadata names
    let meta: { keyName: string; displayName?: string; valueName?: string } | null = null;
    try {
      meta = await getEntitySetMetadata(entitySet);
    } catch {
      meta = null;
    }

    const displayField = (meta && meta.displayName) || 'name';
    const valueField = (meta && meta.valueName) || 'value';

    // find existing record for pageKey
    const existing = await getCarouselConfig(pageKey);
    const payload: any = {};
    payload[displayField] = pageKey;
    payload[valueField] = JSON.stringify(configObj || {});

    if (existing && existing.id) {
      const path = buildEntityPath(entitySet, existing.id);
      await fetchDataverseResource(path, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return { id: existing.id, key: pageKey };
    }

    const data = await fetchDataverseResource(entitySet, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return data;
  } catch (e) {
    console.error('Error saving carousel config', e);
    throw e;
  }
};

// Force-create a new carousel config record for the given pageKey (always POST)
export const createCarouselConfig = async (pageKey: string, configObj: any): Promise<any> => {
  try {
    const logical = 'e365_knowledgecentreconfiguration';
    const entitySet = await resolveEntitySetForLogicalName(logical).catch(() => logical);
    const accessToken = await getDataverseAccessToken();

    // discover metadata names
    let meta: { keyName: string; displayName?: string; valueName?: string } | null = null;
    try {
      meta = await getEntitySetMetadata(entitySet);
    } catch {
      meta = null;
    }

    const displayField = (meta && meta.displayName) || 'name';
    const valueField = (meta && meta.valueName) || 'value';

    const payload: any = {};
    payload[displayField] = pageKey;
    payload[valueField] = JSON.stringify(configObj || {});

    const data = await fetchDataverseResource(entitySet, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return data;
  } catch (e) {
    console.error('Error creating carousel config', e);
    throw e;
  }
};
