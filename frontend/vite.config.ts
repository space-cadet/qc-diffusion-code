import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
  define: {
    global: 'globalThis',
    VITE_USE_NEW_PHYSICS_ENGINE: JSON.stringify(process.env.VITE_USE_NEW_PHYSICS_ENGINE || 'false'),
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      stream: 'stream-browserify',
      util: 'util',
    },
  },
  optimizeDeps: {
    include: ['buffer', 'stream-browserify', 'util'],
  },
})
