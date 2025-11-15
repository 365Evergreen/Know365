import React, { useEffect, useState } from 'react';
import { Stack, TextField, PrimaryButton, DefaultButton, Dropdown, IDropdownOption, MessageBar, MessageBarType, Spinner, Text } from '@fluentui/react';
import { getAppConfigItems, createAppConfigItem, updateAppConfigItem } from '../services/dataverseClient';

type UIConfig = {
  logoUrl?: string;
  primaryColor?: string;
  fontFamily?: string;
  layout?: 'single' | 'two-column';
  showSidebar?: boolean;
};

const fontOptions: IDropdownOption[] = [
  { key: 'default', text: 'Default' },
  { key: 'Segoe UI', text: 'Segoe UI' },
  { key: 'Arial', text: 'Arial' },
  { key: 'Roboto', text: 'Roboto' },
  { key: 'Times New Roman', text: 'Times New Roman' },
];

const UIConfigEditor: React.FC = () => {
  const [config, setConfig] = useState<UIConfig>({});
  const [recordId, setRecordId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | null; text?: string }>({ type: null });
  const [errors, setErrors] = useState<{ logoUrl?: string; primaryColor?: string }>({});
  const CONFIG_KEY = 'ui:settings';

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const items = await getAppConfigItems();
      const found = (items || []).find((i: any) => (i.key || '').toString().toLowerCase() === CONFIG_KEY);
      if (found) {
        setRecordId(found.id || (found.raw && (found.raw['@odata.id'] || found.raw.id)) || null);
        try {
          const parsed = typeof found.value === 'string' ? JSON.parse(found.value) : found.value;
          setConfig(parsed || {});
        } catch {
          setConfig({});
        }
      } else {
        setConfig({});
        setRecordId(null);
      }
    } catch (e) {
      console.error('Failed to load UI config', e);
    } finally {
    }
  };

  const handleSave = async () => {
    // validate inputs
    const errs: any = {};
    if (config.primaryColor && !/^#([0-9A-Fa-f]{3}){1,2}$/.test(config.primaryColor)) errs.primaryColor = 'Enter a valid hex color like #0067b8';
    if (config.logoUrl && !/^(https?:)?\/\/.+/i.test(config.logoUrl)) errs.logoUrl = 'Logo must be a valid absolute URL';
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setMessage({ type: 'error', text: 'Please fix validation errors before saving.' });
      return;
    }

    const payload = { name: CONFIG_KEY, value: JSON.stringify(config) } as any;
    try {
      setSaving(true);
      if (recordId) {
        await updateAppConfigItem(recordId, payload);
      } else {
        await createAppConfigItem(payload);
      }
      await loadConfig();
      // notify other listeners (App/theme) to reload settings immediately
      try {
        window.dispatchEvent(new CustomEvent('ui-config-updated'));
      } catch (e) {
        // older browsers fallback
        const ev = document.createEvent('Event');
        ev.initEvent('ui-config-updated', true, true);
        window.dispatchEvent(ev);
      }
      setMessage({ type: 'success', text: 'UI settings saved' });
    } catch (e) {
      console.error('Failed to save UI config', e);
      setMessage({ type: 'error', text: 'Save failed, check console for details.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig({});
  };

  return (
    <div style={{ marginTop: 24 }}>
      <h3>UI Configuration</h3>
      <Stack tokens={{ childrenGap: 8 }} styles={{ root: { maxWidth: 720 } }}>
        {message.type && (
          <MessageBar messageBarType={message.type === 'success' ? MessageBarType.success : MessageBarType.error}>{message.text}</MessageBar>
        )}
        <TextField label="Logo URL" value={config.logoUrl || ''} onChange={(_, v) => setConfig({ ...config, logoUrl: v || '' })} errorMessage={errors.logoUrl} />
        <TextField label="Primary color (hex)" value={config.primaryColor || ''} onChange={(_, v) => setConfig({ ...config, primaryColor: v || '' })} errorMessage={errors.primaryColor} />
        <Dropdown
          label="Font family"
          selectedKey={(config.fontFamily as string) || 'default'}
          options={fontOptions}
          onChange={(_, o) => setConfig({ ...config, fontFamily: (o?.key as string) === 'default' ? undefined : (o?.key as string) })}
        />
        <Dropdown
          label="Layout"
          selectedKey={config.layout || 'single'}
          options={[{ key: 'single', text: 'Single column' }, { key: 'two-column', text: 'Two column' }]}
          onChange={(_, o) => setConfig({ ...config, layout: (o?.key as any) })}
        />

        <div style={{ marginTop: 12, padding: 12, border: '1px solid #eee', borderRadius: 6, background: '#fff' }}>
          <Text variant="mediumPlus" styles={{ root: { marginBottom: 8 } }}>Preview</Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, background: config.primaryColor || '#0078d4', color: '#fff', borderRadius: 4 }}>
            <img src={config.logoUrl || 'https://blobknow365.blob.core.windows.net/assets/know365-logo.svg'} alt="logo" style={{ height: 36 }} />
            <div style={{ fontWeight: 600 }}>{config.fontFamily || 'Segoe UI'}</div>
          </div>
        </div>

        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <PrimaryButton onClick={handleSave} text={saving ? 'Saving…' : 'Save UI Config'} disabled={saving} />
          {saving && <Spinner styles={{ root: { marginLeft: 8 } }} />}
          <DefaultButton onClick={handleReset} text="Reset (local)" />
          <DefaultButton onClick={loadConfig} text="Reload" />
        </Stack>
      </Stack>
    </div>
  );
};

export default UIConfigEditor;
