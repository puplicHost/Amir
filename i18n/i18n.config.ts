import en from './locales/en.json'
import ar from './locales/ar.json'

export default defineI18nConfig(() => ({
  legacy: false,
  globalInjection: true,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, ar },
}))
