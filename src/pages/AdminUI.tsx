import React, { useEffect, useState } from 'react';
import { Pivot, PivotItem, Stack, PrimaryButton, DefaultButton, Text, DocumentCard, DocumentCardTitle, Dialog, DialogType, DialogFooter, Panel } from '@fluentui/react';
import ComponentLibrary from '../components/ComponentLibrary';
import PageCanvas, { PageComponent } from '../components/PageCanvas';
import { getAppConfigItems, createAppConfigItem, updateAppConfigItem, deleteAppConfigItem } from '../services/dataverseClient';

type PageMeta = { id: string; title: string; slug: string; status?: 'draft' | 'published'; components?: PageComponent[] };

const AdminUI: React.FC = () => {
  const [pages, setPages] = useState<PageMeta[]>([]);
  const [editing, setEditing] = useState<PageMeta | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PageMeta | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      const items = await getAppConfigItems();
      // pages are stored as appconfig entries named `page:<slug>`
      const pageItems = (items || []).filter((i: any) => (i.key || '').toString().toLowerCase().startsWith('page:'));
      const normalized = pageItems.map((p: any) => {
        let parsed: any = {};
        try { parsed = JSON.parse(p.value || '{}'); } catch { parsed = {}; }
        return { id: p.id, title: (parsed.title || p.key), slug: (p.key || '').replace(/^page:/i, ''), status: parsed.status || 'draft', components: parsed.components || [] } as PageMeta;
      });
      setPages(normalized);
    } catch (e) {
      console.error('Failed to load pages', e);
    }
  };

  const beginCreate = () => {
    setEditing({ id: '', title: 'New page', slug: `page-${Date.now()}`, status: 'draft', components: [] });
    setPanelOpen(true);
  };

  const beginEdit = (p: PageMeta) => {
    setEditing({ ...p });
    setPanelOpen(true);
  };

  const savePage = async (publish = false) => {
    if (!editing) return;
    const name = `page:${editing.slug}`;
    const payload = { name, value: JSON.stringify({ title: editing.title, status: publish ? 'published' : editing.status || 'draft', components: editing.components || [] }) } as any;
    try {
      if (editing.id) {
        await updateAppConfigItem(editing.id, payload);
      } else {
        await createAppConfigItem(payload);
      }
      setPanelOpen(false);
      setEditing(null);
      await loadPages();
    } catch (e) {
      console.error('Failed to save page', e);
    }
  };

  const removePage = async (p: PageMeta) => {
    if (!p.id) return;
    try {
      await deleteAppConfigItem(p.id);
      setConfirmDelete(null);
      await loadPages();
    } catch (e) {
      console.error('Failed to delete page', e);
    }
  };

  const addComponentToEditing = (c: PageComponent) => {
    if (!editing) return;
    setEditing({ ...editing, components: [...(editing.components || []), c] });
  };

  const removeComponent = (index: number) => {
    if (!editing) return;
    const comps = (editing.components || []).slice();
    comps.splice(index, 1);
    setEditing({ ...editing, components: comps });
  };

  const moveUp = (index: number) => {
    if (!editing) return;
    const comps = (editing.components || []).slice();
    if (index <= 0) return;
    const [item] = comps.splice(index, 1);
    comps.splice(index - 1, 0, item);
    setEditing({ ...editing, components: comps });
  };

  const moveDown = (index: number) => {
    if (!editing) return;
    const comps = (editing.components || []).slice();
    if (index >= comps.length - 1) return;
    const [item] = comps.splice(index, 1);
    comps.splice(index + 1, 0, item);
    setEditing({ ...editing, components: comps });
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Site Administration</h2>
      <Pivot aria-label="Admin tabs">
        <PivotItem headerText="Pages">
          <Stack tokens={{ childrenGap: 12 }}>
            <PrimaryButton text="Create new page" onClick={beginCreate} />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
              {pages.map((p) => (
                <div key={p.slug} style={{ width: 300 }}>
                  <DocumentCard>
                    <div style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <DocumentCardTitle title={p.title} />
                        <div style={{ marginTop: 8 }}>
                          <Text variant="small">Status: {p.status}</Text>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <PrimaryButton text="Edit" onClick={() => beginEdit(p)} />
                        <DefaultButton text="Delete" onClick={() => setConfirmDelete(p)} />
                      </div>
                    </div>
                  </DocumentCard>
                </div>
              ))}
            </div>
          </Stack>
        </PivotItem>

        <PivotItem headerText="Navigation">
          <div style={{ padding: 12 }}>
            <Text>Navigation editor (TODO): edit main menu, reorder links, change targets and icons.</Text>
          </div>
        </PivotItem>

        <PivotItem headerText="Styles and theme">
          <div style={{ padding: 12 }}>
            <Text>Styles editor (TODO): edit colors, fonts and theme tokens. The UI settings editor is available in Admin Config.</Text>
          </div>
        </PivotItem>

        <PivotItem headerText="Settings">
          <div style={{ padding: 12 }}>
            <Text>Global settings (TODO): feature flags, integrations, app-level toggles.</Text>
          </div>
        </PivotItem>
      </Pivot>

      {/* Edit/create panel */}
      <Panel isOpen={panelOpen} onDismiss={() => { setPanelOpen(false); setEditing(null); }} headerText={editing ? `Edit: ${editing.title}` : 'New page'} closeButtonAriaLabel="Close">
        {editing && (
          <div>
            <Stack tokens={{ childrenGap: 12 }}>
              <Text variant="large">{editing.title}</Text>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <Text variant="medium">Component library</Text>
                  <ComponentLibrary />
                </div>
                <div style={{ flex: 2 }}>
                  <Text variant="medium">Page canvas</Text>
                  <PageCanvas components={editing.components || []} onAdd={addComponentToEditing} onRemove={removeComponent} onMoveUp={moveUp} onMoveDown={moveDown} />
                </div>
              </div>
              <Stack horizontal tokens={{ childrenGap: 8 }}>
                <PrimaryButton text="Save draft" onClick={() => savePage(false)} />
                <PrimaryButton text="Publish" onClick={() => savePage(true)} />
                <DefaultButton text="Cancel" onClick={() => { setPanelOpen(false); setEditing(null); }} />
              </Stack>
            </Stack>
          </div>
        )}
      </Panel>

      <Dialog hidden={!confirmDelete} onDismiss={() => setConfirmDelete(null)} dialogContentProps={{ type: DialogType.normal, title: 'Confirm delete', subText: 'Delete this page?' }}>
        <DialogFooter>
          <PrimaryButton text="Delete" onClick={() => confirmDelete && removePage(confirmDelete)} />
          <DefaultButton text="Cancel" onClick={() => setConfirmDelete(null)} />
        </DialogFooter>
      </Dialog>
    </div>
  );
};

export default AdminUI;
