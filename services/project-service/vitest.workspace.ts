import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    extends: './vitest.config.ts',
    test: {
      name: 'default',
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/**/*.test.ts'],
      exclude: ['tests/integration/fullFlow.test.ts'],
      fileParallelism: false,
      pool: 'threads',
      poolOptions: {
        threads: { singleThread: true },
      },
    },
  },
  {
    extends: './vitest.config.ts',
    test: {
      name: 'fullflow',
      setupFiles: ['./tests/fullFlow-setup.ts'],
      include: ['tests/integration/fullFlow.test.ts'],
      pool: 'forks',
      poolOptions: {
        forks: { singleFork: true },
      },
      testTimeout: 120_000,
      hookTimeout: 180_000,
      env: {
        TESTCONTAINERS_RYUK_DISABLED: 'true',
      },
    },
  },
])
