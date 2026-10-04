import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev proxy: browser-facing code stays same-origin; /api and health probes
// are forwarded to the FastAPI backend. Set VITE_API_URL to override.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: true, // sandbox preview proxies under e2b.app
    proxy: {
      '/api': { target: process.env.BACKEND_URL || 'http://localhost:8000', changeOrigin: true },
      '/health': { target: process.env.BACKEND_URL || 'http://localhost:8000', changeOrigin: true },
      '/ready': { target: process.env.BACKEND_URL || 'http://localhost:8000', changeOrigin: true },
    },
  },
})
