import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'GraphCore',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'js'}`
    },
    rollupOptions: {
      external: [
        '@spin-network/quantum',
        'mathjs',
        'dexie',
        'redux-persist',
        'localforage',
        'react',
        'react-dom',
        'papaparse',
        'primereact',
        'react-icons',
        'react-json-tree',
        'react-markdown',
        'graphology'
      ]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@spin-network/quantum': resolve(__dirname, '../quantum/src')
    }
  }
});
