import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      include: [
        'src/app.ts',
        'src/lib/response.ts',
        'src/middleware/requireAuth.ts',
        'src/middleware/requireAdmin.ts',
        'src/routes/notifications.routes.ts',
        'src/routes/preferences.routes.ts',
        'src/routes/admin.routes.ts',
        'src/services/inApp.service.ts',
        'src/services/delivery.service.ts',
      ],
      exclude: [
        'src/index.ts',
        'src/config/env.ts',
        'src/lib/db.ts',
        'src/lib/redis.ts',
        'src/db/migrations/**',
        'src/db/**',
        'src/events/**',
        'src/queues/**',
        'src/templates/**',
        'src/middleware/errorHandler.ts',
        'src/middleware/requestId.ts',
        'src/lib/logger.ts',
        'src/lib/errors.ts',
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
