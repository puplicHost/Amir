// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Server-only. Min 32 chars; enforced in server/utils/auth.ts.
    sessionPassword: '',
    public: {
      // Firebase web config (public keys only). Overridden by
      // NUXT_PUBLIC_FIREBASE_* env vars. Empty = push disabled (graceful).
      firebaseApiKey: '',
      firebaseAuthDomain: '',
      firebaseMessagingSenderId: '',
      firebaseAppId: '',
      firebaseVapidKey: '',
      // Canonical public site URL (e.g. https://mango-electronics.com).
      // Used for Meta domain verification display + CAPI event_source_url.
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
    preference: 'system',
    fallback: 'light',
    storageKey: 'mango-color-mode',
  },

  i18n: {
    vueI18n: './i18n.config.ts',
    locales: [
      { code: 'en', language: 'en-US', name: 'English', dir: 'ltr' },
      { code: 'ar', language: 'ar-EG', name: 'العربية', dir: 'rtl' },
    ],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
    },
  },
})
