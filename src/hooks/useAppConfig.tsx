import { useEffect, useState, useMemo } from 'react';
import { getAppConfigItems } from '../services/dataverseClient';

export type UISettings = {
  logoUrl?: string;
  primaryColor?: string;
  fontFamily?: string;
  layout?: string;
  showSidebar?: boolean;
};

export default function useAppConfig() {
  const [settings, setSettings] = useState<UISettings | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const items = await getAppConfigItems();
        const ui = (items || []).find((i: any) => (i.key || '').toString().toLowerCase() === 'ui:settings');
        if (ui) {
          try {
            const parsed = typeof ui.value === 'string' ? JSON.parse(ui.value) : ui.value;
            if (mounted) setSettings(parsed || {});
          } catch (e) {
            if (mounted) setSettings({});
          }
        } else {
          if (mounted) setSettings({});
        }
      } catch (e) {
        console.error('useAppConfig: failed to load config', e);
        if (mounted) setSettings({});
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    const onUpdate = () => {
      // re-run load when a global update event is dispatched
      load();
    };
    window.addEventListener('ui-config-updated', onUpdate as EventListener);
    // no interval by default; consumer can call refresh by remounting or we can expose a refresh method later
    return () => { mounted = false; window.removeEventListener('ui-config-updated', onUpdate as EventListener); };
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const items = await getAppConfigItems();
      const ui = (items || []).find((i: any) => (i.key || '').toString().toLowerCase() === 'ui:settings');
      if (ui) {
        const parsed = typeof ui.value === 'string' ? JSON.parse(ui.value) : ui.value;
        setSettings(parsed || {});
      }
    } catch (e) {
      console.error('useAppConfig: refresh failed', e);
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(() => ({ settings, loading, refresh }), [settings, loading]);
  return value;
}
