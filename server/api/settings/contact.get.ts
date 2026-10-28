import { defineCachedEventHandler } from 'nitropack/runtime'
import { getSiteSettings } from '../../utils/site-settings'

export default defineCachedEventHandler(async () => {
  const settings = await getSiteSettings()
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
    socialTiktok: settings.socialTiktok,
    socialYoutube: settings.socialYoutube,
    socialLinkedin: settings.socialLinkedin,
    socialX: settings.socialX,
    googleMapsEmbedUrl: settings.googleMapsEmbedUrl,
  }
}, { maxAge: 60 })
