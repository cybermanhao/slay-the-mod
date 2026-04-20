import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: '_app',
  },
  server: {
    proxy: {
      '/api': 'http://localhost:7842',
      '/assets': 'http://localhost:7842',
    },
  },
})
