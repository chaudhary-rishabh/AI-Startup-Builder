import { defineConfig, mergeConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { baseConfig } from '../../vitest.config.base'

export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/unit/**/*.test.{ts,tsx}'],
      coverage: {
        provider: 'v8',
        thresholds: {
          lines: 80,
          branches: 80,
          functions: 80,
          statements: 80,
        },
        include: ['components/**', 'hooks/**', 'lib/**'],
        exclude: [
          '**/node_modules/**',
          '**/tests/**',
          '**/*.d.ts',
          '**/app/**',
        ],
      },
    },
    resolve: {
      alias: { '@': path.resolve(__dirname, '.') },
    },
  }),
)
