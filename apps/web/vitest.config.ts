import path from 'path'

import react from '@vitejs/plugin-react'
import { defineConfig, mergeConfig } from 'vitest/config'

import { baseConfig } from '../../vitest.config.base'

export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [react()],
    test: {
      env: {
        NEXT_PUBLIC_API_URL: 'http://localhost:8000/api/v1',
      },
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setup-env.ts', './tests/setup.ts'],
      include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
      exclude: ['**/node_modules/**', '**/tests/e2e/**', '**/.next/**'],
      css: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov', 'html', 'json-summary'],
        thresholds: {
          lines: 52,
          branches: 70,
          functions: 48,
          statements: 52,
        },
        exclude: [
          '**/node_modules/**',
          '**/tests/**',
          '**/*.d.ts',
          '**/app/**',
          '**/providers/**',
          '**/.next/**',
          'components/ui/**',
          'components/layout/**',
          'components/auth/**',
          'components/settings/**',
          'components/dashboard/ProjectGrid.tsx',
          'components/dashboard/NewProjectModal.tsx',
          'components/dashboard/StarredRow.tsx',
          'hooks/useAgentRun.ts',
          'hooks/useProject.ts',
          'hooks/useRagStatus.ts',
          'hooks/useTokenBudget.ts',
          'lib/auth.ts',
          'lib/queryClient.ts',
        ],
        include: ['components/**', 'hooks/**', 'store/**', 'lib/**', 'api/**'],
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  }),
)
