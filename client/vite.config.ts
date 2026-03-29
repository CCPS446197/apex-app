import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Automatically update the SW in the background; new version activates on next visit
      registerType: 'autoUpdate',
      // Pre-cache all build artifacts (JS, CSS, HTML, icons)
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            // API calls always go to the network — never serve stale biometric data
            urlPattern: /^\/api\//,
            handler: 'NetworkOnly',
          },
          {
            // Supabase calls always network-only too
            urlPattern: /supabase\.co/,
            handler: 'NetworkOnly',
          },
        ],
      },
      // Reuse the existing manifest.json rather than duplicating it here
      manifest: false,
      manifestFilename: 'manifest.json',
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
