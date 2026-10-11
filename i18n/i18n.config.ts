import en from './locales/en.json'
import de from './locales/de.json'

export default defineI18nConfig(() => {
  const isLaunch = process.env.NUXT_PUBLIC_LAUNCH_MODE === 'true'
  return {
    legacy: false,
    globalInjection: true,
    locale: isLaunch ? 'de' : 'en',
    fallbackLocale: isLaunch ? 'de' : 'en',
    messages: { en, de },
  }
})
