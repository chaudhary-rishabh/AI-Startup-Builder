import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  // Discover stories both co-located with source and in the /stories directory
  stories: ['../stories/**/*.stories.@(ts|tsx)'],

  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-interactions',
  ],

  framework: {
    name: '@storybook/react-vite',
    options: {},
  },

  docs: {
    autodocs: 'tag',
  },

  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },

  viteFinal: (viteConfig) => {
    return {
      ...viteConfig,
      // Allow Radix UI "use client" directives in bundled ESM
      build: {
        ...(viteConfig.build ?? {}),
        rollupOptions: {
          ...(viteConfig.build?.rollupOptions ?? {}),
          onwarn(warning, warn) {
            // Silence known "use client" directive warnings from Radix UI packages
            if (
              warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
              warning.message.includes('"use client"')
            ) {
              return
            }
            warn(warning)
          },
        },
      },
    }
  },
}

export default config
