import { getAccessToken } from './graphClient';

interface KnowledgeSource {
  SourceName: string;
  SharePointSiteUrl: string;
  LibraryName: string;
  GraphEndpoint?: string;
}

const DATAVERSE_API = import.meta.env.VITE_DATAVERSE_API;

export const getKnowledgeSources = async (): Promise<KnowledgeSource[]> => {
  try {
    const accessToken = await getAccessToken();
    
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
  const accessToken = await getAccessToken();
  
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
    const accessToken = await getAccessToken();

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
