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
        // Layer 1: raw palette (fixed hex, for always-dark surfaces like hero/footer)
        navy: {
          DEFAULT: '#1C2940',
          dark: '#141E30',
          surface: '#243550',
          light: '#2D3F5E',
        },
        yellow: {
          DEFAULT: '#F5CC07',
          hover: '#D9B406',
          light: '#FFD933',
        },
        silver: {
          DEFAULT: '#C4C4C4',
          light: '#E0E0E0',
          dark: '#9E9E9E',
        },
        cream: {
          DEFAULT: '#F5F0E8',
          light: '#FAF7F2',
          dark: '#E8E1D5',
        },
        'dark-text': '#1A1A1A',

        // Layer 2: semantic tokens (mode-aware via CSS vars) — components use these
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

        // Status tokens (fixed in both modes)
        success: '#22C55E',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#1C2940',

        // Legacy bindings (kept so untouched files keep working)
        'primary-dark': '#1C2940',
      },
      fontFamily: {
        // "Archive" is the brand heading font; Archivo is the metrically
        // compatible Google Fonts fallback until the brand file is supplied.
        heading: ['Archive', 'Archivo', 'Cairo', 'sans-serif'],
        body: ['Inter', 'Cairo', 'sans-serif'],
      },
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '30px',
        '4xl': '36px',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
      },
    },
  },
  plugins: [],
}
