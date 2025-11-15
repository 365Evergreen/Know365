import React, { useEffect, useState } from 'react';
import { Stack, TextField, PrimaryButton, DefaultButton, Dropdown, IDropdownOption } from '@fluentui/react';
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
    const payload = { name: CONFIG_KEY, value: JSON.stringify(config) } as any;
    try {
      if (recordId) {
        await updateAppConfigItem(recordId, payload);
      } else {
        await createAppConfigItem(payload);
      }
      await loadConfig();
    } catch (e) {
      console.error('Failed to save UI config', e);
    }
  };

  const handleReset = () => {
    setConfig({});
  };

  return (
    <div style={{ marginTop: 24 }}>
      <h3>UI Configuration</h3>
      <Stack tokens={{ childrenGap: 8 }} styles={{ root: { maxWidth: 720 } }}>
        <TextField label="Logo URL" value={config.logoUrl || ''} onChange={(_, v) => setConfig({ ...config, logoUrl: v || '' })} />
        <TextField label="Primary color (hex)" value={config.primaryColor || ''} onChange={(_, v) => setConfig({ ...config, primaryColor: v || '' })} />
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
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <PrimaryButton onClick={handleSave} text="Save UI Config" />
          <DefaultButton onClick={handleReset} text="Reset (local)" />
          <DefaultButton onClick={loadConfig} text="Reload" />
        </Stack>
      </Stack>
    </div>
  );
};

export default UIConfigEditor;
