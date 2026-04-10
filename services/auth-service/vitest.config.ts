import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/integration/fullFlow.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: [
        'src/services/**/*.ts',
        'src/routes/**/*.ts',
        'src/events/**/*.ts',
        'src/jobs/**/*.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 68,
      },
      reporter: ['text', 'json-summary'],
    },
  },
})
