import React, { useEffect, useState } from 'react';
import { getAppConfigItems, createAppConfigItem, updateAppConfigItem, deleteAppConfigItem } from '../services/dataverseClient';
import { TextField, PrimaryButton, DefaultButton, Stack, DetailsList, IColumn, Dialog, DialogType, DialogFooter } from '@fluentui/react';

const AdminConfig: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [, setLoading] = useState(false);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);

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

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await getAppConfigItems();
      // If the service already returned normalized items (id/key/value/raw), use them directly
      if (Array.isArray(data) && data.length > 0 && data[0].id !== undefined && data[0].key !== undefined) {
        setItems(data as any[]);
      } else {
        // normalize items to have 'key' and 'value' fields for display
        const normalized = (data || []).map((d: any) => ({
          id: d['@odata.id'] ? d['@odata.id'] : d['id'] || d['configid'] || d['appconfigid'] || d['@odata.etag'] || JSON.stringify(d),
          key: d.name || d.key || d.configkey || d['ms_name'] || d['app_name'] || '',
          value: d.value || d.configvalue || d['ms_value'] || d.description || JSON.stringify(d),
          raw: d,
        }));
        setItems(normalized);
      }
    } catch (e) {
      console.error('Failed to load config items', e);
    } finally {
      setLoading(false);
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
