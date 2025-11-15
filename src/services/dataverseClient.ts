import { msalInstance } from './authConfig';

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

// Resolve an EntitySetName from a logical entity name (LogicalName). This helps avoid
// hardcoded OData paths like 'KnowledgeSources' which may not match the target org's
// EntitySetName (publisher prefixes / pluralization differ). The resolved mapping is
// cached in `entitySetMap` and persisted to localStorage.
async function resolveEntitySetForLogicalName(logicalName: string): Promise<string> {
  const key = logicalName.toLowerCase();
  if (entitySetMap.has(key)) return entitySetMap.get(key)!;

  try {
    const accessToken = await getDataverseAccessToken();
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

// Find lookup attribute logical names on an entity, prefer attributes that reference
// a 'subject'-like target or whose name contains 'subject'. Returns attribute logical
// names (e.g. 'e365_subjectid' or 'regardingobjectid') ordered by likelihood.
async function findLookupAttributesForEntity(entityLogicalName: string): Promise<string[]> {
  try {
    const accessToken = await getDataverseAccessToken();
    const resourcePath = `EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes?$select=LogicalName,AttributeType,Targets`;
    const data = await fetchDataverseResource(resourcePath, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });

    const attrs = (data?.value || []) as Array<any>;
    const lookupAttrs = attrs.filter((a) => a.AttributeType === 'Lookup' || a.AttributeType === 'Customer');

    // Score and sort: attributes whose LogicalName contains 'subject' first, then those whose Targets include 'subject', then others.
    const scored = lookupAttrs.map((a) => {
      const name: string = (a.LogicalName || '').toLowerCase();
      const targets: string[] = Array.isArray(a.Targets) ? a.Targets.map((t: string) => (t || '').toLowerCase()) : [];
      let score = 0;
      if (name.includes('subject')) score += 10;
      if (targets.some((t) => t.includes('subject'))) score += 8;
      if (name.includes('topic')) score += 4;
      return { name: a.LogicalName, score };
    });

    scored.sort((x, y) => y.score - x.score);
    return scored.map((s) => s.name).filter(Boolean);
  } catch (e) {
    console.warn('findLookupAttributesForEntity failed', e);
    return [];
  }
}

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

    return await getEntityRecords(entitySetName, 200) as KnowledgeSource[];
  } catch (error) {
    console.error('Error fetching knowledge sources:', error);
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
  const accessToken = await getDataverseAccessToken();

  await fetchDataverseResource('KnowledgeSources', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(source),
  });
};

export const getKnowledgeArticles = async (q?: string): Promise<any[]> => {
  try {
    // Try to use resolved entity set name for the articles logical name
    const logical = 'e365_knowledgearticle';
    let entitySet = 'KnowledgeArticles';
    try {
      entitySet = await resolveEntitySetForLogicalName(logical);
    } catch (e) {
      // fallback to legacy guess 'KnowledgeArticles'
    }

    let filter = '';
    if (q && q.trim()) {
      const safe = q.replace(/'/g, "''");
      filter = `?$filter=contains(title,'${safe}') or contains(tagsText,'${safe}')&$top=50`;
    } else {
      filter = '?$top=50';
    }

    const resourcePath = `${entitySet}${filter}`;
    const accessToken = await getDataverseAccessToken();
    const data = await fetchDataverseResource(resourcePath, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return data?.value || [];
  } catch (error) {
    console.error('Error fetching knowledge articles:', error);
    return [];
  }
};

// Attempt to fetch knowledge articles filtered by a subject id.
export const getKnowledgeArticlesBySubject = async (subjectId: string, top = 50): Promise<any[]> => {
  try {
    // Resolve the entity set to use for knowledge articles (fallback to 'KnowledgeArticles')
    const logical = 'e365_knowledgearticle';
    let entitySet = 'KnowledgeArticles';
    try {
      entitySet = await resolveEntitySetForLogicalName(logical);
    } catch (e) {
      // fallback to legacy name
    }

    const accessToken = await getDataverseAccessToken();

    // Try several plausible lookup attribute names until one returns results
    const candidates = [
      `_e365_knowledgearticlesubjectid_value eq guid'${subjectId}'`,
      `e365_knowledgearticlesubjectid eq guid'${subjectId}'`,
      `_subjectid_value eq guid'${subjectId}'`,
      `subjectid eq guid'${subjectId}'`,
    ];

    for (const filter of candidates) {
      try {
        const resourcePath = `${entitySet}?$filter=${encodeURIComponent(filter)}&$top=${top}`;
        const data = await fetchDataverseResource(resourcePath, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        const list = data?.value || [];
        if (Array.isArray(list) && list.length > 0) return list;
      } catch (e) {
        // log candidate failure to help diagnose 400/404 responses
        try {
          // include filter in the warning to make debugging easier
          // eslint-disable-next-line no-console
          console.warn(`Dataverse: candidate filter failed: ${filter}`, e);
        } catch (logErr) {
          /* ignore logging errors */
        }
        // try next candidate
      }
    }

    // If the above guessed filter attributes failed, attempt discovery of lookup attributes
    // on the article entity and try filters of the form `_<attr>_value eq guid'...'` for each
    // discovered lookup attribute.
    try {
      const lookupAttrs = await findLookupAttributesForEntity(logical);
      for (const attr of lookupAttrs) {
        const lookupFilter = `_${attr}_value eq guid'${subjectId}'`;
        try {
          const resourcePath2 = `${entitySet}?$filter=${encodeURIComponent(lookupFilter)}&$top=${top}`;
          const data2 = await fetchDataverseResource(resourcePath2, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });
          const list2 = data2?.value || [];
          if (Array.isArray(list2) && list2.length > 0) {
            // persist mapping of attribute to speed up future queries
            try {
              const mapKey = `${logical}::lookup::subject`;
              entitySetMap.set(mapKey.toLowerCase(), attr);
              persistEntitySetMap();
            } catch (e) { /* ignore */ }
            return list2;
          }
        } catch (e) {
          console.warn(`Dataverse: lookup attribute filter failed for ${attr}`, e);
          // try next attribute
        }
      }
    } catch (e) {
      console.warn('Error discovering lookup attributes for articles', e);
    }

    // fallback: return empty
    return [];
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
