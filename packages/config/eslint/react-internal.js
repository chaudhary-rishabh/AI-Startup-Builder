// @ts-check
import reactHooksPlugin from 'eslint-plugin-react-hooks'

import base from './base.js'

/** @type {import('typescript-eslint').ConfigArray} */
export default [
  ...base,
  {
    plugins: {
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      // Enforce Rules of Hooks and exhaustive deps — prevents subtle bugs
      ...reactHooksPlugin.configs.recommended.rules,
    },
  },
]
