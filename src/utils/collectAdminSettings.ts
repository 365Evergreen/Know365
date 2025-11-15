/*
  collectAdminSettings: runtime helper using Vite's import.meta.glob
  Loads source files as raw text and searches for tokens that look like
  admin-configurable settings (carousel, contribute mapping, auth keys, etc.)

  This runs in the browser (built by Vite). It returns simple findings
  that AdminConfig can display for reviewers.
*/
export type AdminSettingFinding = {
  token: string;
  file: string;
  line: number;
  snippet: string;
};

export async function collectAdminSettings(): Promise<AdminSettingFinding[]> {
  // Use Vite glob to load project sources as raw text. Starts at /src
  // @ts-ignore - vite-specific API
  const modules = import.meta.glob('/src/**/*.{ts,tsx,js,jsx}', { as: 'raw' }) as Record<string, () => Promise<string>>;

  const tokenRegex = /(carouselConfig|carouselConfig\.|\binputType\b|Contribute\.Mapping|Auth\.LoginRedirect|autoplay|pauseOnHover|pauseOnFocus|showIndicators|showNav|itemLimit|intervalMs|e365_[A-Za-z0-9_]+)/g;

  const results: AdminSettingFinding[] = [];

  const entries = Object.entries(modules);
  for (const [path, loader] of entries) {
    try {
      const content = await loader();
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let m: RegExpExecArray | null;
        tokenRegex.lastIndex = 0;
        while ((m = tokenRegex.exec(line)) !== null) {
          const token = m[1] || m[0];
          results.push({ token, file: path.replace(/^\/src\//, ''), line: i + 1, snippet: line.trim() });
        }
      }
    } catch (e) {
      // ignore file load errors
      // console.warn('collectAdminSettings loader failed', path, e);
    }
  }

  // Deduplicate by token+file+line
  const seen = new Set<string>();
  const deduped: AdminSettingFinding[] = [];
  for (const r of results) {
    const key = `${r.token}::${r.file}::${r.line}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(r);
    }
  }

  return deduped;
}

export default collectAdminSettings;
