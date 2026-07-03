import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
  server: {
    port: Number(globalThis.process?.env?.PORT) || 5173,
    host: true,
    headers: {
      "Service-Worker-Allowed": "/",
    },
  },
})
