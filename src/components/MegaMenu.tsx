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
  const buttonRefs = useRef<Array<HTMLElement | null>>([]);

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
                    const parentKey = slugify(it.title || '');
                    const map: Record<string, any> = {};
                    (it.children || []).forEach((ch: any) => {
                      const key = `${slugify(ch.title || '')}|${slugify(ch.url || '')}`;
                      if (!key) return;
                      if (slugify(ch.title || '') === parentKey) return; // skip duplicates matching parent
                      if (!map[key]) map[key] = ch;
                    });
                    const children = Object.values(map);
                    return children.map((c: any) => {
                      const target = resolveTarget(c.url, it.title, c.title);
                      const isExternal = target === null;
                      const href = isExternal ? c.url || '#' : (target || '#');
                      return (
                        <a
                          key={`${slugify(c.title || '')}|${slugify(c.url || '')}`}
                          href={href}
                          target={isExternal ? '_blank' : undefined}
                          rel={isExternal ? 'noopener noreferrer' : undefined}
                          onClick={(e) => {
                            if (!isExternal) {
                              e.preventDefault();
                              navigate(target as string);
                              setExpanded((s) => ({ ...s, [idx]: false }));
                            }
                          }}
                          style={{ display: 'block', textDecoration: 'none', cursor: 'pointer', color: 'inherit', padding: '4px 0' }}
                        >
                          <Text>{c.title}</Text>
                        </a>
                      );
                    });
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
          <div key={slugify(col.title)} style={{ position: 'relative' }} onMouseLeave={() => {
            // delay close to allow hover into callout
            hoverTimeout.current = window.setTimeout(() => setOpenIndex(null), 150);
          }}>
            <span ref={(el) => (buttonRefs.current[i] = el as HTMLElement)}>
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
                    {/* Do not repeat the parent heading/button inside the dropdown to avoid duplication with the top-level trigger. */}
                    {col.description && <Text styles={{ root: { marginTop: 6, color: theme.palette.neutralSecondary } }}>{col.description}</Text>}
                  </div>

                  {(col.children || []).length > 0 && (
                    (() => {
                      const allChildren = col.children || [];
                      const parentKey = slugify(col.title || '');
                      const map: Record<string, any> = {};
                      allChildren.forEach((it: any) => {
                        const key = `${slugify(it.title || '')}|${slugify(it.url || '')}`;
                        if (!key) return;
                        if (slugify(it.title || '') === parentKey) return; // skip child that matches parent title
                        if (!map[key]) map[key] = it; // dedupe by title+url
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
                              {grp.map((c: any) => {
                                const target = resolveTarget(c.url, col.title, c.title);
                                const isExternal = target === null;
                                const href = isExternal ? c.url || '#' : (target || '#');
                                return (
                                  <div key={`${slugify(c.title || '')}|${slugify(c.url || '')}`} style={{ marginBottom: 8 }}>
                                    <a
                                      href={href}
                                      target={isExternal ? '_blank' : undefined}
                                      rel={isExternal ? 'noopener noreferrer' : undefined}
                                      onClick={(e) => {
                                        if (!isExternal) {
                                          e.preventDefault();
                                          navigate(target as string);
                                          setOpenIndex(null);
                                        }
                                      }}
                                      style={{ textDecoration: 'none', cursor: 'pointer', color: 'inherit', display: 'block' }}
                                    >
                                      <Text styles={{ root: { display: 'block' } }}>{c.title}</Text>
                                      {c.description && <Text styles={{ root: { color: theme.palette.neutralSecondary, fontSize: 12 } }}>{c.description}</Text>}
                                    </a>
                                  </div>
                                );
                              })}
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
