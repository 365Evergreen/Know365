import { getGraphClient, getAccessToken } from './graphClient';

interface SharePointDocument {
  id: string;
  name: string;
  webUrl: string;
  lastModifiedDateTime: string;
  createdBy: {
    user: {
      displayName: string;
    };
  };
  size: number;
}

export const getSiteId = async (accessToken: string, siteUrl: string): Promise<string> => {
  const client = getGraphClient(accessToken);
  
  // Extract host and path from URL
  const url = new URL(siteUrl);
  const hostname = url.hostname;
  const sitePath = url.pathname;
  
  try {
    const site = await client.api(`/sites/${hostname}:${sitePath}`).get();
    return site.id;
  } catch (error) {
    console.error(`Failed to resolve site ID for ${siteUrl}:`, error);
    throw error;
  }
};

export const getDriveId = async (
  accessToken: string,
  siteId: string,
  libraryName: string
): Promise<string> => {
  const client = getGraphClient(accessToken);
  
  try {
    const drives = await client.api(`/sites/${siteId}/drives`).get();
    const drive = drives.value.find((d: any) => d.name === libraryName);
    
    if (!drive) {
      throw new Error(`Library '${libraryName}' not found in site ${siteId}`);
    }
    
    return drive.id;
  } catch (error) {
    console.error(`Failed to get drive ID for library '${libraryName}':`, error);
    throw error;
  }
};

export const getDocuments = async (
  accessToken: string,
  siteId: string,
  driveId: string,
  top: number = 50
): Promise<SharePointDocument[]> => {
  const client = getGraphClient(accessToken);
  
  try {
    const response = await client
      .api(`/sites/${siteId}/drives/${driveId}/root/children`)
      .top(top)
      .select('id,name,webUrl,lastModifiedDateTime,createdBy,size')
      .get();
    
    return response.value;
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return [];
  }
};

export const searchDocuments = async (
  accessToken: string,
  siteId: string,
  driveId: string,
  query: string
): Promise<SharePointDocument[]> => {
  const client = getGraphClient(accessToken);
  
  try {
    const response = await client
      .api(`/sites/${siteId}/drives/${driveId}/root/search(q='${query}')`)
      .select('id,name,webUrl,lastModifiedDateTime,createdBy,size')
      .get();
    
    return response.value;
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
};

// Higher-level helper: given a site URL and library name, resolve site & drive and list items.
export const listLibraryItems = async (
  siteUrl: string,
  libraryName: string,
  top: number = 50
): Promise<SharePointDocument[]> => {
  try {
    const accessToken = await getAccessToken();
    const siteId = await getSiteId(accessToken, siteUrl);
    const driveId = await getDriveId(accessToken, siteId, libraryName);
    const items = await getDocuments(accessToken, siteId, driveId, top);
    return items;
  } catch (err) {
    console.error('listLibraryItems failed:', err);
    return [];
  }
};
