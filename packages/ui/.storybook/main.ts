import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  // Discover stories both co-located with source and in the /stories directory
  stories: ['../src/**/*.stories.tsx', '../stories/**/*.stories.tsx'],

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
}

export default config
