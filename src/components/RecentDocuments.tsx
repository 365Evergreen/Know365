import React, { useEffect, useState } from 'react';
import { Stack, Text, Link, Spinner, SpinnerSize } from '@fluentui/react';
import { getAccessToken, getGraphClient } from '../services/graphClient';

const RecentDocuments: React.FC = () => {
  const [items, setItems] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getAccessToken();
        const client = getGraphClient(token);
        // Use the recent API which returns items from OneDrive and SharePoint the user recently used
        const resp = await client.api('/me/drive/recent').top(10).get();
        if (!mounted) return;
        setItems(resp?.value || resp || []);
      } catch (err: any) {
        console.error('Error loading recent documents:', err);
        if (mounted) setError(err.message || String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) return <Spinner label="Loading recent documents…" size={SpinnerSize.small} />;
  if (error) return <Text variant="small" styles={{ root: { color: 'var(--ms-color-red-10)' } }}>Error loading recent documents: {error}</Text>;
  if (!items || items.length === 0) return <Text variant="small">No recent documents found.</Text>;

  return (
    <Stack tokens={{ childrenGap: 8 }}>
      {items.map((it, i) => {
        const name = it.name || it.file?.name || it.resourceVisualization?.title || 'Untitled';
        const modified = it.lastModifiedDateTime || it.file?.lastModifiedDateTime || '';
        const webUrl = it.webUrl || it.remoteItem?.webUrl || it.resourceVisualization?.containerDisplayName || '';
        return (
          <Stack key={i} horizontal tokens={{ childrenGap: 12 }} styles={{ root: { alignItems: 'center' } }}>
            <div style={{ flex: 1 }}>
              <Text variant="mediumPlus">{name}</Text>
              {modified && <div><Text variant="small">Modified: {new Date(modified).toLocaleString()}</Text></div>}
            </div>
            {webUrl ? (
              <div>
                <Link href={webUrl} target="_blank" rel="noreferrer">Open</Link>
              </div>
            ) : null}
          </Stack>
        );
      })}
    </Stack>
  );
};

export default RecentDocuments;
