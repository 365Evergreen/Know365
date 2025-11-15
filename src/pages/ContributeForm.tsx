import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Stack, PrimaryButton, TextField, Spinner, Text, DatePicker, Dropdown, IDropdownOption } from '@fluentui/react';
import { getFormMapping, createEntityRecord } from '../services/dataverseClient';
import useMessage from '../hooks/useMessage';

const ContributeForm: React.FC = () => {
  const [params] = useSearchParams();
  const mappingKey = params.get('mapping') || undefined;
  const [mapping, setMapping] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const { showMessage, MessageHost } = useMessage();

  useEffect(() => {
    if (!mappingKey) return;
    setLoading(true);
    getFormMapping(mappingKey)
      .then((m) => {
        setMapping(m?.mapping || null);
        if (m?.mapping?.fields) {
          const initial: any = {};
          for (const f of m.mapping.fields) initial[f.name] = '';
          setValues(initial);
        }
      })
      .catch((e) => console.error('Failed loading mapping', e))
      .finally(() => setLoading(false));
  }, [mappingKey]);

  if (!mappingKey) return <Text>Please provide a `mapping` query parameter (e.g. ?mapping=form:table:name)</Text>;
  if (loading) return <Spinner label="Loading form mapping..." />;
  if (!mapping) return <Text>No mapping found for {mappingKey}</Text>;

  const handleChange = (name: string, v: any) => setValues((s) => ({ ...s, [name]: v }));

  const handleSubmit = async () => {
    if (!mapping) return;
    setSubmitting(true);
    try {
      // mapping.table contains the target table logical/entity set
      const payload: any = {};
      for (const f of mapping.fields) {
        payload[f.name] = values[f.name];
      }
      await createEntityRecord(mapping.table, payload);
      showMessage('Submitted successfully');
    } catch (e) {
      console.error('Submit failed', e);
      showMessage('Submit failed', 3 as any);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <MessageHost />
      <h3>Contribute</h3>
      <div style={{ maxWidth: 720 }}>
        {mapping.fields.map((f: any) => {
          const inputType = (f.inputType || 'text').toLowerCase();
          const label = f.label || f.name;
          return (
            <div key={f.name} style={{ marginBottom: 12 }}>
              {inputType === 'textarea' ? (
                <TextField
                  label={label}
                  multiline
                  rows={4}
                  value={values[f.name] || ''}
                  onChange={(_, v) => handleChange(f.name, v)}
                />
              ) : inputType === 'number' ? (
                <TextField
                  label={label}
                  type="number"
                  value={values[f.name] ?? ''}
                  onChange={(_, v) => handleChange(f.name, v ? Number(v) : v)}
                />
              ) : inputType === 'date' ? (
                <DatePicker
                  label={label}
                  value={values[f.name] ? new Date(values[f.name]) : undefined}
                  onSelectDate={(d) => handleChange(f.name, d ? d.toISOString() : '')}
                />
              ) : inputType === 'choice' || inputType === 'select' || inputType === 'dropdown' ? (
                <Dropdown
                  label={label}
                  selectedKey={values[f.name]}
                  options={(f.options || []).map((o: any) =>
                    typeof o === 'string' ? ({ key: o, text: o } as IDropdownOption) : ({ key: o.key ?? o.value ?? o, text: o.text ?? o.label ?? o.key ?? o } as IDropdownOption)
                  )}
                  onChange={(_, option) => handleChange(f.name, option ? option.key : undefined)}
                />
              ) : (
                <TextField label={label} value={values[f.name] || ''} onChange={(_, v) => handleChange(f.name, v)} />
              )}
            </div>
          );
        })}
        <div style={{ marginBottom: 12 }}>
          <PrimaryButton onClick={() => console.log('placeholder')} style={{ display: 'none' }} />
        </div>
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <PrimaryButton onClick={handleSubmit} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit'}</PrimaryButton>
        </Stack>
      </div>
    </div>
  );
};

export default ContributeForm;
