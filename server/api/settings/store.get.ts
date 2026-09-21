import { defineCachedEventHandler } from 'nitropack/runtime'
import { prisma } from '../../utils/prisma'

export default defineCachedEventHandler(async () => {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } })
  if (!settings) return null
  return {
    defaultCurrency: settings.defaultCurrency,
    productsPerPage: settings.productsPerPage,
  }
}, { maxAge: 60 })
