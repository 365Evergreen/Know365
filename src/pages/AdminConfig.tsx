import React, { useEffect, useState, useRef } from 'react';
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
  Pivot,
  PivotItem,
  DocumentCard,
  DocumentCardTitle,
  DocumentCardDetails,
  DocumentCardActions,
  Text,
  MessageBar,
  MessageBarType,
  getTheme,
} from '@fluentui/react';
import { getCarouselConfig, saveCarouselConfig, createCarouselConfig } from '../services/dataverseClient';
import ConfigurableCarousel from '../components/ConfigurableCarousel';
import FormBuilder from '../components/FormBuilder';
import ComponentLibrary from '../components/ComponentLibrary';
import PageCanvas, { PageComponent } from '../components/PageCanvas';
import collectAdminSettings, { AdminSettingFinding } from '../utils/collectAdminSettings';

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
  // carousel config state
  const [selectedCarouselPage, setSelectedCarouselPage] = useState<string | undefined>(undefined);
  const [carouselConfig, setCarouselConfig] = useState<any | null>(null);
  const [loadingCarouselConfig, setLoadingCarouselConfig] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<MessageBarType>(MessageBarType.info);
  const messageTimer = useRef<number | null>(null);
  const [savingCarousel, setSavingCarousel] = useState(false);
  const [carouselRecordId, setCarouselRecordId] = useState<string | null>(null);
  const [adminFindings, setAdminFindings] = useState<AdminSettingFinding[]>([]);
  const [scanningAdminKeys, setScanningAdminKeys] = useState(false);
  const navigate = useNavigate();
  const theme = getTheme();

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

  const settingColumns: IColumn[] = [
    { key: 's1', name: 'Token', fieldName: 'token', minWidth: 160 },
    { key: 's2', name: 'File', fieldName: 'file', minWidth: 220 },
    { key: 's3', name: 'Line', fieldName: 'line', minWidth: 60 },
    { key: 's4', name: 'Snippet', fieldName: 'snippet', minWidth: 300 },
  ];

  // pages state (for Pages tab) - derive from app config items that start with "page:" or create demo pages
  const [pages, setPages] = useState<any[]>([]);
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [pageEditingItem, setPageEditingItem] = useState<any | null>(null);
  const [pageSlug, setPageSlug] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [pageSummary, setPageSummary] = useState('');
  const [pageContent, setPageContent] = useState('');
  const [pageComponents, setPageComponents] = useState<PageComponent[]>([]);

  const handleAddComponent = (c: PageComponent) => setPageComponents((s) => [...s, c]);
  const handleRemoveComponent = (index: number) => setPageComponents((s) => s.filter((_, i) => i !== index));
  const handleMoveUp = (index: number) => setPageComponents((s) => {
    const copy = [...s];
    if (index > 0) {
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
    }
    return copy;
  });
  const handleMoveDown = (index: number) => setPageComponents((s) => {
    const copy = [...s];
    if (index < copy.length - 1) {
      [copy[index + 1], copy[index]] = [copy[index], copy[index + 1]];
    }
    return copy;
  });
  useEffect(() => {
    // derive simple pages list from loaded items; fallback to sample pages
    if (items && items.length > 0) {
      const p = items.filter((it) => (it.key || '').toString().startsWith('page:'));
      if (p.length > 0) setPages(p.map((pp, idx) => ({ id: pp.id || idx, title: (pp.value && pp.value.title) || pp.key.replace(/^page:/, ''), description: pp.value?.summary || pp.value || '', raw: pp })));
      else
        setPages([
          { id: 'home', title: 'Home', description: 'Landing page with hero and recent documents' },
          { id: 'knowledge', title: 'Knowledge', description: 'Knowledge index and categories' },
          { id: 'about', title: 'About', description: 'About this organization' },
        ]);
    } else {
      setPages([
        { id: 'home', title: 'Home', description: 'Landing page with hero and recent documents' },
        { id: 'knowledge', title: 'Knowledge', description: 'Knowledge index and categories' },
        { id: 'about', title: 'About', description: 'About this organization' },
      ]);
    }
  }, [items]);

  // drag/drop handlers for reordering pages in the Pages tab (simple HTML5 implementation)
  const dragIndex = useRef<number | null>(null);
  const onDragStart = (e: React.DragEvent, idx: number) => {
    dragIndex.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  };

  // Autosave carousel config with debounce when admin edits the form
  useEffect(() => {
    if (!selectedCarouselPage) return;
    // Don't autosave while loading an existing config
    if (loadingCarouselConfig) return;
    // If the admin cleared the config (null) we don't autosave; they can click Save to create/clear explicitly
    if (carouselConfig === null) return;

    const handle = window.setTimeout(async () => {
      setSavingCarousel(true);
      try {
        await saveCarouselConfig(selectedCarouselPage, carouselConfig || {});
        showMessage('Carousel configuration auto-saved', MessageBarType.success, 2000);
      } catch (e) {
        console.error('Auto-save failed', e);
        showMessage('Auto-save failed: see console', MessageBarType.error, 5000);
      } finally {
        setSavingCarousel(false);
      }
    }, 1200);

    return () => {
      window.clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carouselConfig, selectedCarouselPage, loadingCarouselConfig]);
  const onDropPage = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIndex.current === null) return;
    const from = dragIndex.current;
    const to = idx;
    const copy = [...pages];
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    setPages(copy);
    dragIndex.current = null;
  };
  const onDragOver = (e: React.DragEvent) => e.preventDefault();

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

  const showMessage = (text: string, type: MessageBarType = MessageBarType.info, duration = 4000) => {
    setMessage(text);
    setMessageType(type);
    if (messageTimer.current) window.clearTimeout(messageTimer.current);
    messageTimer.current = window.setTimeout(() => setMessage(null), duration) as unknown as number;
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

  const handleSavePage = async () => {
    if (!pageSlug) {
      showMessage('Provide a page slug', MessageBarType.warning);
      return;
    }
    const name = `page:${pageSlug}`;
    // try to parse content as JSON, otherwise keep as string
    let parsedContent: any = pageContent;
    try {
      parsedContent = pageContent && pageContent.trim() !== '' ? JSON.parse(pageContent) : pageContent;
    } catch {
      parsedContent = pageContent;
    }
    const contentObj = typeof parsedContent === 'string' ? (parsedContent ? { body: parsedContent } : {}) : parsedContent || {};
    if (pageComponents && pageComponents.length > 0) contentObj.components = pageComponents;
    const valueObj = { title: pageTitle, summary: pageSummary, content: contentObj };
    const valueStr = JSON.stringify(valueObj);
    try {
      if (pageEditingItem) {
        const id = pageEditingItem.id || pageEditingItem['$id'] || pageEditingItem['appconfigid'] || pageEditingItem['configid'] || pageEditingItem['id'];
        if (!id) {
          showMessage('Unable to determine page record id for update', MessageBarType.error);
          return;
        }
        await updateAppConfigItem(id, { name, value: valueStr });
        showMessage('Page updated', MessageBarType.success);
      } else {
        await createAppConfigItem({ name, value: valueStr });
        showMessage('Page created', MessageBarType.success);
      }
      await loadItems();
      setPageDialogOpen(false);
    } catch (e) {
      console.error('Failed to save page', e);
      showMessage('Failed to save page: see console', MessageBarType.error);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Administration</h2>
      {message && (
        <div style={{ marginTop: 8, marginBottom: 8 }}>
          <MessageBar messageBarType={messageType} onDismiss={() => setMessage(null)}>{message}</MessageBar>
        </div>
      )}
      <Pivot aria-label="Admin tabs">
        <PivotItem headerText="Pages">
          <Stack tokens={{ childrenGap: 12 }}>
            <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
              <PrimaryButton text="Create new page" onClick={() => {
                setPageEditingItem(null);
                setPageSlug('');
                setPageTitle('');
                setPageSummary('');
                setPageContent('');
                setPageDialogOpen(true);
              }} />
              <Text styles={{ root: { marginLeft: 8, color: theme.palette.neutralSecondary } }}>Create and edit pages using templates and drag & drop components.</Text>
            </Stack>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
              {pages.map((p, idx) => (
                <div key={p.id} draggable onDragStart={(e) => onDragStart(e, idx)} onDragOver={onDragOver} onDrop={(e) => onDropPage(e, idx)}>
                  <DocumentCard styles={{ root: { width: 220 } }}>
                    <DocumentCardDetails>
                      <DocumentCardTitle title={p.title} shouldTruncate />
                      <Text styles={{ root: { fontSize: 12, color: theme.palette.neutralSecondary } }}>{p.description}</Text>
                    </DocumentCardDetails>
                    <DocumentCardActions
                      actions={[
                        {
                          iconProps: { iconName: 'Edit' },
                          title: 'Edit',
                          onClick: () => {
                            const raw = p.raw || {};
                            let parsed: any = null;
                            try {
                              parsed = typeof raw.value === 'string' ? JSON.parse(raw.value || '{}') : raw.value || {};
                            } catch {
                              parsed = raw.value || {};
                            }
                            setPageEditingItem(raw);
                            const key = raw.key || raw.name || '';
                            setPageSlug(String(key).replace(/^page:/, ''));
                            setPageTitle(parsed.title || parsed.name || p.title || '');
                            setPageSummary(parsed.summary || p.description || '');
                            const contentVal = parsed.content || parsed.body || (typeof parsed === 'object' ? parsed : parsed || {});
                            setPageContent(typeof contentVal === 'object' ? JSON.stringify(contentVal, null, 2) : String(contentVal || ''));
                            const comps = (parsed && parsed.components) || (contentVal && (contentVal as any).components) || [];
                            setPageComponents(Array.isArray(comps) ? comps : []);
                            setPageDialogOpen(true);
                          },
                        },
                        { iconProps: { iconName: 'Delete' }, title: 'Delete', onClick: () => setConfirmDelete(p.raw) },
                      ]}
                    />
                  </DocumentCard>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12 }}>
              <Text styles={{ root: { color: theme.palette.neutralSecondary } }}>In edit mode you can drag components from the component library onto the canvas and rearrange them. Dynamic content is not editable.</Text>
            </div>
          </Stack>
        </PivotItem>

        <PivotItem headerText="Navigation">
          <Stack tokens={{ childrenGap: 12 }}>
            <Text>Drag pages into the navigation tree to create parent/child structure.</Text>
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              <div style={{ minWidth: 300 }}>
                <h4>Available pages</h4>
                {pages.map((p) => (
                  <div key={`nav-${p.id}`} style={{ padding: 8, border: '1px solid #eee', marginBottom: 8, borderRadius: 4, background: '#fff' }}>{p.title}</div>
                ))}
              </div>
              <div style={{ minWidth: 360 }}>
                <h4>Navigation tree</h4>
                <div style={{ padding: 8, border: '1px dashed #ccc', minHeight: 120 }}>[Tree view placeholder]</div>
              </div>
            </div>
          </Stack>
        </PivotItem>

        <PivotItem headerText="Styles and theme">
          <Stack tokens={{ childrenGap: 12 }}>
            <Text>Choose a primary theme color. The primary color will influence the generated theme tokens.</Text>
            <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
              <button onClick={() => showMessage('Primary color set to Blue (placeholder)', MessageBarType.info)} style={{ width: 32, height: 32, background: '#0063B1', border: 'none', borderRadius: 4 }} />
              <button onClick={() => showMessage('Primary color set to Teal (placeholder)', MessageBarType.info)} style={{ width: 32, height: 32, background: '#008272', border: 'none', borderRadius: 4 }} />
              <button onClick={() => showMessage('Primary color set to Purple (placeholder)', MessageBarType.info)} style={{ width: 32, height: 32, background: '#5C2D91', border: 'none', borderRadius: 4 }} />
              <div style={{ marginLeft: 12 }}>
                <Text>Preview</Text>
                <div style={{ marginTop: 8, padding: 12, borderRadius: 6, background: '#f3f2f1' }}>
                  <PrimaryButton text="Primary action" />
                </div>
              </div>
            </div>
            <div>
              <Text styles={{ root: { color: theme.palette.neutralSecondary } }}>For detailed theme editing use the Theme Designer to tune fonts, spacing and semantic colors.</Text>
            </div>
          </Stack>
        </PivotItem>

        <PivotItem headerText="Forms">
          <Stack tokens={{ childrenGap: 12 }}>
            <Text>Use the Form Builder to create contribution forms that map to Dataverse tables.</Text>
            <div style={{ marginTop: 12 }}>
              <FormBuilder />
            </div>
          </Stack>
        </PivotItem>

        <PivotItem headerText="Settings">
          <Stack tokens={{ childrenGap: 12 }}>
            <h3>App configuration</h3>
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

            <div>
              <h4>Existing configuration</h4>
              <DetailsList items={items} columns={columns} selectionMode={0} isHeaderVisible={true} />
            </div>

            <div>
              <h4>Mappings</h4>
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

              <div style={{ marginTop: 12 }}>
                  <h4>Detected admin-configurable settings</h4>
                  <div style={{ marginBottom: 8 }}>
                    <PrimaryButton
                      onClick={async () => {
                        setScanningAdminKeys(true);
                        try {
                          const r = await collectAdminSettings();
                          setAdminFindings(r);
                          showMessage(`Found ${r.length} potential keys`, MessageBarType.info, 3000);
                        } catch (e) {
                          console.error('Scan failed', e);
                          showMessage('Failed to scan source files', MessageBarType.error);
                        } finally {
                          setScanningAdminKeys(false);
                        }
                      }}
                    >
                      Scan code for admin keys
                    </PrimaryButton>
                    {scanningAdminKeys && <Spinner label="Scanning..." styles={{ root: { marginLeft: 8 } }} />}
                  </div>
                  {adminFindings && adminFindings.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <DetailsList items={adminFindings} columns={settingColumns} selectionMode={0} />
                    </div>
                  )}

                <h4>$metadata inspector</h4>
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
                <div style={{ marginTop: 20 }}>
                  <h4>Carousel Configuration (per-page)</h4>
                  <div style={{ marginBottom: 8 }}>
                    <Dropdown
                      placeholder="Select a page to configure carousel"
                      options={pages.map((p) => ({ key: p.id, text: p.title }))}
                      selectedKey={selectedCarouselPage}
                        onChange={async (_, option) => {
                          const key = option?.key as string;
                          setSelectedCarouselPage(key);
                          setLoadingCarouselConfig(true);
                          try {
                            const cfg = await getCarouselConfig(key);
                            setCarouselConfig(cfg ? cfg.config || null : null);
                            setCarouselRecordId(cfg && cfg.id ? String(cfg.id) : null);
                          } catch (e) {
                            console.error('Failed to load carousel config', e);
                            setCarouselConfig(null);
                            setCarouselRecordId(null);
                          } finally {
                            setLoadingCarouselConfig(false);
                          }
                        }}
                      styles={{ root: { minWidth: 360 } }}
                    />
                  </div>

                  {loadingCarouselConfig && <Spinner label="Loading carousel config..." />}

                  <div style={{ marginTop: 12 }}>
                    <Stack tokens={{ childrenGap: 8 }}>
                      <Dropdown
                        label="Layout"
                        selectedKey={(carouselConfig && carouselConfig.layout) || 'card'}
                        options={[{ key: 'card', text: 'Card' }, { key: 'gallery', text: 'Gallery' }, { key: 'banner', text: 'Banner' }]}
                        onChange={(_, o) => setCarouselConfig((c: any) => ({ ...(c || {}), layout: String(o?.key) }))}
                        styles={{ root: { width: 240 } }}
                      />
                      <TextField
                        label="Item limit"
                        type="number"
                        value={carouselConfig && carouselConfig.itemLimit !== undefined ? String(carouselConfig.itemLimit) : ''}
                        onChange={(_, v) => setCarouselConfig((c: any) => ({ ...(c || {}), itemLimit: v ? parseInt(v) : undefined }))}
                      />
                      <TextField
                        label="Interval (ms)"
                        type="number"
                        value={carouselConfig && carouselConfig.intervalMs !== undefined ? String(carouselConfig.intervalMs) : ''}
                        onChange={(_, v) => setCarouselConfig((c: any) => ({ ...(c || {}), intervalMs: v ? parseInt(v) : undefined }))}
                      />
                      <Stack horizontal tokens={{ childrenGap: 8 }}>
                        <DefaultButton
                          text={carouselConfig && carouselConfig.autoplay ? 'Autoplay: On' : 'Autoplay: Off'}
                          onClick={() => setCarouselConfig((c: any) => ({ ...(c || {}), autoplay: !c?.autoplay }))}
                        />
                        <DefaultButton
                          text={carouselConfig && carouselConfig.pauseOnHover ? 'Pause On Hover: Yes' : 'Pause On Hover: No'}
                          onClick={() => setCarouselConfig((c: any) => ({ ...(c || {}), pauseOnHover: !c?.pauseOnHover }))}
                        />
                        <DefaultButton
                          text={carouselConfig && carouselConfig.pauseOnFocus ? 'Pause On Focus: Yes' : 'Pause On Focus: No'}
                          onClick={() => setCarouselConfig((c: any) => ({ ...(c || {}), pauseOnFocus: !c?.pauseOnFocus }))}
                        />
                        <DefaultButton
                          text={carouselConfig && carouselConfig.showIndicators ? 'Indicators: On' : 'Indicators: Off'}
                          onClick={() => setCarouselConfig((c: any) => ({ ...(c || {}), showIndicators: !c?.showIndicators }))}
                        />
                        <DefaultButton
                          text={carouselConfig && carouselConfig.showNav ? 'Nav: On' : 'Nav: Off'}
                          onClick={() => setCarouselConfig((c: any) => ({ ...(c || {}), showNav: !c?.showNav }))}
                        />
                      </Stack>
                      <Stack horizontal tokens={{ childrenGap: 8 }}>
                        <PrimaryButton
                          onClick={async () => {
                            if (!selectedCarouselPage) {
                              showMessage('Select a page first', MessageBarType.warning);
                              return;
                            }
                            setSavingCarousel(true);
                            try {
                              await saveCarouselConfig(selectedCarouselPage, carouselConfig || {});
                              // re-fetch to ensure we capture the record id
                              const fresh = await getCarouselConfig(selectedCarouselPage);
                              setCarouselRecordId(fresh && fresh.id ? String(fresh.id) : null);
                              showMessage('Carousel configuration saved', MessageBarType.success);
                              await loadItems();
                            } catch (e) {
                              console.error('Save failed', e);
                              showMessage('Failed to save carousel configuration', MessageBarType.error);
                            } finally {
                              setSavingCarousel(false);
                            }
                          }}
                        >
                          Save carousel config
                        </PrimaryButton>
                        <DefaultButton
                          onClick={async () => {
                            if (!selectedCarouselPage) {
                              showMessage('Select a page first', MessageBarType.warning);
                              return;
                            }
                            setSavingCarousel(true);
                            try {
                              // force create a new record even if one exists
                              await createCarouselConfig(selectedCarouselPage, carouselConfig || {});
                              const fresh = await getCarouselConfig(selectedCarouselPage);
                              setCarouselRecordId(fresh && fresh.id ? String(fresh.id) : null);
                              showMessage('New carousel configuration record created', MessageBarType.success);
                              await loadItems();
                            } catch (e) {
                              console.error('Create new record failed', e);
                              showMessage('Failed to create carousel config record', MessageBarType.error);
                            } finally {
                              setSavingCarousel(false);
                            }
                          }}
                        >
                          Save as new record
                        </DefaultButton>
                        <DefaultButton onClick={() => setCarouselConfig(null)}>Clear</DefaultButton>
                      </Stack>
                    </Stack>
                  </div>
                  <div style={{ marginTop: 18 }}>
                    <h4>Preview</h4>
                    <div style={{ border: '1px solid #e1e1e1', padding: 12, borderRadius: 6, maxWidth: 960 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ fontSize: 12, color: theme.palette.neutralSecondary }}>{carouselRecordId ? `Record: ${carouselRecordId}` : ''}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {savingCarousel && <Spinner label="Saving..." />}
                          </div>
                        </div>
                        <ConfigurableCarousel
                        config={carouselConfig || {
                          layout: 'card',
                          itemLimit: 5,
                          intervalMs: 4000,
                          autoplay: false,
                          pauseOnHover: true,
                          pauseOnFocus: true,
                          showIndicators: true,
                        }}
                        items={Array.from({ length: (carouselConfig && carouselConfig.itemLimit) || 5 }).map((_, i) => ({
                          id: `sample-${i}`,
                          title: `Sample Item ${i + 1}`,
                          description: 'Placeholder content for preview',
                          image: `https://picsum.photos/seed/preview${i}/800/300`,
                        }))}
                        renderItem={(item: any) => (
                          <div style={{ padding: 8 }}>
                            <img src={item.image} alt={item.title} style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 4 }} />
                            <div style={{ marginTop: 8 }}>
                              <strong>{item.title}</strong>
                              <div style={{ fontSize: 12, color: '#666' }}>{item.description}</div>
                            </div>
                          </div>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Stack>
        </PivotItem>
      </Pivot>

      <Dialog
        hidden={!pageDialogOpen}
        onDismiss={() => setPageDialogOpen(false)}
        dialogContentProps={{ type: DialogType.normal, title: pageEditingItem ? 'Edit Page' : 'Create Page' }}
        modalProps={{
          styles: {
            main: {
              maxWidth: '95vw',
              width: '95vw',
              margin: '0 auto',
              selectors: {
                '.ms-Dialog-inner': { width: '100%', maxWidth: '95vw' },
                '.ms-Dialog-content': { width: '100%', maxWidth: '95vw' },
              },
            },
          },
        }}
      >
        <div style={{ width: '95vw', maxWidth: '95vw', maxHeight: '85vh', overflow: 'auto', padding: 12 }}>
          <Stack tokens={{ childrenGap: 8 }}>
            <Stack horizontal tokens={{ childrenGap: 8 }} styles={{ root: { alignItems: 'flex-start' } }}>
              <TextField label="Slug (used as page id)" value={pageSlug} onChange={(_, v) => setPageSlug(v || '')} styles={{ root: { minWidth: 260, maxWidth: 320 } }} />
              <TextField label="Title" value={pageTitle} onChange={(_, v) => setPageTitle(v || '')} styles={{ root: { flex: 1 } }} />
              <TextField label="Summary" value={pageSummary} onChange={(_, v) => setPageSummary(v || '')} styles={{ root: { minWidth: 320, maxWidth: 420 } }} />
            </Stack>

            <Stack horizontal tokens={{ childrenGap: 12 }} styles={{ root: { marginTop: 8 } }}>
              <div style={{ width: 260, padding: 8, background: '#fff', borderRadius: 6, border: '1px solid #eee' }}>
                <Text variant="mediumPlus" styles={{ root: { marginBottom: 8 } }}>Components</Text>
                <ComponentLibrary />
              </div>

              <div style={{ flex: 1 }}>
                <PageCanvas
                  components={pageComponents}
                  onAdd={(c: PageComponent) => handleAddComponent(c)}
                  onRemove={(i: number) => handleRemoveComponent(i)}
                  onMoveUp={(i: number) => handleMoveUp(i)}
                  onMoveDown={(i: number) => handleMoveDown(i)}
                />
              </div>

              <div style={{ width: 360 }}>
                <TextField label="Content (JSON or free text)" multiline rows={16} value={pageContent} onChange={(_, v) => setPageContent(v || '')} />
              </div>
            </Stack>
          </Stack>
        </div>
        <DialogFooter>
          <PrimaryButton onClick={handleSavePage} text={pageEditingItem ? 'Save' : 'Create'} />
          <DefaultButton onClick={() => setPageDialogOpen(false)} text="Cancel" />
        </DialogFooter>
      </Dialog>

      <Dialog hidden={!confirmDelete} onDismiss={() => setConfirmDelete(null)} dialogContentProps={{ type: DialogType.normal, title: 'Confirm delete', subText: 'Delete this configuration item?' }}>
        <DialogFooter>
          <PrimaryButton onClick={handleDelete} text="Delete" />
          <DefaultButton onClick={() => setConfirmDelete(null)} text="Cancel" />
        </DialogFooter>
      </Dialog>
    </div>
  );
};

export default AdminConfig;
