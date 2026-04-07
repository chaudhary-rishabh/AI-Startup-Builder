import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Design System Palette (Doc 2: Global Design System) ──────────────
        background: '#F5F0E8',   // warm beige — base page background
        sidebar: '#EDE5D8',      // deeper beige — sidebar bg
        'output-panel': '#FAF8F5', // off-white — right-side canvas bg
        divider: '#E8DFD0',      // beige-mid — borders, hover rows, separators
        brand: {
          DEFAULT: '#8B6F47',    // primary interactive colour
          dark: '#5C4425',       // headings, page titles
          light: '#C4A882',      // muted labels, placeholders
        },
        'design-mode': '#7C3AED',  // purple — exclusive to Design Mode UI
        'dev-mode': '#0D9488',     // teal — exclusive to Dev Mode UI
      },
      borderRadius: {
        chip: '6px',
        card: '12px',
        panel: '20px',
        bubble: '28px',
      },
      fontFamily: {
        display: ['Georgia', 'ui-serif', 'serif'],
        body: ['Arial', 'ui-sans-serif', 'sans-serif'],
        code: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'sm-card': '0 1px 3px rgba(0,0,0,0.08)',
        'md-panel': '0 4px 16px rgba(0,0,0,0.10)',
        'lg-sidebar': '0 8px 32px rgba(0,0,0,0.12)',
      },
      spacing: {
        // 4px base unit — all spacing is a multiple of 4px
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'score-draw': {
          from: { strokeDashoffset: '283' },
          to: { strokeDashoffset: '0' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-dot': 'pulse-dot 0.6s ease-in-out infinite',
        'score-draw': 'score-draw 1s ease-out forwards',
        'fade-up': 'fade-up 0.2s ease-out',
      },
    },
  },
  plugins: [],
}

export default config
