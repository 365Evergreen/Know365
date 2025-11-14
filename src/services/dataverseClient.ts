import { msalInstance } from './authConfig';

interface KnowledgeSource {
  SourceName: string;
  SharePointSiteUrl: string;
  LibraryName: string;
  GraphEndpoint?: string;
}

const DATAVERSE_API = import.meta.env.VITE_DATAVERSE_API;

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

    const response = await fetch(`${DATAVERSE_API}/KnowledgeSources`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch knowledge sources: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value || [];
  } catch (error) {
    console.error('Error fetching knowledge sources:', error);
    return [];
  }
};

export const createKnowledgeSource = async (source: KnowledgeSource): Promise<void> => {
  const accessToken = await getDataverseAccessToken();

  await fetch(`${DATAVERSE_API}/KnowledgeSources`, {
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

    const response = await fetch(`${DATAVERSE_API}/KnowledgeArticles${filter}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch knowledge articles: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value || [];
  } catch (error) {
    console.error('Error fetching knowledge articles:', error);
    return [];
  }
};
