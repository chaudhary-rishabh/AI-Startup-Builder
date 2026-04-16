import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    pool: 'forks',
    maxWorkers: 1,
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    globalSetup: './tests/globalFullFlow.setup.ts',
    setupFiles: ['./tests/fullflow-bootstrap.ts', './tests/env-setup.ts', './tests/redis-mock.ts'],
    include: ['tests/integration/fullAiServiceFlow.test.ts'],
    testTimeout: 180_000,
    hookTimeout: 180_000,
    coverage: { enabled: false },
  },
})
