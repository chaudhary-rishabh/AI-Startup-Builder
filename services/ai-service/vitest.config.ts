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
        'src/lib/db.ts',
        'src/events/consumer.ts',
        'src/db/queries/**',
        'src/queues/agentRun.worker.ts',
        'src/agents/base.agent.ts',
        'src/agents/registry.ts',
        'src/ready.ts',
        'src/services/contextThread.service.ts',
        'src/services/streamingService.ts',
        'src/routes/runs.routes.ts',
        'src/lib/redis.ts',
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
