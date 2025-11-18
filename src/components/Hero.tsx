import React, { useEffect, useState } from 'react';
import { Stack, Text, SearchBox } from '@fluentui/react';
import useAuth from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getAppConfigItems } from '../services/dataverseClient';

const Hero: React.FC = () => {
  const auth = useAuth();
  const account = auth.getActiveAccount();
  const displayName = account?.name ?? (account as any)?.username ?? 'User';
  const firstName = (displayName && displayName.split ? displayName.split(' ')[0] : 'User') || 'User';
  const navigate = useNavigate();

  const [heroCfg, setHeroCfg] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const items = await getAppConfigItems();
        const found = (items || []).find((i: any) => (i.key || '').toString().toLowerCase() === 'hero:settings');
        if (found) {
          try {
            const parsed = typeof found.value === 'string' ? JSON.parse(found.value) : found.value;
            if (mounted) setHeroCfg(parsed || {});
          } catch (e) {
            if (mounted) setHeroCfg({});
          }
        } else {
          if (mounted) setHeroCfg({});
        }
      } catch (e) {
        if (mounted) setHeroCfg({});
      }
    };
    load();
    const onUpdate = () => load();
    window.addEventListener('ui-config-updated', onUpdate as EventListener);
    return () => { mounted = false; window.removeEventListener('ui-config-updated', onUpdate as EventListener); };
  }, []);

  const bgStyle = (() => {
    if (heroCfg) {
      if (heroCfg.backgroundImage) return { backgroundImage: `url(${heroCfg.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' };
      if (heroCfg.gradient) return { background: heroCfg.gradient };
      if (heroCfg.bgColor) return { background: heroCfg.bgColor };
    }
    return { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };
  })();

  const displayTitle = (heroCfg && heroCfg.title) ? heroCfg.title : `Hello, ${firstName}`;
  const displaySubtitle = (heroCfg && heroCfg.subtitle) ? heroCfg.subtitle : 'Discover resources, guides, and best practices from across your Microsoft 365 environment. Search SharePoint, OneDrive, and Teams content all in one place.';

  return (
    <Stack
      horizontalAlign="stretch"
      verticalAlign="center"
      styles={{
        root: {
          marginTop: 0,
          padding: '3rem 2rem',
          textAlign: 'left',
          color: 'white',
          ...bgStyle,
        },
      }}
    >
      <div style={{ maxWidth: 1100, marginLeft: 0 }}>
      <Text
        variant="xxLarge"
        block
        styles={{ root: { fontWeight: 600, marginBottom: '1rem' } }}
      >
        {displayTitle}
      </Text>
      <Text variant="large" block styles={{ root: { maxWidth: 760, margin: '0 0 20px 0', textAlign: 'left' } }}>
        {displaySubtitle}
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
