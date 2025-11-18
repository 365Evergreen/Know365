import React, { useEffect, useState } from 'react';
import { Stack, Text, TextField, PrimaryButton, Icon } from '@fluentui/react';
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
  const [query, setQuery] = useState<string>('');

  const doSearch = () => {
    const q = (query || '').trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

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

      <div style={{ maxWidth: 920, width: '100%', marginTop: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <TextField
            aria-label="Hero search"
            placeholder={heroCfg && heroCfg.searchPlaceholder ? heroCfg.searchPlaceholder : 'Search knowledge...'}
            value={String((heroCfg && heroCfg._lastQuery) || '')}
            onChange={(_e, v) => setQuery(v || '')}
            styles={{
              root: { flex: 1 },
              field: { padding: '14px 18px', fontSize: 18, borderRadius: 6, height: 52 },
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') doSearch(); }}
          />
          <PrimaryButton
            onClick={doSearch}
            styles={{ root: { height: 52, borderRadius: 6, padding: '0 18px' } }}
            aria-label="Search"
          >
            <Icon iconName="Search" styles={{ root: { marginRight: 8 } }} />
            Search
          </PrimaryButton>
        </div>
      </div>
      </div>
    </Stack>
  );
};

export default Hero;
