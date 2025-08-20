import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Stjarna MVP Design Tokens
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Inter',
          'Noto Sans',
          'Helvetica',
          'Arial',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          'sans-serif'
        ],
      },
      fontSize: {
        'xs': ['12px', { lineHeight: '1.4' }],
        'sm': ['14px', { lineHeight: '1.4' }],
        'base': ['16px', { lineHeight: '1.4' }],
        'lg': ['18px', { lineHeight: '1.4' }],
        'xl': ['20px', { lineHeight: '1.2' }],
        '2xl': ['24px', { lineHeight: '1.2' }],
        '3xl': ['32px', { lineHeight: '1.2' }],
      },
      spacing: {
        '2': '2px',
        '4': '4px',
        '6': '6px',
        '8': '8px',
        '12': '12px',
        '16': '16px',
        '20': '20px',
        '24': '24px',
        '32': '32px',
        '40': '40px',
        '48': '48px',
      },
      borderRadius: {
        'button': '9999px',
        'input': '12px',
        'card': '16px',
        'modal': '20px',
      },
      colors: {
        // Stjarna MVP Color Palette
        bg: '#0B0D12',
        surface: '#0F131A',
        'surface-2': '#141A23',
        border: '#232B36',
        text: '#E7EEF7',
        'text-muted': '#A8B3C2',
        accent: {
          mint: '#2EE6A6',
          blue: '#4DA3FF',
          DEFAULT: '#2EE6A6', // Default to mint
        },
        success: '#2EE6A6',
        warning: '#F6C34A',
        danger: '#FF6B6B',
      },
      boxShadow: {
        'card': '0 6px 24px rgba(0,0,0,.25)',
        'modal': '0 12px 32px rgba(0,0,0,.35)',
      },
      animation: {
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      transitionDuration: {
        '150': '150ms',
        '250': '250ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
  plugins: [],
}

export default config
