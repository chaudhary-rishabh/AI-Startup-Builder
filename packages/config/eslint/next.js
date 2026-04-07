// @ts-check
import nextPlugin from '@next/eslint-plugin-next'

import base from './base.js'

/** @type {import('typescript-eslint').ConfigArray} */
export default [
  ...base,
  {
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      // Core Web Vitals ruleset — enforces Next.js performance best practices
      ...nextPlugin.configs['core-web-vitals'].rules,

      // Allow default exports in Next.js pages and layouts
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
]
