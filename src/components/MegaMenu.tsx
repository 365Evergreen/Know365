import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stack, Text, getTheme, Callout, DefaultButton, Icon } from '@fluentui/react';

export interface MegaMenuItem {
  title: string;
  icon?: string;
  url?: string;
  description?: string;
  children?: MegaMenuItem[];
  visibleTo?: string[];
}

const theme = getTheme();

// added: readable slug helper + resolver for internal/external URLs
const slugify = (s?: string) =>
  (s || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const resolveTarget = (url: string | undefined, parent?: string, title?: string): string | null => {
  // external full URLs -> return null to indicate open externally
  if (url && /^https?:\/\//.test(url)) return null;
  // if url provided and starts with '/', treat as internal path
  if (url && url.startsWith('/')) return url;
  // build readable path using browse pattern
  const p = parent ? slugify(parent) : undefined;
  const t = title ? slugify(title) : undefined;
  if (p && t) return `/browse/${p}/${t}`;
  if (p) return `/browse/${p}`;
  if (t) return `/browse/${t}`;
  return '/';
};

// (colStyle and IconFor removed — not needed in interactive layout)

const MegaMenu: React.FC<{ items: MegaMenuItem[]; isMobile?: boolean }> = ({ items, isMobile = false }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const navigate = useNavigate();
  const hoverTimeout = useRef<number | null>(null);
  // store actual DOM elements (span wrappers) so Callout.target gets an element
  const buttonRefs = useRef<Array<Element | null>>([]);

  useEffect(() => {
    return () => {
      if (hoverTimeout.current) window.clearTimeout(hoverTimeout.current);
    };
  }, []);

  if (isMobile) {
    // Render as an accordion for small screens
    return (
      <div>
        {items.map((it, idx) => (
          <div key={it.title} style={{ marginBottom: 8 }}>
            <DefaultButton
              onClick={() => setExpanded((s) => ({ ...s, [idx]: !s[idx] }))}
              aria-expanded={!!expanded[idx]}
              styles={{ root: { width: '100%', textAlign: 'left', padding: '10px', border: 'none', boxShadow: 'none', background: 'transparent' } }}
            >
              <span style={{ marginRight: 8 }}>{it.icon ? <Icon iconName={it.icon} /> : null}</span>
              {it.title}
            </DefaultButton>
            {expanded[idx] && (
              <div style={{ padding: '8px 12px' }}>
                {it.description && <Text styles={{ root: { color: theme.palette.neutralSecondary } }}>{it.description}</Text>}
                <Stack tokens={{ childrenGap: 6 }} styles={{ root: { marginTop: 8 } }}>
                  {/* Don't repeat the parent title here to avoid duplicate entries */}
                  {(() => {
                    const parentKey = (it.title || '').trim().toLowerCase();
                    const map: Record<string, any> = {};
                    (it.children || []).forEach((ch: any) => {
                      const key = (ch.title || '').trim().toLowerCase();
                      if (!key) return;
                      if (key === parentKey) return; // skip duplicates matching parent
                      if (!map[key]) map[key] = ch;
                    });
                    const children = Object.values(map);
                    return children.map((c: any) => (
                      <div
                        key={c.title}
                        role="button"
                        onClick={() => {
                          const target = resolveTarget(c.url, it.title, c.title);
                          if (target === null) {
                            // external link -> navigate full window
                            if (c.url) window.location.href = c.url;
                            return;
                          }
                          navigate(target);
                          setExpanded((s) => ({ ...s, [idx]: false }));
                        }}
                        style={{ textDecoration: 'none', cursor: 'pointer' }}
                      >
                        <Text>{c.title}</Text>
                      </div>
                    ));
                  })()}
                </Stack>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Desktop: render top-level triggers with Callouts
  return (
    <nav aria-label="Mega menu">
      <Stack horizontal tokens={{ childrenGap: 12 }} styles={{ root: { alignItems: 'center' } }}>
        {items.map((col, i) => (
          <div key={col.title} style={{ position: 'relative' }} onMouseLeave={() => {
            // delay close to allow hover into callout
            hoverTimeout.current = window.setTimeout(() => setOpenIndex(null), 150);
          }}>
            <span ref={(el) => (buttonRefs.current[i] = el)}>
              <DefaultButton
                onMouseEnter={() => {
                  if (hoverTimeout.current) window.clearTimeout(hoverTimeout.current);
                  setOpenIndex(i);
                }}
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                styles={{ root: { padding: '8px 12px', minWidth: 120, border: 'none', boxShadow: 'none', background: 'transparent' } }}
              >
                <span style={{ marginRight: 8 }}>{col.icon ? <Icon iconName={col.icon} /> : null}</span>
                {col.title}
              </DefaultButton>
            </span>

            {openIndex === i && (
              <Callout
                target={buttonRefs.current[i] ?? null}
                setInitialFocus={false}
                onDismiss={() => setOpenIndex(null)}
                gapSpace={8}
                styles={{ root: { padding: 12, borderRadius: 6, boxShadow: '0 6px 18px rgba(0,0,0,0.12)' } }}
              >
                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', minWidth: 420 }}>
                  <div style={{ minWidth: 240 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {col.icon ? <Icon iconName={col.icon} /> : null}
                      <Text variant="large" styles={{ root: { fontWeight: 600 } }}>{col.title}</Text>
                    </div>
                    {col.description && <Text styles={{ root: { marginTop: 6, color: theme.palette.neutralSecondary } }}>{col.description}</Text>}
                    {/* intentionally not repeating a link to the parent title here to avoid duplicates */}
                    <div style={{ marginTop: 8 }}>
                      <DefaultButton
                        onClick={() => {
                          const target = resolveTarget(col.url, col.title, undefined);
                          if (target === null) { if (col.url) window.location.href = col.url; return; }
                          if (target) navigate(target);
                          setOpenIndex(null);
                        }}
                        styles={{ root: { padding: '6px 10px', boxShadow: 'none' } }}
                      >
                        View {col.title}
                      </DefaultButton>
                    </div>
                  </div>

                  {(col.children || []).length > 0 && (
                    (() => {
                      const allChildren = col.children || [];
                      const parentKey = (col.title || '').trim().toLowerCase();
                      const map: Record<string, any> = {};
                      allChildren.forEach((it: any) => {
                        const key = (it.title || '').trim().toLowerCase();
                        if (!key) return;
                        if (key === parentKey) return; // skip child that matches parent title
                        if (!map[key]) map[key] = it; // dedupe by title
                      });
                      const children = Object.values(map);
                      if (children.length === 0) return null;
                      const cols = Math.min(2, Math.ceil(children.length / 4) || 1);
                      const perCol = Math.ceil(children.length / cols);
                      const groups: any[] = [];
                      for (let g = 0; g < cols; g++) groups.push(children.slice(g * perCol, (g + 1) * perCol));
                      return (
                        <div style={{ display: 'flex', gap: 24 }}>
                          {groups.map((grp: any, gi: number) => (
                            <div key={gi} style={{ minWidth: 160 }}>
                              {grp.map((c: any) => (
                                <div key={c.title} style={{ marginBottom: 8 }}>
                                  <div
                                    role="button"
                                    onClick={() => {
                                      const target = resolveTarget(c.url, col.title, c.title);
                                      if (target === null) {
                                        if (c.url) window.location.href = c.url;
                                        return;
                                      }
                                      if (target) navigate(target);
                                      setOpenIndex(null);
                                    }}
                                    style={{ textDecoration: 'none', cursor: 'pointer' }}
                                  >
                                    <Text styles={{ root: { display: 'block' } }}>{c.title}</Text>
                                    {c.description && <Text styles={{ root: { color: theme.palette.neutralSecondary, fontSize: 12 } }}>{c.description}</Text>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  )}
                </div>
              </Callout>
            )}
          </div>
        ))}
      </Stack>
    </nav>
  );
};

export default MegaMenu;
