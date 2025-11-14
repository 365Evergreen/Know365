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
    const data = await fetchDataverseResource(`${APP_CONFIG_ENTITY_SET}?$top=200`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return data?.value || [];
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
  const url = `${apiRoot}/${APP_CONFIG_ENTITY_SET}(${id})`;

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
  const url = `${apiRoot}/${APP_CONFIG_ENTITY_SET}(${id})`;

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
