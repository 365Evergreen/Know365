import React from 'react';
import { Stack, Text, SearchBox } from '@fluentui/react';
import useAuth from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const Hero: React.FC = () => {
  const auth = useAuth();
  const account = auth.getActiveAccount();
  const displayName = account?.name ?? (account as any)?.username ?? 'User';
  const firstName = (displayName && displayName.split ? displayName.split(' ')[0] : 'User') || 'User';
  const navigate = useNavigate();

  return (
    <Stack
      horizontalAlign="stretch"
      verticalAlign="center"
      styles={{
        root: {
          // keep padding but sit below header dynamically
          marginTop: 'var(--app-header-height, 80px)',
          padding: '3rem 2rem',
          textAlign: 'left',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        },
      }}
    >
      <div style={{ maxWidth: 1100, marginLeft: 0 }}>
      <Text
        variant="xxLarge"
        block
        styles={{ root: { fontWeight: 600, marginBottom: '1rem' } }}
      >
        Hello, {firstName}
      </Text>
      <Text variant="large" block styles={{ root: { maxWidth: 760, margin: '0 0 20px 0', textAlign: 'left' } }}>
        Discover resources, guides, and best practices from across your Microsoft 365 environment. Search SharePoint,
        OneDrive, and Teams content all in one place.
      </Text>

      <div style={{ maxWidth: 720, width: '100%' }}>
        <SearchBox
          placeholder="Search knowledge..."
          onSearch={(q?: string) => {
            const query = q ?? '';
            navigate(`/knowledge?q=${encodeURIComponent(query)}`);
          }}
          styles={{ root: { width: '100%' } }}
        />
      </div>
      </div>
    </Stack>
  );
};

export default Hero;
