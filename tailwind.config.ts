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
        // Mango Electronics brand palette
        'primary-dark': '#285E8E',
        primary: {
          DEFAULT: '#2B71AE',
          dark: '#285E8E',
        },
        accent: {
          DEFAULT: '#F5CC07',
        },
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
