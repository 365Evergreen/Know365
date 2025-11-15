import React, { useEffect, useState, useRef } from 'react';
import { Stack, DefaultButton, PrimaryButton, TextField, Spinner, Text } from '@fluentui/react';
import { listEntityFields, createAppConfigItem, saveFormMapping } from '../services/dataverseClient';
import useMessage from '../hooks/useMessage';

interface FieldDef {
  name: string;
  type?: string;
}

type InputType = 'text' | 'textarea' | 'date' | 'number' | 'choice';

interface FormField {
  name: string;
  label?: string;
  required?: boolean;
  inputType?: InputType;
}

const FormBuilder: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<string | undefined>(undefined);
  const [availableFields, setAvailableFields] = useState<FieldDef[]>([]);
  const [selectedFields, setSelectedFields] = useState<FormField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [formName, setFormName] = useState('default');
  const dragIndex = useRef<number | null>(null);

  useEffect(() => {
    if (!selectedTable) return;
    setLoadingFields(true);
    listEntityFields(selectedTable)
      .then((f) => setAvailableFields(f))
      .catch((e) => console.error('Failed listing fields', e))
      .finally(() => setLoadingFields(false));
  }, [selectedTable]);

  const onDragStart = (e: React.DragEvent, idx: number) => {
    dragIndex.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDropToSelected = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIndex.current === null) return;
    const from = dragIndex.current;
    const to = idx;
    const copy = [...selectedFields];
    const [m] = copy.splice(from, 1);
    copy.splice(to, 0, m);
    setSelectedFields(copy);
    dragIndex.current = null;
  };
  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  const addField = (f: FieldDef) => {
    if (selectedFields.some((s) => s.name === f.name)) return;
    setSelectedFields((s) => [...s, { name: f.name, label: f.name, required: false, inputType: 'text' }]);
  };

  const removeField = (name: string) => setSelectedFields((s) => s.filter((f) => f.name !== name));

  // use message hook
  const { showMessage, MessageHost } = useMessage();

  const saveMapping = async () => {
    if (!selectedTable) return showMessage('Select a table first', 2 /* warning */ as any);
    const key = `form:${selectedTable}:${formName}`;
    const payload = { name: key, value: JSON.stringify({ table: selectedTable, formName, fields: selectedFields }) };
    try {
      await saveFormMapping ? await (require('../services/dataverseClient') as any).saveFormMapping(key, { table: selectedTable, formName, fields: selectedFields }) : await createAppConfigItem(payload);
      showMessage('Form mapping saved', 1 as any /* success */);
    } catch (e) {
      console.error('Save failed', e);
      showMessage('Failed to save mapping', 3 as any /* error */);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <MessageHost />
      <div style={{ minWidth: 320 }}>
        <h4>Select Table</h4>
        <Text styles={{ root: { fontSize: 12, color: '#666' } }}>Type or paste a logical name (e.g. e365_knowledgearticle) or an entity set name</Text>
        <TextField placeholder="entity set or logical name" value={selectedTable || ''} onChange={(_, v) => setSelectedTable(v || undefined)} />
        <div style={{ marginTop: 12 }}>
          <h4>Available fields</h4>
          {loadingFields ? (
            <Spinner label="Loading fields..." />
          ) : (
            <div style={{ maxHeight: 420, overflow: 'auto' }}>
              {availableFields.map((f) => (
                <div key={f.name} style={{ padding: 8, borderBottom: '1px solid #f1f1f1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ fontSize: 12 }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{f.type}</div>
                  </div>
                  <DefaultButton onClick={() => addField(f)}>Add</DefaultButton>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <h4>Form: <i>{formName}</i></h4>
        <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
          <TextField label="Form name" value={formName} onChange={(_, v) => setFormName(v || 'default')} />
          <PrimaryButton onClick={saveMapping}>Save mapping</PrimaryButton>
        </Stack>

        <div style={{ marginTop: 12 }}>
          <h5>Selected fields (drag to reorder)</h5>
          <div style={{ border: '1px dashed #ccc', minHeight: 120, padding: 8 }} onDragOver={onDragOver}>
            {selectedFields.length === 0 && <Text styles={{ root: { color: '#666' } }}>No fields selected</Text>}
              {selectedFields.map((f, idx) => (
                <div key={f.name} draggable onDragStart={(e) => onDragStart(e, idx)} onDrop={(e) => onDropToSelected(e, idx)} style={{ padding: 8, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ fontWeight: 600 }}>{f.label}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{f.name}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <TextField label="Label" value={f.label} onChange={(_, v) => setSelectedFields((s) => s.map((x, i) => (i === idx ? { ...x, label: v || x.label } : x)))} styles={{ root: { width: 240 } }} />
                      <TextField label="Type" value={f.inputType} onChange={(_, v) => setSelectedFields((s) => s.map((x, i) => (i === idx ? { ...x, inputType: (v as any) || x.inputType } : x)))} styles={{ root: { width: 140 } }} />
                      <DefaultButton text={f.required ? 'Required' : 'Optional'} onClick={() => setSelectedFields((s) => s.map((x, i) => (i === idx ? { ...x, required: !x.required } : x)))} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <DefaultButton onClick={() => removeField(f.name)}>Remove</DefaultButton>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormBuilder;
