import { defineConfig } from 'vitest/config';

/**
 * E2E test config — runs against a live backend (docker-compose.ci.yml).
 * Set E2E_BASE_URL to override the default http://localhost:5050/api.
 */
export default defineConfig({
  test: {
    include: ['tests/e2e/**/*.e2e.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: 'forks',                    // isolate test files
    fileParallelism: false,           // run files sequentially for predictable DB state
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/seed/**', 'src/config/db.ts'],
    },
  },
});
