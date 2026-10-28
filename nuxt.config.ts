// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'

const isLaunchMode = process.env.NUXT_PUBLIC_LAUNCH_MODE === 'true'

// AUDIT P1-01: public legal/provider data. Every value is a plain string so it
// can be supplied by NUXT_PUBLIC_LEGAL_* environment variables at runtime. Empty
// values render conspicuous placeholders; legalReviewed must stay false until
// counsel has approved the final text.
const publicLegal = {
  legalReviewed: process.env.NUXT_PUBLIC_LEGAL_REVIEWED === 'true',
  legalVersion: process.env.NUXT_PUBLIC_LEGAL_VERSION || '2026-10-28',
  legalProviderName: process.env.NUXT_PUBLIC_LEGAL_PROVIDER_NAME || '',
  legalLegalForm: process.env.NUXT_PUBLIC_LEGAL_LEGAL_FORM || '',
  legalRepresentative: process.env.NUXT_PUBLIC_LEGAL_REPRESENTATIVE || '',
  legalStreet: process.env.NUXT_PUBLIC_LEGAL_STREET || '',
  legalAddressLine2: process.env.NUXT_PUBLIC_LEGAL_ADDRESS_LINE2 || '',
  legalPostalCode: process.env.NUXT_PUBLIC_LEGAL_POSTAL_CODE || '',
  legalCity: process.env.NUXT_PUBLIC_LEGAL_CITY || '',
  legalCountry: process.env.NUXT_PUBLIC_LEGAL_COUNTRY || 'Deutschland',
  legalEmail: process.env.NUXT_PUBLIC_LEGAL_EMAIL || '',
  legalPhone: process.env.NUXT_PUBLIC_LEGAL_PHONE || '',
  legalRegisterCourt: process.env.NUXT_PUBLIC_LEGAL_REGISTER_COURT || '',
  legalRegisterNumber: process.env.NUXT_PUBLIC_LEGAL_REGISTER_NUMBER || '',
  legalVatId: process.env.NUXT_PUBLIC_LEGAL_VAT_ID || '',
  legalSupervisoryAuthority: process.env.NUXT_PUBLIC_LEGAL_SUPERVISORY_AUTHORITY || '',
  legalPrivacyEmail: process.env.NUXT_PUBLIC_LEGAL_PRIVACY_EMAIL || '',
  legalHostingProvider: process.env.NUXT_PUBLIC_LEGAL_HOSTING_PROVIDER || '',
  legalDataProtectionOfficer: process.env.NUXT_PUBLIC_LEGAL_DPO || '',
  legalCancellationDeadlineHours: process.env.NUXT_PUBLIC_LEGAL_CANCELLATION_HOURS || '',
  legalCancellationFeePercent: process.env.NUXT_PUBLIC_LEGAL_CANCELLATION_FEE_PERCENT || '',
  legalNoShowFeePercent: process.env.NUXT_PUBLIC_LEGAL_NO_SHOW_FEE_PERCENT || '',
}


export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  nitro: {
    // Sanitizes 404 responses (no stack traces). See server/error-handler.ts.
    errorHandler: fileURLToPath(new URL('./server/error-handler.ts', import.meta.url)),
    compressPublicAssets: true,
    minify: true,
  },

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
    // AUDIT P3-14: optional internal token for verbose health output.
    healthToken: '',
    // AUDIT P3-18: optional internal token for the metrics endpoint.
    metricsToken: '',
    public: {
      launchMode: isLaunchMode,
      // Build-time marker mirrored at runtime so deployment checks can detect a
      // mismatch between the image build and the runtime environment.
      launchModeBuild: isLaunchMode,
      ...publicLegal,
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
