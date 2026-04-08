import React from 'react'
import type { Preview, Decorator } from '@storybook/react'

import '../src/styles/globals.css'

// Wrap every story in the product's base beige background
const withTheme: Decorator = (Story) => (
  <div className="min-h-screen bg-background p-8 font-body antialiased">
    <Story />
  </div>
)

const preview: Preview = {
  decorators: [withTheme],

  parameters: {
    // ── Background palette for the canvas
    backgrounds: {
      default: 'beige',
      values: [
        { name: 'beige', value: '#F5F0E8' },
        { name: 'white', value: '#FFFFFF' },
        { name: 'sidebar', value: '#EDE5D8' },
        { name: 'dark', value: '#0F172A' },
      ],
    },

    // ── Viewport presets matching design breakpoints
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile (375)',
          styles: { width: '375px', height: '812px' },
          type: 'mobile',
        },
        tablet: {
          name: 'Tablet (768)',
          styles: { width: '768px', height: '1024px' },
          type: 'tablet',
        },
        desktop: {
          name: 'Desktop (1440)',
          styles: { width: '1440px', height: '900px' },
          type: 'desktop',
        },
      },
    },

    actions: { argTypesRegex: '^on[A-Z].*' },

    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
