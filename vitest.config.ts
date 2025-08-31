import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/**/*.spec.ts', 'tests/e2e/**/*', 'scripts/**/*.test.ts'],
    coverage: { reporter: ['text', 'lcov'] },
  },
});