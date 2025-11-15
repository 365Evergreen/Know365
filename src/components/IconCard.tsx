import React, { useEffect, useState } from 'react';
import { Stack, Checkbox } from '@fluentui/react';

interface IconCardProps {
  id: string;
  name?: string;
  e365_icontitle?: string;
  url?: string;
  svgContent?: string; // optional raw SVG string to inline without fetching
  selected?: boolean;
  onToggle: (id: string) => void;
}
const IconCard: React.FC<IconCardProps> = ({ id, e365_icontitle, url, svgContent, selected, onToggle }) => {
  const [svgMarkup, setSvgMarkup] = useState<string | null>(svgContent || null);

  useEffect(() => {
    let cancelled = false;
    // if svgContent provided, prefer it
    if (svgContent) {
      setSvgMarkup(svgContent);
      return;
    }

    if (!url) {
      setSvgMarkup(null);
      return;
    }

    const isSvg = url.split('?')[0].toLowerCase().endsWith('.svg');
    if (!isSvg) {
      setSvgMarkup(null);
      return;
    }

    // fetch svg text and keep only <svg> element to avoid scripts
    (async () => {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) throw new Error('Failed to fetch')
        const text = await res.text();
        // parse and extract svg element
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'image/svg+xml');
        const svg = doc.querySelector('svg');
        if (svg && !cancelled) {
          // remove any script tags or on* attributes for safety
          svg.querySelectorAll('script').forEach(s => s.remove());
          // remove on* attributes
          const walker = document.createTreeWalker(svg, NodeFilter.SHOW_ELEMENT, null as any);
          const toSanitize: Element[] = [];
          while (walker.nextNode()) toSanitize.push(walker.currentNode as Element);
          toSanitize.forEach(el => {
            Array.from(el.attributes)
              .filter(attr => attr.name.startsWith('on'))
              .forEach(attr => el.removeAttribute(attr.name));
          });

          setSvgMarkup(svg.outerHTML);
        } else {
          if (!cancelled) setSvgMarkup(null);
        }
      } catch (e) {
        if (!cancelled) setSvgMarkup(null);
      }
    })();

    return () => { cancelled = true };
  }, [url, svgContent]);

  const title = e365_icontitle || id;

  return (
    <div style={{ width: 160, padding: 8, border: '1px solid var(--neutral-light, #e1e1e1)', borderRadius: 6 }}>
      <Stack tokens={{ childrenGap: 8 }} horizontalAlign="center">
        <div style={{ width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {svgMarkup ? (
            <div
              aria-hidden={false}
              role="img"
              aria-label={title}
              style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
          ) : url ? (
            // fallback to img for non-svg assets or if fetch failed
            <img src={url} alt={title} style={{ maxWidth: '100%', maxHeight: '100%' }} />
          ) : (
            <div style={{ width: 64, height: 64, background: '#f3f3f3', borderRadius: 6 }} />
          )}
        </div>

        <div style={{ textAlign: 'center', minHeight: 36 }}>
          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        </div>

        <Checkbox label="Select" checked={!!selected} onChange={() => onToggle(id)} />
      </Stack>
    </div>
  );
};

export default IconCard;
