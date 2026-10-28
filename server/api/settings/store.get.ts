import { defineCachedEventHandler } from 'nitropack/runtime'
import { getSiteSettings } from '../../utils/site-settings'

export default defineCachedEventHandler(async () => {
  const settings = await getSiteSettings()
  if (!settings) return null
  return {
    defaultCurrency: settings.defaultCurrency,
    productsPerPage: settings.productsPerPage,
  }
}, { maxAge: 60 })
