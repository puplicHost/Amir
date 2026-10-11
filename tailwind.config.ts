import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  darkMode: 'class',
  content: [
    './app/components/**/*.{vue,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/app.vue',
    './app/plugins/**/*.{ts,js}',
  ],
  theme: {
    extend: {
      colors: {
        // Base brand triad: Black #050808, White #FFFFFF, Gray #808080
        brand: {
          black: '#050808',
          white: '#FFFFFF',
          gray: '#808080',
        },
        // Semantic mode-aware tokens (powered by CSS variables)
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        text: 'rgb(var(--text) / <alpha-value>)',
        muted: 'rgb(var(--text-muted) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        'on-primary': 'rgb(var(--on-primary) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-hover': 'rgb(var(--accent-hover) / <alpha-value>)',
        'on-accent': 'rgb(var(--on-accent) / <alpha-value>)',

        // Restrained accessible status tokens (WCAG AA compliant)
        success: {
          DEFAULT: '#166534',
          dark: '#86EFAC',
        },
        warning: {
          DEFAULT: '#92400E',
          dark: '#FCD34D',
        },
        error: {
          DEFAULT: '#991B1B',
          dark: '#FCA5A5',
        },
        info: {
          DEFAULT: '#525252',
          dark: '#A3A3A3',
        },
      },
      fontFamily: {
        heading: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '32px',
        '4xl': '40px',
        '5xl': '52px',
        'fluid-h1': ['clamp(2.5rem, 6vw, 5rem)', { lineHeight: '1.08', letterSpacing: '-0.02em' }],
        'fluid-h2': ['clamp(2rem, 4.5vw, 3.5rem)', { lineHeight: '1.12', letterSpacing: '-0.015em' }],
        'subline': ['11px', { lineHeight: '1.2', letterSpacing: '0.16em' }],
      },
      letterSpacing: {
        widest: '0.2em',
        subline: '0.18em',
      },
      borderRadius: {
        none: '0px',
        sm: '2px',
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        full: '9999px',
      },
    },
  },
  plugins: [],
}
