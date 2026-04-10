import { defineConfig } from 'vitest/config'

const coverageInclude = [
  'src/services/**/*.ts',
  'src/routes/**/*.ts',
  'src/events/**/*.ts',
  'src/jobs/**/*.ts',
]

const coverageThresholds = {
  lines: 80,
  functions: 80,
  statements: 80,
  branches: 68,
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    projects: [
      {
        name: 'default',
        root: '.',
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
            include: coverageInclude,
            thresholds: coverageThresholds,
            reporter: ['text', 'json-summary'],
          },
        },
      },
      {
        name: 'fullflow-containers',
        root: '.',
        test: {
          globals: true,
          environment: 'node',
          setupFiles: ['./tests/env-setup.ts'],
          include: ['tests/integration/fullFlow.test.ts'],
          testTimeout: 180_000,
          hookTimeout: 180_000,
          fileParallelism: false,
          coverage: { enabled: false },
        },
      },
    ],
  },
})
