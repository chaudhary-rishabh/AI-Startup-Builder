import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    pool: 'forks',
    maxWorkers: 1,
    poolOptions: {
      forks: { singleFork: false },
    },
    setupFiles: ['./tests/setup.ts'],
    globalSetup: process.env['SKIP_RAG_TESTCONTAINERS'] === '1' ? undefined : './tests/globalIntegration.setup.ts',
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/db/migrations/**',
        'src/index.ts',
        'src/config/env.ts',
        'src/lib/db.ts',
        'src/ready.ts',
        'src/lib/redis.ts',
        'src/types/**',
        'src/events/consumer.ts',
        'src/queues/embed.worker.ts',
        'src/db/queries/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 55,
      },
      reporter: ['text', 'json-summary'],
    },
  },
})
