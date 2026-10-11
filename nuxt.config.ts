// https://nuxt.com/docs/api/configuration/nuxt-config
const isLaunchMode = process.env.NUXT_PUBLIC_LAUNCH_MODE === 'true'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  vite: {
    server: {
      // Allow Cloudflare Quick Tunnel hostnames in dev (public demo URLs).
      allowedHosts: ['.trycloudflare.com'],
    },
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Server-only. Min 32 chars; enforced in server/utils/auth.ts.
    sessionPassword: '',
    public: {
      launchMode: isLaunchMode,
      // Firebase web config (public keys only). Overridden by
      // NUXT_PUBLIC_FIREBASE_* env vars. Empty = push disabled (graceful).
      firebaseApiKey: '',
      firebaseAuthDomain: '',
      firebaseMessagingSenderId: '',
      firebaseAppId: '',
      firebaseVapidKey: '',
      // Canonical public site URL (e.g. https://amir.com).
      siteUrl: '',
    },
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode',
    '@nuxtjs/i18n',
    '@pinia/nuxt',
    '@pinia-plugin-persistedstate/nuxt',
  ],

  colorMode: {
    classSuffix: '',
    preference: 'light',
    fallback: 'light',
    storageKey: 'amir-color-mode',
  },

  i18n: {
    vueI18n: './i18n.config.ts',
    locales: isLaunchMode
      ? [{ code: 'de', language: 'de-DE', name: 'Deutsch', dir: 'ltr' }]
      : [
          { code: 'en', language: 'en-US', name: 'English', dir: 'ltr' },
          { code: 'de', language: 'de-DE', name: 'Deutsch', dir: 'ltr' },
        ],
    defaultLocale: isLaunchMode ? 'de' : 'en',
    strategy: isLaunchMode ? 'no_prefix' : 'prefix_except_default',
    detectBrowserLanguage: isLaunchMode
      ? false
      : {
          useCookie: true,
          cookieKey: 'i18n_redirected',
          redirectOn: 'root',
        },
  },
})
