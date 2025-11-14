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

export const getKnowledgeSources = async (): Promise<KnowledgeSource[]> => {
  try {
    const accessToken = await getDataverseAccessToken();

    const data = await fetchDataverseResource('KnowledgeSources', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return data?.value || [];
  } catch (error) {
    console.error('Error fetching knowledge sources:', error);
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
    const accessToken = await getDataverseAccessToken();

    let filter = '';
    if (q && q.trim()) {
      const safe = q.replace(/'/g, "''");
      filter = `?$filter=contains(title,'${safe}') or contains(tagsText,'${safe}')&$top=50`;
    } else {
      filter = '?$top=50';
    }

    const resourcePath = `KnowledgeArticles${filter}`;
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

export const createAppConfigItem = async (item: Record<string, any>): Promise<any> => {
  const accessToken = await getDataverseAccessToken();
  return await fetchDataverseResource(APP_CONFIG_ENTITY_SET, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(item),
  });
};

export const updateAppConfigItem = async (id: string, item: Record<string, any>): Promise<any> => {
  const accessToken = await getDataverseAccessToken();
  // Dataverse PATCH on entity set requires URL: <entitySet>(id)
  const apiRoot = buildDataverseApiRoot();
  const cleanId = id.replace(/[{}]/g, '');
  const url = `${apiRoot}/${APP_CONFIG_ENTITY_SET}(${cleanId})`;

  const resp = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(item),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '<no body>');
    throw new Error(`Failed to update config item: ${resp.status} ${resp.statusText}\n${body}`);
  }

  return await resp.json().catch(() => ({}));
};

export const deleteAppConfigItem = async (id: string): Promise<void> => {
  const accessToken = await getDataverseAccessToken();
  const apiRoot = buildDataverseApiRoot();
  const cleanId = id.replace(/[{}]/g, '');
  const url = `${apiRoot}/${APP_CONFIG_ENTITY_SET}(${cleanId})`;

  const resp = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!resp.ok && resp.status !== 204) {
    const body = await resp.text().catch(() => '<no body>');
    throw new Error(`Failed to delete config item: ${resp.status} ${resp.statusText}\n${body}`);
  }
};
