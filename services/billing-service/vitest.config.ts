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
        'src/services/coupon.service.ts',
        'src/services/planEnforcement.service.ts',
        'src/services/tokenUsage.service.ts',
        'src/routes/internal.routes.ts',
        'src/routes/plans.routes.ts',
        'src/routes/tokenUsage.routes.ts',
      ],
      exclude: [
        'src/index.ts',
        'src/config/env.ts',
        'src/lib/db.ts',
        'src/lib/redis.ts',
        'src/db/**',
        'src/events/**',
        'src/lib/logger.ts',
        'src/middleware/errorHandler.ts',
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
