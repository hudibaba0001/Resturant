// Stjarna MVP Design Tokens
// Export tokens for JavaScript usage (e.g., dynamic styling, theme switching)

export const tokens = {
  // Typography
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
    ].join(', '),
  },
  
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
  },
  
  lineHeight: {
    body: '1.4',
    heading: '1.2',
  },
  
  // Spacing
  spacing: {
    2: '2px',
    4: '4px',
    6: '6px',
    8: '8px',
    12: '12px',
    16: '16px',
    20: '20px',
    24: '24px',
    32: '32px',
    40: '40px',
    48: '48px',
  },
  
  // Border Radius
  borderRadius: {
    button: '9999px',
    input: '12px',
    card: '16px',
    modal: '20px',
  },
  
  // Colors
  colors: {
    bg: '#0B0D12',
    surface: '#0F131A',
    'surface-2': '#141A23',
    border: '#232B36',
    text: '#E7EEF7',
    'text-muted': '#A8B3C2',
    accent: {
      mint: '#2EE6A6',
      blue: '#4DA3FF',
      DEFAULT: '#2EE6A6',
    },
    success: '#2EE6A6',
    warning: '#F6C34A',
    danger: '#FF6B6B',
  },
  
  // Shadows
  shadows: {
    card: '0 6px 24px rgba(0,0,0,.25)',
    modal: '0 12px 32px rgba(0,0,0,.35)',
  },
  
  // Motion
  duration: {
    fast: '150ms',
    normal: '250ms',
  },
  
  easing: {
    smooth: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  },
  
  // Component-specific tokens
  components: {
    button: {
      height: '40px',
      paddingX: '16px',
      borderRadius: '9999px',
      focusRing: '2px',
    },
    
    input: {
      height: '40px',
      borderRadius: '12px',
    },
    
    modal: {
      maxWidth: '960px',
      borderRadius: '20px',
    },
    
    card: {
      padding: '16px',
      borderRadius: '16px',
      borderWidth: '1px',
    },
    
    badge: {
      height: '24px',
      borderRadius: '9999px',
      fontSize: '12px',
      textTransform: 'uppercase',
    },
  },
} as const

// Type helpers
export type TokenKey = keyof typeof tokens
export type ColorKey = keyof typeof tokens.colors
export type SpacingKey = keyof typeof tokens.spacing

// Utility functions
export const getToken = (path: string) => {
  return path.split('.').reduce((obj, key) => obj?.[key], tokens as any)
}

export const getColor = (color: ColorKey) => tokens.colors[color]
export const getSpacing = (space: SpacingKey) => tokens.spacing[space]
