import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    dir: 'src',
    globals: true,
    include: ['**/*.test.ts', '**/*.test.tsx'],
  },
});
