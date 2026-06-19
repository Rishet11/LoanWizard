import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@loan-wizard/contracts': new URL('../../packages/contracts/src/index.ts', import.meta.url).pathname,
    },
  },
});
