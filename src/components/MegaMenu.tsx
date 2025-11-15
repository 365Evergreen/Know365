import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
// (colStyle and IconFor removed — not needed in interactive layout)

const MegaMenu: React.FC<{ items: MegaMenuItem[]; isMobile?: boolean }> = ({ items, isMobile = false }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const hoverTimeout = useRef<number | null>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    return () => {
      if (hoverTimeout.current) window.clearTimeout(hoverTimeout.current);
    };
  }, []);

  if (isMobile) {
    // Render as an accordion for small screens
    const [expanded, setExpanded] = useState<Record<number, boolean>>({});
    return (
      <div>
        {items.map((it, idx) => (
          <div key={it.title} style={{ marginBottom: 8 }}>
            <DefaultButton
              onClick={() => setExpanded((s) => ({ ...s, [idx]: !s[idx] }))}
              aria-expanded={!!expanded[idx]}
              styles={{ root: { width: '100%', textAlign: 'left', padding: '10px' } }}
            >
              <span style={{ marginRight: 8 }}>{it.icon ? <Icon iconName={it.icon} /> : null}</span>
              {it.title}
            </DefaultButton>
            {expanded[idx] && (
              <div style={{ padding: '8px 12px' }}>
                {it.description && <Text styles={{ root: { color: theme.palette.neutralSecondary } }}>{it.description}</Text>}
                <Stack tokens={{ childrenGap: 6 }} styles={{ root: { marginTop: 8 } }}>
                  {it.url && (
                    <Link to={it.url} onClick={() => {}} style={{ textDecoration: 'none' }}>
                      <Text>{it.title}</Text>
                    </Link>
                  )}
                  {(it.children || []).map((c) => (
                    <Link to={c.url || '#'} key={c.title} style={{ textDecoration: 'none' }}>
                      <Text>{c.title}</Text>
                    </Link>
                  ))}
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
            <DefaultButton
              componentRef={(el) => (buttonRefs.current[i] = el ? (el as unknown as HTMLButtonElement) : null)}
              onMouseEnter={() => {
                if (hoverTimeout.current) window.clearTimeout(hoverTimeout.current);
                setOpenIndex(i);
              }}
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              styles={{ root: { padding: '8px 12px', minWidth: 120 } }}
            >
              <span style={{ marginRight: 8 }}>{col.icon ? <Icon iconName={col.icon} /> : null}</span>
              {col.title}
            </DefaultButton>

            {openIndex === i && (
              <Callout
                target={buttonRefs.current[i] || undefined}
                setInitialFocus={false}
                onDismiss={() => setOpenIndex(null)}
                gapSpace={8}
                styles={{ root: { padding: 12 } }}
              >
                <Stack horizontal tokens={{ childrenGap: 12 }} styles={{ root: { alignItems: 'flex-start' } }}>
                  <div style={{ minWidth: 220 }}>
                    <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
                      {col.icon ? <Icon iconName={col.icon} /> : null}
                      <Text variant="large" styles={{ root: { fontWeight: 600 } }}>{col.title}</Text>
                    </Stack>
                    {col.description && <Text styles={{ root: { marginTop: 6, color: theme.palette.neutralSecondary } }}>{col.description}</Text>}
                    <Stack tokens={{ childrenGap: 6 }} styles={{ root: { marginTop: 8 } }}>
                      {col.url && (
                        <Link to={col.url} onClick={() => setOpenIndex(null)} style={{ textDecoration: 'none' }}>
                          <Text>{col.title}</Text>
                        </Link>
                      )}
                    </Stack>
                  </div>

                  {(col.children || []).length > 0 && (
                    <Stack tokens={{ childrenGap: 6 }} styles={{ root: { minWidth: 180 } }}>
                      {(col.children || []).map((c) => (
                        <Link to={c.url || '#'} key={c.title} onClick={() => setOpenIndex(null)} style={{ textDecoration: 'none' }}>
                          <Text>{c.title}</Text>
                        </Link>
                      ))}
                    </Stack>
                  )}
                </Stack>
              </Callout>
            )}
          </div>
        ))}
      </Stack>
    </nav>
  );
};

export default MegaMenu;
