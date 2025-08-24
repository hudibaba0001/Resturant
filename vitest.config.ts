import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    globals: true,
    coverage: {
      reporter: ['text', 'lcov'],
      statements: 60,
      branches: 50,
      functions: 60,
      lines: 60,
      exclude: ['**/node_modules/**', '**/.next/**', '**/tests/**'],
    },
  },
});
