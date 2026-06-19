import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  publicDir: '../models',
  resolve: {
    alias: {
      '@loan-wizard/contracts': new URL('../../../packages/contracts/src/index.ts', import.meta.url).pathname,
    },
  },
});
