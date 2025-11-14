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
  },
})
