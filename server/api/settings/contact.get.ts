import { defineCachedEventHandler } from 'nitropack/runtime'
import { prisma } from '../../utils/prisma'

export default defineCachedEventHandler(async () => {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } })
  if (!settings) return null
  return {
    contactPhone1: settings.contactPhone1,
    contactPhone2: settings.contactPhone2,
    contactWhatsapp: settings.contactWhatsapp,
    contactEmail: settings.contactEmail,
    contactAddressAr: settings.contactAddressAr,
    contactAddressEn: settings.contactAddressEn,
    socialFacebook: settings.socialFacebook,
    socialInstagram: settings.socialInstagram,
    googleMapsEmbedUrl: settings.googleMapsEmbedUrl,
  }
}, { maxAge: 60 })
