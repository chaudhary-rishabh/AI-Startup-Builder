import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/db/migrations/**',
        'src/index.ts',
        'src/config/env.ts',
        'src/lib/logger.ts',
        'src/lib/db.ts',
        'src/services/redis.service.ts',
        'src/events/consumer.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 60,
      },
      reporter: ['text', 'json-summary'],
    },
  },
})
