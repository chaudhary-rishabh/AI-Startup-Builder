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
        'src/lib/dateRange.ts',
        'src/lib/response.ts',
        'src/middleware/requireAuth.ts',
        'src/middleware/requireAdmin.ts',
        'src/routes/events.routes.ts',
        'src/routes/kpi.routes.ts',
        'src/routes/audit.routes.ts',
        'src/routes/myUsage.routes.ts',
        'src/services/kpiAggregator.service.ts',
        'src/services/funnelAnalyzer.service.ts',
        'src/services/agentPerformance.service.ts',
        'src/services/auditLog.service.ts',
      ],
      exclude: [
        'src/index.ts',
        'src/config/env.ts',
        'src/lib/db.ts',
        'src/lib/readReplica.ts',
        'src/lib/redis.ts',
        'src/lib/logger.ts',
        'src/lib/errors.ts',
        'src/middleware/errorHandler.ts',
        'src/middleware/requestId.ts',
        'src/db/**',
        'src/events/**',
        'src/services/tokenUsageAnalytics.service.ts',
        'src/services/userActivity.service.ts',
        'src/routes/funnel.routes.ts',
        'src/routes/tokenUsage.routes.ts',
        'src/routes/agentPerformance.routes.ts',
        'src/routes/userActivity.routes.ts',
        'src/routes/revenue.routes.ts'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 60
      },
      reporter: ['text', 'json-summary']
    }
  }
})
