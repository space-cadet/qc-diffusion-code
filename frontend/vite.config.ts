import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          plotly: ['plotly.js', 'react-plotly.js'],
          three: ['three'],
          particles: ['@tsparticles/engine', '@tsparticles/react', 'tsparticles'],
          graph: ['graphology', '@react-sigma/core', 'sigma'],
          math: ['mathjs'],
          utils: ['zustand', 'expr-eval', 'picocolors']
        }
      }
    }
  },
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
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
