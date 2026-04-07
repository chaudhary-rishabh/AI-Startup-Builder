import type { Preview } from '@storybook/react'

// Inject Tailwind base styles — the consuming app must configure Tailwind
// with the packages/ui tailwind.config.ts content paths.
import '../../src/styles/globals.css'

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'beige',
      values: [
        { name: 'beige', value: '#F5F0E8' },
        { name: 'white', value: '#FFFFFF' },
        { name: 'dark', value: '#0F172A' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
