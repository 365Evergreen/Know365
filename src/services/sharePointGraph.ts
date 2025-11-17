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
    // Filter returned items to only include file (document) items — exclude drive/list container objects
    const docs = (response.value || []).filter((it: any) => {
      // drive items representing files have a `file` facet or a `size` property
      if (it.file) return true;
      if (typeof it.size === 'number' && it.size > 0) return true;
      // sometimes items representing list items are returned; include when they have a webUrl and no folder facet
      if (!it.folder && it.webUrl) return true;
      return false;
    });

    return docs;
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return [];
  }
};

// Fetch list items by siteId + listId. Returns normalized items similar to drive items.
export const getListItems = async (
  accessToken: string,
  siteId: string,
  listId: string,
  top: number = 50
): Promise<SharePointDocument[]> => {
  const client = getGraphClient(accessToken);

  try {
    const response = await client.api(`/sites/${siteId}/lists/${listId}/items?$expand=fields&$top=${top}`).get();
    const items = (response.value || []).map((it: any) => {
      const fields = it.fields || {};
      return {
        id: it.id,
        name: fields.Title || fields.title || fields.Name || `Item ${it.id}`,
        webUrl: it.sharepointIds && it.sharepointIds.webUrl ? it.sharepointIds.webUrl : it.webUrl || '',
        lastModifiedDateTime: it.lastModifiedDateTime || fields.Modified || null,
        createdBy: it.createdBy || null,
        size: 0,
      } as SharePointDocument;
    });

    return items;
  } catch (error) {
    console.error('getListItems failed:', error);
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
    // Filter search results to return only documents/list items (exclude drive or library objects)
    const docs = (response.value || []).filter((it: any) => {
      if (it.file) return true;
      if (typeof it.size === 'number' && it.size > 0) return true;
      if (!it.folder && it.webUrl) return true;
      return false;
    });

    return docs;
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
    // Try drive (document library) resolution first
    try {
      const driveId = await getDriveId(accessToken, siteId, libraryName);
      const items = await getDocuments(accessToken, siteId, driveId, top);
      return items;
    } catch (driveErr) {
      // If drive resolution failed, attempt to find a SharePoint list by name
      console.warn(`Failed to get drive ID for library '${libraryName}':`, driveErr);
      try {
        const lists = await getSiteListsByUrl(siteUrl);
        // try to match by displayName (case-insensitive) or Title
        const candidate = (lists || []).find((l: any) => {
          const name = (l.displayName || l.Title || '').toLowerCase();
          return name === String(libraryName).toLowerCase() || name === String(libraryName).toLowerCase().replace(/\s+/g, '');
        });
        if (candidate && candidate.id) {
          // candidate.id might already be the listId
          const listId = candidate.id;
          const listItems = await getListItems(accessToken, siteId, listId, top);
          return listItems;
        }
        // no matching list found; rethrow original drive error for upstream logging
        throw driveErr;
      } catch (listErr) {
        console.error('listLibraryItems failed (drive and list lookup):', listErr);
        return [];
      }
    }
  } catch (err) {
    console.error('listLibraryItems failed:', err);
    return [];
  }
};

// Admin helpers: resolve drives and lists for a given site URL. Useful for admin UI flows.
export const getSiteDrivesByUrl = async (siteUrl: string): Promise<Array<{ id: string; name: string }>> => {
  try {
    const accessToken = await getAccessToken();
    const client = getGraphClient(accessToken);
    const siteId = await getSiteId(accessToken, siteUrl);
    const resp = await client.api(`/sites/${siteId}/drives`).get();
    return (resp.value || []).map((d: any) => ({ id: d.id, name: d.name }));
  } catch (err) {
    console.error('getSiteDrivesByUrl failed:', err);
    return [];
  }
};

export const getSiteListsByUrl = async (siteUrl: string): Promise<Array<{ id: string; displayName: string }>> => {
  try {
    const accessToken = await getAccessToken();
    const client = getGraphClient(accessToken);
    const siteId = await getSiteId(accessToken, siteUrl);
    const resp = await client.api(`/sites/${siteId}/lists`).get();
    const lists = (resp.value || []).map((l: any) => ({ id: l.id, displayName: l.displayName || l.name }));

    // Graph may return zero lists if permissions are limited; fallback to SharePoint REST
    if (!lists || lists.length === 0) {
      try {
        const restUrl = siteUrl.replace(/\/+$/, '') + '/_api/web/lists?$select=Title,Id';
        const r = await fetch(restUrl, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json;odata=verbose' } });
        if (r.ok) {
          const json = await r.json();
          const items = (json.d && json.d.results) || json.value || [];
          return items.map((it: any) => ({ id: it.Id || it.ID || it.id || it.Id, displayName: it.Title || it.Title || '' }));
        }
      } catch (restErr) {
        console.warn('SharePoint REST fallback for lists failed', restErr);
      }
    }

    return lists;
  } catch (err) {
    console.error('getSiteListsByUrl failed:', err);
    return [];
  }
};

// Convenience wrapper to resolve a siteId from a site URL using an internally-acquired token.
export const getSiteIdByUrl = async (siteUrl: string): Promise<string | null> => {
  try {
    const accessToken = await getAccessToken();
    const id = await getSiteId(accessToken, siteUrl);
    return id;
  } catch (err) {
    console.error('getSiteIdByUrl failed:', err);
    return null;
  }
};

// Map SharePoint document/list items to the UI DocumentItem shape used by DocumentsDisplay
export type DisplayDocumentItem = {
  id: string;
  title: string;
  webUrl?: string;
  lastModifiedDateTime?: string;
  source?: string;
  excerpt?: string;
  _raw?: any;
};

export const mapSharePointDocsToDisplayItems = (items: SharePointDocument[] | any[]): DisplayDocumentItem[] => {
  if (!items || !Array.isArray(items)) return [];
  return items.map((it: any) => {
    const title = it.name || (it.fields && (it.fields.Title || it.fields.title)) || `Item ${it.id}`;
    const source = (it.createdBy && it.createdBy.user && it.createdBy.user.displayName) || (it.createdBy && it.createdBy.displayName) || undefined;
    const webUrl = it.webUrl || (it.sharepointIds && it.sharepointIds.webUrl) || '';
    const lastModified = it.lastModifiedDateTime || (it.fields && (it.fields.Modified || it.fields.modified));

    return {
      id: String(it.id || title),
      title,
      webUrl,
      lastModifiedDateTime: lastModified ? String(lastModified) : undefined,
      source,
      excerpt: (it._excerpt || it.excerpt || (it.fields && (it.fields.Excerpt || it.fields.Description || it.fields.summary))) || undefined,
      _raw: it,
    } as DisplayDocumentItem;
  });
};
