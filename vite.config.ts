import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: '/', // Will be updated for GitHub Pages if needed
  server: {
    proxy: {
      // Proxy Foursquare API requests to avoid CORS issues in development
      '/api/foursquare': {
        target: 'https://places-api.foursquare.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/foursquare/, ''),
        headers: {
          'Origin': 'https://places-api.foursquare.com',
        },
      },
    },
  },
})
