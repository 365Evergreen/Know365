import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
    // Dev-only response header to relax CSP for local dev (allows dev-proxy and Graph connections)
    headers: {
      'Content-Security-Policy': "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://localhost:4000 https://graph.microsoft.com ws://localhost:4000; img-src 'self' data: blob: https:; font-src 'self' data:;"
    }
  },
  build: {
    outDir: 'dist',
    // Improve chunking to avoid oversized bundles in production
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id) return undefined;
          // normalize Windows paths
          const nid = id.replace(/\\+/g, '/');

          // Scoped Fluent UI packages -> separate fluentui-<pkg> chunks (finer splitting)
          if (nid.includes('/node_modules/@fluentui/')) {
            const m = nid.match(/node_modules\/@fluentui\/([^\/]+)/);
            if (m && m[1]) return `fluentui-${m[1]}`;
            return 'fluentui';
          }

          // Split other node_modules packages into per-package vendor chunks
          if (nid.includes('/node_modules/')) {
            const m = nid.match(/node_modules\/([^\/]+)/);
            if (m && m[1]) return `vendor-${m[1]}`;
            return 'vendor';
          }

          // Create a chunk per page to code-split route-level pages under src/pages
          if (nid.includes('/src/pages/')) {
            const m = nid.match(/\/src\/pages\/([^/.]+)\./);
            if (m && m[1]) return `page-${m[1]}`;
          }

          return undefined;
        },
      },
    },
  },
})
