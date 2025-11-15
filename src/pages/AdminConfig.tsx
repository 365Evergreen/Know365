import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminIcons from './AdminIcons';
import {
  getAppConfigItems,
  createAppConfigItem,
  updateAppConfigItem,
  deleteAppConfigItem,
  listEntitySets,
  getEntityMetadata,
} from '../services/dataverseClient';
import {
  TextField,
  PrimaryButton,
  DefaultButton,
  Stack,
  DetailsList,
  IColumn,
  Dialog,
  DialogType,
  DialogFooter,
  Dropdown,
  IDropdownOption,
  Spinner,
} from '@fluentui/react';

const AdminConfig: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [, setLoading] = useState(false);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  // metadata inspector state
  const [entitySets, setEntitySets] = useState<string[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [selectedEntitySet, setSelectedEntitySet] = useState<string | undefined>(undefined);
  const [entityMeta, setEntityMeta] = useState<{ keyName: string; displayName?: string; valueName?: string } | null>(null);
  const [mappings, setMappings] = useState<any[]>([]);
  const [mappingEditing, setMappingEditing] = useState<any | null>(null);
  const [showIconsInline, setShowIconsInline] = useState(false);
  const navigate = useNavigate();

  const columns: IColumn[] = [
    { key: 'col1', name: 'Key', fieldName: 'key', minWidth: 100, maxWidth: 300 },
    { key: 'col2', name: 'Value', fieldName: 'value', minWidth: 200, maxWidth: 600 },
    {
      key: 'col3',
      name: 'Actions',
      fieldName: 'actions',
      minWidth: 120,
      onRender: (item: any) => (
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <DefaultButton onClick={() => beginEdit(item)}>Edit</DefaultButton>
          <DefaultButton onClick={() => setConfirmDelete(item)}>Delete</DefaultButton>
        </Stack>
      ),
    },
  ];

  useEffect(() => {
    loadItems();
  }, []);

  const loadEntitySets = async () => {
    setLoadingMetadata(true);
    try {
      const sets = await listEntitySets();
      setEntitySets(sets);
    } catch (e) {
      console.error('Failed to load $metadata entity sets', e);
    } finally {
      setLoadingMetadata(false);
    }
  };

  const inspectEntitySet = async (name?: string) => {
    if (!name) return;
    setSelectedEntitySet(name);
    setEntityMeta(null);
    try {
      const meta = await getEntityMetadata(name);
      setEntityMeta(meta as any);
    } catch (e) {
      console.error('Failed to inspect entity set', e);
    }
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await getAppConfigItems();
      // If the service already returned normalized items (id/key/value/raw), use them directly
      if (Array.isArray(data) && data.length > 0 && data[0].id !== undefined && data[0].key !== undefined) {
        setItems(data as any[]);
        // extract mappings
        const maps = (data as any[]).filter((d) => (d.key || '').toString().startsWith('mapping:'));
        setMappings(maps);
      } else {
        // normalize items to have 'key' and 'value' fields for display
        const normalized = (data || []).map((d: any) => ({
          id: d['@odata.id'] ? d['@odata.id'] : d['id'] || d['configid'] || d['appconfigid'] || d['@odata.etag'] || JSON.stringify(d),
          key: d.name || d.key || d.configkey || d['ms_name'] || d['app_name'] || '',
          value: d.value || d.configvalue || d['ms_value'] || d.description || JSON.stringify(d),
          raw: d,
        }));
        setItems(normalized);
        const maps = normalized.filter((d: any) => (d.key || '').toString().startsWith('mapping:'));
        setMappings(maps);
      }
    } catch (e) {
      console.error('Failed to load config items', e);
    } finally {
      setLoading(false);
    }
  };

  const beginEditMapping = (m: any) => {
    setMappingEditing(m);
    // populate form with parsed mapping JSON if available
    try {
      const parsed = JSON.parse(m.value || m.raw?.value || '{}');
      setKey(`mapping:${m.key?.replace(/^mapping:/i, '')}`);
      setValue(JSON.stringify(parsed));
    } catch {
      setKey(m.key || '');
      setValue(m.value || '');
    }
  };

  const handleUpdateMapping = async () => {
    if (!mappingEditing) return;
    const id = mappingEditing.id || (mappingEditing.raw && (mappingEditing.raw['$id'] || mappingEditing.raw['id'] || mappingEditing.raw['appconfigid'] || mappingEditing.raw['configid']));
    if (!id) {
      console.error('Unable to determine mapping id for update');
      return;
    }
    try {
      await updateAppConfigItem(id, { name: key, value: value });
      await loadItems();
      setMappingEditing(null);
      clearForm();
    } catch (e) {
      console.error('Failed to update mapping', e);
    }
  };

  const handleDeleteMapping = async (m: any) => {
    const id = m.id || (m.raw && (m.raw['$id'] || m.raw['id'] || m.raw['appconfigid'] || m.raw['configid']));
    if (!id) {
      console.error('Unable to determine mapping id for delete');
      return;
    }
    try {
      await deleteAppConfigItem(id);
      await loadItems();
    } catch (e) {
      console.error('Failed to delete mapping', e);
    }
  };

  const beginEdit = (item: any) => {
    setEditing(item);
    setKey(item.key);
    setValue(item.value);
  };

  const clearForm = () => {
    setEditing(null);
    setKey('');
    setValue('');
  };

  const handleCreate = async () => {
    try {
      await createAppConfigItem({ name: key, value: value });
      await loadItems();
      clearForm();
    } catch (e) {
      console.error('Create failed', e);
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    try {
      const id = editing.id || (editing.raw && (editing.raw['$id'] || editing.raw['id'] || editing.raw['appconfigid'] || editing.raw['configid']));
      if (!id) {
        console.error('Unable to determine record id for update; ensure the config table exposes a primary key GUID');
        return;
      }
      await updateAppConfigItem(id, { name: key, value: value });
      await loadItems();
      clearForm();
    } catch (e) {
      console.error('Update failed', e);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const id = confirmDelete.id || (confirmDelete.raw && (confirmDelete.raw['$id'] || confirmDelete.raw['id'] || confirmDelete.raw['appconfigid'] || confirmDelete.raw['configid']));
      if (!id) {
        console.error('Unable to determine record id for delete; ensure the config table exposes a primary key GUID');
        setConfirmDelete(null);
        return;
      }
      await deleteAppConfigItem(id);
      await loadItems();
      setConfirmDelete(null);
    } catch (e) {
      console.error('Delete failed', e);
      setConfirmDelete(null);
    }
  };

  return (
    <Stack tokens={{ childrenGap: 12 }} styles={{ root: { padding: 20 } }}>
      <h2>Admin: App Configuration</h2>
      <Stack horizontal tokens={{ childrenGap: 8 }}>
        <TextField label="Key" value={key} onChange={(_, v) => setKey(v || '')} />
        <TextField label="Value" value={value} onChange={(_, v) => setValue(v || '')} />
        {editing ? (
          <PrimaryButton onClick={handleUpdate}>Save</PrimaryButton>
        ) : (
          <PrimaryButton onClick={handleCreate}>Create</PrimaryButton>
        )}
        <DefaultButton onClick={clearForm}>Clear</DefaultButton>
      </Stack>

      <div style={{ marginTop: 12 }}>
        <h3>Existing configuration</h3>
        <DetailsList items={items} columns={columns} selectionMode={0} isHeaderVisible={true} />
      </div>

      <div style={{ marginTop: 24 }}>
        <h3>Mappings</h3>
        <DetailsList
          items={mappings}
          columns={[
            { key: 'm1', name: 'EntitySet', fieldName: 'key', minWidth: 200 },
            { key: 'm2', name: 'Mapping JSON', fieldName: 'value', minWidth: 300 },
            {
              key: 'm3',
              name: 'Actions',
              minWidth: 160,
              onRender: (item: any) => (
                <Stack horizontal tokens={{ childrenGap: 8 }}>
                  <DefaultButton onClick={() => beginEditMapping(item)}>Edit</DefaultButton>
                  <DefaultButton onClick={() => handleDeleteMapping(item)}>Delete</DefaultButton>
                </Stack>
              ),
            },
          ]}
          selectionMode={0}
        />

        {mappingEditing && (
          <div style={{ marginTop: 12 }}>
            <h4>Editing mapping</h4>
            <Stack horizontal tokens={{ childrenGap: 8 }}>
              <TextField label="Name" value={key} onChange={(_, v) => setKey(v || '')} />
              <TextField label="Value (JSON)" value={value} onChange={(_, v) => setValue(v || '')} />
              <PrimaryButton onClick={handleUpdateMapping}>Save mapping</PrimaryButton>
              <DefaultButton onClick={() => { setMappingEditing(null); clearForm(); }}>Cancel</DefaultButton>
            </Stack>
          </div>
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        <h3>$metadata inspector</h3>
        <div style={{ marginBottom: 12 }}>
          <DefaultButton onClick={() => navigate('/admin/icons')} text="Open Icon Manager" />
          <DefaultButton styles={{ root: { marginLeft: 8 } }} text={showIconsInline ? 'Hide Icons Inline' : 'Embed Icons Inline'} onClick={() => setShowIconsInline(!showIconsInline)} />
        </div>
        <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
          <PrimaryButton onClick={() => loadEntitySets()} text="Load entity sets" />
          {loadingMetadata && <Spinner label="Loading metadata..." />}
        </Stack>

        <div style={{ marginTop: 12 }}>
          <Dropdown
            placeholder="Select an entity set"
            options={entitySets.map((s) => ({ key: s, text: s })) as IDropdownOption[]}
            selectedKey={selectedEntitySet}
            onChange={(_, option) => inspectEntitySet(option?.key as string)}
            styles={{ root: { minWidth: 360 } }}
          />
        </div>

        {entityMeta && (
          <div style={{ marginTop: 12 }}>
            <div><strong>Primary key:</strong> {entityMeta.keyName || '<none detected>'}</div>
            <div><strong>Display property:</strong> {entityMeta.displayName || '<none detected>'}</div>
            <div><strong>Value property:</strong> {entityMeta.valueName || '<none detected>'}</div>
            <Stack horizontal tokens={{ childrenGap: 8 }} styles={{ root: { marginTop: 8 } }}>
              <PrimaryButton onClick={async () => {
                // save mapping into app config using a predictable key
                if (!selectedEntitySet || !entityMeta) return;
                const name = `mapping:${selectedEntitySet}`;
                const value = JSON.stringify(entityMeta);
                try {
                  await createAppConfigItem({ name, value });
                  await loadItems();
                } catch (e) {
                  console.error('Failed to save mapping', e);
                }
              }}>Save mapping</PrimaryButton>
              <DefaultButton onClick={() => { setSelectedEntitySet(undefined); setEntityMeta(null); }}>Clear</DefaultButton>
            </Stack>
          </div>
        )}
        {showIconsInline && (
          <div style={{ marginTop: 16 }}>
            <h4>Icon Manager (inline)</h4>
            <AdminIcons />
          </div>
        )}
      </div>

      <Dialog hidden={!confirmDelete} onDismiss={() => setConfirmDelete(null)} dialogContentProps={{ type: DialogType.normal, title: 'Confirm delete', subText: 'Delete this configuration item?' }}>
        <DialogFooter>
          <PrimaryButton onClick={handleDelete} text="Delete" />
          <DefaultButton onClick={() => setConfirmDelete(null)} text="Cancel" />
        </DialogFooter>
      </Dialog>
    </Stack>
  );
};

export default AdminConfig;
